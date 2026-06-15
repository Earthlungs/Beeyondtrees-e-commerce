import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null
        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        })
        if (!user) return null
        // Blocked/deactivated accounts cannot sign in.
        if (!user.active) return null
        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) return null
        return {
          id: user.id,
          name: user.name,
          email: user.email || `${user.username}@beeyondtrees.com`,
          role: user.role,
          image: user.image || null,
          mustChangePassword: user.mustChangePassword,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const u = user as { role?: string; image?: string | null; mustChangePassword?: boolean }
        token.role = u.role
        token.picture = u.image ?? null
        token.mustChangePassword = u.mustChangePassword ?? false
      }
      // Account page calls update() to clear the force-change flag / refresh the
      // avatar without forcing a re-login.
      if (trigger === "update" && session) {
        const s = session as { mustChangePassword?: boolean; image?: string | null }
        if (typeof s.mustChangePassword === "boolean") token.mustChangePassword = s.mustChangePassword
        if (s.image !== undefined) token.picture = s.image
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const su = session.user as { role?: string; image?: string | null; mustChangePassword?: boolean }
        su.role = token.role as string
        su.image = (token.picture as string | null) ?? null
        su.mustChangePassword = (token.mustChangePassword as boolean) ?? false
      }
      return session
    },
  },
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }
