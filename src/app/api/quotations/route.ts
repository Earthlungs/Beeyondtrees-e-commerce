import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireDocRole, normalizeLines, createNumbered, parseDate } from "@/lib/docs"
import { requireRole, isAdminish } from "@/lib/authz"
import { sendMail } from "@/lib/mailer"
import { lpoExecApprovedEmail } from "@/lib/email-templates"
import { sendQuotationEmail, isValidEmail } from "@/lib/doc-email"

const BASE_URL = process.env.NEXTAUTH_URL || "https://www.beeyondtrees.org"

// "New quotation awaiting your review" notification (mirrors the LPO one).
function quotationNewEmail({ number, supplierName, total, url, recipientRole }: {
  number: string; supplierName: string; total: number; url: string; recipientRole: string
}) {
  const ksh = (n: number) => `KSh ${n.toLocaleString()}`
  const GREEN = "#6B7D5C"
  const LOGO_URL = `${BASE_URL}/icons/icon-192.png`
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F5F1EC;font-family:system-ui,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <div style="background:${GREEN};padding:16px 28px;display:flex;align-items:center;gap:12px;">
    <img src="${LOGO_URL}" width="44" height="44" style="width:44px;height:44px;object-fit:contain;border-radius:10px;background:#fff;padding:4px;flex-shrink:0;" />
    <span style="color:#fff;font-size:20px;font-weight:700;">Beeyond Trees</span>
  </div>
  <div style="padding:28px;">
    <h2 style="margin:0 0 8px;font-size:18px;color:#1a1a1a;">New Quotation Awaiting Your Approval</h2>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px;">
      A new quotation <strong>${number}</strong> from <strong>${supplierName}</strong>
      for <strong>${ksh(total)}</strong> has been submitted and is waiting for ${recipientRole} approval.
    </p>
    <a href="${url}" style="display:inline-block;padding:10px 22px;background:${GREEN};color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Review Quotation →</a>
  </div>
  <div style="padding:16px 28px;background:#F5F1EC;font-size:11px;color:#999;text-align:center;">This is an automated notification from the Beeyond Trees operations system.</div>
</div></body></html>`
}

// Same viewers as the LPO list, minus finance/factory_manager (quotations don't
// feed payments or the tracing pipeline).
const QUOTATION_VIEW_ROLES = [
  "procurement_officer", "external_procurement", "executive", "chief",
  "admin", "assistant_ceo", "it_specialist",
]

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, QUOTATION_VIEW_ROLES)
  if (auth instanceof NextResponse) return auth
  const quotations = await prisma.quotation.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(quotations, { headers: { "Cache-Control": "no-store" } })
}

// Same two approval lanes as the LPO (see /api/lpos):
//   external_procurement → "pending_chief"  (Chief → CEO)
//   executive            → "exec_approved"  (self-approved → CEO)
//   admin/IT/asst CEO    → "approved"
//   anyone else          → "pending"        (Factory Admin → CEO)
export async function POST(request: NextRequest) {
  const auth = await requireDocRole(request)
  if (auth instanceof NextResponse) return auth
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  if (!body.supplierName?.trim()) {
    return NextResponse.json({ error: "Supplier representative is required." }, { status: 400 })
  }

  const { items, subtotal, vat, total } = normalizeLines(body.items)
  if (items.length === 0) {
    return NextResponse.json({ error: "Add at least one line item." }, { status: 400 })
  }

  const role = (auth.token as { role?: string }).role
  const isAdmin = isAdminish(role)
  const isExec = role === "executive"
  const isExternal = role === "external_procurement"
  const origin = isExternal ? "external" : "internal"
  const approver = (auth.token as { name?: string }).name || "Admin"
  const creatorId = (auth.token as { sub?: string }).sub || null
  const creatorName = (auth.token as { name?: string }).name || null
  const status = isAdmin ? "approved" : isExternal ? "pending_chief" : isExec ? "exec_approved" : "pending"
  const recipientEmail = typeof body.email === "string" && isValidEmail(body.email.trim()) ? body.email.trim() : null
  const attachmentUrl = typeof body.attachmentUrl === "string" && /^https?:\/\//.test(body.attachmentUrl.trim())
    ? body.attachmentUrl.trim() : null

  try {
    const quotation = await createNumbered(
      "QUO",
      () => prisma.quotation.count(),
      (number) =>
        prisma.quotation.create({
          data: {
            number,
            orderDate: parseDate(body.orderDate) ?? new Date(),
            expectedArrival: parseDate(body.expectedArrival),
            supplierName: body.supplierName.trim(),
            shippingAddress: body.shippingAddress?.trim() || null,
            purchaseRep: body.purchaseRep?.trim() || null,
            destinationOfGoods: body.destinationOfGoods?.trim() || null,
            items: items as unknown as Prisma.InputJsonValue,
            subtotal,
            vat,
            total,
            status,
            origin,
            approvedBy: isAdmin ? approver : null,
            approvedAt: isAdmin ? new Date() : null,
            createdByUserId: creatorId,
            createdByName: creatorName,
            recipientEmail,
            attachmentUrl,
          },
        })
    )

    const url = `${BASE_URL}/admin/quotations/${quotation.id}`

    if (status === "pending") {
      try {
        const executives = await prisma.user.findMany({ where: { role: "executive" }, select: { email: true } })
        const to = executives.flatMap((u) => u.email ? [u.email] : [])
        if (to.length > 0) {
          await sendMail({
            to,
            subject: `[Beeyond Trees] New Quotation ${quotation.number} awaiting your approval`,
            html: quotationNewEmail({ number: quotation.number, supplierName: quotation.supplierName, total, url, recipientRole: "Factory Admin" }),
          })
        }
      } catch (e) { console.error("[mailer] Quotation new (exec notify):", e) }
    } else if (status === "pending_chief") {
      try {
        const chiefs = await prisma.user.findMany({ where: { role: "chief" }, select: { email: true } })
        const to = chiefs.flatMap((u) => u.email ? [u.email] : [])
        if (to.length > 0) {
          await sendMail({
            to,
            subject: `[Beeyond Trees] New EXTERNAL Quotation ${quotation.number} awaiting Chief approval`,
            html: quotationNewEmail({ number: quotation.number, supplierName: quotation.supplierName, total, url, recipientRole: "Chief" }),
          })
        }
      } catch (e) { console.error("[mailer] Quotation new (chief notify):", e) }
    } else if (status === "exec_approved") {
      try {
        const admins = await prisma.user.findMany({ where: { role: "admin" }, select: { email: true } })
        const to = admins.flatMap((u) => u.email ? [u.email] : [])
        if (to.length > 0) {
          await sendMail({
            to,
            subject: `[Beeyond Trees] Quotation ${quotation.number} awaiting final approval`,
            html: lpoExecApprovedEmail({ lpoNumber: quotation.number, supplierName: quotation.supplierName, total, approvedBy: approver, lpoUrl: url }),
          })
        }
      } catch (e) { console.error("[mailer] Quotation new (admin notify):", e) }
    }

    // Admin-created quotations are approved immediately — email the branded copy now.
    let emailed = false
    if (status === "approved" && recipientEmail) {
      try {
        await sendQuotationEmail(quotation, recipientEmail)
        emailed = true
      } catch (e) { console.error("[mailer] Quotation copy:", e) }
    }

    return NextResponse.json({ ...quotation, emailed }, { status: 201 })
  } catch (e) {
    console.error("Quotation create failed:", e)
    return NextResponse.json({ error: "Could not save the quotation. Please try again." }, { status: 500 })
  }
}
