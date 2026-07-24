import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"
import { parseDate } from "@/lib/docs"

const VIEW_ROLES = ["livestock_manager", "admin", "it_specialist", "assistant_ceo"]

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const animalId = request.nextUrl.searchParams.get("animalId")
  const housingId = request.nextUrl.searchParams.get("housingId")

  const logs = await prisma.feedingLog.findMany({
    where: { ...(animalId ? { animalId } : {}), ...(housingId ? { housingId } : {}) },
    orderBy: { fedAt: "desc" },
    take: 200,
    include: {
      feedType: { select: { name: true, unit: true } },
      housing: { select: { name: true, code: true } },
      animal: { select: { code: true, tagId: true, name: true } },
    },
  })
  return NextResponse.json(logs, { headers: { "Cache-Control": "no-store" } })
}

// Logging a feeding event decrements the feed type's stock on hand — the
// stock figure is meant to reflect what's actually left in the store.
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 })
  const feedTypeId = typeof body.feedTypeId === "string" ? body.feedTypeId.trim() : ""
  if (!feedTypeId) return NextResponse.json({ error: "Select a feed type." }, { status: 400 })
  const quantity = Number(body.quantity) || 0
  if (quantity <= 0) return NextResponse.json({ error: "Enter a quantity fed." }, { status: 400 })
  if (!body.housingId && !body.animalId) {
    return NextResponse.json({ error: "Select a housing unit or an animal record to log the feeding against." }, { status: 400 })
  }

  const feedType = await prisma.feedType.findUnique({ where: { id: feedTypeId } })
  if (!feedType) return NextResponse.json({ error: "Unknown feed type." }, { status: 400 })

  try {
    const [log] = await prisma.$transaction([
      prisma.feedingLog.create({
        data: {
          feedTypeId,
          housingId: body.housingId || null,
          animalId: body.animalId || null,
          quantity,
          fedAt: parseDate(body.fedAt) ?? new Date(),
          loggedBy: (auth.token as { name?: string }).name ?? null,
          notes: body.notes?.trim() || null,
        },
        include: { feedType: { select: { name: true, unit: true } } },
      }),
      prisma.feedType.update({ where: { id: feedTypeId }, data: { stockQty: { decrement: quantity } } }),
    ])
    return NextResponse.json(log, { status: 201 })
  } catch (e) {
    console.error("Feeding log create failed:", e)
    return NextResponse.json({ error: "Could not log the feeding. Please try again." }, { status: 500 })
  }
}
