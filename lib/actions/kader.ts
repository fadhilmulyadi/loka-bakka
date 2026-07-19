"use server"

import { randomInt } from "crypto"
import { db } from "@/lib/db/client"
import { posyandu, ibu, anak, pengukuran, pregnancyProfile, pregnancyVisit } from "@/lib/db/schema"
import { eq, and, desc, asc, inArray, notInArray, gte, count } from "drizzle-orm"
import { auth } from "@/auth"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { calculateIMT, getIMTCategory, getIOMTargets } from "@/lib/growth-standards/imt-calc"
import { calcHeightZScore, stuntingLabel } from "@/lib/growth-standards/stunting-calc"
import { notifyChildRisk } from "@/lib/actions/notifikasi"
import { KELURAHAN_LIST, KELURAHAN_NAMES } from "@/lib/constants/kelurahan"

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"]

export async function getChildren() {
  const session = await auth()
  if (!session || session.user.role !== "kader") {
    throw new Error("Unauthorized")
  }

  const ibuIds = db.select({ id: ibu.id }).from(ibu).where(eq(ibu.posyanduId, session.user.posyanduId))

  const children = await db.query.anak.findMany({
    where: inArray(anak.ibuId, ibuIds),
    with: {
      ibu: { columns: { nama: true, noHp: true } },
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
      ibuId: anakRow.ibuId,
      nama: anakRow.nama,
      sex: anakRow.jenisKelamin as "L" | "P",
      ageMo: ageMonths,
      usia: `${ageMonths} bln`,
      bb: lastPengukuran ? lastPengukuran.beratBadan.toFixed(1).replace(".", ",") : "-",
      tb: lastPengukuran ? lastPengukuran.tinggiBadan.toFixed(1).replace(".", ",") : "-",
      status: (lastPengukuran?.statusTBU || "Normal") as "Normal" | "Berisiko" | "Stunting",
      sudah: lastPengukuran ? new Date(lastPengukuran.tanggal).getMonth() === now.getMonth() && new Date(lastPengukuran.tanggal).getFullYear() === now.getFullYear() : false,
      tgl: lastPengukuran ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(lastPengukuran.tanggal)) : "-",
      ibuName: anakRow.ibu.nama,
      noHp: anakRow.ibu.noHp,
      terakhirDiingatkan: anakRow.terakhirDiingatkan,
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
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const posyanduRow = await db.query.posyandu.findFirst({
    where: eq(posyandu.id, posyanduId),
    columns: { nama: true },
  })

  const ibuIds = db.select({ id: ibu.id }).from(ibu).where(eq(ibu.posyanduId, posyanduId))

  const [{ value: totalChildren }] = await db
    .select({ value: count() })
    .from(anak)
    .where(inArray(anak.ibuId, ibuIds))

  const [{ value: totalIbuHamil }] = await db
    .select({ value: count() })
    .from(ibu)
    .where(and(eq(ibu.posyanduId, posyanduId), eq(ibu.isHamil, true)))

  const measuredThisMonth = await db.selectDistinct({ anakId: pengukuran.anakId })
    .from(pengukuran)
    .where(and(eq(pengukuran.posyanduId, posyanduId), gte(pengukuran.tanggal, firstDayOfMonth)))

  const measuredToday = await db.selectDistinct({ anakId: pengukuran.anakId })
    .from(pengukuran)
    .where(and(eq(pengukuran.posyanduId, posyanduId), gte(pengukuran.tanggal, today)))

  const measuredLast7DaysAnak = await db.selectDistinct({ anakId: pengukuran.anakId })
    .from(pengukuran)
    .where(and(eq(pengukuran.posyanduId, posyanduId), gte(pengukuran.tanggal, sevenDaysAgo)))

  const measuredThisMonthIbu = await db.selectDistinct({ ibuId: pregnancyVisit.ibuId })
    .from(pregnancyVisit)
    .where(and(inArray(pregnancyVisit.ibuId, ibuIds), gte(pregnancyVisit.visitDate, firstDayOfMonth)))

  const measuredLast7DaysIbu = await db.selectDistinct({ ibuId: pregnancyVisit.ibuId })
    .from(pregnancyVisit)
    .where(and(inArray(pregnancyVisit.ibuId, ibuIds), gte(pregnancyVisit.visitDate, sevenDaysAgo)))

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

  // Ibu hamil status: derived from the latest visit's LILA/Hb, same risk logic as getKelurahanPatients.
  // ponytail: anemia-only (no KEK) folds into the "Risiko KEK" bucket — the dashboard only has 3
  // buckets by design; upgrade to a 4th bucket if anemia-only needs its own count later.
  const allIbuHamil = await db.query.ibu.findMany({
    where: and(eq(ibu.posyanduId, posyanduId), eq(ibu.isHamil, true)),
    with: {
      pregnancyVisits: { orderBy: desc(pregnancyVisit.visitDate), limit: 2 },
    },
  })

  let ibuNormalCount = 0
  let ibuRisikoKekCount = 0
  let ibuKekAnemiaCount = 0
  let ibuImprovedCount = 0
  const ibuTotalMeasured = allIbuHamil.filter(m => m.pregnancyVisits.length > 0).length

  const ibuRiskScore = (v?: { lilaCm: number; hbGdl: number }) => {
    if (!v) return null
    const kek = v.lilaCm < 23.5
    const anemia = v.hbGdl < 11.0
    if (kek && anemia) return 1
    if (kek || anemia) return 2
    return 3
  }

  allIbuHamil.forEach(m => {
    const latest = m.pregnancyVisits[0]
    if (!latest) return
    const kek = latest.lilaCm < 23.5
    const anemia = latest.hbGdl < 11.0
    if (kek && anemia) ibuKekAnemiaCount++
    else if (kek || anemia) ibuRisikoKekCount++
    else ibuNormalCount++

    const prev = m.pregnancyVisits[1]
    if (prev) {
      const s0 = ibuRiskScore(latest)!
      const s1 = ibuRiskScore(prev)!
      if (s0 > s1) ibuImprovedCount++
    }
  })

  return {
    totalChildren,
    totalIbuHamil,
    measuredThisMonth: measuredThisMonth.length,
    measuredThisMonthIbu: measuredThisMonthIbu.length,
    measuredToday: measuredToday.length,
    measuredLast7DaysAnak: measuredLast7DaysAnak.length,
    measuredLast7DaysIbu: measuredLast7DaysIbu.length,
    stuntingCount,
    posyanduName: posyanduRow?.nama || "Posyandu",
    statusData,
    improvedCount: improvedCount + ibuImprovedCount,
    anakStatus: { total: totalMeasured, normal: normalCount, berisikoGiziKurang: giziKurangCount + risikoStuntingCount, stunting: stuntingBeratCount },
    ibuStatus: { total: ibuTotalMeasured, normal: ibuNormalCount, risikoKek: ibuRisikoKekCount, kekAnemia: ibuKekAnemiaCount },
  }
}

export async function getSixMonthTrend() {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

  const posyanduId = session.user.posyanduId
  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const ibuIds = db.select({ id: ibu.id }).from(ibu).where(eq(ibu.posyanduId, posyanduId))

  const [[{ value: totalChildren }], [{ value: totalIbuHamil }], pengukurans, visits] = await Promise.all([
    db.select({ value: count() }).from(anak).where(inArray(anak.ibuId, ibuIds)),
    db.select({ value: count() }).from(ibu).where(and(eq(ibu.posyanduId, posyanduId), eq(ibu.isHamil, true))),
    db.select({ tanggal: pengukuran.tanggal, anakId: pengukuran.anakId, statusTBU: pengukuran.statusTBU })
      .from(pengukuran)
      .where(and(eq(pengukuran.posyanduId, posyanduId), gte(pengukuran.tanggal, sixMonthsAgo))),
    db.select({ visitDate: pregnancyVisit.visitDate, ibuId: pregnancyVisit.ibuId })
      .from(pregnancyVisit)
      .where(and(inArray(pregnancyVisit.ibuId, ibuIds), gte(pregnancyVisit.visitDate, sixMonthsAgo))),
  ])

  const months = []
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)

    const pInMonth = pengukurans.filter(p => p.tanggal >= start && p.tanggal < end)
    const anakMeasured = new Set(pInMonth.map(p => p.anakId)).size
    const stuntingAnak = new Set(
      pInMonth.filter(p => p.statusTBU === "Stunting" || p.statusTBU === "Stunting Berat").map(p => p.anakId)
    ).size

    const vInMonth = visits.filter(v => v.visitDate >= start && v.visitDate < end)
    const bumilMeasured = new Set(vInMonth.map(v => v.ibuId)).size

    months.push({
      bulan: MONTHS_ID[start.getMonth()],
      cakupanAnak: totalChildren ? Math.round((anakMeasured / totalChildren) * 100) : 0,
      cakupanBumil: totalIbuHamil ? Math.round((bumilMeasured / totalIbuHamil) * 100) : 0,
      kasusStunting: stuntingAnak,
    })
  }

  return months
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
    kader: m.kader.nama,
  }))
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
    with: {
      ibu: { columns: { nama: true, noHp: true } },
      pengukurans: { orderBy: desc(pengukuran.tanggal), limit: 1, columns: { tanggal: true } },
    },
  })

  return unchecked.map((anakRow) => {
    const birthDate = new Date(anakRow.tanggalLahir)
    const ageMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth())
    const years = Math.floor(ageMonths / 12)
    const months = ageMonths % 12
    const ageStr = `${years > 0 ? years + " tahun " : ""}${months} bulan`

    const lastCheck = anakRow.pengukurans[0]?.tanggal ?? null
    const monthsSinceCheck = lastCheck
      ? (now.getFullYear() - lastCheck.getFullYear()) * 12 + (now.getMonth() - lastCheck.getMonth())
      : null

    return {
      id: anakRow.id,
      nama: anakRow.nama,
      usia: ageStr,
      posyandu: "Melati",
      ibuName: anakRow.ibu.nama,
      noHp: anakRow.ibu.noHp,
      terakhirDiingatkan: anakRow.terakhirDiingatkan,
      ageMo: ageMonths,
      lastCheck,
      monthsSinceCheck,
    }
  })
}

export async function getUncheckedIbuHamil() {
  const session = await auth()
  if (!session || session.user.role !== "kader") {
    throw new Error("Unauthorized")
  }

  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const visitedIbuIds = db.select({ id: pregnancyVisit.ibuId }).from(pregnancyVisit).where(gte(pregnancyVisit.visitDate, firstDayOfMonth))

  const unchecked = await db.query.ibu.findMany({
    where: and(
      eq(ibu.posyanduId, session.user.posyanduId),
      eq(ibu.isHamil, true),
      notInArray(ibu.id, visitedIbuIds),
    ),
    with: {
      pregnancyProfile: { columns: { hpht: true } },
      pregnancyVisits: { orderBy: desc(pregnancyVisit.visitDate), limit: 1, columns: { visitDate: true } },
    },
  })

  return unchecked.map((ibuRow) => {
    const hpht = ibuRow.pregnancyProfile?.hpht ? new Date(ibuRow.pregnancyProfile.hpht) : null
    const weeks = hpht ? Math.floor((now.getTime() - hpht.getTime()) / (7 * 24 * 60 * 60 * 1000)) : null

    const lastCheck = ibuRow.pregnancyVisits[0]?.visitDate ?? null
    const monthsSinceCheck = lastCheck
      ? (now.getFullYear() - lastCheck.getFullYear()) * 12 + (now.getMonth() - lastCheck.getMonth())
      : null

    return {
      id: ibuRow.id,
      nama: ibuRow.nama,
      minggu: weeks,
      noHp: ibuRow.noHp,
      terakhirDiingatkan: ibuRow.terakhirDiingatkanKehamilan,
      lastCheck,
      monthsSinceCheck,
    }
  })
}

export async function getTindakLanjutList() {
  const session = await auth()
  if (!session || session.user.role !== "kader") {
    throw new Error("Unauthorized")
  }

  const posyanduId = session.user.posyanduId
  const now = new Date()
  const ibuIds = db.select({ id: ibu.id }).from(ibu).where(eq(ibu.posyanduId, posyanduId))

  const [children, ibusHamil] = await Promise.all([
    db.query.anak.findMany({
      where: inArray(anak.ibuId, ibuIds),
      with: { pengukurans: { orderBy: desc(pengukuran.tanggal), limit: 3 } },
    }),
    db.query.ibu.findMany({
      where: and(eq(ibu.posyanduId, posyanduId), eq(ibu.isHamil, true)),
      with: {
        pregnancyProfile: { columns: { hpht: true } },
        pregnancyVisits: { orderBy: desc(pregnancyVisit.visitDate), limit: 1 },
      },
    }),
  ])

  type Item = {
    id: string
    type: "anak" | "bumil"
    nama: string
    badge: string
    meta: string
    detail: string
    severity: number
    href: string
  }

  const anakSeverity = (status?: string) => {
    if (status === "Stunting" || status === "Stunting Berat") return 3
    if (status === "Gizi Kurang" || status === "Berisiko" || status === "Risiko Stunting") return 2
    return 0
  }

  const anakItems: Item[] = children.flatMap((c) => {
    const last = c.pengukurans[0]
    if (!last) return []

    // Flags two straight non-gaining weigh-ins even when the latest z-score reads Normal.
    const bbTidakNaik = c.pengukurans.length >= 3 &&
      c.pengukurans[1].beratBadan <= c.pengukurans[2].beratBadan &&
      last.beratBadan <= c.pengukurans[1].beratBadan

    const severity = Math.max(anakSeverity(last.statusTBU), bbTidakNaik ? 2 : 0)
    if (severity === 0) return []

    const birthDate = new Date(c.tanggalLahir)
    const ageMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth())
    const monthsSinceCheck = (now.getFullYear() - last.tanggal.getFullYear()) * 12 + (now.getMonth() - last.tanggal.getMonth())

    const detail = bbTidakNaik
      ? "BB tidak naik 2 penimbangan berturut-turut"
      : `TB/U ${last.zScoreTBU.toFixed(1).replace(".", ",")} SD${monthsSinceCheck > 0 ? ` · belum diperiksa ${monthsSinceCheck} bulan` : " · perlu pemantauan lanjutan"}`

    return [{
      id: c.id,
      type: "anak" as const,
      nama: c.nama,
      badge: last.statusTBU,
      meta: `ANAK · ${ageMonths} BLN`,
      detail,
      severity,
      href: `/kader/anak/${c.id}`,
    }]
  })

  const ibuItems: Item[] = ibusHamil.flatMap((m) => {
    const visit = m.pregnancyVisits[0]
    if (!visit) return []

    const kek = visit.lilaCm < 23.5
    const anemia = visit.hbGdl < 11.0
    if (!kek && !anemia) return []

    const hpht = m.pregnancyProfile?.hpht ? new Date(m.pregnancyProfile.hpht) : null
    const weeks = hpht ? Math.floor((now.getTime() - hpht.getTime()) / (7 * 24 * 60 * 60 * 1000)) : null
    const trimester = weeks === null ? null : weeks < 14 ? 1 : weeks < 28 ? 2 : 3

    return [{
      id: m.id,
      type: "bumil" as const,
      nama: m.nama,
      badge: [kek && "Risiko KEK", anemia && "Anemia"].filter(Boolean).join(" · "),
      meta: `IBU HAMIL · ${weeks ?? "-"} MGG`,
      detail: `LILA ${visit.lilaCm.toFixed(1).replace(".", ",")} cm · Hb ${visit.hbGdl.toFixed(1).replace(".", ",")} g/dL · trimester ${trimester ?? "-"}`,
      severity: kek && anemia ? 3 : 2,
      href: `/kader/ibu/${m.id}`,
    }]
  })

  const all = [...anakItems, ...ibuItems].sort((a, b) => b.severity - a.severity)

  return { items: all.slice(0, 3), total: all.length, anakCount: anakItems.length, bumilCount: ibuItems.length }
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
    genderRaw: anakRow.jenisKelamin as "L" | "P",
    birthDateRaw: birthDate.toISOString().slice(0, 10),
    beratLahir: anakRow.beratLahir,
    panjangLahir: anakRow.panjangLahir,
    birthDate: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(birthDate),
    age: `${ageMonths} bulan`,
    ageMo: ageMonths,
    posyandu: anakRow.ibu.posyandu.nama,
    posyanduId: anakRow.ibu.posyandu.id,
    desa: anakRow.ibu.kelurahan || "-",
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

  const ibus = await db.query.ibu.findMany({
    with: {
      posyandu: { columns: { nama: true }, with: { kaders: { limit: 1 } } },
      anaks: {
        with: { pengukurans: { orderBy: desc(pengukuran.tanggal), limit: 1 } },
      },
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

  KELURAHAN_LIST.forEach((kel, i) => {
    kelurahanMap.set(kel.nama, {
      id: i + 1,
      nama: kel.nama,
      lat: kel.lat,
      lng: kel.lng,
      total: 0,
      normal: 0,
      risiko: 0,
      stunting: 0,
      posyandu: [],
      petugas: "Bidan",
    })
  })

  ibus.forEach((ibuRow) => {
    if (!ibuRow.kelurahan) return
    const data = kelurahanMap.get(ibuRow.kelurahan)
    if (!data) return

    if (!data.posyandu.includes(ibuRow.posyandu.nama)) {
      data.posyandu.push(ibuRow.posyandu.nama)
      if (data.petugas === "Bidan") data.petugas = ibuRow.posyandu.kaders[0]?.nama || "Bidan"
    }

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

  return Array.from(kelurahanMap.values())
}

export async function getKelurahanPatients(kelurahanNama: string) {
  const session = await auth()
  if (!session || session.user.role !== "kader") {
    throw new Error("Unauthorized")
  }

  const ibus = await db.query.ibu.findMany({
    where: eq(ibu.kelurahan, kelurahanNama),
    with: {
      anaks: { with: { pengukurans: { orderBy: desc(pengukuran.tanggal), limit: 1 } } },
      pregnancyVisits: { orderBy: desc(pregnancyVisit.visitDate), limit: 1 },
    },
  })

  const now = new Date()
  const rank = { Stunting: 0, Berisiko: 1, Normal: 2 } as const

  const patients = ibus.flatMap((ibuRow) => {
    const anakPatients = ibuRow.anaks.map((anakRow) => {
      const lastP = anakRow.pengukurans[0]
      const birthDate = new Date(anakRow.tanggalLahir)
      const ageMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth())
      const status = (lastP?.statusTBU || "Normal") as keyof typeof rank

      return {
        id: anakRow.id,
        type: "anak" as const,
        name: anakRow.nama,
        desc: `Anak · ${ageMonths} bln${lastP ? ` · TB/U ${lastP.zScoreTBU.toFixed(1)} SD` : ""}`,
        status,
      }
    })

    if (!ibuRow.isHamil) return anakPatients

    const visit = ibuRow.pregnancyVisits[0]
    const issues = visit
      ? [visit.lilaCm < 23.5 && "KEK", visit.hbGdl < 11.0 && "anemia"].filter(Boolean).join(" + ")
      : ""

    return [
      ...anakPatients,
      {
        id: ibuRow.id,
        type: "bumil" as const,
        name: ibuRow.nama,
        desc: `Bumil${visit ? ` · LILA ${visit.lilaCm.toFixed(1)} cm · Hb ${visit.hbGdl.toFixed(1)} g/dL` : ""}`,
        status: (issues ? "Berisiko" : "Normal") as keyof typeof rank,
      },
    ]
  })

  return patients.sort((a, b) => rank[a.status] - rank[b.status])
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
      pregnancyVisits: { 
        orderBy: (pv, { asc }) => asc(pv.visitDate),
        with: { kader: { columns: { nama: true } } }
      },
      skrinings: { orderBy: (s, { desc }) => desc(s.tanggal) },
    },
  })

  if (!ibuRow || ibuRow.posyanduId !== session.user.posyanduId) throw new Error("Not found")
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _password, ...rest } = ibuRow
  return { ...rest, posyandu: ibuRow.posyandu.nama }
}

export async function getRekapStats() {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

  const posyanduId = session.user.posyanduId
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [posyanduRow, [{ value: totalChildren }], measuredThisMonth] = await Promise.all([
    db.query.posyandu.findFirst({ where: eq(posyandu.id, posyanduId), columns: { nama: true } }),
    db.select({ value: count() }).from(anak).where(inArray(anak.ibuId, db.select({ id: ibu.id }).from(ibu).where(eq(ibu.posyanduId, posyanduId)))),
    db.selectDistinct({ anakId: pengukuran.anakId }).from(pengukuran).where(and(eq(pengukuran.posyanduId, posyanduId), gte(pengukuran.tanggal, firstDayOfMonth))),
  ])

  return {
    totalChildren,
    measuredThisMonth: measuredThisMonth.length,
    posyanduName: posyanduRow?.nama || "Posyandu",
  }
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

  const prevPengukurans = await db.query.pengukuran.findMany({
    where: eq(pengukuran.anakId, data.anakId),
    orderBy: desc(pengukuran.tanggal),
    limit: 2,
  })

  const statusGizi = stuntingLabel[zTBU.status]

  const [result] = await db.insert(pengukuran).values({
    anakId: data.anakId,
    posyanduId: session.user.posyanduId!,
    kaderId: session.user.id!,
    beratBadan: data.beratBadan,
    tinggiBadan: data.tinggiBadan,
    zScoreTBU: zTBU.zScore,
    zScoreBBU: zBBU,
    zScoreBBTB: zBBTB,
    statusTBU: statusGizi,
    statusBBU: "Normal",
    statusBBTB: "Normal",
    tanggal: now,
  }).returning()

  const bbTurunBerturut = prevPengukurans.length >= 2 &&
    data.beratBadan < prevPengukurans[0].beratBadan &&
    prevPengukurans[0].beratBadan < prevPengukurans[1].beratBadan

  if (statusGizi !== "Normal" || bbTurunBerturut) {
    await notifyChildRisk({
      posyanduId: session.user.posyanduId!,
      anakId: data.anakId,
      nama: anakRow.nama,
      ageMonths,
      statusGizi: statusGizi !== "Normal" ? statusGizi : "berat badan turun",
      bbTurunBerturut,
    })
  }

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

export async function createChildForIbu(data: {
  ibuId: string
  nama: string
  sex: string
  birth: string
  namaAyah?: string
  anakKe?: number
  beratLahirKg?: string
  panjangLahirCm?: string
}) {
  await getValidatedPosyanduId()

  const [anakRow] = await db.insert(anak).values({
    nama: data.nama,
    tanggalLahir: new Date(data.birth),
    jenisKelamin: data.sex,
    namaAyah: data.namaAyah,
    anakKe: data.anakKe,
    beratLahir: data.beratLahirKg ? parseFloat(data.beratLahirKg.replace(",", ".")) : null,
    panjangLahir: data.panjangLahirCm ? parseFloat(data.panjangLahirCm.replace(",", ".")) : null,
    ibuId: data.ibuId,
  }).returning()

  revalidatePath("/kader/dashboard")
  revalidatePath("/kader/rekap")
  revalidatePath(`/kader/ibu/${data.ibuId}`)

  return anakRow
}

export async function updateAnak(data: {
  id: string
  nama: string
  sex: "L" | "P"
  birth: string
  beratLahirKg?: string
  panjangLahirCm?: string
}) {
  const posyanduId = await getValidatedPosyanduId()

  const existing = await db.query.anak.findFirst({
    where: eq(anak.id, data.id),
    with: { ibu: { columns: { posyanduId: true } } },
  })
  if (!existing || existing.ibu.posyanduId !== posyanduId) throw new Error("Not found")

  await db.update(anak)
    .set({
      nama: data.nama,
      tanggalLahir: new Date(data.birth),
      jenisKelamin: data.sex,
      beratLahir: data.beratLahirKg ? parseFloat(data.beratLahirKg.replace(",", ".")) : null,
      panjangLahir: data.panjangLahirCm ? parseFloat(data.panjangLahirCm.replace(",", ".")) : null,
    })
    .where(eq(anak.id, data.id))

  revalidatePath("/kader/dashboard")
  revalidatePath("/kader/rekap")
  revalidatePath(`/kader/anak/${data.id}`)
}

export async function createIbu(data: {
  nama: string
  username: string
  password: string
  kelurahan: string
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

  if (!KELURAHAN_NAMES.includes(data.kelurahan)) throw new Error("Kelurahan tidak valid")

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
      kelurahan: data.kelurahan,
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

export async function updateIbu(data: {
  id: string
  nama: string
  noHp?: string
  kelurahan: string
  alamat?: string
}) {
  const posyanduId = await getValidatedPosyanduId()

  if (!KELURAHAN_NAMES.includes(data.kelurahan)) throw new Error("Kelurahan tidak valid")

  const existing = await db.query.ibu.findFirst({ where: eq(ibu.id, data.id) })
  if (!existing || existing.posyanduId !== posyanduId) throw new Error("Not found")

  await db.update(ibu)
    .set({
      nama: data.nama,
      noHp: data.noHp || null,
      kelurahan: data.kelurahan,
      alamat: data.alamat || null,
    })
    .where(eq(ibu.id, data.id))

  revalidatePath("/kader/rekap")
  revalidatePath("/kader/dashboard")
}

const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789" // no 0/O/1/l/I

export async function resetIbuPassword(ibuId: string) {
  const posyanduId = await getValidatedPosyanduId()

  const existing = await db.query.ibu.findFirst({ where: eq(ibu.id, ibuId) })
  if (!existing || existing.posyanduId !== posyanduId) throw new Error("Not found")

  const newPassword = Array.from({ length: 8 }, () => PASSWORD_CHARS[randomInt(PASSWORD_CHARS.length)]).join("")
  const hashed = await bcrypt.hash(newPassword, 10)

  await db.update(ibu).set({ password: hashed }).where(eq(ibu.id, ibuId))

  return { password: newPassword }
}

export async function searchIbu(query: string) {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

  const q = query.trim().toLowerCase()
  if (!q) return []

  const list = await db.query.ibu.findMany({
    where: eq(ibu.posyanduId, session.user.posyanduId),
    columns: { id: true, nama: true, noHp: true, alamat: true, kelurahan: true, username: true },
    orderBy: asc(ibu.nama),
    limit: 20,
  })

  return list.filter(
    (r) =>
      r.nama.toLowerCase().includes(q) ||
      (r.noHp ?? "").replace(/\s/g, "").includes(q.replace(/\s/g, ""))
  )
}

export async function getPosyanduName(): Promise<string> {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

  const row = await db.query.posyandu.findFirst({
    where: eq(posyandu.id, session.user.posyanduId),
    columns: { nama: true },
  })

  return row?.nama ?? "Posyandu"
}
