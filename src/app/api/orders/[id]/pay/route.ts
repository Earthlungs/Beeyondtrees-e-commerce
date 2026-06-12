import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Start a Paystack payment server-side (Standard/redirect flow). We initialize
// the transaction with the SECRET key and hand back the hosted checkout URL,
// no public key is involved, so this is immune to public-key mismatches. A
// fresh reference is generated per attempt so retries never collide with a
// previously-used Paystack reference.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) {
    return NextResponse.json({ error: "Payment not configured" }, { status: 500 })
  }

  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }
  if (order.paymentStatus === "paid") {
    return NextResponse.json({ error: "Order already paid" }, { status: 400 })
  }

  const reference = `BT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  await prisma.order.update({ where: { id }, data: { paymentRef: reference } })

  // Build the return URL from the public host the shopper is actually on
  // (forwarded headers on Vercel), so we don't depend on NEXTAUTH_URL, which
  // may be set to localhost. Falls back to NEXTAUTH_URL, then request origin.
  const fwdHost = request.headers.get("x-forwarded-host") || request.headers.get("host")
  const fwdProto = request.headers.get("x-forwarded-proto") || "https"
  const base = fwdHost ? `${fwdProto}://${fwdHost}` : (process.env.NEXTAUTH_URL || new URL(request.url).origin)
  const email = order.customerEmail || "customer@beeyondtrees.com"

  let data: { status?: boolean; message?: string; data?: { authorization_url?: string } }
  try {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        amount: Math.round(order.total * 100), // Paystack expects the minor unit (KES * 100)
        currency: "KES",
        reference,
        callback_url: `${base}/checkout/verify?orderId=${order.id}`,
        metadata: {
          order_id: order.id,
          customer_name: order.customerName,
          phone: order.customerPhone,
          location: `${order.town}, ${order.county}`,
        },
      }),
      cache: "no-store",
    })
    data = await res.json()
  } catch (err) {
    console.error("Paystack initialize failed", err)
    return NextResponse.json({ error: "Could not reach the payment provider" }, { status: 502 })
  }

  if (!data?.status || !data?.data?.authorization_url) {
    return NextResponse.json({ error: data?.message || "Could not start payment" }, { status: 502 })
  }

  return NextResponse.json({ authorization_url: data.data.authorization_url })
}
