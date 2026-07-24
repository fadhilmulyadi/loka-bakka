export type ImtCategory = "underweight" | "normal" | "overweight" | "obese"
export type KategoriRisiko = "RENDAH" | "SEDANG" | "TINGGI"

export interface JawabanKuesioner {
  protein: boolean     // true = "Ya" (makan gizi seimbang & protein hewani) -> TIDAK berisiko
  fe: boolean          // true = "Ya" (rutin minum tablet Fe) -> TIDAK berisiko
  pengetahuan: boolean // true = "Ya" (paham info kehamilan sesuai usia) -> TIDAK berisiko
  sanitasi: boolean    // true = "Ya" (TIDAK ada akses air bersih layak) -> berisiko
  rokok: boolean       // true = "Ya" (merokok/terpapar asap rokok) -> berisiko
}

export interface SkorKuesionerResult {
  skor: number // 0-16
  band: KategoriRisiko
}

export function hitungSkorKuesioner(jawaban: JawabanKuesioner): SkorKuesionerResult {
  const rokok = (jawaban.rokok ? 2 : 0) * 2
  const protein = (jawaban.protein ? 0 : 2) * 2
  const fe = (jawaban.fe ? 0 : 2) * 1.5
  const sanitasi = (jawaban.sanitasi ? 2 : 0) * 1.5
  const pengetahuan = (jawaban.pengetahuan ? 0 : 2) * 1

  const skor = rokok + protein + fe + sanitasi + pengetahuan
  const band: KategoriRisiko = skor <= 4 ? "RENDAH" : skor <= 10 ? "SEDANG" : "TINGGI"
  return { skor, band }
}

export function bandToPoin(band: KategoriRisiko): number {
  return band === "RENDAH" ? 0 : band === "SEDANG" ? 1 : 2
}

export interface SkorGabunganInput {
  imtCategory: ImtCategory
  lilaCm: number
  hbGdl: number
  kuesionerBand: KategoriRisiko
}

export interface SkorGabunganResult {
  skor: number // 0-8
  kategori: KategoriRisiko
}

export function hitungSkorGabungan(input: SkorGabunganInput): SkorGabunganResult {
  const imtPoin = input.imtCategory === "underweight" ? 2 : 0
  const lilaPoin = input.lilaCm < 23.5 ? 2 : 0
  const hbPoin = input.hbGdl < 10 ? 2 : 0
  const kuesionerPoin = bandToPoin(input.kuesionerBand)

  const skor = imtPoin + lilaPoin + hbPoin + kuesionerPoin
  const kategori: KategoriRisiko = skor <= 1 ? "RENDAH" : skor <= 5 ? "SEDANG" : "TINGGI"
  return { skor, kategori }
}

export type RiskLevel = "rendah" | "sedang" | "tinggi"

export const kategoriToLevel: Record<KategoriRisiko, RiskLevel> = {
  RENDAH: "rendah",
  SEDANG: "sedang",
  TINGGI: "tinggi",
}

/**
 * Satu-satunya sumber status ibu untuk UI. Dipakai halaman ibu maupun kader
 * supaya labelnya tidak berbeda-beda per halaman.
 * kuesionerBand default RENDAH ketika ibu belum pernah mengisi kuesioner —
 * skor lain (IMT/LILA/Hb) tetap dihitung penuh.
 */
export function hitungRisikoIbu(input: {
  imtCategory: ImtCategory
  lilaCm: number
  hbGdl: number
  kuesionerBand?: KategoriRisiko | null
}): { skor: number; kategori: KategoriRisiko; level: RiskLevel } {
  const { skor, kategori } = hitungSkorGabungan({
    imtCategory: input.imtCategory,
    lilaCm: input.lilaCm,
    hbGdl: input.hbGdl,
    kuesionerBand: input.kuesionerBand ?? "RENDAH",
  })
  return { skor, kategori, level: kategoriToLevel[kategori] }
}

export const edukasiIbu: Record<KategoriRisiko, string> = {
  RENDAH: "Kondisi kehamilan baik dan tumbuh kembang janin terpantau normal, tetap konsumsi tablet tambah darah, lauk protein, dan rutin ke posyandu/puskesmas agar kondisi ini terus terjaga.",
  SEDANG: "Terdapat kondisi (Hb/berat badan/LILA) yang belum ideal, sehingga perlu segera ke kader/bidan minggu ini, rutin minum tablet tambah darah, dan makan bergizi agar janin tumbuh optimal.",
  TINGGI: "Beberapa faktor risiko (Hb rendah, LILA kurang, berat badan tidak naik) muncul bersamaan dan berpotensi menghambat pertumbuhan janin jika tidak segera ditangani di posyandu/puskesmas terdekat.",
}