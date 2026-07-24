import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"
import { parseDate } from "@/lib/docs"
import { HEALTH_STATUSES, ANIMAL_STATUSES } from "@/lib/livestock-stages"

const VIEW_ROLES = ["livestock_manager", "admin", "it_specialist", "assistant_ceo"]
const SEXES = new Set(["male", "female", "mixed"])

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const animal = await prisma.livestockAnimal.findUnique({
    where: { id },
    include: {
      housing: { select: { id: true, name: true, code: true } },
      feedingLogs: { orderBy: { fedAt: "desc" }, take: 20, include: { feedType: { select: { name: true, unit: true } } } },
      yields: { orderBy: { recordedAt: "desc" }, take: 20 },
    },
  })
  if (!animal) return NextResponse.json({ error: "Animal record not found." }, { status: 404 })
  return NextResponse.json(animal)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 })

  if (body.housingId) {
    const housing = await prisma.livestockHousing.findUnique({ where: { id: body.housingId } })
    if (!housing) return NextResponse.json({ error: "Unknown housing unit." }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (body.tagId !== undefined) data.tagId = body.tagId?.trim() || null
  if (body.breed !== undefined) data.breed = body.breed?.trim() || null
  if (body.sex !== undefined && SEXES.has(body.sex)) data.sex = body.sex
  if (body.groupCount !== undefined) data.groupCount = Math.max(1, Math.trunc(Number(body.groupCount)) || 1)
  if (body.dob !== undefined) data.dob = parseDate(body.dob)
  if (body.acquiredAt !== undefined) data.acquiredAt = parseDate(body.acquiredAt)
  if (body.source !== undefined) data.source = body.source?.trim() || null
  if (body.weightKg !== undefined) data.weightKg = body.weightKg === "" ? null : Number(body.weightKg) || null
  if (body.healthStatus !== undefined && (HEALTH_STATUSES as readonly string[]).includes(body.healthStatus)) data.healthStatus = body.healthStatus
  if (body.status !== undefined && (ANIMAL_STATUSES as readonly string[]).includes(body.status)) data.status = body.status
  if (body.housingId !== undefined) data.housingId = body.housingId || null
  if (body.notes !== undefined) data.notes = body.notes?.trim() || null

  try {
    const animal = await prisma.livestockAnimal.update({
      where: { id }, data,
      include: { housing: { select: { id: true, name: true, code: true } } },
    })
    return NextResponse.json(animal)
  } catch (e) {
    console.error("Livestock animal update failed:", e)
    return NextResponse.json({ error: "Could not update the animal record." }, { status: 500 })
  }
}
