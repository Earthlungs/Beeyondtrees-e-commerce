import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"

const VIEW_ROLES = ["fungiculturist", "admin", "it_specialist", "assistant_ceo"]

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 })

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = String(body.name).trim()
  if (body.active !== undefined) data.active = !!body.active

  try {
    const grainType = await prisma.grainType.update({ where: { id }, data })
    return NextResponse.json(grainType)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "This grain type already exists." }, { status: 409 })
    }
    console.error("Grain type update failed:", e)
    return NextResponse.json({ error: "Could not update the grain type." }, { status: 500 })
  }
}
