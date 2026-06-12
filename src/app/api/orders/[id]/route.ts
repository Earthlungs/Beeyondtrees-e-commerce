import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/db"

// Admin-only order management (e.g. marking an order delivered/cancelled).
// Payment status is NOT set here — it's verified server-side against Paystack
// in POST /api/orders/[id]/verify so the browser can't forge a paid order.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  const data: {
    status?: string
    paymentStatus?: string
    transactionRef?: string
  } = {}
  if (typeof body.status === "string") data.status = body.status
  if (typeof body.paymentStatus === "string") data.paymentStatus = body.paymentStatus
  if (typeof body.transactionRef === "string") data.transactionRef = body.transactionRef

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 })
  }

  try {
    const order = await prisma.order.update({ where: { id }, data })
    return NextResponse.json(order)
  } catch {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }
}
