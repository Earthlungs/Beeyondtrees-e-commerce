import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole, ADMINISH_ROLES } from "@/lib/authz"
import { sendMail } from "@/lib/mailer"
import { lpoPaidEmail } from "@/lib/email-templates"

const BASE_URL = process.env.NEXTAUTH_URL || "https://www.beeyondtrees.org"

// Finance dashboard feed — every LPO with its full approval audit trail
// (who approved at each stage, when, amounts, rejection reasons). The extra
// columns are raw DB columns (not in the Prisma schema), so this reads them
// in one raw query; if the migration hasn't run it falls back to the base rows.
const FINANCE_ROLES = ["finance", ...ADMINISH_ROLES]

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, FINANCE_ROLES)
  if (auth instanceof NextResponse) return auth

  try {
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT id, number, "supplierName", "orderDate", "expectedArrival",
             subtotal, vat, total, "createdAt",
             status, "approvedBy", "approvedAt", "rejectionReason",
             "destinationOfGoods", amended, "onBehalf", origin,
             "createdByName", "chiefApprovedBy", "chiefApprovedAt",
             "attachmentUrl", "recipientEmail",
             paid, "paidBy", "paidAt"
      FROM "Lpo"
      ORDER BY "createdAt" DESC
    `
    return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } })
  } catch {
    // Pre-migration fallback: base Prisma columns only.
    const lpos = await prisma.lpo.findMany({ orderBy: { createdAt: "desc" } })
    return NextResponse.json(lpos, { headers: { "Cache-Control": "no-store" } })
  }
}

// Mark an approved LPO as paid. Records who marked it and when, then emails
// the person who raised the LPO. The LPO list reflects it immediately.
export async function PATCH(request: NextRequest) {
  const auth = await requireRole(request, FINANCE_ROLES)
  if (auth instanceof NextResponse) return auth

  const body = await request.json().catch(() => null)
  const id = typeof body?.id === "string" ? body.id : null
  if (!id) return NextResponse.json({ error: "Missing LPO id." }, { status: 400 })

  const rows = await prisma.$queryRaw<{ number: string; supplierName: string; total: number; status: string | null; paid: boolean; createdByUserId: string | null; createdByName: string | null }[]>`
    SELECT number, "supplierName", total, status, paid, "createdByUserId", "createdByName"
    FROM "Lpo" WHERE id = ${id}
  `
  const lpo = rows[0]
  if (!lpo) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (lpo.status && lpo.status !== "approved") {
    return NextResponse.json({ error: "Only fully approved LPOs can be marked as paid." }, { status: 400 })
  }
  if (lpo.paid) return NextResponse.json({ error: "This LPO is already marked as paid." }, { status: 400 })

  const actor = (auth.token as { name?: string }).name || "Finance"
  const now = new Date()
  await prisma.$executeRaw`
    UPDATE "Lpo" SET paid = true, "paidBy" = ${actor}::text, "paidAt" = ${now}::timestamp
    WHERE id = ${id}
  `

  // Notify whoever raised the LPO that finance has paid it.
  let emailed = false
  try {
    let to: string | null = null
    if (lpo.createdByUserId) {
      const user = await prisma.user.findUnique({ where: { id: lpo.createdByUserId }, select: { email: true } })
      to = user?.email ?? null
    }
    if (!to && lpo.createdByName) {
      const user = await prisma.user.findFirst({ where: { name: lpo.createdByName }, select: { email: true } })
      to = user?.email ?? null
    }
    if (to) {
      await sendMail({
        to,
        subject: `[Beeyond Trees] LPO ${lpo.number} has been PAID`,
        html: lpoPaidEmail({
          lpoNumber: lpo.number,
          supplierName: lpo.supplierName,
          total: Number(lpo.total) || 0,
          paidBy: actor,
          lpoUrl: `${BASE_URL}/admin/lpo/${id}`,
        }),
      })
      emailed = true
    }
  } catch (e) { console.error("[mailer] LPO paid notify:", e) }

  return NextResponse.json({ id, paid: true, paidBy: actor, paidAt: now, emailed })
}
