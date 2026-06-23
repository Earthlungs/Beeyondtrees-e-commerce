import { prisma } from "@/lib/db"

// ---------------------------------------------------------------------------
// Shared inventory + order helpers used by BOTH sales channels:
//   * online web checkout (markOrderPaid, via Paystack verify/webhook)
//   * physical shop till   (recordPosSale, via /api/pos/sale)
// Both decrement the SAME Product.stock column, so the website and the shop
// can never drift out of sync — and never oversell the same last unit.
// ---------------------------------------------------------------------------

type StockLine = { productId: string; quantity: number }

// Decrement stock for a set of order lines, flooring any negatives at 0 in case
// of an oversell race. Kept separate so the online and POS paths share one
// implementation. Pass a transaction client (`tx`) to run inside a larger
// atomic operation; defaults to the global prisma client otherwise.
async function decrementStock(
  lines: StockLine[],
  client: typeof prisma = prisma
): Promise<void> {
  const productIds = lines.map((l) => l.productId)
  await client.$transaction([
    ...lines.map((l) =>
      client.product.updateMany({
        where: { id: l.productId },
        data: { stock: { decrement: l.quantity } },
      })
    ),
    client.product.updateMany({
      where: { id: { in: productIds }, stock: { lt: 0 } },
      data: { stock: 0 },
    }),
  ])
}

// Atomically mark an order paid exactly once and decrement product stock.
//
// Both the browser verify endpoint and the Paystack webhook can confirm the
// same payment, so we use an optimistic guard: `updateMany` only flips the row
// when it isn't already paid, and its count tells us whether *this* call won the
// race. Only the winner decrements stock, so stock is never double-deducted.
export async function markOrderPaid(orderId: string, transactionRef: string): Promise<boolean> {
  const claim = await prisma.order.updateMany({
    where: { id: orderId, paymentStatus: { not: "paid" } },
    data: { paymentStatus: "paid", transactionRef },
  })
  if (claim.count === 0) return false // already paid via the other path

  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: { productId: true, quantity: true },
  })
  await decrementStock(items)

  return true
}

// ---------------------------------------------------------------------------
// Point-of-sale (physical shop) sale
// ---------------------------------------------------------------------------

export type PaymentMethod = "cash" | "mpesa" | "card"
export type PricingTier = "retail" | "wholesale" | "distributor"

export interface PosSaleLine {
  productId: string
  quantity: number
  pricingTier: PricingTier
}

export interface PosSaleInput {
  lines: PosSaleLine[]
  paymentMethod: PaymentMethod
  customerName?: string | null
  customerPhone?: string | null
  customerEmail?: string | null
  cashReceived?: number | null
  mpesaCode?: string | null
  cardRef?: string | null
  soldBy?: string | null
}

// Thrown when one or more lines exceed available stock. Carries per-item detail
// so the till can tell the cashier exactly what (and how much) is short.
export class InsufficientStockError extends Error {
  constructor(
    public readonly items: {
      productId: string
      productName: string
      requested: number
      available: number
    }[]
  ) {
    super("Insufficient stock")
    this.name = "InsufficientStockError"
  }
}

// The price the till charges for a product at a given tier. Mirrors the web
// cart exactly (src/store/cart-store.ts + product detail page): the per-tier
// column, with no offer adjustment (offerPrice is display-only on the site).
function tierPrice(
  product: { retailPrice: number; wholesalePrice: number; distributorPrice: number },
  tier: PricingTier
): number {
  if (tier === "wholesale") return product.wholesalePrice
  if (tier === "distributor") return product.distributorPrice
  return product.retailPrice
}

// Record a completed cash/till sale and decrement shared stock — all or nothing.
//
// Runs inside a single interactive transaction so the stock check, the order
// write and the decrement can't be interleaved with a competing web order. The
// decrement uses a conditional `stock >= quantity` guard; if any line loses that
// race (web checkout grabbed the unit first), the whole transaction rolls back
// and we report it as an out-of-stock error. Prices are computed server-side
// from the live product rows, so the client can't dictate what it pays.
export async function recordPosSale(input: PosSaleInput) {
  const { lines } = input
  if (!lines.length) throw new Error("Sale has no items")

  // Collapse duplicate (productId, tier) lines so a product can't dodge the
  // stock check by being listed twice.
  const merged = new Map<string, PosSaleLine>()
  for (const l of lines) {
    if (l.quantity <= 0) throw new Error("Quantity must be positive")
    const key = `${l.productId}::${l.pricingTier}`
    const prev = merged.get(key)
    merged.set(key, prev ? { ...l, quantity: prev.quantity + l.quantity } : { ...l })
  }
  const saleLines = [...merged.values()]
  const productIds = [...new Set(saleLines.map((l) => l.productId))]

  return prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true, name: true,
        retailPrice: true, wholesalePrice: true, distributorPrice: true,
        stock: true,
      },
    })
    const byId = new Map(products.map((p) => [p.id, p]))

    // Total quantity demanded per product across all its tier lines.
    const demand = new Map<string, number>()
    for (const l of saleLines) {
      if (!byId.has(l.productId)) {
        throw new InsufficientStockError([
          { productId: l.productId, productName: "Unknown product", requested: l.quantity, available: 0 },
        ])
      }
      demand.set(l.productId, (demand.get(l.productId) ?? 0) + l.quantity)
    }

    // Block oversell: collect every product whose combined demand exceeds stock.
    const short = [...demand.entries()]
      .filter(([id, qty]) => qty > (byId.get(id)!.stock))
      .map(([id, qty]) => ({
        productId: id,
        productName: byId.get(id)!.name,
        requested: qty,
        available: byId.get(id)!.stock,
      }))
    if (short.length) throw new InsufficientStockError(short)

    // Build order items with authoritative server-side prices.
    const items = saleLines.map((l) => {
      const p = byId.get(l.productId)!
      const price = tierPrice(p, l.pricingTier)
      return {
        productId: l.productId,
        productName: p.name,
        price,
        quantity: l.quantity,
        pricingTier: l.pricingTier,
        subtotal: price * l.quantity,
      }
    })
    const total = items.reduce((s, i) => s + i.subtotal, 0)

    const order = await tx.order.create({
      data: {
        customerName: input.customerName?.trim() || "Walk-in customer",
        customerPhone: input.customerPhone?.trim() || "N/A",
        customerEmail: input.customerEmail?.trim() || null,
        // POS sales are collected in-store; reuse delivery columns as the shop location.
        county: "In-store",
        town: "Shop",
        total,
        status: "completed",
        channel: "pos",
        paymentStatus: "paid",
        paymentMethod: input.paymentMethod,
        cashReceived: input.paymentMethod === "cash" ? input.cashReceived ?? null : null,
        mpesaCode: input.paymentMethod === "mpesa" ? input.mpesaCode ?? null : null,
        cardRef: input.paymentMethod === "card" ? input.cardRef ?? null : null,
        soldBy: input.soldBy ?? null,
        items: { create: items },
      },
      include: { items: true },
    })

    // Decrement with a per-line race guard. gte ensures we never go negative and
    // catches a unit the web checkout claimed between our read and write.
    for (const [id, qty] of demand.entries()) {
      const res = await tx.product.updateMany({
        where: { id, stock: { gte: qty } },
        data: { stock: { decrement: qty } },
      })
      if (res.count === 0) {
        const p = byId.get(id)!
        throw new InsufficientStockError([
          { productId: id, productName: p.name, requested: qty, available: p.stock },
        ])
      }
    }

    return order
  })
}
