import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/db"

// In-app 1:1 chat for any signed-in staff member. Polled by the chat UI.
async function meId(request: NextRequest): Promise<string | null> {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return null
  return (token.sub as string | undefined) ?? (token as { id?: string }).id ?? null
}

// GET            → contact list (everyone else) + my unread counts per sender
// GET ?with=<id> → the thread with <id>, and marks their messages to me as read
export async function GET(request: NextRequest) {
  const me = await meId(request)
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Every poll updates the caller's "last seen" — cheap presence tracking.
  prisma.user.update({ where: { id: me }, data: { lastSeenAt: new Date() } }).catch(() => {})

  // Lightweight total-unread count for the sidebar "Chat" badge.
  if (request.nextUrl.searchParams.get("count")) {
    const total = await prisma.message.count({ where: { toUserId: me, readAt: null } })
    return NextResponse.json({ total }, { headers: { "Cache-Control": "no-store" } })
  }

  const withId = request.nextUrl.searchParams.get("with")

  if (withId) {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { fromUserId: me, toUserId: withId },
          { fromUserId: withId, toUserId: me },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    })
    await prisma.message.updateMany({
      where: { fromUserId: withId, toUserId: me, readAt: null },
      data: { readAt: new Date() },
    })
    return NextResponse.json({ messages }, { headers: { "Cache-Control": "no-store" } })
  }

  const [users, unread] = await Promise.all([
    prisma.user.findMany({
      where: { active: true, NOT: { id: me } },
      select: { id: true, name: true, role: true, image: true, lastSeenAt: true },
      orderBy: { name: "asc" },
    }),
    prisma.message.groupBy({
      by: ["fromUserId"],
      where: { toUserId: me, readAt: null },
      _count: { _all: true },
    }),
  ])
  const unreadMap = new Map(unread.map((u) => [u.fromUserId, u._count._all]))
  const contacts = users.map((u) => ({ ...u, unread: unreadMap.get(u.id) ?? 0 }))
  return NextResponse.json({ contacts }, { headers: { "Cache-Control": "no-store" } })
}

// POST { toUserId, body }
export async function POST(request: NextRequest) {
  const me = await meId(request)
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await request.json().catch(() => null)
  const text = String(body?.body ?? "").trim()
  const toUserId = String(body?.toUserId ?? "")
  if (!toUserId || !text) return NextResponse.json({ error: "Recipient and message are required." }, { status: 400 })
  if (text.length > 4000) return NextResponse.json({ error: "Message too long." }, { status: 400 })

  const message = await prisma.message.create({
    data: { fromUserId: me, toUserId, body: text },
  })
  return NextResponse.json({ message }, { status: 201 })
}
