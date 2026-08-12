import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"

const VIEW_ROLES = ["admin", "it_specialist", "assistant_ceo"]
const PAGE_SIZE = 50

// Paged handover log, newest first. `farmerId` narrows it to one farmer (used
// by the farmer drawer); otherwise it is the whole disbursement history.
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const sp = request.nextUrl.searchParams
  const farmerId = Number(sp.get("farmerId")) || 0
  const centre = sp.get("centre")?.trim() ?? ""
  const page = Math.max(1, Number(sp.get("page")) || 1)

  const where = {
    ...(farmerId ? { farmerId } : {}),
    ...(centre ? { disbursementCentre: centre } : {}),
  }

  const [total, rows] = await Promise.all([
    prisma.itemDisbursement.count({ where }),
    prisma.itemDisbursement.findMany({
      where,
      orderBy: { disbursementDate: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        farmer: { select: { id: true, fullname: true, county: true, phoneNumber: true } },
        beehives: { select: { id: true, beehive: { select: { id: true, beehiveId: true, beehiveType: true } } } },
        seedlings: { select: { id: true, quantity: true, seedling: { select: { id: true, seedlingSpicies: true } } } },
      },
    }),
  ])

  return NextResponse.json(
    {
      rows: rows.map((d) => ({
        ...d,
        beehiveCount: d.beehives.length,
        seedlingCount: d.seedlings.reduce((n, s) => n + s.quantity, 0),
      })),
      total,
      page,
      pageSize: PAGE_SIZE,
      pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}
