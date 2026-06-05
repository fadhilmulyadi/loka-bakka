"use client"

import React, { useEffect, useState } from 'react'
import { getIbuData } from '@/lib/actions/ibu'
import PregnancyDashboardView from '@/components/ibu/pregnancy-dashboard-view'
import ChildDashboardView from '@/components/ibu/child-dashboard-view'

export default function IbuDashboardPage() {
  const [ibuData, setIbuData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [score, setScore] = useState(60)
  const [doneCount, setDoneCount] = useState(4)

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

  useEffect(() => {
    // Shared state logic for pregnancy tasks
    const TASK_PTS = [20, 20, 20, 20, 10, 10]
    try {
      const st = JSON.parse(localStorage.getItem('tugas_state') || 'null')
      if (st) {
        let newScore = 0
        let newDone = 0
        for (let i = 0; i < 6; i++) {
          if (st[i]) {
            newScore += TASK_PTS[i]
            newDone++
          }
        }
        setScore(newScore)
        setDoneCount(newDone)
      }
    } catch (e) {}
  }, [])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-[#3B93E6] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (ibuData?.isPregnant) {
    return (
      <PregnancyDashboardView 
        data={ibuData} 
        score={score} 
        doneCount={doneCount} 
      />
    )
  }

  return (
    <ChildDashboardView data={ibuData} />
  )
}
