import { DOC_GREEN } from "@/components/admin/BrandedDoc"
import type { DocLine } from "@/lib/docs"

const ksh = (n: number) => `KSh ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
const fmtDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString("en-KE") : "—")

export interface InvoiceRecord {
  number: string
  date: Date
  dueDate: Date | null
  customerName: string
  customerContact: string | null
  items: unknown
  subtotal: number
  vat: number
  total: number
  notes: string | null
}

// Inner content of the branded INVOICE document. Shared by the admin print page
// and the public client page so the layout stays in one place.
export default function InvoiceBody({ invoice }: { invoice: InvoiceRecord }) {
  const items = (invoice.items as DocLine[]) ?? []
  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
        <div style={{ fontSize: 13, lineHeight: 1.9 }}>
          <div><strong>Invoice Number:</strong> {invoice.number}</div>
          <div><strong>Date:</strong> {fmtDate(invoice.date)}</div>
          <div><strong>Due Date:</strong> {fmtDate(invoice.dueDate)}</div>
        </div>
      </div>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>Billed to</div>
        <div style={{ fontSize: 13 }}>Name: {invoice.customerName}</div>
        {invoice.customerContact && <div style={{ fontSize: 13 }}>Phone/Email: {invoice.customerContact}</div>}
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
          <div style={{ fontSize: 12.5, color: "#555", whiteSpace: "pre-wrap" }}>{invoice.notes || "—"}</div>
        </div>
        <div style={{ width: 240, fontSize: 14 }}>
          <Row label="Amount" value={ksh(invoice.subtotal)} />
          <Row label="VAT" value={ksh(invoice.vat)} />
          <div style={{ borderTop: `2px solid ${DOC_GREEN}`, margin: "6px 0" }} />
          <Row label="Total" value={ksh(invoice.total)} bold />
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
