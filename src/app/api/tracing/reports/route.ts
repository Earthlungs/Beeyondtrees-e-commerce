import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"
import { computeReconciliation, STAGES, STAGE_LABELS, type Stage } from "@/lib/tracing"

// Value-chain analytics — admin + IT only.
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "it_specialist"])
  if (auth instanceof NextResponse) return auth

  const batches = await prisma.batch.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      bulkRequest: true, approval: true, sourcing: true, inspection: true,
      requisitions: { orderBy: { createdAt: "asc" } },
      issuance: true, production: true, dispatch: true, receiving: true,
    },
  })

  // 1) Profit/loss per batch (reuse the same engine as the batch page).
  const perBatch = await Promise.all(batches.map(async (b) => {
    const r = await computeReconciliation(b)
    const loss = r.tiers.find((t) => t.verdict === "loss")
    return {
      id: b.id, code: b.code, productName: b.productName, status: b.status, stage: b.stage,
      totalCost: r.totalCost, units: r.units, costPerUnit: r.costPerUnit,
      matchedProductName: r.matchedProductName, tiers: r.tiers,
      verdict: loss ? "loss" : r.tiers.length ? "profit" : "n/a",
    }
  }))

  // 2) Aggregate P/L + over-time buckets (by day).
  const byDay: Record<string, { date: string; cost: number; count: number; lossRisk: number }> = {}
  let totalCost = 0, lossRisk = 0, completed = 0, inProgress = 0, rejected = 0
  for (const pb of perBatch) {
    const b = batches.find((x) => x.id === pb.id)!
    const day = b.createdAt.toISOString().slice(0, 10)
    byDay[day] ??= { date: day, cost: 0, count: 0, lossRisk: 0 }
    byDay[day].cost += pb.totalCost
    byDay[day].count += 1
    totalCost += pb.totalCost
    if (pb.verdict === "loss") { lossRisk += 1; byDay[day].lossRisk += 1 }
    if (b.status === "completed") completed += 1
    else if (b.status === "rejected") rejected += 1
    else inProgress += 1
  }
  const aggregate = {
    totalCost: +totalCost.toFixed(2), lossRisk, completed, inProgress, rejected, batches: batches.length,
    byDay: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
  }

  // 3) Cost breakdown by stage.
  let labor = 0, transportH = 0, other = 0, prod = 0, transportD = 0, overBudget = 0
  for (const b of batches) {
    labor += b.sourcing?.laborCost ?? 0
    transportH += b.sourcing?.transportCost ?? 0
    other += b.sourcing?.otherCosts ?? 0
    prod += b.production?.totalCost ?? 0
    transportD += b.dispatch?.transportCost ?? 0
    const est = b.bulkRequest?.estimatedTotalCost ?? 0
    const actual = (b.sourcing?.totalHarvestCost ?? 0) + (b.production?.totalCost ?? 0) + (b.dispatch?.transportCost ?? 0)
    if (est > 0 && actual > est * 1.15) overBudget += 1
  }
  const costByStage = {
    harvestLabor: +labor.toFixed(2), harvestTransport: +transportH.toFixed(2), harvestOther: +other.toFixed(2),
    production: +prod.toFixed(2), dispatchTransport: +transportD.toFixed(2),
    total: +(labor + transportH + other + prod + transportD).toFixed(2),
    overBudgetBatches: overBudget,
  }

  // 4) Cycle time / bottlenecks — avg gap (hours) between consecutive stage
  // timestamps, plus rejection rates.
  const stageTimes = (b: (typeof batches)[number]): Partial<Record<Stage, Date | null>> => ({
    bulk_request: b.bulkRequest?.createdAt ?? null,
    approval: b.approval?.decidedAt ?? null,
    sourcing: b.sourcing?.createdAt ?? null,
    inspection: b.inspection?.createdAt ?? null,
    requisition: b.requisitions[0]?.createdAt ?? null,
    issuance: b.issuance?.createdAt ?? null,
    production: b.production?.createdAt ?? null,
    dispatch: b.dispatch?.createdAt ?? null,
    receiving: b.receiving?.createdAt ?? null,
  })
  const durSum: Record<string, number> = {}
  const durN: Record<string, number> = {}
  let totalCycle = 0, totalCycleN = 0
  for (const b of batches) {
    const t = stageTimes(b)
    for (let i = 1; i < STAGES.length; i++) {
      const prev = t[STAGES[i - 1]], cur = t[STAGES[i]]
      if (prev && cur) {
        const hours = (cur.getTime() - prev.getTime()) / 3.6e6
        durSum[STAGES[i]] = (durSum[STAGES[i]] ?? 0) + hours
        durN[STAGES[i]] = (durN[STAGES[i]] ?? 0) + 1
      }
    }
    const first = t.bulk_request, last = t.receiving
    if (first && last) { totalCycle += (last.getTime() - first.getTime()) / 3.6e6; totalCycleN += 1 }
  }
  const stageDurations = STAGES.slice(1).map((s) => ({
    stage: s, label: STAGE_LABELS[s], avgHours: durN[s] ? +(durSum[s] / durN[s]).toFixed(1) : null,
  }))
  const approvals = batches.filter((b) => b.approval).length
  const rejections = batches.filter((b) => b.approval?.decision === "rejected").length
  const inspBatches = batches.filter((b) => (b.inspection?.quantityDelivered ?? 0) > 0)
  const avgRejectPct = inspBatches.length
    ? +(inspBatches.reduce((s, b) => s + (b.inspection!.quantityRejected / b.inspection!.quantityDelivered) * 100, 0) / inspBatches.length).toFixed(1)
    : 0
  const cycle = {
    stageDurations,
    avgTotalCycleHours: totalCycleN ? +(totalCycle / totalCycleN).toFixed(1) : null,
    approvalRejectionRate: approvals ? +((rejections / approvals) * 100).toFixed(1) : 0,
    avgInspectionRejectPct: avgRejectPct,
  }

  return NextResponse.json({ perBatch, aggregate, costByStage, cycle }, { headers: { "Cache-Control": "no-store" } })
}
