"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/auth"

export async function getIbuData() {
  const session = await auth()
  if (!session || session.user.role !== "ibu") {
    throw new Error("Unauthorized")
  }

  const ibu = await prisma.ibu.findUnique({
    where: { id: session.user.id },
    include: {
      anaks: {
        include: {
          pengukurans: {
            orderBy: { tanggal: "desc" },
            take: 1,
          },
        },
      },
      skrinings: {
        orderBy: { tanggal: "desc" },
        take: 1,
      },
      pregnancyProfile: true,
      pregnancyVisits: {
        orderBy: { visitDate: "desc" },
        take: 1,
      },
    },
  })

  if (!ibu) return null

  const lastSkrining = ibu.skrinings[0]
  const pregnancyProfile = ibu.pregnancyProfile
  const lastVisit = ibu.pregnancyVisits[0] ?? null

  return {
    nama: ibu.nama,
    isPregnant: !!ibu.pregnancyProfile,
    weeksPregnant: 24,
    dueDate: "12 Sep 2026",
    riskStatus: lastSkrining?.kategori || "Aman",
    riskScore: lastSkrining?.skorRisiko || 16,
    lila: lastVisit?.lilaCm ?? 25.1,
    hb: lastVisit?.hbGdl ?? 11.8,
    bbGain: lastVisit?.weightGainKg ?? 6.5,
    isOnTrack: lastVisit?.isOnTrack ?? null as boolean | null,
    targetGainMin: pregnancyProfile?.targetGainMinKg ?? null as number | null,
    targetGainMax: pregnancyProfile?.targetGainMaxKg ?? null as number | null,
  }
}

export async function getIbuAnaks() {
  const session = await auth()
  if (!session || session.user.role !== "ibu") throw new Error("Unauthorized")

  const ibu = await prisma.ibu.findUnique({
    where: { id: session.user.id },
    include: {
      anaks: {
        include: {
          pengukurans: { orderBy: { tanggal: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!ibu) return []

  return ibu.anaks.map((anak) => {
    const last = anak.pengukurans[0] ?? null
    const birth = new Date(anak.tanggalLahir)
    const now = new Date()
    const months =
      (now.getFullYear() - birth.getFullYear()) * 12 +
      (now.getMonth() - birth.getMonth())
    return {
      id: anak.id,
      nama: anak.nama,
      jenisKelamin: anak.jenisKelamin as "L" | "P",
      usia: months < 12 ? `${months} bln` : `${Math.floor(months / 12)} thn ${months % 12} bln`,
      status: last?.statusTBU ?? null,
      bb: last?.beratBadan ?? null,
      tanggalPengukuran: last?.tanggal ?? null,
    }
  })
}
