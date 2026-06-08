"use client"

import React, { useEffect, useState } from 'react'
import { getIbuData } from '@/lib/actions/ibu'
import { getPregnancyProfile, getPregnancyVisits } from '@/lib/actions/pregnancy'
import PregnancyStatusView from '@/components/ibu/pregnancy-status-view'
import type { PregnancyProfileData, PregnancyVisitData } from '@/lib/growth-standards/imt-calc'

export default function IbuStatusPage() {
  const [ibuData, setIbuData] = useState<any>(null)
  const [profile, setProfile] = useState<PregnancyProfileData | null>(null)
  const [latestVisit, setLatestVisit] = useState<PregnancyVisitData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let mounted = true
    Promise.all([getIbuData(), getPregnancyProfile(), getPregnancyVisits()])
      .then(([data, p, visits]) => {
        if (mounted) {
          setIbuData(data)
          setProfile(p)
          setLatestVisit(visits[0] ?? null)
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

  if (!ibuData?.isPregnant) return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center bg-white">
      <div className="w-16 h-16 rounded-full bg-[#F1F7FE] flex items-center justify-center mb-4">
        <span className="text-3xl">👶</span>
      </div>
      <h2 className="text-[16px] font-semibold text-[#1F2937]">Halaman tidak tersedia</h2>
      <p className="text-[13px] text-[#697079] mt-2 max-w-[240px] leading-relaxed">
        Halaman status kehamilan hanya tersedia untuk ibu hamil.
      </p>
    </div>
  )

  return <PregnancyStatusView profile={profile} latestVisit={latestVisit} />
}
