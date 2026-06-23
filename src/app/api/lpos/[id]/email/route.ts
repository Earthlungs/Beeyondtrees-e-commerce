import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireDocRole } from "@/lib/docs"
import { sendLpoEmail, isValidEmail } from "@/lib/doc-email"

// Manually (re)send a branded LPO copy to an address typed on the doc page. Only
// fully-approved LPOs may be emailed out — an unapproved purchase order is not a
// generated document yet.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDocRole(request)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === "string" ? body.email.trim() : ""
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
  }

  const lpo = await prisma.lpo.findUnique({ where: { id } })
  if (!lpo) return NextResponse.json({ error: "LPO not found." }, { status: 404 })

  // status/destinationOfGoods are raw columns, not Prisma fields. If the columns
  // don't exist yet (pre-migration) treat the LPO as approved.
  let status: string | null = "approved"
  let destinationOfGoods: string | null = null
  try {
    const rows = await prisma.$queryRaw<{ status: string; destinationOfGoods: string | null }[]>`
      SELECT status, "destinationOfGoods" FROM "Lpo" WHERE id = ${id}
    `
    if (rows[0]) { status = rows[0].status; destinationOfGoods = rows[0].destinationOfGoods }
  } catch { /* pre-migration — treat as approved */ }

  if (status && status !== "approved") {
    return NextResponse.json({ error: "This LPO isn't approved yet, so it can't be emailed." }, { status: 400 })
  }

  try {
    await sendLpoEmail({ ...lpo, destinationOfGoods }, email)
    return NextResponse.json({ ok: true, email })
  } catch (e) {
    console.error("[mailer] LPO resend:", e)
    return NextResponse.json({ error: "Could not send the email. Check the mail settings and try again." }, { status: 500 })
  }
}
