import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/db"

// Lightweight dashboard summary. The admin dashboard used to pull EVERY order
// with all items + dispatch just to show 6 counts and 5 recent rows; this does
// the aggregation in the DB instead (counts/sum/distinct + a 5-row preview),
// so the payload and query cost stay tiny as orders grow.
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [statusGroups, revenueAgg, customers, recent] = await Promise.all([
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { paymentStatus: "paid" } }),
    prisma.order.findMany({ distinct: ["customerPhone"], select: { customerPhone: true } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, customerName: true, total: true, status: true, createdAt: true, _count: { select: { items: true } } },
    }),
  ])

  const orders = statusGroups.reduce((s, g) => s + g._count._all, 0)
  const pending = statusGroups.find((g) => g.status === "pending")?._count._all ?? 0
  const delivered = statusGroups.find((g) => g.status === "delivered")?._count._all ?? 0

  return NextResponse.json(
    {
      orders,
      pending,
      delivered,
      revenue: revenueAgg._sum.total ?? 0,
      customers: customers.length,
      recent: recent.map((o) => ({
        id: o.id, customerName: o.customerName, total: o.total,
        status: o.status, createdAt: o.createdAt, itemCount: o._count.items,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}
