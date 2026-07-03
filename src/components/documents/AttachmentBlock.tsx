import { FileText, Download } from "lucide-react"
import { isPdfUrl, pdfDownloadUrl } from "@/lib/attachments"

// Attachment section on a branded LPO/Quotation document. Images render
// inline (and print); PDFs render as a view + download card.
export default function AttachmentBlock({ url }: { url: string | null }) {
  if (!url) return null
  return (
    <div style={{ marginTop: 30 }}>
      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>Attachment</div>
      {isPdfUrl(url) ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid #EEE", borderRadius: 10, padding: "12px 16px", background: "#FAFAF8" }}>
          <FileText size={26} color="#C0392B" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>PDF document</div>
            <div style={{ fontSize: 12, color: "#777" }}>Attached to this document</div>
          </div>
          <a href={url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12.5, fontWeight: 700, color: "#6B7D5C", textDecoration: "none", padding: "6px 12px", border: "1px solid #6B7D5C", borderRadius: 8, whiteSpace: "nowrap" }}>
            View PDF
          </a>
          <a href={pdfDownloadUrl(url)}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, color: "white", background: "#6B7D5C", textDecoration: "none", padding: "6px 12px", borderRadius: 8, whiteSpace: "nowrap" }}>
            <Download size={13} /> Download
          </a>
        </div>
      ) : (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Attachment" style={{ maxWidth: "100%", maxHeight: 420, borderRadius: 8, border: "1px solid #EEE" }} />
        </a>
      )}
    </div>
  )
}
