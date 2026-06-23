import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireDocRole, normalizeLines, createNumbered, parseDate } from "@/lib/docs"
import { requireRole, isAdminish } from "@/lib/authz"
import { sendMail } from "@/lib/mailer"
import { lpoExecApprovedEmail } from "@/lib/email-templates"
import { sendLpoEmail, isValidEmail } from "@/lib/doc-email"

const BASE_URL = process.env.NEXTAUTH_URL || "https://www.beeyondtrees.org"

// Shared email template for "new LPO awaiting your review"
function lpoNewEmail({ lpoNumber, supplierName, total, lpoUrl, recipientRole }: {
  lpoNumber: string; supplierName: string; total: number; lpoUrl: string; recipientRole: string
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
    <h2 style="margin:0 0 8px;font-size:18px;color:#1a1a1a;">New LPO Awaiting Your Approval</h2>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px;">
      A new purchase order <strong>${lpoNumber}</strong> from <strong>${supplierName}</strong>
      for <strong>${ksh(total)}</strong> has been submitted and is waiting for ${recipientRole} approval.
    </p>
    <a href="${lpoUrl}" style="display:inline-block;padding:10px 22px;background:${GREEN};color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Review LPO →</a>
  </div>
  <div style="padding:16px 28px;background:#F5F1EC;font-size:11px;color:#999;text-align:center;">This is an automated notification from the Beeyond Trees operations system.</div>
</div></body></html>`
}

// Extra columns (status, approvedBy, approvedAt, rejectionReason,
// destinationOfGoods) are NOT in the Prisma schema — they're raw DB columns
// applied by migration. Raw SQL reads/writes them; if the columns don't exist
// yet (pre-migration) the try/catch falls back gracefully.
type ExtraFields = {
  status: string
  approvedBy: string | null
  approvedAt: Date | null
  rejectionReason: string | null
  destinationOfGoods: string | null
  amended: boolean
  origin: string | null
  createdByName: string | null
  onBehalf: boolean
}

const EXTRA_DEFAULTS: ExtraFields = {
  status: "approved", approvedBy: null, approvedAt: null, rejectionReason: null,
  destinationOfGoods: null, amended: false, origin: "internal", createdByName: null, onBehalf: false,
}

async function fetchExtras(ids: string[]): Promise<Map<string, ExtraFields>> {
  if (ids.length === 0) return new Map()
  try {
    const rows = await prisma.$queryRaw<(ExtraFields & { id: string })[]>`
      SELECT id, status, "approvedBy", "approvedAt", "rejectionReason", "destinationOfGoods", "amended", "origin", "createdByName", "onBehalf"
      FROM "Lpo"
      WHERE id = ANY(${ids}::text[])
    `
    return new Map(rows.map((r) => [r.id, r]))
  } catch {
    return new Map(ids.map((id) => [id, { ...EXTRA_DEFAULTS, status: null as unknown as string }]))
  }
}

// Roles allowed to view the LPO list: originators, both approval chains, finance
// (notified on CEO approval), CEO-level, and factory_manager (picks an approved LPO).
const LPO_VIEW_ROLES = [
  "procurement_officer", "external_procurement", "executive", "chief", "finance",
  "admin", "assistant_ceo", "it_specialist", "factory_manager",
]

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, LPO_VIEW_ROLES)
  if (auth instanceof NextResponse) return auth
  const lpos = await prisma.lpo.findMany({ orderBy: { createdAt: "desc" } })
  const extras = await fetchExtras(lpos.map((l) => l.id))
  const result = lpos.map((l) => ({ ...l, ...(extras.get(l.id) ?? EXTRA_DEFAULTS) }))
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: NextRequest) {
  const auth = await requireDocRole(request)
  if (auth instanceof NextResponse) return auth
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  if (!body.supplierName?.trim()) {
    return NextResponse.json({ error: "Supplier name is required." }, { status: 400 })
  }

  const { items, subtotal, vat, total } = normalizeLines(body.items)
  if (items.length === 0) {
    return NextResponse.json({ error: "Add at least one line item." }, { status: 400 })
  }

  // Two LPO lanes, decided by who raises it:
  //   external_procurement → origin "external" (Bamboosa); chain: Chief → CEO
  //   everyone else        → origin "internal" (Beeyond Trees); chain: Factory Admin → CEO
  //
  // Status on create:
  //   admin/IT/asst CEO      → "approved"       (skip both stages)
  //   external_procurement   → "pending_chief"  (awaiting Chief review)
  //   executive              → "exec_approved"  (Factory Admin self-approved → CEO)
  //   anyone else (internal) → "pending"        (awaiting Factory Admin review)
  const role = (auth.token as { role?: string }).role
  const isAdmin = isAdminish(role)
  const isExec = role === "executive"
  const isExternal = role === "external_procurement"
  const origin = isExternal ? "external" : "internal"
  const approver = (auth.token as { name?: string }).name || "Admin"
  const creatorId = (auth.token as { sub?: string }).sub || null
  const creatorName = (auth.token as { name?: string }).name || null
  const status = isAdmin ? "approved" : isExternal ? "pending_chief" : isExec ? "exec_approved" : "pending"
  const approvedAt = isAdmin ? new Date() : null
  const destinationOfGoods = body.destinationOfGoods?.trim() || null
  // Where to email the generated LPO. Stored now; sent immediately if the admin
  // creates it (already approved), otherwise sent on final approval (PATCH).
  const recipientEmail = typeof body.email === "string" && isValidEmail(body.email.trim()) ? body.email.trim() : null

  try {
    const lpo = await createNumbered(
      "LPO",
      () => prisma.lpo.count(),
      (number) =>
        prisma.lpo.create({
          data: {
            number,
            orderDate: parseDate(body.orderDate) ?? new Date(),
            expectedArrival: parseDate(body.expectedArrival),
            supplierName: body.supplierName.trim(),
            shippingAddress: body.shippingAddress?.trim() || null,
            purchaseRep: body.purchaseRep?.trim() || null,
            items: items as unknown as Prisma.InputJsonValue,
            subtotal,
            vat,
            total,
            notes: body.notes?.trim() || null,
          },
        })
    )

    // Set approval + destination fields via raw SQL — works after migration;
    // silently skipped before (columns don't exist yet).
    try {
      await prisma.$executeRaw`
        UPDATE "Lpo"
        SET status = ${status},
            "approvedBy" = ${isAdmin ? approver : null}::text,
            "approvedAt" = ${approvedAt}::timestamp,
            "destinationOfGoods" = ${destinationOfGoods}::text,
            "recipientEmail" = ${recipientEmail}::text,
            "origin" = ${origin}::text,
            "createdByUserId" = ${creatorId}::text,
            "createdByName" = ${creatorName}::text
        WHERE id = ${lpo.id}
      `
    } catch { /* migration not yet applied — fields applied on deploy */ }

    const lpoUrl = `${BASE_URL}/admin/lpo/${lpo.id}`
    const lpoNumber = lpo.number
    const supplierName = lpo.supplierName
    const lpoTotal = total

    if (status === "pending") {
      // Procurement officer submitted (internal) — notify Factory Admins to review
      try {
        const executives = await prisma.user.findMany({ where: { role: "executive" }, select: { email: true } })
        const to = executives.flatMap((u) => u.email ? [u.email] : [])
        if (to.length > 0) {
          await sendMail({
            to,
            subject: `[Beeyond Trees] New LPO ${lpoNumber} awaiting your approval`,
            html: lpoNewEmail({ lpoNumber, supplierName, total: lpoTotal, lpoUrl, recipientRole: "Factory Admin" }),
          })
        }
      } catch (e) { console.error("[mailer] LPO new (exec notify):", e) }
    } else if (status === "pending_chief") {
      // External Procurement (Bamboosa) submitted — notify Chiefs to review
      try {
        const chiefs = await prisma.user.findMany({ where: { role: "chief" }, select: { email: true } })
        const to = chiefs.flatMap((u) => u.email ? [u.email] : [])
        if (to.length > 0) {
          await sendMail({
            to,
            subject: `[Beeyond Trees] New EXTERNAL LPO ${lpoNumber} awaiting Chief approval`,
            html: lpoNewEmail({ lpoNumber, supplierName, total: lpoTotal, lpoUrl, recipientRole: "Chief" }),
          })
        }
      } catch (e) { console.error("[mailer] LPO new (chief notify):", e) }
    } else if (status === "exec_approved") {
      // Executive created LPO directly — notify admins for final sign-off
      try {
        const admins = await prisma.user.findMany({ where: { role: "admin" }, select: { email: true } })
        const to = admins.flatMap((u) => u.email ? [u.email] : [])
        if (to.length > 0) {
          await sendMail({
            to,
            subject: `[Beeyond Trees] LPO ${lpoNumber} awaiting final approval`,
            html: lpoExecApprovedEmail({ lpoNumber, supplierName, total: lpoTotal, approvedBy: approver, lpoUrl }),
          })
        }
      } catch (e) { console.error("[mailer] LPO new (admin notify):", e) }
    }

    // Admin-created LPOs are generated (approved) immediately — email the branded
    // copy to the entered recipient now. Non-approved LPOs are emailed on final
    // approval (see the PATCH handler).
    let emailed = false
    if (status === "approved" && recipientEmail) {
      try {
        await sendLpoEmail({ ...lpo, destinationOfGoods }, recipientEmail)
        emailed = true
      } catch (e) { console.error("[mailer] LPO copy:", e) }
    }

    return NextResponse.json({ ...lpo, status, approvedBy: isAdmin ? approver : null, approvedAt, destinationOfGoods, recipientEmail, emailed, amended: false }, { status: 201 })
  } catch (e) {
    console.error("LPO create failed:", e)
    return NextResponse.json({ error: "Could not save the LPO. Please try again." }, { status: 500 })
  }
}
