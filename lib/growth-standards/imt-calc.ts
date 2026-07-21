export type IMTCategory = 'underweight' | 'normal' | 'overweight' | 'obese'

/** Trimester 1 berakhir di minggu ke-13; kehamilan aterm dihitung 40 minggu. */
export const T1_END_WEEK = 13
export const TERM_WEEK = 40
const T2T3_WEEKS = TERM_WEEK - T1_END_WEEK // 27

interface IOMRow {
  t1MinKg: number
  t1MaxKg: number
  totalMinKg: number
  totalMaxKg: number
  /** Kehamilan ganda; null = tidak ada rekomendasi resmi untuk kategori ini. */
  gandaMinKg: number | null
  gandaMaxKg: number | null
}

const IOM_TABLE: Record<IMTCategory, IOMRow> = {
  underweight: { t1MinKg: 1,   t1MaxKg: 3, totalMinKg: 12.5, totalMaxKg: 18,   gandaMinKg: null, gandaMaxKg: null },
  normal:      { t1MinKg: 1,   t1MaxKg: 3, totalMinKg: 11.5, totalMaxKg: 16,   gandaMinKg: 17,   gandaMaxKg: 24 },
  overweight:  { t1MinKg: 1,   t1MaxKg: 3, totalMinKg: 7,    totalMaxKg: 11.5, gandaMinKg: 14,   gandaMaxKg: 23 },
  obese:       { t1MinKg: 0.2, t1MaxKg: 2, totalMinKg: 5,    totalMaxKg: 9,    gandaMinKg: 11,   gandaMaxKg: 19 },
}

export interface IOMTargets {
  t1MinKg: number
  t1MaxKg: number
  totalGainMinKg: number
  totalGainMaxKg: number
  weeklyGainMinKg: number
  weeklyGainMaxKg: number
}

export interface PregnancyProfileData {
  id: string
  hpht: Date
  jumlahJanin: number
  /** Band kuesioner skrining terakhir; null bila ibu belum pernah mengisi. */
  kuesionerBand: import('./risiko-kehamilan-calc').KategoriRisiko | null
  bbPrepregnancyKg: number
  heightCm: number
  imtPrepregnancy: number
  imtCategory: IMTCategory
  targetGainMinKg: number
  targetGainMaxKg: number
  weeklyGainMinKg: number
  weeklyGainMaxKg: number
}

export interface PregnancyVisitData {
  id: string
  visitDate: Date
  currentWeightKg: number
  weightGainKg: number
  lilaCm: number
  hbGdl: number
  isOnTrack: boolean
  catatanKader: string | null
  kirimKeIbu: boolean
}

export function calculateIMT(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100
  return weightKg / (heightM * heightM)
}

export function getIMTCategory(imt: number): IMTCategory {
  if (imt < 18.5) return 'underweight'
  if (imt < 25) return 'normal'
  if (imt < 30) return 'overweight'
  return 'obese'
}

/**
 * Laju mingguan T2-T3 diturunkan dari tabel, bukan dihardcode: batas bawah/atas
 * ditarik dari akhir target trimester 1 sampai target total di minggu ke-40.
 * Hasilnya mengapit laju rujukan (mis. normal 0,39-0,48 kg/mgg mengapit 0,4)
 * sekaligus menjamin zona di minggu 40 tepat sama dengan target total.
 */
export function getIOMTargets(category: IMTCategory, jumlahJanin = 1): IOMTargets {
  const row = IOM_TABLE[category]
  const ganda = jumlahJanin >= 2 && row.gandaMinKg !== null
  const totalGainMinKg = ganda ? row.gandaMinKg! : row.totalMinKg
  const totalGainMaxKg = ganda ? row.gandaMaxKg! : row.totalMaxKg

  return {
    t1MinKg: row.t1MinKg,
    t1MaxKg: row.t1MaxKg,
    totalGainMinKg,
    totalGainMaxKg,
    weeklyGainMinKg: (totalGainMinKg - row.t1MinKg) / T2T3_WEEKS,
    weeklyGainMaxKg: (totalGainMaxKg - row.t1MaxKg) / T2T3_WEEKS,
  }
}

/**
 * Zona kenaikan BB yang diharapkan pada usia kandungan tertentu.
 * Trimester 1 memakai target datar (1-3 kg, obesitas 0,2-2 kg) yang dinaikkan
 * linear dari minggu 0 agar kurvanya menyambung; laju mingguan baru berlaku
 * setelah minggu ke-13.
 */
export function getExpectedGainRange(weeks: number, t: IOMTargets): { minKg: number; maxKg: number } {
  const w = Math.max(0, Math.min(weeks, TERM_WEEK))
  if (w <= T1_END_WEEK) {
    const f = w / T1_END_WEEK
    return { minKg: t.t1MinKg * f, maxKg: t.t1MaxKg * f }
  }
  const extra = w - T1_END_WEEK
  return {
    minKg: t.t1MinKg + t.weeklyGainMinKg * extra,
    maxKg: t.t1MaxKg + t.weeklyGainMaxKg * extra,
  }
}

export type WeightGainStatus = 'kurang' | 'normal' | 'lebih'

export function getWeightGainStatus(
  weightGainKg: number,
  weeksPregnant: number,
  targets: IOMTargets
): WeightGainStatus {
  const { minKg, maxKg } = getExpectedGainRange(weeksPregnant, targets)
  if (weightGainKg < minKg) return 'kurang'
  if (weightGainKg > maxKg) return 'lebih'
  return 'normal'
}

export const imtCategoryLabel: Record<IMTCategory, string> = {
  underweight: 'Kurus',
  normal: 'Normal',
  overweight: 'Gemuk',
  obese: 'Obesitas',
}

export const weightGainLabel: Record<WeightGainStatus, string> = {
  kurang: 'Kenaikan Kurang',
  normal: 'Normal',
  lebih: 'Kenaikan Berlebih',
}
