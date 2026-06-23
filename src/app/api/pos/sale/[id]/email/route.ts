import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/db"
import { sendReceiptEmail, isValidEmail } from "@/lib/doc-email"

const ROLES_ALLOWED = new Set(["cashier", "merchant", "admin"])

// Manually (re)send a branded receipt to an address typed on the receipt page.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = (token as { role?: string }).role ?? "merchant"
  if (!ROLES_ALLOWED.has(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === "string" ? body.email.trim() : ""
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
  }

  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } })
  if (!order) return NextResponse.json({ error: "Receipt not found." }, { status: 404 })

  try {
    await sendReceiptEmail(order, email)
    return NextResponse.json({ ok: true, email })
  } catch (e) {
    console.error("[mailer] receipt resend:", e)
    return NextResponse.json({ error: "Could not send the email. Check the mail settings and try again." }, { status: 500 })
  }
}
