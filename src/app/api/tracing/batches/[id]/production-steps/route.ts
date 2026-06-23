import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"
import { TRACING_ROLES, STAGE_ROLES } from "@/lib/tracing"

// Read access: anyone who can see the board. Write access: the production stage
// owner (production_officer) or CEO-level.
const VIEW_ROLES = [...TRACING_ROLES, "admin", "it_specialist", "assistant_ceo"]
const WRITE_ROLES = [STAGE_ROLES.production, "admin", "assistant_ceo", "it_specialist"]

interface StepRow {
  id: string
  batchId: string
  label: string
  note: string | null
  percent: number
  images: unknown
  createdBy: string | null
  createdAt: Date
}

async function fetchSteps(batchId: string): Promise<StepRow[]> {
  try {
    return await prisma.$queryRaw<StepRow[]>`
      SELECT id, "batchId", label, note, percent, images, "createdBy", "createdAt"
      FROM "ProductionStep" WHERE "batchId" = ${batchId} ORDER BY "createdAt" ASC
    `
  } catch { return [] }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const steps = await fetchSteps(id)
  const percentComplete = steps.length ? Math.max(...steps.map((s) => s.percent || 0)) : 0
  return NextResponse.json({ steps, percentComplete }, { headers: { "Cache-Control": "no-store" } })
}

// Log one production sub-step (e.g. "Cutting", "Weaving", "Finishing") with a
// completion percentage and photo evidence. The production officer searches for
// the batch (which is sitting at the production stage, fed from issuance) and
// records progress; other board users watch it graphically.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, WRITE_ROLES)
  if (auth instanceof NextResponse) return auth
  const { id } = await params

  const batch = await prisma.batch.findUnique({ where: { id }, select: { stage: true, status: true } })
  if (!batch) return NextResponse.json({ error: "Batch not found." }, { status: 404 })
  if (batch.status !== "in_progress" || batch.stage !== "production") {
    return NextResponse.json({ error: `Production steps can only be logged while the batch is at the production stage (currently "${batch.stage}").` }, { status: 409 })
  }

  const body = await request.json().catch(() => null)
  const label = typeof body?.label === "string" ? body.label.trim() : ""
  if (!label) return NextResponse.json({ error: "A step label is required (e.g. Cutting, Weaving)." }, { status: 400 })
  const note = typeof body?.note === "string" ? body.note.trim() || null : null
  let percent = Math.round(Number(body?.percent) || 0)
  percent = Math.max(0, Math.min(100, percent))
  const images = Array.isArray(body?.images) ? body.images : []
  const createdBy = (auth.token as { name?: string }).name || "Production Officer"

  try {
    await prisma.$executeRaw`
      INSERT INTO "ProductionStep" ("id", "batchId", "label", "note", "percent", "images", "createdBy", "createdAt")
      VALUES (${randomUUID()}, ${id}, ${label}, ${note}, ${percent}, ${JSON.stringify(images)}::jsonb, ${createdBy}, ${new Date()})
    `
  } catch (e) {
    console.error("[production-step] insert failed:", e)
    return NextResponse.json({ error: "Could not save the production step." }, { status: 500 })
  }

  const steps = await fetchSteps(id)
  const percentComplete = steps.length ? Math.max(...steps.map((s) => s.percent || 0)) : 0
  return NextResponse.json({ steps, percentComplete }, { status: 201 })
}
