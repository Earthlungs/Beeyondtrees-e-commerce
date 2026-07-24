import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"

const VIEW_ROLES = ["livestock_manager", "admin", "it_specialist", "assistant_ceo"]
const UNITS = new Set(["kg", "bags", "liters"])

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const feedType = await prisma.feedType.findUnique({ where: { id } })
  if (!feedType) return NextResponse.json({ error: "Feed type not found." }, { status: 404 })
  return NextResponse.json(feedType)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 })

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = String(body.name).trim()
  if (body.unit !== undefined && UNITS.has(body.unit)) data.unit = body.unit
  if (body.stockQty !== undefined) data.stockQty = Number(body.stockQty) || 0
  if (body.active !== undefined) data.active = Boolean(body.active)

  try {
    const feedType = await prisma.feedType.update({ where: { id }, data })
    return NextResponse.json(feedType)
  } catch (e) {
    console.error("Feed type update failed:", e)
    return NextResponse.json({ error: "Could not update the feed type." }, { status: 500 })
  }
}
