import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  if (path === "/admin/login" || path.startsWith("/api/") || path.startsWith("/_next/")) {
    return NextResponse.next()
  }
  
  if (path.startsWith("/admin")) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }
    // Pages every signed-in role may reach (self-service + messaging).
    const role = (token as { role?: string }).role
    const COMMON = path.startsWith("/admin/account") || path.startsWith("/admin/chat")

    // Cashiers are sell-only: confine them to the POS till. Any other /admin
    // page (dashboard, products, customers, settings) bounces back to /admin/pos.
    if (role === "cashier" && !path.startsWith("/admin/pos") && !COMMON) {
      return NextResponse.redirect(new URL("/admin/pos", request.url))
    }
    // The 9 product-tracing roles only get the tracing pipeline (+ chat/account)
    // — every other /admin page bounces back to /admin/tracing.
    const TRACING_ROLES = [
      "factory_manager", "executive", "procurement_officer", "quality_inspector",
      "requisition_officer", "agribusiness_manager", "production_officer",
      "dispatch_officer", "receiving_officer",
    ]
    const DOC_ROLES = ["procurement_officer", "executive"]
    const canDoc = role && DOC_ROLES.includes(role)
    // factory_manager may view approved LPOs (read-only) so they can pick one when starting a batch
    const canLpoView = role === "factory_manager" && path.startsWith("/admin/lpo")
    const docPath = path.startsWith("/admin/lpo") || path.startsWith("/admin/invoicing")
    if (role && TRACING_ROLES.includes(role) && !path.startsWith("/admin/tracing") && !(canDoc && docPath) && !canLpoView && !COMMON) {
      return NextResponse.redirect(new URL("/admin/tracing", request.url))
    }
  }

  return NextResponse.next()
}

export const config = { matcher: ["/admin/:path*"] }
