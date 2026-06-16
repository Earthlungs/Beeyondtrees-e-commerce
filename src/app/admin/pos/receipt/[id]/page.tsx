import { Suspense } from "react"
import Link from "next/link"
import { prisma } from "@/lib/db"
import BrandedDoc, { DOC_GREEN } from "@/components/admin/BrandedDoc"
import PrintControls from "./print-controls"

const ksh = (n: number) => `KSh ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
const fmtDate = (d: Date) => new Date(d).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })
const methodLabel: Record<string, string> = { cash: "Cash", mpesa: "M-Pesa", card: "Card" }

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } })

  if (!order) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#A89F91" }}>
        Receipt not found. <Link href="/admin/pos" style={{ color: DOC_GREEN }}>Back to till</Link>
      </div>
    )
  }

  const change =
    order.paymentMethod === "cash" && order.cashReceived != null
      ? order.cashReceived - order.total
      : null

  return (
    <>
      <BrandedDoc title="RECEIPT">
        {/* Receipt meta */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, fontSize: 13, flexWrap: "wrap", gap: 12 }}>
          <div style={{ lineHeight: 1.9 }}>
            {order.customerName && order.customerName !== "Walk-in customer" ? (
              <>
                <div style={{ fontWeight: 800, fontSize: 14 }}>Received by</div>
                <div>{order.customerName}</div>
                {order.customerPhone && <div>{order.customerPhone}</div>}
              </>
            ) : (
              <div style={{ color: "#888", fontSize: 13 }}>Walk-in customer</div>
            )}
          </div>
          <div style={{ lineHeight: 1.9, textAlign: "right" }}>
            <div><strong>Receipt No:</strong> {order.id.slice(-8).toUpperCase()}</div>
            <div><strong>Date:</strong> {fmtDate(order.createdAt)}</div>
            {order.soldBy && <div><strong>Served by:</strong> {order.soldBy}</div>}
          </div>
        </div>

        {/* Line items */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${DOC_GREEN}`, textAlign: "left" }}>
              <th style={{ padding: "8px 6px" }}>Item</th>
              <th style={{ padding: "8px 6px", width: 60 }}>Qty</th>
              <th style={{ padding: "8px 6px", width: 110 }}>Unit Price</th>
              <th style={{ padding: "8px 6px", width: 80 }}>Tier</th>
              <th style={{ padding: "8px 6px", width: 120, textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it) => (
              <tr key={it.id} style={{ borderBottom: "1px solid #EEE" }}>
                <td style={{ padding: "8px 6px" }}>{it.productName}</td>
                <td style={{ padding: "8px 6px" }}>{it.quantity}</td>
                <td style={{ padding: "8px 6px" }}>{ksh(it.price)}</td>
                <td style={{ padding: "8px 6px", textTransform: "capitalize", color: "#777" }}>{it.pricingTier}</td>
                <td style={{ padding: "8px 6px", textAlign: "right" }}>{ksh(it.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Payment + totals */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 36, gap: 24, flexWrap: "wrap" }}>
          <div style={{ maxWidth: 280 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>Payment Method</div>
            <div style={{ fontSize: 13, color: "#555" }}>{methodLabel[order.paymentMethod ?? ""] ?? order.paymentMethod ?? "—"}</div>
            {order.paymentMethod === "mpesa" && order.mpesaCode && (
              <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>M-Pesa code: <strong>{order.mpesaCode}</strong></div>
            )}
            {order.paymentMethod === "card" && order.cardRef && (
              <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>Card ref: <strong>{order.cardRef}</strong></div>
            )}
          </div>
          <div style={{ width: 240, fontSize: 14 }}>
            <Row label="Total" value={ksh(order.total)} bold />
            {order.paymentMethod === "cash" && order.cashReceived != null && (
              <>
                <div style={{ borderTop: `1px solid #EEE`, margin: "6px 0" }} />
                <Row label="Cash received" value={ksh(order.cashReceived)} />
                {change != null && <Row label="Change" value={ksh(change)} />}
              </>
            )}
          </div>
        </div>

        <div style={{ marginTop: 24, textAlign: "center", fontSize: 12, color: "#888" }}>
          Asante sana! Thank you for shopping with us.
        </div>
      </BrandedDoc>

      <Suspense fallback={null}>
        <PrintControls />
      </Suspense>
    </>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontWeight: bold ? 800 : 600, fontSize: bold ? 16 : 14 }}>
      <span>{label}</span><span>{value}</span>
    </div>
  )
}
