"use server"

import { db } from "@/lib/db/client"
import { ibu, anak, pengukuran, skriningShamil } from "@/lib/db/schema"
import { eq, and, desc, asc } from "drizzle-orm"
import { auth } from "@/auth"
import { calculateGestationalAge, calculateHPL, MONTHS_ID } from "@/lib/pregnancy-utils"
import { statusAnak } from "@/lib/growth-standards/stunting-calc"

export async function getIbuData() {
  const session = await auth()
  if (!session || session.user.role !== "ibu") {
    throw new Error("Unauthorized")
  }

  const ibuRow = await db.query.ibu.findFirst({
    where: eq(ibu.id, session.user.id),
    with: {
      anaks: {
        with: {
          pengukurans: { orderBy: desc(pengukuran.tanggal), limit: 10 },
        },
        orderBy: asc(anak.createdAt),
      },
      skrinings: { orderBy: desc(skriningShamil.tanggal), limit: 1 },
      pregnancyProfile: true,
      pregnancyVisits: { orderBy: (pv, { desc }) => desc(pv.visitDate), limit: 1 },
    },
  })

  if (!ibuRow) return null

  const isPregnant = ibuRow.isHamil
  const lastSkrining = ibuRow.skrinings[0]
  const pregnancyProfile = ibuRow.pregnancyProfile
  const lastVisit = ibuRow.pregnancyVisits[0] ?? null

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
  const firstAnak = ibuRow.anaks[0]
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
      statusTBU: statusAnak(firstAnak.pengukurans[0]),
      zScoreTBU: firstAnak.pengukurans[0].zScoreTBU,
      tanggal: firstAnak.pengukurans[0].tanggal,
    } : null,
    pengukurans: firstAnak.pengukurans.map((p) => ({
      tanggal: p.tanggal,
      beratBadan: p.beratBadan,
      tinggiBadan: p.tinggiBadan,
      statusTBU: statusAnak(p),
      zScoreTBU: p.zScoreTBU,
    })),
  } : null

  return {
    nama: ibuRow.nama,
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

  const ibuRow = await db.query.ibu.findFirst({
    where: eq(ibu.id, session.user.id),
    with: {
      posyandu: true,
      pregnancyProfile: true,
      skrinings: { orderBy: desc(skriningShamil.tanggal), limit: 1 },
    },
  })

  if (!ibuRow) return null

  return {
    nama: ibuRow.nama,
    noHp: ibuRow.noHp,
    tanggalLahir: ibuRow.tanggalLahir,
    alamat: ibuRow.alamat,
    posyandu: ibuRow.posyandu.nama,
    kelurahan: ibuRow.kelurahan,
    kecamatan: ibuRow.posyandu.kecamatan,
    isPregnant: ibuRow.isHamil,
    lastSkrining: ibuRow.skrinings[0] ?? null,
    pregnancyProfile: ibuRow.pregnancyProfile,
  }
}

export async function getIbuAnaks() {
  const session = await auth()
  if (!session || session.user.role !== "ibu") throw new Error("Unauthorized")

  const ibuRow = await db.query.ibu.findFirst({
    where: eq(ibu.id, session.user.id),
    with: {
      anaks: {
        with: {
          pengukurans: { orderBy: desc(pengukuran.tanggal), limit: 1 },
        },
        orderBy: asc(anak.createdAt),
      },
    },
  })

  if (!ibuRow) return []

  return ibuRow.anaks.map((anakRow) => {
    const last = anakRow.pengukurans[0] ?? null
    const birth = new Date(anakRow.tanggalLahir)
    const now = new Date()
    const months =
      (now.getFullYear() - birth.getFullYear()) * 12 +
      (now.getMonth() - birth.getMonth())
    return {
      id: anakRow.id,
      nama: anakRow.nama,
      jenisKelamin: anakRow.jenisKelamin as "L" | "P",
      usia: months < 12 ? `${months} bln` : `${Math.floor(months / 12)} thn ${months % 12} bln`,
      status: last ? statusAnak(last) : null,
      bb: last?.beratBadan ?? null,
      tanggalPengukuran: last?.tanggal ?? null,
    }
  })
}

export async function getIbuAnakForDashboard(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "ibu") throw new Error("Unauthorized")

  const [ibuRow, anakRow] = await Promise.all([
    db.query.ibu.findFirst({ where: eq(ibu.id, session.user.id), columns: { nama: true } }),
    db.query.anak.findFirst({
      where: and(eq(anak.id, id), eq(anak.ibuId, session.user.id)),
      with: { pengukurans: { orderBy: desc(pengukuran.tanggal), limit: 10 } },
    }),
  ])

  if (!ibuRow || !anakRow) return null

  const birth = new Date(anakRow.tanggalLahir)
  const now = new Date()
  const usiaBulan =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())

  return {
    nama: ibuRow.nama,
    childData: {
      id: anakRow.id,
      nama: anakRow.nama,
      jenisKelamin: anakRow.jenisKelamin as "L" | "P",
      tanggalLahir: anakRow.tanggalLahir,
      usiaBulan,
      lastPengukuran: anakRow.pengukurans[0]
        ? {
            beratBadan: anakRow.pengukurans[0].beratBadan,
            tinggiBadan: anakRow.pengukurans[0].tinggiBadan,
            statusTBU: statusAnak(anakRow.pengukurans[0]),
            zScoreTBU: anakRow.pengukurans[0].zScoreTBU,
            tanggal: anakRow.pengukurans[0].tanggal,
          }
        : null,
      pengukurans: anakRow.pengukurans.map((p) => ({
        tanggal: p.tanggal,
        beratBadan: p.beratBadan,
        tinggiBadan: p.tinggiBadan,
        statusTBU: statusAnak(p),
        zScoreTBU: p.zScoreTBU,
      })),
    },
  }
}

export async function getIbuAnakDetail(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "ibu") throw new Error("Unauthorized")

  const anakRow = await db.query.anak.findFirst({
    where: and(eq(anak.id, id), eq(anak.ibuId, session.user.id)),
    with: {
      pengukurans: { orderBy: desc(pengukuran.tanggal) },
    },
  })

  if (!anakRow) return null

  const birthDate = new Date(anakRow.tanggalLahir)
  const now = new Date()
  const ageMonths =
    (now.getFullYear() - birthDate.getFullYear()) * 12 +
    (now.getMonth() - birthDate.getMonth())

  const last = anakRow.pengukurans[0] ?? null

  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d)

  return {
    id: anakRow.id,
    nama: anakRow.nama,
    jenisKelamin: anakRow.jenisKelamin as "L" | "P",
    tanggalLahir: fmt(birthDate),
    usia:
      ageMonths < 12
        ? `${ageMonths} bln`
        : `${Math.floor(ageMonths / 12)} thn ${ageMonths % 12} bln`,
    anakKe: anakRow.anakKe?.toString() ?? "—",
    latest: last
      ? {
          bb: last.beratBadan,
          tb: last.tinggiBadan,
          status: statusAnak(last),
          zScore: last.zScoreTBU.toFixed(1),
          tanggal: fmt(new Date(last.tanggal)),
        }
      : null,
    visits: anakRow.pengukurans.map((p) => {
      const pDate = new Date(p.tanggal)
      const visitMonths =
        (pDate.getFullYear() - birthDate.getFullYear()) * 12 +
        (pDate.getMonth() - birthDate.getMonth())
      return {
        tanggal: fmt(pDate),
        usiaBulan: visitMonths,
        bb: p.beratBadan,
        tb: p.tinggiBadan,
        status: statusAnak(p),
      }
    }),
  }
}
