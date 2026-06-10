"use client"

import React, { useEffect, useState } from 'react'
import { getIbuData } from '@/lib/actions/ibu'
import PregnancyEducationView from '@/components/ibu/pregnancy-education-view'
import ChildEducationView from '@/components/ibu/child-education-view'

export default function IbuEdukasiPage() {
  const [ibuData, setIbuData] = useState<Awaited<ReturnType<typeof getIbuData>>>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    getIbuData().then(data => {
      if (mounted) {
        setIbuData(data)
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

  if (ibuData?.isPregnant) {
    return <PregnancyEducationView trimester={ibuData.pregnancyData.trimester} />
  }

  return <ChildEducationView />
}
