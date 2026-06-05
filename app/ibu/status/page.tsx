"use client"

import { useEffect, useState } from 'react'
import { TrendingUp, Calendar } from 'lucide-react'
import { getPregnancyProfile, getPregnancyVisits } from '@/lib/actions/pregnancy'
import { BBChart } from '@/components/ibu/bb-chart'
import type { PregnancyProfileData, PregnancyVisitData } from '@/lib/growth-standards/imt-calc'

const IMT_LABELS: Record<string, string> = {
  underweight: 'Underweight',
  normal: 'Normal',
  overweight: 'Overweight',
  obese: 'Obese',
}

const IMT_COLORS: Record<string, { bg: string; text: string }> = {
  underweight: { bg: 'bg-[#E7F2FB]', text: 'text-[#0A487F]' },
  normal:      { bg: 'bg-[#E7F7EF]', text: 'text-[#0E6B3E]' },
  overweight:  { bg: 'bg-[#FFF7E6]', text: 'text-[#8A6100]' },
  obese:       { bg: 'bg-[#FFF7E6]', text: 'text-[#8A6100]' },
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function getRiskBadge(visit: PregnancyVisitData) {
  if (visit.lilaCm < 23.5 || visit.hbGdl < 11) {
    return { label: 'Risiko Tinggi', bg: 'bg-[#FEF1F1]', text: 'text-[#9F1C1C]' }
  }
  if (!visit.isOnTrack) {
    return { label: 'Perlu Perhatian', bg: 'bg-[#FFF7E6]', text: 'text-[#8A6100]' }
  }
  return { label: 'Sesuai Target', bg: 'bg-[#E7F7EF]', text: 'text-[#0E6B3E]' }
}

export default function PerkembanganBBPage() {
  const [profile, setProfile] = useState<PregnancyProfileData | null>(null)
  const [visits, setVisits] = useState<PregnancyVisitData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    Promise.all([getPregnancyProfile(), getPregnancyVisits()]).then(([p, v]) => {
      if (!mounted) return
      setProfile(p)
      setVisits(v)
      setLoading(false)
    })
    return () => { mounted = false }
  }, [])

  if (loading) {
    return <div className="flex-1 flex items-center justify-center bg-white">Loading...</div>
  }

  const lastVisit = visits[0] ?? null
  const riskBadge = lastVisit ? getRiskBadge(lastVisit) : null

  return (
    <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar scroll-smooth">
      {/* Header */}
      <header className="shrink-0 px-[22px] pt-[6px] pb-4 bg-gradient-to-b from-white to-[#F1F7FE] rounded-b-[24px] shadow-[0_6px_16px_-10px_rgba(17,120,212,0.4)] z-[5]">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-[13px] h-[13px] text-[#1178D4]" strokeWidth={2} />
          <span className="text-[11px] font-medium text-[#1178D4]">Pantau Kehamilan</span>
        </div>
        <h1 className="text-[22px] font-semibold text-[#1F2937] tracking-tight leading-tight">
          Perkembangan Berat Badan
        </h1>
        <p className="text-[11.5px] text-[#697079] mt-1 leading-[1.4] max-w-[290px]">
          Pantau kenaikan BB-mu sesuai target kehamilan
        </p>
      </header>

      <main className="px-5 pt-4 pb-[108px] flex flex-col gap-4">

        {/* Section 1: Profil IMT */}
        <div>
          <h2 className="text-[14px] font-semibold text-[#1F2937] mb-2.5 px-0.5">Profil IMT</h2>
          {profile ? (
            <section className="bg-white border border-[#E4EDE7] rounded-[18px] p-4 shadow-[0_4px_14px_-8px_rgba(9,30,66,0.12)]">
              <div className="flex gap-2 mb-3">
                {[
                  { label: 'BB Pra-hamil', value: `${profile.bbPrepregnancyKg}`, unit: 'kg' },
                  { label: 'Tinggi', value: `${profile.heightCm}`, unit: 'cm' },
                  { label: 'IMT', value: profile.imtPrepregnancy.toFixed(1), unit: '' },
                ].map(({ label, value, unit }) => (
                  <div key={label} className="flex-1 bg-[#F4F7FA] rounded-[12px] p-2.5 text-center">
                    <div className="text-[9.5px] text-[#697079] font-medium">{label}</div>
                    <div className="text-[16px] font-bold text-[#1F2937] mt-0.5 leading-none">
                      {value}<small className="text-[9px] font-medium text-[#697079]"> {unit}</small>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[9.5px] text-[#697079] font-medium mb-1">Kategori</div>
                  <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold ${IMT_COLORS[profile.imtCategory]?.bg} ${IMT_COLORS[profile.imtCategory]?.text}`}>
                    {IMT_LABELS[profile.imtCategory] ?? profile.imtCategory}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-[9.5px] text-[#697079] font-medium mb-0.5">Target Kenaikan Total</div>
                  <div className="text-[15px] font-bold text-[#1178D4]">
                    {profile.targetGainMinKg}–{profile.targetGainMaxKg} kg
                  </div>
                  <div className="text-[9.5px] text-[#697079]">
                    {profile.weeklyGainMinKg}–{profile.weeklyGainMaxKg} kg/minggu
                  </div>
                </div>
              </div>
              <p className="text-[9px] text-[#989DA3] mt-3 flex items-center gap-1">
                📌 Dihitung sekali di awal kehamilan · Tidak berubah
              </p>
            </section>
          ) : (
            <div className="bg-[#F4F7FA] border border-[#DCE6EF] rounded-[18px] p-5 text-center">
              <p className="text-[12px] text-[#697079]">
                Data profil kehamilan belum tersedia. Kader akan mengisi saat kunjungan pertama.
              </p>
            </div>
          )}
        </div>

        {/* Section 2: Kunjungan Terakhir */}
        <div>
          <h2 className="text-[14px] font-semibold text-[#1F2937] mb-2.5 px-0.5">Kunjungan Terakhir</h2>
          {lastVisit ? (
            <section className="bg-white border border-[#E4EDE7] rounded-[18px] p-4 shadow-[0_4px_14px_-8px_rgba(9,30,66,0.12)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-[#697079] flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  {formatDate(lastVisit.visitDate)}
                </span>
                {riskBadge && (
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${riskBadge.bg} ${riskBadge.text}`}>
                    {riskBadge.label}
                  </span>
                )}
              </div>
              <div className="flex gap-2 mb-3">
                <div className="flex-1 bg-[#F4F7FA] rounded-[12px] p-3 text-center">
                  <div className="text-[9.5px] text-[#697079] font-medium">BB Sekarang</div>
                  <div className="text-[18px] font-bold text-[#1F2937] mt-0.5 leading-none">
                    {lastVisit.currentWeightKg}<small className="text-[9px] font-medium text-[#697079]"> kg</small>
                  </div>
                </div>
                <div className="flex-1 bg-[#F4F7FA] rounded-[12px] p-3 text-center">
                  <div className="text-[9.5px] text-[#697079] font-medium">Kenaikan Total</div>
                  <div className="text-[18px] font-bold text-[#1178D4] mt-0.5 leading-none">
                    +{lastVisit.weightGainKg}<small className="text-[9px] font-medium text-[#697079]"> kg</small>
                  </div>
                  {profile && (
                    <div className="text-[8px] text-[#697079] mt-0.5">
                      target {profile.targetGainMinKg}–{profile.targetGainMaxKg} kg
                    </div>
                  )}
                </div>
              </div>
              <div className="border-t border-[#E4EDE7] pt-3 flex gap-3">
                {[
                  {
                    label: 'LILA', value: lastVisit.lilaCm, unit: 'cm',
                    ok: lastVisit.lilaCm >= 23.5, okLabel: 'Normal', badLabel: 'KEK',
                  },
                  {
                    label: 'Hb', value: lastVisit.hbGdl, unit: 'g/dL',
                    ok: lastVisit.hbGdl >= 11, okLabel: 'Normal', badLabel: 'Anemia',
                  },
                ].map(({ label, value, unit, ok, okLabel, badLabel }) => (
                  <div key={label} className="flex-1 text-center">
                    <div className="text-[9.5px] text-[#697079] font-medium">{label}</div>
                    <div className="text-[14px] font-bold text-[#1F2937] mt-0.5">
                      {value}<small className="text-[9px] font-medium text-[#697079]"> {unit}</small>
                    </div>
                    <span className={`inline-block text-[8.5px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                      ok ? 'bg-[#E7F7EF] text-[#1E9E62]' : 'bg-[#FEF1F1] text-[#9F1C1C]'
                    }`}>
                      {ok ? okLabel : badLabel}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <div className="bg-[#F4F7FA] border border-[#DCE6EF] rounded-[18px] p-5 text-center">
              <p className="text-[12px] text-[#697079]">
                Belum ada data kunjungan. Kader akan mengisi saat kunjungan posyandu berikutnya.
              </p>
            </div>
          )}
        </div>

        {/* Section 3: Grafik BB */}
        {profile && (
          <div>
            <h2 className="text-[14px] font-semibold text-[#1F2937] mb-2.5 px-0.5">Grafik Berat Badan</h2>
            <BBChart profile={profile} visits={visits} />
          </div>
        )}

        {/* Section 4: Riwayat Kunjungan */}
        {visits.length > 0 && (
          <div>
            <h2 className="text-[14px] font-semibold text-[#1F2937] mb-2.5 px-0.5">Riwayat Kunjungan</h2>
            <div className="flex flex-col gap-2.5">
              {visits.map(v => {
                const badge = getRiskBadge(v)
                return (
                  <div
                    key={v.id}
                    className="bg-white border border-[#E4EDE7] rounded-[14px] px-4 py-3 shadow-[0_2px_8px_-6px_rgba(9,30,66,0.12)] flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[10.5px] text-[#697079] font-medium">{formatDate(v.visitDate)}</div>
                      <div className="text-[13px] font-semibold text-[#1F2937] mt-0.5">
                        {v.currentWeightKg} kg{' '}
                        <span className="text-[#1178D4]">+{v.weightGainKg} kg</span>
                      </div>
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
