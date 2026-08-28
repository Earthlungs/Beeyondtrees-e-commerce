import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Serve a stored PDF attachment. No login required — the 32-char random id is
// unguessable, the same security class as the Cloudinary URLs used for images
// (and the emailed/public doc pages need it to work without a session).
// `?download=1` forces a file download instead of inline viewing.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params
  // PDFs are served as <id>.pdf; captured farmer thumbprints as <id>.png/.jpg.
  // The extension is cosmetic — the stored `mime` is what is actually sent.
  const id = rawId.replace(/\.(pdf|png|jpe?g)$/i, "")

  const att = await prisma.docAttachment.findUnique({ where: { id } })
  if (!att) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const download = request.nextUrl.searchParams.get("download") === "1"
  const filename = (att.filename || "attachment.pdf").replace(/[^\w. -]/g, "_")
  return new NextResponse(Buffer.from(att.data), {
    headers: {
      "Content-Type": att.mime || "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
