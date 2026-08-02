"use server"

import { db } from "@/lib/db/client"
import { notifikasi, posyandu, ibu, anak, pengukuran, pregnancyVisit } from "@/lib/db/schema"
import { eq, and, inArray, notInArray, isNull, gte, count, desc } from "drizzle-orm"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { getTodayRange } from "@/lib/daily-tasks"

type RiskTemplateCode = "T1" | "T2"

async function recordRiskNotif(opts: {
  posyanduId: string
  templateCode: RiskTemplateCode
  singleJudul: string
  singlePesan: string
  singleActionUrl: string
  mergedActionUrl: string
}) {
  const day = new Date().toISOString().slice(0, 10)
  const groupKey = `${opts.templateCode}-${opts.posyanduId}-${day}`
  const noun = opts.templateCode === "T1" ? "anak" : "ibu hamil"

  const existing = await db.query.notifikasi.findFirst({ where: eq(notifikasi.groupKey, groupKey) })

  if (!existing) {
    await db.insert(notifikasi).values({
      posyanduId: opts.posyanduId,
      templateCode: opts.templateCode,
      level: "merah",
      judul: opts.singleJudul,
      pesan: opts.singlePesan,
      actionLabel: "Lihat Hasil",
      actionUrl: opts.singleActionUrl,
      groupKey,
      mergeCount: 1,
      isRead: false,
    })
  } else {
    const mergeCount = existing.mergeCount + 1
    await db.update(notifikasi).set({
      judul: opts.singleJudul,
      pesan: `${mergeCount} ${noun} perlu perhatian hari ini`,
      actionLabel: "Lihat Daftar",
      actionUrl: opts.mergedActionUrl,
      mergeCount,
      isRead: false,
    }).where(eq(notifikasi.id, existing.id))
  }
}

export async function notifyChildRisk(opts: {
  posyanduId: string
  anakId: string
  nama: string
  ageMonths: number
  statusGizi: string
  bbTurunBerturut: boolean
}) {
  const tanggal = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date())
  const suffix = opts.bbTurunBerturut ? " — BB turun 2 pemeriksaan berturut" : ""
  await recordRiskNotif({
    posyanduId: opts.posyanduId,
    templateCode: "T1",
    singleJudul: "Hasil pemeriksaan perlu perhatian",
    singlePesan: `${opts.nama} (${opts.ageMonths} bln) terindikasi ${opts.statusGizi} dari pemeriksaan ${tanggal}${suffix}`,
    singleActionUrl: `/kader/anak/${opts.anakId}`,
    mergedActionUrl: "/kader/rekap?tab=anak",
  })
}

export async function notifyPregnancyRisk(opts: {
  posyanduId: string
  ibuId: string
  nama: string
  usiaKandunganMinggu: number
  indikator: "LILA" | "Hb" | "Kenaikan BB"
  nilai: string
}) {
  const detail = opts.indikator === "Kenaikan BB"
    ? `kenaikan berat badan ${opts.nilai}, di luar target`
    : `kadar ${opts.indikator} ${opts.nilai}, di bawah batas normal`
  await recordRiskNotif({
    posyanduId: opts.posyanduId,
    templateCode: "T2",
    singleJudul: "Ibu hamil berisiko",
    singlePesan: `${opts.nama} (${opts.usiaKandunganMinggu} mgg) — ${detail}`,
    singleActionUrl: `/kader/ibu/${opts.ibuId}`,
    mergedActionUrl: "/kader/rekap?tab=ibu-hamil",
  })
}

async function ensureRecapNotifications(posyanduId: string) {
  const now = new Date()

  if (now.getDate() >= 20) {
    const monthKey = now.toISOString().slice(0, 7)
    const groupKey = `T3-${posyanduId}-${monthKey}`
    const existing = await db.query.notifikasi.findFirst({ where: eq(notifikasi.groupKey, groupKey) })

    if (!existing) {
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const ibuIds = db.select({ id: ibu.id }).from(ibu).where(eq(ibu.posyanduId, posyanduId))
      const measuredAnakIds = db.select({ id: pengukuran.anakId }).from(pengukuran).where(gte(pengukuran.tanggal, firstDayOfMonth))
      const [{ value: unchecked_anak }] = await db.select({ value: count() }).from(anak)
        .where(and(inArray(anak.ibuId, ibuIds), notInArray(anak.id, measuredAnakIds)))

      const visitedIbuIds = db.select({ id: pregnancyVisit.ibuId }).from(pregnancyVisit).where(gte(pregnancyVisit.visitDate, firstDayOfMonth))
      const [{ value: unchecked_bumil }] = await db.select({ value: count() }).from(ibu)
        .where(and(eq(ibu.posyanduId, posyanduId), eq(ibu.isHamil, true), notInArray(ibu.id, visitedIbuIds)))

      if (unchecked_anak > 0 || unchecked_bumil > 0) {
        const posyanduRow = await db.query.posyandu.findFirst({ where: eq(posyandu.id, posyanduId) })
        const bulan = new Intl.DateTimeFormat("id-ID", { month: "long" }).format(now)
        await db.insert(notifikasi).values({
          posyanduId,
          templateCode: "T3",
          level: "kuning",
          judul: "Rekap belum diperiksa",
          pesan: `${unchecked_anak} anak dan ${unchecked_bumil} ibu hamil di ${posyanduRow?.nama ?? "posyandu"} belum diperiksa bulan ${bulan}`,
          actionLabel: "Lihat Daftar",
          actionUrl: "/kader/rekap?tab=anak&check=Belum Periksa",
          groupKey,
          mergeCount: 1,
          isRead: false,
        })
      }
    }
  }

  const pregnantMothers = await db.query.ibu.findMany({
    where: and(eq(ibu.posyanduId, posyanduId), eq(ibu.isHamil, true)),
    with: { pregnancyProfile: true },
  })

  for (const m of pregnantMothers) {
    if (!m.pregnancyProfile) continue
    const week = Math.floor((now.getTime() - new Date(m.pregnancyProfile.hpht).getTime()) / (7 * 24 * 60 * 60 * 1000))
    if (week < 36) continue

    const groupKey = `T5-${m.pregnancyProfile.id}`
    const existing = await db.query.notifikasi.findFirst({ where: eq(notifikasi.groupKey, groupKey) })
    if (existing) continue

    const hpl = new Date(m.pregnancyProfile.hpht)
    hpl.setDate(hpl.getDate() + 280)

    await db.insert(notifikasi).values({
      posyanduId,
      templateCode: "T5",
      level: "kuning",
      judul: "Mendekati HPL",
      pesan: `${m.nama} memasuki minggu ke-${week} — HPL ${new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(hpl)}`,
      actionLabel: "Lihat Profil",
      actionUrl: `/kader/ibu/${m.id}`,
      groupKey,
      mergeCount: 1,
      isRead: false,
    })
  }
}

export async function getNotifications() {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")
  const posyanduId = session.user.posyanduId!

  await ensureRecapNotifications(posyanduId)

  return db.query.notifikasi.findMany({
    where: and(eq(notifikasi.posyanduId, posyanduId), isNull(notifikasi.ibuId)),
    orderBy: desc(notifikasi.createdAt),
    limit: 30,
  })
}

export async function markAllNotificationsRead() {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

  await db.update(notifikasi).set({ isRead: true }).where(and(eq(notifikasi.posyanduId, session.user.posyanduId!), isNull(notifikasi.ibuId)))
}

// ── Pengingat: kader -> notifikasi ibu (in-app) ──

const PENGINGAT_TEMPLATE = {
  R1: { actionLabel: "Lihat Detail", actionUrl: "/ibu/anak" },
  R2: { actionLabel: "Lihat Detail", actionUrl: "/ibu/status" },
  R3: { actionLabel: "Buka Tugas", actionUrl: "/ibu/tugas" },
} as const

// Satu pengingat per penerima per hari. Remnya constraint unique di groupKey —
// bukan pengecekan di UI, yang bisa dilewati cukup dengan refresh halaman.
// Mengembalikan false kalau hari ini sudah pernah dikirim.
async function insertPengingat(opts: {
  posyanduId: string
  ibuId: string
  scopeId: string // anakId untuk R1 & tugas anak, ibuId untuk tugas ibu
  templateCode: keyof typeof PENGINGAT_TEMPLATE
  judul: string
  pesan: string
  actionUrl?: string
}) {
  const { start } = getTodayRange()
  const day = `${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}`

  const inserted = await db.insert(notifikasi).values({
    posyanduId: opts.posyanduId,
    ibuId: opts.ibuId,
    templateCode: opts.templateCode,
    level: "info",
    judul: opts.judul,
    pesan: opts.pesan,
    ...PENGINGAT_TEMPLATE[opts.templateCode],
    ...(opts.actionUrl ? { actionUrl: opts.actionUrl } : {}),
    groupKey: `${opts.templateCode}-${opts.scopeId}-${day}`,
    isRead: false,
  }).onConflictDoNothing({ target: notifikasi.groupKey }).returning({ id: notifikasi.id })

  return inserted.length > 0
}

export async function sendPengingatAnak({ anakId, judul, pesan }: { anakId: string, judul: string, pesan: string }) {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

  const anakRow = await db.query.anak.findFirst({ where: eq(anak.id, anakId) })
  if (!anakRow) return { success: false, error: "Anak tidak ditemukan" }

  const terkirim = await insertPengingat({
    posyanduId: session.user.posyanduId!,
    ibuId: anakRow.ibuId,
    scopeId: anakId,
    templateCode: "R1",
    judul,
    pesan,
  })
  if (!terkirim) return { success: false, alreadySentToday: true }

  await db.update(anak).set({ terakhirDiingatkan: new Date() }).where(eq(anak.id, anakId))

  revalidatePath("/kader/rekap")
  revalidatePath("/kader/dashboard")
  return { success: true }
}

export async function sendPengingatKehamilan({ ibuId, judul, pesan }: { ibuId: string, judul: string, pesan: string }) {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

  const terkirim = await insertPengingat({
    posyanduId: session.user.posyanduId!,
    ibuId,
    scopeId: ibuId,
    templateCode: "R2",
    judul,
    pesan,
  })
  if (!terkirim) return { success: false, alreadySentToday: true }

  await db.update(ibu).set({ terakhirDiingatkanKehamilan: new Date() }).where(eq(ibu.id, ibuId))

  revalidatePath("/kader/rekap")
  revalidatePath("/kader/dashboard")
  return { success: true }
}

// Tidak menyentuh terakhirDiingatkanKehamilan: itu jejak pengingat posyandu,
// bukan pengingat tugas harian.
export async function sendPengingatTugas({ ibuId, anakId, judul, pesan }: { ibuId: string, anakId?: string, judul: string, pesan: string }) {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

  // discope ke anak kalau tugasnya tugas anak: satu pengingat per anak per hari,
  // dan tautannya langsung membuka daftar tugas anak yang dimaksud
  const terkirim = await insertPengingat({
    posyanduId: session.user.posyanduId!,
    ibuId,
    scopeId: anakId ?? ibuId,
    templateCode: "R3",
    judul,
    pesan,
    actionUrl: anakId ? `/ibu/tugas?child=${anakId}` : undefined,
  })

  return terkirim ? { success: true } : { success: false, alreadySentToday: true }
}

export async function sendPengingatBulk({ targets }: { targets: { anakId: string, judul: string, pesan: string }[] }) {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

  let sentCount = 0
  let skippedCount = 0
  for (const t of targets) {
    const anakRow = await db.query.anak.findFirst({ where: eq(anak.id, t.anakId) })
    if (!anakRow) continue

    const terkirim = await insertPengingat({
      posyanduId: session.user.posyanduId!,
      ibuId: anakRow.ibuId,
      scopeId: t.anakId,
      templateCode: "R1",
      judul: t.judul,
      pesan: t.pesan,
    })
    if (!terkirim) { skippedCount++; continue }

    await db.update(anak).set({ terakhirDiingatkan: new Date() }).where(eq(anak.id, t.anakId))
    sentCount++
  }

  revalidatePath("/kader/rekap")
  revalidatePath("/kader/dashboard")
  return { success: true, count: sentCount, skipped: skippedCount }
}

export async function sendPengingatBulkKehamilan({ targets }: { targets: { ibuId: string, judul: string, pesan: string }[] }) {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

  let sentCount = 0
  let skippedCount = 0
  for (const t of targets) {
    const terkirim = await insertPengingat({
      posyanduId: session.user.posyanduId!,
      ibuId: t.ibuId,
      scopeId: t.ibuId,
      templateCode: "R2",
      judul: t.judul,
      pesan: t.pesan,
    })
    if (!terkirim) { skippedCount++; continue }

    await db.update(ibu).set({ terakhirDiingatkanKehamilan: new Date() }).where(eq(ibu.id, t.ibuId))
    sentCount++
  }

  revalidatePath("/kader/rekap")
  revalidatePath("/kader/dashboard")
  return { success: true, count: sentCount, skipped: skippedCount }
}

export async function getIbuNotifications() {
  const session = await auth()
  if (!session || session.user.role !== "ibu") throw new Error("Unauthorized")

  // 30 hari terakhir — notifikasi lama lewat sendiri, jadi tidak perlu tombol hapus
  // yang bisa membuang jejak pengingat kader (atau peringatan merah) tanpa sengaja.
  const sebulanLalu = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  return db.query.notifikasi.findMany({
    where: and(eq(notifikasi.ibuId, session.user.id), gte(notifikasi.createdAt, sebulanLalu)),
    orderBy: desc(notifikasi.createdAt),
    limit: 20,
  })
}

export async function markIbuNotificationsRead() {
  const session = await auth()
  if (!session || session.user.role !== "ibu") throw new Error("Unauthorized")

  await db.update(notifikasi)
    .set({ isRead: true })
    .where(and(eq(notifikasi.ibuId, session.user.id), eq(notifikasi.isRead, false)))
}
