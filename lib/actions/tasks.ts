"use server"

import { db } from "@/lib/db/client"
import { dailyTask, ibu, anak } from "@/lib/db/schema"
import { and, asc, eq, gte, isNull, lte } from "drizzle-orm"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { PREGNANCY_TASKS, CHILD_TASKS, sumTaskPoints, getTodayRange } from "@/lib/daily-tasks"

/**
 * Menentukan tugas siapa yang sedang dibuka: kehamilan (null) atau anak tertentu.
 * Diputuskan di server supaya klien tidak bisa menunjuk anak milik ibu lain, dan
 * supaya halaman tugas tanpa parameter tetap dapat scope yang benar.
 */
async function resolveScope(ibuId: string, anakId?: string) {
  if (anakId) {
    const milikIbu = await db.query.anak.findFirst({
      where: and(eq(anak.id, anakId), eq(anak.ibuId, ibuId)),
      columns: { id: true },
    })
    if (!milikIbu) throw new Error("Anak tidak ditemukan")
    return { scope: anakId, isHamil: false }
  }

  const ibuRow = await db.query.ibu.findFirst({ where: eq(ibu.id, ibuId), columns: { isHamil: true } })
  const isHamil = !!ibuRow?.isHamil
  if (isHamil) return { scope: null, isHamil }

  // ibu tidak hamil dan tidak menyebut anak: pakai anak pertama
  const anakPertama = await db.query.anak.findFirst({
    where: eq(anak.ibuId, ibuId),
    orderBy: asc(anak.createdAt),
    columns: { id: true },
  })
  return { scope: anakPertama?.id ?? null, isHamil }
}

const scopeFilter = (anakId: string | null) =>
  anakId ? eq(dailyTask.anakId, anakId) : isNull(dailyTask.anakId)

export async function getDailyTasks(anakId?: string) {
  const session = await auth()
  if (!session || session.user.role !== "ibu") throw new Error("Unauthorized")

  const { scope } = await resolveScope(session.user.id, anakId)
  const { start, end } = getTodayRange()

  return db.query.dailyTask.findMany({
    where: and(
      eq(dailyTask.ibuId, session.user.id),
      scopeFilter(scope),
      gte(dailyTask.date, start),
      lte(dailyTask.date, end),
    ),
  })
}

export async function toggleDailyTask(taskId: number, anakId?: string) {
  const session = await auth()
  if (!session || session.user.role !== "ibu") throw new Error("Unauthorized")

  const { scope } = await resolveScope(session.user.id, anakId)
  const { start } = getTodayRange()

  const existing = await db.query.dailyTask.findFirst({
    where: and(
      eq(dailyTask.ibuId, session.user.id),
      scopeFilter(scope),
      eq(dailyTask.taskId, taskId),
      eq(dailyTask.date, start),
    ),
  })

  if (existing) {
    await db.update(dailyTask).set({ completed: !existing.completed }).where(eq(dailyTask.id, existing.id))
  } else {
    await db.insert(dailyTask).values({
      ibuId: session.user.id,
      anakId: scope,
      taskId: taskId,
      completed: true,
      date: start,
    })
  }

  revalidatePath("/ibu/dashboard")
  revalidatePath("/ibu/tugas")
}

export async function getDailyTaskStats(anakId?: string) {
  const session = await auth()
  if (!session || session.user.role !== "ibu") return { score: 0, doneCount: 0 }

  const { scope, isHamil } = await resolveScope(session.user.id, anakId)
  const { start, end } = getTodayRange()

  const tasks = await db.query.dailyTask.findMany({
    where: and(
      eq(dailyTask.ibuId, session.user.id),
      scopeFilter(scope),
      gte(dailyTask.date, start),
      lte(dailyTask.date, end),
      eq(dailyTask.completed, true),
    ),
  })

  // tugas kehamilan hanya kalau ibunya memang hamil; ibu tanpa anak & tidak
  // hamil tetap memakai daftar tugas anak, sama seperti yang dilihatnya di layar
  const defs = scope === null && isHamil ? PREGNANCY_TASKS : CHILD_TASKS

  let score = 0
  let doneCount = 0

  tasks.forEach(t => {
    const pts = sumTaskPoints(defs, t.taskId)
    if (pts > 0) {
      score += pts
      doneCount++
    }
  })

  return { score, doneCount }
}
