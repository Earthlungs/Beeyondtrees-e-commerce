import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"

const VIEW_ROLES = ["admin", "it_specialist", "assistant_ceo"]

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
