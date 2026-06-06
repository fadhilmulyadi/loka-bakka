import { PrismaClient } from "@/prisma/generated/prisma"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

function getPrisma() {
  const g = global as unknown as { prisma?: PrismaClient }
  if (!g.prisma) {
    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
    const pool = new Pool({ 
      connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    })
    const adapter = new PrismaPg(pool)
    g.prisma = new PrismaClient({ adapter })
  }
  return g.prisma
}

export const prisma = getPrisma()
