import { NextRequest, NextResponse } from "next/server"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"
import { hasSignature, isPdfContract, type Contract } from "@/lib/contract-signature"

const VIEW_ROLES = ["admin", "it_specialist", "assistant_ceo"]

// Download a farmer's contract with the signature stamped into the footer.
//
//   GET ?i=<index in the farmer's contracts array>
//
// For a PDF, every page gets a footer band carrying the farmer's thumbprint
// image, who signed, when, the witnessing officer, and the seal code — so the
// mark travels with the file each time it is re-downloaded, which is the whole
// point. Unsigned contracts and non-PDF (photo) contracts are redirected to the
// original file untouched: there is nothing to stamp, and re-encoding somebody's
// photograph of a signed page would only degrade it.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const farmerId = Number(id)
  if (!Number.isInteger(farmerId)) {
    return NextResponse.json({ error: "Invalid farmer id." }, { status: 400 })
  }

  const index = Number(request.nextUrl.searchParams.get("i"))
  if (!Number.isInteger(index) || index < 0) {
    return NextResponse.json({ error: "Which contract? Pass ?i=<index>." }, { status: 400 })
  }

  const farmer = await prisma.farmer.findUnique({
    where: { id: farmerId },
    select: { fullname: true, idNumber: true, contracts: true },
  })
  if (!farmer) return NextResponse.json({ error: "Farmer not found." }, { status: 404 })

  const contracts = (Array.isArray(farmer.contracts) ? farmer.contracts : []) as unknown as Contract[]
  const contract = contracts[index]
  if (!contract) return NextResponse.json({ error: "Contract not found." }, { status: 404 })

  if (!hasSignature(contract) || !isPdfContract(contract)) {
    return NextResponse.redirect(new URL(contract.url, request.url))
  }

  const [pdfBytes, printBytes] = await Promise.all([
    fetchBytes(contract.url, request),
    fetchBytes(contract.thumbprintUrl!, request),
  ])
  if (!pdfBytes) {
    return NextResponse.json({ error: "The contract file could not be read." }, { status: 502 })
  }

  let stamped: Uint8Array
  try {
    stamped = await stamp(pdfBytes, printBytes, contract, farmer.fullname, farmer.idNumber)
  } catch (e) {
    console.error("Contract stamping failed:", e)
    // A malformed or encrypted PDF must not block access to the agreement —
    // hand back the original rather than failing the download outright.
    return NextResponse.redirect(new URL(contract.url, request.url))
  }

  const safeName = (contract.filename || "contract.pdf").replace(/[^\w. -]/g, "_").replace(/\.pdf$/i, "")
  return new NextResponse(Buffer.from(stamped), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}-signed.pdf"`,
      "Cache-Control": "no-store",
    },
  })
}

// Attachment URLs are absolute (they embed NEXTAUTH_URL) but resolve to this
// same deployment, so fetch them relative to the incoming request instead —
// that keeps this working on preview deployments and localhost too.
async function fetchBytes(url: string, request: NextRequest): Promise<Uint8Array | null> {
  try {
    const resolved = new URL(url, request.url)
    const res = await fetch(resolved, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return null
    return new Uint8Array(await res.arrayBuffer())
  } catch {
    return null
  }
}

const BAND_HEIGHT = 78

async function stamp(
  pdfBytes: Uint8Array,
  printBytes: Uint8Array | null,
  contract: Contract,
  farmerName: string,
  idNumber: string
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  // The captured pad produces a PNG; a photographed inked print may be a JPEG.
  let printImg = null
  if (printBytes) {
    try {
      printImg = isPng(printBytes) ? await pdf.embedPng(printBytes) : await pdf.embedJpg(printBytes)
    } catch { printImg = null }
  }

  const green = rgb(0.42, 0.49, 0.36) // #6B7D5C
  const ink = rgb(0.16, 0.16, 0.16)
  const grey = rgb(0.45, 0.45, 0.45)

  const signedOn = contract.signedAt
    ? new Date(contract.signedAt).toLocaleString("en-KE", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "—"

  for (const page of pdf.getPages()) {
    const { width } = page.getSize()

    // White band along the bottom so the stamp never sits on top of contract
    // text, with a green rule marking it off as an addition to the original.
    page.drawRectangle({ x: 0, y: 0, width, height: BAND_HEIGHT, color: rgb(1, 1, 1) })
    page.drawRectangle({ x: 0, y: BAND_HEIGHT - 2, width, height: 2, color: green })

    let textX = 24
    if (printImg) {
      const boxH = 52
      const scale = boxH / printImg.height
      const drawW = Math.min(printImg.width * scale, 64)
      page.drawImage(printImg, { x: 24, y: 12, width: drawW, height: boxH })
      textX = 24 + drawW + 14
    }

    page.drawText("THUMBPRINT SIGNATURE", {
      x: textX, y: BAND_HEIGHT - 22, size: 7.5, font: bold, color: green,
    })
    page.drawText(`${farmerName}  ·  ID ${idNumber}`, {
      x: textX, y: BAND_HEIGHT - 36, size: 9.5, font: bold, color: ink,
    })
    page.drawText(`Signed ${signedOn}${contract.witnessedBy ? `  ·  witnessed by ${contract.witnessedBy}` : ""}`, {
      x: textX, y: BAND_HEIGHT - 48, size: 7.5, font, color: grey,
    })
    page.drawText(
      `${contract.seal ?? ""}   Mark captured on BeeyondTrees and filed against this farmer's record.`,
      { x: textX, y: BAND_HEIGHT - 59, size: 7, font, color: grey }
    )
  }

  return pdf.save()
}

function isPng(bytes: Uint8Array): boolean {
  return bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
}
