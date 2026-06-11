import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      )
    }
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      )
    }
    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, role: user.role },
    })
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to sign in. Please try again." },
      { status: 500 }
    )
  }
}
