import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/db"
import { markOrderPaid } from "@/lib/orders"

// Paystack webhook — the resilient, server-to-server source of truth for
// payment status (independent of whether the customer's browser stayed open
// long enough to fire the inline callback).
//
// Paystack signs the raw request body with HMAC-SHA512 using the secret key and
// sends it as `x-paystack-signature`. We recompute and compare before trusting
// anything in the payload.
export async function POST(request: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) {
    return NextResponse.json({ error: "Payment not configured" }, { status: 500 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get("x-paystack-signature") ?? ""
  const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex")

  const sigBuf = Buffer.from(signature, "utf8")
  const expBuf = Buffer.from(expected, "utf8")
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let event: { event?: string; data?: { reference?: string; amount?: number; currency?: string; status?: string } }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  if (event.event === "charge.success") {
    const data = event.data ?? {}
    const reference = data.reference

    if (reference) {
      // paymentRef isn't unique in the schema, so use findFirst.
      const order = await prisma.order.findFirst({ where: { paymentRef: reference } })

      if (order && order.paymentStatus !== "paid") {
        const amountOk = data.amount === Math.round(order.total * 100)
        const currencyOk = data.currency === "KES"

        if (data.status === "success" && amountOk && currencyOk) {
          // Mark paid + decrement stock exactly once (shared with verify).
          await markOrderPaid(order.id, String(reference))
        }
      }
    }
  }

  // Always 200 for a valid signature so Paystack doesn't retry events we
  // intentionally ignore.
  return NextResponse.json({ received: true })
}
