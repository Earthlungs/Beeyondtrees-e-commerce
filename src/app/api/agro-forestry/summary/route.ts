import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"

const VIEW_ROLES = ["admin", "it_specialist", "assistant_ceo"]

// Headline figures for the Agro Forestry board, plus the county /
// project-type facet lists the farmers table filters by. One round of
// aggregates rather than pulling the register down to count it client-side.
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const [farmers, acres, disbursements, beehives, seedlings, byCounty, byProject] =
    await Promise.all([
      prisma.farmer.count(),
      prisma.farmer.aggregate({ _sum: { numberOfAcresCommitted: true } }),
      prisma.itemDisbursement.count(),
      prisma.disbursedBeehive.count(),
      prisma.disbursedSeedling.aggregate({ _sum: { quantity: true } }),
      prisma.farmer.groupBy({ by: ["county"], _count: { _all: true }, orderBy: { county: "asc" } }),
      prisma.farmer.groupBy({ by: ["projectType"], _count: { _all: true }, orderBy: { projectType: "asc" } }),
    ])

  // The source register is hand-entered and inconsistently cased — project_type
  // holds both "AGROFORESTRY" and "Agroforestry", which would otherwise show up
  // as two separate filter options that each hide the other's farmers. Fold
  // them together on a trimmed/uppercased key and label with the tidiest
  // spelling. The stored rows are left exactly as imported; this is display
  // only, and the farmers route matches case-insensitively to suit.
  const merged = new Map<string, { name: string; count: number }>()
  for (const p of byProject) {
    const key = p.projectType.trim().toUpperCase()
    const existing = merged.get(key)
    const label = key.charAt(0) + key.slice(1).toLowerCase()
    if (existing) existing.count += p._count._all
    else merged.set(key, { name: label, count: p._count._all })
  }

  return NextResponse.json(
    {
      farmers,
      acresCommitted: acres._sum.numberOfAcresCommitted ?? 0,
      disbursements,
      beehives,
      seedlings: seedlings._sum.quantity ?? 0,
      counties: byCounty.map((c) => ({ name: c.county, count: c._count._all })),
      projectTypes: [...merged.values()].sort((a, b) => b.count - a.count),
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}
