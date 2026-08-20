import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole, ADMINISH_ROLES } from "@/lib/authz"
import { isMissingColumn } from "@/lib/docs"

// Money actually settled, for the dashboard: LPOs finance has paid out, and
// customer invoices marked paid, each with what is still outstanding beside it.
//
// Both sets of `paid` columns were applied by migration rather than by
// `prisma db push` (deploys don't migrate this project's schema), so each half
// is read defensively and reports `pending: true` instead of failing when its
// migration hasn't run yet.
const FINANCE_ROLES = ["finance", ...ADMINISH_ROLES]

interface Bucket { paidCount: number; paidTotal: number; unpaidCount: number; unpaidTotal: number; pending?: boolean }

const EMPTY: Bucket = { paidCount: 0, paidTotal: 0, unpaidCount: 0, unpaidTotal: 0, pending: true }

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, FINANCE_ROLES)
  if (auth instanceof NextResponse) return auth

  const [lpos, invoices] = await Promise.all([lpoTotals(), invoiceTotals()])
  return NextResponse.json({ lpos, invoices }, { headers: { "Cache-Control": "no-store" } })
}

// Lpo's approval + payment columns live outside schema.prisma (see the model
// comment there), so this reads them raw. Only APPROVED LPOs can be paid, so
// "outstanding" counts approved-but-unpaid — a pending one isn't owed yet.
async function lpoTotals(): Promise<Bucket> {
  try {
    const rows = await prisma.$queryRaw<{ paid: boolean | null; count: number; total: number }[]>`
      SELECT paid, COUNT(*)::int AS count, COALESCE(SUM(total), 0)::float8 AS total
        FROM "Lpo"
       WHERE paid = true OR status = 'approved'
       GROUP BY paid
    `
    const paid = rows.find((r) => r.paid === true)
    const unpaid = rows.find((r) => r.paid !== true)
    return {
      paidCount: paid?.count ?? 0,
      paidTotal: paid?.total ?? 0,
      unpaidCount: unpaid?.count ?? 0,
      unpaidTotal: unpaid?.total ?? 0,
    }
  } catch {
    return EMPTY
  }
}

async function invoiceTotals(): Promise<Bucket> {
  try {
    const rows = await prisma.invoice.groupBy({
      by: ["paid"],
      _count: { _all: true },
      _sum: { total: true },
    })
    const paid = rows.find((r) => r.paid)
    const unpaid = rows.find((r) => !r.paid)
    return {
      paidCount: paid?._count._all ?? 0,
      paidTotal: paid?._sum.total ?? 0,
      unpaidCount: unpaid?._count._all ?? 0,
      unpaidTotal: unpaid?._sum.total ?? 0,
    }
  } catch (e) {
    if (isMissingColumn(e)) return EMPTY
    throw e
  }
}
