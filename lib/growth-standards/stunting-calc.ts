import { heightForAgeBoys, heightForAgeGirls } from './height-for-age'

export type Sex = 'L' | 'P'

export type StuntingStatus =
  | 'severely_stunted'  // z < -3
  | 'stunted'           // -3 <= z < -2
  | 'normal'            // -2 <= z < +2
  | 'tall'              // z >= +2

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
  if (zScore < -3) return 'severely_stunted'
  if (zScore < -2) return 'stunted'
  if (zScore >= 2) return 'tall'
  return 'normal'
}

/** Label bahasa Indonesia untuk ditampilkan di UI */
export const stuntingLabel: Record<StuntingStatus, string> = {
  severely_stunted: 'Sangat Pendek',
  stunted: 'Pendek (Stunting)',
  normal: 'Normal',
  tall: 'Tinggi',
}

export const stuntingColor: Record<StuntingStatus, string> = {
  severely_stunted: '#ef4444',  // red-500
  stunted: '#f97316',           // orange-500
  normal: '#22c55e',            // green-500
  tall: '#3b82f6',              // blue-500
}
