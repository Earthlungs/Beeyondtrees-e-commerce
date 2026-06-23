import { DOC_GREEN } from "@/components/admin/BrandedDoc"
import type { DocLine } from "@/lib/docs"

const ksh = (n: number) => `KSh ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
const fmtDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString("en-KE") : "—")

export interface LpoRecord {
  number: string
  orderDate: Date
  expectedArrival: Date | null
  supplierName: string
  shippingAddress: string | null
  purchaseRep: string | null
  items: unknown
  subtotal: number
  vat: number
  total: number
  notes: string | null
}

// Inner content of the branded PURCHASE ORDER document. Status badges (Approved /
// Amended) are rendered by the admin page, not here, so the public client view
// shows only the order itself.
export default function LpoBody({ lpo, destinationOfGoods }: { lpo: LpoRecord; destinationOfGoods: string | null }) {
  const items = (lpo.items as DocLine[]) ?? []
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 24px", marginBottom: 24, fontSize: 13 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Shipping Address</div>
          <div style={{ color: "#555", whiteSpace: "pre-wrap" }}>{lpo.shippingAddress || "—"}</div>
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Purchase Representative</div>
          <div style={{ color: "#555" }}>{lpo.purchaseRep || "—"}</div>
          <div style={{ fontWeight: 800, fontSize: 14, marginTop: 12 }}>Order Date</div>
          <div style={{ color: "#555" }}>{fmtDate(lpo.orderDate)}</div>
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Order Number</div>
          <div style={{ color: "#555" }}>{lpo.number}</div>
          <div style={{ fontWeight: 800, fontSize: 14, marginTop: 12 }}>Supplier</div>
          <div style={{ color: "#555" }}>{lpo.supplierName}</div>
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Expected Arrival</div>
          <div style={{ color: "#555" }}>{fmtDate(lpo.expectedArrival)}</div>
          {destinationOfGoods && (
            <>
              <div style={{ fontWeight: 800, fontSize: 14, marginTop: 12 }}>Destination of Goods</div>
              <div style={{ color: "#555", whiteSpace: "pre-wrap" }}>{destinationOfGoods}</div>
            </>
          )}
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${DOC_GREEN}`, textAlign: "left" }}>
            <th style={{ padding: "8px 6px" }}>Description</th>
            <th style={{ padding: "8px 6px", width: 60 }}>Qty</th>
            <th style={{ padding: "8px 6px", width: 110 }}>Unit Price</th>
            <th style={{ padding: "8px 6px", width: 70 }}>Taxes</th>
            <th style={{ padding: "8px 6px", width: 120, textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((l, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #EEE" }}>
              <td style={{ padding: "8px 6px" }}>{l.description}</td>
              <td style={{ padding: "8px 6px" }}>{l.qty}</td>
              <td style={{ padding: "8px 6px" }}>{ksh(l.unitPrice)}</td>
              <td style={{ padding: "8px 6px" }}>{l.taxRate ? `${l.taxRate}%` : "—"}</td>
              <td style={{ padding: "8px 6px", textAlign: "right" }}>{ksh(l.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 36, gap: 24 }}>
        <div style={{ maxWidth: 280 }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>Payment Details</div>
          <div style={{ fontSize: 12.5, color: "#555", whiteSpace: "pre-wrap" }}>{lpo.notes || "—"}</div>
        </div>
        <div style={{ width: 240, fontSize: 14 }}>
          <Row label="Amount" value={ksh(lpo.subtotal)} />
          <Row label="VAT" value={ksh(lpo.vat)} />
          <div style={{ borderTop: `2px solid ${DOC_GREEN}`, margin: "6px 0" }} />
          <Row label="Total" value={ksh(lpo.total)} bold />
        </div>
      </div>
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
