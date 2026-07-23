import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { parseDate } from "@/lib/docs"
import { requireStage, nextStage, isStage, type Stage } from "@/lib/fungiculture"

const num = (v: unknown) => Number(v) || 0
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "")
const imgs = (v: unknown) => (Array.isArray(v) ? v : []) as Prisma.InputJsonValue

// Submit one stage of a FungiBatch. Body: { stage, data }. requireStage
// enforces role ownership + the sequential lock, then we write the stage row
// and advance the batch pointer (or complete it). Mirrors
// /api/tracing/batches/[id]/stage — no handoff email since every stage here
// is the same fungiculturist role.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body || !isStage(body.stage)) {
    return NextResponse.json({ error: "Unknown stage." }, { status: 400 })
  }
  const stage = body.stage as Stage
  const d = body.data ?? {}

  const batch = await prisma.fungiBatch.findUnique({ where: { id } })
  if (!batch) return NextResponse.json({ error: "Batch not found." }, { status: 404 })

  const auth = await requireStage(request, stage, batch)
  if (auth instanceof NextResponse) return auth

  const advance = async () => {
    const next = nextStage(stage)
    return prisma.fungiBatch.update({
      where: { id },
      data: next ? { stage: next } : { status: "completed" },
    })
  }

  try {
    switch (stage) {
      // ── Stage 2: Incubation & fruiting ──────────────────────────────────
      case "incubation": {
        await prisma.fungiIncubation.create({
          data: {
            batchId: id,
            inoculatedAt: parseDate(d.inoculatedAt),
            hangAt: parseDate(d.hangAt),
            growingHouseId: str(d.growingHouseId) || null,
            pinningAt: parseDate(d.pinningAt),
            images: imgs(d.images),
            remarks: str(d.remarks) || null,
          },
        })
        await advance()
        break
      }

      // ── Stage 3: Harvest ──────────────────────────────────────────────
      case "harvest": {
        await prisma.fungiHarvest.create({
          data: {
            batchId: id,
            totalWeightKg: num(d.totalWeightKg),
            freshPunnets250g: Math.trunc(num(d.freshPunnets250g)),
            weightForDryingKg: num(d.weightForDryingKg),
            harvestedBy: str(d.harvestedBy) || str(auth.token.name) || "Fungiculturist",
            images: imgs(d.images),
            remarks: str(d.remarks) || null,
          },
        })
        await advance()
        break
      }

      // ── Stage 4 (final): Dehydration & packaging ───────────────────────
      case "dehydration_packaging": {
        await prisma.fungiDehydration.create({
          data: {
            batchId: id,
            driedAt: parseDate(d.driedAt),
            driedWeightKg: num(d.driedWeightKg),
            packagingType: str(d.packagingType) || null,
            packagedUnits: Math.trunc(num(d.packagedUnits)),
            remarks: str(d.remarks) || null,
          },
        })
        await advance() // last stage → marks the batch completed
        break
      }

      // substrate_prep is created via POST /api/fungiculture/batches, not here.
      default:
        return NextResponse.json({ error: "This stage cannot be submitted here." }, { status: 400 })
    }

    const updated = await prisma.fungiBatch.findUnique({
      where: { id },
      include: { substrate: true, incubation: true, harvest: true, dehydration: true },
    })
    return NextResponse.json(updated)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "This stage was already submitted for the batch." }, { status: 409 })
    }
    console.error(`Fungiculture stage "${stage}" submit failed:`, e)
    return NextResponse.json({ error: "Could not save this stage. Please try again." }, { status: 500 })
  }
}
