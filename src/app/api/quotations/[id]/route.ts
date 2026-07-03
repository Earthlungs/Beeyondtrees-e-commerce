import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireDocRole, normalizeLines, parseDate } from "@/lib/docs"
import { requireRole, isAdminish, isAssistantCeo } from "@/lib/authz"
import { sendMail } from "@/lib/mailer"
import { lpoApprovedEmail, lpoExecApprovedEmail } from "@/lib/email-templates"
import { sendQuotationEmail } from "@/lib/doc-email"

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000"

const QUOTATION_VIEW_ROLES = [
  "procurement_officer", "external_procurement", "executive", "chief",
  "admin", "assistant_ceo", "it_specialist",
]

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, QUOTATION_VIEW_ROLES)
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const quotation = await prisma.quotation.findUnique({ where: { id } })
  if (!quotation) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(quotation, { headers: { "Cache-Control": "no-store" } })
}

// Quotation approval — same two chains as the LPO (see /api/lpos/[id]):
//   internal: exec_approve/exec_amend (Factory Admin) → approve/reject (CEO)
//   external: chief_approve/chief_reject (Chief)       → approve/reject (CEO)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDocRole(request)
  if (auth instanceof NextResponse) return auth

  const role = (auth.token as { role?: string }).role
  const isAdmin = isAdminish(role)
  const isExec = role === "executive"
  const isChief = role === "chief"
  const onBehalf = isAssistantCeo(role)

  const { id } = await params
  const quotation = await prisma.quotation.findUnique({ where: { id } })
  if (!quotation) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json().catch(() => null)
  const action = body?.action

  const VALID = ["exec_approve", "exec_amend", "chief_approve", "chief_reject", "approve", "reject", "amend"]
  if (!VALID.includes(action)) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 })
  }

  if ((action === "exec_approve" || action === "exec_amend") && !isExec && !isAdmin) {
    return NextResponse.json({ error: "Only the Factory Admin can approve at this stage." }, { status: 403 })
  }
  if ((action === "chief_approve" || action === "chief_reject") && !isChief && !isAdmin) {
    return NextResponse.json({ error: "Only the Chief can approve external quotations at this stage." }, { status: 403 })
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

  const newStatus =
    action === "exec_approve" || action === "exec_amend" ? "exec_approved"
    : action === "chief_approve" ? "chief_approved"
    : action === "approve" || action === "amend" ? "approved"
    : "rejected"
  const amended = action === "exec_amend" || action === "amend"
  const isChiefApprove = action === "chief_approve"

  // Amend actions may also update the editable content (and the attachment).
  let contentUpdate: Prisma.QuotationUpdateInput = {}
  if ((action === "exec_amend" || action === "amend") && body?.items) {
    const { items, subtotal, vat, total } = normalizeLines(body.items)
    if (items.length === 0) {
      return NextResponse.json({ error: "Add at least one line item." }, { status: 400 })
    }
    contentUpdate = {
      ...(body.supplierName?.trim() && { supplierName: body.supplierName.trim() }),
      ...(body.shippingAddress !== undefined && { shippingAddress: body.shippingAddress?.trim() || null }),
      ...(body.purchaseRep !== undefined && { purchaseRep: body.purchaseRep?.trim() || null }),
      ...(body.orderDate !== undefined && { orderDate: parseDate(body.orderDate) ?? quotation.orderDate }),
      ...(body.expectedArrival !== undefined && { expectedArrival: parseDate(body.expectedArrival) }),
      ...(body.attachmentUrl !== undefined && {
        attachmentUrl: typeof body.attachmentUrl === "string" && /^https?:\/\//.test(body.attachmentUrl.trim())
          ? body.attachmentUrl.trim() : null,
      }),
      items: items as unknown as Prisma.InputJsonValue,
      subtotal,
      vat,
      total,
    }
  }

  const now = new Date()
  const updated = await prisma.quotation.update({
    where: { id },
    data: {
      ...contentUpdate,
      status: newStatus,
      ...(isChiefApprove
        ? { chiefApprovedBy: actor, chiefApprovedAt: now, ...(destinationOfGoods && { destinationOfGoods }) }
        : {
            approvedBy: actor,
            approvedAt: now,
            rejectionReason: action === "reject" || action === "chief_reject" ? reason : null,
            amended,
            onBehalf: newStatus === "approved" ? onBehalf : false,
            ...(destinationOfGoods && { destinationOfGoods }),
          }),
    },
  })

  const url = `${BASE_URL}/admin/quotations/${id}`

  try {
    if (newStatus === "approved") {
      // Emailed to the recipient entered at creation, if any.
      if (updated.recipientEmail) {
        try { await sendQuotationEmail(updated, updated.recipientEmail) }
        catch (e) { console.error("[mailer] Quotation copy on approval:", e) }
      }
      // Assistant CEO approved on behalf — notify the CEO.
      if (onBehalf) {
        try {
          const ceoUsers = await prisma.user.findMany({ where: { role: "admin" }, select: { email: true } })
          const ceoTo = ceoUsers.flatMap((u) => u.email ? [u.email] : [])
          if (ceoTo.length > 0) {
            await sendMail({
              to: ceoTo,
              subject: `[Beeyond Trees] Quotation ${updated.number} approved ON YOUR BEHALF by ${actor}`,
              html: lpoApprovedEmail({ lpoNumber: updated.number, supplierName: updated.supplierName, total: updated.total, approvedBy: `${actor} (COO, on your behalf)`, lpoUrl: url }),
            })
          }
        } catch (e) { console.error("[mailer] Quotation on-behalf CEO notify:", e) }
      }
    } else if (newStatus === "exec_approved" || newStatus === "chief_approved") {
      // First stage approved — notify the CEO for final sign-off.
      const adminUsers = await prisma.user.findMany({ where: { role: "admin" }, select: { email: true } })
      const to = adminUsers.flatMap((u) => u.email ? [u.email] : [])
      if (to.length > 0) {
        await sendMail({
          to,
          subject: `[Beeyond Trees] Quotation ${updated.number} awaiting your final approval`,
          html: lpoExecApprovedEmail({ lpoNumber: updated.number, supplierName: updated.supplierName, total: updated.total, approvedBy: actor, lpoUrl: url }),
        })
      }
    }
  } catch (e) { console.error("[mailer] Quotation approval notify:", e) }

  return NextResponse.json(updated)
}
