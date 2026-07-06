"use server"

import { db } from "@/lib/db/client"
import { posyandu, kader, ibu, anak, pengukuran, pregnancyProfile, pregnancyVisit } from "@/lib/db/schema"
import { eq, and, desc, asc, inArray, notInArray, gte, count } from "drizzle-orm"
import { auth } from "@/auth"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { calculateIMT, getIMTCategory, getIOMTargets } from "@/lib/growth-standards/imt-calc"
import { calcHeightZScore, stuntingLabel } from "@/lib/growth-standards/stunting-calc"

export async function getChildren() {
  const session = await auth()
  if (!session || session.user.role !== "kader") {
    throw new Error("Unauthorized")
  }

  const ibuIds = db.select({ id: ibu.id }).from(ibu).where(eq(ibu.posyanduId, session.user.posyanduId))

  const children = await db.query.anak.findMany({
    where: inArray(anak.ibuId, ibuIds),
    with: {
      pengukurans: { orderBy: desc(pengukuran.tanggal), limit: 1 },
    },
  })

  return children.map((anakRow, index) => {
    const lastPengukuran = anakRow.pengukurans[0]

    const birthDate = new Date(anakRow.tanggalLahir)
    const now = new Date()
    const ageMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth())

    return {
      no: index + 1,
      id: anakRow.id,
      nama: anakRow.nama,
      sex: anakRow.jenisKelamin as "L" | "P",
      usia: `${ageMonths} bln`,
      bb: lastPengukuran ? lastPengukuran.beratBadan.toFixed(1).replace(".", ",") : "-",
      tb: lastPengukuran ? lastPengukuran.tinggiBadan.toFixed(1).replace(".", ",") : "-",
      status: (lastPengukuran?.statusTBU || "Normal") as "Normal" | "Berisiko" | "Stunting",
      sudah: lastPengukuran ? new Date(lastPengukuran.tanggal).getMonth() === now.getMonth() && new Date(lastPengukuran.tanggal).getFullYear() === now.getFullYear() : false,
      tgl: lastPengukuran ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(lastPengukuran.tanggal)) : "-",
    }
  })
}

export async function getDashboardStats() {
  const session = await auth()
  if (!session || session.user.role !== "kader") {
    throw new Error("Unauthorized")
  }

  const posyanduId = session.user.posyanduId
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const posyanduRow = await db.query.posyandu.findFirst({
    where: eq(posyandu.id, posyanduId),
    columns: { nama: true },
  })

  const ibuIds = db.select({ id: ibu.id }).from(ibu).where(eq(ibu.posyanduId, posyanduId))

  const [{ value: totalChildren }] = await db
    .select({ value: count() })
    .from(anak)
    .where(inArray(anak.ibuId, ibuIds))

  const measuredThisMonth = await db.selectDistinct({ anakId: pengukuran.anakId })
    .from(pengukuran)
    .where(and(eq(pengukuran.posyanduId, posyanduId), gte(pengukuran.tanggal, firstDayOfMonth)))

  const measuredToday = await db.selectDistinct({ anakId: pengukuran.anakId })
    .from(pengukuran)
    .where(and(eq(pengukuran.posyanduId, posyanduId), gte(pengukuran.tanggal, today)))

  const allChildren = await db.query.anak.findMany({
    where: inArray(anak.ibuId, ibuIds),
    with: {
      pengukurans: { orderBy: desc(pengukuran.tanggal), limit: 2 },
    },
  })

  let normalCount = 0
  let giziKurangCount = 0
  let risikoStuntingCount = 0
  let stuntingBeratCount = 0

  const totalMeasured = allChildren.filter(c => c.pengukurans.length > 0).length

  allChildren.forEach(c => {
    const status = c.pengukurans[0]?.statusTBU
    if (status === "Normal") normalCount++
    if (status === "Gizi Kurang") giziKurangCount++
    if (status === "Berisiko" || status === "Risiko Stunting") risikoStuntingCount++
    if (status === "Stunting" || status === "Stunting Berat") stuntingBeratCount++
  })

  const getStatusScore = (status?: string) => {
    if (!status) return 0
    if (status === "Normal") return 5
    if (status === "Gizi Kurang") return 4
    if (status === "Risiko Stunting" || status === "Berisiko") return 3
    if (status === "Stunting") return 2
    if (status === "Stunting Berat") return 1
    return 0
  }

  let improvedCount = 0
  allChildren.forEach(c => {
    if (c.pengukurans.length >= 2) {
      const latestScore = getStatusScore(c.pengukurans[0].statusTBU)
      const prevScore = getStatusScore(c.pengukurans[1].statusTBU)
      if (latestScore > prevScore) {
        improvedCount++
      }
    }
  })

  const statusData = [
    { name: "Stunting Berat", value: totalMeasured ? Math.round((stuntingBeratCount / totalMeasured) * 100) : 0, fill: "#E24B4A" },
    { name: "Risiko Stunting", value: totalMeasured ? Math.round((risikoStuntingCount / totalMeasured) * 100) : 0, fill: "#EF9F27" },
    { name: "Gizi Kurang", value: totalMeasured ? Math.round((giziKurangCount / totalMeasured) * 100) : 0, fill: "#7F77DD" },
    { name: "Anak Normal", value: totalMeasured ? Math.round((normalCount / totalMeasured) * 100) : 0, fill: "#378ADD" },
  ]

  const stuntingCount = allChildren.filter(c =>
    c.pengukurans[0]?.statusTBU === "Stunting" ||
    c.pengukurans[0]?.statusTBU === "Stunting Berat"
  ).length

  return {
    totalChildren,
    measuredThisMonth: measuredThisMonth.length,
    measuredToday: measuredToday.length,
    stuntingCount,
    posyanduName: posyanduRow?.nama || "Posyandu",
    statusData,
    improvedCount,
  }
}

export async function getRecentMeasurements() {
  const session = await auth()
  if (!session || session.user.role !== "kader") {
    throw new Error("Unauthorized")
  }

  const measurements = await db.query.pengukuran.findMany({
    where: eq(pengukuran.posyanduId, session.user.posyanduId),
    with: { anak: true, kader: true },
    orderBy: desc(pengukuran.tanggal),
    limit: 5,
  })

  return measurements.map((m) => ({
    id: m.anakId,
    waktu: new Date(m.tanggal).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    posyandu: session.user.posyanduId ? "Melati" : "Posyandu",
    nama: m.anak.nama,
    status: m.statusTBU,
    tindak: m.statusTBU === "Normal" ? "Selesai" : "Dipantau",
    kader: m.kader.nama,
  }))
}

export async function getWeeklyData() {
  const session = await auth()
  if (!session || session.user.role !== "kader") {
    throw new Error("Unauthorized")
  }

  const now = new Date()
  const last7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)

  const measurements = await db.select({ tanggal: pengukuran.tanggal, statusTBU: pengukuran.statusTBU })
    .from(pengukuran)
    .where(and(eq(pengukuran.posyanduId, session.user.posyanduId), gte(pengukuran.tanggal, last7Days)))

  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
  const data = []

  for (let i = 0; i < 7; i++) {
    const d = new Date(last7Days.getFullYear(), last7Days.getMonth(), last7Days.getDate() + i)
    const dayName = days[d.getDay()]

    const dayMeasurements = measurements.filter(m =>
      new Date(m.tanggal).toDateString() === d.toDateString()
    )

    data.push({
      hari: dayName,
      stunting: dayMeasurements.filter(m => m.statusTBU === "Stunting" || m.statusTBU === "Stunting Berat").length,
      normal: dayMeasurements.filter(m => m.statusTBU === "Normal").length,
    })
  }

  return data
}

export async function getUncheckedChildren() {
  const session = await auth()
  if (!session || session.user.role !== "kader") {
    throw new Error("Unauthorized")
  }

  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const ibuIds = db.select({ id: ibu.id }).from(ibu).where(eq(ibu.posyanduId, session.user.posyanduId))
  const measuredAnakIds = db.select({ id: pengukuran.anakId }).from(pengukuran).where(gte(pengukuran.tanggal, firstDayOfMonth))

  const unchecked = await db.query.anak.findMany({
    where: and(
      inArray(anak.ibuId, ibuIds),
      notInArray(anak.id, measuredAnakIds),
    ),
    limit: 5,
  })

  return unchecked.map((anakRow) => {
    const birthDate = new Date(anakRow.tanggalLahir)
    const ageMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth())
    const years = Math.floor(ageMonths / 12)
    const months = ageMonths % 12
    const ageStr = `${years > 0 ? years + " tahun " : ""}${months} bulan`

    return {
      id: anakRow.id,
      nama: anakRow.nama,
      usia: ageStr,
      posyandu: "Melati",
      warna: ["#378ADD", "#EF9F27", "#7F77DD", "#E24B4A", "#2DD4BF"][Math.floor(Math.random() * 5)],
    }
  })
}

export async function getChildDetail(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "kader") {
    throw new Error("Unauthorized")
  }

  const anakRow = await db.query.anak.findFirst({
    where: eq(anak.id, id),
    with: {
      ibu: {
        with: {
          posyandu: true,
          pregnancyProfile: true,
          anaks: {
            where: (a, { ne }) => ne(a.id, id),
            with: { pengukurans: { orderBy: desc(pengukuran.tanggal), limit: 1 } },
          },
        },
      },
      pengukurans: {
        orderBy: desc(pengukuran.tanggal),
        with: { kader: true },
      },
    },
  })

  if (!anakRow) return null

  const lastPengukuran = anakRow.pengukurans[0]
  const prevPengukuran = anakRow.pengukurans[1]
  const birthDate = new Date(anakRow.tanggalLahir)
  const now = new Date()
  const ageMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth())

  const gestationalWeek = anakRow.ibu.isHamil && anakRow.ibu.pregnancyProfile
    ? Math.max(0, Math.floor((now.getTime() - new Date(anakRow.ibu.pregnancyProfile.hpht).getTime()) / (7 * 24 * 60 * 60 * 1000)))
    : null

  const nextCheckDate = lastPengukuran ? new Date(lastPengukuran.tanggal) : null
  if (nextCheckDate) nextCheckDate.setMonth(nextCheckDate.getMonth() + 1)
  const daysUntilNextCheck = nextCheckDate ? Math.ceil((nextCheckDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) : null

  return {
    id: anakRow.id,
    name: anakRow.nama,
    gender: anakRow.jenisKelamin === "L" ? "Laki-laki" : "Perempuan",
    birthDate: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(birthDate),
    age: `${ageMonths} bulan`,
    ageMo: ageMonths,
    posyandu: anakRow.ibu.posyandu.nama,
    posyanduId: anakRow.ibu.posyandu.id,
    desa: anakRow.ibu.posyandu.kelurahan,
    address: anakRow.ibu.alamat || "-",
    childOrder: anakRow.anakKe?.toString() || "—",
    parent: {
      id: anakRow.ibu.id,
      mother: anakRow.ibu.nama,
      father: anakRow.namaAyah || "—",
      phone: anakRow.ibu.noHp || "-",
      username: anakRow.ibu.username,
      isHamil: anakRow.ibu.isHamil,
      gestationalWeek,
    },
    status: lastPengukuran?.statusTBU || "Normal",
    latestCheckDate: lastPengukuran ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(lastPengukuran.tanggal)) : "-",
    latestTB: lastPengukuran?.tinggiBadan || 0,
    latestBB: lastPengukuran?.beratBadan || 0,
    deltaBB: lastPengukuran && prevPengukuran ? +(lastPengukuran.beratBadan - prevPengukuran.beratBadan).toFixed(1) : null,
    deltaTB: lastPengukuran && prevPengukuran ? +(lastPengukuran.tinggiBadan - prevPengukuran.tinggiBadan).toFixed(1) : null,
    zScoreTBU: lastPengukuran ? `${lastPengukuran.zScoreTBU.toFixed(1)} SD` : "-",
    zScoreTBURaw: lastPengukuran?.zScoreTBU ?? null,
    bbTB: lastPengukuran?.statusBBTB || "-",
    examiner: lastPengukuran?.kader.nama || "-",
    nextCheckDate: nextCheckDate ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(nextCheckDate) : null,
    daysUntilNextCheck,
    siblings: anakRow.ibu.anaks.map((s) => {
      const sBirth = new Date(s.tanggalLahir)
      const sAgeMonths = (now.getFullYear() - sBirth.getFullYear()) * 12 + (now.getMonth() - sBirth.getMonth())
      return {
        id: s.id,
        name: s.nama,
        age: `${sAgeMonths} bulan`,
        status: s.pengukurans[0]?.statusTBU || "Normal",
      }
    }),
    visits: anakRow.pengukurans.map((p) => ({
      tgl: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(p.tanggal)),
      usia: `${(new Date(p.tanggal).getFullYear() - birthDate.getFullYear()) * 12 + (new Date(p.tanggal).getMonth() - birthDate.getMonth())} bln`,
      bb: p.beratBadan,
      tb: p.tinggiBadan,
      zTb: p.zScoreTBU.toFixed(1),
      status: p.statusTBU,
      examiner: p.kader.nama,
      latest: p.id === lastPengukuran?.id,
    })),
  }
}

export async function getKelurahanStats() {
  const session = await auth()
  if (!session || session.user.role !== "kader") {
    throw new Error("Unauthorized")
  }

  const posyandus = await db.query.posyandu.findMany({
    with: {
      ibus: {
        with: {
          anaks: {
            with: { pengukurans: { orderBy: desc(pengukuran.tanggal), limit: 1 } },
          },
        },
      },
      kaders: { limit: 1 },
    },
  })

  const kelurahanMap = new Map<string, {
    id: number
    nama: string
    lat: number
    lng: number
    total: number
    normal: number
    risiko: number
    stunting: number
    posyandu: string[]
    petugas: string
  }>()

  posyandus.forEach((p) => {
    const kel = p.kelurahan
    if (!kelurahanMap.has(kel)) {
      kelurahanMap.set(kel, {
        id: kelurahanMap.size + 1,
        nama: kel,
        lat: p.latitude || -5.1477,
        lng: p.longitude || 119.4327,
        total: 0,
        normal: 0,
        risiko: 0,
        stunting: 0,
        posyandu: [],
        petugas: p.kaders[0]?.nama || "Bidan",
      })
    }

    const data = kelurahanMap.get(kel)!
    data.posyandu.push(p.nama)

    p.ibus.forEach((ibuRow) => {
      ibuRow.anaks.forEach((anakRow) => {
        data.total++
        const lastP = anakRow.pengukurans[0]
        if (!lastP || lastP.statusTBU === "Normal") {
          data.normal++
        } else if (lastP.statusTBU === "Berisiko") {
          data.risiko++
        } else {
          data.stunting++
        }
      })
    })
  })

  return Array.from(kelurahanMap.values())
}

export async function getIbuById(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

  const ibuRow = await db.query.ibu.findFirst({
    where: eq(ibu.id, id),
    with: {
      posyandu: { columns: { nama: true } },
      anaks: {
        with: { pengukurans: { orderBy: desc(pengukuran.tanggal), limit: 1 } },
        orderBy: asc(anak.createdAt),
      },
      pregnancyProfile: true,
      pregnancyVisits: { orderBy: (pv, { asc }) => asc(pv.visitDate) },
      skrinings: { orderBy: (s, { desc }) => desc(s.tanggal) },
    },
  })

  if (!ibuRow || ibuRow.posyanduId !== session.user.posyanduId) throw new Error("Not found")
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _password, ...rest } = ibuRow
  return { ...rest, posyandu: ibuRow.posyandu.nama }
}

export async function getIbuHamil() {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

  const list = await db.query.ibu.findMany({
    where: and(eq(ibu.posyanduId, session.user.posyanduId), eq(ibu.isHamil, true)),
    with: {
      pregnancyProfile: { columns: { hpht: true } },
      pregnancyVisits: {
        orderBy: (pv, { desc }) => desc(pv.visitDate),
        limit: 1,
        columns: { visitDate: true, currentWeightKg: true },
      },
    },
    orderBy: asc(ibu.createdAt),
  })

  const now = new Date()

  return list.map((ibuRow, i) => {
    const hpht = ibuRow.pregnancyProfile?.hpht ? new Date(ibuRow.pregnancyProfile.hpht) : null
    const diffDays = hpht ? Math.floor((now.getTime() - hpht.getTime()) / 86_400_000) : null
    const weeks = diffDays !== null ? Math.floor(diffDays / 7) : null
    const trimester: 1 | 2 | 3 | null =
      weeks === null ? null : weeks < 14 ? 1 : weeks < 28 ? 2 : 3

    const hpl = hpht ? new Date(hpht.getTime() + 280 * 86_400_000) : null
    const hplStr = hpl
      ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(hpl)
      : "-"

    const visit = ibuRow.pregnancyVisits[0] ?? null
    const sudahKunjungan = visit
      ? new Date(visit.visitDate).getMonth() === now.getMonth() &&
        new Date(visit.visitDate).getFullYear() === now.getFullYear()
      : false

    const birth = ibuRow.tanggalLahir ? new Date(ibuRow.tanggalLahir) : null
    const usiaYears = birth
      ? Math.floor((now.getTime() - birth.getTime()) / (365.25 * 86_400_000))
      : null

    return {
      no: i + 1,
      id: ibuRow.id,
      nama: ibuRow.nama,
      usia: usiaYears !== null ? `${usiaYears} th` : "-",
      trimester,
      bbSaatIni: visit ? `${visit.currentWeightKg} kg` : "-",
      hpl: hplStr,
      sudahKunjungan,
      lastVisit: visit
        ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(visit.visitDate))
        : "-",
    }
  })
}

export async function getIbuBiasa() {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

  const list = await db.query.ibu.findMany({
    where: and(eq(ibu.posyanduId, session.user.posyanduId), eq(ibu.isHamil, false)),
    with: {
      skrinings: {
        orderBy: (s, { desc }) => desc(s.tanggal),
        limit: 1,
        columns: { tanggal: true, kategori: true, skorRisiko: true },
      },
      anaks: { columns: { id: true } },
    },
    orderBy: asc(ibu.createdAt),
  })

  const now = new Date()

  return list.map((ibuRow, i) => {
    const skrining = ibuRow.skrinings[0] ?? null
    const birth = ibuRow.tanggalLahir ? new Date(ibuRow.tanggalLahir) : null
    const usiaYears = birth
      ? Math.floor((now.getTime() - birth.getTime()) / (365.25 * 86_400_000))
      : null

    return {
      no: i + 1,
      id: ibuRow.id,
      nama: ibuRow.nama,
      usia: usiaYears !== null ? `${usiaYears} th` : "-",
      jumlahAnak: ibuRow.anaks.length,
      skriningTerakhir: skrining
        ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(skrining.tanggal))
        : "Belum",
      kategoriRisiko: skrining?.kategori ?? null,
    }
  })
}

async function getValidatedPosyanduId() {
  const session = await auth()
  if (!session || session.user.role !== "kader") {
    throw new Error("Unauthorized")
  }

  const posyanduId = session.user.posyanduId
  if (!posyanduId) {
    console.error("DEBUG: posyanduId is missing in session", session.user)
    throw new Error("POSYANDU_ID_MISSING")
  }

  try {
    const posyanduRow = await db.query.posyandu.findFirst({ where: eq(posyandu.id, posyanduId) })
    if (!posyanduRow) {
      console.error(`DEBUG: posyanduId ${posyanduId} from session not found in database. This might happen if the database was reset but the session is stale.`)
      throw new Error("POSYANDU_NOT_FOUND")
    }
    return posyanduId
  } catch (error) {
    if (error instanceof Error && error.message === "POSYANDU_NOT_FOUND") throw error
    console.error("Database error in getValidatedPosyanduId:", error)
    throw new Error("DATABASE_ERROR")
  }
}

export async function savePengukuran(data: {
  anakId: string
  beratBadan: number
  tinggiBadan: number
}) {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

  const anakRow = await db.query.anak.findFirst({
    where: eq(anak.id, data.anakId),
    with: { ibu: true },
  })

  if (!anakRow) throw new Error("Anak not found")

  const birthDate = new Date(anakRow.tanggalLahir)
  const now = new Date()
  const ageMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth())

  const sex = anakRow.jenisKelamin as "L" | "P"
  const zTBU = calcHeightZScore(data.tinggiBadan, ageMonths, sex)

  const zBBU = 0.0
  const zBBTB = 0.0

  const [result] = await db.insert(pengukuran).values({
    anakId: data.anakId,
    posyanduId: session.user.posyanduId!,
    kaderId: session.user.id!,
    beratBadan: data.beratBadan,
    tinggiBadan: data.tinggiBadan,
    zScoreTBU: zTBU.zScore,
    zScoreBBU: zBBU,
    zScoreBBTB: zBBTB,
    statusTBU: stuntingLabel[zTBU.status],
    statusBBU: "Normal",
    statusBBTB: "Normal",
    tanggal: now,
  }).returning()

  revalidatePath(`/kader/anak/${data.anakId}`)
  revalidatePath("/kader/dashboard")
  revalidatePath("/kader/rekap")

  return result
}

export async function createChild(data: {
  nama: string
  sex: string
  birth: string
  ibu: string
  ibuUsername: string
  telp?: string
  alamat?: string
  namaAyah?: string
  anakKe?: number
}) {
  const posyanduId = await getValidatedPosyanduId()

  const [ibuRow] = await db.insert(ibu).values({
    nama: data.ibu,
    username: data.ibuUsername,
    password: "$2a$10$7zV.k6uG9fH9xV5fB.Z3u.oYv9z5Y.yYv.Z3u.oYv9z5Y.yYv.y",
    noHp: data.telp,
    alamat: data.alamat,
    posyanduId,
  }).onConflictDoUpdate({
    target: ibu.username,
    set: {
      nama: data.ibu,
      noHp: data.telp,
      alamat: data.alamat,
      posyanduId,
    },
  }).returning()

  const [anakRow] = await db.insert(anak).values({
    nama: data.nama,
    tanggalLahir: new Date(data.birth),
    jenisKelamin: data.sex,
    namaAyah: data.namaAyah,
    anakKe: data.anakKe,
    ibuId: ibuRow.id,
  }).returning()

  revalidatePath("/kader/dashboard")
  revalidatePath("/kader/rekap")
  revalidatePath(`/kader/ibu/${ibuRow.id}`)

  return anakRow
}

export async function createIbu(data: {
  nama: string
  username: string
  password: string
  noHp?: string
  tanggalLahir?: string
  alamat?: string
  isHamil?: boolean
  hpht?: string
  bbPrepregnancyKg?: number
  heightCm?: number
  currentWeightKg?: number
}) {
  const posyanduId = await getValidatedPosyanduId()

  const existing = await db.query.ibu.findFirst({ where: eq(ibu.username, data.username) })
  if (existing) throw new Error("USERNAME_TAKEN")

  const hashed = await bcrypt.hash(data.password, 10)

  return await db.transaction(async (tx) => {
    const [ibuRow] = await tx.insert(ibu).values({
      nama: data.nama,
      username: data.username,
      password: hashed,
      noHp: data.noHp ?? null,
      tanggalLahir: data.tanggalLahir ? new Date(data.tanggalLahir) : null,
      alamat: data.alamat ?? null,
      isHamil: data.isHamil ?? false,
      posyanduId: posyanduId,
    }).returning({ id: ibu.id, nama: ibu.nama, username: ibu.username })

    if (data.isHamil && data.hpht && data.bbPrepregnancyKg && data.heightCm) {
      const imt = calculateIMT(data.bbPrepregnancyKg, data.heightCm)
      const category = getIMTCategory(imt)
      const targets = getIOMTargets(category)

      await tx.insert(pregnancyProfile).values({
        ibuId: ibuRow.id,
        hpht: new Date(data.hpht),
        bbPrepregnancyKg: data.bbPrepregnancyKg,
        heightCm: data.heightCm,
        imtPrepregnancy: imt,
        imtCategory: category,
        targetGainMinKg: targets.totalGainMinKg,
        targetGainMaxKg: targets.totalGainMaxKg,
        weeklyGainMinKg: targets.weeklyGainMinKg,
        weeklyGainMaxKg: targets.weeklyGainMaxKg,
      })

      if (data.currentWeightKg) {
        const weightGainKg = data.currentWeightKg - data.bbPrepregnancyKg
        await tx.insert(pregnancyVisit).values({
          ibuId: ibuRow.id,
          visitDate: new Date(),
          currentWeightKg: data.currentWeightKg,
          weightGainKg: weightGainKg,
          lilaCm: 0,
          hbGdl: 0,
          isOnTrack: true,
        })
      }
    }

    revalidatePath("/kader/rekap")
    revalidatePath("/kader/dashboard")

    return ibuRow
  })
}

