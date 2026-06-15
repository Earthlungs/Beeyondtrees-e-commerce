import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"
import { TRACING_ROLES } from "@/lib/tracing"

const VIEW_ROLES = [...TRACING_ROLES, "admin"]

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
  return NextResponse.json(batch, { headers: { "Cache-Control": "no-store" } })
}
