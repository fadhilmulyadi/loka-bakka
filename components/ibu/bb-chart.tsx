'use client'

import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  getIOMTargets, getExpectedGainRange, TERM_WEEK,
  type PregnancyProfileData, type PregnancyVisitData,
} from '@/lib/growth-standards/imt-calc'
import { calculateGestationalAge } from '@/lib/pregnancy-utils'

interface BBChartProps {
  // Sengaja dipersempit ke field yang benar-benar dipakai, supaya baris mentah
  // dari DB (halaman kader) bisa dioper langsung tanpa dibentuk ulang.
  profile: Pick<PregnancyProfileData, 'hpht' | 'jumlahJanin' | 'imtCategory' | 'bbPrepregnancyKg'>
  visits: Pick<PregnancyVisitData, 'visitDate' | 'currentWeightKg'>[]
  nama: string
}

interface ChartRow {
  week: number
  zoneMin: number
  zoneSpan: number
  zoneMid: number
  weight?: number
}

const kg = (n: number) => n.toFixed(1).replace('.', ',')

function BBTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ payload: ChartRow }>
  label?: number
}) {
  if (!active || !payload || payload.length === 0) return null
  const row = payload[0].payload
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[11px] shadow-sm">
      <p className="font-semibold text-[#173753] mb-1">Minggu ke-{label}</p>
      <p className="text-muted-foreground">
        Target BB: {kg(row.zoneMin)}–{kg(row.zoneMin + row.zoneSpan)} kg
      </p>
      {row.weight != null && (
        <p className="font-medium text-[#6A48C4]">BB ibu: {kg(row.weight)} kg</p>
      )}
    </div>
  )
}

export function BBChart({ profile, visits, nama }: BBChartProps) {
  if (visits.length === 0) {
    return (
      <p className="text-[12px] text-[#697079] text-center py-10">
        Data akan muncul setelah kunjungan pertama tercatat.
      </p>
    )
  }

  const hpht = new Date(profile.hpht)
  const targets = getIOMTargets(profile.imtCategory, profile.jumlahJanin)

  // Titik BB aktual dipetakan ke usia kandungan saat kunjungan, bukan ke tanggal,
  // supaya sejajar dengan zona target yang juga berbasis minggu.
  const byWeek = new Map<number, number>()
  for (const v of visits) {
    const w = Math.max(0, Math.min(calculateGestationalAge(hpht, new Date(v.visitDate)), TERM_WEEK))
    byWeek.set(w, v.currentWeightKg)
  }

  const data: ChartRow[] = Array.from({ length: TERM_WEEK + 1 }, (_, week) => {
    const range = getExpectedGainRange(week, targets)
    const zoneMin = profile.bbPrepregnancyKg + range.minKg
    const zoneSpan = range.maxKg - range.minKg
    return {
      week,
      zoneMin,
      zoneSpan,
      zoneMid: zoneMin + zoneSpan / 2,
      weight: byWeek.get(week),
    }
  })

  const weights = [...byWeek.values()]
  const yMin = Math.floor(Math.min(...weights, data[0].zoneMin))
  const yMax = Math.ceil(Math.max(...weights, data[TERM_WEEK].zoneMin + data[TERM_WEEK].zoneSpan))

  return (
    <div>
      <div className="flex items-center justify-end gap-3 flex-wrap mb-3 text-[11px]">
        <span className="flex items-center gap-1.5 font-medium text-[#173753]">
          <span className="w-3 h-3 rounded-sm bg-[#F0EBFB] border border-[#D9CCF3] inline-block" />
          Rentang anjuran IOM
        </span>
        <span className="flex items-center gap-1.5 font-medium text-[#173753]">
          <span className="w-3 h-0.5 border-t-2 border-dashed border-[#C3B0E6] inline-block" />
          Titik tengah
        </span>
        <span className="flex items-center gap-1.5 font-medium text-[#173753]">
          <span className="w-3 h-0.5 bg-[#6A48C4] inline-block" />
          {nama}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="week"
            type="number"
            domain={[0, TERM_WEEK]}
            ticks={[0, 8, 13, 20, 27, 34, 40]}
            tick={{ fontSize: 10, fill: '#697079' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(w) => `${w}mg`}
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 10, fill: '#697079' }}
            tickLine={false}
            axisLine={false}
            width={35}
          />
          <Tooltip content={<BBTooltip />} />
          {/* Dua Area bertumpuk membentuk pita target: alas transparan + tinggi pita. */}
          <Area
            type="monotone"
            dataKey="zoneMin"
            stackId="zona"
            stroke="none"
            fill="none"
            isAnimationActive={false}
            activeDot={false}
          />
          <Area
            type="monotone"
            dataKey="zoneSpan"
            stackId="zona"
            stroke="#D9CCF3"
            strokeWidth={1}
            fill="#F0EBFB"
            fillOpacity={1}
            isAnimationActive={false}
            activeDot={false}
          />
          <Line
            type="monotone"
            dataKey="zoneMid"
            stroke="#C3B0E6"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#6A48C4"
            strokeWidth={2.5}
            connectNulls
            dot={{ r: 4, fill: '#6A48C4', stroke: 'white', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: '#6A48C4', stroke: 'white', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
