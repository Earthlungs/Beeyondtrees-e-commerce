import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireDocRole, normalizeLines, nextDocNumber } from "@/lib/docs"

export async function GET(request: NextRequest) {
  const auth = await requireDocRole(request)
  if (auth instanceof NextResponse) return auth
  const invoices = await prisma.invoice.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(invoices, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: NextRequest) {
  const auth = await requireDocRole(request)
  if (auth instanceof NextResponse) return auth
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  if (!body.customerName?.trim()) {
    return NextResponse.json({ error: "Customer name is required." }, { status: 400 })
  }

  const { items, subtotal, vat, total } = normalizeLines(body.items)
  if (items.length === 0) {
    return NextResponse.json({ error: "Add at least one line item." }, { status: 400 })
  }

  const invoice = await prisma.$transaction(async (tx) => {
    const count = await tx.invoice.count()
    return tx.invoice.create({
      data: {
        number: nextDocNumber("INV", count),
        date: body.date ? new Date(body.date) : new Date(),
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        customerName: body.customerName.trim(),
        customerContact: body.customerContact?.trim() || null,
        items: items as unknown as Prisma.InputJsonValue,
        subtotal,
        vat,
        total,
        notes: body.notes?.trim() || null,
      },
    })
  })
  return NextResponse.json(invoice, { status: 201 })
}
