import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import type { NextAuthOptions } from "next-auth"

// How long a role read from the DB is trusted before the next session refresh
// re-checks it. An admin changing someone's role takes effect within a minute.
const ROLE_TTL_MS = 60_000

export const authOptions: NextAuthOptions = {
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
          theme: user.theme,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const u = user as { role?: string; image?: string | null; mustChangePassword?: boolean; theme?: string }
        token.role = u.role
        token.picture = u.image ?? null
        token.mustChangePassword = u.mustChangePassword ?? false
        token.theme = u.theme ?? "system"
      }
      if (trigger === "update" && session) {
        const s = session as { mustChangePassword?: boolean; image?: string | null; theme?: string }
        if (typeof s.mustChangePassword === "boolean") token.mustChangePassword = s.mustChangePassword
        if (s.image !== undefined) token.picture = s.image
        if (typeof s.theme === "string") token.theme = s.theme
      }
      // Re-read role + active flag from the DB so role changes made by an admin
      // take effect without the user signing out first. This runs on the session
      // endpoint, which useSession() hits on mount and on every window focus, so
      // it is throttled: once per ROLE_TTL_MS, or immediately whenever the token
      // has no role yet (first refresh after sign-in, or self-healing one that
      // was lost). Re-reading on literally every call hammered the pool and made
      // the whole admin app wait on the DB before it could paint.
      const lastChecked = typeof token.roleCheckedAt === "number" ? token.roleCheckedAt : 0
      const stale = Date.now() - lastChecked > ROLE_TTL_MS
      if (token.sub && !user && (!token.role || stale)) {
        try {
          const fresh = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { role: true, active: true },
          })
          // Only revoke on a definitive answer — a deactivated account. A missing
          // row is treated as a transient read (pool timeout, replica lag) and
          // leaves the existing role in place: nulling it here used to strip the
          // signed-in user down to the default "merchant" view across the admin
          // app until some later refresh happened to succeed.
          if (fresh && !fresh.active) return { ...token, role: null } // forces 401 on next request
          if (fresh) {
            token.role = fresh.role
            token.roleCheckedAt = Date.now()
          }
        } catch { /* DB unreachable — keep existing token */ }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const su = session.user as { role?: string; image?: string | null; mustChangePassword?: boolean; theme?: string }
        su.role = token.role as string
        su.image = (token.picture as string | null) ?? null
        su.mustChangePassword = (token.mustChangePassword as boolean) ?? false
        su.theme = (token.theme as string) ?? "system"
      }
      return session
    },
  },
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
}
