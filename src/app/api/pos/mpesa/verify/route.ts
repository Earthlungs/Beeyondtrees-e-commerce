import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

// Poll a Paystack M-Pesa charge by reference. The till calls this every few
// seconds after starting the charge until status is "success" (then the M-Pesa
// confirmation code is returned and the sale is recorded) or "failed".
type Tx = {
  status?: string
  amount?: number
  reference?: string
  gateway_response?: string
  metadata?: Record<string, unknown> | string
  log?: { history?: { type?: string; message?: string }[] }
}

// Best-effort extraction of the actual M-Pesa receipt (e.g. "QGR1AB2CD3") from
// the verified transaction; falls back to the Paystack reference.
function extractMpesaCode(tx: Tx | null, reference: string): string {
  if (!tx) return reference
  const re = /\b[A-Z0-9]{10}\b/ // M-Pesa receipts are 10-char alphanumerics
  const candidates: string[] = []
  if (tx.gateway_response) candidates.push(tx.gateway_response)
  if (typeof tx.metadata === "string") candidates.push(tx.metadata)
  else if (tx.metadata) candidates.push(JSON.stringify(tx.metadata))
  for (const h of tx.log?.history ?? []) if (h.message) candidates.push(h.message)
  for (const c of candidates) {
    const m = c.match(re)
    if (m && !/^[0-9]+$/.test(m[0])) return m[0]
  }
  return reference
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) return NextResponse.json({ error: "Payment not configured" }, { status: 500 })

  const { reference } = await request.json().catch(() => ({ reference: undefined }))
  if (!reference || typeof reference !== "string") {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 })
  }

  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    })
    const data = await res.json()
    const tx: Tx | null = data?.status === true ? data.data : null
    const status = (tx?.status ?? "pending") as string // success | failed | abandoned | ongoing | pending
    return NextResponse.json({
      status,
      code: status === "success" ? extractMpesaCode(tx, reference) : null,
      amount: tx?.amount ?? null,
    })
  } catch (err) {
    console.error("[pos/mpesa] verify failed:", err)
    return NextResponse.json({ error: "Verification unavailable" }, { status: 502 })
  }
}
