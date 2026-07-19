"use client"

import React from 'react'
import {
  Calendar, Clock, ChevronRight,
  Check, AlertTriangle, Flame, BookOpen,
  CheckSquare, User, RefreshCw, TrendingUp
} from 'lucide-react'
import Link from 'next/link'
import { BBChart } from '@/components/ibu/bb-chart'
import { IbuNotificationBell, type IbuNotifItem } from '@/components/ibu/notification-bell'
import type { PregnancyProfileData, PregnancyVisitData } from '@/lib/growth-standards/imt-calc'
import type { getIbuNotifications } from '@/lib/actions/notifikasi'

type RiskLevel = 'rendah' | 'sedang' | 'tinggi'

function computeRiskLevel(lila: number, hb: number, isOnTrack: boolean | null): RiskLevel {
  if (lila < 23.5 || hb < 11) return 'tinggi'
  if (isOnTrack === false) return 'sedang'
  return 'rendah'
}

const STATUS_MESSAGES: Record<RiskLevel, {
  bg: string; border: string; iconBg: string; textColor: string;
  Icon: React.ElementType; label: string; message: string;
}> = {
  rendah: {
    bg: 'bg-[#E7F7EF]', border: 'border-[#C3E9D4]',
    iconBg: 'bg-[#1E9E62]', textColor: 'text-[#0E6B3E]',
    Icon: Check,
    label: 'Status Aman',
    message: 'Saat ini, Bunda berada di Status Aman! Kondisi yang sangat ideal untuk tumbuh kembang janin. Pertahankan, ya!',
  },
  sedang: {
    bg: 'bg-[#FFF7E6]', border: 'border-[#F4E2BC]',
    iconBg: 'bg-[#D99100]', textColor: 'text-[#8A6100]',
    Icon: AlertTriangle,
    label: 'Perlu Perhatian',
    message: 'Kenaikan BB Bunda perlu lebih diperhatikan. Waktunya fokus pada asupan nutrisi harian, jangan lupa makan ekstra protein hewani, ya Bunda.',
  },
  tinggi: {
    bg: 'bg-[#FEF1F1]', border: 'border-[#F6D2D2]',
    iconBg: 'bg-[#DC2626]', textColor: 'text-[#9F1C1C]',
    Icon: Flame,
    label: 'Risiko Tinggi',
    message: 'Saat ini, Bunda berada di Status Risiko Tinggi. Jangan ditunda, mari jadwalkan periksa ke fasilitas kesehatan terdekat untuk penanganan yang tepat!',
  },
}

function formatDateShort(date: Date | string): string {
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short',
  })
}

interface PregnancyDashboardViewProps {
  data: {
    nama: string
    isPregnant: boolean
    pregnancyData: {
      weeksPregnant: number
      dueDate: string
      trimester: number
      daysRemaining: number
      riskStatus: string
      riskScore: number
      lila: number
      hb: number
      bbGain: number
      isOnTrack: boolean | null
      targetGainMin: number | null
      targetGainMax: number | null
    } | null
  }
  score: number
  doneCount: number
  profile: PregnancyProfileData | null
  visits: PregnancyVisitData[]
  notifications?: Awaited<ReturnType<typeof getIbuNotifications>>
}

export default function PregnancyDashboardView({ data, score, doneCount, profile, visits, notifications = [] }: PregnancyDashboardViewProps) {
  const { pregnancyData } = data
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - score / 100)

  if (!pregnancyData) return null

  const notifItems: IbuNotifItem[] = notifications.map((n) => ({
    level: n.level as IbuNotifItem['level'],
    title: n.judul,
    message: n.pesan,
    actionLabel: n.actionLabel,
    actionUrl: n.actionUrl,
  }))
  const currentRiskLevel = computeRiskLevel(pregnancyData.lila, pregnancyData.hb, pregnancyData.isOnTrack)
  if (currentRiskLevel !== 'rendah') {
    const s = STATUS_MESSAGES[currentRiskLevel]
    notifItems.push({
      level: currentRiskLevel === 'tinggi' ? 'merah' : 'kuning',
      title: s.label,
      message: s.message,
      actionLabel: 'Lihat Detail',
      actionUrl: '/ibu/status',
    })
  }
  for (const v of visits) {
    if (v.catatanKader) {
      notifItems.push({
        level: 'info',
        title: `Catatan pemeriksaan ${formatDateShort(v.visitDate)}`,
        message: v.catatanKader,
        actionLabel: 'Lihat Riwayat',
        actionUrl: '/ibu/status',
      })
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar scroll-smooth">
      {/* Header Greeting */}
      <header className="shrink-0 px-5 pt-[6px] pb-4 bg-gradient-to-b from-white to-[#F1F7FE] rounded-b-[24px] shadow-[0_6px_16px_-10px_rgba(17,120,212,0.4)] z-[5]">
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-[46px] h-[46px] rounded-[15px] overflow-hidden bg-gradient-to-br from-[#3B93E6] to-[#1178D4] flex items-end justify-center shadow-[0_6px_14px_-6px_rgba(17,120,212,0.6)]">
            <User className="w-[34px] h-[34px] text-white/95" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[20px] font-bold text-[#1F2937] tracking-tight leading-tight">Halo, Bunda {data.nama}!</h1>
            <p className="text-[14px] font-medium text-[#697079] mt-[4px] leading-[1.4]">
              Hari ini usia kandunganmu <b className="text-[#1178D4] font-bold">{pregnancyData.weeksPregnant} minggu</b>. Yuk, berikan si kecil yang terbaik hari ini.
            </p>
          </div>
          <IbuNotificationBell items={notifItems} />
        </div>
      </header>

      {/* Content Area */}
      <main className="px-5 pt-4 pb-[108px]">
        {/* HERO: pregnancy summary */}
        <section className="relative rounded-[22px] p-5 overflow-hidden text-white bg-gradient-to-br from-[#2B93E6] via-[#1178D4] to-[#0A487F] shadow-[0_16px_34px_-16px_rgba(17,120,212,0.6)] isolate">
          <div className="absolute -right-[30px] -bottom-[60px] w-[190px] h-[190px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.16),transparent_68%)] -z-10" />
          <div className="absolute -left-[40px] -top-[50px] w-[130px] h-[130px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.1),transparent_70%)] -z-10" />
          
          <span className="relative inline-flex items-center gap-1.5 bg-white/20 border border-white/30 px-3 py-1 rounded-full text-[12px] font-semibold">
            <Flame className="w-[13px] h-[13px]" />
            {pregnancyData.trimester > 0 ? `Trimester ${pregnancyData.trimester} · Sedang Berjalan` : 'Trimester — · Belum Ada Data'}
          </span>
          <div className="flex items-end gap-2 mt-3">
            <span className="text-[52px] font-bold leading-[0.9] tracking-tighter">{pregnancyData.weeksPregnant > 0 ? pregnancyData.weeksPregnant : '—'}</span>
            <span className="text-[17px] font-medium opacity-90 pb-1.5">Minggu Kehamilan</span>
          </div>
          <p className="text-[13px] font-normal opacity-85 mt-2 max-w-[230px] leading-relaxed">
            {pregnancyData.weeksPregnant > 0 ? 'Si kecil kini sebesar buah jagung — mulai bisa mendengar suara Bunda.' : 'Minta bidan atau kader untuk mencatat HPHT Anda.'}
          </p>
          
          <div className="flex gap-2.5 mt-4">
            <div className="flex-1 bg-white/10 border border-white/20 rounded-[14px] p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-medium opacity-85">
                <Calendar className="w-[13px] h-[13px]" />
                Perkiraan Lahir
              </div>
              <div className="text-[18px] font-bold mt-1 tracking-tight">
                {pregnancyData.dueDate === "—" ? "—" : (
                  <>
                    {pregnancyData.dueDate.split(' ')[0]} {pregnancyData.dueDate.split(' ')[1]}<small className="text-[12px] font-medium opacity-85 ml-1"> {pregnancyData.dueDate.split(' ')[2]}</small>
                  </>
                )}
              </div>
            </div>
            <div className="flex-1 bg-white/10 border border-white/20 rounded-[14px] p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-medium opacity-85">
                <Clock className="w-[13px] h-[13px]" />
                Hitung Mundur
              </div>
              <div className="text-[18px] font-bold mt-1 tracking-tight">
                {pregnancyData.dueDate === "—" ? "—" : pregnancyData.daysRemaining}<small className="text-[12px] font-medium opacity-85 ml-1">{pregnancyData.dueDate === "—" ? "" : " hari lagi"}</small>
              </div>
            </div>
          </div>
          
          <div className="mt-3.5">
            <div className="flex justify-between text-[11px] font-medium opacity-80 mb-1.5">
              <span>Perjalanan kehamilan</span>
              <span>{pregnancyData.weeksPregnant > 0 ? `${Math.min(100, Math.round((pregnancyData.weeksPregnant / 40) * 100))}%` : '—'}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full bg-white transition-all duration-500" style={{ width: pregnancyData.weeksPregnant > 0 ? `${Math.min(100, Math.round((pregnancyData.weeksPregnant / 40) * 100))}%` : '0%' }} />
            </div>
          </div>
        </section>

        {/* SCORE */}
        <div className="flex items-center justify-between mt-5 mb-2.5 px-0.5">
          <h2 className="text-[15px] font-semibold text-[#1F2937]">Skor Aktif Harian</h2>
          <Link href="/ibu/tugas" className="text-[12px] font-semibold text-[#1178D4] flex items-center gap-0.5">
            Lihat Tugas <ChevronRight className="w-[13px] h-[13px]" strokeWidth={2.4} />
          </Link>
        </div>
        <section className="bg-white border border-[#E4EDE7] rounded-[18px] p-4 shadow-[0_4px_14px_-8px_rgba(9,30,66,0.12)] flex items-center gap-4">
          <div className="shrink-0 relative w-[84px] h-[84px]">
            <svg width="84" height="84" viewBox="0 0 84 84" className="-rotate-90">
              <circle cx="42" cy="42" r="36" fill="none" stroke="#E7F2FB" strokeWidth="8" />
              <circle 
                cx="42" cy="42" r="36" fill="none" stroke="#1178D4" strokeWidth="8" 
                strokeLinecap="round" strokeDasharray={circumference} 
                strokeDashoffset={offset}
                className="transition-[stroke-dashoffset] duration-700 ease-in-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[23px] font-bold text-[#0A487F] leading-none tracking-tight">{score}</span>
              <span className="text-[10px] font-medium text-[#697079] mt-0.5">/100</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium text-[#697079]">Kepatuhan tugas hari ini</div>
            <div className="text-[15px] font-semibold text-[#1F2937] mt-0.5 leading-tight">
              <b className="text-[#1178D4] font-bold">{doneCount}</b> dari 6 tugas selesai
            </div>
            <Link
              href="/ibu/tugas"
              className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-2 rounded-[10px] bg-[#1178D4] text-white text-[13px] font-semibold shadow-[0_6px_14px_-7px_rgba(17,120,212,0.7)] active:bg-[#0F6CBF] transition-colors"
            >
              Lihat Tugas Harian <ChevronRight className="w-[13px] h-[13px]" strokeWidth={2.4} />
            </Link>
          </div>
        </section>

        {/* RISK */}
        <div className="flex items-center justify-between mt-5 mb-2.5 px-0.5">
          <h2 className="text-[15px] font-semibold text-[#1F2937]">Indikator Risiko Stunting</h2>
        </div>
        <section className="bg-white border border-[#E4EDE7] rounded-[18px] p-4 shadow-[0_4px_14px_-8px_rgba(9,30,66,0.12)]">
          <div className="mt-1">
            <div className="relative h-[11px] rounded-full bg-gradient-to-r from-[#1E9E62] from-33% via-[#F2B705] via-66% to-[#E0524E]">
              {(() => {
                const level = computeRiskLevel(pregnancyData.lila, pregnancyData.hb, pregnancyData.isOnTrack)
                const pos = { rendah: '16%', sedang: '50%', tinggi: '83%' }[level]
                const color = { rendah: '#1E9E62', sedang: '#F2B705', tinggi: '#E0524E' }[level]
                return (
                  <span
                    className="absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full bg-white shadow-[0_3px_8px_rgba(9,30,66,0.3)] transition-all duration-500"
                    style={{ left: pos, borderWidth: '3px', borderStyle: 'solid', borderColor: color }}
                  />
                )
              })()}
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[11px] font-semibold text-[#1E9E62] flex items-center gap-1 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-current">Aman</span>
              <span className="text-[11px] font-semibold text-[#B07B00] flex items-center gap-1 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#F2B705]">Perlu Perhatian</span>
              <span className="text-[11px] font-semibold text-[#C0322E] flex items-center gap-1 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#E0524E]">Risiko Tinggi</span>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <div className="flex-1 bg-[#F1F7FE] border border-[#E4EDE7] rounded-[13px] p-2.5 text-center">
              <div className="text-[11px] font-medium text-[#697079]">LILA</div>
              <div className="text-[17px] font-bold text-[#1F2937] mt-1 tracking-tight leading-none">{pregnancyData.lila}<small className="text-[10px] font-medium text-[#697079] ml-0.5"> cm</small></div>
              <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-[#E7F7EF] text-[#1E9E62] text-[10px] font-bold">Normal</span>
            </div>
            <div className="flex-1 bg-[#F1F7FE] border border-[#E4EDE7] rounded-[13px] p-2.5 text-center">
              <div className="text-[11px] font-medium text-[#697079]">Hb</div>
              <div className="text-[17px] font-bold text-[#1F2937] mt-1 tracking-tight leading-none">{pregnancyData.hb}<small className="text-[10px] font-medium text-[#697079] ml-0.5"> g/dL</small></div>
              <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-[#E7F7EF] text-[#1E9E62] text-[10px] font-bold">Normal</span>
            </div>
            <div className="flex-1 bg-[#F1F7FE] border border-[#E4EDE7] rounded-[13px] p-2.5 text-center">
              <div className="text-[11px] font-medium text-[#697079]">Kenaikan BB</div>
              <div className="text-[17px] font-bold text-[#1F2937] mt-1 tracking-tight leading-none">
                +{pregnancyData.bbGain}<small className="text-[10px] font-medium text-[#697079] ml-0.5"> kg</small>
              </div>
              {pregnancyData.targetGainMin != null && (
                <div className="text-[10px] text-[#697079] mt-0.5 leading-tight">
                  dari {pregnancyData.targetGainMin}–{pregnancyData.targetGainMax} kg
                </div>
              )}
              <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                pregnancyData.isOnTrack === false
                  ? 'bg-[#FFF7E6] text-[#8A6100]'
                  : 'bg-[#E7F7EF] text-[#1E9E62]'
              }`}>
                {pregnancyData.isOnTrack === false ? 'Perlu Perhatian' : 'Sesuai'}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2.5 mt-4">
            <span className="flex items-center gap-1.5 text-[11px] text-[#989DA3] font-normal leading-tight max-w-[135px]">
              <RefreshCw className="w-3 h-3 shrink-0" />
              Data diperbarui setiap kunjungan rutin.
            </span>
            <Link href="/ibu/status" className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[13px] bg-gradient-to-br from-[#2B93E6] to-[#1178D4] text-white text-[14px] font-semibold shadow-[0_10px_20px_-8px_rgba(17,120,212,0.7)] active:scale-95 transition-all">
              Lihat Perkembangan BB <ChevronRight className="w-4 h-4" strokeWidth={2.2} />
            </Link>
          </div>
        </section>

        {/* BB CHART */}
        {profile && visits.length > 0 && (
          <>
            <div className="flex items-center justify-between mt-5 mb-2.5 px-0.5">
              <h2 className="text-[15px] font-semibold text-[#1F2937]">Grafik Berat Badan</h2>
              <Link href="/ibu/status" className="text-[12px] font-semibold text-[#1178D4] flex items-center gap-0.5">
                Lihat Status <ChevronRight className="w-[13px] h-[13px]" strokeWidth={2.4} />
              </Link>
            </div>
            <section className="bg-white border border-[#E4EDE7] rounded-[18px] p-4 shadow-[0_4px_14px_-8px_rgba(9,30,66,0.12)]">
              <div className="flex items-end justify-between gap-2.5 mb-2.5">
                <div className="text-[22px] font-bold text-[#1F2937] tracking-tight leading-none">
                  <span className="block text-[10px] font-medium text-[#697079] mb-1">Berat badan sekarang</span>
                  {visits[0].currentWeightKg}<small className="text-[11px] font-medium text-[#697079]"> kg</small>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1E9E62] bg-[#E7F7EF] border border-[#C3E9D4] px-2.5 py-1 rounded-full">
                  <TrendingUp className="w-3 h-3" />
                  +{visits[0].weightGainKg} kg dari awal
                </span>
              </div>
              <div className="w-full">
                <BBChart profile={profile} visits={visits} />
              </div>
              <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-[#E4EDE7] text-[10.5px] text-[#697079] font-medium leading-[1.4] text-pretty">
                <Check className="w-[14px] h-[14px] shrink-0 text-[#1E9E62]" />
                Pantau terus kenaikan BB Anda setiap kunjungan ke Posyandu.
              </div>
            </section>
          </>
        )}

        {/* VISIT HISTORY */}
        {visits.length > 0 && (
          <>
            <div className="flex items-center justify-between mt-5 mb-2.5 px-0.5">
              <h2 className="text-[15px] font-semibold text-[#1F2937]">Riwayat Kunjungan</h2>
            </div>
            <section className="bg-white border border-[#E4EDE7] rounded-[18px] px-4 py-1 shadow-[0_4px_14px_-8px_rgba(9,30,66,0.12)]">
              {visits.map((v, i) => {
                const isBad = v.lilaCm < 23.5 || v.hbGdl < 11;
                const badgeLabel = isBad ? 'Risiko Tinggi' : (v.isOnTrack ? 'Sesuai Target' : 'Perlu Perhatian');
                const badgeClass = isBad 
                  ? 'bg-[#FEF1F1] text-[#9F1C1C]' 
                  : (v.isOnTrack ? 'bg-[#E7F7EF] text-[#1E9E62]' : 'bg-[#FFF7E6] text-[#A77400]');

                const vDate = new Date(v.visitDate);
                const day = vDate.getDate().toString().padStart(2, '0');
                const month = vDate.toLocaleDateString('id-ID', { month: 'short' });

                return (
                  <div key={v.id} className="flex items-center gap-3 py-3 border-b border-[#E4EDE7] last:border-b-0">
                    <div className="shrink-0 w-10 text-center">
                      <div className="text-[16px] font-bold text-[#1F2937] leading-none">{day}</div>
                      <div className="text-[9px] font-semibold text-[#697079] uppercase mt-0.5">{month}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-[#1F2937]">{v.currentWeightKg} kg</div>
                      <div className="text-[10.5px] font-medium text-[#697079] mt-0.5">
                        +{v.weightGainKg} kg dari awal
                      </div>
                    </div>
                    <span className={`shrink-0 text-[9px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${badgeClass}`}>
                      {badgeLabel}
                    </span>
                  </div>
                )
              })}
            </section>
          </>
        )}

        {/* STATUS NOTIF */}
        {(() => {
          const currentLevel = computeRiskLevel(pregnancyData.lila, pregnancyData.hb, pregnancyData.isOnTrack)
          const s = STATUS_MESSAGES[currentLevel]
          return (
            <>
              <div className="flex items-center justify-between mt-5 mb-2.5 px-0.5">
                <h2 className="text-[15px] font-semibold text-[#1F2937]">Status Kesehatanmu</h2>
              </div>
              <div className={`flex gap-3 items-start p-4 rounded-[18px] border ${s.border} ${s.bg} shadow-[0_4px_14px_-8px_rgba(9,30,66,0.10)]`}>
                <div className={`shrink-0 w-[38px] h-[38px] rounded-[12px] ${s.iconBg} flex items-center justify-center shadow-[0_4px_10px_-4px_rgba(9,30,66,0.25)]`}>
                  <s.Icon className="w-[20px] h-[20px] text-white" strokeWidth={2.2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-[13px] font-bold ${s.textColor} leading-tight flex items-center gap-2`}>
                    {s.label}
                    <span className={`text-[8px] font-bold tracking-widest px-2 py-0.5 rounded-full bg-white/70 ${s.textColor}`}>SAAT INI</span>
                  </div>
                  <div className="text-[12px] font-normal text-[#4C545F] mt-1.5 leading-[1.55] text-pretty">
                    {s.message}
                  </div>
                </div>
              </div>
            </>
          )
        })()}

        {/* SHORTCUTS */}
        <div className="flex items-center justify-between mt-5 mb-2.5 px-0.5">
          <h2 className="text-[15px] font-semibold text-[#1F2937]">Pintasan</h2>
        </div>
        <div className="flex gap-3">
          <Link href="/ibu/edukasi" className="flex-1 bg-white border border-[#E4EDE7] rounded-[16px] p-3.5 shadow-[0_4px_12px_-8px_rgba(9,30,66,0.14)] active:translate-y-0.5 transition-all">
            <div className="w-[38px] h-[38px] rounded-[12px] bg-[#E7F2FB] text-[#1178D4] flex items-center justify-center mb-2.5">
              <BookOpen className="w-[21px] h-[21px]" strokeWidth={1.8} />
            </div>
            <div className="text-[14px] font-semibold text-[#1F2937] leading-tight">Edukasi</div>
            <div className="text-[12px] font-normal text-[#697079] mt-1 leading-snug">
              {pregnancyData.trimester > 0 ? `Materi Trimester ${pregnancyData.trimester} untukmu` : 'Materi edukasi kehamilan'}
            </div>
            <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold text-[#1178D4]">
              Buka <ChevronRight className="w-3 h-3" strokeWidth={2.4} />
            </span>
          </Link>
          <Link href="/ibu/tugas" className="flex-1 bg-white border border-[#E4EDE7] rounded-[16px] p-3.5 shadow-[0_4px_12px_-8px_rgba(9,30,66,0.14)] active:translate-y-0.5 transition-all">
            <div className="w-[38px] h-[38px] rounded-[12px] bg-[#EAF6EF] text-[#1E9E62] flex items-center justify-center mb-2.5">
              <CheckSquare className="w-[21px] h-[21px]" strokeWidth={1.8} />
            </div>
            <div className="text-[14px] font-semibold text-[#1F2937] leading-tight">Tugas Harian</div>
            <div className="text-[12px] font-normal text-[#697079] mt-1 leading-snug">
              {6 - doneCount === 0 ? 'Semua tugas selesai 🎉' : `${6 - doneCount} tugas belum selesai`}
            </div>
            <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold text-[#1178D4]">
              Buka <ChevronRight className="w-3 h-3" strokeWidth={2.4} />
            </span>
          </Link>
        </div>
      </main>
    </div>
  )
}
