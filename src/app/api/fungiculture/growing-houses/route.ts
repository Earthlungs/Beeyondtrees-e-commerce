import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"
import { createNumbered } from "@/lib/docs"

const VIEW_ROLES = ["fungiculturist", "admin", "it_specialist", "assistant_ceo"]
const COUNTRIES = new Set(["Kenya", "Tanzania"])

// List growing houses with a computed activeIncubationCount — batches
// currently hung there (incubation stage, in_progress) — so the UI can warn
// when a house is over its maxBagCapacity. Soft warning only, never blocks.
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const houses = await prisma.growingHouse.findMany({ orderBy: { createdAt: "desc" } })
  const counts = await prisma.fungiIncubation.groupBy({
    by: ["growingHouseId"],
    where: { growingHouseId: { not: null }, batch: { stage: "incubation", status: "in_progress" } },
    _count: { _all: true },
  })
  const countByHouse = new Map(counts.map((c) => [c.growingHouseId, c._count._all]))

  return NextResponse.json(
    houses.map((h) => ({ ...h, activeIncubationCount: countByHouse.get(h.id) ?? 0 })),
    { headers: { "Cache-Control": "no-store" } }
  )
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 })
  if (!body.name?.trim()) return NextResponse.json({ error: "Enter a name for the growing house." }, { status: 400 })
  const country = COUNTRIES.has(body.country) ? body.country : "Kenya"

  try {
    const house = await createNumbered(
      "GH",
      () => prisma.growingHouse.count(),
      (code) =>
        prisma.growingHouse.create({
          data: {
            code,
            name: body.name.trim(),
            country,
            region: body.region?.trim() || null,
            location: body.location?.trim() || null,
            lengthM: body.lengthM !== undefined && body.lengthM !== "" ? Number(body.lengthM) || null : null,
            widthM: body.widthM !== undefined && body.widthM !== "" ? Number(body.widthM) || null : null,
            maxBagCapacity: Math.trunc(Number(body.maxBagCapacity)) || 0,
            notes: body.notes?.trim() || null,
          },
        })
    )
    return NextResponse.json(house, { status: 201 })
  } catch (e) {
    console.error("Growing house create failed:", e)
    return NextResponse.json({ error: "Could not create the growing house. Please try again." }, { status: 500 })
  }
}
