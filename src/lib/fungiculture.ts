import { NextRequest, NextResponse } from "next/server"
import { getToken, type JWT } from "next-auth/jwt"
import { STAGE_ROLES, type Stage } from "@/lib/fungiculture-stages"

// Pure stage metadata lives in fungiculture-stages.ts (client-safe). Re-export
// it so API routes can import everything from this one module.
export * from "@/lib/fungiculture-stages"

// ── Fungiculture pipeline ───────────────────────────────────────────────────
// A FungiBatch moves through 4 stages IN ORDER. fungiculturist can only act
// when batch.stage === that stage AND status === "in_progress" — the same
// sequential lock as the main Batch traceability pipeline (lib/tracing.ts),
// just without a handoff-email step since every stage shares one role.

export async function requireStage(
  request: NextRequest,
  stage: Stage,
  batch: { id: string; stage: string; status: string }
): Promise<NextResponse | { token: JWT; role: string }> {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = (token as { role?: string }).role ?? "merchant"
  const isCeo = role === "admin" || role === "assistant_ceo"
  const allowed = isCeo || role === STAGE_ROLES[stage]
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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
