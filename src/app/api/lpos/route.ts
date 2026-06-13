import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireDocRole, normalizeLines, nextDocNumber } from "@/lib/docs"

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

  const lpo = await prisma.$transaction(async (tx) => {
    const count = await tx.lpo.count()
    return tx.lpo.create({
      data: {
        number: nextDocNumber("LPO", count),
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
  })
  return NextResponse.json(lpo, { status: 201 })
}
