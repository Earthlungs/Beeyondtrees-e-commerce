import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireDocRole, normalizeLines, parseDate } from "@/lib/docs"
import { requireRole, isAdminish, isAssistantCeo } from "@/lib/authz"
import { sendMail } from "@/lib/mailer"
import { lpoApprovedEmail, lpoExecApprovedEmail, lpoNewEmail, lpoRejectedEmail } from "@/lib/email-templates"
import { sendLpoEmail, sendLpoRejectedToCreatorEmail } from "@/lib/doc-email"

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000"
// Shared finance inbox that always gets a CEO-approval alert (overridable by env).
const FINANCE_INBOX = process.env.FINANCE_INBOX || "finance@earthlungs.org"

async function fetchExtras(id: string) {
  try {
    const rows = await prisma.$queryRaw<{ status: string; approvedBy: string | null; approvedAt: Date | null; rejectionReason: string | null; destinationOfGoods: string | null; amended: boolean; origin: string | null; createdByName: string | null; createdByUserId: string | null; onBehalf: boolean; chiefApprovedBy: string | null; attachmentUrl: string | null; paid: boolean; paidBy: string | null; paidAt: Date | null; paymentDetails: string | null }[]>`
      SELECT status, "approvedBy", "approvedAt", "rejectionReason", "destinationOfGoods", "amended", "origin", "createdByName", "createdByUserId", "onBehalf", "chiefApprovedBy", "attachmentUrl", paid, "paidBy", "paidAt", "paymentDetails"
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

  const VALID = ["exec_approve", "exec_amend", "chief_approve", "chief_amend", "chief_reject", "approve", "reject", "amend", "resubmit"]
  if (!VALID.includes(action)) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 })
  }

  // Role gates per action
  if ((action === "exec_approve" || action === "exec_amend") && !isExec && !isAdmin) {
    return NextResponse.json({ error: "Only the Factory Admin can approve at this stage." }, { status: 403 })
  }
  if ((action === "chief_approve" || action === "chief_amend" || action === "chief_reject") && !isChief && !isAdmin) {
    return NextResponse.json({ error: "Only the Chief can approve external LPOs at this stage." }, { status: 403 })
  }
  if ((action === "approve" || action === "reject" || action === "amend") && !isAdmin) {
    return NextResponse.json({ error: "Only the CEO can perform the final approval." }, { status: 403 })
  }

  // createdByUserId/createdByName are raw columns — fetched here both to gate
  // "resubmit" to the original creator and to notify them later if rejected.
  let currentStatus: string | null = null
  let createdByUserId: string | null = null
  let createdByName: string | null = null
  let lpoOrigin: string | null = null
  try {
    const rows = await prisma.$queryRaw<{ status: string; createdByUserId: string | null; createdByName: string | null; origin: string | null }[]>`
      SELECT status, "createdByUserId", "createdByName", "origin" FROM "Lpo" WHERE id = ${id}
    `
    if (rows[0]) { currentStatus = rows[0].status; createdByUserId = rows[0].createdByUserId; createdByName = rows[0].createdByName; lpoOrigin = rows[0].origin }
  } catch { /* pre-migration — columns not there yet */ }

  // External Procurement is a single-purpose role (just Bamboosa/EBIL orders) —
  // anyone in it may resubmit any rejected external LPO, not only its original
  // raiser. Simpler and more robust than matching the exact creator, whose
  // account may since have been renamed or deleted.
  const isExternalProcurement = role === "external_procurement"

  if (action === "resubmit") {
    const tokenInfo = auth.token as { sub?: string; name?: string }
    const raisedByMe =
      (!!tokenInfo.sub && createdByUserId === tokenInfo.sub) ||
      (!!tokenInfo.name && createdByName === tokenInfo.name) ||
      (lpoOrigin === "external" && isExternalProcurement)
    if (!raisedByMe && !isAdmin) {
      return NextResponse.json({ error: "Only the person who raised this LPO can resubmit it." }, { status: 403 })
    }
    if (currentStatus !== "rejected") {
      return NextResponse.json({ error: "Only a rejected LPO can be resubmitted." }, { status: 400 })
    }
  }

  const reason = typeof body?.reason === "string" ? body.reason.trim() : ""
  if ((action === "reject" || action === "chief_reject") && !reason) {
    return NextResponse.json({ error: "A reason is required to reject." }, { status: 400 })
  }

  const actor = (auth.token as { name?: string }).name || "Unknown"
  const destinationOfGoods = typeof body?.destinationOfGoods === "string" ? body.destinationOfGoods.trim() || null : null

  // Determine new status and amended flag. A resubmission re-enters the chain
  // at whichever stage a fresh submission from this role would — same formula
  // the POST handler uses when the LPO is first created.
  const isExternal = role === "external_procurement"
  const newStatus =
    action === "resubmit" ? (isAdmin ? "approved" : isExternal ? "pending_chief" : isExec ? "exec_approved" : "pending")
    : action === "exec_approve" || action === "exec_amend" ? "exec_approved"
    : action === "chief_approve" || action === "chief_amend" ? "chief_approved"
    : action === "approve" || action === "amend" ? "approved"
    : "rejected" // reject | chief_reject
  const amended = action === "exec_amend" || action === "amend" || action === "chief_amend" || action === "resubmit"
  const isChiefApprove = action === "chief_approve" || action === "chief_amend"

  // For amend/resubmit actions: update editable content first
  if ((action === "exec_amend" || action === "amend" || action === "chief_amend" || action === "resubmit") && body?.items) {
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

    // Attachment and payment details are raw columns (not in the Prisma schema) — updated separately.
    if (body.attachmentUrl !== undefined) {
      const nextAttachment = typeof body.attachmentUrl === "string" && /^https?:\/\//.test(body.attachmentUrl.trim())
        ? body.attachmentUrl.trim() : null
      try {
        await prisma.$executeRaw`UPDATE "Lpo" SET "attachmentUrl" = ${nextAttachment}::text WHERE id = ${id}`
      } catch { /* pre-migration — column not there yet */ }
    }
    if (body.paymentDetails !== undefined) {
      const nextPaymentDetails = typeof body.paymentDetails === "string" ? body.paymentDetails.trim() || null : null
      try {
        await prisma.$executeRaw`UPDATE "Lpo" SET "paymentDetails" = ${nextPaymentDetails}::text WHERE id = ${id}`
      } catch { /* pre-migration — column not there yet */ }
    }
  }

  // Apply status change. Chief approval records its own audit columns and does
  // NOT overwrite the final approvedBy. The final CEO approval records onBehalf
  // when an Assistant CEO performed it.
  const now = new Date()
  try {
    if (action === "resubmit") {
      // A resubmission is a fresh re-entry into the chain, not an approval —
      // clear every prior approval/rejection trace rather than stamping the
      // creator as the approver.
      await prisma.$executeRaw`
        UPDATE "Lpo"
        SET status = ${newStatus},
            "approvedBy" = NULL,
            "approvedAt" = NULL,
            "chiefApprovedBy" = NULL,
            "chiefApprovedAt" = NULL,
            "rejectionReason" = NULL,
            "amended" = ${amended},
            "onBehalf" = false,
            "destinationOfGoods" = COALESCE(${destinationOfGoods}::text, "destinationOfGoods")
        WHERE id = ${id}
      `
    } else if (isChiefApprove) {
      await prisma.$executeRaw`
        UPDATE "Lpo"
        SET status = ${newStatus},
            "chiefApprovedBy" = ${actor}::text,
            "chiefApprovedAt" = ${now}::timestamp,
            "amended" = ${amended},
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
              html: lpoApprovedEmail({ lpoNumber, supplierName, total: lpoTotal, approvedBy: `${actor} (COO, on your behalf)`, lpoUrl }),
            })
          }
        } catch (e) { console.error("[mailer] LPO on-behalf CEO notify:", e) }
      }

      // The LPO is now generated — email the branded copy to the recipient entered
      // when it was created (if any). Fetched via raw SQL (not a Prisma column).
      try {
        const rows = await prisma.$queryRaw<{ recipientEmail: string | null; destinationOfGoods: string | null; paymentDetails: string | null }[]>`
          SELECT "recipientEmail", "destinationOfGoods", "paymentDetails" FROM "Lpo" WHERE id = ${id}
        `
        const recipientEmail = rows[0]?.recipientEmail
        if (recipientEmail && updated) {
          await sendLpoEmail({ ...updated, destinationOfGoods: rows[0]?.destinationOfGoods ?? null, paymentDetails: rows[0]?.paymentDetails ?? null }, recipientEmail)
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
    } else if (newStatus === "rejected") {
      // Every rejection (Chief, COO on behalf, or the CEO himself) alerts the
      // CEO's inbox so nothing is killed quietly.
      const adminUsers = await prisma.user.findMany({ where: { role: "admin" }, select: { email: true } })
      const to = adminUsers.flatMap((u) => u.email ? [u.email] : [])
      if (to.length > 0) {
        await sendMail({
          to,
          subject: `[Beeyond Trees] LPO ${lpoNumber} REJECTED by ${actor}`,
          html: lpoRejectedEmail({ lpoNumber, supplierName, total: lpoTotal, rejectedBy: actor, reason, lpoUrl }),
        })
      }

      // Also tell whoever raised it — they can't fix what they don't know is broken.
      try {
        if (createdByUserId) {
          const creator = await prisma.user.findUnique({ where: { id: createdByUserId }, select: { email: true } })
          if (creator?.email) {
            await sendLpoRejectedToCreatorEmail({ id, number: lpoNumber, supplierName, total: lpoTotal }, actor, reason, creator.email)
          }
        } else if (lpoOrigin === "external") {
          // No creator recorded (LPO predates creator-tracking) — fall back to
          // every External Procurement user rather than notifying no one.
          const epUsers = await prisma.user.findMany({ where: { role: "external_procurement" }, select: { email: true } })
          const epTo = epUsers.flatMap((u) => u.email ? [u.email] : [])
          if (epTo.length > 0) {
            await sendLpoRejectedToCreatorEmail({ id, number: lpoNumber, supplierName, total: lpoTotal }, actor, reason, epTo)
          }
        }
      } catch (e) { console.error("[mailer] LPO rejected creator notify:", e) }
    } else if (newStatus === "pending") {
      // Resubmitted internal LPO — notify Factory Admins to review it again
      const executives = await prisma.user.findMany({ where: { role: "executive" }, select: { email: true } })
      const to = executives.flatMap((u) => u.email ? [u.email] : [])
      if (to.length > 0) {
        await sendMail({
          to,
          subject: `[Beeyond Trees] LPO ${lpoNumber} resubmitted — awaiting your approval`,
          html: lpoNewEmail({ lpoNumber, supplierName, total: lpoTotal, lpoUrl, recipientRole: "Factory Admin" }),
        })
      }
    } else if (newStatus === "pending_chief") {
      // Resubmitted external LPO — notify Chiefs to review it again
      const chiefs = await prisma.user.findMany({ where: { role: "chief" }, select: { email: true } })
      const to = chiefs.flatMap((u) => u.email ? [u.email] : [])
      if (to.length > 0) {
        await sendMail({
          to,
          subject: `[Beeyond Trees] EXTERNAL LPO ${lpoNumber} resubmitted — awaiting Chief approval`,
          html: lpoNewEmail({ lpoNumber, supplierName, total: lpoTotal, lpoUrl, recipientRole: "Chief" }),
        })
      }
    }
  } catch (e) { console.error("[mailer] LPO approval notify:", e) }

  return NextResponse.json({
    ...updated,
    status: newStatus,
    approvedBy: action === "resubmit" ? null : actor,
    approvedAt: action === "resubmit" ? null : new Date(),
    rejectionReason: action === "reject" || action === "chief_reject" ? reason : null,
    amended,
    destinationOfGoods,
  })
}
