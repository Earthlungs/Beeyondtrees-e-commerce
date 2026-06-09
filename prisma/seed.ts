import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding...')
  const adminPassword = await bcrypt.hash('beeyond2024', 10)
  const merchantPassword = await bcrypt.hash('merchant2024', 10)

  await prisma.user.upsert({ where: { username: 'admin' }, update: {}, create: { username: 'admin', password: adminPassword, name: 'Administrator', role: 'admin' } })
  await prisma.user.upsert({ where: { username: 'merchant' }, update: {}, create: { username: 'merchant', password: merchantPassword, name: 'Merchant', role: 'merchant' } })
  
  const products = [
    { name: 'Premium Honey 500g', description: 'Pure organic honey', category: 'Food', retailPrice: 850, wholesalePrice: 650, distributorPrice: 500, stock: 50, isFeatured: true },
    { name: 'Handcrafted Oak Table', description: 'Oak dining table', category: 'Furniture', retailPrice: 15000, wholesalePrice: 12000, distributorPrice: 9500, stock: 10, isFeatured: true },
    { name: 'Ceramic Vase Set', description: 'Hand-painted vases', category: 'Pottery', retailPrice: 2500, wholesalePrice: 2000, distributorPrice: 1600, stock: 25, isFeatured: true },
    { name: 'Woven Wall Hanging', description: 'Wall decor', category: 'Ornamental & Curios', retailPrice: 1800, wholesalePrice: 1400, distributorPrice: 1100, stock: 15 },
    { name: 'Organic Mushroom Kit', description: 'Grow mushrooms', category: 'Home & Living', retailPrice: 1200, wholesalePrice: 900, distributorPrice: 700, stock: 40, isFeatured: true },
  ]
  for (const p of products) { await prisma.product.create({ data: p }) }
  console.log('Seeded!')
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect())
