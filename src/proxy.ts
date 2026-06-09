import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  if (path === "/admin/login" || path.startsWith("/api/") || path.startsWith("/_next/")) {
    return NextResponse.next()
  }
  
  if (path.startsWith("/admin")) {
    const token = await getToken({ req: request, secret: "beeyond-trees-secret-2024" })
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }
  }
  
  return NextResponse.next()
}

export const config = { matcher: ["/admin/:path*"] }
