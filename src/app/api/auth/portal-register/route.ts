import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from "bcryptjs"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

export async function POST(request: NextRequest) {
  try {
    const { username, password, name, email, phone } = await request.json()
    
    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json({ success: false, error: "Username already taken" }, { status: 400 })
    }
    
    const hashedPassword = await bcrypt.hash(password, 10)
    await prisma.user.create({
      data: { username, password: hashedPassword, name, role: "customer" }
    })
    
    return NextResponse.json({ success: true, message: "Account created" })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Registration failed" }, { status: 500 })
  }
}
