import { prisma } from "@/lib/db"
import BrandedDoc from "@/components/admin/BrandedDoc"
import ReceiptBody from "@/components/documents/ReceiptBody"
import PublicDocControls from "@/components/documents/PublicDocControls"
import { verifyDoc } from "@/lib/doc-token"
import InvalidLink from "@/components/documents/InvalidLink"

// Public, login-free receipt view emailed to customers. Gated by the signed
// `?t=` token.
export default async function PublicReceiptPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ t?: string }>
}) {
  const { id } = await params
  const { t } = await searchParams
  if (!verifyDoc("receipt", id, t)) return <InvalidLink />

  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } })
  if (!order) return <InvalidLink message="This receipt could not be found." />

  return (
    <div style={{ minHeight: "100vh", background: "#ECE6DC" }}>
      <PublicDocControls title={`Receipt ${order.id.slice(-8).toUpperCase()}`} />
      <div style={{ padding: "24px 12px 48px" }}>
        <BrandedDoc title="RECEIPT">
          <ReceiptBody order={order} />
        </BrandedDoc>
      </div>
    </div>
  )
}
