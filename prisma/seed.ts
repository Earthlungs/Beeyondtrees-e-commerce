import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  const ap = await bcrypt.hash('Earthlungs2026', 10)
  const mp = await bcrypt.hash('merchant2024', 10)

  await prisma.user.upsert({ where: { username: 'admin' }, update: { password: ap }, create: { username: 'admin', password: ap, name: 'Administrator', role: 'admin' } })
  await prisma.user.upsert({ where: { username: 'merchant' }, update: {}, create: { username: 'merchant', password: mp, name: 'Merchant', role: 'merchant' } })
  
  console.log('Seeded! Admin password: Earthlungs2026')
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect())
