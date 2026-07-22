'use client'

import { useState } from 'react'
import {
  ComposedChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer,
} from 'recharts'

interface GrowthChartProps {
  pengukurans: Array<{
    tanggal: string | Date
    beratBadan: number
    tinggiBadan: number
    statusTBU: string
    zScoreTBU: number
  }>
  jenisKelamin: string
}

type MetricView = 'bb' | 'tb'

const STATUS_COLORS: Record<string, string> = {
  'Normal': '#1E9E62',
  'Pra Stunting': '#F2B705',
  'Stunting': '#E0524E',
}

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? '#1E9E62'
}

export default function GrowthChart({ pengukurans }: GrowthChartProps) {
  const [metric, setMetric] = useState<MetricView>('bb')

  if (pengukurans.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-[160px] text-center gap-2">
        <p className="text-[13px] text-[#697079]">Belum cukup data untuk grafik.</p>
        <p className="text-[11px] text-[#989DA3]">Minimal 2 kunjungan diperlukan.</p>
      </div>
    )
  }

  const sorted = [...pengukurans].sort(
    (a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()
  )

  const data = sorted.map(p => ({
    label: new Date(p.tanggal).toLocaleDateString('id-ID', { month: 'short' }),
    value: metric === 'bb' ? p.beratBadan : p.tinggiBadan,
    statusTBU: p.statusTBU,
    tanggal: new Date(p.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
  }))

  return (
    <div>
      {/* Toggle */}
      <div className="flex gap-1 mb-3">
        {(['bb', 'tb'] as MetricView[]).map(m => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`px-3 py-1 rounded-full text-[12px] font-semibold transition-colors ${
              metric === m
                ? 'bg-[#2B93E6] text-white'
                : 'bg-[#F1F7FE] text-[#697079]'
            }`}
          >
            {m === 'bb' ? 'BB (kg)' : 'TB (cm)'}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#697079' }}
            tickLine={false}
            axisLine={false}
            padding={{ left: 10, right: 10 }}
            minTickGap={10}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#697079' }}
            tickLine={false}
            axisLine={false}
            width={35}
          />
          <Tooltip
            contentStyle={{
              fontSize: 11,
              borderRadius: 10,
              border: '1px solid #E4EDE7',
              boxShadow: 'none',
            }}
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null
              const d = payload[0].payload as typeof data[number]
              const unit = metric === 'bb' ? 'kg' : 'cm'
              const label = metric === 'bb' ? 'Berat Badan' : 'Tinggi Badan'
              return (
                <div style={{ fontSize: 11, borderRadius: 10, border: '1px solid #E4EDE7', background: 'white', padding: '8px 10px', boxShadow: 'none' }}>
                  <div style={{ fontWeight: 600, color: '#1F2937', marginBottom: 4 }}>{d.tanggal}</div>
                  <div style={{ color: '#697079' }}>{label}: <span style={{ fontWeight: 700, color: '#1F2937' }}>{d.value} {unit}</span></div>
                  <div style={{ color: '#697079', marginTop: 2 }}>Status: <span style={{ fontWeight: 600, color: getStatusColor(d.statusTBU) }}>{d.statusTBU}</span></div>
                </div>
              )
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2B93E6"
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, index } = props as { cx: number; cy: number; index: number }
              const statusColor = getStatusColor(data[index]?.statusTBU ?? 'Normal')
              return (
                <circle
                  key={`dot-${index}`}
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill={statusColor}
                  stroke="white"
                  strokeWidth={2}
                />
              )
            }}
            activeDot={{ r: 6, fill: '#2B93E6', stroke: 'white', strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-2 justify-center flex-wrap">
        <span className="flex items-center gap-1.5 text-[10px] text-[#697079]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1E9E62] inline-block" />
          Normal
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-[#697079]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F2B705] inline-block" />
          Pra Stunting
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-[#697079]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E0524E] inline-block" />
          Stunting
        </span>
      </div>
    </div>
  )
}
