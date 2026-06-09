import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from '@prisma/client'
import bcrypt from "bcryptjs"

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL! } }
})

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
    return NextResponse.json({ success: true, user: { id: user.id, name: user.name, role: user.role } })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
