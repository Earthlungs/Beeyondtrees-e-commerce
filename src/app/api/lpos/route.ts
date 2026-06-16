import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireDocRole, normalizeLines, createNumbered, parseDate } from "@/lib/docs"
import { isAdminish } from "@/lib/authz"

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
}

async function fetchExtras(ids: string[]): Promise<Map<string, ExtraFields>> {
  if (ids.length === 0) return new Map()
  try {
    const rows = await prisma.$queryRaw<(ExtraFields & { id: string })[]>`
      SELECT id, status, "approvedBy", "approvedAt", "rejectionReason", "destinationOfGoods", "amended"
      FROM "Lpo"
      WHERE id = ANY(${ids}::text[])
    `
    return new Map(rows.map((r) => [r.id, r]))
  } catch {
    return new Map(ids.map((id) => [id, { status: null as unknown as string, approvedBy: null, approvedAt: null, rejectionReason: null, destinationOfGoods: null, amended: false }]))
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireDocRole(request)
  if (auth instanceof NextResponse) return auth
  const lpos = await prisma.lpo.findMany({ orderBy: { createdAt: "desc" } })
  const extras = await fetchExtras(lpos.map((l) => l.id))
  const result = lpos.map((l) => ({ ...l, ...(extras.get(l.id) ?? { status: "approved", approvedBy: null, approvedAt: null, rejectionReason: null, destinationOfGoods: null, amended: false }) }))
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

  // Admin/IT-created LPOs are auto-approved; merchant-created are pending.
  const role = (auth.token as { role?: string }).role
  const isAdmin = isAdminish(role)
  const approver = (auth.token as { name?: string }).name || "Admin"
  const status = isAdmin ? "approved" : "pending"
  const approvedAt = isAdmin ? new Date() : null
  const destinationOfGoods = body.destinationOfGoods?.trim() || null

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
            "destinationOfGoods" = ${destinationOfGoods}::text
        WHERE id = ${lpo.id}
      `
    } catch { /* migration not yet applied — fields applied on deploy */ }

    return NextResponse.json({ ...lpo, status, approvedBy: isAdmin ? approver : null, approvedAt, destinationOfGoods, amended: false }, { status: 201 })
  } catch (e) {
    console.error("LPO create failed:", e)
    return NextResponse.json({ error: "Could not save the LPO. Please try again." }, { status: 500 })
  }
}
