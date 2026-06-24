import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole, isAdminish } from "@/lib/authz"
import { createNumbered, parseDate } from "@/lib/docs"
import { TRACING_ROLES, computeReconciliation } from "@/lib/tracing"
import { sendMail } from "@/lib/mailer"
import { stageAdvanceEmail } from "@/lib/email-templates"

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000"

// Anyone in the pipeline (or CEO-level) can see the board.
const VIEW_ROLES = [...TRACING_ROLES, "admin", "it_specialist", "assistant_ceo"]

// Raw columns on Batch (origin / LPO creator) not modelled in Prisma.
async function fetchBatchOrigins(ids: string[]): Promise<Map<string, { origin: string | null; lpoCreatedByName: string | null; lpoCreatedByUserId: string | null }>> {
  if (ids.length === 0) return new Map()
  try {
    const rows = await prisma.$queryRaw<{ id: string; origin: string | null; lpoCreatedByName: string | null; lpoCreatedByUserId: string | null }[]>`
      SELECT id, "origin", "lpoCreatedByName", "lpoCreatedByUserId" FROM "Batch" WHERE id = ANY(${ids}::text[])
    `
    return new Map(rows.map((r) => [r.id, r]))
  } catch {
    return new Map()
  }
}

// Highest logged production-completion percent per batch (for the board's progress bar).
async function fetchProductionPercents(ids: string[]): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map()
  try {
    const rows = await prisma.$queryRaw<{ batchId: string; pct: number }[]>`
      SELECT "batchId", LEAST(SUM(percent), 100)::int AS pct FROM "ProductionStep"
      WHERE "batchId" = ANY(${ids}::text[]) GROUP BY "batchId"
    `
    return new Map(rows.map((r) => [r.batchId, r.pct]))
  } catch {
    return new Map()
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth
  // Cost summary (cost-per-unit + profit/loss verdict) is admin-only.
  const canSeeCosts = isAdminish((auth.token as { role?: string }).role)

  const batches = await prisma.batch.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      bulkRequest: true,
      sourcing: true,
      inspection: true,
      issuance: true,
      production: true,
      dispatch: true,
      receiving: true,
    },
  })
  const origins = await fetchBatchOrigins(batches.map((b) => b.id))
  const prodPercents = await fetchProductionPercents(batches.map((b) => b.id))

  // Attach a profit/loss summary for completed batches so the board can flag it.
  const rows = await Promise.all(
    batches.map(async (b) => {
      let summary: { costPerUnit: number; verdict: string } | null = null
      if (canSeeCosts && b.status === "completed") {
        const r = await computeReconciliation(b)
        const worst = r.tiers.find((t) => t.verdict === "loss") ?? r.tiers[0]
        summary = worst ? { costPerUnit: r.costPerUnit, verdict: worst.verdict } : null
      }
      return {
        id: b.id,
        code: b.code,
        stage: b.stage,
        status: b.status,
        productName: b.productName ?? b.bulkRequest?.materialName ?? null,
        materialName: b.bulkRequest?.materialName ?? null,
        requestedBy: b.bulkRequest?.requestedBy ?? null,
        createdAt: b.createdAt,
        matchedProductId: b.matchedProductId ?? null,
        origin: origins.get(b.id)?.origin ?? null,
        lpoCreatedByName: origins.get(b.id)?.lpoCreatedByName ?? null,
        productionPercent: prodPercents.get(b.id) ?? null,
        summary,
      }
    })
  )

  return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } })
}

// Stage 1 — Factory manager (or admin) starts a batch with the bulk request.
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["factory_manager", "admin", "assistant_ceo"])
  if (auth instanceof NextResponse) return auth

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  if (!body.materialName?.trim()) {
    return NextResponse.json({ error: "Material name is required." }, { status: 400 })
  }
  if (!body.requestedBy?.trim()) {
    return NextResponse.json({ error: "Requested by is required." }, { status: 400 })
  }

  const quantityRequested = Number(body.quantityRequested) || 0
  const estimatedUnitCost = Number(body.estimatedUnitCost) || 0
  const estimatedTotalCost =
    Number(body.estimatedTotalCost) || +(quantityRequested * estimatedUnitCost).toFixed(2)

  const lpoId: string | null = body.lpoId?.trim() || null
  const matchedProductId: string | null = body.matchedProductId?.trim() || null

  try {
    const batch = await createNumbered(
      "BTR",
      () => prisma.batch.count(),
      (code) =>
        prisma.batch.create({
          data: {
            code,
            stage: "approval",
            status: "in_progress",
            lpoId,
            matchedProductId,
            productName: body.productName?.trim() || body.materialName.trim(),
            bulkRequest: {
              create: {
                requestId: `BTR-REQ-${code.split("-")[1]}`,
                sector: body.sector?.trim() || "",
                materialCategory: body.materialCategory?.trim() || "",
                materialName: body.materialName.trim(),
                quantityRequested,
                unitOfMeasure: body.unitOfMeasure?.trim() || "",
                expectedDate: parseDate(body.expectedDate),
                estimatedUnitCost,
                estimatedTotalCost,
                purpose: body.purpose?.trim() || null,
                requestedBy: body.requestedBy.trim(),
                status: "submitted",
              },
            },
          },
          include: { bulkRequest: true },
        })
    )

    // Stamp the batch with its LPO's origin (internal/external) + creator so the
    // board can label it and the receiving stage can be gated to the LPO creator.
    if (lpoId) {
      try {
        const lpoRows = await prisma.$queryRaw<{ origin: string | null; createdByUserId: string | null; createdByName: string | null }[]>`
          SELECT "origin", "createdByUserId", "createdByName" FROM "Lpo" WHERE id = ${lpoId}
        `
        const lpo = lpoRows[0]
        if (lpo) {
          await prisma.$executeRaw`
            UPDATE "Batch"
            SET "origin" = ${lpo.origin ?? "internal"}::text,
                "lpoCreatedByUserId" = ${lpo.createdByUserId}::text,
                "lpoCreatedByName" = ${lpo.createdByName}::text
            WHERE id = ${batch.id}
          `
        }
      } catch (e) { console.error("[batch] origin stamp failed:", e) }
    }

    // Notify executives (and admin) that a new batch needs approval
    const batchUrl = `${BASE_URL}/admin/tracing/${batch.id}`
    const productName = batch.productName ?? batch.bulkRequest?.materialName ?? ""
    try {
      const users = await prisma.user.findMany({
        where: { role: { in: ["executive", "admin"] } },
        select: { email: true },
      })
      const to = users.flatMap((u) => u.email ? [u.email] : [])
      if (to.length > 0) {
        await sendMail({
          to,
          subject: `[Beeyond Trees] New batch ${batch.code} awaiting approval`,
          html: stageAdvanceEmail({
            batchCode: batch.code,
            productName,
            stageName: "Approval",
            roleName: "Executive",
            batchUrl,
          }),
        })
      }
    } catch (e) { console.error("[mailer] new batch notify:", e) }

    return NextResponse.json(batch, { status: 201 })
  } catch (e) {
    console.error("Batch create failed:", e)
    return NextResponse.json({ error: "Could not create the batch. Please try again." }, { status: 500 })
  }
}
