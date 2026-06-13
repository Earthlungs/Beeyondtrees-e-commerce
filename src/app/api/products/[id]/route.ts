import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/db"

// Full single product (including base64 images) for the detail page gallery.
// costPrice is sensitive: only returned (uncached) to an admin/merchant token —
// e.g. the admin product editor. Public requests get it stripped + cacheable,
// so the cost never leaks through the CDN.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const role = (token as { role?: string } | null)?.role
  if (role === "admin" || role === "merchant") {
    return NextResponse.json(product, { headers: { "Cache-Control": "no-store" } })
  }

  const pub = { ...product } as Record<string, unknown>
  delete pub.costPrice
  return NextResponse.json(pub, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  })
}
