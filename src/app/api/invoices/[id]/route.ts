import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireDocRole, isMissingColumn } from "@/lib/docs"
import { requireRole, isAdminish, ADMINISH_ROLES } from "@/lib/authz"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDocRole(request)
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const invoice = await prisma.invoice.findUnique({ where: { id } })
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(invoice, { headers: { "Cache-Control": "no-store" } })
}

// Everyone who can raise an invoice, plus finance (who see the money arrive).
const PAY_ROLES = [
  "procurement_officer", "external_procurement", "executive", "chief", "finance",
  ...ADMINISH_ROLES,
]

const METHODS = new Set(["cash", "mpesa", "bank", "cheque", "card", "other"])

// Mark an invoice paid once the customer's money has landed. The person who
// RAISED the invoice may mark their own; finance and the CEO tier may mark any
// (they're the ones reconciling the bank). Reversing a payment — for a mistake
// — is deliberately CEO-tier only, since it rewrites a financial record.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, PAY_ROLES)
  if (auth instanceof NextResponse) return auth
  const { id } = await params

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  const token = auth.token as { sub?: string; name?: string; role?: string }
  const role = token.role ?? ""
  const actor = token.name || "Staff"
  const isOverseer = isAdminish(role) || role === "finance"

  let invoice
  try {
    invoice = await prisma.invoice.findUnique({ where: { id } })
  } catch (e) {
    if (isMissingColumn(e)) {
      return NextResponse.json(
        { error: "Invoice payment tracking isn't set up on the database yet — run prisma/migrate-ops-2026-08.sql." },
        { status: 503 }
      )
    }
    throw e
  }
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const raisedByMe =
    (!!token.sub && invoice.createdByUserId === token.sub) ||
    (!!token.name && invoice.createdByName === token.name)
  if (!isOverseer && !raisedByMe) {
    return NextResponse.json(
      { error: "Only the person who raised this invoice (or finance) can mark it paid." },
      { status: 403 }
    )
  }

  // Un-marking: CEO tier only.
  if (body.paid === false) {
    if (!isAdminish(role)) {
      return NextResponse.json({ error: "Only the CEO tier can reverse a recorded payment." }, { status: 403 })
    }
    const updated = await prisma.invoice.update({
      where: { id },
      data: { paid: false, paidAt: null, paidBy: null, paymentMethod: null, paymentRef: null },
    })
    return NextResponse.json(updated)
  }

  if (invoice.paid) {
    return NextResponse.json({ error: "This invoice is already marked as paid." }, { status: 400 })
  }

  const method = typeof body.paymentMethod === "string" ? body.paymentMethod.trim().toLowerCase() : ""
  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      paid: true,
      paidAt: new Date(),
      paidBy: actor,
      paymentMethod: METHODS.has(method) ? method : "other",
      paymentRef: typeof body.paymentRef === "string" ? body.paymentRef.trim() || null : null,
    },
  })
  return NextResponse.json(updated)
}
