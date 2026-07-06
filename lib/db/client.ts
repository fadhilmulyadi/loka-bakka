import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

function getDb() {
  const g = global as unknown as { db?: ReturnType<typeof drizzle<typeof schema>> }
  if (!g.db) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL!,
      max: 1, // one connection per serverless function instance
      ssl: { rejectUnauthorized: false },
    })
    g.db = drizzle(pool, { schema })
  }
  return g.db
}

export const db = getDb()
