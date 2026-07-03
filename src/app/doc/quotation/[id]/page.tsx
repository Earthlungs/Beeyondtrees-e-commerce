import { prisma } from "@/lib/db"
import BrandedDoc from "@/components/admin/BrandedDoc"
import QuotationBody from "@/components/documents/QuotationBody"
import AttachmentBlock from "@/components/documents/AttachmentBlock"
import PublicDocControls from "@/components/documents/PublicDocControls"
import { verifyDoc } from "@/lib/doc-token"
import InvalidLink from "@/components/documents/InvalidLink"

// Public, login-free quotation view emailed to suppliers. Gated by the signed
// `?t=` token. Only fully-approved quotations are ever shown publicly.
export default async function PublicQuotationPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ t?: string }>
}) {
  const { id } = await params
  const { t } = await searchParams
  if (!verifyDoc("quotation", id, t)) return <InvalidLink />

  const quotation = await prisma.quotation.findUnique({ where: { id } })
  if (!quotation) return <InvalidLink message="This quotation could not be found." />
  if (quotation.status !== "approved") {
    return <InvalidLink message="This quotation is not yet available." />
  }

  return (
    <div style={{ minHeight: "100vh", background: "#ECE6DC" }}>
      <PublicDocControls title={`Quotation ${quotation.number}`} />
      <div style={{ padding: "24px 12px 48px" }}>
        <BrandedDoc title="QUOTATION">
          <QuotationBody quotation={quotation} />
          <AttachmentBlock url={quotation.attachmentUrl} />
        </BrandedDoc>
      </div>
    </div>
  )
}
