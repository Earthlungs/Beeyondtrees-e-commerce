import { prisma } from "@/lib/db"

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

  // Decrement each product's stock by the quantity ordered, then floor any
  // negatives at 0 (in case of an oversell race).
  const productIds = items.map((i) => i.productId)
  await prisma.$transaction([
    ...items.map((it) =>
      prisma.product.updateMany({
        where: { id: it.productId },
        data: { stock: { decrement: it.quantity } },
      })
    ),
    prisma.product.updateMany({
      where: { id: { in: productIds }, stock: { lt: 0 } },
      data: { stock: 0 },
    }),
  ])

  return true
}
