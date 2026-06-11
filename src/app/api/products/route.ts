import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  // `?since=<ISO>` returns only products created/updated after that timestamp,
  // so cached clients fetch just the delta instead of the whole catalog.
  const since = request.nextUrl.searchParams.get('since')
  const products = await prisma.product.findMany({
    where: since ? { updatedAt: { gt: new Date(since) } } : undefined,
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(products, {
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
