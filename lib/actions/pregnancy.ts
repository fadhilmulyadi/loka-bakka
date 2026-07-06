"use server"

import { db } from "@/lib/db/client"
import { pregnancyProfile, pregnancyVisit, ibu } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
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

  const profile = await db.query.pregnancyProfile.findFirst({
    where: eq(pregnancyProfile.ibuId, session.user.id),
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

  const visits = await db.query.pregnancyVisit.findMany({
    where: eq(pregnancyVisit.ibuId, session.user.id),
    orderBy: desc(pregnancyVisit.visitDate),
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
  heightCm: number
  bbPrepregnancyKg: number
  hpht: Date
}) {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

  const ibuRow = await db.query.ibu.findFirst({
    where: eq(ibu.id, data.ibuId),
    with: { pregnancyProfile: true },
  })

  if (!ibuRow) throw new Error("Ibu not found")

  let profile = ibuRow.pregnancyProfile

  if (!profile) {
    const imt = calculateIMT(data.bbPrepregnancyKg, data.heightCm)
    const category = getIMTCategory(imt)
    const targets = getIOMTargets(category)

    const [created] = await db.insert(pregnancyProfile).values({
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
    }).returning()

    profile = created
  }

  const weightGainKg = data.currentWeightKg - profile.bbPrepregnancyKg
  const isOnTrack = data.lilaCm >= 23.5 && data.hbGdl >= 11.0

  const [result] = await db.insert(pregnancyVisit).values({
    ibuId: data.ibuId,
    visitDate: new Date(),
    currentWeightKg: data.currentWeightKg,
    weightGainKg: weightGainKg,
    lilaCm: data.lilaCm,
    hbGdl: data.hbGdl,
    isOnTrack: isOnTrack,
  }).returning()

  if (!ibuRow.isHamil) {
    await db.update(ibu).set({ isHamil: true }).where(eq(ibu.id, data.ibuId))
  }

  const { revalidatePath } = await import("next/cache")
  revalidatePath(`/kader/ibu/${data.ibuId}`)
  revalidatePath("/kader/dashboard")

  return result
}
