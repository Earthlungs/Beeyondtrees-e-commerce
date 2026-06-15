import { NextRequest, NextResponse } from "next/server"
import { getToken, type JWT } from "next-auth/jwt"

// Full-control roles. `it_specialist` (IT dashboard, provisions all staff) is a
// superset of `admin` — anywhere admin is allowed, IT is too. Use this instead
// of bare `role === "admin"` checks so IT keeps full control of the system.
export function isAdminish(role: string | undefined | null): boolean {
  return role === "admin" || role === "it_specialist"
}

// Role guard for admin API routes. proxy.ts lets /api/* through, so handlers
// verify the NextAuth token themselves. Returns a NextResponse to bail early
// (401/403), or { token } on success. Use: `if (a instanceof NextResponse) return a`.
export async function requireRole(
  request: NextRequest,
  allowed: string[]
): Promise<NextResponse | { token: JWT }> {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = (token as { role?: string }).role ?? "merchant"
  if (!allowed.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  return { token }
}
