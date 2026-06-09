import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export async function GET() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(products)
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
