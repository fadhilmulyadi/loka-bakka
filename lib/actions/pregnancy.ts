"use server"

import { db } from "@/lib/db/client"
import { pregnancyProfile, pregnancyVisit, ibu, sesiPengukuran, skriningShamil } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { auth } from "@/auth"
import {
  calculateIMT,
  getIMTCategory,
  getIOMTargets,
  getWeightGainStatus,
  type PregnancyProfileData,
  type PregnancyVisitData
} from "@/lib/growth-standards/imt-calc"
import { hitungSkorKuesioner, type JawabanKuesioner } from "@/lib/growth-standards/risiko-kehamilan-calc"
import { calculateGestationalAge } from "@/lib/pregnancy-utils"
import { notifyPregnancyRisk } from "@/lib/actions/notifikasi"

export async function getPregnancyProfile(): Promise<PregnancyProfileData | null> {
  const session = await auth()
  if (!session || session.user.role !== "ibu") throw new Error("Unauthorized")

  const profile = await db.query.pregnancyProfile.findFirst({
    where: eq(pregnancyProfile.ibuId, session.user.id),
  })

  if (!profile) return null

  const lastSkrining = await db.query.skriningShamil.findFirst({
    where: eq(skriningShamil.ibuId, session.user.id),
    orderBy: desc(skriningShamil.tanggal),
  })

  return {
    id: profile.id,
    hpht: profile.hpht,
    jumlahJanin: profile.jumlahJanin,
    kuesionerBand: lastSkrining
      ? hitungSkorKuesioner(lastSkrining.jawaban as JawabanKuesioner).band
      : null,
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
    catatanKader: v.kirimKeIbu ? v.catatanKader : null,
    kirimKeIbu: v.kirimKeIbu,
  }))
}

export async function startPregnancy(data: {
  ibuId: string
  hpht: Date
  bbPrepregnancyKg: number
  heightCm: number
  jumlahJanin?: number
}) {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

  const ibuRow = await db.query.ibu.findFirst({
    where: eq(ibu.id, data.ibuId),
    with: { pregnancyProfile: true },
  })
  // isHamil alone isn't reliable: registration can mark an ibu as "Ibu Hamil"
  // without collecting HPHT/BB/TB yet, leaving isHamil=true with no profile.
  // Only a real, still-active profile means tracking has actually started.
  if (ibuRow?.isHamil && ibuRow.pregnancyProfile) {
    throw new Error("Kehamilan sedang aktif")
  }

  if (ibuRow?.pregnancyProfile) {
    // Stale profile from a pregnancy that already ended — delete to start fresh.
    await db.delete(pregnancyProfile).where(eq(pregnancyProfile.ibuId, data.ibuId))
  }

  const imt = calculateIMT(data.bbPrepregnancyKg, data.heightCm)
  const category = getIMTCategory(imt)
  const jumlahJanin = data.jumlahJanin ?? 1
  const targets = getIOMTargets(category, jumlahJanin)

  await db.insert(pregnancyProfile).values({
    ibuId: data.ibuId,
    hpht: data.hpht,
    jumlahJanin,
    bbPrepregnancyKg: data.bbPrepregnancyKg,
    heightCm: data.heightCm,
    imtPrepregnancy: imt,
    imtCategory: category,
    targetGainMinKg: targets.totalGainMinKg,
    targetGainMaxKg: targets.totalGainMaxKg,
    weeklyGainMinKg: targets.weeklyGainMinKg,
    weeklyGainMaxKg: targets.weeklyGainMaxKg,
  })

  await db.update(ibu).set({ isHamil: true }).where(eq(ibu.id, data.ibuId))

  const { revalidatePath } = await import("next/cache")
  revalidatePath(`/kader/ibu/${data.ibuId}`)
  revalidatePath("/kader/rekap")
  revalidatePath("/kader/dashboard")
}

export async function savePregnancyVisit(data: {
  ibuId: string
  currentWeightKg: number
  lilaCm: number
  hbGdl: number
  catatanKader?: string
}) {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

  const ibuRow = await db.query.ibu.findFirst({
    where: eq(ibu.id, data.ibuId),
    with: { pregnancyProfile: true },
  })

  if (!ibuRow) throw new Error("Ibu not found")
  const profile = ibuRow.pregnancyProfile
  if (!profile) throw new Error("Kehamilan belum dicatat. Catat kehamilan terlebih dahulu.")

  // Bulatkan ke 0,1 kg supaya sisa floating point (56,4 − 55,3 = 1,1000000000000014)
  // tidak ikut tersimpan ke database.
  const weightGainKg = Math.round((data.currentWeightKg - profile.bbPrepregnancyKg) * 10) / 10
  const weeks = calculateGestationalAge(new Date(profile.hpht))
  const targets = getIOMTargets(profile.imtCategory as PregnancyProfileData["imtCategory"], profile.jumlahJanin)
  const gainStatus = getWeightGainStatus(weightGainKg, weeks, targets)
  const isOnTrack = gainStatus === "normal"
  const lilaLow = data.lilaCm < 23.5
  // Ambang notifikasi kader tetap 11 g/dL (batas anemia WHO) supaya peringatan
  // muncul lebih dini; skoring risiko sendiri memakai ambang 10 g/dL.
  const hbLow = data.hbGdl < 11.0

  const [result] = await db.insert(pregnancyVisit).values({
    ibuId: data.ibuId,
    kaderId: session.user.id,
    visitDate: new Date(),
    currentWeightKg: data.currentWeightKg,
    weightGainKg: weightGainKg,
    lilaCm: data.lilaCm,
    hbGdl: data.hbGdl,
    isOnTrack: isOnTrack,
    catatanKader: data.catatanKader || null,
    kirimKeIbu: true,
  }).returning()

  if (!ibuRow.isHamil) {
    await db.update(ibu).set({ isHamil: true }).where(eq(ibu.id, data.ibuId))
  }

  if (lilaLow || hbLow || !isOnTrack) {
    const indikator = lilaLow ? "LILA" : hbLow ? "Hb" : "Kenaikan BB"
    const nilai = lilaLow
      ? `${data.lilaCm.toFixed(1).replace(".", ",")} cm`
      : hbLow
        ? `${data.hbGdl.toFixed(1).replace(".", ",")} g/dL`
        : `${weightGainKg >= 0 ? "+" : ""}${weightGainKg.toFixed(1).replace(".", ",")} kg`
    await notifyPregnancyRisk({
      posyanduId: ibuRow.posyanduId,
      ibuId: data.ibuId,
      nama: ibuRow.nama,
      usiaKandunganMinggu: weeks,
      indikator,
      nilai,
    })
  }

  const { revalidatePath } = await import("next/cache")
  revalidatePath(`/kader/ibu/${data.ibuId}`)
  revalidatePath("/kader/dashboard")

  return result
}

export async function endPregnancy(ibuId: string, outcome: string) {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")
  
  await db.update(ibu).set({ isHamil: false }).where(eq(ibu.id, ibuId))
  
  // TODO: Handle creating baby profile if outcome === "melahirkan"
  
  const { revalidatePath } = await import("next/cache")
  revalidatePath(`/kader/ibu/${ibuId}`)
  revalidatePath("/kader/rekap")
  revalidatePath("/kader/dashboard")
}

export async function saveSkriningDariSesi(data: {
  sessionId: string
  catatanKader?: string
}) {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

  const sesi = await db.query.sesiPengukuran.findFirst({
    where: eq(sesiPengukuran.id, data.sessionId),
  })

  if (!sesi) throw new Error("Sesi tidak ditemukan")
  if (sesi.kategori !== "ibu" || !sesi.ibuId) throw new Error("Sesi bukan untuk ibu hamil")
  if (sesi.statusHasil !== "selesai") throw new Error("Sesi belum selesai diproses alat")
  if (sesi.nilaiBerat == null || sesi.lilaCm == null || sesi.hbGdl == null || sesi.skorAkhir == null || !sesi.kategoriHasil) {
    throw new Error("Data hasil sesi tidak lengkap")
  }

  const visit = await savePregnancyVisit({
    ibuId: sesi.ibuId,
    currentWeightKg: sesi.nilaiBerat,
    lilaCm: sesi.lilaCm,
    hbGdl: sesi.hbGdl,
    catatanKader: data.catatanKader,
  })

  await db.insert(skriningShamil).values({
    ibuId: sesi.ibuId,
    posyanduId: session.user.posyanduId!,
    kaderId: session.user.id!,
    skorRisiko: sesi.skorAkhir,
    kategori: sesi.kategoriHasil,
    jawaban: sesi.jawaban ?? {},
  })

  const { revalidatePath: revalidate } = await import("next/cache")
  revalidate(`/kader/ibu/${sesi.ibuId}`)
  revalidate("/kader/dashboard")

  return visit
}
