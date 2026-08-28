// Applies prisma/migrate-wave3.sql — office attendance + leave requests.
// Idempotent and non-destructive (CREATE ... IF NOT EXISTS, ENABLE RLS only),
// so it is safe to re-run.
//
//   node scripts/apply-wave3.mjs
//
// Needs DATABASE_URL/DIRECT_URL in the environment. If you don't have those to
// hand, paste prisma/migrate-wave3.sql into the Supabase SQL editor instead —
// it is the same statements.
import { PrismaClient } from "@prisma/client"
import { readFileSync } from "fs"

const prisma = new PrismaClient()

const statements = readFileSync(new URL("../prisma/migrate-wave3.sql", import.meta.url), "utf8")
  .split(/;\s*(?:\n|$)/)
  .map((s) => s.replace(/--.*$/gm, "").trim())
  .filter(Boolean)

let ok = 0, fail = 0
for (const sql of statements) {
  try { await prisma.$executeRawUnsafe(sql); ok++ }
  catch (e) { fail++; console.error("FAIL:", sql.slice(0, 70).replace(/\s+/g, " "), "→", e.message) }
}
console.log(`Done. ${ok} statements applied, ${fail} failed.`)
await prisma.$disconnect()
