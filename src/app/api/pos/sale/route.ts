import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import {
  recordPosSale,
  InsufficientStockError,
  type PaymentMethod,
  type PosSaleLine,
} from "@/lib/orders"

const ROLES_ALLOWED = new Set(["cashier", "merchant", "admin"])
const METHODS = new Set<PaymentMethod>(["cash", "mpesa", "card"])

// Ring up a sale at the physical-shop till. proxy.ts lets /api/* through without
// auth, so this handler verifies the NextAuth token itself and restricts the
// channel to till-capable roles.
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = (token as { role?: string }).role ?? "merchant"
  if (!ROLES_ALLOWED.has(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 })

  const { lines, paymentMethod, customerName, customerPhone, cashReceived, mpesaCode, cardRef } = body

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
  }))

  try {
    const order = await recordPosSale({
      lines: cleanLines,
      paymentMethod,
      customerName: customerName ?? null,
      customerPhone: customerPhone ?? null,
      cashReceived: cashReceived != null ? Number(cashReceived) : null,
      mpesaCode: mpesaCode ?? null,
      cardRef: cardRef ?? null,
      // Stamp the sale with whoever is logged in at the till.
      soldBy: (token.name as string) ?? null,
    })
    return NextResponse.json(order, { status: 201 })
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
