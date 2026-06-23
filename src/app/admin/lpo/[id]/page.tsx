import { Suspense } from "react"
import Link from "next/link"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/db"
import BrandedDoc, { DOC_GREEN } from "@/components/admin/BrandedDoc"
import DocPrintControls from "@/components/admin/DocPrintControls"
import DocEmailButton from "@/components/admin/DocEmailButton"
import { authOptions } from "@/lib/auth"
import { isAdminish } from "@/lib/authz"
import type { DocLine } from "@/lib/docs"

const ksh = (n: number) => `KSh ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
const fmtDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString("en-KE") : "—")

export default async function LpoDocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const lpo = await prisma.lpo.findUnique({ where: { id } })
  if (!lpo) {
    return <div style={{ padding: 40, textAlign: "center", color: "#A89F91" }}>Purchase order not found. <Link href="/admin/lpo" style={{ color: DOC_GREEN }}>Back</Link></div>
  }

  const session = await getServerSession(authOptions)
  const userRole = (session?.user as { role?: string })?.role
  const isAdmin = isAdminish(userRole)
  const isExec = userRole === "executive"
  const canReview = isAdmin || isExec

  let status: string | null = null
  let rejectionReason: string | null = null
  let destinationOfGoods: string | null = null
  let recipientEmail: string | null = null
  let amended = false
  try {
    const rows = await prisma.$queryRaw<{ status: string; rejectionReason: string | null; destinationOfGoods: string | null; recipientEmail: string | null; amended: boolean }[]>`
      SELECT status, "rejectionReason", "destinationOfGoods", "recipientEmail", "amended" FROM "Lpo" WHERE id = ${id}
    `
    if (rows[0]) {
      status = rows[0].status
      rejectionReason = rows[0].rejectionReason
      destinationOfGoods = rows[0].destinationOfGoods
      recipientEmail = rows[0].recipientEmail
      amended = rows[0].amended ?? false
    }
  } catch { /* pre-migration — treat as approved */ }

  // Non-reviewers (procurement officer etc): gate on approval status
  if (!canReview && status && status !== "approved") {
    const rejected = status === "rejected"
    const execPending = status === "pending"
    return (
      <div style={{ maxWidth: 560, margin: "60px auto", textAlign: "center", padding: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: rejected ? "#C0392B" : "#8a6d00", marginBottom: 8 }}>
          {rejected ? "This LPO was rejected" : execPending ? "Awaiting executive review" : "Awaiting admin approval"}
        </div>
        <p style={{ color: "#6b6353", fontSize: 14 }}>
          {rejected
            ? rejectionReason || "An admin rejected this purchase order."
            : execPending
            ? "This purchase order is pending executive approval."
            : "The executive has approved this LPO — awaiting final admin sign-off before it can be printed."}
        </p>
        <Link href="/admin/lpo" style={{ display: "inline-block", marginTop: 18, color: DOC_GREEN, fontWeight: 600, textDecoration: "none" }}>← Back to LPOs</Link>
      </div>
    )
  }

  const items = (lpo.items as unknown as DocLine[]) ?? []

  // Banner shown when reviewer (admin/exec) is previewing a non-approved LPO
  const bannerText =
    status === "rejected" ? `Rejected — ${rejectionReason || "no reason given"}`
    : status === "pending" ? "Awaiting executive review — not yet approved."
    : status === "exec_approved" ? "Executive approved — awaiting admin final sign-off."
    : null
  const bannerColor = status === "rejected" ? { bg: "#FFF5F5", border: "#FED7D7", text: "#9B2C2C" }
    : { bg: "#FFFBEB", border: "#FBD38D", text: "#744210" }

  const statusBanner = canReview && bannerText ? (
    <div style={{
      background: bannerColor.bg,
      border: `1px solid ${bannerColor.border}`,
      borderRadius: 10,
      padding: "12px 18px",
      marginBottom: 20,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontSize: 13,
      color: bannerColor.text,
    }}>
      <span><strong>{bannerText}</strong></span>
      <Link href="/admin/lpo" style={{ color: DOC_GREEN, fontWeight: 600, textDecoration: "none", marginLeft: 16, whiteSpace: "nowrap" }}>← Back</Link>
    </div>
  ) : null

  return (
    <>
      {statusBanner}
      <BrandedDoc title="PURCHASE ORDER">
        {/* Status badges in header area */}
        {(status === "approved" || amended) && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <span style={{ background: DOC_GREEN, color: "white", fontSize: 11, fontWeight: 700, padding: "3px 11px", borderRadius: 999 }}>Approved</span>
            {amended && <span style={{ background: "#ccfbf1", color: "#0F766E", fontSize: 11, fontWeight: 700, padding: "3px 11px", borderRadius: 999 }}>Amended</span>}
          </div>
        )}

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
      </BrandedDoc>

      {/* Print + email controls only for fully approved LPOs */}
      {(status === "approved" || status === null) && (
        <>
          <div className="no-print" style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
            <DocEmailButton endpoint={`/api/lpos/${lpo.id}/email`} defaultEmail={recipientEmail ?? ""} label="Email LPO" />
          </div>
          <Suspense fallback={null}>
            <DocPrintControls backHref="/admin/lpo" backLabel="Back to LPOs" />
          </Suspense>
        </>
      )}
      {canReview && status && status !== "approved" && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <Link href="/admin/lpo" style={{ color: DOC_GREEN, fontWeight: 600, textDecoration: "none" }}>← Back to LPOs</Link>
        </div>
      )}
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
