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
    const { username, password } = await request.json()
    
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) {
      return NextResponse.json({ success: false, error: "Invalid username or password" }, { status: 401 })
    }
    
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return NextResponse.json({ success: false, error: "Invalid username or password" }, { status: 401 })
    }
    
    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, username: user.username, role: user.role }
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Login failed" }, { status: 500 })
  }
}
