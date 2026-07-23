import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"
import { parseDate } from "@/lib/docs"

const VIEW_ROLES = ["fungiculturist", "admin", "it_specialist", "assistant_ceo"]
const STATUSES = new Set(["sterilizing", "incubating", "ready", "depleted", "contaminated"])

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const spawn = await prisma.fungiSpawn.findUnique({ where: { id }, include: { grainType: true } })
  if (!spawn) return NextResponse.json({ error: "Spawn batch not found." }, { status: 404 })
  return NextResponse.json(spawn)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 })

  const data: Record<string, unknown> = {}
  if (STATUSES.has(body.status)) data.status = body.status
  if (body.inoculatedAt !== undefined) data.inoculatedAt = parseDate(body.inoculatedAt)
  if (body.colonizationPercent !== undefined) data.colonizationPercent = Number(body.colonizationPercent) || 0
  if (body.breakShakeAt !== undefined) data.breakShakeAt = parseDate(body.breakShakeAt)
  if (body.remarks !== undefined) data.remarks = body.remarks?.trim() || null

  try {
    const spawn = await prisma.fungiSpawn.update({ where: { id }, data, include: { grainType: true } })
    return NextResponse.json(spawn)
  } catch (e) {
    console.error("Spawn update failed:", e)
    return NextResponse.json({ error: "Could not update the spawn batch." }, { status: 500 })
  }
}
