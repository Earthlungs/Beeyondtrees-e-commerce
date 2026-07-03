// Client-safe helpers for LPO/Quotation attachments. Images are Cloudinary
// URLs; PDFs are stored in Postgres and served by /api/attachments/[id].pdf.
export function isPdfUrl(url: string | null | undefined): boolean {
  return typeof url === "string" && /\.pdf(\?|$)/i.test(url)
}

// Force a browser download instead of inline viewing.
export function pdfDownloadUrl(url: string): string {
  return url.includes("?") ? `${url}&download=1` : `${url}?download=1`
}
