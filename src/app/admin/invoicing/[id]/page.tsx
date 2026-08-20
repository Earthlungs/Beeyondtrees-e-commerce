import { Suspense } from "react"
import Link from "next/link"
import { prisma } from "@/lib/db"
import BrandedDoc, { DOC_GREEN } from "@/components/admin/BrandedDoc"
import DocPrintControls from "@/components/admin/DocPrintControls"
import DocEmailButton from "@/components/admin/DocEmailButton"
import InvoiceBody, { type InvoiceRecord } from "@/components/documents/InvoiceBody"
import { isMissingColumn } from "@/lib/docs"

// Read the invoice, tolerating a database where the payment-tracking columns
// from prisma/migrate-ops-2026-08.sql don't exist yet: the document itself
// predates them, so it should still print.
async function loadInvoice(id: string): Promise<InvoiceRecord | null> {
  try {
    return await prisma.invoice.findUnique({ where: { id } })
  } catch (e) {
    if (!isMissingColumn(e)) throw e
    const rows = await prisma.$queryRaw<InvoiceRecord[]>`
      SELECT id, number, date, "dueDate", "customerName", "customerContact",
             items, subtotal, vat, total, notes
        FROM "Invoice" WHERE id = ${id}
    `
    return rows[0] ?? null
  }
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const invoice = await loadInvoice(id)
  if (!invoice) {
    return <div style={{ padding: 40, textAlign: "center", color: "#A89F91" }}>Invoice not found. <Link href="/admin/invoicing" style={{ color: DOC_GREEN }}>Back</Link></div>
  }
  // Prefill the email box with the customer's contact if it looks like an address.
  const defaultEmail = invoice.customerContact && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invoice.customerContact)
    ? invoice.customerContact : ""

  return (
    <>
      <BrandedDoc title="INVOICE">
        <InvoiceBody invoice={invoice} />
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
