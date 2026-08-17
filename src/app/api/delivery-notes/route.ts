import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireDocRole, normalizeDeliveryLines, createNumbered, parseDate } from "@/lib/docs"
import { requireRole } from "@/lib/authz"
import { sendDeliveryNoteEmail, isValidEmail } from "@/lib/doc-email"

// Delivery notes carry no money and no approval chain — see the DeliveryNote
// model in schema.prisma. They are raised against an already-approved LPO by
// whoever dispatches the goods, and are printable the moment they are saved.
// Viewers: the LPO roles plus factory_manager (receives the consignment) and
// finance (reconciles deliveries against payments).
const DN_VIEW_ROLES = [
  "procurement_officer", "external_procurement", "executive", "chief", "finance",
  "admin", "assistant_ceo", "it_specialist", "factory_manager",
]

// "DeliveryNote" is created by prisma/migrate-delivery-note.sql, and deploying
// does not run migrations here — so until that script is applied the table is
// simply absent (P2021). Degrade to an empty list rather than a 500, the same
// tolerance the LPO routes show for their pre-migration columns.
function isMissingTable(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021"
}

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, DN_VIEW_ROLES)
  if (auth instanceof NextResponse) return auth
  try {
    const notes = await prisma.deliveryNote.findMany({ orderBy: { createdAt: "desc" } })
    return NextResponse.json(notes, { headers: { "Cache-Control": "no-store" } })
  } catch (e) {
    if (isMissingTable(e)) return NextResponse.json([], { headers: { "Cache-Control": "no-store" } })
    throw e
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireDocRole(request)
  if (auth instanceof NextResponse) return auth
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  const items = normalizeDeliveryLines(body.items)
  if (items.length === 0) {
    return NextResponse.json({ error: "Add at least one line item." }, { status: 400 })
  }

  // A delivery note always delivers against an approved LPO. Re-read that LPO
  // server-side rather than trusting the posted supplier/destination, and refuse
  // anything not fully approved — goods should never move on an unapproved order.
  const lpoId = typeof body.lpoId === "string" && body.lpoId.trim() ? body.lpoId.trim() : null
  if (!lpoId) return NextResponse.json({ error: "Choose the approved LPO this delivery is against." }, { status: 400 })

  const lpo = await prisma.lpo.findUnique({ where: { id: lpoId } })
  if (!lpo) return NextResponse.json({ error: "That LPO could not be found." }, { status: 404 })

  // status/destinationOfGoods are raw Lpo columns, not Prisma fields (see
  // /api/lpos). Pre-migration the columns are absent — treat as approved.
  let lpoStatus: string | null = "approved"
  let lpoDestination: string | null = null
  try {
    const rows = await prisma.$queryRaw<{ status: string; destinationOfGoods: string | null }[]>`
      SELECT status, "destinationOfGoods" FROM "Lpo" WHERE id = ${lpoId}
    `
    if (rows[0]) { lpoStatus = rows[0].status; lpoDestination = rows[0].destinationOfGoods }
  } catch { /* pre-migration — treat as approved */ }

  if (lpoStatus && lpoStatus !== "approved") {
    return NextResponse.json({ error: `${lpo.number} is not approved yet, so goods can't be delivered against it.` }, { status: 400 })
  }

  const creatorId = (auth.token as { sub?: string }).sub || null
  const creatorName = (auth.token as { name?: string }).name || null
  const recipientEmail = typeof body.email === "string" && isValidEmail(body.email.trim()) ? body.email.trim() : null
  const attachmentUrl = typeof body.attachmentUrl === "string" && /^https?:\/\//.test(body.attachmentUrl.trim())
    ? body.attachmentUrl.trim() : null
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null)

  try {
    const note = await createNumbered(
      "DN",
      () => prisma.deliveryNote.count(),
      (number) =>
        prisma.deliveryNote.create({
          data: {
            number,
            lpoId: lpo.id,
            lpoNumber: lpo.number,
            supplierName: lpo.supplierName,
            deliveredTo: str(body.deliveredTo) ?? lpoDestination,
            deliveryDate: parseDate(body.deliveryDate) ?? new Date(),
            vehicleReg: str(body.vehicleReg),
            driverName: str(body.driverName),
            driverPhone: str(body.driverPhone),
            receivedBy: str(body.receivedBy),
            items: items as unknown as Prisma.InputJsonValue,
            notes: str(body.notes),
            recipientEmail,
            attachmentUrl,
            createdByUserId: creatorId,
            createdByName: creatorName,
          },
        })
    )

    // No approval gate, so if an address was given the note goes out now.
    let emailed = false
    if (recipientEmail) {
      try {
        await sendDeliveryNoteEmail(note, recipientEmail)
        emailed = true
      } catch (e) { console.error("[mailer] Delivery note copy:", e) }
    }

    return NextResponse.json({ ...note, emailed }, { status: 201 })
  } catch (e) {
    console.error("Delivery note create failed:", e)
    if (isMissingTable(e)) {
      return NextResponse.json({ error: "Delivery notes aren't set up on the database yet — run prisma/migrate-delivery-note.sql." }, { status: 503 })
    }
    return NextResponse.json({ error: "Could not save the delivery note. Please try again." }, { status: 500 })
  }
}
