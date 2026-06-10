"use server"

import { prisma } from "@/lib/db"
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

  const tasks = await prisma.dailyTask.findMany({
    where: {
      ibuId: session.user.id,
      date: {
        gte: start,
        lte: end,
      },
    },
  })

  return tasks
}

export async function toggleDailyTask(taskId: number) {
  const session = await auth()
  if (!session || session.user.role !== "ibu") throw new Error("Unauthorized")

  const { start } = getTodayRange()

  const existing = await prisma.dailyTask.findUnique({
    where: {
      ibuId_taskId_date: {
        ibuId: session.user.id,
        taskId: taskId,
        date: start,
      },
    },
  })

  if (existing) {
    await prisma.dailyTask.update({
      where: { id: existing.id },
      data: { completed: !existing.completed },
    })
  } else {
    await prisma.dailyTask.create({
      data: {
        ibuId: session.user.id,
        taskId: taskId,
        completed: true,
        date: start,
      },
    })
  }

  revalidatePath("/ibu/dashboard")
  revalidatePath("/ibu/tugas")
}

export async function getDailyTaskStats() {
  const session = await auth()
  if (!session || session.user.role !== "ibu") return { score: 0, doneCount: 0 }

  const ibu = await prisma.ibu.findUnique({
    where: { id: session.user.id },
    select: { isHamil: true }
  })

  const { start, end } = getTodayRange()

  const tasks = await prisma.dailyTask.findMany({
    where: {
      ibuId: session.user.id,
      date: {
        gte: start,
        lte: end,
      },
      completed: true,
    },
  })

  let score = 0
  let doneCount = 0

  if (ibu?.isHamil) {
    const PREGNANCY_PTS = [20, 20, 20, 20, 10, 10]
    tasks.forEach(t => {
      if (t.taskId >= 0 && t.taskId < PREGNANCY_PTS.length) {
        score += PREGNANCY_PTS[t.taskId]
        doneCount++
      }
    })
  } else {
    // Child tasks (0-4)
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
