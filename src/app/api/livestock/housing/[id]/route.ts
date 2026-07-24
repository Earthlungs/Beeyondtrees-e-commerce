import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"

const VIEW_ROLES = ["livestock_manager", "admin", "it_specialist", "assistant_ceo"]
const COUNTRIES = new Set(["Kenya", "Tanzania"])
const STATUSES = new Set(["active", "inactive"])

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const housing = await prisma.livestockHousing.findUnique({ where: { id } })
  if (!housing) return NextResponse.json({ error: "Housing unit not found." }, { status: 404 })
  return NextResponse.json(housing)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 })

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = String(body.name).trim()
  if (body.type !== undefined) data.type = body.type?.trim() || "pen"
  if (body.country !== undefined && COUNTRIES.has(body.country)) data.country = body.country
  if (body.region !== undefined) data.region = body.region?.trim() || null
  if (body.location !== undefined) data.location = body.location?.trim() || null
  if (body.capacity !== undefined) data.capacity = Math.trunc(Number(body.capacity)) || 0
  if (body.status !== undefined && STATUSES.has(body.status)) data.status = body.status
  if (body.notes !== undefined) data.notes = body.notes?.trim() || null

  try {
    const housing = await prisma.livestockHousing.update({ where: { id }, data })
    return NextResponse.json(housing)
  } catch (e) {
    console.error("Livestock housing update failed:", e)
    return NextResponse.json({ error: "Could not update the housing unit." }, { status: 500 })
  }
}
