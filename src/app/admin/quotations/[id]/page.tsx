import { Suspense } from "react"
import Link from "next/link"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/db"
import BrandedDoc, { DOC_GREEN } from "@/components/admin/BrandedDoc"
import DocPrintControls from "@/components/admin/DocPrintControls"
import DocEmailButton from "@/components/admin/DocEmailButton"
import QuotationBody from "@/components/documents/QuotationBody"
import AttachmentBlock from "@/components/documents/AttachmentBlock"
import { authOptions } from "@/lib/auth"
import { isAdminish } from "@/lib/authz"

export default async function QuotationDocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const quotation = await prisma.quotation.findUnique({ where: { id } })
  if (!quotation) {
    return <div style={{ padding: 40, textAlign: "center", color: "#A89F91" }}>Quotation not found. <Link href="/admin/quotations" style={{ color: DOC_GREEN }}>Back</Link></div>
  }

  const session = await getServerSession(authOptions)
  const userRole = (session?.user as { role?: string })?.role
  const isAdmin = isAdminish(userRole)
  const isExec = userRole === "executive"
  const isChief = userRole === "chief"
  const canReview = isAdmin || isExec || isChief

  const { status, rejectionReason, amended, origin, recipientEmail, attachmentUrl } = quotation

  // Non-reviewers (procurement officer etc): gate on approval status
  if (!canReview && status !== "approved") {
    const rejected = status === "rejected"
    const waitMsg =
      status === "pending" ? { head: "Awaiting Factory Admin review", body: "This quotation is pending Factory Admin approval." }
      : status === "pending_chief" ? { head: "Awaiting Chief review", body: "This external (Bamboosa) quotation is pending Chief approval." }
      : { head: "Awaiting CEO approval", body: "This quotation has cleared the first approval — awaiting final CEO sign-off before it can be printed." }
    return (
      <div style={{ maxWidth: 560, margin: "60px auto", textAlign: "center", padding: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: rejected ? "#C0392B" : "#8a6d00", marginBottom: 8 }}>
          {rejected ? "This quotation was rejected" : waitMsg.head}
        </div>
        <p style={{ color: "#6b6353", fontSize: 14 }}>
          {rejected ? (rejectionReason || "This quotation was rejected.") : waitMsg.body}
        </p>
        <Link href="/admin/quotations" style={{ display: "inline-block", marginTop: 18, color: DOC_GREEN, fontWeight: 600, textDecoration: "none" }}>← Back to Quotations</Link>
      </div>
    )
  }

  const bannerText =
    status === "rejected" ? `Rejected — ${rejectionReason || "no reason given"}`
    : status === "pending" ? "Awaiting Factory Admin review — not yet approved."
    : status === "pending_chief" ? "Awaiting Chief review — not yet approved."
    : status === "exec_approved" ? "Factory Admin approved — awaiting CEO final sign-off."
    : status === "chief_approved" ? "Chief approved — awaiting CEO final sign-off."
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
      <Link href="/admin/quotations" style={{ color: DOC_GREEN, fontWeight: 600, textDecoration: "none", marginLeft: 16, whiteSpace: "nowrap" }}>← Back</Link>
    </div>
  ) : null

  return (
    <>
      {statusBanner}
      <BrandedDoc title="QUOTATION">
        {origin === "external" && (
          <div style={{ textAlign: "center", marginBottom: 14, padding: "6px 10px", borderRadius: 8, background: "#F0F4EC", color: "#3F5E2E", fontSize: 12.5, fontWeight: 700, letterSpacing: 0.3 }}>
            Bamboosa — in partnership with Beeyond Trees
          </div>
        )}
        {(status === "approved" || amended) && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {status === "approved" && <span style={{ background: DOC_GREEN, color: "white", fontSize: 11, fontWeight: 700, padding: "3px 11px", borderRadius: 999 }}>Approved</span>}
            {amended && <span style={{ background: "#ccfbf1", color: "#0F766E", fontSize: 11, fontWeight: 700, padding: "3px 11px", borderRadius: 999 }}>Amended</span>}
          </div>
        )}

        <QuotationBody quotation={quotation} />
        <AttachmentBlock url={attachmentUrl} />
      </BrandedDoc>

      {status === "approved" && (
        <>
          <div className="no-print" style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
            <DocEmailButton endpoint={`/api/quotations/${quotation.id}/email`} defaultEmail={recipientEmail ?? ""} label="Email Quotation" />
          </div>
          <Suspense fallback={null}>
            <DocPrintControls backHref="/admin/quotations" backLabel="Back to Quotations" />
          </Suspense>
        </>
      )}
      {canReview && status !== "approved" && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <Link href="/admin/quotations" style={{ color: DOC_GREEN, fontWeight: 600, textDecoration: "none" }}>← Back to Quotations</Link>
        </div>
      )}
    </>
  )
}
