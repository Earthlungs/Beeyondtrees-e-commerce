import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"
import { TRACING_ROLES, computeReconciliation } from "@/lib/tracing"

const VIEW_ROLES = [...TRACING_ROLES, "admin"]

const include = {
  bulkRequest: true,
  sourcing: true,
  inspection: true,
  issuance: true,
  production: true,
  dispatch: true,
  receiving: true,
} as const

// GET — run the cost engine and the (auto or overridden) catalog price match.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth
  const { id } = await params

  const batch = await prisma.batch.findUnique({ where: { id }, include })
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const reconciliation = await computeReconciliation(batch)
  return NextResponse.json(reconciliation, { headers: { "Cache-Control": "no-store" } })
}

// POST { productId } — manually override the matched catalog product, snapshot
// its price, then return the recomputed reconciliation. Read-only on Product.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth
  const { id } = await params

  const body = await request.json().catch(() => null)
  const productId: string | null = body?.productId ?? null

  let sellingPriceSnapshot: number | null = null
  if (productId) {
    const p = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, retailPrice: true },
    })
    if (!p) return NextResponse.json({ error: "Product not found." }, { status: 400 })
    sellingPriceSnapshot = p.retailPrice
  }

  const batch = await prisma.batch.update({
    where: { id },
    data: { matchedProductId: productId, sellingPriceSnapshot },
    include,
  })

  const reconciliation = await computeReconciliation(batch)
  return NextResponse.json(reconciliation)
}
