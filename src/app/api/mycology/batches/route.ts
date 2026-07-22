import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"
import { createNumbered } from "@/lib/docs"
import { nextStage } from "@/lib/mycology-stages"

const VIEW_ROLES = ["fungiculturist", "admin", "it_specialist", "assistant_ceo"]

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const batches = await prisma.mycoBatch.findMany({
    orderBy: { createdAt: "desc" },
    include: { substrate: true, incubation: true, harvest: true, dehydration: true },
  })
  return NextResponse.json(batches, { headers: { "Cache-Control": "no-store" } })
}

// Stage 1 — substrate_prep. fungiculturist (or admin) starts a batch.
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 })

  try {
    const batch = await createNumbered(
      "MYC",
      () => prisma.mycoBatch.count(),
      (code) =>
        prisma.mycoBatch.create({
          data: {
            code,
            stage: nextStage("substrate_prep") ?? "substrate_prep",
            status: "in_progress",
            spawnId: body.spawnId?.trim() || null,
            substrate: {
              create: {
                strawKg: Number(body.strawKg) || 0,
                limeKg: Number(body.limeKg) || 0,
                branKg: Number(body.branKg) || 0,
                cottonSeedCakeKg: Number(body.cottonSeedCakeKg) || 0,
                soakHours: Number(body.soakHours) || 12,
                bagCount: Number(body.bagCount) || 0,
                bagWeightKg: Number(body.bagWeightKg) || 2,
                pasteurizeHours: Number(body.pasteurizeHours) || 4,
                coolHours: Number(body.coolHours) || 4,
                remarks: body.remarks?.trim() || null,
              },
            },
          },
          include: { substrate: true },
        })
    )
    return NextResponse.json(batch, { status: 201 })
  } catch (e) {
    console.error("Myco batch create failed:", e)
    return NextResponse.json({ error: "Could not create the batch. Please try again." }, { status: 500 })
  }
}
