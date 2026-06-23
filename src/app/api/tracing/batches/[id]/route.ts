import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole, isAdminish } from "@/lib/authz"
import { TRACING_ROLES, COST_FIELDS } from "@/lib/tracing"

const VIEW_ROLES = [...TRACING_ROLES, "admin", "it_specialist", "assistant_ceo"]

// Remove every cost-bearing field from a stage record so non-admins never
// receive cost data (defense-in-depth — the UI also hides it).
function redactCosts<T>(record: T): T {
  if (!record || typeof record !== "object") return record
  const out = { ...(record as Record<string, unknown>) }
  for (const k of Object.keys(out)) if (COST_FIELDS.has(k)) delete out[k]
  return out as T
}

// Full batch with every stage record — drives the stepper detail page.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth
  const { id } = await params

  const batch = await prisma.batch.findUnique({
    where: { id },
    include: {
      bulkRequest: true,
      approval: true,
      sourcing: true,
      inspection: true,
      requisitions: { orderBy: { createdAt: "asc" } },
      issuance: true,
      production: true,
      dispatch: true,
      receiving: true,
    },
  })
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Non-admins see the process but not any cost figure.
  if (!isAdminish((auth.token as { role?: string }).role)) {
    batch.bulkRequest = redactCosts(batch.bulkRequest)
    batch.sourcing = redactCosts(batch.sourcing)
    batch.production = redactCosts(batch.production)
    batch.dispatch = redactCosts(batch.dispatch)
  }

  // Raw columns (origin + LPO creator) for the origin badge and the receiving
  // gate ("whoever created the LPO receives the goods").
  let extra: { origin: string | null; lpoCreatedByName: string | null; lpoCreatedByUserId: string | null } = { origin: null, lpoCreatedByName: null, lpoCreatedByUserId: null }
  try {
    const rows = await prisma.$queryRaw<typeof extra[]>`
      SELECT "origin", "lpoCreatedByName", "lpoCreatedByUserId" FROM "Batch" WHERE id = ${id}
    `
    if (rows[0]) extra = rows[0]
  } catch { /* columns not present yet */ }

  return NextResponse.json({ ...batch, ...extra }, { headers: { "Cache-Control": "no-store" } })
}
