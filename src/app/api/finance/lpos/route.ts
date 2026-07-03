import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole, ADMINISH_ROLES } from "@/lib/authz"

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
             "attachmentUrl", "recipientEmail"
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
