import { prisma } from "@/lib/db"
import BrandedDoc from "@/components/admin/BrandedDoc"
import InvoiceBody from "@/components/documents/InvoiceBody"
import PublicDocControls from "@/components/documents/PublicDocControls"
import { verifyDoc } from "@/lib/doc-token"
import InvalidLink from "@/components/documents/InvalidLink"

// Public, login-free invoice view emailed to clients. Access is gated by the
// signed `?t=` token, not by auth — see src/lib/doc-token.ts.
export default async function PublicInvoicePage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ t?: string }>
}) {
  const { id } = await params
  const { t } = await searchParams
  if (!verifyDoc("invoice", id, t)) return <InvalidLink />

  const invoice = await prisma.invoice.findUnique({ where: { id } })
  if (!invoice) return <InvalidLink message="This invoice could not be found." />

  return (
    <div style={{ minHeight: "100vh", background: "#ECE6DC" }}>
      <PublicDocControls title={`Invoice ${invoice.number}`} />
      <div style={{ padding: "24px 12px 48px" }}>
        <BrandedDoc title="INVOICE">
          <InvoiceBody invoice={invoice} />
        </BrandedDoc>
      </div>
    </div>
  )
}
