'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { getStatusStyle } from '@/lib/status-styles'

export interface GrowthPoint {
  usiaBulan: number
  tb: number
  status: string
  tanggal: string
}

// ponytail: tinggi badan saja, sama seperti grafik kader. Berat badan tidak
// dipakai untuk menilai stunting, jadi tidak ada toggle metrik di sini.
export default function GrowthChart({ points }: { points: GrowthPoint[] }) {
  if (points.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-[160px] text-center gap-2">
        <p className="text-[13px] text-[#697079]">Belum cukup data untuk grafik.</p>
        <p className="text-[11px] text-[#989DA3]">Minimal 2 kunjungan diperlukan.</p>
      </div>
    )
  }

  const data = [...points]
    .sort((a, b) => a.usiaBulan - b.usiaBulan)
    .map(p => ({ ...p, label: `${p.usiaBulan} bln` }))

  return (
    <div>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="childTBGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1178D4" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#1178D4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f4f8" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#989DA3' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#989DA3' }} tickLine={false} axisLine={false} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as typeof data[number]
                return (
                  <div style={{ fontSize: 11, borderRadius: 12, border: '1px solid #E4EDE7', background: 'white', padding: '8px 10px' }}>
                    <div style={{ fontWeight: 600, color: '#1F2937', marginBottom: 4 }}>{d.tanggal}</div>
                    <div style={{ color: '#697079' }}>
                      Tinggi Badan: <span style={{ fontWeight: 700, color: '#1F2937' }}>{d.tb.toFixed(1)} cm</span>
                    </div>
                    <div style={{ color: '#697079', marginTop: 2 }}>
                      Status: <span style={{ fontWeight: 600, color: getStatusStyle(d.status).text }}>{d.status}</span>
                    </div>
                  </div>
                )
              }}
            />
            <Area
              type="monotone"
              dataKey="tb"
              stroke="#1178D4"
              strokeWidth={2.5}
              fill="url(#childTBGrad)"
              dot={(props) => {
                const { cx, cy, index } = props as { cx: number; cy: number; index: number }
                return (
                  <circle
                    key={`dot-${index}`}
                    cx={cx}
                    cy={cy}
                    r={4.5}
                    fill={getStatusStyle(data[index]?.status ?? 'Normal').dot}
                    stroke="white"
                    strokeWidth={2}
                  />
                )
              }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-3 mt-2 justify-center flex-wrap">
        {['Normal', 'Pra Stunting', 'Stunting'].map(s => (
          <span key={s} className="flex items-center gap-1.5 text-[10px] text-[#697079]">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: getStatusStyle(s).dot }} />
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}
