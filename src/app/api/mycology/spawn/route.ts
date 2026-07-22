import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"
import { createNumbered, parseDate } from "@/lib/docs"

const VIEW_ROLES = ["fungiculturist", "admin", "it_specialist", "assistant_ceo"]
const GRAIN_TYPES = new Set(["wheat", "rye", "oats", "millet"])

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const spawn = await prisma.mycoSpawn.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(spawn, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 })
  const grainType = GRAIN_TYPES.has(body.grainType) ? body.grainType : "wheat"

  try {
    const spawn = await createNumbered(
      "SPN",
      () => prisma.mycoSpawn.count(),
      (code) =>
        prisma.mycoSpawn.create({
          data: {
            code,
            grainType,
            quantityKg: Number(body.quantityKg) || 0,
            sterilizedAt: parseDate(body.sterilizedAt),
            createdBy: (auth.token as { name?: string }).name ?? null,
            remarks: body.remarks?.trim() || null,
          },
        })
    )
    return NextResponse.json(spawn, { status: 201 })
  } catch (e) {
    console.error("Spawn create failed:", e)
    return NextResponse.json({ error: "Could not create the spawn batch. Please try again." }, { status: 500 })
  }
}
