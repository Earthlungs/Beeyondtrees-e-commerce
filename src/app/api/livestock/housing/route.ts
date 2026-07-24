import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"
import { createNumbered } from "@/lib/docs"

const VIEW_ROLES = ["livestock_manager", "admin", "it_specialist", "assistant_ceo"]
const COUNTRIES = new Set(["Kenya", "Tanzania"])

// List housing units with a computed activeAnimalCount so the UI can warn
// when a unit is over its capacity — same soft-warning convention as
// GrowingHouse.activeIncubationCount.
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const housing = await prisma.livestockHousing.findMany({ orderBy: { createdAt: "desc" } })
  const counts = await prisma.livestockAnimal.groupBy({
    by: ["housingId"],
    where: { housingId: { not: null }, status: "active" },
    _sum: { groupCount: true },
  })
  const countByHousing = new Map(counts.map((c) => [c.housingId, c._sum.groupCount ?? 0]))

  return NextResponse.json(
    housing.map((h) => ({ ...h, activeAnimalCount: countByHousing.get(h.id) ?? 0 })),
    { headers: { "Cache-Control": "no-store" } }
  )
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 })
  if (!body.name?.trim()) return NextResponse.json({ error: "Enter a name for the housing unit." }, { status: 400 })
  const country = COUNTRIES.has(body.country) ? body.country : "Kenya"

  try {
    const housing = await createNumbered(
      "LH",
      () => prisma.livestockHousing.count(),
      (code) =>
        prisma.livestockHousing.create({
          data: {
            code,
            name: body.name.trim(),
            type: body.type?.trim() || "pen",
            country,
            region: body.region?.trim() || null,
            location: body.location?.trim() || null,
            capacity: Math.trunc(Number(body.capacity)) || 0,
            notes: body.notes?.trim() || null,
          },
        })
    )
    return NextResponse.json(housing, { status: 201 })
  } catch (e) {
    console.error("Livestock housing create failed:", e)
    return NextResponse.json({ error: "Could not create the housing unit. Please try again." }, { status: 500 })
  }
}
