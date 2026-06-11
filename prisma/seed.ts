import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const username = process.env.ADMIN_USERNAME ?? "admin"
  const password = process.env.ADMIN_PASSWORD ?? "admin123"

  const hashed = await bcrypt.hash(password, 10)

  const user = await prisma.user.upsert({
    where: { username },
    update: { password: hashed, role: "admin" },
    create: {
      username,
      password: hashed,
      name: "Administrator",
      role: "admin",
    },
  })

  console.log(`Seeded admin user "${user.username}" (role: ${user.role})`)
  console.log(`Login at /admin/login with username "${username}" / password "${password}"`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
