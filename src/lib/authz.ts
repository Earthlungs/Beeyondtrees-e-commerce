import { NextRequest, NextResponse } from "next/server"
import { getToken, type JWT } from "next-auth/jwt"

// Full-control roles. `admin` is the CEO (label-only rename). `it_specialist`
// (IT dashboard, provisions all staff) is a superset of admin. `assistant_ceo`
// has "all rights as CEO" per the 2026 restructure — same dashboards, cost
// visibility, and approval authority — so it is admin-equivalent here too. Use
// this instead of bare `role === "admin"` checks.
//   The ONE place assistant_ceo differs from admin is approvals: when an
// assistant_ceo approves, it is recorded as "on behalf" and the CEO is notified
// (see isAssistantCeo + the LPO/stage approval handlers). Everywhere else they
// are interchangeable.
export const ADMINISH_ROLES = ["admin", "it_specialist", "assistant_ceo"] as const

export function isAdminish(role: string | undefined | null): boolean {
  return role === "admin" || role === "it_specialist" || role === "assistant_ceo"
}

// True only for the Assistant CEO — used to tag CEO approvals done "on behalf"
// and notify the real CEO's dashboard.
export function isAssistantCeo(role: string | undefined | null): boolean {
  return role === "assistant_ceo"
}

// Identity of the signed-in staff member behind an API call.
export interface Actor {
  id: string
  name: string
  email: string | null
  role: string
}

// Guard for routes any signed-in staff member may use (attendance punches,
// applying for leave). Returns a 401 NextResponse to bail early, or the actor.
// Use: `if (a instanceof NextResponse) return a`.
export async function requireUser(request: NextRequest): Promise<NextResponse | Actor> {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const t = token as { sub?: string; id?: string; name?: string; email?: string; role?: string }
  const id = t.sub ?? t.id
  // A revoked/deactivated account has its role nulled by the jwt callback.
  if (!id || !t.role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return { id, name: t.name ?? "Unknown", email: t.email ?? null, role: t.role }
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
