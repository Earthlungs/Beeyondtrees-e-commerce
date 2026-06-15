import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/db"
import { isAdminish } from "@/lib/authz"

// Bulk in-app message: Admin / IT Specialist sends one message to many staff at
// once (a fan-out of Message rows). Body: { toUserIds: string[] | "all", body }.
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = (token as { role?: string }).role
  if (!isAdminish(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const me = (token.sub as string | undefined) ?? (token as { id?: string }).id
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const data = await request.json().catch(() => null)
  const text = String(data?.body ?? "").trim()
  if (!text) return NextResponse.json({ error: "Message is required." }, { status: 400 })
  if (text.length > 4000) return NextResponse.json({ error: "Message too long." }, { status: 400 })

  // Resolve recipients: an explicit id list, or "all" active users (minus me).
  let ids: string[]
  if (data?.toUserIds === "all") {
    const users = await prisma.user.findMany({ where: { active: true, NOT: { id: me } }, select: { id: true } })
    ids = users.map((u) => u.id)
  } else if (Array.isArray(data?.toUserIds)) {
    ids = [...new Set((data.toUserIds as unknown[]).map((x) => String(x)))].filter((id) => id && id !== me)
  } else {
    return NextResponse.json({ error: "No recipients selected." }, { status: 400 })
  }
  if (ids.length === 0) return NextResponse.json({ error: "No recipients selected." }, { status: 400 })

  await prisma.message.createMany({
    data: ids.map((toUserId) => ({ fromUserId: me, toUserId, body: text })),
  })
  return NextResponse.json({ sent: ids.length }, { status: 201 })
}
