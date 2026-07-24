import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"
import { parseDate } from "@/lib/docs"
import { YIELD_TYPES, YIELD_UNITS } from "@/lib/livestock-stages"

const VIEW_ROLES = ["livestock_manager", "admin", "it_specialist", "assistant_ceo"]

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const animalId = request.nextUrl.searchParams.get("animalId")
  const housingId = request.nextUrl.searchParams.get("housingId")

  const yields = await prisma.livestockYield.findMany({
    where: { ...(animalId ? { animalId } : {}), ...(housingId ? { housingId } : {}) },
    orderBy: { recordedAt: "desc" },
    take: 200,
    include: {
      housing: { select: { name: true, code: true } },
      animal: { select: { code: true, tagId: true, name: true, species: true } },
    },
  })
  return NextResponse.json(yields, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 })
  const type = typeof body.type === "string" ? body.type.trim() : ""
  if (!(YIELD_TYPES as readonly string[]).includes(type)) {
    return NextResponse.json({ error: "Select a valid yield type." }, { status: 400 })
  }
  const quantity = Number(body.quantity) || 0
  if (quantity <= 0) return NextResponse.json({ error: "Enter a quantity produced." }, { status: 400 })
  if (!body.housingId && !body.animalId) {
    return NextResponse.json({ error: "Select a housing unit or an animal record to record the yield against." }, { status: 400 })
  }

  try {
    const yieldRecord = await prisma.livestockYield.create({
      data: {
        animalId: body.animalId || null,
        housingId: body.housingId || null,
        type,
        quantity,
        unit: (YIELD_UNITS as readonly string[]).includes(body.unit) ? body.unit : "kg",
        recordedAt: parseDate(body.recordedAt) ?? new Date(),
        recordedBy: (auth.token as { name?: string }).name ?? null,
        notes: body.notes?.trim() || null,
      },
      include: {
        housing: { select: { name: true, code: true } },
        animal: { select: { code: true, tagId: true, name: true, species: true } },
      },
    })
    return NextResponse.json(yieldRecord, { status: 201 })
  } catch (e) {
    console.error("Livestock yield create failed:", e)
    return NextResponse.json({ error: "Could not record the yield. Please try again." }, { status: 500 })
  }
}
