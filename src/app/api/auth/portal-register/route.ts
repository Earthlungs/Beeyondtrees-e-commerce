import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { username, password, name, role } = await request.json()

    if (!username?.trim() || !password?.trim() || !name?.trim()) {
      return NextResponse.json(
        { success: false, error: "All fields are required" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    const existing = await prisma.user.findUnique({
      where: { username: username.trim() },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Username already taken" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    await prisma.user.create({
      data: {
        username: username.trim(),
        password: hashedPassword,
        name: name.trim(),
        role: role || "merchant",
      },
    })

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    console.error("Staff registration error:", e)
    return NextResponse.json(
      {
        success: false,
        error: "Unable to create account. Please try again or contact support.",
      },
      { status: 500 }
    )
  }
}
