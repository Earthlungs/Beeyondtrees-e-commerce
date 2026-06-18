import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/db"
import { sendMail } from "@/lib/mailer"
import { newOrderEmail } from "@/lib/email-templates"

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000"

// Admin order list, newest first, with line items and any dispatch record.
// Orders contain customer PII (name, phone, address) so this is admin-only.
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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

  // Validate product references up front. A stale cart (e.g. an old persisted
  // product cache pointing at deleted/re-seeded ids) would otherwise fail the
  // OrderItem foreign key and 500 the whole checkout. Return a clear 400 so the
  // shopper knows to refresh rather than seeing a generic failure.
  const productIds: string[] = [...new Set(items.map((i: { productId: string }) => i.productId))]
  const existing = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true },
  })
  const existingIds = new Set(existing.map((p) => p.id))
  const missing = productIds.filter((id) => !existingIds.has(id))
  if (missing.length > 0) {
    return NextResponse.json(
      { error: "Some items in your cart are no longer available. Please refresh and try again.", missing },
      { status: 400 }
    )
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

  // Notify admins of the new order (fire-and-forget)
  prisma.user.findMany({ where: { role: "admin" }, select: { email: true } }).then((admins) => {
    const to = admins.flatMap((u) => u.email ? [u.email] : [])
    if (to.length === 0) return
    sendMail({
      to,
      subject: `[Beeyond Trees] New order from ${customerName}`,
      html: newOrderEmail({
        orderRef: order.id,
        customerName,
        customerPhone,
        town,
        county,
        total,
        ordersUrl: `${BASE_URL}/admin`,
      }),
    }).catch((e) => console.error("[mailer] new order:", e))
  }).catch(() => {})

  return NextResponse.json(order, { status: 201 })
}
