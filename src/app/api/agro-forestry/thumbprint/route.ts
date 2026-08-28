import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"

const BASE_URL = process.env.NEXTAUTH_URL || "https://www.beeyondtrees.org"
const VIEW_ROLES = ["admin", "it_specialist", "assistant_ceo"]
// A thumbprint PNG off the capture pad is a few tens of KB; a phone photo of an
// inked print can be larger. Cap well under the ~4.5MB serverless body limit.
const MAX_BYTES = 3 * 1024 * 1024

// Store a captured thumbprint image and hand back its URL. Reuses the existing
// DocAttachment table (bytes in Postgres) rather than Cloudinary, so the mark
// lives in the same database as the contract record that references it and is
// never served from a third party.
//
// POST { dataUrl: "data:image/png;base64,..." } → { url }
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const body = await request.json().catch(() => null)
  const dataUrl = typeof body?.dataUrl === "string" ? body.dataUrl : ""

  const match = dataUrl.match(/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/)
  if (!match) {
    return NextResponse.json(
      { error: "Expected a PNG or JPEG thumbprint image." },
      { status: 400 }
    )
  }

  const [, subtype, b64] = match
  const buf = Buffer.from(b64, "base64")
  if (buf.length === 0) {
    return NextResponse.json({ error: "The thumbprint image was empty." }, { status: 400 })
  }
  if (buf.length > MAX_BYTES) {
    return NextResponse.json({ error: "That image is too large — maximum 3 MB." }, { status: 400 })
  }

  const ext = subtype === "png" ? "png" : "jpg"
  const id = randomUUID().replace(/-/g, "")
  try {
    await prisma.docAttachment.create({
      data: {
        id,
        filename: `thumbprint.${ext}`,
        mime: `image/${subtype}`,
        data: buf,
      },
    })
    return NextResponse.json({ url: `${BASE_URL}/api/attachments/${id}.${ext}` }, { status: 201 })
  } catch (e) {
    console.error("Thumbprint save failed:", e)
    return NextResponse.json({ error: "Could not save the thumbprint. Please try again." }, { status: 500 })
  }
}
