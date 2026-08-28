import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"
import { isMissingColumn } from "@/lib/docs"

const VIEW_ROLES = ["admin", "it_specialist", "assistant_ceo"]

import { sealCode, type Contract } from "@/lib/contract-signature"

// One farmer with their full handover history, for the detail drawer.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const farmerId = Number(id)
  if (!Number.isInteger(farmerId)) return NextResponse.json({ error: "Invalid farmer id." }, { status: 400 })

  const farmer = await prisma.farmer.findUnique({
    where: { id: farmerId },
    include: {
      disbursements: {
        orderBy: { disbursementDate: "desc" },
        include: {
          beehives: { select: { id: true, beehive: { select: { id: true, beehiveId: true, beehiveType: true } } } },
          seedlings: { select: { id: true, quantity: true, seedling: { select: { id: true, seedlingSpicies: true } } } },
        },
      },
    },
  })
  if (!farmer) return NextResponse.json({ error: "Farmer not found." }, { status: 404 })

  return NextResponse.json(farmer, { headers: { "Cache-Control": "no-store" } })
}

// Replace the farmer's contract list — the whole array, so the client can add
// or remove an agreement with one call. Each entry keeps who filed it and when,
// because "is this farmer under contract, and since when" is the question the
// list exists to answer.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const farmerId = Number(id)
  if (!Number.isInteger(farmerId)) return NextResponse.json({ error: "Invalid farmer id." }, { status: 400 })

  const body = await request.json().catch(() => null)
  if (!body || !Array.isArray(body.contracts)) {
    return NextResponse.json({ error: "Expected a contracts list." }, { status: 400 })
  }

  const actor = (auth.token as { name?: string }).name ?? "Staff"
  const now = new Date().toISOString()
  const contracts: Contract[] = body.contracts
    .map((raw: unknown) => {
      const c = raw as Partial<Contract>
      const url = typeof c.url === "string" ? c.url.trim() : ""
      if (!/^(https?:\/\/|\/api\/attachments\/)/.test(url)) return null
      // The farmer's thumbprint, if one has been captured for this agreement.
      // Only accept a URL we serve ourselves — this is what gets stamped into
      // the PDF footer, so it must never point at somewhere arbitrary.
      const thumb = typeof c.thumbprintUrl === "string" ? c.thumbprintUrl.trim() : ""
      const thumbprintUrl = /^(https?:\/\/[^/]+)?\/api\/attachments\//.test(thumb) ? thumb : undefined
      const signedAt = thumbprintUrl
        ? (typeof c.signedAt === "string" && c.signedAt ? c.signedAt : now)
        : undefined

      return {
        url,
        filename: (typeof c.filename === "string" && c.filename.trim()) || url.split("/").pop() || "contract",
        // Keep the original filing details on an entry that already has them;
        // only newly added ones get stamped with this user and this moment.
        uploadedAt: typeof c.uploadedAt === "string" && c.uploadedAt ? c.uploadedAt : now,
        uploadedBy: typeof c.uploadedBy === "string" && c.uploadedBy ? c.uploadedBy : actor,
        ...(thumbprintUrl
          ? {
              thumbprintUrl,
              signedAt,
              signerName: typeof c.signerName === "string" && c.signerName.trim() ? c.signerName.trim() : undefined,
              // The officer present when the farmer put their thumb down. Taken
              // from the session, never from the client.
              witnessedBy: typeof c.witnessedBy === "string" && c.witnessedBy ? c.witnessedBy : actor,
              seal: sealCode(thumbprintUrl, signedAt!),
            }
          : {}),
      }
    })
    .filter((c: Contract | null): c is Contract => c !== null)

  try {
    const farmer = await prisma.farmer.update({
      where: { id: farmerId },
      data: { contracts: contracts as unknown as Prisma.InputJsonValue },
      select: { id: true, contracts: true },
    })
    return NextResponse.json(farmer)
  } catch (e) {
    if (isMissingColumn(e)) {
      return NextResponse.json(
        { error: "Contract uploads aren't set up on the database yet — run prisma/migrate-ops-2026-08.sql." },
        { status: 503 }
      )
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Farmer not found." }, { status: 404 })
    }
    console.error("Farmer contract update failed:", e)
    return NextResponse.json({ error: "Could not save the contract. Please try again." }, { status: 500 })
  }
}
