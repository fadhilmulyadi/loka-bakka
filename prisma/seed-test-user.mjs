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
    console.log("Seeding test user started...")

    // 1. Get Posyandu ID (reuse existing)
    const posyanduRes = await client.query('SELECT id FROM "Posyandu" LIMIT 1')
    const posyanduId = posyanduRes.rows[0].id

    // 2. Get Kader ID (reuse existing)
    const kaderRes = await client.query('SELECT id FROM "Kader" LIMIT 1')
    const kaderId = kaderRes.rows[0].id

    // 3. Upsert Ibu "tesanak"
    const passwordHash = await bcrypt.hash("tes123", 10)
    const ibuRes = await client.query(`
      INSERT INTO "Ibu" (id, nama, username, password, "posyanduId")
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (username) DO UPDATE SET
        password = EXCLUDED.password
      RETURNING id
    `, ['test-ibu-id-001', 'Ibu Tes Anak', 'tesanak', passwordHash, posyanduId])
    
    const ibuId = ibuRes.rows[0].id

    // 4. Upsert Child (Anak)
    // Age 8 months, so born 8 months ago. Let's assume today is June 6, 2026.
    // Born: 2025-10-06
    const birthDate = new Date("2025-10-06")
    const anakId = 'test-anak-id-001'
    await client.query(`
      INSERT INTO "Anak" (id, nama, "tanggalLahir", "jenisKelamin", "ibuId")
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        nama = EXCLUDED.nama
    `, [anakId, 'Anak Tes', birthDate, 'L', ibuId])

    // 5. Insert 8 Checkups (months 1-8)
    // To make it stunted at month 8, I'll set height for month 8 to 66cm.
    // Month 1 height: 54.7cm (from reference)
    // ...
    // Month 8: 66cm (stunted)
    
    // Clear previous checkups for this child
    await client.query('DELETE FROM "Pengukuran" WHERE "anakId" = $1', [anakId])
    
    const heights = [54.7, 58.4, 61.4, 63.9, 65.9, 67.6, 69.2, 66.0] // cm
    
    for (let i = 0; i < 8; i++) {
        const height = heights[i]
        const ageMonths = i + 1
        
        // Simplified status calculation for seeding
        // Z-score calculation (simplified for this script, should match application)
        // For boys:
        // Month 1: 54.7, median 54.7244, s=0.03557, l=1 -> Z = (54.7/54.7244 - 1) / 0.03557 = -0.012
        // Month 8: 66.0, median 70.5994, s=0.03124, l=1 -> Z = (66.0/70.5994 - 1) / 0.03124 = -2.08
        
        // Calculating Z-Score for seeding
        let statusTBU = 'normal'
        // Simplified Z Calculation
        const refM = [49.8842, 54.7244, 58.4249, 61.4292, 63.886, 65.9026, 67.6236, 69.1645, 70.5994][ageMonths]
        const refS = [0.03795, 0.03557, 0.03424, 0.03328, 0.03257, 0.03204, 0.03165, 0.03139, 0.03124][ageMonths]
        const zScore = (height / refM - 1) / refS
        
        if (zScore < -3) statusTBU = 'severely_stunted'
        else if (zScore < -2) statusTBU = 'stunted'
        else if (zScore >= 2) statusTBU = 'tall'
        
        await client.query(`
            INSERT INTO "Pengukuran" (
                id, "anakId", "posyanduId", "kaderId", "beratBadan", 
                "tinggiBadan", "zScoreTBU", "zScoreBBU", "zScoreBBTB", 
                "statusTBU", "statusBBU", "statusBBTB", "tanggal"
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
            `meas-${i}`, anakId, posyanduId, kaderId, 10, 
            height, zScore, 0, 0, 
            statusTBU, 'normal', 'normal', new Date(2025, 10 + i, 6)
        ])
    }

    console.log("Seeding test user successful")
  } catch (err) {
    console.error("Seed failed:", err)
  } finally {
    client.release()
    await pool.end()
  }
}

main()
