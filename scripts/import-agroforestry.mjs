// Copies the Agro Forestry register (farmers + item disbursements) out of the
// EarthLungs reforestation Supabase project and into this app's Postgres.
//
//   SOURCE_SUPABASE_URL=https://<ref>.supabase.co \
//   SOURCE_SUPABASE_KEY=<service_role key> \
//   node scripts/import-agroforestry.mjs [--dry-run]
//
// The ANON key is not enough: the source project has not granted `anon` USAGE
// on schema public (every request comes back 42501 "permission denied for
// schema public"), so this needs the service_role key — or an anon key once
// SELECT policies exist for these six tables.
//
// Rows keep their SOURCE ids, which is why the Prisma models @map to the source
// table/column names: the foreign keys between the six tables then carry over
// untouched, with no id-rewrite pass. Re-running is safe — every write is an
// upsert keyed on that id — and the identity sequences are bumped past the
// highest imported id at the end so app-created rows do not collide.

import { PrismaClient } from "@prisma/client"

const BASE = (process.env.SOURCE_SUPABASE_URL || "").replace(/\/+$/, "")
const KEY = process.env.SOURCE_SUPABASE_KEY || ""
const DRY = process.argv.includes("--dry-run")
const PAGE = 1000

if (!BASE || !KEY) {
  console.error("Set SOURCE_SUPABASE_URL and SOURCE_SUPABASE_KEY (service_role) before running.")
  process.exit(1)
}

const rest = BASE.endsWith("/rest/v1") ? BASE : `${BASE}/rest/v1`
const prisma = new PrismaClient()

// PostgREST caps page size, so walk the table with Range headers until a short
// page comes back. `order=id` keeps the paging stable while we read.
async function fetchAll(table) {
  const out = []
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${rest}/${encodeURIComponent(table)}?select=*&order=id.asc`, {
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        Range: `${from}-${from + PAGE - 1}`,
        "Range-Unit": "items",
      },
    })
    // A range starting past the last row is "no more data", not a failure.
    if (res.status === 416) return out
    if (!res.ok) {
      throw new Error(`GET ${table} [${from}..] → ${res.status} ${await res.text()}`)
    }
    const batch = await res.json()
    out.push(...batch)
    if (batch.length < PAGE) return out
  }
}

const date = (v) => (v ? new Date(v) : new Date())
const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v))
const bool = (v) => v === true || v === "true" || v === "t"

// The source register is hand-entered and carries a lot of stray whitespace —
// trailing newlines on 159 phone numbers and 158 ID numbers, leading/trailing
// spaces on 785 sub-counties and 432 names. That is entry noise, not data: it
// breaks exact lookups and renders as odd gaps. Trimming loses nothing.
//   Note what this deliberately does NOT do: it leaves spelling and casing
// alone ("Personal" vs "personal", "AGROFORESTRY" vs "Agroforestry"). Folding
// those is a judgement about the business meaning of the values and belongs to
// a human, so the UI normalises them for display instead (see the summary route).
const txt = (v) => (v === null || v === undefined ? "" : String(v).trim())
// Nullable text: an all-whitespace value carries no more meaning than NULL.
const str = (v) => txt(v) || null

// Upsert in small batches — one transaction per chunk keeps a mid-run failure
// from leaving a half-written table, without holding one giant transaction open.
async function upsertAll(label, rows, toUpsert, chunk = 200) {
  if (DRY) {
    console.log(`  ${label}: ${rows.length} rows (dry run, nothing written)`)
    return
  }
  for (let i = 0; i < rows.length; i += chunk) {
    await prisma.$transaction(rows.slice(i, i + chunk).map(toUpsert))
    process.stdout.write(`\r  ${label}: ${Math.min(i + chunk, rows.length)}/${rows.length}`)
  }
  console.log(`\r  ${label}: ${rows.length}/${rows.length} done`)
}

// Explicit ids bypass the identity sequence, so realign it or the first
// app-created row collides with an imported one.
async function resyncSequence(table, column = "id") {
  if (DRY) return
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"${table}"', '${column}'),
       GREATEST((SELECT COALESCE(MAX("${column}"), 0) FROM "${table}"), 1))`
  )
}

console.log(`Reading from ${rest}${DRY ? " (dry run)" : ""}\n`)

const [farmers, beehives, seedlings, disbursements, disbBeehives, disbSeedlings] = await Promise.all([
  fetchAll("farmers"),
  fetchAll("Beehive"),
  fetchAll("Seedlings"),
  fetchAll("ItemDisbursement"),
  fetchAll("DisbursedBeehive"),
  fetchAll("DisbursedSeedling"),
])

console.log("Fetched:", {
  farmers: farmers.length,
  Beehive: beehives.length,
  Seedlings: seedlings.length,
  ItemDisbursement: disbursements.length,
  DisbursedBeehive: disbBeehives.length,
  DisbursedSeedling: disbSeedlings.length,
})
console.log("\nWriting (parents first, so the foreign keys always resolve):")

await upsertAll("farmers", farmers, (r) => {
  const data = {
    fullname: txt(r.fullname),
    gender: txt(r.gender),
    group: str(r.group),
    email: str(r.email),
    phoneNumber: str(r.phone_number),
    county: txt(r.county),
    subCounty: str(r.sub_county),
    projectType: txt(r.project_type),
    landOwnershipType: txt(r.land_ownership_type),
    idNumber: txt(r.id_number),
    numberOfAcresCommitted: num(r.number_of_acres_committed),
    createdAt: date(r.createdAt),
    updatedAt: date(r.updatedAt),
  }
  return prisma.farmer.upsert({ where: { id: r.id }, update: data, create: { id: r.id, ...data } })
})

await upsertAll("Beehive", beehives, (r) => {
  const data = {
    beehiveId: txt(r.beehiveId),
    beehiveType: txt(r.beehiveType),
    isColonized: bool(r.isColonized),
    latitude: num(r.latitude),
    longitude: num(r.longitude),
    uploadedEvidenceCount: Number(r.uploadedEvidenceCount ?? 0),
    baitingReportId: num(r.baitingReportId),
    createdAt: date(r.createdAt),
    updatedAt: date(r.updatedAt),
  }
  return prisma.beehive.upsert({ where: { id: r.id }, update: data, create: { id: r.id, ...data } })
})

await upsertAll("Seedlings", seedlings, (r) => {
  const data = { seedlingSpicies: txt(r.seedlingSpicies), createdAt: date(r.createdAt) }
  return prisma.seedlings.upsert({ where: { id: r.id }, update: data, create: { id: r.id, ...data } })
})

// Drop children whose parent never made it across — the source allows a farmer
// to be deleted, and a dangling FK would abort the whole chunk's transaction.
const farmerIds = new Set(farmers.map((f) => f.id))
const keptDisbursements = disbursements.filter((d) => farmerIds.has(d.farmerId))
if (keptDisbursements.length !== disbursements.length) {
  console.log(`  (skipping ${disbursements.length - keptDisbursements.length} disbursements with no matching farmer)`)
}

await upsertAll("ItemDisbursement", keptDisbursements, (r) => {
  const data = {
    disbursedBy: txt(r.disbursedBy),
    itemDisbursed: txt(r.itemDisbursed),
    disbursementCentre: txt(r.disbursementCentre),
    disbursementDate: date(r.disbursementDate),
    farmerId: r.farmerId,
    createdAt: date(r.createdAt),
    updatedAt: date(r.updatedAt),
  }
  return prisma.itemDisbursement.upsert({ where: { id: r.id }, update: data, create: { id: r.id, ...data } })
})

const disbIds = new Set(keptDisbursements.map((d) => d.id))
const beehiveIds = new Set(beehives.map((b) => b.id))
const seedlingIds = new Set(seedlings.map((s) => s.id))

const keptDisbBeehives = disbBeehives.filter((r) => disbIds.has(r.disbursementId) && beehiveIds.has(r.beehiveId))
await upsertAll("DisbursedBeehive", keptDisbBeehives, (r) => {
  const data = { disbursementId: r.disbursementId, beehiveId: r.beehiveId }
  return prisma.disbursedBeehive.upsert({ where: { id: r.id }, update: data, create: { id: r.id, ...data } })
})

// itemDisbursementId is nullable in the source (ON DELETE SET NULL), so an
// orphan here is legitimate data — null it rather than dropping the row.
const keptDisbSeedlings = disbSeedlings.filter((r) => seedlingIds.has(r.seedlingId))
await upsertAll("DisbursedSeedling", keptDisbSeedlings, (r) => {
  const data = {
    quantity: Number(r.quantity ?? 0),
    seedlingId: r.seedlingId,
    itemDisbursementId: disbIds.has(r.itemDisbursementId) ? r.itemDisbursementId : null,
  }
  return prisma.disbursedSeedling.upsert({ where: { id: r.id }, update: data, create: { id: r.id, ...data } })
})

for (const t of ["farmers", "Beehive", "Seedlings", "ItemDisbursement", "DisbursedBeehive", "DisbursedSeedling"]) {
  await resyncSequence(t)
}

console.log("\nImport complete.")
await prisma.$disconnect()
