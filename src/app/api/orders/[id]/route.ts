import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Update an order after checkout — primarily payment status (paid/cancelled)
// from the Paystack handlers, and order status from the admin dashboard.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
