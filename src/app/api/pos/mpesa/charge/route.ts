import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

// Start an M-Pesa (mobile money) charge via Paystack from the POS till. The
// cashier enters the customer's phone; Paystack sends an STK push to that number.
// We hand back the reference so the till can poll /api/pos/mpesa/verify until the
// customer authorises and the M-Pesa code comes back. SECRET key only.
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) return NextResponse.json({ error: "Payment not configured" }, { status: 500 })

  const body = await request.json().catch(() => null)
  const amount = Math.round(Number(body?.amount) * 100) // Paystack minor unit (KES * 100)
  const phone = String(body?.phone ?? "").trim()
  if (!amount || amount <= 0) return NextResponse.json({ error: "Invalid amount." }, { status: 400 })
  if (!/^(?:\+?254|0)?7\d{8}$/.test(phone.replace(/\s/g, ""))) {
    return NextResponse.json({ error: "Enter a valid Safaricom number (e.g. 0712345678)." }, { status: 400 })
  }
  const email = typeof body?.email === "string" && body.email.trim() ? body.email.trim() : "pos@beeyondtrees.com"
  const reference = `POS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

  try {
    const res = await fetch("https://api.paystack.co/charge", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        amount,
        currency: "KES",
        reference,
        mobile_money: { phone, provider: "mpesa" },
      }),
      cache: "no-store",
    })
    const data = await res.json()
    if (!data?.status) {
      return NextResponse.json({ error: data?.message || "Could not start the M-Pesa charge." }, { status: 502 })
    }
    return NextResponse.json({
      reference: data?.data?.reference || reference,
      status: data?.data?.status || "pending",
      display_text: data?.data?.display_text || "STK push sent — ask the customer to enter their M-Pesa PIN.",
    })
  } catch (err) {
    console.error("[pos/mpesa] charge failed:", err)
    return NextResponse.json({ error: "Could not reach the payment provider." }, { status: 502 })
  }
}
