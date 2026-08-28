import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireUser } from "@/lib/authz"
import { leaveTypeLabel } from "@/lib/attendance"
import { sendMail } from "@/lib/mailer"
import { leaveDecisionEmail } from "@/lib/email-templates"

const BASE_URL = process.env.NEXTAUTH_URL || "https://www.beeyondtrees.org"

const fmt = (d: Date) => d.toISOString().slice(0, 10)

// PATCH { action: "approve" | "reject" | "cancel", note? }
//
//   approve / reject — CEO ONLY (role "admin"). Assistant CEO and IT can see the
//                      queue but deliberately cannot decide: the brief is that
//                      leave is signed off by the CEO personally.
//   cancel           — the applicant withdrawing their own pending request.
//
// On approve/reject the applicant is emailed the outcome.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await requireUser(request)
  if (me instanceof NextResponse) return me

  const { id } = await params
  const body = await request.json().catch(() => null)
  const action = String(body?.action ?? "").trim()
  const note = typeof body?.note === "string" ? body.note.trim() : ""

  const leave = await prisma.leaveRequest.findUnique({ where: { id } })
  if (!leave) return NextResponse.json({ error: "Leave request not found." }, { status: 404 })

  if (action === "cancel") {
    if (leave.userId !== me.id) {
      return NextResponse.json({ error: "You can only cancel your own request." }, { status: 403 })
    }
    if (leave.status !== "pending") {
      return NextResponse.json({ error: "Only a pending request can be cancelled." }, { status: 409 })
    }
    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: { status: "cancelled", decidedBy: me.name, decidedAt: new Date() },
    })
    return NextResponse.json(updated)
  }

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be 'approve', 'reject' or 'cancel'." }, { status: 400 })
  }

  if (me.role !== "admin") {
    return NextResponse.json({ error: "Only the CEO can approve or reject leave." }, { status: 403 })
  }
  if (leave.status !== "pending") {
    return NextResponse.json({ error: `This request was already ${leave.status}.` }, { status: 409 })
  }
  if (action === "reject" && !note) {
    return NextResponse.json({ error: "Give a reason when rejecting a leave request." }, { status: 400 })
  }

  const approved = action === "approve"
  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: approved ? "approved" : "rejected",
      decidedBy: me.name,
      decidedAt: new Date(),
      decisionNote: note || null,
    },
  })

  // Tell the applicant the outcome.
  try {
    if (leave.userEmail) {
      await sendMail({
        to: leave.userEmail,
        subject: `[BeeyondTrees] Your leave request ${leave.reference} was ${approved ? "approved" : "rejected"}`,
        html: leaveDecisionEmail({
          reference: leave.reference,
          applicant: leave.userName,
          leaveType: leaveTypeLabel(leave.type),
          startDate: fmt(leave.startDate),
          endDate: fmt(leave.endDate),
          days: leave.days,
          approved,
          decidedBy: me.name,
          note: note || null,
          leaveUrl: `${BASE_URL}/admin/leaves`,
        }),
      })
    } else {
      console.warn(`[mailer] leave ${leave.reference}: applicant has no email on file — decision not emailed.`)
    }
  } catch (e) {
    console.error("[mailer] leave decision notify:", e)
  }

  return NextResponse.json(updated)
}
