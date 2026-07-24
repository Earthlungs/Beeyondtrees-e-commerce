import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"
import { createNumbered, parseDate } from "@/lib/docs"
import { SPECIES, HEALTH_STATUSES, ANIMAL_STATUSES } from "@/lib/livestock-stages"

const VIEW_ROLES = ["livestock_manager", "admin", "it_specialist", "assistant_ceo"]
const SEXES = new Set(["male", "female", "mixed"])

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const animals = await prisma.livestockAnimal.findMany({
    orderBy: { createdAt: "desc" },
    include: { housing: { select: { id: true, name: true, code: true } } },
  })
  return NextResponse.json(animals, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 })
  const species = typeof body.species === "string" ? body.species.trim() : ""
  if (!(SPECIES as readonly string[]).includes(species)) {
    return NextResponse.json({ error: "Select a valid species." }, { status: 400 })
  }
  const tagId = body.tagId?.trim() || null
  const groupCount = Math.max(1, Math.trunc(Number(body.groupCount)) || 1)
  if (tagId && groupCount > 1) {
    return NextResponse.json({ error: "An individually tagged animal must have a group count of 1." }, { status: 400 })
  }

  if (body.housingId) {
    const housing = await prisma.livestockHousing.findUnique({ where: { id: body.housingId } })
    if (!housing) return NextResponse.json({ error: "Unknown housing unit." }, { status: 400 })
  }

  try {
    const animal = await createNumbered(
      "LA",
      () => prisma.livestockAnimal.count(),
      (code) =>
        prisma.livestockAnimal.create({
          data: {
            code,
            tagId,
            name: body.name?.trim() || null,
            species,
            breed: body.breed?.trim() || null,
            sex: SEXES.has(body.sex) ? body.sex : "mixed",
            groupCount,
            dob: parseDate(body.dob),
            acquiredAt: parseDate(body.acquiredAt),
            source: body.source?.trim() || null,
            weightKg: body.weightKg !== undefined && body.weightKg !== "" ? Number(body.weightKg) || null : null,
            healthStatus: (HEALTH_STATUSES as readonly string[]).includes(body.healthStatus) ? body.healthStatus : "healthy",
            status: (ANIMAL_STATUSES as readonly string[]).includes(body.status) ? body.status : "active",
            housingId: body.housingId || null,
            notes: body.notes?.trim() || null,
          },
          include: { housing: { select: { id: true, name: true, code: true } } },
        })
    )
    return NextResponse.json(animal, { status: 201 })
  } catch (e) {
    console.error("Livestock animal create failed:", e)
    return NextResponse.json({ error: "Could not create the animal record. Please try again." }, { status: 500 })
  }
}
