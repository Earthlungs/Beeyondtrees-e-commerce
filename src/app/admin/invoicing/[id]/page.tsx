import { Suspense } from "react"
import Link from "next/link"
import { prisma } from "@/lib/db"
import BrandedDoc, { DOC_GREEN } from "@/components/admin/BrandedDoc"
import DocPrintControls from "@/components/admin/DocPrintControls"
import DocEmailButton from "@/components/admin/DocEmailButton"
import type { DocLine } from "@/lib/docs"

const ksh = (n: number) => `KSh ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
const fmtDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString("en-KE") : "—")

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const invoice = await prisma.invoice.findUnique({ where: { id } })
  if (!invoice) {
    return <div style={{ padding: 40, textAlign: "center", color: "#A89F91" }}>Invoice not found. <Link href="/admin/invoicing" style={{ color: DOC_GREEN }}>Back</Link></div>
  }
  const items = (invoice.items as unknown as DocLine[]) ?? []
  // Prefill the email box with the customer's contact if it looks like an address.
  const defaultEmail = invoice.customerContact && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invoice.customerContact)
    ? invoice.customerContact : ""

  return (
    <>
      <BrandedDoc title="INVOICE">
        {/* Meta + billed-to */}
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

        {/* Line items */}
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

        {/* Payment details + totals */}
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
      </BrandedDoc>

      <div className="no-print" style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
        <DocEmailButton endpoint={`/api/invoices/${invoice.id}/email`} defaultEmail={defaultEmail} label="Email invoice" />
      </div>

      <Suspense fallback={null}>
        <DocPrintControls backHref="/admin/invoicing" backLabel="Back to invoices" />
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
