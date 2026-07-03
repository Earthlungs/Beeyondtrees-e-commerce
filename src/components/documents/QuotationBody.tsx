import { DOC_GREEN } from "@/components/admin/BrandedDoc"
import type { DocLine } from "@/lib/docs"

const ksh = (n: number) => `KSh ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
const fmtDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString("en-KE") : "—")

export interface QuotationRecord {
  number: string
  orderDate: Date
  expectedArrival: Date | null
  supplierName: string
  shippingAddress: string | null
  purchaseRep: string | null
  destinationOfGoods: string | null
  items: unknown
  subtotal: number
  vat: number
  total: number
}

// Inner content of the branded QUOTATION document — the LPO body minus the
// Payment Details block (quotations carry no payment information).
export default function QuotationBody({ quotation }: { quotation: QuotationRecord }) {
  const items = (quotation.items as DocLine[]) ?? []
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 24px", marginBottom: 24, fontSize: 13 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Source of Supply</div>
          <div style={{ color: "#555", whiteSpace: "pre-wrap" }}>{quotation.shippingAddress || "—"}</div>
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Purchase Representative</div>
          <div style={{ color: "#555" }}>{quotation.purchaseRep || "—"}</div>
          <div style={{ fontWeight: 800, fontSize: 14, marginTop: 12 }}>Date</div>
          <div style={{ color: "#555" }}>{fmtDate(quotation.orderDate)}</div>
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Quotation Number</div>
          <div style={{ color: "#555" }}>{quotation.number}</div>
          <div style={{ fontWeight: 800, fontSize: 14, marginTop: 12 }}>Supplier</div>
          <div style={{ color: "#555" }}>{quotation.supplierName}</div>
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Expected Arrival</div>
          <div style={{ color: "#555" }}>{fmtDate(quotation.expectedArrival)}</div>
          {quotation.destinationOfGoods && (
            <>
              <div style={{ fontWeight: 800, fontSize: 14, marginTop: 12 }}>Destination of Goods</div>
              <div style={{ color: "#555", whiteSpace: "pre-wrap" }}>{quotation.destinationOfGoods}</div>
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

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 36 }}>
        <div style={{ width: 240, fontSize: 14 }}>
          <Row label="Amount" value={ksh(quotation.subtotal)} />
          <Row label="VAT" value={ksh(quotation.vat)} />
          <div style={{ borderTop: `2px solid ${DOC_GREEN}`, margin: "6px 0" }} />
          <Row label="Total" value={ksh(quotation.total)} bold />
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
