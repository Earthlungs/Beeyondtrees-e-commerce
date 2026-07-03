import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { prisma } from "@/lib/db"
import { requireDocRole } from "@/lib/docs"

const BASE_URL = process.env.NEXTAUTH_URL || "https://www.beeyondtrees.org"
// Vercel serverless bodies cap at ~4.5MB — stay under it.
const MAX_BYTES = 4 * 1024 * 1024

// Upload a PDF attachment for an LPO/Quotation. Stored in Postgres because
// this Cloudinary plan blocks PDF delivery (images still go to Cloudinary,
// straight from the browser). Returns the URL to save as `attachmentUrl`.
export async function POST(request: NextRequest) {
  const auth = await requireDocRole(request)
  if (auth instanceof NextResponse) return auth

  const form = await request.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 })
  }
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name)
  if (!isPdf) {
    return NextResponse.json({ error: "Only PDF files are accepted here — images upload directly." }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "PDF is too large — maximum 4 MB." }, { status: 400 })
  }

  const buf = Buffer.from(await file.arrayBuffer())
  const id = randomUUID().replace(/-/g, "")
  try {
    await prisma.docAttachment.create({
      data: { id, filename: file.name || "attachment.pdf", mime: "application/pdf", data: buf },
    })
    return NextResponse.json({ url: `${BASE_URL}/api/attachments/${id}.pdf` }, { status: 201 })
  } catch (e) {
    console.error("Attachment upload failed:", e)
    return NextResponse.json({ error: "Could not save the PDF. Please try again." }, { status: 500 })
  }
}
