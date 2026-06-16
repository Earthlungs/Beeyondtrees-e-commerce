import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireDocRole, normalizeLines, parseDate } from "@/lib/docs"
import { requireRole } from "@/lib/authz"

async function fetchExtras(id: string) {
  try {
    const rows = await prisma.$queryRaw<{ status: string; approvedBy: string | null; approvedAt: Date | null; rejectionReason: string | null; destinationOfGoods: string | null; amended: boolean }[]>`
      SELECT status, "approvedBy", "approvedAt", "rejectionReason", "destinationOfGoods", "amended"
      FROM "Lpo" WHERE id = ${id}
    `
    return rows[0] ?? null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDocRole(request)
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const lpo = await prisma.lpo.findUnique({ where: { id } })
  if (!lpo) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const extras = await fetchExtras(id)
  return NextResponse.json({ ...lpo, ...(extras ?? {}) }, { headers: { "Cache-Control": "no-store" } })
}

// Approve / reject / amend an LPO — admin or IT Specialist only.
// action="amend" also accepts updated content fields to save changes.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, ["admin", "it_specialist"])
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const lpo = await prisma.lpo.findUnique({ where: { id } })
  if (!lpo) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json().catch(() => null)
  const action = body?.action
  if (action !== "approve" && action !== "reject" && action !== "amend") {
    return NextResponse.json({ error: "Action must be 'approve', 'reject', or 'amend'." }, { status: 400 })
  }
  const reason = typeof body?.reason === "string" ? body.reason.trim() : ""
  if (action === "reject" && !reason) {
    return NextResponse.json({ error: "A reason is required to reject." }, { status: 400 })
  }

  const approver = (auth.token as { name?: string }).name || "Admin"
  const status = action === "reject" ? "rejected" : "approved"
  const amended = action === "amend"
  const destinationOfGoods = typeof body?.destinationOfGoods === "string" ? body.destinationOfGoods.trim() || null : null

  // For amend: update all editable content fields before setting approval status.
  if (action === "amend" && body?.items) {
    const { items, subtotal, vat, total } = normalizeLines(body.items)
    if (items.length === 0) {
      return NextResponse.json({ error: "Add at least one line item." }, { status: 400 })
    }
    try {
      await prisma.lpo.update({
        where: { id },
        data: {
          ...(body.supplierName?.trim() && { supplierName: body.supplierName.trim() }),
          ...(body.shippingAddress !== undefined && { shippingAddress: body.shippingAddress?.trim() || null }),
          ...(body.purchaseRep !== undefined && { purchaseRep: body.purchaseRep?.trim() || null }),
          ...(body.orderDate !== undefined && { orderDate: parseDate(body.orderDate) ?? lpo.orderDate }),
          ...(body.expectedArrival !== undefined && { expectedArrival: parseDate(body.expectedArrival) }),
          ...(body.notes !== undefined && { notes: body.notes?.trim() || null }),
          items: items as unknown as Prisma.InputJsonValue,
          subtotal,
          vat,
          total,
        },
      })
    } catch (e) {
      console.error("LPO amend content update failed:", e)
      return NextResponse.json({ error: "Could not save the amended content." }, { status: 500 })
    }
  }

  // Set approval status + destination via raw SQL.
  try {
    await prisma.$executeRaw`
      UPDATE "Lpo"
      SET status = ${status},
          "approvedBy" = ${approver}::text,
          "approvedAt" = ${new Date()}::timestamp,
          "rejectionReason" = ${action === "reject" ? reason : null}::text,
          "amended" = ${amended},
          "destinationOfGoods" = COALESCE(${destinationOfGoods}::text, "destinationOfGoods")
      WHERE id = ${id}
    `
  } catch {
    return NextResponse.json({ error: "Could not update the LPO — migration may not have run yet." }, { status: 500 })
  }

  // Return the updated LPO for the frontend to refresh state.
  const updated = await prisma.lpo.findUnique({ where: { id } })
  return NextResponse.json({ ...updated, status, approvedBy: approver, approvedAt: new Date(), rejectionReason: action === "reject" ? reason : null, amended, destinationOfGoods })
}
