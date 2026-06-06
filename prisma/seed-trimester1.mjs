import "dotenv/config"
import pkg from "pg"
import bcrypt from "bcryptjs"

const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

async function main() {
  const client = await pool.connect()
  try {
    console.log("Seeding Trimester 1 Ibu Hamil via RAW SQL...")

    const posyanduRes = await client.query('SELECT id FROM "Posyandu" LIMIT 1')
    if (posyanduRes.rows.length === 0) throw new Error("No Posyandu found.")
    const posyanduId = posyanduRes.rows[0].id

    const passwordHash = await bcrypt.hash("1234567", 10)
    const ibuId = 'ibu-tm1-test'
    
    await client.query(`
      INSERT INTO "Ibu" (id, nama, username, password, "noHp", alamat, "posyanduId")
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        nama = EXCLUDED.nama,
        username = EXCLUDED.username,
        password = EXCLUDED.password
    `, [ibuId, 'Ibu Trimester Satu', 'ibu.tm1', passwordHash, '08999999999', 'Jl. Test No. 1', posyanduId])
    
    const hpht = "2026-04-15"
    await client.query(`
      INSERT INTO "PregnancyProfile" (
        id, "ibuId", hpht, "bbPrepregnancyKg", "heightCm", 
        "imtPrepregnancy", "imtCategory", "targetGainMinKg", 
        "targetGainMaxKg", "weeklyGainMinKg", "weeklyGainMaxKg"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT ("ibuId") DO UPDATE SET
        hpht = EXCLUDED.hpht
    `, [
      'preg-tm1-test', ibuId, hpht, 50, 160, 
      19.5, 'normal', 11.5, 16.0, 0.4, 0.5
    ])

    await client.query('DELETE FROM "PregnancyVisit" WHERE "ibuId" = $1', [ibuId])
    
    const visits = [
      { id: 'visit-tm1-1', date: "2026-05-01", weight: 50.5, gain: 0.5, lila: 24, hb: 11.5, onTrack: true },
      { id: 'visit-tm1-2', date: "2026-05-15", weight: 51.0, gain: 1.0, lila: 24, hb: 11.2, onTrack: true },
      { id: 'visit-tm1-3', date: "2026-06-01", weight: 51.8, gain: 1.8, lila: 24.5, hb: 11.0, onTrack: true },
    ]

    for (const v of visits) {
      await client.query(`
        INSERT INTO "PregnancyVisit" ("id", "ibuId", "visitDate", "currentWeightKg", "weightGainKg", "lilaCm", "hbGdl", "isOnTrack")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [v.id, ibuId, v.date, v.weight, v.gain, v.lila, v.hb, v.onTrack])
    }

    console.log("Successfully seeded Ibu Hamil Trimester 1.")
  } catch (err) {
    console.error("Seed failed:", err)
  } finally {
    client.release()
    await pool.end()
  }
}

main()
