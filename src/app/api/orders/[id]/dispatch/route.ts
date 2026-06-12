import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/db"

// Admin-only: assign a rider to an order and mark it dispatched. Upserts the
// Dispatch record so a rider can be reassigned without erroring.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { riderName, riderPhone, motorbikePlate, riderIdNo, estimatedDelivery } = body

  if (!riderName || !riderPhone || !motorbikePlate || !riderIdNo) {
    return NextResponse.json({ error: "Missing rider details" }, { status: 400 })
  }

  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  const eta = estimatedDelivery ? new Date(estimatedDelivery) : null
  const dispatchData = { riderName, riderPhone, motorbikePlate, riderIdNo, estimatedDelivery: eta }

  const dispatch = await prisma.dispatch.upsert({
    where: { orderId: id },
    create: { orderId: id, ...dispatchData },
    update: dispatchData,
  })

  await prisma.order.update({ where: { id }, data: { status: "dispatched" } })

  return NextResponse.json({ dispatch })
}
