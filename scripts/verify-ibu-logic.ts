/**
 * Self-check logika status ibu terhadap tabel rujukan.
 * Jalankan: npx tsx scripts/verify-ibu-logic.ts
 */
import assert from "node:assert/strict"
import {
  getIOMTargets, getExpectedGainRange, getWeightGainStatus,
  calculateIMT, getIMTCategory, TERM_WEEK, T1_END_WEEK,
  type IMTCategory,
} from "../lib/growth-standards/imt-calc"
import {
  hitungSkorKuesioner, hitungSkorGabungan, hitungRisikoIbu,
} from "../lib/growth-standards/risiko-kehamilan-calc"

const near = (a: number, b: number, tol = 0.06) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} != ${b} (tol ${tol})`)

// --- Kategori IMT sesuai ambang tabel ---
assert.equal(getIMTCategory(calculateIMT(45, 160)), "underweight") // 17.6
assert.equal(getIMTCategory(18.4), "underweight")
assert.equal(getIMTCategory(18.5), "normal")
assert.equal(getIMTCategory(24.9), "normal")
assert.equal(getIMTCategory(25.0), "overweight")
assert.equal(getIMTCategory(29.9), "overweight")
assert.equal(getIMTCategory(30.0), "obese")

// --- Target total, tunggal & ganda ---
const tabel: Record<IMTCategory, [number, number]> = {
  underweight: [12.5, 18], normal: [11.5, 16], overweight: [7, 11.5], obese: [5, 9],
}
for (const [kat, [min, max]] of Object.entries(tabel) as [IMTCategory, [number, number]][]) {
  const t = getIOMTargets(kat)
  assert.equal(t.totalGainMinKg, min)
  assert.equal(t.totalGainMaxKg, max)
  // Zona di minggu 40 harus tepat menutup target total.
  const akhir = getExpectedGainRange(TERM_WEEK, t)
  near(akhir.minKg, min, 1e-9)
  near(akhir.maxKg, max, 1e-9)
}
assert.deepEqual(
  [getIOMTargets("normal", 2).totalGainMinKg, getIOMTargets("normal", 2).totalGainMaxKg], [17, 24])
assert.deepEqual(
  [getIOMTargets("obese", 2).totalGainMinKg, getIOMTargets("obese", 2).totalGainMaxKg], [11, 19])
// Kurus tidak punya rujukan ganda -> tetap pakai angka tunggal.
assert.equal(getIOMTargets("underweight", 2).totalGainMaxKg, 18)

// --- Trimester 1 datar 1-3 kg (obesitas 0,2-2), bukan ekstrapolasi laju mingguan ---
const normal = getIOMTargets("normal")
const t1 = getExpectedGainRange(T1_END_WEEK, normal)
near(t1.minKg, 1, 1e-9)
near(t1.maxKg, 3, 1e-9)
const obese13 = getExpectedGainRange(T1_END_WEEK, getIOMTargets("obese"))
near(obese13.minKg, 0.2, 1e-9)
near(obese13.maxKg, 2, 1e-9)
// Regresi bug lama: minggu 12 dulu menuntut ~4,3-5,4 kg sehingga 2 kg dicap "kurang".
assert.equal(getWeightGainStatus(2, 12, normal), "normal")

// --- Laju T2-T3 mengapit laju rujukan tabel ---
const laju: Record<IMTCategory, number> = {
  underweight: 0.5, normal: 0.4, overweight: 0.3, obese: 0.2,
}
for (const [kat, ref] of Object.entries(laju) as [IMTCategory, number][]) {
  const t = getIOMTargets(kat)
  assert.ok(t.weeklyGainMinKg <= ref + 0.03 && t.weeklyGainMaxKg >= ref - 0.03,
    `${kat}: ${ref} di luar ${t.weeklyGainMinKg}-${t.weeklyGainMaxKg}`)
}
assert.equal(getWeightGainStatus(20, 30, normal), "lebih")
assert.equal(getWeightGainStatus(0, 30, normal), "kurang")

// --- Skoring kuesioner (bobot & band) ---
const semuaBaik = { rokok: false, protein: true, fe: true, sanitasi: false, pengetahuan: true }
const semuaBuruk = { rokok: true, protein: false, fe: false, sanitasi: true, pengetahuan: false }
assert.deepEqual(hitungSkorKuesioner(semuaBaik), { skor: 0, band: "RENDAH" })
assert.deepEqual(hitungSkorKuesioner(semuaBuruk), { skor: 16, band: "TINGGI" })
assert.equal(hitungSkorKuesioner({ ...semuaBaik, rokok: true }).skor, 4)        // 2 x2
assert.equal(hitungSkorKuesioner({ ...semuaBaik, fe: false }).skor, 3)          // 2 x1,5
assert.equal(hitungSkorKuesioner({ ...semuaBaik, pengetahuan: false }).skor, 2) // 2 x1
assert.equal(hitungSkorKuesioner({ ...semuaBaik, rokok: true }).band, "RENDAH") // 4 -> rendah
assert.equal(hitungSkorKuesioner({ ...semuaBuruk, rokok: false }).skor, 12)
assert.equal(hitungSkorKuesioner({ ...semuaBuruk, rokok: false }).band, "TINGGI")  // 12 -> 11-16
assert.equal(hitungSkorKuesioner({ ...semuaBaik, protein: false, fe: false, sanitasi: true }).skor, 10)
assert.equal(hitungSkorKuesioner({ ...semuaBaik, protein: false, fe: false, sanitasi: true }).band, "SEDANG") // batas atas
assert.equal(hitungSkorKuesioner({ ...semuaBaik, protein: false, rokok: true }).band, "SEDANG") // 8

// --- Skor gabungan 0-8 dan interpretasi akhir ---
const aman = { imtCategory: "normal" as IMTCategory, lilaCm: 25, hbGdl: 12, kuesionerBand: "RENDAH" as const }
assert.deepEqual(hitungSkorGabungan(aman), { skor: 0, kategori: "RENDAH" })
assert.deepEqual(
  hitungSkorGabungan({ ...aman, imtCategory: "obese" }), { skor: 0, kategori: "RENDAH" }) // gemuk/obesitas = 0
assert.deepEqual(
  hitungSkorGabungan({ ...aman, imtCategory: "underweight" }), { skor: 2, kategori: "SEDANG" })
assert.deepEqual(hitungSkorGabungan({ ...aman, lilaCm: 23.4 }), { skor: 2, kategori: "SEDANG" })
assert.deepEqual(hitungSkorGabungan({ ...aman, lilaCm: 23.5 }), { skor: 0, kategori: "RENDAH" })
assert.deepEqual(hitungSkorGabungan({ ...aman, hbGdl: 9.9 }), { skor: 2, kategori: "SEDANG" })
assert.deepEqual(hitungSkorGabungan({ ...aman, hbGdl: 10 }), { skor: 0, kategori: "RENDAH" })
assert.deepEqual(
  hitungSkorGabungan({ imtCategory: "underweight", lilaCm: 22, hbGdl: 9, kuesionerBand: "TINGGI" }),
  { skor: 8, kategori: "TINGGI" })
assert.deepEqual(
  hitungSkorGabungan({ ...aman, lilaCm: 22, hbGdl: 9, kuesionerBand: "SEDANG" }),
  { skor: 5, kategori: "SEDANG" }) // batas atas sedang
assert.deepEqual(
  hitungSkorGabungan({ ...aman, imtCategory: "underweight", lilaCm: 22, hbGdl: 9 }),
  { skor: 6, kategori: "TINGGI" }) // batas bawah tinggi

// --- Helper UI: Hb 10-10,9 tidak lagi langsung "tinggi" (bug lama ambang 11) ---
assert.equal(hitungRisikoIbu({ imtCategory: "normal", lilaCm: 25, hbGdl: 10.5 }).level, "rendah")
assert.equal(hitungRisikoIbu({ imtCategory: "normal", lilaCm: 22, hbGdl: 12 }).level, "sedang")
assert.equal(
  hitungRisikoIbu({ imtCategory: "normal", lilaCm: 22, hbGdl: 9, kuesionerBand: "SEDANG" }).level, "sedang")

console.log("OK: semua pemeriksaan logika status ibu lulus")
