import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"

const VIEW_ROLES = ["fungiculturist", "admin", "it_specialist", "assistant_ceo"]
const COUNTRIES = new Set(["Kenya", "Tanzania"])
const STATUSES = new Set(["active", "inactive"])

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const house = await prisma.growingHouse.findUnique({ where: { id } })
  if (!house) return NextResponse.json({ error: "Growing house not found." }, { status: 404 })
  return NextResponse.json(house)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 })

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = String(body.name).trim()
  if (body.country !== undefined && COUNTRIES.has(body.country)) data.country = body.country
  if (body.region !== undefined) data.region = body.region?.trim() || null
  if (body.location !== undefined) data.location = body.location?.trim() || null
  if (body.lengthM !== undefined) data.lengthM = body.lengthM === "" ? null : Number(body.lengthM) || null
  if (body.widthM !== undefined) data.widthM = body.widthM === "" ? null : Number(body.widthM) || null
  if (body.maxBagCapacity !== undefined) data.maxBagCapacity = Math.trunc(Number(body.maxBagCapacity)) || 0
  if (body.status !== undefined && STATUSES.has(body.status)) data.status = body.status
  if (body.notes !== undefined) data.notes = body.notes?.trim() || null

  try {
    const house = await prisma.growingHouse.update({ where: { id }, data })
    return NextResponse.json(house)
  } catch (e) {
    console.error("Growing house update failed:", e)
    return NextResponse.json({ error: "Could not update the growing house." }, { status: 500 })
  }
}
