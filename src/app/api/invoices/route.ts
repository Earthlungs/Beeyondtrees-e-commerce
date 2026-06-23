import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireDocRole, normalizeLines, createNumbered, parseDate } from "@/lib/docs"
import { sendInvoiceEmail, isValidEmail } from "@/lib/doc-email"

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

  try {
    const invoice = await createNumbered(
      "INV",
      () => prisma.invoice.count(),
      (number) =>
        prisma.invoice.create({
          data: {
            number,
            date: parseDate(body.date) ?? new Date(),
            dueDate: parseDate(body.dueDate),
            customerName: body.customerName.trim(),
            customerContact: body.customerContact?.trim() || null,
            items: items as unknown as Prisma.InputJsonValue,
            subtotal,
            vat,
            total,
            notes: body.notes?.trim() || null,
          },
        })
    )

    // Auto-email a branded copy if a recipient was entered on the form. An email
    // failure must never fail the invoice that's already saved.
    const emailTo = typeof body.email === "string" ? body.email.trim() : ""
    let emailed = false
    if (isValidEmail(emailTo)) {
      try {
        await sendInvoiceEmail(invoice, emailTo)
        emailed = true
      } catch (e) { console.error("[mailer] invoice copy:", e) }
    }

    return NextResponse.json({ ...invoice, emailed }, { status: 201 })
  } catch (e) {
    console.error("Invoice create failed:", e)
    return NextResponse.json({ error: "Could not save the invoice. Please try again." }, { status: 500 })
  }
}
