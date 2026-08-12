import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"

const VIEW_ROLES = ["admin", "it_specialist", "assistant_ceo"]
const PAGE_SIZE = 50

// Paged farmer register with a free-text search over the fields staff actually
// look people up by (name, ID number, phone, group) plus county / project-type
// facets. Each row carries rolled-up disbursement totals so the table can show
// "what has this farmer actually received" without an N+1 per row.
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const sp = request.nextUrl.searchParams
  const q = sp.get("q")?.trim() ?? ""
  const county = sp.get("county")?.trim() ?? ""
  const projectType = sp.get("projectType")?.trim() ?? ""
  const page = Math.max(1, Number(sp.get("page")) || 1)

  const where = {
    ...(county ? { county: { equals: county, mode: "insensitive" as const } } : {}),
    // Case-insensitive so the folded facet from /summary (see the comment
    // there) still selects every spelling variant in the source data.
    ...(projectType ? { projectType: { equals: projectType, mode: "insensitive" as const } } : {}),
    ...(q
      ? {
          OR: [
            { fullname: { contains: q, mode: "insensitive" as const } },
            { idNumber: { contains: q, mode: "insensitive" as const } },
            { phoneNumber: { contains: q, mode: "insensitive" as const } },
            { group: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }

  const [total, farmers] = await Promise.all([
    prisma.farmer.count({ where }),
    prisma.farmer.findMany({
      where,
      orderBy: { fullname: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        disbursements: {
          select: {
            id: true,
            _count: { select: { beehives: true } },
            seedlings: { select: { quantity: true } },
          },
        },
      },
    }),
  ])

  const rows = farmers.map(({ disbursements, ...f }) => ({
    ...f,
    disbursementCount: disbursements.length,
    beehivesReceived: disbursements.reduce((n, d) => n + d._count.beehives, 0),
    seedlingsReceived: disbursements.reduce(
      (n, d) => n + d.seedlings.reduce((s, x) => s + x.quantity, 0),
      0
    ),
  }))

  return NextResponse.json(
    { rows, total, page, pageSize: PAGE_SIZE, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) },
    { headers: { "Cache-Control": "no-store" } }
  )
}
