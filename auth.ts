import NextAuth, { type DefaultSession } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db/client"
import { kader as kaderTable, ibu as ibuTable } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: "kader" | "ibu"
      posyanduId: string
    } & DefaultSession["user"]
  }

  interface User {
    role: "kader" | "ibu"
    posyanduId: string
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: "kader" | "ibu"
    posyanduId: string
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      id: "kader",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const kader = await db.query.kader.findFirst({
          where: eq(kaderTable.username, credentials.username as string),
          columns: { id: true, nama: true, password: true, posyanduId: true },
        })

        if (!kader) return null

        const valid = await bcrypt.compare(credentials.password as string, kader.password)
        if (!valid) return null

        return {
          id: kader.id,
          name: kader.nama,
          role: "kader" as const,
          posyanduId: kader.posyanduId,
        }
      },
    }),
    Credentials({
      id: "ibu",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const ibu = await db.query.ibu.findFirst({
          where: eq(ibuTable.username, credentials.username as string),
          columns: { id: true, nama: true, password: true, posyanduId: true },
        })

        if (!ibu) return null

        const valid = await bcrypt.compare(credentials.password as string, ibu.password)
        if (!valid) return null

        return {
          id: ibu.id,
          name: ibu.nama,
          role: "ibu" as const,
          posyanduId: ibu.posyanduId,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.posyanduId = user.posyanduId
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.sub!
      session.user.role = token.role as "kader" | "ibu"
      session.user.posyanduId = token.posyanduId as string
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})
