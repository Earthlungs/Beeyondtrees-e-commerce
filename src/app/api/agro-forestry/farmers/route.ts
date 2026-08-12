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

// Register a farmer directly in this system (the onboarding form), as opposed
// to importing one from the EarthLungs source. Same table either way — an
// imported farmer and a locally-registered one are indistinguishable, which is
// deliberate: this is one register, not two.
//
// Ids are left to the SERIAL sequence. The import realigns that sequence past
// the highest imported id, so locally-created rows continue from there and
// cannot collide with a later re-import.
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 })

  // Trim on the way in, exactly as the importer does — otherwise the form
  // quietly reintroduces the whitespace mess the import cleaned up.
  const txt = (v: unknown) => (typeof v === "string" ? v.trim() : "")
  const opt = (v: unknown) => txt(v) || null

  const fullname = txt(body.fullname)
  const gender = txt(body.gender)
  const county = txt(body.county)
  const projectType = txt(body.projectType)
  const landOwnershipType = txt(body.landOwnershipType)
  const idNumber = txt(body.idNumber)

  const missing = Object.entries({
    "full name": fullname, gender, county,
    "project type": projectType, "land ownership": landOwnershipType, "ID number": idNumber,
  })
    .filter(([, v]) => !v)
    .map(([k]) => k)
  if (missing.length) {
    return NextResponse.json({ error: `Please fill in: ${missing.join(", ")}.` }, { status: 400 })
  }

  const acresRaw = body.numberOfAcresCommitted
  let acres: number | null = null
  if (acresRaw !== undefined && acresRaw !== null && acresRaw !== "") {
    const n = Number(acresRaw)
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: "Acres committed must be a positive number." }, { status: 400 })
    }
    acres = n
  }

  const email = opt(body.email)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "That email address does not look right." }, { status: 400 })
  }

  // The source schema has no unique constraint on id_number, so this is a guard
  // rather than a DB rule: catching a double-registration at the point of entry
  // is far cheaper than merging two farmer records later. `force` lets a genuine
  // duplicate through when the operator confirms it.
  if (!body.force) {
    const clash = await prisma.farmer.findFirst({
      where: { idNumber },
      select: { id: true, fullname: true, county: true },
    })
    if (clash) {
      return NextResponse.json(
        {
          error: `ID number ${idNumber} is already registered to ${clash.fullname} (${clash.county}).`,
          duplicate: clash,
        },
        { status: 409 }
      )
    }
  }

  try {
    const farmer = await prisma.farmer.create({
      data: {
        fullname, gender, county, projectType, landOwnershipType, idNumber,
        group: opt(body.group),
        email,
        phoneNumber: opt(body.phoneNumber),
        subCounty: opt(body.subCounty),
        numberOfAcresCommitted: acres,
      },
    })
    return NextResponse.json(farmer, { status: 201 })
  } catch (e) {
    console.error("Farmer registration failed:", e)
    return NextResponse.json({ error: "Could not register the farmer. Please try again." }, { status: 500 })
  }
}
