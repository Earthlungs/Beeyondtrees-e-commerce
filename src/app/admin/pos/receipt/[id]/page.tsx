import { Suspense } from "react"
import Link from "next/link"
import { prisma } from "@/lib/db"
import BrandedDoc, { DOC_GREEN } from "@/components/admin/BrandedDoc"
import DocEmailButton from "@/components/admin/DocEmailButton"
import ReceiptBody from "@/components/documents/ReceiptBody"
import PrintControls from "./print-controls"

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } })

  if (!order) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#A89F91" }}>
        Receipt not found. <Link href="/admin/pos" style={{ color: DOC_GREEN }}>Back to till</Link>
      </div>
    )
  }

  return (
    <>
      <BrandedDoc title="RECEIPT">
        <ReceiptBody order={order} />
      </BrandedDoc>

      <div className="no-print" style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
        <DocEmailButton endpoint={`/api/pos/sale/${order.id}/email`} defaultEmail={order.customerEmail ?? ""} label="Email receipt" />
      </div>

      <Suspense fallback={null}>
        <PrintControls />
      </Suspense>
    </>
  )
}
