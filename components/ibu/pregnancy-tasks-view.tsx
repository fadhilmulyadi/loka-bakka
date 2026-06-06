"use client"

import React, { useState, useEffect } from 'react'

const R = 48
const C = 2 * Math.PI * R

const TASKS = [
  {
    id: 0,
    icon: 'fe',
    name: 'Minum tablet tambah darah / Fe (zat besi)',
    note: 'Membantu mencegah kurang darah (anemia) sehingga ibu senantiasa bugar, serta melindungi tubuh untuk proses persalinan yang optimal. (Konsumsi sesuai petunjuk dokter)',
    pts: 20,
  },
  {
    id: 1,
    icon: 'folat',
    name: 'Minum tablet asam folat',
    note: 'Mengoptimalkan pertumbuhan otak dan tulang belakang janin agar berkembang sehat dan sempurna. (Minum sesuai anjuran dokter)',
    pts: 20,
  },
  {
    id: 2,
    icon: 'kalsium',
    name: 'Kalsium dan Vitamin D',
    note: 'Berfungsi membangun tulang dan gigi janin. (Minum sesuai anjuran dokter)',
    pts: 20,
  },
  {
    id: 3,
    icon: 'aktivitas',
    name: 'Aktivitas fisik ringan',
    note: 'Jalan kaki 30 menit, senam hamil, yoga, atau renang yang aman.',
    pts: 20,
  },
  {
    id: 4,
    icon: 'makan',
    name: 'Makan makanan bergizi',
    note: 'Makan 3x sehari yang dilengkapi protein hewani (telur/ikan/ayam), sayur, dan buah segar untuk mengoptimalkan kesehatan ibu dan tumbuh kembang janin.',
    pts: 10,
  },
  {
    id: 5,
    icon: 'tidur',
    name: 'Tidur cukup (7–9 jam)',
    note: 'Tidur malam yang cukup mendukung hormon pertumbuhan janin.',
    pts: 10,
  },
]

function TaskIcon({ icon }: { icon: string }) {
  switch (icon) {
    case 'fe':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C7 11.1 6 13 6 15a7 7 0 0 0 7 7Z" />
        </svg>
      )
    case 'folat':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="m10.5 20.5 10-10a3.5 3.5 0 0 0-5-5l-10 10a3.5 3.5 0 0 0 5 5Z" />
          <path d="m8.5 8.5 7 7" />
        </svg>
      )
    case 'kalsium':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 10c.7-.7 1.69 0 2.5 0a2.5 2.5 0 1 0 0-5 .5.5 0 0 1-.5-.5 2.5 2.5 0 1 0-5 0c0 .81.7 1.8 0 2.5l-7 7c-.7.7-1.69 0-2.5 0a2.5 2.5 0 0 0 0 5c.28 0 .5.22.5.5a2.5 2.5 0 1 0 5 0c0-.81-.7-1.8 0-2.5Z" />
        </svg>
      )
    case 'aktivitas':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="13" cy="4" r="1.6" />
          <path d="m9 21 2-4 2.2-1.6L12 11l-3 1.5L7 16" />
          <path d="m13 16 2.5 1 1.5 4" />
          <path d="M11 11.4 14 9l3 1.5" />
        </svg>
      )
    case 'makan':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 2v7c0 1.1.9 2 2 2h.5a.5.5 0 0 1 .5.5V22" />
          <path d="M7 2v20" />
          <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
        </svg>
      )
    case 'tidur':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )
    default:
      return null
  }
}

export default function PregnancyTasksView() {
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const saved = JSON.parse(localStorage.getItem('tugas_state') || '{}')
      setChecked(saved)
    } catch {}
  }, [])

  function toggle(id: number) {
    setChecked(prev => {
      const next = { ...prev, [id]: !prev[id] }
      try { localStorage.setItem('tugas_state', JSON.stringify(next)) } catch {}
      return next
    })
  }

  const score = TASKS.reduce((acc, t) => acc + (checked[t.id] ? t.pts : 0), 0)
  const doneCount = TASKS.filter(t => checked[t.id]).length
  const allDone = doneCount === TASKS.length
  const offset = mounted ? C * (1 - score / 100) : C

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 px-6 pt-[6px] pb-[18px] bg-gradient-to-b from-white to-[#F1F7FE] rounded-b-[24px] shadow-[0_6px_16px_-10px_rgba(17,120,212,0.4)] z-[5]">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#1178D4] bg-[#E7F2FB] px-2.5 py-1 rounded-full mb-2.5">
          <svg className="w-[13px] h-[13px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 11 3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          Aktivitas Harian Bunda
        </span>
        <h1 className="text-[24px] font-semibold text-[#1F2937] leading-[1.1] tracking-[-0.01em]">Tugas Harian</h1>
        <p className="mt-1.5 text-[12px] font-normal text-[#697079] leading-[1.45] max-w-[300px]">
          Yuk lengkapi tugas hari ini untuk si kecil! Setiap centang menambah skor sehat Bunda.
        </p>
      </header>

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar px-5 pt-4 pb-[108px]">

        {/* Score Card */}
        <section className="relative rounded-[20px] p-[18px] overflow-hidden bg-gradient-to-br from-[#2B93E6] via-[#1178D4] to-[#0A487F] shadow-[0_14px_30px_-14px_rgba(17,120,212,0.5)] text-white">
          <div className="absolute -right-10 -top-[50px] w-[160px] h-[160px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.18),transparent_70%)]" />

          <div className="relative flex items-center gap-[18px] z-[1]">
            {/* Ring */}
            <div className="shrink-0 relative w-[108px] h-[108px]">
              <svg width="108" height="108" viewBox="0 0 108 108" className="-rotate-90">
                <circle cx="54" cy="54" r={R} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="9" />
                <circle
                  cx="54" cy="54" r={R} fill="none" stroke="white" strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={offset}
                  style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.22,0.61,0.36,1)' }}
                />
              </svg>
              {!allDone ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[30px] font-bold leading-none tracking-tight">{score}</span>
                  <span className="text-[11px] font-medium opacity-80 mt-0.5">/100 Poin</span>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12 4.5 4.5L19 7" />
                  </svg>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium opacity-85">Skor Aktif Harian</div>
              <div className="text-[17px] font-semibold mt-0.5 leading-[1.25]">
                <b className="font-bold">{doneCount}</b> dari 6 tugas selesai
              </div>
              <div className="mt-2.5 h-[7px] rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white"
                  style={{ width: `${score}%`, transition: 'width 0.7s cubic-bezier(0.22,0.61,0.36,1)' }}
                />
              </div>
              <span className="inline-flex items-center gap-1.5 mt-[11px] bg-white/[0.16] border border-white/25 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                <svg className="w-[13px] h-[13px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {score} poin terkumpul
              </span>
            </div>
          </div>

          {/* Celebrate Banner */}
          {allDone && (
            <div className="relative z-[1] mt-3.5 flex items-center gap-2.5 bg-white/[0.16] border border-white/30 rounded-[12px] px-3 py-2.5 animate-pop">
              <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1-1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
              </svg>
              <span className="text-[12px] font-semibold leading-[1.35]">Luar biasa, Bunda! Semua tugas hari ini selesai. Pertahankan, ya!</span>
            </div>
          )}
        </section>

        {/* Tasks Section Label */}
        <div className="flex items-center justify-between mt-[22px] mb-3 px-0.5">
          <h2 className="text-[15px] font-semibold text-[#1F2937]">Tugas Hari Ini</h2>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#1178D4] bg-[#E7F2FB] px-2.5 py-[3px] rounded-full">
            <svg className="w-[11px] h-[11px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z" /><path d="M12 7v5l3 2" />
            </svg>
            Wajib setiap hari
          </span>
        </div>

        {/* Task List */}
        <div className="flex flex-col gap-[11px]">
          {TASKS.map(task => {
            const isOn = !!checked[task.id]
            return (
              <button
                key={task.id}
                onClick={() => toggle(task.id)}
                className={`w-full text-left flex items-start gap-3 rounded-[16px] p-[13px_14px] transition-all duration-200 shadow-[0_3px_10px_-7px_rgba(9,30,66,0.16)] active:scale-[0.992] ${
                  isOn
                    ? 'bg-gradient-to-b from-[#F4F9FE] to-[#E7F2FB] border border-[#C4DDF5]'
                    : 'bg-white border border-[#E4EDE7]'
                }`}
              >
                {/* Checkbox circle */}
                <div className={`shrink-0 w-6 h-6 mt-[1px] rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                  isOn ? 'bg-[#1178D4] border-[#1178D4]' : 'bg-white border-[#C9D2CB]'
                }`}>
                  <svg
                    className={`w-3.5 h-3.5 text-white transition-all duration-200 ${isOn ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="m5 12 4.5 4.5L19 7" />
                  </svg>
                </div>

                {/* Task icon */}
                <div className={`shrink-0 w-[38px] h-[38px] rounded-[11px] flex items-center justify-center transition-colors duration-200 ${
                  isOn ? 'bg-[#D2E6FA] text-[#1178D4]' : 'bg-[#E7F2FB] text-[#1178D4]'
                }`}>
                  <TaskIcon icon={task.icon} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className={`text-[13.5px] font-semibold leading-[1.3] transition-all duration-200 ${
                    isOn ? 'text-[#0A487F] line-through decoration-[rgba(10,72,127,0.4)]' : 'text-[#1F2937]'
                  }`}>
                    {task.name}
                  </div>
                  <div className="text-[11px] font-normal text-[#697079] leading-[1.45] mt-[3px]">
                    {task.note}
                  </div>
                </div>

                {/* Points badge */}
                <span className={`shrink-0 self-start text-[11px] font-bold px-[9px] py-[3px] rounded-full border whitespace-nowrap transition-all duration-200 ${
                  isOn
                    ? 'bg-[#1178D4] text-white border-[#1178D4]'
                    : 'bg-[#E7F2FB] text-[#1178D4] border-[#C4DDF5]'
                }`}>
                  +{task.pts}
                </span>
              </button>
            )
          })}
        </div>

        {/* Notification */}
        <div className="flex items-center justify-between mt-[22px] mb-3 px-0.5">
          <h2 className="text-[15px] font-semibold text-[#1F2937]">Pesan untuk Bunda</h2>
        </div>
        <div className="flex gap-[11px] items-start bg-gradient-to-b from-white to-[#F1F7FE] border border-[#E4EDE7] rounded-[16px] p-[13px_14px]">
          <div className="shrink-0 w-[34px] h-[34px] rounded-[10px] bg-[#1178D4] text-white flex items-center justify-center">
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </div>
          <div>
            <div className="text-[12.5px] font-semibold text-[#0A487F] leading-[1.3]">Selamat pagi, Bunda!</div>
            <div className="text-[11.5px] font-normal text-[#4C545F] leading-[1.5] mt-[3px]">
              Jangan lupa lengkapi tugas harian ya, agar si kecil tumbuh sehat!
            </div>
          </div>
        </div>

        {/* Status Risiko */}
        <div className="flex items-center justify-between mt-[22px] mb-3 px-0.5">
          <h2 className="text-[15px] font-semibold text-[#1F2937]">Status Risiko Janin</h2>
        </div>
        <div className="flex flex-col gap-[10px]">
          <div className="flex gap-[11px] items-start bg-[#F1F7FE] border border-[#C4DDF5] rounded-[14px] p-[12px_13px]">
            <div className="shrink-0 w-[30px] h-[30px] rounded-[9px] bg-[#1178D4] flex items-center justify-center">
              <svg className="w-[17px] h-[17px]" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <div>
              <div className="text-[12.5px] font-semibold text-[#0A487F] leading-[1.3]">Status Aman</div>
              <div className="text-[11.5px] font-normal text-[#4C545F] leading-[1.5] mt-[3px]">
                Saat ini, Bunda berada di Status Aman! Kondisi yang sangat ideal untuk tumbuh kembang janin. Pertahankan, ya!
              </div>
            </div>
          </div>

          <div className="flex gap-[11px] items-start bg-[#FFF7E6] border border-[#F4E2BC] rounded-[14px] p-[12px_13px]">
            <div className="shrink-0 w-[30px] h-[30px] rounded-[9px] bg-[#D99100] flex items-center justify-center">
              <svg className="w-[17px] h-[17px]" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v4" /><path d="M12 17h.01" />
                <path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z" />
              </svg>
            </div>
            <div>
              <div className="text-[12.5px] font-semibold text-[#8A6100] leading-[1.3]">Status Perlu Perhatian</div>
              <div className="text-[11.5px] font-normal text-[#4C545F] leading-[1.5] mt-[3px]">
                Saat ini, Bunda berada di Status Perlu Perhatian. Waktunya fokus pada asupan nutrisi harian, jangan lupa makan ekstra protein hewani, ya Bunda.
              </div>
            </div>
          </div>

          <div className="flex gap-[11px] items-start bg-[#FEF1F1] border border-[#F6D2D2] rounded-[14px] p-[12px_13px]">
            <div className="shrink-0 w-[30px] h-[30px] rounded-[9px] bg-[#DC2626] flex items-center justify-center">
              <svg className="w-[17px] h-[17px]" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5Z" />
              </svg>
            </div>
            <div>
              <div className="text-[12.5px] font-semibold text-[#9F1C1C] leading-[1.3]">Status Risiko Tinggi</div>
              <div className="text-[11.5px] font-normal text-[#4C545F] leading-[1.5] mt-[3px]">
                Saat ini, Bunda berada di Status Risiko Tinggi pada Janin. Jangan ditunda, mari jadwalkan periksa ke fasilitas kesehatan terdekat untuk penanganan yang tepat!
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}
