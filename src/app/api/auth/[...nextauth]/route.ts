import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaClient } from '@prisma/client'
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const handler = NextAuth({
  providers: [CredentialsProvider({
    name: "Credentials",
    credentials: { username: { label: "Username", type: "text" }, password: { label: "Password", type: "password" } },
    async authorize(credentials) {
      if (!credentials?.username || !credentials?.password) return null
      const user = await prisma.user.findUnique({ where: { username: credentials.username } })
      if (!user) return null
      const isValid = await bcrypt.compare(credentials.password, user.password)
      if (!isValid) return null
      return { id: user.id, name: user.name, email: `${user.username}@beeyondtrees.com`, role: user.role }
    }
  })],
  callbacks: {
    async jwt({ token, user }) { if (user) token.role = (user as any).role; return token },
    async session({ session, token }) { if (session.user) (session.user as any).role = token.role; return session }
  },
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt" },
})

export { handler as GET, handler as POST }
