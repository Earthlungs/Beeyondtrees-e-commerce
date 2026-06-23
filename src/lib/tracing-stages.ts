// Pure, dependency-free constants for the traceability pipeline. Kept separate
// from lib/tracing.ts (which imports prisma/next-auth) so client components can
// import the stage metadata without pulling server code into the bundle.

export const STAGES = [
  "bulk_request",
  "approval",
  "sourcing",
  "inspection",
  "requisition",
  "issuance",
  "production",
  "dispatch",
  "receiving",
] as const

export type Stage = (typeof STAGES)[number]

// One role owns each stage. `admin` (CEO) may act on any stage.
// NOTE (2026 restructure): stages were consolidated onto fewer owners —
//  · sourcing is owned by `factory_procurement` (NEW pipeline role). The legacy
//    `procurement_officer` is NOT in the pipeline — it only raises INTERNAL LPOs
//    (+ POS + invoicing), then its job is done once the LPO enters the pipeline.
//  · inspection, dispatch moved onto agribusiness_manager (one owner does
//    inspection → issuance → dispatch)
//  · requisition moved from requisition_officer → production_officer
//  · approval (this batch stage) is owned by `executive` (now "Factory Admin").
//    The full LPO sign-off chain happens BEFORE the pipeline, on the LPO document:
//      internal LPO  : procurement_officer → Factory Admin (executive) → CEO (admin)
//      external LPO  : external_procurement → Chief → CEO (admin)
//    Finance is notified on CEO approval. See src/app/api/lpos/[id]/route.ts.
//  · receiving is owned by `receiving_officer` as a FALLBACK, but the strict
//    rule is "whoever created the LPO receives the goods" — that dynamic gate is
//    enforced in requireStage (src/lib/tracing.ts) against Lpo.createdByUserId.
// The roles that no longer own a stage (quality_inspector, requisition_officer,
// dispatch_officer, receiving_officer) are kept as login/staff roles.
export const STAGE_ROLES: Record<Stage, string> = {
  bulk_request: "factory_manager",
  approval: "executive",
  sourcing: "factory_procurement",
  inspection: "agribusiness_manager",
  requisition: "production_officer",
  issuance: "agribusiness_manager",
  production: "production_officer",
  dispatch: "agribusiness_manager",
  receiving: "receiving_officer",
}

// Roles that get tracing-board access (nav/proxy confinement + users dropdown).
// Explicit list (not derived) because several stages share an owner and because
// the two LPO originators (procurement_officer / external_procurement) get a
// LIMITED board so they can RECEIVE their own LPO's goods — see LIMITED_BOARD_STAGES.
export const TRACING_ROLES = [
  "factory_manager", "executive", "agribusiness_manager", "production_officer",
  "factory_procurement", "external_procurement", "procurement_officer",
]

// Roles that may originate an LPO and the origin tag their LPOs get.
//   procurement_officer  → "internal"  (Beeyond Trees)
//   external_procurement → "external"  (Bamboosa, co-branded)
export const LPO_ORIGINATOR_ROLES = ["procurement_officer", "external_procurement"]

// Some board roles only see a subset of stages. The two LPO originators are not
// pipeline actors — they appear on the board ONLY to receive (and, for the
// external partner, to watch the back end of the pipeline).
export const LIMITED_BOARD_STAGES: Record<string, Stage[]> = {
  external_procurement: ["production", "dispatch", "receiving"],
  procurement_officer: ["receiving"],
}

export const STAGE_LABELS: Record<Stage, string> = {
  bulk_request: "Bulk Request",
  approval: "Approval",
  sourcing: "Sourcing",
  inspection: "Inspection",
  requisition: "Requisition",
  issuance: "Issuance",
  production: "Production",
  dispatch: "Dispatch",
  receiving: "Receiving",
}

export const ROLE_LABELS: Record<string, string> = {
  // Leadership — label-only renames (the stored role STRINGS stay `admin` /
  // `executive` so login, /admin gating, and cost visibility never break).
  admin: "CEO",
  executive: "Factory Admin",
  it_specialist: "IT Specialist",
  merchant: "Merchant",
  cashier: "Cashier",
  factory_manager: "Factory Manager",
  // New roles from the 2026 restructure / Bamboosa fusion.
  factory_procurement: "Factory Procurement",
  external_procurement: "External Procurement",
  chief: "Chief",
  assistant_ceo: "Assistant CEO",
  finance: "Finance",
  procurement_officer: "Procurement Officer",
  quality_inspector: "Quality Inspector",
  requisition_officer: "Requisition Officer",
  agribusiness_manager: "Agribusiness Manager",
  production_officer: "Production Officer",
  dispatch_officer: "Dispatch Officer",
  receiving_officer: "Receiving Officer",
  // Extended staff roles
  technician: "Technician",
  engineering: "Engineering",
  motorcycle_rider: "Motorcycle Rider",
  assistant_administrator: "Assistant Administrator",
  fiber_extractor: "Fiber Extractor",
  pottery: "Pottery",
  technical_superintendent: "Technical Superintendent",
  building_construction: "Building & Construction",
  bamboo_weaver: "Bamboo Weaver",
  assistant_bamboo_tech: "Assistant Bamboo Tech",
  ttgf: "TTGF",
  farm_foreman: "Farm Foreman",
  nursery: "Nursery",
  shop_attendant: "Shop Attendant",
  fiber_weaver: "Fiber Weaver",
  glass_technician: "Glass Technician",
  driver: "Driver",
}

// Cost-bearing fields across the pipeline. Only `admin`/`it_specialist` may see
// any cost or the profit/loss reconciliation — every other role sees the process
// but these fields are redacted (server strips them; client shows NOT_ALLOWED).
export const COST_FIELDS = new Set([
  "estimatedUnitCost", "estimatedTotalCost", "laborCost", "transportCost",
  "otherCosts", "totalHarvestCost", "unitCost", "totalCost",
])

export const NOT_ALLOWED = "You are not allowed to view this detail"

// Client-safe CEO-level check. Mirrors authz.isAdminish() (which is server-only
// because it imports next/server) so client components can gate admin UI without
// pulling server code. `admin` = CEO, plus IT and Assistant CEO (all CEO rights).
export function isAdminishRole(role: string | undefined | null): boolean {
  return role === "admin" || role === "it_specialist" || role === "assistant_ceo"
}

export function isStage(v: unknown): v is Stage {
  return typeof v === "string" && (STAGES as readonly string[]).includes(v)
}

export function stageIndex(stage: string): number {
  return (STAGES as readonly string[]).indexOf(stage)
}

// Advance to the next stage; null when the last stage clears (→ completed).
export function nextStage(stage: Stage): Stage | null {
  const i = stageIndex(stage)
  return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1] : null
}
