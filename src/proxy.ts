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
    // Pages every signed-in role may reach (self-service + messaging + the POS
    // till — point-of-sale is now available to EVERY staff member).
    const role = (token as { role?: string }).role
    const COMMON =
      path.startsWith("/admin/account") ||
      path.startsWith("/admin/chat") ||
      path.startsWith("/admin/pos")

    // Cashiers are sell-only: confine them to the POS till. Any other /admin
    // page (dashboard, products, customers, settings) bounces back to /admin/pos.
    if (role === "cashier" && !COMMON) {
      return NextResponse.redirect(new URL("/admin/pos", request.url))
    }
    // The product-tracing roles only get the tracing pipeline (+ POS/chat/account)
    // — every other /admin page bounces back to /admin/tracing. procurement_officer
    // and external_procurement get a LIMITED board (receiving / back-end stages) so
    // the LPO creator can receive their own goods.
    const TRACING_ROLES = [
      "factory_manager", "executive", "agribusiness_manager", "production_officer",
      "factory_procurement", "external_procurement", "procurement_officer",
    ]
    // Tracing roles that may also open the LPO / invoicing document pages:
    // procurement_officer raises internal LPOs (+ invoices), external_procurement
    // raises external LPOs, executive (Factory Admin) approves internal LPOs.
    const DOC_ROLES = ["procurement_officer", "external_procurement", "executive"]
    const canDoc = role && DOC_ROLES.includes(role)
    // factory_manager may view approved LPOs (read-only) so they can pick one when starting a batch
    const canLpoView = role === "factory_manager" && path.startsWith("/admin/lpo")
    const docPath = path.startsWith("/admin/lpo") || path.startsWith("/admin/invoicing")
    if (role && TRACING_ROLES.includes(role) && !path.startsWith("/admin/tracing") && !(canDoc && docPath) && !canLpoView && !COMMON) {
      return NextResponse.redirect(new URL("/admin/tracing", request.url))
    }
    // Chief + Finance are approval/oversight roles: confine them to the LPO
    // documents (chief approves external LPOs; finance is notified on CEO
    // approval) plus POS/chat/account. Everything else bounces to /admin/lpo.
    const APPROVAL_ROLES = ["chief", "finance"]
    if (role && APPROVAL_ROLES.includes(role) && !path.startsWith("/admin/lpo") && !COMMON) {
      return NextResponse.redirect(new URL("/admin/lpo", request.url))
    }
    // assistant_ceo is intentionally unconfined here — isAdminish() treats it as
    // CEO-equivalent, so it reaches the full /admin area like `admin`.
  }

  return NextResponse.next()
}

export const config = { matcher: ["/admin/:path*"] }
