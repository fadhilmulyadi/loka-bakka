"use client"

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { getIbuData, getIbuAnakForDashboard } from '@/lib/actions/ibu'
import { getPregnancyProfile, getPregnancyVisits } from '@/lib/actions/pregnancy'
import { getDailyTaskStats } from '@/lib/actions/tasks'
import { getIbuNotifications } from '@/lib/actions/notifikasi'
import { type PregnancyProfileData, type PregnancyVisitData } from '@/lib/growth-standards/imt-calc'
import PregnancyDashboardView from '@/components/ibu/pregnancy-dashboard-view'
import ChildDashboardView from '@/components/ibu/child-dashboard-view'

function LoadingSpinner() {
  return (
    <div className="flex-1 flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-[#3B93E6] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function ErrorState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center bg-white">
      <div className="w-16 h-16 rounded-full bg-[#F1F7FE] flex items-center justify-center mb-4">
        <span className="text-3xl">🏥</span>
      </div>
      <h2 className="text-[16px] font-semibold text-[#1F2937]">Data tidak tersedia</h2>
      <p className="text-[13px] text-[#697079] mt-2 max-w-60 leading-relaxed">
        Silakan hubungi kader posyandu untuk mendaftarkan akun Anda.
      </p>
    </div>
  )
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const childId = searchParams.get('child')

  const [ibuData, setIbuData] = useState<Awaited<ReturnType<typeof getIbuData>>>(null)
  const [childData, setChildData] = useState<Awaited<ReturnType<typeof getIbuAnakForDashboard>>>(null)
  const [profile, setProfile] = useState<PregnancyProfileData | null>(null)
  const [visits, setVisits] = useState<PregnancyVisitData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [score, setScore] = useState(0)
  const [doneCount, setDoneCount] = useState(0)
  const [notifications, setNotifications] = useState<Awaited<ReturnType<typeof getIbuNotifications>>>([])

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(false)

    if (childId) {
      Promise.all([getIbuAnakForDashboard(childId), getDailyTaskStats(childId), getIbuNotifications()])
        .then(([data, stats, notifs]) => {
          if (!mounted) return
          setChildData(data)
          setScore(stats.score)
          setDoneCount(stats.doneCount)
          setNotifications(notifs)
          setLoading(false)
        })
        .catch(() => { if (mounted) { setError(true); setLoading(false) } })
    } else {
      Promise.all([getIbuData(), getPregnancyProfile(), getPregnancyVisits(), getDailyTaskStats(), getIbuNotifications()])
        .then(([data, p, v, stats, notifs]) => {
          if (!mounted) return
          setIbuData(data)
          setProfile(p)
          setVisits(v)
          setScore(stats.score)
          setDoneCount(stats.doneCount)
          setNotifications(notifs)
          setLoading(false)
        })
        .catch(() => { if (mounted) { setError(true); setLoading(false) } })
    }

    return () => { mounted = false }
  }, [childId])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorState />

  if (childId) {
    if (!childData) return <ErrorState />
    return <ChildDashboardView data={childData} score={score} doneCount={doneCount} notifications={notifications} />
  }

  if (!ibuData) return <ErrorState />

  if (ibuData.isPregnant) {
    return (
      <PregnancyDashboardView
        data={ibuData}
        score={score}
        doneCount={doneCount}
        profile={profile}
        visits={visits}
        notifications={notifications}
      />
    )
  }

  return <ChildDashboardView data={ibuData} score={score} doneCount={doneCount} notifications={notifications} />
}

export default function IbuDashboardPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DashboardContent />
    </Suspense>
  )
}
