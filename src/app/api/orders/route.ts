import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Admin order list — newest first, with line items and any dispatch record.
export async function GET() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true, dispatch: true },
  })
  return NextResponse.json(orders, { headers: { "Cache-Control": "no-store" } })
}

// Create a pending order at checkout, before the customer pays. The payment
// status is flipped to paid/cancelled via PATCH /api/orders/[id] from the
// Paystack callback/onClose handlers.
export async function POST(request: NextRequest) {
  const body = await request.json()
  const {
    customerName, customerPhone, customerEmail,
    county, town, landmark, deliveryInstructions,
    total, paymentRef, items,
  } = body

  if (!customerName || !customerPhone || !county || !town ||
      !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Missing required order fields" }, { status: 400 })
  }

  const order = await prisma.order.create({
    data: {
      customerName,
      customerPhone,
      customerEmail: customerEmail || null,
      county,
      town,
      landmark: landmark || null,
      deliveryInstructions: deliveryInstructions || null,
      total,
      status: "pending",
      paymentRef: paymentRef || null,
      paymentStatus: "pending",
      items: {
        create: items.map((i: {
          productId: string; productName: string; price: number;
          quantity: number; pricingTier: string; subtotal: number;
        }) => ({
          productId: i.productId,
          productName: i.productName,
          price: i.price,
          quantity: i.quantity,
          pricingTier: i.pricingTier,
          subtotal: i.subtotal,
        })),
      },
    },
    include: { items: true },
  })

  return NextResponse.json(order, { status: 201 })
}
