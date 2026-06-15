import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/db"

// Self-service account: any signed-in user changes their own password / avatar.
async function me(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return null
  const id = (token.sub as string | undefined) ?? (token as { id?: string }).id
  return id ?? null
}

export async function GET(request: NextRequest) {
  const id = await me(request)
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, name: true, email: true, phone: true, image: true, role: true, mustChangePassword: true, theme: true },
  })
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(user, { headers: { "Cache-Control": "no-store" } })
}

// PATCH { currentPassword?, newPassword?, image? }
export async function PATCH(request: NextRequest) {
  const id = await me(request)
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const data: { password?: string; mustChangePassword?: boolean; image?: string | null; theme?: string } = {}

  if (body.theme === "system" || body.theme === "dark" || body.theme === "light") {
    data.theme = body.theme
  }

  if (body.newPassword) {
    if (String(body.newPassword).length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters." }, { status: 400 })
    }
    // Verify the current password unless the account was flagged to change it
    // (first login) — in which case the temp/phone password is what they have.
    if (!user.mustChangePassword) {
      const ok = body.currentPassword && (await bcrypt.compare(String(body.currentPassword), user.password))
      if (!ok) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 })
    }
    data.password = await bcrypt.hash(String(body.newPassword), 10)
    data.mustChangePassword = false
  }

  if (typeof body.image === "string" || body.image === null) {
    data.image = body.image || null
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nothing to update." }, { status: 400 })

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, image: true, mustChangePassword: true, theme: true },
  })
  return NextResponse.json(updated)
}
