import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireDocRole } from "@/lib/docs"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDocRole(request)
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const lpo = await prisma.lpo.findUnique({ where: { id } })
  if (!lpo) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(lpo, { headers: { "Cache-Control": "no-store" } })
}
