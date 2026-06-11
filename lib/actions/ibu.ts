"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { calculateGestationalAge, calculateHPL, MONTHS_ID } from "@/lib/pregnancy-utils"

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
            take: 10,
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

  let weeksPregnant = 0
  let dueDateStr = "—"
  let trimester = 0
  let daysRemaining = 0
  
  if (pregnancyProfile?.hpht) {
    weeksPregnant = calculateGestationalAge(new Date(pregnancyProfile.hpht))
    const dueDate = calculateHPL(new Date(pregnancyProfile.hpht))
    dueDateStr = `${dueDate.getDate()} ${MONTHS_ID[dueDate.getMonth()]} ${dueDate.getFullYear()}`
    
    if (weeksPregnant <= 13) trimester = 1
    else if (weeksPregnant <= 27) trimester = 2
    else trimester = 3

    const now = new Date()
    const diffTime = dueDate.getTime() - now.getTime()
    daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
  }

  // Data Kehamilan
  const pregnancyData = isPregnant ? {
    weeksPregnant: weeksPregnant,
    dueDate: dueDateStr,
    trimester: trimester,
    daysRemaining: daysRemaining,
    riskStatus: lastSkrining?.kategori || "Aman",
    riskScore: lastSkrining?.skorRisiko || 0,
    lila: lastVisit?.lilaCm ?? 0,
    hb: lastVisit?.hbGdl ?? 0,
    bbGain: lastVisit?.weightGainKg ?? 0,
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
    } : null,
    pengukurans: firstAnak.pengukurans.map((p) => ({
      tanggal: p.tanggal,
      beratBadan: p.beratBadan,
      tinggiBadan: p.tinggiBadan,
      statusTBU: p.statusTBU,
      zScoreTBU: p.zScoreTBU,
    })),
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
    pregnancyProfile: ibu.pregnancyProfile,
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

export async function getIbuAnakForDashboard(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "ibu") throw new Error("Unauthorized")

  const [ibu, anak] = await Promise.all([
    prisma.ibu.findUnique({ where: { id: session.user.id }, select: { nama: true } }),
    prisma.anak.findFirst({
      where: { id, ibuId: session.user.id },
      include: { pengukurans: { orderBy: { tanggal: "desc" }, take: 10 } },
    }),
  ])

  if (!ibu || !anak) return null

  const birth = new Date(anak.tanggalLahir)
  const now = new Date()
  const usiaBulan =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())

  return {
    nama: ibu.nama,
    childData: {
      id: anak.id,
      nama: anak.nama,
      jenisKelamin: anak.jenisKelamin as "L" | "P",
      tanggalLahir: anak.tanggalLahir,
      usiaBulan,
      lastPengukuran: anak.pengukurans[0]
        ? {
            beratBadan: anak.pengukurans[0].beratBadan,
            tinggiBadan: anak.pengukurans[0].tinggiBadan,
            statusTBU: anak.pengukurans[0].statusTBU,
            zScoreTBU: anak.pengukurans[0].zScoreTBU,
            tanggal: anak.pengukurans[0].tanggal,
          }
        : null,
      pengukurans: anak.pengukurans.map((p) => ({
        tanggal: p.tanggal,
        beratBadan: p.beratBadan,
        tinggiBadan: p.tinggiBadan,
        statusTBU: p.statusTBU,
        zScoreTBU: p.zScoreTBU,
      })),
    },
  }
}

export async function getIbuAnakDetail(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "ibu") throw new Error("Unauthorized")

  const anak = await prisma.anak.findFirst({
    where: { id, ibuId: session.user.id },
    include: {
      pengukurans: { orderBy: { tanggal: "desc" } },
    },
  })

  if (!anak) return null

  const birth = new Date(anak.tanggalLahir)
  const now = new Date()
  const ageMonths =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth())

  const last = anak.pengukurans[0] ?? null

  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d)

  return {
    id: anak.id,
    nama: anak.nama,
    jenisKelamin: anak.jenisKelamin as "L" | "P",
    tanggalLahir: fmt(birth),
    usia:
      ageMonths < 12
        ? `${ageMonths} bln`
        : `${Math.floor(ageMonths / 12)} thn ${ageMonths % 12} bln`,
    anakKe: anak.anakKe?.toString() ?? "—",
    latest: last
      ? {
          bb: last.beratBadan,
          tb: last.tinggiBadan,
          status: last.statusTBU,
          zScore: last.zScoreTBU.toFixed(1),
          tanggal: fmt(new Date(last.tanggal)),
        }
      : null,
    visits: anak.pengukurans.map((p) => {
      const pDate = new Date(p.tanggal)
      const visitMonths =
        (pDate.getFullYear() - birth.getFullYear()) * 12 +
        (pDate.getMonth() - birth.getMonth())
      return {
        tanggal: fmt(pDate),
        usiaBulan: visitMonths,
        bb: p.beratBadan,
        tb: p.tinggiBadan,
        status: p.statusTBU,
      }
    }),
  }
}
