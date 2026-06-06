import "dotenv/config"
import pkg from "pg"
import bcrypt from "bcryptjs"

const { Pool } = pkg

// Gunakan DIRECT_URL untuk seeding karena lebih stabil untuk banyak operasi sekaligus
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

async function main() {
  const client = await pool.connect()
  try {
    console.log("Seeding started via RAW SQL (Direct Supabase)...")

    // 1. Upsert Posyandu
    const posyanduRes = await client.query(`
      INSERT INTO "Posyandu" (id, nama, alamat, kelurahan, kecamatan, kota, latitude, longitude)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        nama = EXCLUDED.nama,
        alamat = EXCLUDED.alamat,
        kelurahan = EXCLUDED.kelurahan,
        kecamatan = EXCLUDED.kecamatan,
        kota = EXCLUDED.kota
      RETURNING id
    `, ['cmq1posyandu001', 'Posyandu Melati', 'Jl. Melati No. 1', 'Melati', 'Kecamatan Sehat', 'Kota Sehat', -5.1477, 119.4327])
    
    const posyanduId = posyanduRes.rows[0].id

    // 2. Upsert Kader
    const passwordHash = await bcrypt.hash("password123", 10)
    await client.query(`
      INSERT INTO "Kader" (id, nama, username, password, "posyanduId")
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (username) DO UPDATE SET
        nama = EXCLUDED.nama,
        password = EXCLUDED.password,
        "posyanduId" = EXCLUDED."posyanduId"
    `, ['cmq1kader001', 'Zee Asadel', 'zee.asadel', passwordHash, posyanduId])

    // 3. Upsert Ibu
    const pinHash = await bcrypt.hash("1234", 10)
    const ibuRes = await client.query(`
      INSERT INTO "Ibu" (id, nama, username, pin, "noHp", alamat, "posyanduId")
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (username) DO UPDATE SET
        nama = EXCLUDED.nama,
        pin = EXCLUDED.pin,
        "noHp" = EXCLUDED."noHp",
        alamat = EXCLUDED.alamat,
        "posyanduId" = EXCLUDED."posyanduId"
      RETURNING id
    `, ['cmq1ibu001', 'Andi Pratama', 'andi.pratama', pinHash, '081234567890', 'Jl. Sehat No. 1', posyanduId])
    
    const ibuId = ibuRes.rows[0].id

    // 4. Upsert Pregnancy Profile
    await client.query(`
      INSERT INTO "PregnancyProfile" (
        id, "ibuId", hpht, "bbPrepregnancyKg", "heightCm", 
        "imtPrepregnancy", "imtCategory", "targetGainMinKg", 
        "targetGainMaxKg", "weeklyGainMinKg", "weeklyGainMaxKg"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT ("ibuId") DO UPDATE SET
        hpht = EXCLUDED.hpht,
        "bbPrepregnancyKg" = EXCLUDED."bbPrepregnancyKg",
        "heightCm" = EXCLUDED."heightCm",
        "imtPrepregnancy" = EXCLUDED."imtPrepregnancy",
        "imtCategory" = EXCLUDED."imtCategory",
        "targetGainMinKg" = EXCLUDED."targetGainMinKg",
        "targetGainMaxKg" = EXCLUDED."targetGainMaxKg",
        "weeklyGainMinKg" = EXCLUDED."weeklyGainMinKg",
        "weeklyGainMaxKg" = EXCLUDED."weeklyGainMaxKg"
    `, [
      'cmq1preg001', ibuId, new Date("2026-01-01"), 52, 158, 
      20.83, 'normal', 11.3, 15.9, 0.36, 0.45
    ])

    // 5. Delete and Insert Pregnancy Visits
    await client.query('DELETE FROM "PregnancyVisit" WHERE "ibuId" = $1', [ibuId])

    const visits = [
      { visitDate: new Date("2026-04-01"), currentWeightKg: 53.5, weightGainKg: 1.5,  lilaCm: 25.2, hbGdl: 12.0, isOnTrack: true  },
      { visitDate: new Date("2026-04-30"), currentWeightKg: 55.5, weightGainKg: 3.5,  lilaCm: 25.0, hbGdl: 11.8, isOnTrack: true  },
      { visitDate: new Date("2026-05-05"), currentWeightKg: 57.0, weightGainKg: 5.0,  lilaCm: 24.8, hbGdl: 10.9, isOnTrack: false },
      { visitDate: new Date("2026-06-02"), currentWeightKg: 60.5, weightGainKg: 8.5,  lilaCm: 25.1, hbGdl: 11.8, isOnTrack: true  },
    ]

    let visitCounter = 1
    for (const v of visits) {
      await client.query(`
        INSERT INTO "PregnancyVisit" ("id", "ibuId", "visitDate", "currentWeightKg", "weightGainKg", "lilaCm", "hbGdl", "isOnTrack")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [`visit-${visitCounter++}`, ibuId, v.visitDate, v.currentWeightKg, v.weightGainKg, v.lilaCm, v.hbGdl, v.isOnTrack])
    }

    console.log("Seed successful via Direct SQL")
  } catch (err) {
    console.error("Seed failed:", err)
  } finally {
    client.release()
    await pool.end()
  }
}

main()
