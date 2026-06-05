'use client'

import { useState } from 'react'
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceArea, ResponsiveContainer,
} from 'recharts'
import type { PregnancyProfileData, PregnancyVisitData } from '@/lib/growth-standards/imt-calc'

interface BBChartProps {
  profile: PregnancyProfileData
  visits: PregnancyVisitData[]
}

type ChartView = 'visit' | 'month'

function formatLabel(date: Date, view: ChartView): string {
  if (view === 'month') {
    return new Date(date).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
  }
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

export function BBChart({ profile, visits }: BBChartProps) {
  const [view, setView] = useState<ChartView>('visit')

  if (visits.length < 2) {
    return (
      <div className="bg-[#F4F7FA] border border-[#DCE6EF] rounded-[14px] p-5 text-center">
        <p className="text-[12px] text-[#697079]">
          Data akan muncul setelah minimal 2 kunjungan tercatat.
        </p>
      </div>
    )
  }

  const sorted = [...visits].sort(
    (a, b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime()
  )

  const data = sorted.map(v => ({
    label: formatLabel(new Date(v.visitDate), view),
    weight: v.currentWeightKg,
    isOnTrack: v.isOnTrack,
  }))

  const targetMin = profile.bbPrepregnancyKg + profile.targetGainMinKg
  const targetMax = profile.bbPrepregnancyKg + profile.targetGainMaxKg

  const allWeights = data.map(d => d.weight)
  const yMin = Math.floor(Math.min(...allWeights, targetMin) - 1)
  const yMax = Math.ceil(Math.max(...allWeights, targetMax) + 1)

  return (
    <div className="bg-white border border-[#E4EDE7] rounded-[18px] p-4 shadow-[0_4px_14px_-8px_rgba(9,30,66,0.12)]">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[12px] font-semibold text-[#1F2937]">Grafik BB</span>
        <div className="flex bg-[#F4F7FA] border border-[#DCE6EF] rounded-[10px] p-[3px] gap-[3px]">
          {(['visit', 'month'] as ChartView[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded-[8px] text-[11px] font-semibold transition-all ${
                view === v
                  ? 'bg-white text-[#1178D4] shadow-[0_2px_5px_rgba(9,30,66,0.1)]'
                  : 'text-[#697079]'
              }`}
            >
              {v === 'visit' ? 'Per Kunjungan' : 'Per Bulan'}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#697079' }}
            tickLine={false}
            axisLine={false}
            padding={{ left: 10, right: 10 }}
            minTickGap={10}
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 10, fill: '#697079' }}
            tickLine={false}
            axisLine={false}
            width={35}
          />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid #E4EDE7', boxShadow: 'none' }}
            formatter={(value) => [`${value} kg`, 'Berat Badan']}
          />
          <ReferenceArea
            y1={targetMin}
            y2={targetMax}
            fill="#E7F7EF"
            fillOpacity={0.4}
            stroke="#C3E9D4"
            strokeWidth={1}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#1178D4"
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy } = props as { cx: number; cy: number; index: number }
              const index = (props as { cx: number; cy: number; index: number }).index
              const isOnTrack = data[index]?.isOnTrack ?? true
              return (
                <circle
                  key={`dot-${index}`}
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill={isOnTrack ? '#1E9E62' : '#D99100'}
                  stroke="white"
                  strokeWidth={2}
                />
              )
            }}
            activeDot={{ r: 6, fill: '#1178D4', stroke: 'white', strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-4 mt-3 justify-center flex-wrap">
        <span className="flex items-center gap-1.5 text-[10px] text-[#697079]">
          <span className="w-4 h-[2px] bg-[#1178D4] rounded-full inline-block" />
          BB Aktual
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-[#697079]">
          <span className="w-3 h-3 rounded-sm bg-[#E7F7EF] border border-[#C3E9D4] inline-block" />
          Zona Target
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-[#697079]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1E9E62] inline-block" />
          Sesuai
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-[#697079]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D99100] inline-block" />
          Perlu Perhatian
        </span>
      </div>
    </div>
  )
}
