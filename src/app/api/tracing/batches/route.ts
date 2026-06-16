import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole, isAdminish } from "@/lib/authz"
import { createNumbered, parseDate } from "@/lib/docs"
import { TRACING_ROLES, computeReconciliation } from "@/lib/tracing"

// Anyone in the pipeline (or admin) can see the board.
const VIEW_ROLES = [...TRACING_ROLES, "admin", "it_specialist"]

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
        summary,
      }
    })
  )

  return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } })
}

// Stage 1 — Factory manager (or admin) starts a batch with the bulk request.
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["factory_manager", "admin"])
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
    return NextResponse.json(batch, { status: 201 })
  } catch (e) {
    console.error("Batch create failed:", e)
    return NextResponse.json({ error: "Could not create the batch. Please try again." }, { status: 500 })
  }
}
