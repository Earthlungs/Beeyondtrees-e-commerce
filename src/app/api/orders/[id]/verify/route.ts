import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { markOrderPaid } from "@/lib/orders"

// Server-side Paystack verification. The browser cannot be trusted to assert a
// payment succeeded, so we independently ask Paystack about the transaction
// using the secret key and only mark the order paid if:
//   - Paystack reports the transaction status as "success"
//   - the reference matches the one we stored on this order (paymentRef)
//   - the amount and currency match the order total (in kobo: KES * 100)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { reference } = await request.json().catch(() => ({ reference: undefined }))

  if (!reference || typeof reference !== "string") {
    return NextResponse.json({ verified: false, error: "Missing reference" }, { status: 400 })
  }

  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) {
    return NextResponse.json({ verified: false, error: "Payment not configured" }, { status: 500 })
  }

  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) {
    return NextResponse.json({ verified: false, error: "Order not found" }, { status: 404 })
  }

  // The reference must belong to this order.
  if (order.paymentRef && order.paymentRef !== reference) {
    return NextResponse.json({ verified: false, error: "Reference mismatch" }, { status: 400 })
  }

  // Already verified — idempotent success.
  if (order.paymentStatus === "paid") {
    return NextResponse.json({ verified: true, order })
  }

  let tx: { status?: string; amount?: number; currency?: string; reference?: string } | undefined
  try {
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" }
    )
    const data = await res.json()
    if (data?.status === true) tx = data.data
  } catch (err) {
    console.error("Paystack verify request failed", err)
    return NextResponse.json({ verified: false, error: "Verification unavailable" }, { status: 502 })
  }

  const amountOk = tx?.amount === Math.round(order.total * 100)
  const currencyOk = tx?.currency === "KES"
  const success = tx?.status === "success" && amountOk && currencyOk

  if (!success) {
    await prisma.order.update({
      where: { id },
      data: { paymentStatus: "failed" },
    })
    return NextResponse.json({ verified: false, error: "Payment not confirmed" }, { status: 402 })
  }

  // Mark paid + decrement stock exactly once (shared with the webhook).
  await markOrderPaid(id, String(tx?.reference ?? reference))
  const updated = await prisma.order.findUnique({ where: { id } })

  return NextResponse.json({ verified: true, order: updated })
}
