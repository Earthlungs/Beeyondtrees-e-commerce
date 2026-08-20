import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"

const VIEW_ROLES = ["fungiculturist", "admin", "it_specialist", "assistant_ceo"]

// Full batch with every stage record — drives the stepper detail page.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth
  const { id } = await params

  const batch = await prisma.fungiBatch.findUnique({
    where: { id },
    include: { substrate: true, incubation: true, harvests: { orderBy: { flushNumber: "asc" } }, dehydration: true },
  })
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(batch, { headers: { "Cache-Control": "no-store" } })
}
