export type IMTCategory = 'underweight' | 'normal' | 'overweight' | 'obese'

export interface IOMTargets {
  totalGainMinKg: number
  totalGainMaxKg: number
  weeklyGainMinKg: number
  weeklyGainMaxKg: number
}

export interface PregnancyProfileData {
  id: string
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

const IOM_TABLE: Record<IMTCategory, IOMTargets> = {
  underweight: { totalGainMinKg: 12.7, totalGainMaxKg: 18,   weeklyGainMinKg: 0.45, weeklyGainMaxKg: 0.59 },
  normal:      { totalGainMinKg: 11.3, totalGainMaxKg: 15.9, weeklyGainMinKg: 0.36, weeklyGainMaxKg: 0.45 },
  overweight:  { totalGainMinKg: 6.8,  totalGainMaxKg: 11.3, weeklyGainMinKg: 0.27, weeklyGainMaxKg: 0.32 },
  obese:       { totalGainMinKg: 5,    totalGainMaxKg: 9,    weeklyGainMinKg: 0.22, weeklyGainMaxKg: 0.27 },
}

export function getIOMTargets(category: IMTCategory): IOMTargets {
  return IOM_TABLE[category]
}
