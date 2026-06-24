import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireDocRole, normalizeLines, parseDate } from "@/lib/docs"
import { requireRole, isAdminish, isAssistantCeo } from "@/lib/authz"
import { sendMail } from "@/lib/mailer"
import { lpoApprovedEmail, lpoExecApprovedEmail } from "@/lib/email-templates"
import { sendLpoEmail } from "@/lib/doc-email"

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000"
// Shared finance inbox that always gets a CEO-approval alert (overridable by env).
const FINANCE_INBOX = process.env.FINANCE_INBOX || "finance@earthlungs.org"

async function fetchExtras(id: string) {
  try {
    const rows = await prisma.$queryRaw<{ status: string; approvedBy: string | null; approvedAt: Date | null; rejectionReason: string | null; destinationOfGoods: string | null; amended: boolean; origin: string | null; createdByName: string | null; createdByUserId: string | null; onBehalf: boolean; chiefApprovedBy: string | null }[]>`
      SELECT status, "approvedBy", "approvedAt", "rejectionReason", "destinationOfGoods", "amended", "origin", "createdByName", "createdByUserId", "onBehalf", "chiefApprovedBy"
      FROM "Lpo" WHERE id = ${id}
    `
    return rows[0] ?? null
  } catch {
    return null
  }
}

const LPO_VIEW_ROLES = [
  "procurement_officer", "external_procurement", "executive", "chief", "finance",
  "admin", "assistant_ceo", "it_specialist", "factory_manager",
]

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // factory_manager needs read-only access to view the LPO they will link to a batch
  const auth = await requireRole(request, LPO_VIEW_ROLES)
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const lpo = await prisma.lpo.findUnique({ where: { id } })
  if (!lpo) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const extras = await fetchExtras(id)
  return NextResponse.json({ ...lpo, ...(extras ?? {}) }, { headers: { "Cache-Control": "no-store" } })
}

// LPO approval — two parallel chains depending on origin:
//   internal: exec_approve/exec_amend (Factory Admin) → approve/reject (CEO)
//   external: chief_approve/chief_reject (Chief)       → approve/reject (CEO)
// Assistant CEO may perform the final approve; it is flagged "on behalf" and the
// CEO is notified. Finance is notified on every final approval.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDocRole(request)
  if (auth instanceof NextResponse) return auth

  const role = (auth.token as { role?: string }).role
  const isAdmin = isAdminish(role)
  const isExec = role === "executive"
  const isChief = role === "chief"
  const onBehalf = isAssistantCeo(role)

  const { id } = await params
  const lpo = await prisma.lpo.findUnique({ where: { id } })
  if (!lpo) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json().catch(() => null)
  const action = body?.action

  const VALID = ["exec_approve", "exec_amend", "chief_approve", "chief_reject", "approve", "reject", "amend"]
  if (!VALID.includes(action)) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 })
  }

  // Role gates per action
  if ((action === "exec_approve" || action === "exec_amend") && !isExec && !isAdmin) {
    return NextResponse.json({ error: "Only the Factory Admin can approve at this stage." }, { status: 403 })
  }
  if ((action === "chief_approve" || action === "chief_reject") && !isChief && !isAdmin) {
    return NextResponse.json({ error: "Only the Chief can approve external LPOs at this stage." }, { status: 403 })
  }
  if ((action === "approve" || action === "reject" || action === "amend") && !isAdmin) {
    return NextResponse.json({ error: "Only the CEO can perform the final approval." }, { status: 403 })
  }

  const reason = typeof body?.reason === "string" ? body.reason.trim() : ""
  if ((action === "reject" || action === "chief_reject") && !reason) {
    return NextResponse.json({ error: "A reason is required to reject." }, { status: 400 })
  }

  const actor = (auth.token as { name?: string }).name || "Unknown"
  const destinationOfGoods = typeof body?.destinationOfGoods === "string" ? body.destinationOfGoods.trim() || null : null

  // Determine new status and amended flag
  const newStatus =
    action === "exec_approve" || action === "exec_amend" ? "exec_approved"
    : action === "chief_approve" ? "chief_approved"
    : action === "approve" || action === "amend" ? "approved"
    : "rejected" // reject | chief_reject
  const amended = action === "exec_amend" || action === "amend"
  const isChiefApprove = action === "chief_approve"

  // For amend actions: update editable content first
  if ((action === "exec_amend" || action === "amend") && body?.items) {
    const { items, subtotal, vat, total } = normalizeLines(body.items)
    if (items.length === 0) {
      return NextResponse.json({ error: "Add at least one line item." }, { status: 400 })
    }
    try {
      await prisma.lpo.update({
        where: { id },
        data: {
          ...(body.supplierName?.trim() && { supplierName: body.supplierName.trim() }),
          ...(body.shippingAddress !== undefined && { shippingAddress: body.shippingAddress?.trim() || null }),
          ...(body.purchaseRep !== undefined && { purchaseRep: body.purchaseRep?.trim() || null }),
          ...(body.orderDate !== undefined && { orderDate: parseDate(body.orderDate) ?? lpo.orderDate }),
          ...(body.expectedArrival !== undefined && { expectedArrival: parseDate(body.expectedArrival) }),
          ...(body.notes !== undefined && { notes: body.notes?.trim() || null }),
          items: items as unknown as Prisma.InputJsonValue,
          subtotal,
          vat,
          total,
        },
      })
    } catch (e) {
      console.error("LPO amend content update failed:", e)
      return NextResponse.json({ error: "Could not save the amended content." }, { status: 500 })
    }
  }

  // Apply status change. Chief approval records its own audit columns and does
  // NOT overwrite the final approvedBy. The final CEO approval records onBehalf
  // when an Assistant CEO performed it.
  const now = new Date()
  try {
    if (isChiefApprove) {
      await prisma.$executeRaw`
        UPDATE "Lpo"
        SET status = ${newStatus},
            "chiefApprovedBy" = ${actor}::text,
            "chiefApprovedAt" = ${now}::timestamp,
            "destinationOfGoods" = COALESCE(${destinationOfGoods}::text, "destinationOfGoods")
        WHERE id = ${id}
      `
    } else {
      await prisma.$executeRaw`
        UPDATE "Lpo"
        SET status = ${newStatus},
            "approvedBy" = ${actor}::text,
            "approvedAt" = ${now}::timestamp,
            "rejectionReason" = ${action === "reject" || action === "chief_reject" ? reason : null}::text,
            "amended" = ${amended},
            "onBehalf" = ${newStatus === "approved" ? onBehalf : false},
            "destinationOfGoods" = COALESCE(${destinationOfGoods}::text, "destinationOfGoods")
        WHERE id = ${id}
      `
    }
  } catch {
    return NextResponse.json({ error: "Could not update the LPO — migration may not have run yet." }, { status: 500 })
  }

  const updated = await prisma.lpo.findUnique({ where: { id } })
  const lpoUrl = `${BASE_URL}/admin/lpo/${id}`
  const lpoTotal = Number((updated as { total?: number } | null)?.total) || 0
  const lpoNumber = (updated as { number?: string } | null)?.number ?? id
  const supplierName = (updated as { supplierName?: string } | null)?.supplierName ?? ""

  try {
    if (newStatus === "approved") {
      // Admin gave final approval — notify factory managers so they can create a batch
      const fmUsers = await prisma.user.findMany({ where: { role: "factory_manager" }, select: { email: true } })
      const to = fmUsers.flatMap((u) => u.email ? [u.email] : [])
      if (to.length > 0) {
        await sendMail({
          to,
          subject: `[Beeyond Trees] LPO ${lpoNumber} fully approved — you can now create a batch`,
          html: lpoApprovedEmail({ lpoNumber, supplierName, total: lpoTotal, approvedBy: actor, lpoUrl }),
        })
      }

      // Finance is notified on every final (CEO) approval. Always alert the shared
      // finance inbox, plus any individual finance-role user accounts.
      try {
        const financeUsers = await prisma.user.findMany({ where: { role: "finance" }, select: { email: true } })
        const finTo = [...new Set([
          FINANCE_INBOX,
          ...financeUsers.flatMap((u) => u.email ? [u.email] : []),
        ])]
        await sendMail({
          to: finTo,
          subject: `[Beeyond Trees] LPO ${lpoNumber} approved by CEO — for your records`,
          html: lpoApprovedEmail({ lpoNumber, supplierName, total: lpoTotal, approvedBy: actor, lpoUrl }),
        })
      } catch (e) { console.error("[mailer] LPO finance notify:", e) }

      // Assistant CEO approved on behalf — notify the CEO's dashboard/inbox.
      if (onBehalf) {
        try {
          const ceoUsers = await prisma.user.findMany({ where: { role: "admin" }, select: { email: true } })
          const ceoTo = ceoUsers.flatMap((u) => u.email ? [u.email] : [])
          if (ceoTo.length > 0) {
            await sendMail({
              to: ceoTo,
              subject: `[Beeyond Trees] LPO ${lpoNumber} approved ON YOUR BEHALF by ${actor}`,
              html: lpoApprovedEmail({ lpoNumber, supplierName, total: lpoTotal, approvedBy: `${actor} (Assistant CEO, on your behalf)`, lpoUrl }),
            })
          }
        } catch (e) { console.error("[mailer] LPO on-behalf CEO notify:", e) }
      }

      // The LPO is now generated — email the branded copy to the recipient entered
      // when it was created (if any). Fetched via raw SQL (not a Prisma column).
      try {
        const rows = await prisma.$queryRaw<{ recipientEmail: string | null; destinationOfGoods: string | null }[]>`
          SELECT "recipientEmail", "destinationOfGoods" FROM "Lpo" WHERE id = ${id}
        `
        const recipientEmail = rows[0]?.recipientEmail
        if (recipientEmail && updated) {
          await sendLpoEmail({ ...updated, destinationOfGoods: rows[0]?.destinationOfGoods ?? null }, recipientEmail)
        }
      } catch (e) { console.error("[mailer] LPO copy on approval:", e) }
    } else if (newStatus === "exec_approved" || newStatus === "chief_approved") {
      // Factory Admin (internal) or Chief (external) approved — notify the CEO for final sign-off
      const adminUsers = await prisma.user.findMany({ where: { role: "admin" }, select: { email: true } })
      const to = adminUsers.flatMap((u) => u.email ? [u.email] : [])
      if (to.length > 0) {
        await sendMail({
          to,
          subject: `[Beeyond Trees] LPO ${lpoNumber} awaiting your final approval`,
          html: lpoExecApprovedEmail({ lpoNumber, supplierName, total: lpoTotal, approvedBy: actor, lpoUrl }),
        })
      }
    }
  } catch (e) { console.error("[mailer] LPO approval notify:", e) }

  return NextResponse.json({ ...updated, status: newStatus, approvedBy: actor, approvedAt: new Date(), rejectionReason: action === "reject" ? reason : null, amended, destinationOfGoods })
}
