import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Full single product (including base64 images) for the detail page gallery.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(product, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  })
}
