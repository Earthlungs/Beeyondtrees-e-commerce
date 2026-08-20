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
//
// Harvest is the exception: a bed fruits repeatedly, so each submission records
// another flush and the batch STAYS on the harvest stage. It only moves on when
// the fungiculturist closes the harvest explicitly — body { stage: "harvest",
// action: "close" }.
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

      // ── Stage 3: Harvest — repeats until closed ───────────────────────
      case "harvest": {
        // Closing the harvest window is what advances the batch. Requiring at
        // least one flush first stops a batch skipping harvest by accident.
        if (body.action === "close") {
          const flushes = await prisma.fungiHarvest.count({ where: { batchId: id } })
          if (flushes === 0) {
            return NextResponse.json(
              { error: "Record at least one harvest flush before closing the harvest." },
              { status: 400 }
            )
          }
          await prisma.fungiBatch.update({ where: { id }, data: { harvestClosedAt: new Date() } })
          await advance()
          break
        }

        // Another flush. flushNumber is derived from what's already there and
        // the (batchId, flushNumber) unique index makes two people submitting
        // at once collide rather than silently share a number — so retry a few
        // times on that collision, the same tactic as createNumbered.
        const harvestData = {
          batchId: id,
          harvestedAt: parseDate(d.harvestedAt) ?? new Date(),
          totalWeightKg: num(d.totalWeightKg),
          freshPunnets250g: Math.trunc(num(d.freshPunnets250g)),
          weightForDryingKg: num(d.weightForDryingKg),
          harvestedBy: str(d.harvestedBy) || str(auth.token.name) || "Fungiculturist",
          images: imgs(d.images),
          remarks: str(d.remarks) || null,
        }
        const highest = await prisma.fungiHarvest.findFirst({
          where: { batchId: id },
          orderBy: { flushNumber: "desc" },
          select: { flushNumber: true },
        })
        let created = false
        for (let n = (highest?.flushNumber ?? 0) + 1; n < (highest?.flushNumber ?? 0) + 13; n++) {
          try {
            await prisma.fungiHarvest.create({ data: { ...harvestData, flushNumber: n } })
            created = true
            break
          } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue
            throw e
          }
        }
        if (!created) throw new Error("Could not allocate a flush number")
        // Deliberately NO advance() — the batch keeps fruiting.
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
      include: { substrate: true, incubation: true, harvests: { orderBy: { flushNumber: "asc" } }, dehydration: true },
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
