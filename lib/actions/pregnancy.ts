"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { 
  calculateIMT, 
  getIMTCategory, 
  getIOMTargets, 
  type PregnancyProfileData, 
  type PregnancyVisitData 
} from "@/lib/growth-standards/imt-calc"

export async function getPregnancyProfile(): Promise<PregnancyProfileData | null> {
  const session = await auth()
  if (!session || session.user.role !== "ibu") throw new Error("Unauthorized")

  const profile = await prisma.pregnancyProfile.findUnique({
    where: { ibuId: session.user.id },
  })

  if (!profile) return null

  return {
    id: profile.id,
    bbPrepregnancyKg: profile.bbPrepregnancyKg,
    heightCm: profile.heightCm,
    imtPrepregnancy: profile.imtPrepregnancy,
    imtCategory: profile.imtCategory as PregnancyProfileData['imtCategory'],
    targetGainMinKg: profile.targetGainMinKg,
    targetGainMaxKg: profile.targetGainMaxKg,
    weeklyGainMinKg: profile.weeklyGainMinKg,
    weeklyGainMaxKg: profile.weeklyGainMaxKg,
  }
}

export async function getPregnancyVisits(): Promise<PregnancyVisitData[]> {
  const session = await auth()
  if (!session || session.user.role !== "ibu") throw new Error("Unauthorized")

  const visits = await prisma.pregnancyVisit.findMany({
    where: { ibuId: session.user.id },
    orderBy: { visitDate: "desc" },
  })

  return visits.map(v => ({
    id: v.id,
    visitDate: v.visitDate,
    currentWeightKg: v.currentWeightKg,
    weightGainKg: v.weightGainKg,
    lilaCm: v.lilaCm,
    hbGdl: v.hbGdl,
    isOnTrack: v.isOnTrack,
  }))
}

export async function savePregnancyVisit(data: {
  ibuId: string
  currentWeightKg: number
  lilaCm: number
  hbGdl: number
  // Baseline data required for first visit profile
  heightCm: number
  bbPrepregnancyKg: number
  hpht: Date
}) {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

  let ibu = await prisma.ibu.findUnique({
    where: { id: data.ibuId },
    include: { pregnancyProfile: true }
  })

  if (!ibu) throw new Error("Ibu not found")

  // If no pregnancy profile, create one first
  if (!ibu.pregnancyProfile) {
    const imt = calculateIMT(data.bbPrepregnancyKg, data.heightCm)
    const category = getIMTCategory(imt)
    const targets = getIOMTargets(category)

    const profile = await prisma.pregnancyProfile.create({
      data: {
        ibuId: data.ibuId,
        hpht: data.hpht,
        bbPrepregnancyKg: data.bbPrepregnancyKg,
        heightCm: data.heightCm,
        imtPrepregnancy: imt,
        imtCategory: category,
        targetGainMinKg: targets.totalGainMinKg,
        targetGainMaxKg: targets.totalGainMaxKg,
        weeklyGainMinKg: targets.weeklyGainMinKg,
        weeklyGainMaxKg: targets.weeklyGainMaxKg,
      }
    })

    // Refresh ibu object with the new profile
    ibu.pregnancyProfile = profile
  }

  const weightGainKg = data.currentWeightKg - ibu.pregnancyProfile.bbPrepregnancyKg
  
  // Basic logic for "on track" (can be refined with gestational age later)
  const isOnTrack = data.lilaCm >= 23.5 && data.hbGdl >= 11.0

  const result = await prisma.pregnancyVisit.create({
    data: {
      ibuId: data.ibuId,
      visitDate: new Date(),
      currentWeightKg: data.currentWeightKg,
      weightGainKg: weightGainKg,
      lilaCm: data.lilaCm,
      hbGdl: data.hbGdl,
      isOnTrack: isOnTrack,
    }
  })

  // Update Ibu's hamil status if not already set (just in case)
  if (!ibu.isHamil) {
    await prisma.ibu.update({
      where: { id: data.ibuId },
      data: { isHamil: true }
    })
  }

  const { revalidatePath } = await import("next/cache")
  revalidatePath(`/kader/ibu/${data.ibuId}`)
  revalidatePath("/kader/dashboard")
  
  return result
}
