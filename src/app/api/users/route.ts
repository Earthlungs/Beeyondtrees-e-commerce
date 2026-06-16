import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { requireRole, isAdminish } from "@/lib/authz"

const ROLES = new Set([
  "admin", "merchant", "cashier", "it_specialist",
  // Traceability pipeline roles (see src/lib/tracing-stages.ts)
  "factory_manager", "executive", "procurement_officer", "quality_inspector",
  "requisition_officer", "agribusiness_manager", "production_officer",
  "dispatch_officer", "receiving_officer",
])
const EMAIL_DOMAIN = "earthlungs.org"
const ADMINISH = ["admin", "it_specialist"]
const select = { id: true, username: true, name: true, role: true, active: true, email: true, phone: true, image: true, mustChangePassword: true, createdAt: true }

// User management — admin or IT Specialist (IT has full control).
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ADMINISH)
  if (auth instanceof NextResponse) return auth
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" }, select })
  return NextResponse.json(users, { headers: { "Cache-Control": "no-store" } })
}

// Find a free username from a base (first name), suffixing 2,3… on collision.
async function freeUsername(base: string): Promise<string> {
  const slug = base.trim().toLowerCase().replace(/\s+/g, "")
  for (let i = 1; i <= 50; i++) {
    const candidate = i === 1 ? slug : `${slug}${i}`
    const taken = await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } })
    if (!taken) return candidate
  }
  throw new Error("Could not allocate a username")
}

// Create a staff account. Two shapes:
//  • Provisioning (IT convention): { firstName, phone, role } → username = first
//    name, email = firstname@earthlungs.org, password = phone, must change on
//    first login.
//  • Classic: { username, name, password, role }.
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ADMINISH)
  if (auth instanceof NextResponse) return auth
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 })

  const role = ROLES.has(body.role) ? body.role : "merchant"

  try {
    // Provisioning mode
    if (body.firstName?.trim()) {
      const firstName = body.firstName.trim()
      const phone = String(body.phone ?? "").trim()
      if (phone.length < 6) {
        return NextResponse.json({ error: "A valid phone number is required (it becomes the initial password)." }, { status: 400 })
      }
      const username = await freeUsername(firstName)
      const user = await prisma.user.create({
        data: {
          username,
          name: firstName,
          email: `${username}@${EMAIL_DOMAIN}`,
          phone,
          password: await bcrypt.hash(phone, 10),
          role,
          mustChangePassword: true,
        },
        select,
      })
      return NextResponse.json(user, { status: 201 })
    }

    // Classic mode
    if (!body.username?.trim() || !body.name?.trim() || !body.password) {
      return NextResponse.json({ error: "Username, name and password are required." }, { status: 400 })
    }
    if (String(body.password).length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 })
    }
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
      return NextResponse.json({ error: "That username or email is already taken." }, { status: 409 })
    }
    console.error("User create failed:", e)
    return NextResponse.json({ error: "Could not create the user." }, { status: 500 })
  }
}

// Block / reactivate / change role / reset password.
export async function PATCH(request: NextRequest) {
  const auth = await requireRole(request, ADMINISH)
  if (auth instanceof NextResponse) return auth
  const body = await request.json().catch(() => null)
  if (!body?.id) return NextResponse.json({ error: "Missing user id." }, { status: 400 })

  // Guard against self-lockout: can't block or demote your own (super) account.
  const selfId = (auth.token.sub as string | undefined) ?? (auth.token as { id?: string }).id
  const selfRole = (auth.token as { role?: string }).role
  if (body.id === selfId && (body.active === false || (body.role && !isAdminish(body.role) && isAdminish(selfRole)))) {
    return NextResponse.json({ error: "You can't block or demote your own account." }, { status: 400 })
  }

  const data: { active?: boolean; role?: string; password?: string; mustChangePassword?: boolean } = {}
  if (typeof body.active === "boolean") data.active = body.active
  if (body.role && ROLES.has(body.role)) data.role = body.role
  if (body.password) {
    if (String(body.password).length < 6) return NextResponse.json({ error: "Password too short." }, { status: 400 })
    data.password = await bcrypt.hash(String(body.password), 10)
    data.mustChangePassword = true // admin/IT reset → force the user to change it
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

// Permanently delete a staff account — admin or IT Specialist only. Hard delete;
// User has no FK relations (messages/orders use read-only links), so this is safe.
export async function DELETE(request: NextRequest) {
  const auth = await requireRole(request, ADMINISH)
  if (auth instanceof NextResponse) return auth
  const body = await request.json().catch(() => null)
  if (!body?.id) return NextResponse.json({ error: "Missing user id." }, { status: 400 })

  // Can't delete your own account (avoids locking yourself out).
  const selfId = (auth.token.sub as string | undefined) ?? (auth.token as { id?: string }).id
  if (body.id === selfId) {
    return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 })
  }

  try {
    await prisma.user.delete({ where: { id: body.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "That user no longer exists." }, { status: 404 })
    }
    console.error("User delete failed:", e)
    return NextResponse.json({ error: "Could not delete the user." }, { status: 500 })
  }
}
