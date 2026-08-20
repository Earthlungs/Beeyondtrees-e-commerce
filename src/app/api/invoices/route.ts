import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireDocRole, normalizeLines, createNumbered, parseDate, isMissingColumn } from "@/lib/docs"
import { sendInvoiceEmail, isValidEmail } from "@/lib/doc-email"
import { decrementCatalogStock, InsufficientStockError } from "@/lib/orders"

const MIGRATION_HINT =
  "Invoice payment tracking isn't set up on the database yet — run prisma/migrate-ops-2026-08.sql."

// Columns that predate prisma/migrate-ops-2026-08.sql. Used by the fallback
// read below so the list still renders on a database where that script hasn't
// been run yet (deploying does not migrate the schema on this project).
const BASE_COLUMNS = Prisma.sql`
  id, number, date, "dueDate", "customerName", "customerContact",
  items, subtotal, vat, total, notes, "createdAt", "updatedAt"
`

export async function GET(request: NextRequest) {
  const auth = await requireDocRole(request)
  if (auth instanceof NextResponse) return auth
  try {
    const invoices = await prisma.invoice.findMany({ orderBy: { createdAt: "desc" } })
    return NextResponse.json(invoices, { headers: { "Cache-Control": "no-store" } })
  } catch (e) {
    if (!isMissingColumn(e)) throw e
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT ${BASE_COLUMNS} FROM "Invoice" ORDER BY "createdAt" DESC
    `
    // paid:false keeps the list rendering; migrationPending tells the UI to
    // explain why the Mark Paid controls are missing rather than stay silent.
    return NextResponse.json(
      rows.map((r) => ({ ...r, paid: false, migrationPending: true })),
      { headers: { "Cache-Control": "no-store" } }
    )
  }
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

  const token = auth.token as { sub?: string; name?: string }

  let invoice
  try {
    invoice = await createNumbered(
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
            createdByUserId: token.sub ?? null,
            createdByName: token.name ?? null,
          },
        })
    )
  } catch (e) {
    if (isMissingColumn(e)) {
      return NextResponse.json({ error: MIGRATION_HINT }, { status: 503 })
    }
    console.error("Invoice create failed:", e)
    return NextResponse.json({ error: "Could not save the invoice. Please try again." }, { status: 500 })
  }

  // Invoiced quantities leave the shelf: catalog lines take stock now, at the
  // point the invoice is raised (not when it is paid — the goods are committed
  // either way). Service lines carry no productId and are skipped.
  //
  // If stock is short the invoice must not stand, so we delete the row we just
  // created — it is seconds old and nothing references it, and createNumbered
  // seeds from count() so the number is simply reused by the next attempt.
  try {
    await decrementCatalogStock(items.map((l) => ({ productId: l.productId, quantity: l.qty })))
    await prisma.invoice.update({ where: { id: invoice.id }, data: { stockDeducted: true } })
  } catch (e) {
    await prisma.invoice.delete({ where: { id: invoice.id } }).catch(() => {})
    if (e instanceof InsufficientStockError) {
      const detail = e.items
        .map((i) => `${i.productName} — asked for ${i.requested}, only ${i.available} in stock`)
        .join("; ")
      return NextResponse.json(
        { error: `Not enough stock to invoice this: ${detail}.`, shortages: e.items },
        { status: 409 }
      )
    }
    if (isMissingColumn(e)) return NextResponse.json({ error: MIGRATION_HINT }, { status: 503 })
    console.error("Invoice stock deduction failed:", e)
    return NextResponse.json({ error: "Could not reserve stock for this invoice. Please try again." }, { status: 500 })
  }

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

  return NextResponse.json({ ...invoice, stockDeducted: true, emailed }, { status: 201 })
}
