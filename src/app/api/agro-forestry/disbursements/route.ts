import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"

const VIEW_ROLES = ["admin", "it_specialist", "assistant_ceo"]
const PAGE_SIZE = 50

// The source schema stores this as free text; every mirrored row uses one of
// these two words, so the form sticks to them rather than inventing a third.
const SEEDLINGS_ITEM = "SEEDLINGS"

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

// Record a seedling handover: one ItemDisbursement plus a DisbursedSeedling row
// per species given out. Written in a single transaction so a handover is never
// half-recorded — the parent row without its lines would read as "nothing was
// given" on every count in this board.
//
// A species that isn't in the reference list yet is created on the spot (the
// list is short and field teams meet new species), matched case-insensitively
// so "Mukau" and "mukau" don't become two species.
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 })

  const txt = (v: unknown) => (typeof v === "string" ? v.trim() : "")
  const farmerId = Number(body.farmerId) || 0
  const centre = txt(body.disbursementCentre)
  const disbursedBy = txt(body.disbursedBy) || txt((auth.token as { name?: string }).name)

  if (!farmerId) return NextResponse.json({ error: "Choose the farmer receiving the seedlings." }, { status: 400 })
  if (!centre) return NextResponse.json({ error: "Disbursement centre is required." }, { status: 400 })
  if (!disbursedBy) return NextResponse.json({ error: "Who disbursed the seedlings?" }, { status: 400 })

  const date = body.disbursementDate ? new Date(body.disbursementDate) : new Date()
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "That disbursement date could not be read." }, { status: 400 })
  }

  // Lines: { seedlingId? , species?, quantity }. Merge duplicates so one species
  // listed twice becomes a single row with the combined quantity.
  const merged = new Map<string, { seedlingId: number; species: string; quantity: number }>()
  const rawLines = Array.isArray(body.lines) ? body.lines : []
  for (const raw of rawLines) {
    const quantity = Math.trunc(Number((raw as { quantity?: unknown }).quantity) || 0)
    const seedlingId = Number((raw as { seedlingId?: unknown }).seedlingId) || 0
    const species = txt((raw as { species?: unknown }).species)
    if (quantity <= 0) continue
    if (!seedlingId && !species) continue
    const key = seedlingId ? `id:${seedlingId}` : `name:${species.toLowerCase()}`
    const prev = merged.get(key)
    merged.set(key, { seedlingId, species, quantity: (prev?.quantity ?? 0) + quantity })
  }
  if (merged.size === 0) {
    return NextResponse.json({ error: "Add at least one species with a quantity." }, { status: 400 })
  }

  const farmer = await prisma.farmer.findUnique({ where: { id: farmerId }, select: { id: true, fullname: true } })
  if (!farmer) return NextResponse.json({ error: "That farmer is no longer in the register." }, { status: 404 })

  try {
    const disbursement = await prisma.$transaction(async (tx) => {
      const lines: { seedlingId: number; quantity: number }[] = []
      for (const line of merged.values()) {
        let id = line.seedlingId
        if (!id) {
          const existing = await tx.seedlings.findFirst({
            where: { seedlingSpicies: { equals: line.species, mode: "insensitive" } },
            select: { id: true },
          })
          id = existing?.id ?? (await tx.seedlings.create({ data: { seedlingSpicies: line.species }, select: { id: true } })).id
        }
        lines.push({ seedlingId: id, quantity: line.quantity })
      }

      return tx.itemDisbursement.create({
        data: {
          farmerId,
          disbursedBy,
          itemDisbursed: SEEDLINGS_ITEM,
          disbursementCentre: centre,
          disbursementDate: date,
          seedlings: { create: lines },
        },
        include: {
          farmer: { select: { id: true, fullname: true, county: true, phoneNumber: true } },
          seedlings: { select: { id: true, quantity: true, seedling: { select: { id: true, seedlingSpicies: true } } } },
        },
      })
    })

    return NextResponse.json(
      {
        ...disbursement,
        beehiveCount: 0,
        seedlingCount: disbursement.seedlings.reduce((n, s) => n + s.quantity, 0),
      },
      { status: 201 }
    )
  } catch (e) {
    console.error("Seedling disbursement failed:", e)
    return NextResponse.json({ error: "Could not record the disbursement. Please try again." }, { status: 500 })
  }
}
