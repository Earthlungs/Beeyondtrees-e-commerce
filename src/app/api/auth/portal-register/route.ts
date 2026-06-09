import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from '@prisma/client'
import bcrypt from "bcryptjs"

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL! } }
})

export async function POST(request: NextRequest) {
  try {
    const { username, password, name, role } = await request.json()
    
    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json({ success: false, error: "Username already taken" }, { status: 400 })
    }
    
    const hashedPassword = await bcrypt.hash(password, 10)
    await prisma.user.create({
      data: { username, password: hashedPassword, name, role: role || "merchant" }
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Registration failed" }, { status: 500 })
  }
}
