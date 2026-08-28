import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireUser, isAdminish } from "@/lib/authz"
import { createNumbered } from "@/lib/docs"
import { countLeaveDays, parseDayInput, LEAVE_TYPE_VALUES, leaveTypeLabel } from "@/lib/attendance"
import { sendMail } from "@/lib/mailer"
import { leaveRequestEmail } from "@/lib/email-templates"
import { ROLE_LABELS } from "@/lib/tracing-stages"

const BASE_URL = process.env.NEXTAUTH_URL || "https://www.beeyondtrees.org"
// Optional shared inbox copied on every request. Deliberately has no hardcoded
// default — inventing an address would silently send staff leave details
// somewhere nobody reads. Set CEO_INBOX if you want a shared copy.
const CEO_INBOX = process.env.CEO_INBOX || ""

const fmt = (d: Date) => d.toISOString().slice(0, 10)

// Every signed-in staff member may apply for leave and see their own history.
// Adminish roles (CEO / Assistant CEO / IT) see every request; only the CEO can
// actually decide one — see PATCH in ./[id]/route.ts.
export async function GET(request: NextRequest) {
  const me = await requireUser(request)
  if (me instanceof NextResponse) return me

  const canViewAll = isAdminish(me.role)
  const wantsAll = request.nextUrl.searchParams.get("scope") === "all"
  if (wantsAll && !canViewAll) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const status = request.nextUrl.searchParams.get("status")
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      ...(wantsAll ? {} : { userId: me.id }),
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  })

  return NextResponse.json(
    { leaves, canViewAll, canDecide: me.role === "admin", me: { id: me.id, role: me.role } },
    { headers: { "Cache-Control": "no-store" } }
  )
}

export async function POST(request: NextRequest) {
  const me = await requireUser(request)
  if (me instanceof NextResponse) return me

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  const type = String(body.type ?? "").trim()
  if (!LEAVE_TYPE_VALUES.includes(type)) {
    return NextResponse.json({ error: "Choose a valid leave type." }, { status: 400 })
  }

  const startDate = parseDayInput(body.startDate)
  const endDate = parseDayInput(body.endDate)
  if (!startDate || !endDate) {
    return NextResponse.json({ error: "Enter a valid start and end date." }, { status: 400 })
  }
  if (endDate < startDate) {
    return NextResponse.json({ error: "The end date cannot be before the start date." }, { status: 400 })
  }

  const reason = String(body.reason ?? "").trim()
  if (reason.length < 5) {
    return NextResponse.json({ error: "Give a reason for the leave (at least a few words)." }, { status: 400 })
  }

  // One pending application at a time keeps the CEO's queue unambiguous.
  const existingPending = await prisma.leaveRequest.findFirst({
    where: { userId: me.id, status: "pending" },
  })
  if (existingPending) {
    return NextResponse.json(
      { error: `You already have a pending request (${existingPending.reference}). Cancel it before applying again.` },
      { status: 409 }
    )
  }

  const days = countLeaveDays(startDate, endDate)

  let leave
  try {
    leave = await createNumbered(
      "LV",
      () => prisma.leaveRequest.count(),
      (reference) =>
        prisma.leaveRequest.create({
          data: {
            reference,
            userId: me.id,
            userName: me.name,
            userEmail: me.email,
            role: me.role,
            type,
            startDate,
            endDate,
            days,
            reason,
            handoverTo: typeof body.handoverTo === "string" && body.handoverTo.trim() ? body.handoverTo.trim() : null,
            contact: typeof body.contact === "string" && body.contact.trim() ? body.contact.trim() : null,
          },
        })
    )
  } catch (e) {
    console.error("Leave create failed:", e)
    return NextResponse.json({ error: "Could not submit your leave request. Please try again." }, { status: 500 })
  }

  // Notify the CEO — the only role that can approve this.
  try {
    const ceos = await prisma.user.findMany({ where: { role: "admin", active: true }, select: { email: true } })
    const to = [...new Set([
      ...ceos.flatMap((u) => (u.email ? [u.email] : [])),
      ...(CEO_INBOX ? [CEO_INBOX] : []),
    ])]
    if (to.length === 0) {
      console.warn(`[mailer] leave ${leave.reference}: no CEO account has an email and CEO_INBOX is unset — nobody was notified.`)
    } else {
      await sendMail({
        to,
        subject: `[BeeyondTrees] Leave request ${leave.reference} from ${me.name} — awaiting your approval`,
        html: leaveRequestEmail({
          reference: leave.reference,
          applicant: me.name,
          roleName: ROLE_LABELS[me.role] ?? me.role,
          leaveType: leaveTypeLabel(type),
          startDate: fmt(startDate),
          endDate: fmt(endDate),
          days,
          reason,
          handoverTo: leave.handoverTo,
          contact: leave.contact,
          leaveUrl: `${BASE_URL}/admin/leaves`,
        }),
      })
    }
  } catch (e) {
    console.error("[mailer] leave request notify:", e)
  }

  return NextResponse.json(leave, { status: 201 })
}
