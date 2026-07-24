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
export const stuntingLabel = {
  stunting: 'Stunting',
  risiko_stunting: 'Pra Stunting',
  normal: 'Normal',
} as const satisfies Record<StuntingStatus, string>

export type StatusAnak = (typeof stuntingLabel)[StuntingStatus]

/**
 * Satu-satunya sumber label status gizi anak untuk UI: selalu diturunkan ulang
 * dari z-score TB/U, bukan dari kolom statusTBU yang tersimpan. Baris lama masih
 * menyimpan taksonomi 5-band ("Berisiko", "Gizi Kurang", "Stunting Berat") yang
 * sudah pensiun, dan itu bikin bucket dashboard salah hitung.
 */
export function statusAnak(p?: { zScoreTBU: number } | null): StatusAnak {
  return p ? stuntingLabel[getStuntingStatus(p.zScoreTBU)] : 'Normal'
}

export const stuntingColor: Record<StuntingStatus, string> = {
  stunting: '#ef4444',  // red-500
  risiko_stunting: '#eab308', // yellow-500 (or orange-500 if preferred)
  normal: '#22c55e',            // green-500
}

export const stuntingEdukasi: Record<StuntingStatus, string> = {
  normal: "Tinggi badan anak sesuai standar (tumbuh normal), lanjutkan pola makan bergizi dan rutin timbang di posyandu.",
  risiko_stunting: "Tinggi badan anak mulai di bawah standar (cenderung pendek), segera ke kader/bidan dan tambah asupan protein.",
  stunting: "Anak terindikasi stunting (sangat pendek untuk usianya), segera periksakan ke posyandu atau puskesmas untuk penanganan lanjutan.",
}
