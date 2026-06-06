'use client'

import { useState } from 'react'
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { heightForAgeBoys, heightForAgeGirls } from '@/lib/growth-standards/height-for-age'

interface Measurement {
  date: Date
  heightCm: number
  ageMonths: number
}

interface TBUChartProps {
  sex: 'L' | 'P'
  measurements: Measurement[]
}

export function TBUChart({ sex, measurements }: TBUChartProps) {
  const sorted = [...measurements].sort((a, b) => a.date.getTime() - b.date.getTime())
  
  const data = sorted.map(m => {
    const table = sex === 'L' ? heightForAgeBoys : heightForAgeGirls
    const ref = table.find(r => r.ageMonths === Math.round(m.ageMonths))
    return {
      label: m.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      height: m.heightCm,
      median: ref ? ref.sd0 : null
    }
  })

  return (
    <div className="bg-white border border-[#E4EDE7] rounded-[18px] p-4 shadow-[0_4px_14px_-8px_rgba(9,30,66,0.12)]">
      <h3 className="text-[12px] font-semibold text-[#1F2937] mb-4">Grafik TB/U</h3>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#697079' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#697079' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10 }} />
          <Line type="monotone" dataKey="height" stroke="#1178D4" strokeWidth={2} name="TB Aktual" />
          <Line type="monotone" dataKey="median" stroke="#1E9E62" strokeDasharray="3 3" dot={false} strokeWidth={1} name="Median WHO" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
