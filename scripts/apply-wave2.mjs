// Applies wave-2 additive schema + RLS via Prisma raw SQL. Idempotent and
// non-destructive (ADD COLUMN / CREATE TABLE IF NOT EXISTS; ENABLE RLS only).
//   node scripts/apply-wave2.mjs
import { PrismaClient } from "@prisma/client"
import { readFileSync } from "fs"

const prisma = new PrismaClient()

function statements(file) {
  return readFileSync(new URL(`../prisma/${file}`, import.meta.url), "utf8")
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.replace(/--.*$/gm, "").trim())
    .filter((s) => s && !/^DO \$\$/i.test(s)) // skip the DO-block; we enable RLS explicitly below
}

const RLS_TABLES = [
  "User", "Product", "Order", "OrderItem", "Dispatch", "Invoice", "Lpo",
  "Batch", "BulkRequest", "Approval", "Sourcing", "Inspection", "Requisition",
  "Issuance", "Production", "BatchDispatch", "Receiving", "Message",
]

let ok = 0, fail = 0
for (const sql of statements("migrate-wave2.sql")) {
  try { await prisma.$executeRawUnsafe(sql); ok++ }
  catch (e) { fail++; console.error("FAIL:", sql.slice(0, 60), "→", e.message) }
}
for (const t of RLS_TABLES) {
  try { await prisma.$executeRawUnsafe(`ALTER TABLE IF EXISTS public."${t}" ENABLE ROW LEVEL SECURITY;`); ok++ }
  catch (e) { fail++; console.error("RLS FAIL:", t, "→", e.message) }
}
console.log(`Done. ${ok} statements applied, ${fail} failed.`)
await prisma.$disconnect()
