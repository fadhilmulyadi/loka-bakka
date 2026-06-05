import { PrismaClient } from "@/prisma/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

function getPrisma(): PrismaClient {
  const g = global as unknown as { prisma?: PrismaClient }
  if (!g.prisma) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL! })
    const adapter = new PrismaPg(pool)
    g.prisma = new PrismaClient({ adapter })
    if (process.env.NODE_ENV === "production") {
      g.prisma.$connect()
    }
  }
  return g.prisma
}

export const prisma = getPrisma()
