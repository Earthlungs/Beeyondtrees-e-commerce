// Seeds (or resets) the IT Specialist super-account. Run when the DB is
// reachable:  node scripts/seed-it.mjs
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()
const USERNAME = "Newton"
const PASSWORD = "Atancha@123"

const hash = await bcrypt.hash(PASSWORD, 10)
const user = await prisma.user.upsert({
  where: { username: USERNAME },
  update: { role: "it_specialist", active: true, password: hash, mustChangePassword: false },
  create: {
    username: USERNAME,
    name: "Newton",
    email: "newton@earthlungs.org",
    password: hash,
    role: "it_specialist",
    active: true,
    mustChangePassword: false,
  },
})
console.log(`IT Specialist ready: username "${user.username}" / password "${PASSWORD}" (role ${user.role})`)
await prisma.$disconnect()
