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

// One role owns each stage. `admin` may act on any stage.
export const STAGE_ROLES: Record<Stage, string> = {
  bulk_request: "factory_manager",
  approval: "executive",
  sourcing: "procurement_officer",
  inspection: "quality_inspector",
  requisition: "requisition_officer",
  issuance: "agribusiness_manager",
  production: "production_officer",
  dispatch: "dispatch_officer",
  receiving: "receiving_officer",
}

// The 9 pipeline roles (nav/proxy confinement + the users dropdown).
export const TRACING_ROLES = Object.values(STAGE_ROLES)

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
  admin: "Admin",
  it_specialist: "IT Specialist",
  merchant: "Merchant",
  cashier: "Cashier",
  factory_manager: "Factory Manager",
  executive: "Executive",
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
