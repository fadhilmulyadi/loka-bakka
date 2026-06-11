import { PrismaClient } from "@/prisma/generated/prisma"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

function getPrisma() {
  const g = global as unknown as { prisma?: PrismaClient }
  if (!g.prisma) {
    // Use the pooler URL (DATABASE_URL) — DIRECT_URL is for migrations only
    const connectionString = process.env.DATABASE_URL!
    const pool = new Pool({
      connectionString,
      max: 1, // one connection per serverless function instance
      ssl: { rejectUnauthorized: false },
    })
    const adapter = new PrismaPg(pool)
    g.prisma = new PrismaClient({ adapter })
  }
  return g.prisma
}

export const prisma = getPrisma()
