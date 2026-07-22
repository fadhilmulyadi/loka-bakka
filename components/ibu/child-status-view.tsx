"use client"

import React, { useState, useEffect } from 'react'
import { Activity, Check, AlertTriangle, Flame, RefreshCw } from 'lucide-react'
import { getIbuAnakDetail } from '@/lib/actions/ibu'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

type AnakDetail = NonNullable<Awaited<ReturnType<typeof getIbuAnakDetail>>>

function getStatusLevel(status: string): 'rendah' | 'sedang' | 'tinggi' {
  if (status === 'Normal') return 'rendah'
  if (status === 'Pra Stunting' || status === 'Gizi Kurang') return 'sedang'
  return 'tinggi'
}

const STATUS_INFO = {
  rendah: {
    label: 'Normal',
    bg: 'bg-[#E7F7EF]', border: 'border-[#C3E9D4]',
    iconBg: 'bg-[#1E9E62]', textColor: 'text-[#0E6B3E]',
    Icon: Check,
  },
  sedang: {
    label: 'Pra Stunting',
    bg: 'bg-[#FFF7E6]', border: 'border-[#F4E2BC]',
    iconBg: 'bg-[#D99100]', textColor: 'text-[#8A6100]',
    Icon: AlertTriangle,
  },
  tinggi: {
    label: 'Stunting',
    bg: 'bg-[#FEF1F1]', border: 'border-[#F6D2D2]',
    iconBg: 'bg-[#DC2626]', textColor: 'text-[#9F1C1C]',
    Icon: Flame,
  },
}

const STATUS_MESSAGES: Record<string, (nama: string) => string> = {
  rendah: (nama) => `Tinggi badan ${nama} sesuai dengan usianya (Normal). Pertumbuhan si kecil terpantau baik. Pertahankan pola makan bergizi dan rutin ke posyandu, ya Bunda!`,
  sedang: (nama) => `Pertumbuhan ${nama} masuk kategori perlu perhatian (gizi kurang / risiko stunting). Tingkatkan asupan protein hewani dan pantau kenaikan berat tiap bulan, ya Bunda.`,
  tinggi: (nama) => `Tinggi badan ${nama} jauh di bawah standar usianya (stunting / gizi buruk). Jangan ditunda, segera konsultasi ke puskesmas untuk penanganan dan program makanan tambahan (PMT).`,
}

export default function ChildStatusView({ childId }: { childId: string }) {
  const [anak, setAnak] = useState<AnakDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setAnak(null)
    setError(false)
    setLoading(true)
    getIbuAnakDetail(childId)
      .then((data) => { if (data) setAnak(data) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [childId])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-[#3B93E6] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error || !anak) return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center bg-white">
      <div className="w-16 h-16 rounded-full bg-[#F1F7FE] flex items-center justify-center mb-4">
        <span className="text-3xl">👶</span>
      </div>
      <h2 className="text-[16px] font-semibold text-[#1F2937]">
        {error ? 'Terjadi kesalahan' : 'Data tidak ditemukan'}
      </h2>
    </div>
  )

  const level = anak.latest ? getStatusLevel(anak.latest.status) : 'rendah'
  const gaugePos = { rendah: '17%', sedang: '50%', tinggi: '83%' }[level]
  const gaugeColor = { rendah: '#1E9E62', sedang: '#F2B705', tinggi: '#E0524E' }[level]
  const s = STATUS_INFO[level]

  const chartData = [...anak.visits].reverse().map((v) => ({
    label: `${v.usiaBulan}bln`,
    bb: v.bb,
    tb: v.tb,
  }))

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 px-6 pt-[6px] pb-4 bg-gradient-to-b from-white to-[#F1F7FE] rounded-b-[24px] shadow-[0_6px_16px_-10px_rgba(17,120,212,0.4)] z-[5]">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#1178D4] bg-[#E7F2FB] px-2.5 py-1 rounded-full mb-2.5">
          <Activity className="w-3 h-3" />
          Pemantauan Tumbuh Kembang
        </span>
        <h1 className="text-[24px] font-semibold text-[#1F2937] leading-tight tracking-tight">Status Anak</h1>
        <p className="mt-1.5 text-[12px] text-[#697079] leading-[1.45] max-w-[310px]">
          Data pertumbuhan <b className="text-[#1178D4]">{anak.nama}</b> dari hasil pengukuran di posyandu.
        </p>
      </header>

      {/* Scrollable body */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-5 pt-4 pb-[108px]">

        {/* Section 1: Indikator risiko */}
        <div className="flex items-center gap-2 mx-0.5 mb-3">
          <span className="flex-none w-5 h-5 rounded-full bg-[#1178D4] text-white text-[11px] font-bold flex items-center justify-center font-mono">1</span>
          <h2 className="text-[14px] font-semibold text-[#1F2937]">Indikator Risiko Stunting</h2>
        </div>
        <section className="bg-white border border-[#E4EDE7] rounded-[18px] p-4 shadow-[0_4px_14px_-8px_rgba(9,30,66,0.12)] mb-4">
          {anak.latest ? (
            <>
              <div className="mt-1">
                <div className="relative h-[11px] rounded-full bg-gradient-to-r from-[#1E9E62] from-33% via-[#F2B705] via-66% to-[#E0524E]">
                  <span
                    className="absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full bg-white shadow-[0_3px_8px_rgba(9,30,66,0.3)] transition-all duration-500"
                    style={{ left: gaugePos, borderWidth: '3px', borderStyle: 'solid', borderColor: gaugeColor }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[11px] font-semibold text-[#1E9E62] flex items-center gap-1 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-current">Aman</span>
                  <span className="text-[11px] font-semibold text-[#B07B00] flex items-center gap-1 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#F2B705]">Pra Stunting</span>
                  <span className="text-[11px] font-semibold text-[#C0322E] flex items-center gap-1 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#E0524E]">Stunting</span>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <div className="flex-1 bg-[#F1F7FE] border border-[#E4EDE7] rounded-[13px] p-2.5 text-center">
                  <div className="text-[11px] font-medium text-[#697079]">Berat Badan</div>
                  <div className="text-[17px] font-bold text-[#1F2937] mt-1 tracking-tight leading-none">
                    {anak.latest.bb.toFixed(1)}<small className="text-[10px] font-medium text-[#697079] ml-0.5"> kg</small>
                  </div>
                </div>
                <div className="flex-1 bg-[#F1F7FE] border border-[#E4EDE7] rounded-[13px] p-2.5 text-center">
                  <div className="text-[11px] font-medium text-[#697079]">Tinggi Badan</div>
                  <div className="text-[17px] font-bold text-[#1F2937] mt-1 tracking-tight leading-none">
                    {anak.latest.tb.toFixed(1)}<small className="text-[10px] font-medium text-[#697079] ml-0.5"> cm</small>
                  </div>
                </div>
                <div className="flex-1 bg-[#F1F7FE] border border-[#E4EDE7] rounded-[13px] p-2.5 text-center">
                  <div className="text-[11px] font-medium text-[#697079]">Z-Score TB/U</div>
                  <div className="text-[17px] font-bold text-[#1F2937] mt-1 tracking-tight leading-none">
                    {anak.latest.zScore}<small className="text-[10px] font-medium text-[#697079] ml-0.5"> SD</small>
                  </div>
                  <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    level === 'rendah' ? 'bg-[#E7F7EF] text-[#1E9E62]' :
                    level === 'sedang' ? 'bg-[#FFF7E6] text-[#8A6100]' :
                    'bg-[#FEF1F1] text-[#9F1C1C]'
                  }`}>
                    {anak.latest.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 mt-3 text-[11px] text-[#989DA3] leading-tight">
                <RefreshCw className="w-3 h-3 shrink-0" />
                Data diperbarui setiap kunjungan posyandu.
              </div>
            </>
          ) : (
            <div className="py-6 text-center">
              <p className="text-[13px] text-[#697079]">Belum ada data pengukuran.</p>
              <p className="text-[11px] text-[#989DA3] mt-1">Data akan muncul setelah kunjungan pertama ke posyandu.</p>
            </div>
          )}
        </section>

        {/* Section 2: Status kondisi */}
        {anak.latest && (
          <>
            <div className="flex items-center gap-2 mx-0.5 mb-3">
              <span className="flex-none w-5 h-5 rounded-full bg-[#1178D4] text-white text-[11px] font-bold flex items-center justify-center font-mono">2</span>
              <h2 className="text-[14px] font-semibold text-[#1F2937]">Status Kondisi Anak</h2>
            </div>
            <div className={`flex gap-3 items-start p-4 rounded-[18px] border ${s.border} ${s.bg} shadow-[0_4px_14px_-8px_rgba(9,30,66,0.10)] mb-4`}>
              <div className={`shrink-0 w-[38px] h-[38px] rounded-[12px] ${s.iconBg} flex items-center justify-center`}>
                <s.Icon className="w-[20px] h-[20px] text-white" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <div className={`text-[13px] font-bold ${s.textColor} leading-tight flex items-center gap-2`}>
                  {s.label}
                  <span className="text-[8px] font-bold tracking-widest px-2 py-0.5 rounded-full bg-white/70 opacity-80">SAAT INI</span>
                </div>
                <div className="text-[12px] font-normal text-[#4C545F] mt-1 leading-[1.55]">
                  {STATUS_MESSAGES[level](anak.nama)}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Section 3: Grafik pertumbuhan */}
        {chartData.length > 0 && (
          <>
            <div className="flex items-center gap-2 mx-0.5 mb-3">
              <span className="flex-none w-5 h-5 rounded-full bg-[#1178D4] text-white text-[11px] font-bold flex items-center justify-center font-mono">3</span>
              <h2 className="text-[14px] font-semibold text-[#1F2937]">Grafik Pertumbuhan</h2>
            </div>
            <section className="bg-white border border-[#E4EDE7] rounded-[18px] p-4 shadow-[0_4px_14px_-8px_rgba(9,30,66,0.12)] mb-4">
              <p className="text-[11px] text-[#697079] mb-3">Berat badan per kunjungan posyandu</p>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="childBBGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1178D4" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#1178D4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f4f8" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#989DA3' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#989DA3' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(value) => [
                        typeof value === 'number' ? `${value.toFixed(1)} kg` : value,
                        'Berat Badan',
                      ]}
                      contentStyle={{ borderRadius: 12, border: '1px solid #E4EDE7', fontSize: 12 }}
                    />
                    <Area
                      type="monotone" dataKey="bb" stroke="#1178D4" strokeWidth={2.5}
                      fill="url(#childBBGrad)"
                      dot={{ r: 4, fill: '#1178D4', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          </>
        )}

        {/* Section 4: Riwayat pengukuran */}
        {anak.visits.length > 0 && (
          <>
            <div className="flex items-center gap-2 mx-0.5 mb-3">
              <span className="flex-none w-5 h-5 rounded-full bg-[#1178D4] text-white text-[11px] font-bold flex items-center justify-center font-mono">4</span>
              <h2 className="text-[14px] font-semibold text-[#1F2937]">Riwayat Pengukuran</h2>
            </div>
            <section className="bg-white border border-[#E4EDE7] rounded-[18px] p-4 shadow-[0_4px_14px_-8px_rgba(9,30,66,0.12)]">
              <div className="flex flex-col gap-2">
                {anak.visits.map((v, i) => {
                  const vLevel = getStatusLevel(v.status)
                  const vColor =
                    vLevel === 'rendah' ? { bg: '#E7F7EF', text: '#1E9E62' } :
                    vLevel === 'sedang' ? { bg: '#FFF7E6', text: '#8A6100' } :
                    { bg: '#FEF1F1', text: '#9F1C1C' }
                  return (
                    <div key={i} className="flex items-center justify-between p-3 bg-[#F8FBFE] border border-[#E4EDE7] rounded-[13px]">
                      <div>
                        <div className="text-[12px] font-semibold text-[#1F2937]">{v.tanggal}</div>
                        <div className="text-[11px] text-[#697079] mt-0.5">
                          {v.usiaBulan} bln · {v.bb.toFixed(1)} kg · {v.tb.toFixed(1)} cm
                        </div>
                      </div>
                      <span
                        className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold"
                        style={{ backgroundColor: vColor.bg, color: vColor.text }}
                      >
                        {v.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
