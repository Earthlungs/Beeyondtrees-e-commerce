import { Suspense } from "react"
import Link from "next/link"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/db"
import BrandedDoc, { DOC_GREEN } from "@/components/admin/BrandedDoc"
import DocPrintControls from "@/components/admin/DocPrintControls"
import DocEmailButton from "@/components/admin/DocEmailButton"
import LpoBody from "@/components/documents/LpoBody"
import { authOptions } from "@/lib/auth"
import { isAdminish } from "@/lib/authz"

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

        <LpoBody lpo={lpo} destinationOfGoods={destinationOfGoods} />
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
