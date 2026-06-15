import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
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

// Parse a date input safely. Browsers without a native date picker render
// `<input type="date">` as a plain text field, so users can type unparseable
// values (e.g. "13/06/2026") — `new Date()` then yields an Invalid Date that
// Prisma rejects with a 500. Anything unparseable/empty becomes null here.
export function parseDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === "") return null
  const d = new Date(v as string)
  return Number.isNaN(d.getTime()) ? null : d
}

// Sequential document number like INV-0001 / LPO-0007.
export function nextDocNumber(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(4, "0")}`
}

// Create a document with a unique sequential number, race-safe. A plain
// count()+create() can collide under concurrent/double submits (two rows get
// the same number → P2002 unique violation → 500). Here we seed from the count
// and, on a unique-number collision, retry with the next number a few times.
// `create` receives the number string to put on the row.
export async function createNumbered<T>(
  prefix: string,
  count: () => Promise<number>,
  create: (docNumber: string) => Promise<T>
): Promise<T> {
  const base = await count()
  for (let i = 1; i <= 12; i++) {
    try {
      return await create(nextDocNumber(prefix, base + i))
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue
      throw e
    }
  }
  throw new Error("Could not allocate a unique document number")
}
