import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  // `?since=<ISO>` returns only products created/updated after that timestamp,
  // so cached clients fetch just the delta instead of the whole catalog.
  const since = request.nextUrl.searchParams.get('since')
  const products = await prisma.product.findMany({
    where: since ? { updatedAt: { gt: new Date(since) } } : undefined,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, description: true, category: true,
      retailPrice: true, wholesalePrice: true, distributorPrice: true,
      stock: true, isOnOffer: true, offerPrice: true, isFeatured: true,
      createdAt: true, updatedAt: true, images: true,
    },
  })
  // Include only hosted (Cloudinary) image URLs so cards load straight from the
  // CDN — no per-thumbnail DB round-trip. Any legacy base64 data-URI (~0.5MB) is
  // replaced with "" to keep the catalog JSON tiny; those positions fall back to
  // /api/products/[id]/image (see productImageUrl), preserving image order.
  const sanitized = products.map((p) => ({
    ...p,
    images: ((p.images as string[]) ?? []).map((s) =>
      /^https?:\/\//.test(s) ? s : ""
    ),
  }))
  return NextResponse.json(sanitized, {
    headers: since
      ? { 'Cache-Control': 'no-store' }
      : { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' },
  })
}

export async function POST(request: NextRequest) {
  const data = await request.json()
  const product = await prisma.product.create({ data })
  return NextResponse.json(product)
}

export async function PUT(request: NextRequest) {
  const { id, ...data } = await request.json()
  const product = await prisma.product.update({ where: { id }, data })
  return NextResponse.json(product)
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json()
  await prisma.product.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
