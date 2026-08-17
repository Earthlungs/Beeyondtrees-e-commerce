import { prisma } from "@/lib/db"
import BrandedDoc from "@/components/admin/BrandedDoc"
import DeliveryNoteBody from "@/components/documents/DeliveryNoteBody"
import AttachmentBlock from "@/components/documents/AttachmentBlock"
import PublicDocControls from "@/components/documents/PublicDocControls"
import { verifyDoc } from "@/lib/doc-token"
import InvalidLink from "@/components/documents/InvalidLink"

// Public, login-free delivery note emailed to the supplier / receiving site.
// Gated by the signed `?t=` token, same as the LPO and invoice views.
export default async function PublicDeliveryNotePage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ t?: string }>
}) {
  const { id } = await params
  const { t } = await searchParams
  if (!verifyDoc("delivery-note", id, t)) return <InvalidLink />

  const note = await prisma.deliveryNote.findUnique({ where: { id } })
  if (!note) return <InvalidLink message="This delivery note could not be found." />

  return (
    <div style={{ minHeight: "100vh", background: "#ECE6DC" }}>
      <PublicDocControls title={`Delivery Note ${note.number}`} />
      <div style={{ padding: "24px 12px 48px" }}>
        <BrandedDoc title="DELIVERY NOTE">
          <DeliveryNoteBody note={note} />
          <AttachmentBlock url={note.attachmentUrl} />
        </BrandedDoc>
      </div>
    </div>
  )
}
