import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireDocRole } from "@/lib/docs"
import { sendInvoiceEmail, isValidEmail } from "@/lib/doc-email"

// Manually (re)send a branded invoice copy to an address typed on the doc page.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDocRole(request)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === "string" ? body.email.trim() : ""
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
  }

  const invoice = await prisma.invoice.findUnique({ where: { id } })
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 })

  try {
    await sendInvoiceEmail(invoice, email)
    return NextResponse.json({ ok: true, email })
  } catch (e) {
    console.error("[mailer] invoice resend:", e)
    return NextResponse.json({ error: "Could not send the email. Check the mail settings and try again." }, { status: 500 })
  }
}
