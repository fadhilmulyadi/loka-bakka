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
        orderBy: { createdAt: "asc" },
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

  const isPregnant = ibu.isHamil
  const lastSkrining = ibu.skrinings[0]
  const pregnancyProfile = ibu.pregnancyProfile
  const lastVisit = ibu.pregnancyVisits[0] ?? null

  // Data Kehamilan
  const pregnancyData = isPregnant ? {
    weeksPregnant: 24, // TODO: Hitung dari HPHT jika ada
    dueDate: "12 Sep 2026",
    riskStatus: lastSkrining?.kategori || "Aman",
    riskScore: lastSkrining?.skorRisiko || 16,
    lila: lastVisit?.lilaCm ?? 25.1,
    hb: lastVisit?.hbGdl ?? 11.8,
    bbGain: lastVisit?.weightGainKg ?? 6.5,
    isOnTrack: lastVisit?.isOnTrack ?? null,
    targetGainMin: pregnancyProfile?.targetGainMinKg ?? null,
    targetGainMax: pregnancyProfile?.targetGainMaxKg ?? null,
  } : null

  // Data Anak (ambil anak pertama jika tidak hamil)
  const firstAnak = ibu.anaks[0]
  const childData = firstAnak ? {
    id: firstAnak.id,
    nama: firstAnak.nama,
    jenisKelamin: firstAnak.jenisKelamin as "L" | "P",
    tanggalLahir: firstAnak.tanggalLahir,
    usiaBulan: (() => {
      const birth = new Date(firstAnak.tanggalLahir)
      const now = new Date()
      return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
    })(),
    lastPengukuran: firstAnak.pengukurans[0] ? {
      beratBadan: firstAnak.pengukurans[0].beratBadan,
      tinggiBadan: firstAnak.pengukurans[0].tinggiBadan,
      statusTBU: firstAnak.pengukurans[0].statusTBU,
      zScoreTBU: firstAnak.pengukurans[0].zScoreTBU,
      tanggal: firstAnak.pengukurans[0].tanggal,
    } : null
  } : null

  return {
    nama: ibu.nama,
    isPregnant,
    pregnancyData,
    childData,
  }
}

export async function getIbuProfile() {
  const session = await auth()
  if (!session || session.user.role !== "ibu") {
    throw new Error("Unauthorized")
  }

  const ibu = await prisma.ibu.findUnique({
    where: { id: session.user.id },
    include: {
      posyandu: true,
      pregnancyProfile: true,
      skrinings: {
        orderBy: { tanggal: "desc" },
        take: 1,
      },
    },
  })

  if (!ibu) return null

  return {
    nama: ibu.nama,
    noHp: ibu.noHp,
    tanggalLahir: ibu.tanggalLahir,
    alamat: ibu.alamat,
    posyandu: ibu.posyandu.nama,
    kelurahan: ibu.posyandu.kelurahan,
    kecamatan: ibu.posyandu.kecamatan,
    isPregnant: ibu.isHamil,
    lastSkrining: ibu.skrinings[0] ?? null,
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
