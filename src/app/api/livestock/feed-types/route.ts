import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"

const VIEW_ROLES = ["livestock_manager", "admin", "it_specialist", "assistant_ceo"]
const UNITS = new Set(["kg", "bags", "liters"])

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const feedTypes = await prisma.feedType.findMany({ orderBy: { name: "asc" } })
  return NextResponse.json(feedTypes, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 })
  if (!body.name?.trim()) return NextResponse.json({ error: "Enter a name for the feed type." }, { status: 400 })

  try {
    const feedType = await prisma.feedType.create({
      data: {
        name: body.name.trim(),
        unit: UNITS.has(body.unit) ? body.unit : "kg",
        stockQty: Number(body.stockQty) || 0,
      },
    })
    return NextResponse.json(feedType, { status: 201 })
  } catch (e) {
    console.error("Feed type create failed:", e)
    return NextResponse.json({ error: "Could not create the feed type. It may already exist." }, { status: 500 })
  }
}
