import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"

const EAT = 3 * 60 * 60 * 1000 // Kenya is UTC+3, no DST

// Parse a YYYY-MM-DD as the START of that day in EAT, returned as a UTC instant.
const eatDayStart = (ymd: string) => new Date(Date.parse(`${ymd}T00:00:00Z`) - EAT)

// Sales analytics over a date range. Admin only. ?from=YYYY-MM-DD&to=YYYY-MM-DD
// (inclusive EAT days). Defaults to "today" (since EAT midnight) — which is how
// the dashboard's headline figure "auto-resets" each day. Counts only paid
// orders (online paymentStatus=paid + POS sales, which are also paid).
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin"])
  if (auth instanceof NextResponse) return auth

  const sp = request.nextUrl.searchParams
  const fromParam = sp.get("from")
  const toParam = sp.get("to")

  const eatNow = new Date(Date.now() + EAT)
  const eatMidnightUtc = new Date(Date.UTC(eatNow.getUTCFullYear(), eatNow.getUTCMonth(), eatNow.getUTCDate()) - EAT)

  const from = fromParam ? eatDayStart(fromParam) : eatMidnightUtc
  // `to` is inclusive of the whole EAT day, so go to the start of the next day.
  const to = toParam ? new Date(eatDayStart(toParam).getTime() + 24 * 60 * 60 * 1000) : new Date()

  const [orders, products] = await Promise.all([
    prisma.order.findMany({
      where: { paymentStatus: "paid", createdAt: { gte: from, lt: to } },
      include: { items: true },
    }),
    prisma.product.findMany({ select: { id: true, costPrice: true, retailPrice: true, stock: true } }),
  ])

  const cost = new Map(products.map((p) => [p.id, p.costPrice]))
  const costKnown = products.some((p) => p.costPrice > 0)

  let totalSales = 0, onlineSales = 0, posSales = 0, cogs = 0
  const byLocation = new Map<string, { location: string; orders: number; revenue: number }>()
  const byProduct = new Map<string, { name: string; qty: number; revenue: number }>()
  const bySeller = new Map<string, { name: string; orders: number; revenue: number }>()
  const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, online: 0, pos: 0 }))
  // Money collected by payment method, and by which staff member collected it.
  const byMethod: Record<string, { amount: number; count: number }> = {
    cash: { amount: 0, count: 0 }, mpesa: { amount: 0, count: 0 },
    card: { amount: 0, count: 0 }, online: { amount: 0, count: 0 },
  }
  const byCollector = new Map<string, { name: string; total: number; cash: number; mpesa: number; card: number; orders: number }>()

  for (const o of orders) {
    totalSales += o.total
    const isPos = o.channel === "pos"
    if (isPos) posSales += o.total
    else onlineSales += o.total

    // COGS from current product cost prices (historical cost not stored).
    for (const it of o.items) {
      cogs += (cost.get(it.productId) ?? 0) * it.quantity
      const p = byProduct.get(it.productName) ?? { name: it.productName, qty: 0, revenue: 0 }
      p.qty += it.quantity
      p.revenue += it.subtotal
      byProduct.set(it.productName, p)
    }

    const locKey = isPos ? "In-store (Shop)" : `${o.county}${o.town ? " — " + o.town : ""}`
    const loc = byLocation.get(locKey) ?? { location: locKey, orders: 0, revenue: 0 }
    loc.orders += 1
    loc.revenue += o.total
    byLocation.set(locKey, loc)

    if (isPos && o.soldBy) {
      const s = bySeller.get(o.soldBy) ?? { name: o.soldBy, orders: 0, revenue: 0 }
      s.orders += 1
      s.revenue += o.total
      bySeller.set(o.soldBy, s)
    }

    const eatHour = (new Date(o.createdAt).getUTCHours() + 3) % 24
    if (isPos) hourly[eatHour].pos += o.total
    else hourly[eatHour].online += o.total

    // Money collected by method + by collector (POS uses the recorded method
    // and soldBy = the cashier who collected and generated the receipt).
    if (isPos) {
      const m = (["cash", "mpesa", "card"].includes(o.paymentMethod ?? "") ? o.paymentMethod : "cash") as "cash" | "mpesa" | "card"
      byMethod[m].amount += o.total
      byMethod[m].count += 1
      if (o.soldBy) {
        const c = byCollector.get(o.soldBy) ?? { name: o.soldBy, total: 0, cash: 0, mpesa: 0, card: 0, orders: 0 }
        c.total += o.total
        c[m] += o.total
        c.orders += 1
        byCollector.set(o.soldBy, c)
      }
    } else {
      byMethod.online.amount += o.total
      byMethod.online.count += 1
    }
  }

  const netProfit = totalSales - cogs
  const top = <T extends { revenue: number }>(m: Map<string, T>, n = 8) =>
    [...m.values()].sort((a, b) => b.revenue - a.revenue).slice(0, n)

  return NextResponse.json(
    {
      range: { from: from.toISOString(), to: to.toISOString() },
      totalSales,
      onlineSales,
      posSales,
      orderCount: orders.length,
      netProfit,
      cogs,
      costKnown,
      margin: totalSales > 0 ? (netProfit / totalSales) * 100 : 0,
      stockRetailValue: products.reduce((s, p) => s + p.retailPrice * p.stock, 0),
      stockCostValue: products.reduce((s, p) => s + p.costPrice * p.stock, 0),
      topLocations: top(byLocation),
      topProducts: [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8),
      topSellers: top(bySeller),
      byMethod,
      collectors: [...byCollector.values()].sort((a, b) => b.total - a.total),
      hourly,
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}
