import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireDocRole, normalizeLines, createNumbered } from "@/lib/docs"

export async function GET(request: NextRequest) {
  const auth = await requireDocRole(request)
  if (auth instanceof NextResponse) return auth
  const lpos = await prisma.lpo.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(lpos, { headers: { "Cache-Control": "no-store" } })
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

  try {
    const lpo = await createNumbered(
      "LPO",
      () => prisma.lpo.count(),
      (number) =>
        prisma.lpo.create({
          data: {
            number,
            orderDate: body.orderDate ? new Date(body.orderDate) : new Date(),
            expectedArrival: body.expectedArrival ? new Date(body.expectedArrival) : null,
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
    return NextResponse.json(lpo, { status: 201 })
  } catch (e) {
    console.error("LPO create failed:", e)
    return NextResponse.json({ error: "Could not save the LPO. Please try again." }, { status: 500 })
  }
}
