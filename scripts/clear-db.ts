import "dotenv/config"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  console.log("🗑️  Mengosongkan database...")
  await sql`TRUNCATE TABLE "Notifikasi", "SesiPengukuran", "Device", "DailyTask", "PregnancyVisit", "SkriningShamil", "PregnancyProfile", "Pengukuran", "Anak", "Ibu", "Kader", "Posyandu" CASCADE`
  console.log("✅  Database berhasil dikosongkan!")
}

main().catch((err) => {
  console.error("❌  Gagal:", err)
  process.exit(1)
})
