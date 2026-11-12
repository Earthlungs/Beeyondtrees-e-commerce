import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireDocRole, normalizeLines, createNumbered, parseDate } from "@/lib/docs"
import { requireRole, isAdminish } from "@/lib/authz"
import { withRetry, isMissingSchema, pgErrorCode } from "@/lib/db-retry"
import { sendMail } from "@/lib/mailer"
import { lpoExecApprovedEmail, lpoNewEmail } from "@/lib/email-templates"
import { sendLpoEmail, isValidEmail } from "@/lib/doc-email"

const BASE_URL = process.env.NEXTAUTH_URL || "https://www.beeyondtrees.org"

// status / paid / origin and the rest of the approval trail are raw DB columns
// (not in the Prisma schema), so the whole row is read with one raw SELECT.
// This used to be two queries — a Prisma findMany for the base columns plus a
// second raw query for these — which was both twice the latency and the source
// of a nasty failure mode: the first could succeed while the second failed, and
// the handler filled the gap with placeholder defaults. One query can only
// succeed or fail as a whole.
interface LpoRow {
  id: string
  number: string
  orderDate: Date
  expectedArrival: Date | null
  supplierName: string
  shippingAddress: string | null
  purchaseRep: string | null
  subtotal: number
  vat: number
  total: number
  notes: string | null
  createdAt: Date
  status: string
  approvedBy: string | null
  approvedAt: Date | null
  rejectionReason: string | null
  destinationOfGoods: string | null
  amended: boolean
  origin: string | null
  createdByName: string | null
  onBehalf: boolean
  attachmentUrl: string | null
  paid: boolean
  paidBy: string | null
  paidAt: Date | null
  paymentDetails: string | null
  items?: unknown
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

  // Line items are a JSON blob per LPO and only the delivery-note form needs
  // them (to prefill a consignment from what was ordered). The list screens
  // render five columns, so by default the payload leaves the blob out instead
  // of shipping 155 of them to render a table that never looks at one.
  const withItems = new URL(request.url).searchParams.get("items") === "1"

  try {
    const rows = await withRetry(() => prisma.$queryRaw<LpoRow[]>`
      SELECT id, number, "orderDate", "expectedArrival", "supplierName",
             "shippingAddress", "purchaseRep", subtotal, vat, total, notes,
             "createdAt", status, "approvedBy", "approvedAt", "rejectionReason",
             "destinationOfGoods", amended, origin, "createdByName", "onBehalf",
             "attachmentUrl", paid, "paidBy", "paidAt", "paymentDetails"
             ${withItems ? Prisma.sql`, items` : Prisma.empty}
      FROM "Lpo"
      ORDER BY "createdAt" DESC
    `, "lpos.list")
    return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } })
  } catch (e) {
    // No partial answer is served: a list whose statuses and payment flags are
    // placeholders is worse than an error the page can retry.
    console.error("[api/lpos] list failed:", isMissingSchema(e) ? `pg=${pgErrorCode(e)} (schema/search_path/role)` : "", e)
    return NextResponse.json({ error: "Database is temporarily unavailable. Try again shortly." }, { status: 503 })
  }
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
  // Optional image attachment (quote / delivery note / photo of goods) — a
  // Cloudinary secure URL uploaded from the browser. Follows the LPO through
  // approval and into the tracing pipeline.
  const attachmentUrl = typeof body.attachmentUrl === "string" && /^https?:\/\//.test(body.attachmentUrl.trim())
    ? body.attachmentUrl.trim() : null
  const paymentDetails = typeof body.paymentDetails === "string" ? body.paymentDetails.trim() || null : null

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
            "attachmentUrl" = ${attachmentUrl}::text,
            "origin" = ${origin}::text,
            "createdByUserId" = ${creatorId}::text,
            "createdByName" = ${creatorName}::text,
            "paymentDetails" = ${paymentDetails}::text
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
        await sendLpoEmail({ ...lpo, destinationOfGoods, paymentDetails }, recipientEmail)
        emailed = true
      } catch (e) { console.error("[mailer] LPO copy:", e) }
    }

    return NextResponse.json({ ...lpo, status, approvedBy: isAdmin ? approver : null, approvedAt, destinationOfGoods, recipientEmail, attachmentUrl, paymentDetails, emailed, amended: false }, { status: 201 })
  } catch (e) {
    console.error("LPO create failed:", e)
    return NextResponse.json({ error: "Could not save the LPO. Please try again." }, { status: 500 })
  }
}
