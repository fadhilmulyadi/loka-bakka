import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import * as schema from "./schema"

function getDb() {
  const g = global as unknown as { db?: ReturnType<typeof drizzle<typeof schema>> }
  if (!g.db) {
    const sql = neon(process.env.DATABASE_URL!)
    g.db = drizzle(sql, { schema })
  }
  return g.db
}

export const db = getDb()
