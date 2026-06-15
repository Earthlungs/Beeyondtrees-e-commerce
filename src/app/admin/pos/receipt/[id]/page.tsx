import { Suspense } from "react"
import Link from "next/link"
import { prisma } from "@/lib/db"
import PrintControls from "./print-controls"

const ksh = (n: number) => `KSh ${n.toLocaleString()}`
const methodLabel: Record<string, string> = { cash: "Cash", mpesa: "M-Pesa", card: "Card" }

// In-store sale receipt. Server component: reads the order straight from the DB
// (it lives under /admin/pos, so proxy.ts already gated access). A narrow,
// thermal-printer-friendly layout; the print stylesheet hides the admin chrome
// so only the receipt prints.
export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  })

  if (!order) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#A89F91" }}>
        Receipt not found.{" "}
        <Link href="/admin/pos" style={{ color: "#6B7D5C" }}>Back to till</Link>
      </div>
    )
  }

  const change =
    order.paymentMethod === "cash" && order.cashReceived != null
      ? order.cashReceived - order.total
      : null

  return (
    <>
      {/* Print only the receipt — hide the sidebar, header and on-screen buttons. */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #receipt, #receipt * { visibility: visible !important; }
          #receipt { position: absolute; left: 0; top: 0; width: 100%; margin: 0; box-shadow: none; border: none; }
          .no-print { display: none !important; }
          @page { margin: 8mm; }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          id="receipt"
          style={{
            width: 320, background: "white", border: "1px solid #E5E7EB", borderRadius: 12,
            padding: "24px 22px", fontFamily: "monospace", color: "#2A2A2A",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>BEEYOND TREES</div>
            <div style={{ fontSize: 11, color: "#777", marginTop: 2 }}>Sales Receipt</div>
          </div>

          <div style={{ fontSize: 11, color: "#555", lineHeight: 1.7, borderBottom: "1px dashed #CCC", paddingBottom: 10 }}>
            <div>Receipt: {order.id.slice(-8).toUpperCase()}</div>
            <div>{new Date(order.createdAt).toLocaleString("en-KE")}</div>
            {order.soldBy && <div>Served by: {order.soldBy}</div>}
            {order.customerName && order.customerName !== "Walk-in customer" && (
              <div>Customer: {order.customerName}</div>
            )}
          </div>

          {/* Items */}
          <div style={{ padding: "10px 0", borderBottom: "1px dashed #CCC" }}>
            {order.items.map((it) => (
              <div key={it.id} style={{ marginBottom: 8, fontSize: 12 }}>
                <div style={{ fontWeight: 600 }}>{it.productName}</div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#555" }}>
                  <span>{it.quantity} × {ksh(it.price)} <span style={{ color: "#999" }}>({it.pricingTier})</span></span>
                  <span style={{ fontWeight: 600, color: "#2A2A2A" }}>{ksh(it.subtotal)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div style={{ padding: "10px 0", fontSize: 13 }}>
            <Row label="TOTAL" value={ksh(order.total)} bold big />
            <Row label="Payment" value={methodLabel[order.paymentMethod ?? ""] ?? order.paymentMethod ?? "—"} />
            {order.paymentMethod === "cash" && order.cashReceived != null && (
              <>
                <Row label="Cash received" value={ksh(order.cashReceived)} />
                {change != null && <Row label="Change" value={ksh(change)} />}
              </>
            )}
            {order.paymentMethod === "mpesa" && order.mpesaCode && (
              <Row label="M-Pesa code" value={order.mpesaCode} />
            )}
            {order.paymentMethod === "card" && order.cardRef && (
              <Row label="Card ref" value={order.cardRef} />
            )}
          </div>

          <div style={{ textAlign: "center", fontSize: 11, color: "#777", borderTop: "1px dashed #CCC", paddingTop: 12 }}>
            Asante sana! Thank you for shopping with us.
            <div style={{ marginTop: 6, fontSize: 10, lineHeight: 1.6 }}>
              www.beeyondtrees.org · +254 790 279 826<br />
              Palm Court, Waiyaki Way
            </div>
          </div>
        </div>

        <Suspense fallback={null}>
          <PrintControls />
        </Suspense>
      </div>
    </>
  )
}

function Row({ label, value, bold, big }: { label: string; value: string; bold?: boolean; big?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", margin: "3px 0" }}>
      <span style={{ color: "#555", fontWeight: bold ? 700 : 400, fontSize: big ? 14 : 12 }}>{label}</span>
      <span style={{ fontWeight: bold ? 800 : 600, fontSize: big ? 15 : 12 }}>{value}</span>
    </div>
  )
}
