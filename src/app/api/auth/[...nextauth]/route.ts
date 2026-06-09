import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (credentials?.username === "admin" && credentials?.password === "beeyond2024") {
          return { id: "admin", name: "Administrator", email: "admin@beeyondtrees.com" }
        }
        if (credentials?.username === "merchant" && credentials?.password === "merchant2024") {
          return { id: "merchant", name: "Merchant", email: "merchant@beeyondtrees.com" }
        }
        return null
      }
    })
  ],
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt" },
  secret: "beeyond-trees-secret-2024",
})

export { handler as GET, handler as POST }
