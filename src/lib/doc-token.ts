import { createHmac, timingSafeEqual } from "crypto"

// Signed tokens for public (login-free) document links emailed to clients.
// A link is `/doc/<type>/<id>?t=<token>` where token = HMAC(type:id, secret).
// Only someone who received the emailed link can open the document — the id
// alone is not enough, and ids can't be enumerated into valid links.

export type DocType = "invoice" | "lpo" | "receipt"

// NEXTAUTH_SECRET is always set in every environment that runs auth; reuse it so
// there's no extra secret to manage. Fall back keeps local dev from crashing.
const SECRET = process.env.NEXTAUTH_SECRET || "beeyond-doc-share-fallback-secret"

export function signDoc(type: DocType, id: string): string {
  return createHmac("sha256", SECRET).update(`${type}:${id}`).digest("hex").slice(0, 32)
}

export function verifyDoc(type: DocType, id: string, token: string | undefined | null): boolean {
  if (!token) return false
  const expected = signDoc(type, id)
  const a = Buffer.from(expected)
  const b = Buffer.from(token)
  // timingSafeEqual throws on length mismatch — guard first.
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
