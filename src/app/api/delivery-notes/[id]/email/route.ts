import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireDocRole } from "@/lib/docs"
import { sendDeliveryNoteEmail, isValidEmail } from "@/lib/doc-email"

// (Re)send a branded delivery note to an address typed on the doc page. Unlike
// the LPO there is no approval gate to check — a saved delivery note is a
// finished document.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDocRole(request)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === "string" ? body.email.trim() : ""
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
  }

  const note = await prisma.deliveryNote.findUnique({ where: { id } })
  if (!note) return NextResponse.json({ error: "Delivery note not found." }, { status: 404 })

  try {
    await sendDeliveryNoteEmail(note, email)
    return NextResponse.json({ ok: true, email })
  } catch (e) {
    console.error("[mailer] Delivery note resend:", e)
    return NextResponse.json({ error: "Could not send the email. Check the mail settings and try again." }, { status: 500 })
  }
}
