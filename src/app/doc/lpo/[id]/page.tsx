import { prisma } from "@/lib/db"
import BrandedDoc from "@/components/admin/BrandedDoc"
import LpoBody from "@/components/documents/LpoBody"
import PublicDocControls from "@/components/documents/PublicDocControls"
import { verifyDoc } from "@/lib/doc-token"
import InvalidLink from "@/components/documents/InvalidLink"

// Public, login-free LPO view emailed to suppliers. Gated by the signed `?t=`
// token. Only fully-approved LPOs are ever shown publicly.
export default async function PublicLpoPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ t?: string }>
}) {
  const { id } = await params
  const { t } = await searchParams
  if (!verifyDoc("lpo", id, t)) return <InvalidLink />

  const lpo = await prisma.lpo.findUnique({ where: { id } })
  if (!lpo) return <InvalidLink message="This purchase order could not be found." />

  // status/destinationOfGoods are raw columns. Treat missing columns as approved.
  let status: string | null = "approved"
  let destinationOfGoods: string | null = null
  try {
    const rows = await prisma.$queryRaw<{ status: string; destinationOfGoods: string | null }[]>`
      SELECT status, "destinationOfGoods" FROM "Lpo" WHERE id = ${id}
    `
    if (rows[0]) { status = rows[0].status; destinationOfGoods = rows[0].destinationOfGoods }
  } catch { /* pre-migration — treat as approved */ }

  if (status && status !== "approved") {
    return <InvalidLink message="This purchase order is not yet available." />
  }

  return (
    <div style={{ minHeight: "100vh", background: "#ECE6DC" }}>
      <PublicDocControls title={`Purchase Order ${lpo.number}`} />
      <div style={{ padding: "24px 12px 48px" }}>
        <BrandedDoc title="PURCHASE ORDER">
          <LpoBody lpo={lpo} destinationOfGoods={destinationOfGoods} />
        </BrandedDoc>
      </div>
    </div>
  )
}
