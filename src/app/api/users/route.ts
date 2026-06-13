import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/authz"

const ROLES = new Set(["admin", "merchant", "cashier"])
const select = { id: true, username: true, name: true, role: true, active: true, createdAt: true }

// User management — admin only.
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin"])
  if (auth instanceof NextResponse) return auth
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" }, select })
  return NextResponse.json(users, { headers: { "Cache-Control": "no-store" } })
}

// Create a staff account.
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["admin"])
  if (auth instanceof NextResponse) return auth
  const body = await request.json().catch(() => null)
  if (!body?.username?.trim() || !body?.name?.trim() || !body?.password) {
    return NextResponse.json({ error: "Username, name and password are required." }, { status: 400 })
  }
  if (String(body.password).length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 })
  }
  const role = ROLES.has(body.role) ? body.role : "merchant"
  try {
    const user = await prisma.user.create({
      data: {
        username: body.username.trim(),
        name: body.name.trim(),
        password: await bcrypt.hash(String(body.password), 10),
        role,
      },
      select,
    })
    return NextResponse.json(user, { status: 201 })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "That username is already taken." }, { status: 409 })
    }
    console.error("User create failed:", e)
    return NextResponse.json({ error: "Could not create the user." }, { status: 500 })
  }
}

// Block / reactivate / change role / reset password.
export async function PATCH(request: NextRequest) {
  const auth = await requireRole(request, ["admin"])
  if (auth instanceof NextResponse) return auth
  const body = await request.json().catch(() => null)
  if (!body?.id) return NextResponse.json({ error: "Missing user id." }, { status: 400 })

  // Guard against self-lockout: an admin can't block or demote their own account.
  const selfId = (auth.token.sub as string | undefined) ?? (auth.token as { id?: string }).id
  if (body.id === selfId && (body.active === false || (body.role && body.role !== "admin"))) {
    return NextResponse.json({ error: "You can't block or demote your own account." }, { status: 400 })
  }

  const data: { active?: boolean; role?: string; password?: string } = {}
  if (typeof body.active === "boolean") data.active = body.active
  if (body.role && ROLES.has(body.role)) data.role = body.role
  if (body.password) {
    if (String(body.password).length < 6) return NextResponse.json({ error: "Password too short." }, { status: 400 })
    data.password = await bcrypt.hash(String(body.password), 10)
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nothing to update." }, { status: 400 })

  try {
    const user = await prisma.user.update({ where: { id: body.id }, data, select })
    return NextResponse.json(user)
  } catch (e) {
    console.error("User update failed:", e)
    return NextResponse.json({ error: "Could not update the user." }, { status: 500 })
  }
}
