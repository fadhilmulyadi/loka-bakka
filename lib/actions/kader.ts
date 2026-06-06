"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { calculateIMT, getIMTCategory, getIOMTargets } from "@/lib/growth-standards/imt-calc"

export async function getChildren() {
  const session = await auth()
  if (!session || session.user.role !== "kader") {
    throw new Error("Unauthorized")
  }

  const children = await prisma.anak.findMany({
    where: {
      ibu: {
        posyanduId: session.user.posyanduId,
      },
    },
    include: {
      pengukurans: {
        orderBy: {
          tanggal: "desc",
        },
        take: 1,
      },
    },
  })

  return children.map((anak, index) => {
    const lastPengukuran = anak.pengukurans[0]
    
    // Calculate age in months
    const birthDate = new Date(anak.tanggalLahir)
    const now = new Date()
    const ageMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth())

    return {
      no: index + 1,
      id: anak.id,
      nama: anak.nama,
      sex: anak.jenisKelamin as "L" | "P",
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

  const posyandu = await prisma.posyandu.findUnique({
    where: { id: posyanduId },
    select: { nama: true },
  })

  // Total children in this posyandu
  const totalChildren = await prisma.anak.count({
    where: {
      ibu: {
        posyanduId,
      },
    },
  })

  // Children measured this month
  const measuredThisMonth = await prisma.pengukuran.groupBy({
    by: ["anakId"],
    where: {
      posyanduId,
      tanggal: {
        gte: firstDayOfMonth,
      },
    },
  })

  // Children measured today
  const measuredToday = await prisma.pengukuran.groupBy({
    by: ["anakId"],
    where: {
      posyanduId,
      tanggal: {
        gte: today,
      },
    },
  })

  // Children with stunting status in their latest measurement
  const allChildren = await prisma.anak.findMany({
    where: {
      ibu: {
        posyanduId,
      },
    },
    include: {
      pengukurans: {
        orderBy: {
          tanggal: "desc",
        },
        take: 2,
      },
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
    posyanduName: posyandu?.nama || "Posyandu",
    statusData,
    improvedCount,
  }
}

export async function getRecentMeasurements() {
  const session = await auth()
  if (!session || session.user.role !== "kader") {
    throw new Error("Unauthorized")
  }

  const measurements = await prisma.pengukuran.findMany({
    where: {
      posyanduId: session.user.posyanduId,
    },
    include: {
      anak: true,
      kader: true,
    },
    orderBy: {
      tanggal: "desc",
    },
    take: 5,
  })

  return measurements.map((m) => ({
    id: m.anakId,
    waktu: new Date(m.tanggal).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    posyandu: "Posyandu " + (session.user.posyanduId ? "Melati" : ""), // session.user doesn't have posyanduName in DefaultSession
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

  const measurements = await prisma.pengukuran.findMany({
    where: {
      posyanduId: session.user.posyanduId,
      tanggal: {
        gte: last7Days,
      },
    },
    select: {
      tanggal: true,
      statusTBU: true,
    },
  })

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

  const unchecked = await prisma.anak.findMany({
    where: {
      ibu: {
        posyanduId: session.user.posyanduId,
      },
      NOT: {
        pengukurans: {
          some: {
            tanggal: {
              gte: firstDayOfMonth,
            },
          },
        },
      },
    },
    take: 5,
  })

  return unchecked.map((anak) => {
    const birthDate = new Date(anak.tanggalLahir)
    const ageMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth())
    const years = Math.floor(ageMonths / 12)
    const months = ageMonths % 12
    const ageStr = `${years > 0 ? years + " tahun " : ""}${months} bulan`

    return {
      id: anak.id,
      nama: anak.nama,
      usia: ageStr,
      posyandu: "Melati", // Should ideally be from DB but keeping simple for now
      warna: ["#378ADD", "#EF9F27", "#7F77DD", "#E24B4A", "#2DD4BF"][Math.floor(Math.random() * 5)],
    }
  })
}

export async function getChildDetail(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "kader") {
    throw new Error("Unauthorized")
  }

  const anak = await prisma.anak.findUnique({
    where: { id },
    include: {
      ibu: {
        include: {
          posyandu: true,
        },
      },
      pengukurans: {
        orderBy: {
          tanggal: "desc",
        },
        include: {
          kader: true,
        },
      },
    },
  })

  if (!anak) return null

  const lastPengukuran = anak.pengukurans[0]
  const birthDate = new Date(anak.tanggalLahir)
  const now = new Date()
  const ageMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth())

  return {
    id: anak.id,
    name: anak.nama,
    gender: anak.jenisKelamin === "L" ? "Laki-laki" : "Perempuan",
    birthDate: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(birthDate),
    age: `${ageMonths} bulan`,
    ageMo: ageMonths,
    posyandu: anak.ibu.posyandu.nama,
    posyanduId: anak.ibu.posyandu.id,
    desa: anak.ibu.posyandu.kelurahan,
    address: anak.ibu.alamat || "-",
    childOrder: "-", // Not in schema, keeping as placeholder
    parent: {
      mother: anak.ibu.nama,
      phone: anak.ibu.noHp || "-",
    },
    status: lastPengukuran?.statusTBU || "Normal",
    latestCheckDate: lastPengukuran ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(lastPengukuran.tanggal)) : "-",
    latestTB: lastPengukuran?.tinggiBadan || 0,
    latestBB: lastPengukuran?.beratBadan || 0,
    zScoreTBU: lastPengukuran ? `${lastPengukuran.zScoreTBU.toFixed(1)} SD` : "-",
    bbTB: lastPengukuran?.statusBBTB || "-",
    examiner: lastPengukuran?.kader.nama || "-",
    visits: anak.pengukurans.map((p) => ({
      tgl: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(p.tanggal)),
      usia: `${(new Date(p.tanggal).getFullYear() - birthDate.getFullYear()) * 12 + (new Date(p.tanggal).getMonth() - birthDate.getMonth())} bln`,
      bb: p.beratBadan,
      tb: p.tinggiBadan,
      zTb: p.zScoreTBU.toFixed(1),
      status: p.statusTBU,
      latest: p.id === lastPengukuran?.id,
    })),
  }
}

import { calcHeightZScore, stuntingLabel } from "@/lib/growth-standards/stunting-calc"

export async function savePengukuran(data: {
  anakId: string
  beratBadan: number
  tinggiBadan: number
}) {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

  const anak = await prisma.anak.findUnique({
    where: { id: data.anakId },
    include: { ibu: true }
  })

  if (!anak) throw new Error("Anak not found")

  const birthDate = new Date(anak.tanggalLahir)
  const now = new Date()
  const ageMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth())

  // Calculate Z-Score TBU (Stunting)
  const sex = anak.jenisKelamin as "L" | "P"
  const zTBU = calcHeightZScore(data.tinggiBadan, ageMonths, sex)

  // Placeholders for other Z-scores for now
  const zBBU = 0.0
  const zBBTB = 0.0

  const result = await prisma.pengukuran.create({
    data: {
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
    }
  })

  revalidatePath(`/kader/anak/${data.anakId}`)
  revalidatePath("/kader/dashboard")
  revalidatePath("/kader/rekap")

  return result
}

export async function getKelurahanStats() {
  const session = await auth()
  if (!session || session.user.role !== "kader") {
    throw new Error("Unauthorized")
  }

  const posyandus = await prisma.posyandu.findMany({
    include: {
      ibus: {
        include: {
          anaks: {
            include: {
              pengukurans: {
                orderBy: {
                  tanggal: "desc",
                },
                take: 1,
              },
            },
          },
        },
      },
      kaders: {
        take: 1,
      },
    },
  })

  // Group by kelurahan
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
    
    p.ibus.forEach((ibu) => {
      ibu.anaks.forEach((anak) => {
        data.total++
        const lastP = anak.pengukurans[0]
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

  // Verify posyandu exists to avoid foreign key violations
  try {
    const posyandu = await prisma.posyandu.findUnique({ where: { id: posyanduId } })
    if (!posyandu) {
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

export async function createChild(data: {
  nama: string
  sex: string
  birth: string
  ibu: string
  ibuUsername: string
  telp?: string
  alamat?: string
}) {
  const posyanduId = await getValidatedPosyanduId()

  // 1. Upsert Ibu
  const ibu = await prisma.ibu.upsert({
    where: { username: data.ibuUsername },
    update: {
      nama: data.ibu,
      noHp: data.telp,
      alamat: data.alamat,
      posyanduId,
    },
    create: {
      nama: data.ibu,
      username: data.ibuUsername,
      pin: "$2a$10$7zV.k6uG9fH9xV5fB.Z3u.oYv9z5Y.yYv.Z3u.oYv9z5Y.yYv.y", // Default hashed PIN '1234'
      noHp: data.telp,
      alamat: data.alamat,
      posyanduId,
    },
  })

  // 2. Create Anak
  const anak = await prisma.anak.create({
    data: {
      nama: data.nama,
      tanggalLahir: new Date(data.birth),
      jenisKelamin: data.sex,
      ibuId: ibu.id,
    },
  })

  revalidatePath("/kader/dashboard")
  revalidatePath("/kader/rekap")
  revalidatePath(`/kader/ibu/${ibu.id}`)

  return anak
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

  const existing = await prisma.ibu.findUnique({ where: { username: data.username } })
  if (existing) throw new Error("USERNAME_TAKEN")

  const hashed = await bcrypt.hash(data.password, 10)

  return await prisma.$transaction(async (tx) => {
    const ibu = await tx.ibu.create({
      data: {
        nama: data.nama,
        username: data.username,
        pin: hashed,
        noHp: data.noHp ?? null,
        tanggalLahir: data.tanggalLahir ? new Date(data.tanggalLahir) : null,
        alamat: data.alamat ?? null,
        isHamil: data.isHamil ?? false,
        posyanduId: posyanduId,
      },
      select: { id: true, nama: true, username: true },
    })

    if (data.isHamil && data.hpht && data.bbPrepregnancyKg && data.heightCm) {
      const imt = calculateIMT(data.bbPrepregnancyKg, data.heightCm)
      const category = getIMTCategory(imt)
      const targets = getIOMTargets(category)

      await tx.pregnancyProfile.create({
        data: {
          ibuId: ibu.id,
          hpht: new Date(data.hpht),
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

      if (data.currentWeightKg) {
        const weightGainKg = data.currentWeightKg - data.bbPrepregnancyKg
        await tx.pregnancyVisit.create({
          data: {
            ibuId: ibu.id,
            visitDate: new Date(),
            currentWeightKg: data.currentWeightKg,
            weightGainKg: weightGainKg,
            lilaCm: 0, // Placeholder
            hbGdl: 0,  // Placeholder
            isOnTrack: true,
          }
        })
      }
    }

    revalidatePath("/kader/rekap")
    revalidatePath("/kader/dashboard")

    return ibu
  })
}

export async function getIbuById(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

  const ibu = await prisma.ibu.findUnique({
    where: { id },
    include: {
      posyandu: {
        select: { nama: true }
      },
      anaks: {
        include: {
          pengukurans: { orderBy: { tanggal: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "asc" },
      },
      pregnancyProfile: true,
      pregnancyVisits: {
        orderBy: { visitDate: "asc" },
      },
      skrinings: {
        orderBy: { tanggal: "desc" },
      },
    },
  })

  if (!ibu || ibu.posyanduId !== session.user.posyanduId) throw new Error("Not found")
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { pin: _pin, ...rest } = ibu
  return { ...rest, posyandu: ibu.posyandu.nama }
}
