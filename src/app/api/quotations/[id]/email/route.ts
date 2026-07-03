import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireDocRole } from "@/lib/docs"
import { sendQuotationEmail, isValidEmail } from "@/lib/doc-email"

// Manually (re)send a branded quotation copy. Only fully-approved quotations
// may be emailed out.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDocRole(request)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === "string" ? body.email.trim() : ""
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
  }

  const quotation = await prisma.quotation.findUnique({ where: { id } })
  if (!quotation) return NextResponse.json({ error: "Quotation not found." }, { status: 404 })
  if (quotation.status !== "approved") {
    return NextResponse.json({ error: "This quotation isn't approved yet, so it can't be emailed." }, { status: 400 })
  }

  try {
    await sendQuotationEmail(quotation, email)
    return NextResponse.json({ ok: true, email })
  } catch (e) {
    console.error("[mailer] Quotation resend:", e)
    return NextResponse.json({ error: "Could not send the email. Check the mail settings and try again." }, { status: 500 })
  }
}
