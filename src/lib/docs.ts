import { NextRequest, NextResponse } from "next/server"
import { getToken, type JWT } from "next-auth/jwt"

// LPO and invoicing are business documents — merchants/admins only, never the
// sell-only cashier role. proxy.ts lets /api/* through, so each handler calls
// this guard itself. Returns a NextResponse to return early (401/403), or the
// token wrapped in an object on success. Callers: `if (a instanceof NextResponse) return a`.
const DOC_ROLES = new Set(["merchant", "admin"])

export async function requireDocRole(request: NextRequest): Promise<NextResponse | { token: JWT }> {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = (token as { role?: string }).role ?? "merchant"
  if (!DOC_ROLES.has(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  return { token }
}

export interface DocLine {
  description: string
  qty: number
  unitPrice: number
  taxRate: number // percent, e.g. 16
  amount: number
}

// Recompute line amounts + document totals server-side so the client can't
// dictate figures. amount = qty × unitPrice; VAT = Σ(amount × taxRate%).
export function normalizeLines(raw: unknown): { items: DocLine[]; subtotal: number; vat: number; total: number } {
  const arr = Array.isArray(raw) ? raw : []
  const items: DocLine[] = arr
    .map((l) => {
      const r = l as Partial<DocLine>
      const qty = Number(r.qty) || 0
      const unitPrice = Number(r.unitPrice) || 0
      const taxRate = Number(r.taxRate) || 0
      return {
        description: String(r.description ?? "").trim(),
        qty,
        unitPrice,
        taxRate,
        amount: +(qty * unitPrice).toFixed(2),
      }
    })
    .filter((l) => l.description || l.amount)
  const subtotal = +items.reduce((s, l) => s + l.amount, 0).toFixed(2)
  const vat = +items.reduce((s, l) => s + (l.amount * l.taxRate) / 100, 0).toFixed(2)
  const total = +(subtotal + vat).toFixed(2)
  return { items, subtotal, vat, total }
}

// Next sequential document number like INV-0001 / LPO-0007, derived from the
// current row count inside the caller's transaction.
export function nextDocNumber(prefix: string, count: number): string {
  return `${prefix}-${String(count + 1).padStart(4, "0")}`
}
