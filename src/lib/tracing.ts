import { NextRequest, NextResponse } from "next/server"
import { getToken, type JWT } from "next-auth/jwt"
import { prisma } from "@/lib/db"
import { STAGE_ROLES, type Stage } from "@/lib/tracing-stages"

// Pure stage metadata lives in tracing-stages.ts (client-safe). Re-export it so
// existing `@/lib/tracing` importers (the API routes) keep working unchanged.
export * from "@/lib/tracing-stages"

// ── Traceability pipeline ──────────────────────────────────────────────────
// A Batch moves through 9 stages IN ORDER. The role for stage N can only act
// when batch.stage === that stage AND status === "in_progress" — that's the
// sequential lock ("can't be in stage 3 without clearing 2").

// Guard for a stage submission. Mirrors the requireRole/requireDocRole pattern:
// verifies the NextAuth token (proxy lets /api/* through), checks the role owns
// this stage (or admin), AND enforces the sequential lock against the batch's
// current stage/status. Returns a NextResponse to bail early, or { token, role }.
export async function requireStage(
  request: NextRequest,
  stage: Stage,
  batch: { id: string; stage: string; status: string }
): Promise<NextResponse | { token: JWT; role: string }> {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = (token as { role?: string }).role ?? "merchant"
  // CEO (`admin`) and Assistant CEO (all CEO rights) may act on any stage.
  const isCeo = role === "admin" || role === "assistant_ceo"

  let allowed: boolean
  if (stage === "receiving") {
    // Strict rule: whoever CREATED the LPO receives the goods — NOT the legacy
    // receiving_officer. Match the logged-in user against the batch's LPO creator
    // (by id, falling back to name). CEO-level may always act.
    allowed = isCeo
    if (!allowed) {
      try {
        const rows = await prisma.$queryRaw<{ uid: string | null; nm: string | null }[]>`
          SELECT "lpoCreatedByUserId" AS uid, "lpoCreatedByName" AS nm FROM "Batch" WHERE id = ${batch.id}
        `
        const r = rows[0]
        const sub = (token as { sub?: string }).sub
        const name = (token as { name?: string }).name
        // Prefer the reliable account-id match. Only fall back to name when the
        // batch has NO creator id (legacy) — so two people sharing a name can't
        // both receive.
        const matchById = !!r?.uid && r.uid === sub
        const matchByName = !r?.uid && !!r?.nm && !!name && r.nm === name
        if (r && (matchById || matchByName)) allowed = true
      } catch { /* raw columns missing — fall through to 403 */ }
    }
  } else {
    allowed = isCeo || role === STAGE_ROLES[stage]
  }
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (batch.status === "rejected") {
    return NextResponse.json({ error: "This batch was rejected and is closed." }, { status: 409 })
  }
  if (batch.status === "completed") {
    return NextResponse.json({ error: "This batch is already completed." }, { status: 409 })
  }
  if (batch.stage !== stage) {
    return NextResponse.json(
      { error: `Out of order: this batch is at the "${batch.stage}" stage, not "${stage}".` },
      { status: 409 }
    )
  }
  return { token, role }
}

// ── Cost engine (rule-based, no LLM) ───────────────────────────────────────

export interface TierResult {
  tier: string
  sellingPrice: number
  margin: number // sellingPrice - costPerUnit
  marginPct: number // margin as % of selling price
  verdict: "profit" | "loss" | "breakeven"
}

export interface Reconciliation {
  totalCost: number
  costBreakdown: { harvest: number; production: number; dispatch: number }
  units: number
  costPerUnit: number
  matchedProductId: string | null
  matchedProductName: string | null
  matchConfidence: number // 0..1 token overlap
  tiers: TierResult[]
  warnings: string[]
  reconcilable: boolean
}

// Normalize a product name to comparable tokens for fuzzy matching.
function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
}

// Read-only token-overlap match against the catalog. Returns the best Product
// and a confidence score — we NEVER write to Product here.
export async function matchCatalogPrice(productName: string | null | undefined) {
  const name = (productName ?? "").trim()
  if (!name) return null
  const products = await prisma.product.findMany({
    select: { id: true, name: true, retailPrice: true, wholesalePrice: true, distributorPrice: true },
  })
  if (products.length === 0) return null

  const target = new Set(tokenize(name))
  if (target.size === 0) return null

  let best: (typeof products)[number] | null = null
  let bestScore = 0
  for (const p of products) {
    const toks = new Set(tokenize(p.name))
    if (toks.size === 0) continue
    let overlap = 0
    for (const t of target) if (toks.has(t)) overlap++
    // Jaccard-ish: overlap over the union, so longer mismatched names don't win.
    const score = overlap / (target.size + toks.size - overlap)
    if (score > bestScore) {
      bestScore = score
      best = p
    }
  }
  if (!best || bestScore === 0) return null
  return { product: best, confidence: +bestScore.toFixed(2) }
}

type BatchWithStages = {
  matchedProductId: string | null
  productName: string | null
  sellingPriceSnapshot: number | null
  bulkRequest: { estimatedTotalCost: number } | null
  sourcing: { totalHarvestCost: number; transportCost: number } | null
  inspection: { quantityDelivered: number; quantityRejected: number } | null
  issuance: { numberToManufacture: number } | null
  production: { totalCost: number; quantityIssued: number } | null
  dispatch: { transportCost: number; quantity: number } | null
  receiving: { quantityReceived: number; variance: number } | null
}

// Roll up every cost captured across the pipeline into a per-unit production
// cost, then compare against the matched catalog selling price per tier.
export async function computeReconciliation(batch: BatchWithStages): Promise<Reconciliation> {
  const harvest = batch.sourcing?.totalHarvestCost ?? 0
  const production = batch.production?.totalCost ?? 0
  const dispatch = batch.dispatch?.transportCost ?? 0
  const totalCost = +(harvest + production + dispatch).toFixed(2)

  // Prefer the most concrete count of finished units we have.
  const units =
    batch.receiving?.quantityReceived ||
    batch.issuance?.numberToManufacture ||
    batch.production?.quantityIssued ||
    0
  const costPerUnit = units > 0 ? +(totalCost / units).toFixed(2) : 0

  // Resolve the catalog price: explicit override (matchedProductId) wins,
  // otherwise auto-match by name. Read-only.
  let matched: { id: string; name: string; retailPrice: number; wholesalePrice: number; distributorPrice: number } | null =
    null
  let confidence = 0
  if (batch.matchedProductId) {
    matched = await prisma.product.findUnique({
      where: { id: batch.matchedProductId },
      select: { id: true, name: true, retailPrice: true, wholesalePrice: true, distributorPrice: true },
    })
    confidence = matched ? 1 : 0
  }
  if (!matched) {
    const auto = await matchCatalogPrice(batch.productName)
    if (auto) {
      matched = auto.product
      confidence = auto.confidence
    }
  }

  const tiers: TierResult[] = []
  if (matched) {
    const tierPrices: [string, number][] = [
      ["retail", matched.retailPrice],
      ["wholesale", matched.wholesalePrice],
      ["distributor", matched.distributorPrice],
    ]
    for (const [tier, sellingPrice] of tierPrices) {
      const margin = +(sellingPrice - costPerUnit).toFixed(2)
      const marginPct = sellingPrice > 0 ? +((margin / sellingPrice) * 100).toFixed(1) : 0
      tiers.push({
        tier,
        sellingPrice,
        margin,
        marginPct,
        verdict: margin > 0 ? "profit" : margin < 0 ? "loss" : "breakeven",
      })
    }
  }

  // Rule-based warnings — the "intelligent" flags.
  const warnings: string[] = []
  if (units === 0) warnings.push("No finished-unit count yet — cost per unit can't be computed.")
  if (!matched) warnings.push("No matching website product found — link one to see profit/loss.")
  if (matched && confidence < 0.5 && !batch.matchedProductId)
    warnings.push(`Low-confidence name match (${Math.round(confidence * 100)}%) — confirm or override the product.`)
  const est = batch.bulkRequest?.estimatedTotalCost ?? 0
  if (est > 0 && totalCost > est * 1.15)
    warnings.push(`Actual cost (${totalCost}) is ${Math.round((totalCost / est - 1) * 100)}% over the estimate (${est}).`)
  if (totalCost > 0 && dispatch / totalCost > 0.3)
    warnings.push(`Transport is ${Math.round((dispatch / totalCost) * 100)}% of total cost — unusually high.`)
  const delivered = batch.inspection?.quantityDelivered ?? 0
  const rejected = batch.inspection?.quantityRejected ?? 0
  if (delivered > 0 && rejected / delivered > 0.1)
    warnings.push(`${Math.round((rejected / delivered) * 100)}% of inspected material was rejected.`)
  if ((batch.receiving?.variance ?? 0) !== 0)
    warnings.push(`Receiving variance of ${batch.receiving?.variance} units recorded.`)
  if (tiers.some((t) => t.verdict === "loss"))
    warnings.push("Selling at a LOSS on at least one tier at the current cost.")

  return {
    totalCost,
    costBreakdown: { harvest, production, dispatch },
    units,
    costPerUnit,
    matchedProductId: matched?.id ?? null,
    matchedProductName: matched?.name ?? null,
    matchConfidence: confidence,
    tiers,
    warnings,
    reconcilable: units > 0 && !!matched,
  }
}
