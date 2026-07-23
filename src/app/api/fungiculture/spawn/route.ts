import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"
import { createNumbered, parseDate } from "@/lib/docs"

const VIEW_ROLES = ["fungiculturist", "admin", "it_specialist", "assistant_ceo"]

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const spawn = await prisma.fungiSpawn.findMany({
    orderBy: { createdAt: "desc" },
    include: { grainType: true },
  })
  return NextResponse.json(spawn, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 })
  const grainTypeId = typeof body.grainTypeId === "string" ? body.grainTypeId.trim() : ""
  if (!grainTypeId) return NextResponse.json({ error: "Select a grain type." }, { status: 400 })
  const grainType = await prisma.grainType.findUnique({ where: { id: grainTypeId } })
  if (!grainType || !grainType.active) {
    return NextResponse.json({ error: "Unknown or inactive grain type." }, { status: 400 })
  }

  try {
    const spawn = await createNumbered(
      "SPN",
      () => prisma.fungiSpawn.count(),
      (code) =>
        prisma.fungiSpawn.create({
          data: {
            code,
            grainTypeId,
            quantityKg: Number(body.quantityKg) || 0,
            sterilizedAt: parseDate(body.sterilizedAt),
            createdBy: (auth.token as { name?: string }).name ?? null,
            remarks: body.remarks?.trim() || null,
          },
          include: { grainType: true },
        })
    )
    return NextResponse.json(spawn, { status: 201 })
  } catch (e) {
    console.error("Spawn create failed:", e)
    return NextResponse.json({ error: "Could not create the spawn batch. Please try again." }, { status: 500 })
  }
}
