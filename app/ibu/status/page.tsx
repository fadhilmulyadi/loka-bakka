"use client"

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { getIbuData } from '@/lib/actions/ibu'
import { getPregnancyProfile, getPregnancyVisits } from '@/lib/actions/pregnancy'
import PregnancyStatusView from '@/components/ibu/pregnancy-status-view'
import ChildStatusView from '@/components/ibu/child-status-view'
import type { PregnancyProfileData, PregnancyVisitData } from '@/lib/growth-standards/imt-calc'

function LoadingSpinner() {
  return (
    <div className="flex-1 flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-[#3B93E6] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function StatusContent() {
  const searchParams = useSearchParams()
  const childId = searchParams.get('child')

  const [ibuData, setIbuData] = useState<Awaited<ReturnType<typeof getIbuData>>>(null)
  const [profile, setProfile] = useState<PregnancyProfileData | null>(null)
  const [latestVisit, setLatestVisit] = useState<PregnancyVisitData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (childId) {
      setLoading(false)
      return
    }
    let mounted = true
    Promise.all([getIbuData(), getPregnancyProfile(), getPregnancyVisits()])
      .then(([data, p, visits]) => {
        if (!mounted) return
        setIbuData(data)
        setProfile(p)
        setLatestVisit(visits[0] ?? null)
        setLoading(false)
      })
      .catch(() => { if (mounted) { setError(true); setLoading(false) } })
    return () => { mounted = false }
  }, [childId])

  if (loading) return <LoadingSpinner />

  if (childId) return <ChildStatusView childId={childId} />

  if (error || !ibuData) return (
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

  // Ibu yang tidak hamil langsung melihat status anak pertamanya, mengikuti
  // pola dashboard (app/ibu/dashboard/page.tsx) yang juga jatuh ke tampilan
  // anak. Tanpa ini tab Status jadi jalan buntu, karena bottom nav di URL
  // tanpa ?child= adalah IbuBottomNav yang menaut ke /ibu/status polos.
  if (!ibuData.isPregnant) {
    if (ibuData.childData) return <ChildStatusView childId={ibuData.childData.id} />

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 text-center bg-white">
        <div className="w-16 h-16 rounded-full bg-[#F1F7FE] flex items-center justify-center mb-4">
          <span className="text-3xl">👶</span>
        </div>
        <h2 className="text-[16px] font-semibold text-[#1F2937]">Belum ada data</h2>
        <p className="text-[13px] text-[#697079] mt-2 max-w-60 leading-relaxed">
          Halaman status tersedia saat Ibu sedang hamil atau sudah punya anak yang terdaftar di posyandu.
        </p>
      </div>
    )
  }

  return <PregnancyStatusView profile={profile} latestVisit={latestVisit} />
}

export default function IbuStatusPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <StatusContent />
    </Suspense>
  )
}
