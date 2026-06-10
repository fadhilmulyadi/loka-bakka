"use client"

import React, { useEffect, useState } from 'react'
import { getIbuData } from '@/lib/actions/ibu'
import { getPregnancyProfile, getPregnancyVisits } from '@/lib/actions/pregnancy'
import { getDailyTaskStats } from '@/lib/actions/tasks'
import { type PregnancyProfileData, type PregnancyVisitData } from '@/lib/growth-standards/imt-calc'
import PregnancyDashboardView from '@/components/ibu/pregnancy-dashboard-view'
import ChildDashboardView from '@/components/ibu/child-dashboard-view'

export default function IbuDashboardPage() {
  const [ibuData, setIbuData] = useState<Awaited<ReturnType<typeof getIbuData>>>(null)
  const [profile, setProfile] = useState<PregnancyProfileData | null>(null)
  const [visits, setVisits] = useState<PregnancyVisitData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [score, setScore] = useState(0)
  const [doneCount, setDoneCount] = useState(0)

  useEffect(() => {
    let mounted = true
    Promise.all([
      getIbuData(),
      getPregnancyProfile(),
      getPregnancyVisits(),
      getDailyTaskStats()
    ])
      .then(([data, p, v, stats]) => {
        if (mounted) {
          setIbuData(data)
          setProfile(p)
          setVisits(v)
          setScore(stats.score)
          setDoneCount(stats.doneCount)
          setLoading(false)
        }
      })
      .catch(() => {
        if (mounted) {
          setError(true)
          setLoading(false)
        }
      })

    return () => { mounted = false }
  }, [])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-[#3B93E6] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error || !ibuData) return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center bg-white">
      <div className="w-16 h-16 rounded-full bg-[#F1F7FE] flex items-center justify-center mb-4">
        <span className="text-3xl">🏥</span>
      </div>
      <h2 className="text-[16px] font-semibold text-[#1F2937]">Data tidak tersedia</h2>
      <p className="text-[13px] text-[#697079] mt-2 max-w-[240px] leading-relaxed">
        Silakan hubungi kader posyandu untuk mendaftarkan akun Anda.
      </p>
    </div>
  )

  if (ibuData?.isPregnant) {
    return (
      <PregnancyDashboardView 
        data={ibuData} 
        score={score} 
        doneCount={doneCount}
        profile={profile}
        visits={visits}
      />
    )
  }

  return (
    <ChildDashboardView data={ibuData} score={score} doneCount={doneCount} />
  )
}
