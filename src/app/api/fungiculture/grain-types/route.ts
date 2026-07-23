import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"

const VIEW_ROLES = ["fungiculturist", "admin", "it_specialist", "assistant_ceo"]

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const grainTypes = await prisma.grainType.findMany({ orderBy: { name: "asc" } })
  return NextResponse.json(grainTypes, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, VIEW_ROLES)
  if (auth instanceof NextResponse) return auth

  const body = await request.json().catch(() => null)
  const name = body?.name?.trim()
  if (!name) return NextResponse.json({ error: "Enter a grain type name." }, { status: 400 })

  try {
    const grainType = await prisma.grainType.create({ data: { name } })
    return NextResponse.json(grainType, { status: 201 })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "This grain type already exists." }, { status: 409 })
    }
    console.error("Grain type create failed:", e)
    return NextResponse.json({ error: "Could not create the grain type." }, { status: 500 })
  }
}
