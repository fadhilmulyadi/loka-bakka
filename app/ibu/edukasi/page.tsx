"use client"

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { getIbuData } from '@/lib/actions/ibu'
import PregnancyEducationView from '@/components/ibu/pregnancy-education-view'
import ChildEducationView from '@/components/ibu/child-education-view'

function LoadingSpinner() {
  return (
    <div className="flex-1 flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-[#3B93E6] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function EdukasiContent() {
  const searchParams = useSearchParams()
  const childId = searchParams.get('child')

  const [ibuData, setIbuData] = useState<Awaited<ReturnType<typeof getIbuData>>>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (childId) {
      setLoading(false)
      return
    }
    let mounted = true
    getIbuData().then(data => {
      if (mounted) { setIbuData(data); setLoading(false) }
    })
    return () => { mounted = false }
  }, [childId])

  if (loading) return <LoadingSpinner />

  if (childId) return <ChildEducationView />

  if (ibuData?.isPregnant && ibuData.pregnancyData) {
    return <PregnancyEducationView trimester={ibuData.pregnancyData.trimester} />
  }

  return <ChildEducationView />
}

export default function IbuEdukasiPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <EdukasiContent />
    </Suspense>
  )
}
