"use client"

import React from 'react'
import Link from 'next/link'
import { Check, AlertTriangle, Flame, Lightbulb, Heart, Siren, MapPin, ClipboardList, RefreshCw } from 'lucide-react'
import { levelToStatusLabel, type RiskLevel } from '@/lib/growth-standards/risiko-kehamilan-calc'

// Satu-satunya sumber warna & label untuk halaman status ibu maupun anak.
// Sebelumnya hex-nya diulang lewat ternary inline di tiap view, dan bullet di
// blok sedang/tinggi ikut kebawa hijau karena hasil copy-paste.
export const LEVEL_STYLE: Record<RiskLevel, {
  label: string
  solid: string
  text: string
  tint: string
  border: string
  Icon: React.ElementType
}> = {
  rendah: { label: levelToStatusLabel.rendah, solid: '#1E9E62', text: '#0E6B3E', tint: '#E7F7EF', border: '#C3E9D4', Icon: Check },
  sedang: { label: levelToStatusLabel.sedang, solid: '#D99100', text: '#8A6100', tint: '#FFF7E6', border: '#F4E2BC', Icon: AlertTriangle },
  tinggi: { label: levelToStatusLabel.tinggi, solid: '#DC2626', text: '#9F1C1C', tint: '#FEF1F1', border: '#F6D2D2', Icon: Flame },
}

export interface EduItem { lead?: string; text: string }
export interface EduSection { heading: string; body?: string; items?: EduItem[] }
export interface EduAction { label: string; href: string; icon: 'tugas' | 'faskes'; primary?: boolean }

export interface StatusEdu {
  intro: string
  sections: EduSection[]
  danger?: { title: string; note: string; items: string[] }
  closing: string
  actions?: EduAction[]
}

/* ── Primitif tata letak ── */

export function SectionHeading({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mx-0.5 mb-3">
      <span className="flex-none w-5 h-5 rounded-full bg-[#1178D4] text-white text-[11px] font-bold flex items-center justify-center font-mono">
        {n}
      </span>
      <h2 className="text-[15px] font-semibold text-[#1F2937]">{children}</h2>
    </div>
  )
}

export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={`bg-white border border-[#E4EDE7] rounded-[18px] p-4 shadow-[0_4px_14px_-8px_rgba(9,30,66,0.12)] ${className}`}>
      {children}
    </section>
  )
}

export function MetricTile({ label, value, unit, note }: {
  label: string
  value: string
  unit?: string
  note?: React.ReactNode
}) {
  return (
    <div className="flex-1 flex flex-col justify-between bg-[#F1F7FE] border border-[#E4EDE7] rounded-[13px] px-2 py-2.5 text-center">
      <div>
        <div className="text-[11px] font-medium text-[#697079] leading-tight">{label}</div>
        <div className="text-[18px] font-bold text-[#1F2937] mt-1 leading-none tracking-tight">
          {value}{unit && <span className="text-[10px] font-medium text-[#697079]"> {unit}</span>}
        </div>
      </div>
      {note && <div className="text-[9.5px] font-medium text-[#1178D4] leading-tight mt-1.5">{note}</div>}
    </div>
  )
}

/* ── Kartu indikator risiko ── */

function RiskGauge({ level }: { level: RiskLevel }) {
  const pos = { rendah: '17%', sedang: '50%', tinggi: '83%' }[level]
  return (
    <div>
      <div className="relative h-[11px] rounded-full bg-gradient-to-r from-[#1E9E62] from-33% via-[#F2B705] via-66% to-[#E0524E]">
        <span
          className="absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full bg-white shadow-[0_3px_8px_rgba(9,30,66,0.3)] transition-all duration-500"
          style={{ left: pos, borderWidth: '3px', borderStyle: 'solid', borderColor: LEVEL_STYLE[level].solid }}
        />
      </div>
      <div className="flex justify-between mt-2">
        {(['rendah', 'sedang', 'tinggi'] as RiskLevel[]).map((l) => (
          <span
            key={l}
            className="text-[11px] font-semibold flex items-center gap-1"
            style={{ color: LEVEL_STYLE[l].text }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: LEVEL_STYLE[l].solid }} />
            {LEVEL_STYLE[l].label}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * Seksi 1 di halaman status ibu maupun anak. Judul, garis pemisah, kalimat
 * penutup, dan empty-state-nya ada di sini supaya tidak bisa berbeda per
 * halaman; halaman hanya menyuplai angka yang memang beda.
 */
export function RiskIndicatorCard({ level, meta, metrics }: {
  level: RiskLevel
  /** Baris tambahan di atas tile, mis. tanggal kunjungan. Anak tidak memakainya. */
  meta?: React.ReactNode
  metrics: React.ComponentProps<typeof MetricTile>[]
}) {
  return (
    <>
      <SectionHeading n="1">Indikator Risiko Stunting</SectionHeading>
      <Card className="mb-4">
        {metrics.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-[13px] text-[#697079]">Belum ada data pengukuran.</p>
            <p className="text-[11.5px] text-[#989DA3] mt-1">Data akan muncul setelah kunjungan pertama ke posyandu.</p>
          </div>
        ) : (
          <>
            <RiskGauge level={level} />

            {meta && <div className="flex items-center justify-between gap-2.5 mt-4 mb-2.5">{meta}</div>}

            <div className={`flex gap-2.5 ${meta ? '' : 'mt-4'}`}>
              {metrics.map((m) => <MetricTile key={m.label} {...m} />)}
            </div>

            <div className="flex items-start gap-1.5 mt-3 pt-3 border-t border-[#E4EDE7] text-[11px] text-[#989DA3] leading-[1.4]">
              <RefreshCw className="w-3 h-3 flex-none text-[#1178D4] mt-0.5" />
              Data diperbarui setiap kunjungan posyandu.
            </div>
          </>
        )}
      </Card>
    </>
  )
}

/* ── Kartu vonis ── */

export function StatusVerdictCard({ level, eyebrow = 'Status kondisimu saat ini' }: {
  level: RiskLevel
  eyebrow?: string
}) {
  const s = LEVEL_STYLE[level]
  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className="flex-none w-11 h-11 rounded-[13px] flex items-center justify-center" style={{ backgroundColor: s.solid }}>
          <s.Icon className="w-[23px] h-[23px] text-white" strokeWidth={2.2} />
        </div>
        <div>
          <div className="text-[10.5px] font-semibold tracking-[0.04em] uppercase text-[#697079]">{eyebrow}</div>
          <div className="text-[19px] font-bold leading-tight mt-0.5" style={{ color: s.text }}>{s.label}</div>
        </div>
      </div>
    </Card>
  )
}

/* ── Kartu edukasi ── */

export function StatusEduCard({ level, edu }: { level: RiskLevel; edu: StatusEdu }) {
  const s = LEVEL_STYLE[level]

  return (
    <div
      className="mt-3.5 rounded-[18px] p-[18px] border"
      style={{ borderColor: s.border, backgroundImage: `linear-gradient(180deg, #FFFFFF 0%, ${s.tint} 100%)` }}
    >
      <p className="text-[13.5px] font-medium text-[#1F2937] leading-[1.6]">{edu.intro}</p>

      {edu.sections.map((sec) => (
        <div key={sec.heading}>
          <h3 className="text-[14px] font-semibold mt-4 leading-snug" style={{ color: s.text }}>{sec.heading}</h3>
          {sec.body && <p className="text-[13px] text-[#4C545F] leading-[1.65] mt-1.5">{sec.body}</p>}
          {sec.items && (
            <ul className="flex flex-col gap-2.5 mt-2.5 list-none">
              {sec.items.map((item, i) => (
                <li key={i} className="flex items-baseline gap-2.5 text-[13px] text-[#4C545F] leading-[1.65]">
                  <span className="flex-none w-1.5 h-1.5 rounded-full translate-y-[-2px]" style={{ backgroundColor: s.solid }} />
                  <div>
                    {item.lead && <span className="font-semibold block mb-0.5" style={{ color: s.text }}>{item.lead}</span>}
                    {item.text}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {edu.danger && (
        <div className="mt-4 rounded-[14px] border-[1.5px] p-3.5" style={{ borderColor: s.border, backgroundColor: s.tint }}>
          <div className="flex items-center gap-2.5">
            <span className="flex-none w-[30px] h-[30px] rounded-[9px] text-white flex items-center justify-center" style={{ backgroundColor: s.solid }}>
              <Siren className="w-[18px] h-[18px]" />
            </span>
            <span className="text-[13px] font-bold leading-snug" style={{ color: s.text }}>{edu.danger.title}</span>
          </div>
          <p className="text-[12px] text-[#4C545F] leading-[1.5] mt-2.5">{edu.danger.note}</p>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2.5 list-none">
            {edu.danger.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-[11.5px] font-medium leading-snug" style={{ color: s.text }}>
                <span className="flex-none w-1.5 h-1.5 rounded-[2px] mt-[5px] rotate-45" style={{ backgroundColor: s.solid }} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex gap-3 items-start rounded-[13px] p-3.5 bg-white border" style={{ borderColor: s.border }}>
        <span className="flex-none w-7 h-7 rounded-[9px] flex items-center justify-center text-white" style={{ backgroundColor: s.solid }}>
          {level === 'tinggi' ? <Heart className="w-4 h-4" /> : <Lightbulb className="w-4 h-4" />}
        </span>
        <div>
          <div className="text-[10.5px] font-bold tracking-[0.04em] uppercase" style={{ color: s.text }}>Ingat ya</div>
          <div className="text-[13px] font-medium leading-[1.55] mt-0.5" style={{ color: s.text }}>{edu.closing}</div>
        </div>
      </div>

      {edu.actions && edu.actions.length > 0 && (
        <div className="flex gap-2.5 mt-4 flex-wrap">
          {edu.actions.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold px-3 py-3 rounded-[12px] active:scale-[0.97] transition-transform"
              style={a.primary
                ? { color: 'white', backgroundColor: s.solid, boxShadow: `0 9px 18px -9px ${s.solid}` }
                : { color: '#1178D4', backgroundColor: '#E7F2FB', border: '1px solid #C4DDF5' }}
            >
              {a.icon === 'faskes' ? <MapPin className="w-[15px] h-[15px]" /> : <ClipboardList className="w-[15px] h-[15px]" />}
              {a.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Riwayat kunjungan ── */

export function VisitRow({ title, detail, status, style }: {
  title: string
  detail: string
  status: string
  style: { bg: string; text: string }
}) {
  return (
    <div className="flex items-center justify-between gap-2 p-3 bg-[#F8FBFE] border border-[#E4EDE7] rounded-[13px]">
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-[#1F2937]">{title}</div>
        <div className="text-[11.5px] text-[#697079] mt-0.5">{detail}</div>
      </div>
      <span
        className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold"
        style={{ backgroundColor: style.bg, color: style.text }}
      >
        {status}
      </span>
    </div>
  )
}
