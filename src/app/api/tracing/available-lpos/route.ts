import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"

// Returns approved LPOs that have not yet been linked to a tracing batch.
// Accessible to factory_manager (who picks the LPO) and admin.
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["factory_manager", "admin", "it_specialist"])
  if (auth instanceof NextResponse) return auth

  try {
    const rows = await prisma.$queryRaw<{
      id: string
      number: string
      supplierName: string
      items: unknown
      total: number
    }[]>`
      SELECT l.id, l.number, l."supplierName", l.items, l.total
      FROM "Lpo" l
      WHERE l.status = 'approved'
        AND l.id NOT IN (
          SELECT "lpoId" FROM "Batch" WHERE "lpoId" IS NOT NULL
        )
      ORDER BY l."createdAt" DESC
    `
    return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } })
  } catch (e) {
    console.error("available-lpos fetch failed:", e)
    return NextResponse.json([], { headers: { "Cache-Control": "no-store" } })
  }
}
