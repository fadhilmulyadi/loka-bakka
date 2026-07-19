import { heightForAgeBoys, heightForAgeGirls } from './height-for-age'

export type Sex = 'L' | 'P'

export type StuntingStatus =
  | 'stunting'          // < -3
  | 'risiko_stunting'   // -3 <= z < -2
  | 'normal'            // z >= -2

export interface StuntingResult {
  zScore: number
  status: StuntingStatus
  /** tinggi referensi median WHO untuk usia ini (cm) */
  referenceMedian: number
}

/**
 * Hitung z-score tinggi/panjang berdasarkan standar WHO LHFA.
 * Menggunakan metode LMS Box-Cox:  Z = ((X / M)^L - 1) / (L × S)
 */
export function calcHeightZScore(
  heightCm: number,
  ageMonths: number,
  sex: Sex
): StuntingResult {
  const table = sex === 'L' ? heightForAgeBoys : heightForAgeGirls
  const ref = table.find(r => r.ageMonths === Math.round(ageMonths))

  if (!ref) {
    throw new Error(`Data WHO tidak tersedia untuk usia ${ageMonths} bulan`)
  }

  const zScore = (Math.pow(heightCm / ref.m, ref.l) - 1) / (ref.l * ref.s)
  const rounded = Math.round(zScore * 100) / 100

  return {
    zScore: rounded,
    status: getStuntingStatus(rounded),
    referenceMedian: ref.sd0,
  }
}

export function getStuntingStatus(zScore: number): StuntingStatus {
  if (zScore < -3) return 'stunting'
  if (zScore < -2) return 'risiko_stunting'
  return 'normal'
}

/** Label bahasa Indonesia untuk ditampilkan di UI */
export const stuntingLabel: Record<StuntingStatus, string> = {
  stunting: 'Stunting',
  risiko_stunting: 'Risiko Stunting',
  normal: 'Normal',
}

export const stuntingColor: Record<StuntingStatus, string> = {
  stunting: '#ef4444',  // red-500
  risiko_stunting: '#eab308', // yellow-500 (or orange-500 if preferred)
  normal: '#22c55e',            // green-500
}

export const stuntingEdukasi: Record<StuntingStatus, string> = {
  normal: "Tinggi badan sesuai usia. Pertahankan gizi seimbang dan rutin timbang di posyandu tiap bulan.",
  risiko_stunting: "Terindikasi stunting. Konsultasikan dengan bidan/petugas gizi dan pantau ketat tiap bulan.",
  stunting: "Stunting berat. Segera rujuk ke puskesmas untuk pemeriksaan dan penanganan lanjutan.",
}
