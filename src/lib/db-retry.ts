// Transient-failure handling for raw Postgres reads.
//
// This instance's connection pool times out under concurrent admin-page load,
// and several routes read raw columns that aren't in the Prisma schema. Those
// reads were wrapped in bare `catch {}` blocks written for a different problem
// — "these columns don't exist yet, pre-migration" — so a timeout silently
// produced invented data (see the Lpo status columns) and the client got a 200
// it had no way to recognise as wrong.
//
// The two cases need telling apart:
//   * missing column/table — permanent. The caller's pre-migration fallback is
//     the right answer.
//   * timeout / connection / pool exhaustion — transient. Retry, then report a
//     failure so the client can show its "couldn't load, retry" state.

const PG_UNDEFINED_COLUMN = "42703"
const PG_UNDEFINED_TABLE = "42P01"

/**
 * The underlying Postgres error code, if there is one. Prisma wraps raw-query
 * failures in a known request error (P2010) and keeps the driver's code on
 * `meta.code`, so check both that and a plain `code` from the driver itself.
 */
export function pgErrorCode(e: unknown): string | undefined {
  const err = e as { code?: unknown; meta?: { code?: unknown } } | null
  const metaCode = err?.meta?.code
  if (typeof metaCode === "string") return metaCode
  return typeof err?.code === "string" ? err.code : undefined
}

/** True when the schema genuinely lacks the column/table being selected. */
export function isMissingSchema(e: unknown): boolean {
  const code = pgErrorCode(e)
  return code === PG_UNDEFINED_COLUMN || code === PG_UNDEFINED_TABLE
}

/**
 * Run a query, retrying once after a short pause if it fails for a transient
 * reason. A missing column/table is rethrown immediately — retrying a schema
 * mismatch only doubles the latency before the same answer.
 */
export async function withRetry<T>(run: () => Promise<T>, label: string): Promise<T> {
  try {
    return await run()
  } catch (e) {
    if (isMissingSchema(e)) throw e
    console.warn(`[db] ${label} failed, retrying once:`, pgErrorCode(e) ?? e)
    await new Promise((r) => setTimeout(r, 200))
    return await run()
  }
}
