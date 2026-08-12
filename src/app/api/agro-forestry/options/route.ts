import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"

const VIEW_ROLES = ["admin", "it_specialist", "assistant_ceo"]

// Choice lists for the farmer onboarding form, built from what is already in
// the register rather than a hardcoded taxonomy.
//
// Why: the imported records are hand-entered and carry 30 spellings of
// land_ownership_type for roughly 8 real concepts ("Personal ", "personal",
// "Private Land", "individual", "indivudual"…). Free-text inputs would keep
// that growing. Offering the existing values — most-used first — makes reuse
// the path of least resistance without inventing business categories nobody
// asked for. The form still allows a new value via "Other".
//
// Values are returned verbatim (already trimmed at import) so a pick matches
// existing rows exactly and the county/project filters keep working.
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const [counties, subCounties, projectTypes, landTypes, groups] = await Promise.all([
    prisma.farmer.groupBy({ by: ["county"], _count: { _all: true } }),
    prisma.farmer.groupBy({ by: ["subCounty"], _count: { _all: true }, where: { subCounty: { not: null } } }),
    prisma.farmer.groupBy({ by: ["projectType"], _count: { _all: true } }),
    prisma.farmer.groupBy({ by: ["landOwnershipType"], _count: { _all: true } }),
    prisma.farmer.groupBy({ by: ["group"], _count: { _all: true }, where: { group: { not: null } } }),
  ])

  // Most-used first: the common answer should be the easy one to pick.
  const rank = <T extends Record<string, unknown>>(rows: T[], key: keyof T) =>
    rows
      .filter((r) => typeof r[key] === "string" && (r[key] as string).length > 0)
      .sort((a, b) => (b._count as { _all: number })._all - (a._count as { _all: number })._all)
      .map((r) => r[key] as string)

  return NextResponse.json(
    {
      counties: rank(counties, "county"),
      subCounties: rank(subCounties, "subCounty"),
      projectTypes: rank(projectTypes, "projectType"),
      landOwnershipTypes: rank(landTypes, "landOwnershipType"),
      groups: rank(groups, "group"),
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}
