import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireDocRole } from "@/lib/docs"
import { requireRole } from "@/lib/authz"

async function fetchExtras(id: string) {
  try {
    const rows = await prisma.$queryRaw<{ status: string; approvedBy: string | null; approvedAt: Date | null; rejectionReason: string | null; destinationOfGoods: string | null }[]>`
      SELECT status, "approvedBy", "approvedAt", "rejectionReason", "destinationOfGoods"
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

// Approve / reject an LPO — admin or IT Specialist only.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, ["admin", "it_specialist"])
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const lpo = await prisma.lpo.findUnique({ where: { id } })
  if (!lpo) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json().catch(() => null)
  const action = body?.action
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Action must be 'approve' or 'reject'." }, { status: 400 })
  }
  const reason = typeof body?.reason === "string" ? body.reason.trim() : ""
  if (action === "reject" && !reason) {
    return NextResponse.json({ error: "A reason is required to reject." }, { status: 400 })
  }

  const approver = (auth.token as { name?: string }).name || "Admin"
  const status = action === "approve" ? "approved" : "rejected"

  try {
    await prisma.$executeRaw`
      UPDATE "Lpo"
      SET status = ${status},
          "approvedBy" = ${approver}::text,
          "approvedAt" = ${new Date()}::timestamp,
          "rejectionReason" = ${action === "reject" ? reason : null}::text
      WHERE id = ${id}
    `
  } catch {
    return NextResponse.json({ error: "Could not update the LPO — migration may not have run yet." }, { status: 500 })
  }

  return NextResponse.json({ ...lpo, status, approvedBy: approver, approvedAt: new Date(), rejectionReason: action === "reject" ? reason : null })
}
