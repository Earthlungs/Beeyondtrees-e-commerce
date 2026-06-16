import { Suspense } from "react"
import Link from "next/link"
import { prisma } from "@/lib/db"
import BrandedDoc, { DOC_GREEN } from "@/components/admin/BrandedDoc"
import DocPrintControls from "@/components/admin/DocPrintControls"
import type { DocLine } from "@/lib/docs"

const ksh = (n: number) => `KSh ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
const fmtDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString("en-KE") : "—")

export default async function LpoDocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const lpo = await prisma.lpo.findUnique({ where: { id } })
  if (!lpo) {
    return <div style={{ padding: 40, textAlign: "center", color: "#A89F91" }}>Purchase order not found. <Link href="/admin/lpo" style={{ color: DOC_GREEN }}>Back</Link></div>
  }

  // Fetch extra columns via raw SQL (not in Prisma model — applied by migration).
  let status: string | null = null
  let rejectionReason: string | null = null
  let destinationOfGoods: string | null = null
  try {
    const rows = await prisma.$queryRaw<{ status: string; rejectionReason: string | null; destinationOfGoods: string | null }[]>`
      SELECT status, "rejectionReason", "destinationOfGoods" FROM "Lpo" WHERE id = ${id}
    `
    if (rows[0]) { status = rows[0].status; rejectionReason = rows[0].rejectionReason; destinationOfGoods = rows[0].destinationOfGoods }
  } catch { /* pre-migration — treat as approved */ }

  // Gate: only approved LPOs can be generated/printed. null status (pre-migration)
  // is treated as approved so existing LPOs remain accessible.
  if (status && status !== "approved") {
    const rejected = status === "rejected"
    return (
      <div style={{ maxWidth: 560, margin: "60px auto", textAlign: "center", padding: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: rejected ? "#C0392B" : "#8a6d00", marginBottom: 8 }}>
          {rejected ? "This LPO was rejected" : "Awaiting admin approval"}
        </div>
        <p style={{ color: "#6b6353", fontSize: 14 }}>
          {rejected
            ? rejectionReason || "An admin rejected this purchase order."
            : "This purchase order must be approved by an admin before it can be generated or printed."}
        </p>
        <Link href="/admin/lpo" style={{ display: "inline-block", marginTop: 18, color: DOC_GREEN, fontWeight: 600, textDecoration: "none" }}>← Back to LPOs</Link>
      </div>
    )
  }

  const items = (lpo.items as unknown as DocLine[]) ?? []

  return (
    <>
      <BrandedDoc title="PURCHASE ORDER">
        {/* Two-column meta block */}
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
            <div style={{ fontSize: 12.5, color: "#555", whiteSpace: "pre-wrap" }}>{lpo.notes || "—"}</div>
          </div>
          <div style={{ width: 240, fontSize: 14 }}>
            <Row label="Amount" value={ksh(lpo.subtotal)} />
            <Row label="VAT" value={ksh(lpo.vat)} />
            <div style={{ borderTop: `2px solid ${DOC_GREEN}`, margin: "6px 0" }} />
            <Row label="Total" value={ksh(lpo.total)} bold />
          </div>
        </div>
      </BrandedDoc>

      <Suspense fallback={null}>
        <DocPrintControls backHref="/admin/lpo" backLabel="Back to LPOs" />
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
