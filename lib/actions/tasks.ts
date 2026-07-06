"use server"

import { db } from "@/lib/db/client"
import { dailyTask, ibu } from "@/lib/db/schema"
import { and, eq, gte, lte } from "drizzle-orm"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

function getTodayRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  return { start, end }
}

export async function getDailyTasks() {
  const session = await auth()
  if (!session || session.user.role !== "ibu") throw new Error("Unauthorized")

  const { start, end } = getTodayRange()

  const tasks = await db.query.dailyTask.findMany({
    where: and(
      eq(dailyTask.ibuId, session.user.id),
      gte(dailyTask.date, start),
      lte(dailyTask.date, end),
    ),
  })

  return tasks
}

export async function toggleDailyTask(taskId: number) {
  const session = await auth()
  if (!session || session.user.role !== "ibu") throw new Error("Unauthorized")

  const { start } = getTodayRange()

  const existing = await db.query.dailyTask.findFirst({
    where: and(
      eq(dailyTask.ibuId, session.user.id),
      eq(dailyTask.taskId, taskId),
      eq(dailyTask.date, start),
    ),
  })

  if (existing) {
    await db.update(dailyTask).set({ completed: !existing.completed }).where(eq(dailyTask.id, existing.id))
  } else {
    await db.insert(dailyTask).values({
      ibuId: session.user.id,
      taskId: taskId,
      completed: true,
      date: start,
    })
  }

  revalidatePath("/ibu/dashboard")
  revalidatePath("/ibu/tugas")
}

export async function getDailyTaskStats() {
  const session = await auth()
  if (!session || session.user.role !== "ibu") return { score: 0, doneCount: 0 }

  const ibuRow = await db.query.ibu.findFirst({
    where: eq(ibu.id, session.user.id),
    columns: { isHamil: true },
  })

  const { start, end } = getTodayRange()

  const tasks = await db.query.dailyTask.findMany({
    where: and(
      eq(dailyTask.ibuId, session.user.id),
      gte(dailyTask.date, start),
      lte(dailyTask.date, end),
      eq(dailyTask.completed, true),
    ),
  })

  let score = 0
  let doneCount = 0

  if (ibuRow?.isHamil) {
    const PREGNANCY_PTS = [20, 20, 20, 20, 10, 10]
    tasks.forEach(t => {
      if (t.taskId >= 0 && t.taskId < PREGNANCY_PTS.length) {
        score += PREGNANCY_PTS[t.taskId]
        doneCount++
      }
    })
  } else {
    const CHILD_PTS = [20, 20, 20, 20, 20]
    tasks.forEach(t => {
      if (t.taskId >= 0 && t.taskId < CHILD_PTS.length) {
        score += CHILD_PTS[t.taskId]
        doneCount++
      }
    })
  }

  return { score, doneCount }
}
