import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"

// Returns one product image as raw binary so cards can <img loading="lazy">
// them individually — keeping the catalog JSON tiny. `?i=N` selects the Nth
// image (default 0). Cached aggressively since image bytes never change.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const i = Number(new URL(_req.url).searchParams.get("i") ?? "0") || 0

  const product = await prisma.product.findUnique({
    where: { id },
    select: { images: true },
  })
  const images = (product?.images as string[] | undefined) ?? []
  const image = images[i]
  if (!image) return new Response(null, { status: 404 })

  // Cloudinary (or any hosted) URL — redirect so the browser/CDN serves it
  // directly. Legacy base64 data-URIs are decoded to binary inline.
  if (/^https?:\/\//.test(image)) {
    return new Response(null, {
      status: 308,
      headers: {
        Location: image,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  }

  const match = image.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return new Response(null, { status: 404 })

  const [, contentType, b64] = match
  return new Response(Buffer.from(b64, "base64"), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
