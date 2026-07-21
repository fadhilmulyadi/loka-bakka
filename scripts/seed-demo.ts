/**
 * SEED DEMO — Loka Bakka Presentation Data
 * ==========================================
 * Jalankan: npx tsx scripts/seed-demo.ts
 *
 * Menghapus semua data lama pada posyandu demo, lalu mengisi ulang dengan data
 * yang cukup realistis untuk presentasi:
 *  - 1 Posyandu  (Posyandu Melati)
 *  - 2 Kader     (demo login: kader1 / kader1234)
 *  - 20 Ibu      (15 punya anak, 5 ibu hamil aktif)
 *  - 25 Anak     (status campuran: Normal, Risiko Stunting, Stunting)
 *  - Riwayat pengukuran 6 bulan terakhir (trend chart terisi)
 *  - Beberapa anak belum diperiksa bulan ini (fitur "Belum Periksa")
 *  - Ibu hamil dengan risiko rendah/sedang/tinggi
 *  - Pregnancy visits 3-4 bulan terakhir per ibu hamil
 *  - Notifikasi contoh
 *  - Skrining kehamilan (kuesioner)
 */

import "dotenv/config"
import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import { eq, inArray } from "drizzle-orm"
import bcrypt from "bcryptjs"
import * as schema from "../lib/db/schema"

// ─── DB setup ─────────────────────────────────────────────────────────────────
const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uuid() { return crypto.randomUUID() }

/** Tanggal N bulan lalu di hari ke-D bulan itu */
function monthsAgo(n: number, day = 15): Date {
  const d = new Date()
  d.setDate(day)
  d.setMonth(d.getMonth() - n)
  d.setHours(8, 0, 0, 0)
  return d
}

/** Tanggal N hari lalu */
function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(9, 30, 0, 0)
  return d
}

/** random float antara a dan b, 1 desimal */
function rand(a: number, b: number) {
  return Math.round((a + Math.random() * (b - a)) * 10) / 10
}

/**
 * Hitung z-score TB/U menggunakan rumus LMS WHO sederhana.
 * Cukup untuk seed — tidak perlu import tabel penuh.
 * median & SD diperkirakan per rentang usia kasar.
 */
function approxZScoreTBU(heightCm: number, ageMo: number, sex: "L" | "P"): number {
  // Median referensi kasar WHO (cm) berdasarkan usia bulan
  const medianRef: [number, number][] = [
    [0, 49.9], [3, 61.4], [6, 67.6], [9, 72.0], [12, 75.7],
    [18, 82.3], [24, 87.1], [30, 91.9], [36, 96.1], [42, 100.0],
    [48, 103.3], [54, 106.4], [60, 109.4],
  ]
  // Perempuan sedikit lebih pendek (-0.5 cm rata-rata)
  const sexOffset = sex === "P" ? -0.5 : 0
  let median = 75
  for (let i = 0; i < medianRef.length - 1; i++) {
    const [a0, m0] = medianRef[i]
    const [a1, m1] = medianRef[i + 1]
    if (ageMo >= a0 && ageMo <= a1) {
      const t = (ageMo - a0) / (a1 - a0)
      median = m0 + t * (m1 - m0) + sexOffset
      break
    }
  }
  const sd = 3.0 + ageMo * 0.02 // SD tumbuh seiring usia
  return Math.round(((heightCm - median) / sd) * 100) / 100
}

/** Tinggi yang menghasilkan z-score target untuk usia & jenis kelamin tertentu */
function heightForZScore(zTarget: number, ageMo: number, sex: "L" | "P"): number {
  const medianRef: [number, number][] = [
    [0, 49.9], [3, 61.4], [6, 67.6], [9, 72.0], [12, 75.7],
    [18, 82.3], [24, 87.1], [30, 91.9], [36, 96.1], [42, 100.0],
    [48, 103.3], [54, 106.4], [60, 109.4],
  ]
  const sexOffset = sex === "P" ? -0.5 : 0
  let median = 75
  for (let i = 0; i < medianRef.length - 1; i++) {
    const [a0, m0] = medianRef[i]
    const [a1, m1] = medianRef[i + 1]
    if (ageMo >= a0 && ageMo <= a1) {
      const t = (ageMo - a0) / (a1 - a0)
      median = m0 + t * (m1 - m0) + sexOffset
      break
    }
  }
  const sd = 3.0 + ageMo * 0.02
  return Math.round((median + zTarget * sd) * 10) / 10
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🌱  Memulai seeding demo data…")

  // ── 0a. Auto-migrate kolom yang mungkin belum ada di DB ──────────────────────
  console.log("🔧  Memeriksa & menambah kolom yang belum ada…")
  await sql`ALTER TABLE "PregnancyProfile" ADD COLUMN IF NOT EXISTS "jumlahJanin" integer NOT NULL DEFAULT 1`
  await sql`ALTER TABLE "SesiPengukuran" ADD COLUMN IF NOT EXISTS "kategori" text NOT NULL DEFAULT 'anak'`
  console.log("   ✓ Schema DB sudah sinkron")

  // ── 0. Bersihkan data lama posyandu demo ────────────────────────────────────
  console.log("🧹  Membersihkan data lama…")

  // Cek apakah posyandu demo sudah ada
  const existing = await db.query.posyandu.findFirst({
    where: eq(schema.posyandu.nama, "Posyandu Melati"),
  })

  if (existing) {
    const posId = existing.id
    // Urutan hapus: tabel leaf dulu, baru parent
    const ibuRows = await db.query.ibu.findMany({ where: eq(schema.ibu.posyanduId, posId) })
    const ibuIds = ibuRows.map(i => i.id)
    const anakRows = ibuIds.length > 0
      ? await db.query.anak.findMany({ where: inArray(schema.anak.ibuId, ibuIds) })
      : []
    const anakIds = anakRows.map(a => a.id)

    if (anakIds.length > 0) {
      await db.delete(schema.pengukuran).where(inArray(schema.pengukuran.anakId, anakIds))
      await db.delete(schema.anak).where(inArray(schema.anak.id, anakIds))
    }
    if (ibuIds.length > 0) {
      await db.delete(schema.pregnancyVisit).where(inArray(schema.pregnancyVisit.ibuId, ibuIds))
      await db.delete(schema.pregnancyProfile).where(inArray(schema.pregnancyProfile.ibuId, ibuIds))
      await db.delete(schema.skriningShamil).where(inArray(schema.skriningShamil.ibuId, ibuIds))
      await db.delete(schema.dailyTask).where(inArray(schema.dailyTask.ibuId, ibuIds))
      await db.delete(schema.ibu).where(inArray(schema.ibu.id, ibuIds))
    }

    const kaderRows = await db.query.kader.findMany({ where: eq(schema.kader.posyanduId, posId) })
    const kaderIds = kaderRows.map(k => k.id)
    if (kaderIds.length > 0) {
      await db.delete(schema.kader).where(inArray(schema.kader.id, kaderIds))
    }
    await db.delete(schema.notifikasi).where(eq(schema.notifikasi.posyanduId, posId))
    await db.delete(schema.posyandu).where(eq(schema.posyandu.id, posId))
    console.log("   ✓ Data lama dihapus")
  }

  // ── 1. Posyandu ─────────────────────────────────────────────────────────────
  const posId = uuid()
  await db.insert(schema.posyandu).values({
    id: posId,
    nama: "Posyandu Melati",
    alamat: "Jl. Kenanga No. 12, Kelurahan Baru",
    kecamatan: "Rappocini",
    kota: "Makassar",
    latitude: -5.147665,
    longitude: 119.432732,
  })
  console.log("   ✓ Posyandu Melati dibuat")

  // ── 2. Kader ────────────────────────────────────────────────────────────────
  const pass1 = await bcrypt.hash("kader1234", 10)
  const pass2 = await bcrypt.hash("kader5678", 10)

  const kaderId1 = uuid()
  const kaderId2 = uuid()

  await db.insert(schema.kader).values([
    { id: kaderId1, nama: "Siti Rahayu", username: "kader1", password: pass1, posyanduId: posId },
    { id: kaderId2, nama: "Dewi Lestari", username: "kader2", password: pass2, posyanduId: posId },
  ])
  console.log("   ✓ 2 Kader dibuat  (kader1/kader1234  |  kader2/kader5678)")

  // ── 3. Ibu (15 dengan anak, 5 ibu hamil) ────────────────────────────────────
  const ibuPass = await bcrypt.hash("ibu1234", 10)
  const ibuData = [
    // Ibu punya anak (bukan hamil)
    { nama: "Rina Susilawati", username: "rina01", noHp: "081234567890", lahir: new Date("1992-03-15"), alamat: "Jl. Mawar 5", isHamil: false },
    { nama: "Fitri Handayani", username: "fitri02", noHp: "081234567891", lahir: new Date("1994-07-22"), alamat: "Jl. Melati 7", isHamil: false },
    { nama: "Nurul Hidayah", username: "nurul03", noHp: "081234567892", lahir: new Date("1990-11-05"), alamat: "Jl. Anggrek 3", isHamil: false },
    { nama: "Sri Wahyuni", username: "sri04", noHp: "081234567893", lahir: new Date("1996-01-18"), alamat: "Jl. Kamboja 9", isHamil: false },
    { nama: "Lestari Dewi", username: "lestari05", noHp: "081234567894", lahir: new Date("1993-09-30"), alamat: "Jl. Dahlia 2", isHamil: false },
    { nama: "Heni Susanti", username: "heni06", noHp: "081234567895", lahir: new Date("1991-05-12"), alamat: "Jl. Tulip 11", isHamil: false },
    { nama: "Yuli Astuti", username: "yuli07", noHp: "081234567896", lahir: new Date("1995-08-24"), alamat: "Jl. Teratai 4", isHamil: false },
    { nama: "Dwi Kurniawati", username: "dwi08", noHp: "081234567897", lahir: new Date("1998-02-14"), alamat: "Jl. Seruni 6", isHamil: false },
    { nama: "Mega Sari", username: "mega09", noHp: "081234567898", lahir: new Date("1997-12-03"), alamat: "Jl. Cempaka 8", isHamil: false },
    { nama: "Putri Rahmawati", username: "putri10", noHp: "081234567899", lahir: new Date("1999-06-20"), alamat: "Jl. Flamboyan 1", isHamil: false },
    { nama: "Indah Permatasari", username: "indah11", noHp: "081234568000", lahir: new Date("1996-04-08"), alamat: "Jl. Kenanga 14", isHamil: false },
    { nama: "Wahyu Ningsih", username: "wahyu12", noHp: "081234568001", lahir: new Date("1993-10-17"), alamat: "Jl. Bougenville 3", isHamil: false },
    { nama: "Ani Rahayu", username: "ani13", noHp: "081234568002", lahir: new Date("1994-12-25"), alamat: "Jl. Raflesia 7", isHamil: false },
    { nama: "Sari Mulyani", username: "sari14", noHp: "081234568003", lahir: new Date("1992-07-11"), alamat: "Jl. Edelweis 5", isHamil: false },
    { nama: "Rini Kurnia", username: "rini15", noHp: "081234568004", lahir: new Date("1995-03-28"), alamat: "Jl. Sakura 9", isHamil: false },
    // Ibu hamil (5 orang)
    { nama: "Mariam Hasanah", username: "mariam16", noHp: "081234568010", lahir: new Date("1997-09-05"), alamat: "Jl. Merpati 2", isHamil: true },
    { nama: "Fadilah Nuraini", username: "fadilah17", noHp: "081234568011", lahir: new Date("1999-03-18"), alamat: "Jl. Perkutut 4", isHamil: true },
    { nama: "Sumiati Basri", username: "sumiati18", noHp: "081234568012", lahir: new Date("1993-11-22"), alamat: "Jl. Dara 6", isHamil: true },
    { nama: "Hartini Wahab", username: "hartini19", noHp: "081234568013", lahir: new Date("1996-06-14"), alamat: "Jl. Camar 8", isHamil: true },
    { nama: "Rahmawati Syah", username: "rahmawati20", noHp: "081234568014", lahir: new Date("2000-01-30"), alamat: "Jl. Elang 10", isHamil: true },
  ]

  const ibuIds: string[] = []
  for (const d of ibuData) {
    const id = uuid()
    ibuIds.push(id)
    await db.insert(schema.ibu).values({
      id, posyanduId: posId, nama: d.nama, username: d.username,
      password: ibuPass, noHp: d.noHp,
      tanggalLahir: d.lahir, alamat: d.alamat,
      isHamil: d.isHamil,
    })
  }
  console.log("   ✓ 20 Ibu dibuat")

  // ── 4. Anak ─────────────────────────────────────────────────────────────────
  // Status rencana:
  // 8 Normal, 8 Risiko Stunting, 4 Stunting, 5 Normal (belum periksa bulan ini)
  type AnakEntry = {
    namaAnak: string; sex: "L"|"P"; ibuIdx: number; ageMo: number
    targetZ: number; anakKe: number; namaAyah: string
  }
  const anakData: AnakEntry[] = [
    // Normal (diperiksa rutin)
    { namaAnak: "Rizki Pratama",    sex: "L", ibuIdx: 0,  ageMo: 24, targetZ:  0.3, anakKe: 1, namaAyah: "Budi Susilawati" },
    { namaAnak: "Nadia Fitri",      sex: "P", ibuIdx: 1,  ageMo: 18, targetZ:  0.1, anakKe: 1, namaAyah: "Hendra Handayani" },
    { namaAnak: "Bagas Nurul",      sex: "L", ibuIdx: 2,  ageMo: 36, targetZ: -0.5, anakKe: 2, namaAyah: "Agus Hidayah" },
    { namaAnak: "Salma Sri",        sex: "P", ibuIdx: 3,  ageMo: 12, targetZ:  0.4, anakKe: 1, namaAyah: "Dodi Wahyuni" },
    { namaAnak: "Faris Lestari",    sex: "L", ibuIdx: 4,  ageMo: 30, targetZ: -0.2, anakKe: 1, namaAyah: "Eko Dewi" },
    { namaAnak: "Naila Heni",       sex: "P", ibuIdx: 5,  ageMo: 48, targetZ:  0.5, anakKe: 2, namaAyah: "Fajar Susanti" },
    { namaAnak: "Gibran Yuli",      sex: "L", ibuIdx: 6,  ageMo: 9,  targetZ:  0.2, anakKe: 1, namaAyah: "Galih Astuti" },
    { namaAnak: "Keisha Dwi",       sex: "P", ibuIdx: 7,  ageMo: 15, targetZ: -0.3, anakKe: 1, namaAyah: "Hasan Kurniawati" },
    // Risiko Stunting
    { namaAnak: "Dimas Mega",       sex: "L", ibuIdx: 8,  ageMo: 20, targetZ: -2.2, anakKe: 1, namaAyah: "Irwan Sari" },
    { namaAnak: "Siti Putri",       sex: "P", ibuIdx: 9,  ageMo: 32, targetZ: -2.5, anakKe: 2, namaAyah: "Joko Rahmawati" },
    { namaAnak: "Arif Indah",       sex: "L", ibuIdx: 10, ageMo: 42, targetZ: -2.1, anakKe: 1, namaAyah: "Kusno Permatasari" },
    { namaAnak: "Rara Wahyu",       sex: "P", ibuIdx: 11, ageMo: 27, targetZ: -2.8, anakKe: 1, namaAyah: "Lukman Ningsih" },
    { namaAnak: "Bintang Ani",      sex: "L", ibuIdx: 12, ageMo: 38, targetZ: -2.3, anakKe: 2, namaAyah: "Manaf Rahayu" },
    { namaAnak: "Zahra Sari",       sex: "P", ibuIdx: 13, ageMo: 14, targetZ: -2.6, anakKe: 1, namaAyah: "Nasir Mulyani" },
    { namaAnak: "Reza Rini",        sex: "L", ibuIdx: 14, ageMo: 22, targetZ: -2.4, anakKe: 1, namaAyah: "Oky Kurnia" },
    { namaAnak: "Ayu Mega",         sex: "P", ibuIdx: 8,  ageMo: 54, targetZ: -2.2, anakKe: 2, namaAyah: "Irwan Sari" },
    // Stunting (z < -3)
    { namaAnak: "Ridho Heni",       sex: "L", ibuIdx: 5,  ageMo: 44, targetZ: -3.4, anakKe: 3, namaAyah: "Fajar Susanti" },
    { namaAnak: "Tasya Putri",      sex: "P", ibuIdx: 9,  ageMo: 56, targetZ: -3.6, anakKe: 3, namaAyah: "Joko Rahmawati" },
    { namaAnak: "Harun Indah",      sex: "L", ibuIdx: 10, ageMo: 52, targetZ: -3.2, anakKe: 2, namaAyah: "Kusno Permatasari" },
    { namaAnak: "Layla Wahyu",      sex: "P", ibuIdx: 11, ageMo: 46, targetZ: -3.5, anakKe: 2, namaAyah: "Lukman Ningsih" },
    // Normal, belum periksa bulan ini (muncul di daftar "Belum Periksa")
    { namaAnak: "Iqbal Sri",        sex: "L", ibuIdx: 3,  ageMo: 28, targetZ: -0.1, anakKe: 2, namaAyah: "Dodi Wahyuni" },
    { namaAnak: "Mia Lestari",      sex: "P", ibuIdx: 4,  ageMo: 36, targetZ:  0.3, anakKe: 2, namaAyah: "Eko Dewi" },
    { namaAnak: "Yoga Heni",        sex: "L", ibuIdx: 5,  ageMo: 40, targetZ: -0.4, anakKe: 3, namaAyah: "Fajar Susanti" },
    { namaAnak: "Dian Yuli",        sex: "P", ibuIdx: 6,  ageMo: 20, targetZ:  0.2, anakKe: 2, namaAyah: "Galih Astuti" },
    { namaAnak: "Satria Rini",      sex: "L", ibuIdx: 14, ageMo: 45, targetZ: -0.6, anakKe: 2, namaAyah: "Oky Kurnia" },
  ]

  const anakIds: string[] = []
  const now = new Date()

  for (const d of anakData) {
    const id = uuid()
    anakIds.push(id)
    const birthDate = new Date(now.getFullYear(), now.getMonth() - d.ageMo, 15)
    const beratLahir = rand(2.5, 3.5)
    const panjangLahir = rand(47, 52)
    await db.insert(schema.anak).values({
      id,
      nama: d.namaAnak,
      tanggalLahir: birthDate,
      jenisKelamin: d.sex,
      namaAyah: d.namaAyah,
      anakKe: d.anakKe,
      beratLahir,
      panjangLahir,
      ibuId: ibuIds[d.ibuIdx],
    })
  }
  console.log("   ✓ 25 Anak dibuat")

  // ── 5. Pengukuran (6 bulan riwayat) ─────────────────────────────────────────
  // Indeks 0-19 (anak normal+stunting): diperiksa 3-6 bulan terakhir setiap bulan
  // Indeks 20-24 (belum periksa bulan ini): hanya punya riwayat 2-5 bulan lalu

  const insertedMeasurements: string[] = []

  for (let i = 0; i < anakIds.length; i++) {
    const d = anakData[i]
    const anakId = anakIds[i]
    const ibuId = ibuIds[d.ibuIdx]
    const belumPeriksa = i >= 20 // 5 anak terakhir belum periksa bulan ini

    // Bulan yang akan diisi pengukuran
    // Anak 0-19: 6 bulan lalu sampai bulan ini
    // Anak 20-24: hanya 1-5 bulan lalu (bukan bulan ini)
    const startMonth = belumPeriksa ? 5 : 5
    const endMonth = belumPeriksa ? 1 : 0  // 0 = bulan ini

    for (let m = startMonth; m >= endMonth; m--) {
      const ageMoAtMeasure = d.ageMo - m
      if (ageMoAtMeasure < 0) continue

      // z-score pada bulan lalu: lebih buruk, trend membaik ke bulan ini
      // Untuk anak yang membaik: z-score naik sedikit setiap bulan
      const improvementPerMonth = i < 8 ? 0.05 : 0     // anak normal: sedikit membaik
      const zAtMonth = d.targetZ + improvementPerMonth * (startMonth - m)
      const clampedZ = Math.max(-4.5, Math.min(2.5, zAtMonth))

      const tinggi = heightForZScore(clampedZ, ageMoAtMeasure, d.sex)

      // Berat badan: estimasi dari z-score berat badan
      // Kita pakai z-score BBU sederhana (z=0 ≈ median BB WHO)
      const bbMedian: Record<number, number> = {
        6: 7.9, 9: 9.2, 12: 10.2, 15: 11.0, 18: 11.6, 20: 12.0,
        22: 12.4, 24: 12.9, 27: 13.5, 28: 13.8, 30: 14.2, 32: 14.7,
        36: 15.6, 38: 16.1, 40: 16.7, 42: 17.2, 44: 17.7, 45: 17.9,
        46: 18.1, 48: 18.7, 52: 19.7, 54: 20.2, 56: 20.8,
      }
      const closestAge = Object.keys(bbMedian)
        .map(Number)
        .reduce((a, b) => Math.abs(b - ageMoAtMeasure) < Math.abs(a - ageMoAtMeasure) ? b : a)
      const bbBase = bbMedian[closestAge] ?? 12.0
      const bbOffset = clampedZ < -3 ? -2.5 : clampedZ < -2 ? -1.5 : 0
      const berat = Math.round((bbBase + bbOffset + rand(-0.3, 0.3)) * 10) / 10

      // z-score BBU dan BBTB (perkiraan)
      const zBBU = Math.round((clampedZ * 0.7 + rand(-0.3, 0.3)) * 100) / 100
      const zBBTB = Math.round(rand(-1.0, 0.5) * 100) / 100

      // Status string
      const getTBUStatus = (z: number) => z < -3 ? "Sangat Pendek" : z < -2 ? "Pendek" : z < 2 ? "Normal" : "Tinggi"
      const getBBUStatus = (z: number) => z < -3 ? "Gizi Buruk" : z < -2 ? "Kurang" : z < 1 ? "Baik" : "Lebih"
      const getBBTBStatus = (z: number) => z < -3 ? "Sangat Kurus" : z < -2 ? "Kurus" : z < 1 ? "Normal" : "Gemuk"

      const tanggal = monthsAgo(m, m === 0 ? 10 : 15) // bulan ini: hari ke-10, lalu: hari ke-15
      const kaderId = m % 2 === 0 ? kaderId1 : kaderId2

      const measId = uuid()
      insertedMeasurements.push(measId)
      await db.insert(schema.pengukuran).values({
        id: measId,
        anakId,
        posyanduId: posId,
        kaderId,
        beratBadan: berat,
        tinggiBadan: tinggi,
        zScoreTBU: clampedZ,
        zScoreBBU: zBBU,
        zScoreBBTB: zBBTB,
        statusTBU: getTBUStatus(clampedZ),
        statusBBU: getBBUStatus(zBBU),
        statusBBTB: getBBTBStatus(zBBTB),
        tanggal,
      })
    }
  }
  console.log(`   ✓ ${insertedMeasurements.length} record pengukuran dibuat`)

  // ── 6. Ibu Hamil: PregnancyProfile + PregnancyVisit + Skrining ──────────────
  const hamilData = [
    // Risiko Rendah: LILA normal, Hb normal, IMT normal
    {
      ibuIdx: 15, hphtWeeksAgo: 20, bbPre: 55.0, height: 158, imt: 22.0, imtCat: "normal" as const,
      visits: [
        { weeksAgo: 4, weight: 60.5, lila: 26.0, hb: 12.5 },
        { weeksAgo: 8, weight: 59.0, lila: 25.8, hb: 12.3 },
        { weeksAgo: 12, weight: 57.5, lila: 25.5, hb: 12.1 },
      ],
      jawaban: { protein: true, fe: true, pengetahuan: true, sanitasi: false, rokok: false },
    },
    // Risiko Rendah: sehat
    {
      ibuIdx: 16, hphtWeeksAgo: 14, bbPre: 52.0, height: 155, imt: 21.6, imtCat: "normal" as const,
      visits: [
        { weeksAgo: 3, weight: 54.5, lila: 25.0, hb: 12.0 },
        { weeksAgo: 7, weight: 53.5, lila: 24.8, hb: 11.9 },
      ],
      jawaban: { protein: true, fe: true, pengetahuan: true, sanitasi: false, rokok: false },
    },
    // Risiko Sedang: LILA borderline, Hb oke
    {
      ibuIdx: 17, hphtWeeksAgo: 28, bbPre: 45.0, height: 152, imt: 19.5, imtCat: "normal" as const,
      visits: [
        { weeksAgo: 2, weight: 52.0, lila: 23.8, hb: 11.5 },
        { weeksAgo: 6, weight: 50.5, lila: 23.5, hb: 11.2 },
        { weeksAgo: 10, weight: 49.0, lila: 23.2, hb: 11.0 },
        { weeksAgo: 14, weight: 47.5, lila: 23.0, hb: 10.8 },
      ],
      jawaban: { protein: false, fe: true, pengetahuan: true, sanitasi: false, rokok: false },
    },
    // Risiko Tinggi: KEK (LILA < 23.5) + Anemia (Hb < 11)
    {
      ibuIdx: 18, hphtWeeksAgo: 32, bbPre: 41.0, height: 150, imt: 18.2, imtCat: "underweight" as const,
      visits: [
        { weeksAgo: 5, weight: 46.5, lila: 22.8, hb: 10.2 },
        { weeksAgo: 9, weight: 45.5, lila: 22.5, hb: 10.0 },
        { weeksAgo: 13, weight: 44.0, lila: 22.2, hb: 9.8 },
      ],
      jawaban: { protein: false, fe: false, pengetahuan: false, sanitasi: true, rokok: true },
    },
    // Risiko Sedang: Hb rendah borderline, belum diperiksa bulan ini
    {
      ibuIdx: 19, hphtWeeksAgo: 18, bbPre: 60.0, height: 160, imt: 23.4, imtCat: "normal" as const,
      visits: [
        // Terakhir periksa 5 minggu lalu, belum bulan ini
        { weeksAgo: 5, weight: 65.0, lila: 25.0, hb: 10.8 },
        { weeksAgo: 9, weight: 64.0, lila: 24.8, hb: 10.5 },
      ],
      jawaban: { protein: true, fe: false, pengetahuan: true, sanitasi: false, rokok: false },
    },
  ]

  for (const h of hamilData) {
    const ibuId = ibuIds[h.ibuIdx]
    const hpht = new Date()
    hpht.setDate(hpht.getDate() - h.hphtWeeksAgo * 7)

    const { totalMin, totalMax, weeklyMin, weeklyMax } = (() => {
      const iomMap: Record<string, [number, number, number, number]> = {
        underweight: [12.5, 18, 0.42, 0.59],
        normal:      [11.5, 16, 0.39, 0.48],
        overweight:  [7.0,  11.5, 0.23, 0.33],
        obese:       [5.0,  9,   0.17, 0.27],
      }
      const [tMin, tMax, wMin, wMax] = iomMap[h.imtCat]
      return { totalMin: tMin, totalMax: tMax, weeklyMin: wMin, weeklyMax: wMax }
    })()

    const profId = uuid()
    await db.insert(schema.pregnancyProfile).values({
      id: profId,
      ibuId,
      hpht,
      jumlahJanin: 1,
      bbPrepregnancyKg: h.bbPre,
      heightCm: h.height,
      imtPrepregnancy: h.imt,
      imtCategory: h.imtCat,
      targetGainMinKg: totalMin,
      targetGainMaxKg: totalMax,
      weeklyGainMinKg: weeklyMin,
      weeklyGainMaxKg: weeklyMax,
    })

    // Pregnancy visits
    for (const v of h.visits) {
      const visitDate = new Date()
      visitDate.setDate(visitDate.getDate() - v.weeksAgo * 7)
      const weightGain = Math.round((v.weight - h.bbPre) * 10) / 10
      const isOnTrack = weightGain >= totalMin * 0.4

      await db.insert(schema.pregnancyVisit).values({
        id: uuid(),
        ibuId,
        kaderId: kaderId1,
        visitDate,
        currentWeightKg: v.weight,
        weightGainKg: weightGain,
        lilaCm: v.lila,
        hbGdl: v.hb,
        isOnTrack,
        catatanKader: isOnTrack ? "Kondisi baik, pertahankan pola makan." : "Perlu perhatian khusus, diskusi dengan bidan.",
        kirimKeIbu: true,
      })
    }

    // Skrining kuesioner
    const skorRokok = (h.jawaban.rokok ? 2 : 0) * 2
    const skorProtein = (h.jawaban.protein ? 0 : 2) * 2
    const skorFe = (h.jawaban.fe ? 0 : 2) * 1.5
    const skorSanitasi = (h.jawaban.sanitasi ? 2 : 0) * 1.5
    const skorPengetahuan = (h.jawaban.pengetahuan ? 0 : 2) * 1
    const skorRisiko = Math.round(skorRokok + skorProtein + skorFe + skorSanitasi + skorPengetahuan)
    const kategori = skorRisiko <= 4 ? "RENDAH" : skorRisiko <= 10 ? "SEDANG" : "TINGGI"

    await db.insert(schema.skriningShamil).values({
      id: uuid(),
      ibuId,
      posyanduId: posId,
      kaderId: kaderId1,
      skorRisiko,
      kategori,
      jawaban: h.jawaban,
      tanggal: daysAgo(20),
    })
  }
  console.log("   ✓ 5 Ibu hamil + pregnancy profiles + visits + skrining dibuat")

  // ── 7. Notifikasi contoh ─────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10)
  const notifData = [
    {
      templateCode: "T1",
      level: "merah",
      judul: "4 anak belum diperiksa bulan ini",
      pesan: "Terdapat 4 anak di Posyandu Melati yang belum dilakukan penimbangan bulan ini. Segera ingatkan orang tua.",
      actionLabel: "Lihat Daftar",
      actionUrl: "/kader/anak",
      groupKey: `T1-${posId}-${today}`,
      mergeCount: 4,
    },
    {
      templateCode: "R1",
      level: "kuning",
      judul: "Ibu hamil risiko tinggi perlu perhatian",
      pesan: "Hartini Wahab (32 minggu) terdeteksi KEK dan anemia. Segera koordinasikan dengan bidan.",
      actionLabel: "Lihat Profil Ibu",
      actionUrl: `/kader/ibu/${ibuIds[18]}`,
      groupKey: `R1-${posId}-${ibuIds[18]}`,
      mergeCount: 1,
    },
    {
      templateCode: "T2",
      level: "kuning",
      judul: "2 anak stunting perlu tindak lanjut",
      pesan: "Terdapat anak dengan status stunting berat. Koordinasikan rujukan ke puskesmas.",
      actionLabel: "Lihat Rekap",
      actionUrl: "/kader/rekap",
      groupKey: `T2-${posId}-${today}`,
      mergeCount: 2,
    },
  ]

  for (const n of notifData) {
    await db.insert(schema.notifikasi).values({
      id: uuid(),
      posyanduId: posId,
      ibuId: null,
      ...n,
      isRead: false,
    })
  }
  console.log("   ✓ 3 Notifikasi dibuat")

  // ── 8. Ringkasan ─────────────────────────────────────────────────────────────
  console.log(`
✅  Seeding selesai!
─────────────────────────────────────────
🏥  Posyandu: Posyandu Melati
👩  Login Kader 1: kader1 / kader1234
👩  Login Kader 2: kader2 / kader5678
─────────────────────────────────────────
📊  Data yang tersedia:
    • 25 Anak  (8 Normal, 8 Risiko Stunting, 4 Stunting, 5 belum periksa)
    • 5 Ibu Hamil  (2 Rendah, 1 Sedang, 1 Tinggi, 1 belum periksa bulan ini)
    • ${insertedMeasurements.length} Record pengukuran (trend 6 bulan terisi)
    • 3 Notifikasi dashboard
    • Semua fitur dashboard, chart, tindak lanjut ✓
─────────────────────────────────────────
`)
}

main().catch((err) => {
  console.error("❌  Seed gagal:", err)
  process.exit(1)
})
