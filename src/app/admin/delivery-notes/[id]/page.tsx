import { Suspense } from "react"
import Link from "next/link"
import { prisma } from "@/lib/db"
import BrandedDoc, { DOC_GREEN } from "@/components/admin/BrandedDoc"
import DocPrintControls from "@/components/admin/DocPrintControls"
import DocEmailButton from "@/components/admin/DocEmailButton"
import DeliveryNoteBody from "@/components/documents/DeliveryNoteBody"
import AttachmentBlock from "@/components/documents/AttachmentBlock"

// A delivery note has no approval chain, so there is no status gate here — if
// it exists it is a finished document and can be printed or emailed.
export default async function DeliveryNoteDocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const note = await prisma.deliveryNote.findUnique({ where: { id } })
  if (!note) {
    return <div style={{ padding: 40, textAlign: "center", color: "#A89F91" }}>Delivery note not found. <Link href="/admin/delivery-notes" style={{ color: DOC_GREEN }}>Back</Link></div>
  }

  return (
    <>
      <BrandedDoc title="DELIVERY NOTE">
        <DeliveryNoteBody note={note} />
        <AttachmentBlock url={note.attachmentUrl} />
      </BrandedDoc>

      <div className="no-print" style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
        <DocEmailButton endpoint={`/api/delivery-notes/${note.id}/email`} defaultEmail={note.recipientEmail ?? ""} label="Email Delivery Note" />
      </div>
      <Suspense fallback={null}>
        <DocPrintControls backHref="/admin/delivery-notes" backLabel="Back to Delivery Notes" />
      </Suspense>
    </>
  )
}
