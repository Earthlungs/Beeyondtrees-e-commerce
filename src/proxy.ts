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
    // Cashiers are sell-only: confine them to the POS till. Any other /admin
    // page (dashboard, products, customers, settings) bounces back to /admin/pos.
    const role = (token as { role?: string }).role
    if (role === "cashier" && !path.startsWith("/admin/pos")) {
      return NextResponse.redirect(new URL("/admin/pos", request.url))
    }
  }

  return NextResponse.next()
}

export const config = { matcher: ["/admin/:path*"] }
