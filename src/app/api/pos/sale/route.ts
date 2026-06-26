import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import {
  recordPosSale,
  InsufficientStockError,
  type PaymentMethod,
  type PosSaleLine,
} from "@/lib/orders"
import { sendReceiptEmail, isValidEmail } from "@/lib/doc-email"
import { prisma } from "@/lib/db"

const METHODS = new Set<PaymentMethod>(["cash", "mpesa", "card"])

// Ring up a sale at the physical-shop till. proxy.ts lets /api/* through without
// auth, so this handler verifies the NextAuth token itself. Point-of-sale is now
// available to EVERY logged-in staff member (any role), and each sale records the
// seller's role/department so admin can attribute sales and award year-end bonuses.
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = (token as { role?: string }).role ?? "merchant"

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 })

  const { lines, paymentMethod, customerName, customerPhone, customerEmail, cashReceived, mpesaCode, cardRef } = body

  if (!Array.isArray(lines) || lines.length === 0) {
    return NextResponse.json({ error: "Add at least one item to the sale." }, { status: 400 })
  }
  if (!METHODS.has(paymentMethod)) {
    return NextResponse.json({ error: "Choose a payment method." }, { status: 400 })
  }

  const cleanLines: PosSaleLine[] = lines.map((l: PosSaleLine) => ({
    productId: String(l.productId),
    quantity: Number(l.quantity),
    pricingTier: l.pricingTier,
    discount: l.discount != null ? Number(l.discount) : 0,
  }))

  try {
    const order = await recordPosSale({
      lines: cleanLines,
      paymentMethod,
      customerName: customerName ?? null,
      customerPhone: customerPhone ?? null,
      customerEmail: customerEmail ?? null,
      cashReceived: cashReceived != null ? Number(cashReceived) : null,
      mpesaCode: mpesaCode ?? null,
      cardRef: cardRef ?? null,
      // Stamp the sale with whoever is logged in at the till.
      soldBy: (token.name as string) ?? null,
    })

    // Record the seller's role/department (raw column, not in the Prisma schema)
    // so admin analytics can attribute sales per department and award bonuses.
    try {
      await prisma.$executeRaw`UPDATE "Order" SET "soldByRole" = ${role}::text WHERE id = ${order.id}`
    } catch (e) { console.error("[pos] soldByRole stamp failed:", e) }

    // Email the branded receipt if the cashier captured a customer email. Never
    // let a mail failure fail a completed sale.
    const emailTo = typeof customerEmail === "string" ? customerEmail.trim() : ""
    let emailed = false
    if (isValidEmail(emailTo)) {
      try {
        await sendReceiptEmail(order, emailTo)
        emailed = true
      } catch (e) { console.error("[mailer] receipt copy:", e) }
    }

    return NextResponse.json({ ...order, emailed }, { status: 201 })
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return NextResponse.json(
        { error: "Not enough stock for some items.", items: err.items },
        { status: 409 }
      )
    }
    const message = err instanceof Error ? err.message : "Could not complete the sale."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
