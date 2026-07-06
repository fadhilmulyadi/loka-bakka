"use client"

import dynamic from "next/dynamic"
import { useState, useCallback, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  LogOut, TriangleAlert, Clock, Search,
  ChevronLeft, ChevronDown, MapPin,
  SlidersHorizontal, X, User,
} from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { getKelurahanStats } from "@/lib/actions/kader"
import { NotificationBell } from "@/components/kader/notification-bell"

// ── Types ───────────────────────────────────────────────────────────────────
export type KelurahanData = {
  id: number
  nama: string
  lat: number
  lng: number
  total: number
  normal: number
  risiko: number
  stunting: number
  posyandu: string[]
  petugas: string
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function pct(val: number, total: number) {
  return total > 0 ? Math.round((val / total) * 100) : 0
}

type StatusInfo = { fill: string; label: string; badgeClass: string }

function stuntingInfo(rate: number): StatusInfo {
  if (rate < 10) return { fill: "#378ADD", label: "Rendah",        badgeClass: "bg-blue-100 text-blue-800" }
  if (rate < 15) return { fill: "#EF9F27", label: "Sedang",        badgeClass: "bg-amber-100 text-amber-800" }
  if (rate < 20) return { fill: "#7F77DD", label: "Tinggi",        badgeClass: "bg-purple-100 text-purple-800" }
  return           { fill: "#E24B4A", label: "Sangat Tinggi", badgeClass: "bg-red-100 text-red-800" }
}

function progressGradient(rate: number): string {
  if (rate >= 20) return "linear-gradient(to right, #DD696C, #FF0004)"
  if (rate >= 10) return "linear-gradient(to right, #FFD54F, #F57F17)"
  return "linear-gradient(to right, #66BB6A, #2E7D32)"
}

function progressRateColor(rate: number): string {
  if (rate >= 20) return "#E53935"
  if (rate >= 10) return "#F57F17"
  return "#2E7D32"
}

// ── Dynamic Map (no SSR) ─────────────────────────────────────────────────────
const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center bg-[#F5F7FA]">
      <div className="flex flex-col items-center gap-2">
        <div className="w-7 h-7 border-2 border-[#378ADD] border-t-transparent rounded-full motion-safe:animate-spin" />
        <p className="text-xs text-muted-foreground">Memuat peta...</p>
      </div>
    </div>
  ),
})

// ── Clock hook ───────────────────────────────────────────────────────────────
const MONTHS_ID = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"]

function useTime() {
  const [time, setTime] = useState(() => {
    const n = new Date()
    return `${n.getDate()} ${MONTHS_ID[n.getMonth()]} ${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`
  })
  useEffect(() => {
    const fmt = () => {
      const n = new Date()
      return `${n.getDate()} ${MONTHS_ID[n.getMonth()]} ${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`
    }
    const id = setInterval(() => setTime(fmt()), 60_000)
    return () => clearInterval(id)
  }, [])
  return time
}

// ── Filter Bar ───────────────────────────────────────────────────────────────
function FilterBar() {
  const filters = [
    { label: "Kecamatan", value: "Semua" },
    { label: "Kelurahan",  value: "Semua" },
    { label: "Status",    value: "Semua" },
    { label: "Periode",   value: "Semua" },
  ]

  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground">Filter</span>
        {filters.map((f) => (
          <button
            key={f.label}
            className="flex items-center gap-1 px-3 h-8 rounded-[50px] bg-white shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-xs text-[#173753] hover:bg-gray-50 transition-colors"
          >
            <span className="text-muted-foreground">{f.label}:</span>
            <span className="font-medium ml-0.5">{f.value}</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5" aria-hidden="true" />
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          className="flex items-center gap-1.5 px-4 h-8 rounded-[50px] text-white text-xs font-medium shadow-[2px_2px_8px_rgba(0,0,0,0.08)] hover:opacity-90 transition-opacity"
          style={{ background: "linear-gradient(to right, #52A9E3, #93D1F7)" }}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
          Terapkan Filter
        </button>
        <button className="flex items-center gap-1.5 px-3 h-8 rounded-[50px] bg-white shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-xs text-[#173753] hover:bg-gray-50 transition-colors">
          <X className="w-3.5 h-3.5" aria-hidden="true" />
          Hapus Filter
        </button>
      </div>
    </div>
  )
}

export default function PetaSebaranPage() {
  const time = useTime()
  const { data: session } = useSession()
  const [kelurahanListData, setKelurahanListData] = useState<KelurahanData[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<KelurahanData | null>(null)

  useEffect(() => {
    getKelurahanStats().then((data) => {
      setKelurahanListData(data as KelurahanData[])
      setLoading(false)
    })
  }, [])

  const handleSelect = useCallback((k: KelurahanData) => setSelected(k), [])
  const handleBack   = useCallback(() => setSelected(null), [])

  if (loading) return <div className="p-8">Loading...</div>

  // ── Totals ───────────────────────────────────────────────────────────────────
  const totals = kelurahanListData.reduce(
    (acc, k) => ({
      total:    acc.total    + k.total,
      normal:   acc.normal   + k.normal,
      risiko:   acc.risiko   + k.risiko,
      stunting: acc.stunting + k.stunting,
    }),
    { total: 0, normal: 0, risiko: 0, stunting: 0 }
  )

  const sorted = [...kelurahanListData].sort(
    (a, b) => pct(b.stunting, b.total) - pct(a.stunting, a.total)
  )

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-[#F5F7FA]">

      {/* ── Topbar ── */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2 z-10">
        <div className="relative w-[291px] flex-none">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#173753] z-10" />
          <Input
            className="pl-8 h-8 text-xs text-[#173753] placeholder:text-[#BBBBBB] bg-white rounded-[50px] border-none shadow-[2px_2px_8px_rgba(0,0,0,0.08)] focus-visible:ring-1 focus-visible:ring-gray-200"
            placeholder="Search"
          />
        </div>
        <div className="flex-1 flex items-center gap-2 px-4 h-8 bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
          <TriangleAlert className="w-3.5 h-3.5 text-[#E53935] flex-none" />
          <span className="text-xs text-[#173753] truncate font-medium">
            {selected
              ? `${selected.nama}: ${pct(selected.stunting, selected.total)}% prevalensi stunting`
              : "Pemantauan sebaran stunting aktif"}
          </span>
          {!selected && (
            <span className="text-xs text-muted-foreground flex-none font-medium">| {session?.user?.role === 'kader' ? 'Wilayah Kerja' : 'Semua Wilayah'}</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-none">
          <div className="flex items-center gap-2 px-4 h-8 text-xs text-[#173753] bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
            <Clock className="w-3.5 h-3.5" />
            <span className="tabular-nums">{time || "—"}</span>
          </div>
          <NotificationBell />
          <Button
            variant="ghost" size="sm"
            className="gap-1.5 text-xs h-8 px-4 bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-[#173753] hover:bg-white/80"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="w-3.5 h-3.5" />
            Log Out
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-5 flex-1 flex flex-col min-h-0">
        {/* ── Page Title + Profile ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium text-[#173753]">
              Peta Sebaran Stunting
            </h1>
          </div>
          <div className="flex items-center gap-2 pl-1 pr-3 py-1 bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-teal-100 text-teal-700 text-sm font-semibold">
                {session?.user?.name?.slice(0, 2).toUpperCase() ?? "ZA"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs text-[#173753] font-medium leading-none">{session?.user?.name ?? "Kader"}</p>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">Kader Posyandu</p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <FilterBar />

        {/* ── Map + Panel ── */}
        <div className="flex flex-1 min-h-0 gap-3">
          {/* Map */}
          <div className="flex-1 min-h-0 min-w-0">
            <LeafletMap kelurahan={kelurahanListData} onSelect={handleSelect} />
          </div>

          {/* Side Panel Card */}
          <aside
            aria-label="Panel informasi kelurahan"
            className="w-[340px] flex-none flex flex-col overflow-y-auto bg-white rounded-[20px] shadow-[2px_2px_12px_rgba(0,0,0,0.10)]"
          >
            {selected ? (
              <DetailPanel k={selected} onBack={handleBack} />
            ) : (
              <DefaultPanel onSelect={setSelected} sorted={sorted} totals={totals} />
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// DEFAULT PANEL
// ════════════════════════════════════════════════════════════════════════════
function DefaultPanel({ onSelect, sorted, totals }: { onSelect: (k: KelurahanData) => void, sorted: KelurahanData[], totals: any }) {
  const maxRate = sorted.length > 0 ? pct(sorted[0].stunting, sorted[0].total) : 0

  const statCards = [
    {
      label: "Total Terdaftar",
      value: totals.total,
      gradientFrom: "#93D1F7",
      gradientTo: "#1E88E5",
      valueClass: "text-[#173753]",
    },
    {
      label: "Status Normal",
      value: totals.normal,
      gradientFrom: "#66BB6A",
      gradientTo: "#2E7D32",
      valueClass: "text-[#2E7D32]",
    },
    {
      label: "Berisiko Gizi",
      value: totals.risiko,
      gradientFrom: "#FFD54F",
      gradientTo: "#F57F17",
      valueClass: "text-[#F57F17]",
    },
    {
      label: "Kasus Stunting",
      value: totals.stunting,
      gradientFrom: "#DD696C",
      gradientTo: "#FF0004",
      valueClass: "text-[#E53935]",
    },
  ]

  return (
    <>
      {/* Header */}
      <div className="flex-none px-5 pt-4 pb-3 border-b border-[#EAEEF2]">
        <p className="text-[16px] font-semibold text-[#173753]">Ringkasan Wilayah</p>
        <p className="text-[12px] text-muted-foreground mt-0.5">Wilayah Kerja Posyandu</p>
      </div>

      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {/* Stat Cards — gradient circle icons */}
        {statCards.map((c) => (
          <Card
            key={c.label}
            className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] py-0"
          >
            <CardContent className="px-4 py-3 flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-none"
                style={{ background: `linear-gradient(to bottom, ${c.gradientFrom}, ${c.gradientTo})` }}
              >
                <User className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className={cn("text-2xl font-bold tabular-nums leading-tight font-sans", c.valueClass)}>
                  {c.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Distribusi Per Kelurahan */}
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em] mb-2.5">
            Distribusi Per Kelurahan
          </p>
          <div className="space-y-3">
            {sorted.map((k, idx) => {
              const rate = pct(k.stunting, k.total)
              return (
                <button
                  key={k.id}
                  onClick={() => onSelect(k)}
                  className="w-full text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-muted-foreground/40 w-4 flex-none tabular-nums text-right">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-medium text-[#173753] group-hover:text-[#378ADD] transition-colors flex-1 truncate">
                      {k.nama}
                    </span>
                    <span
                      className="text-[11px] font-bold tabular-nums flex-none"
                      style={{ color: progressRateColor(rate) }}
                    >
                      {rate}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full transition-[width] duration-500"
                      style={{
                        width: maxRate > 0 ? `${Math.round((rate / maxRate) * 100)}%` : '0%',
                        background: progressGradient(rate),
                      }}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// DETAIL PANEL
// ════════════════════════════════════════════════════════════════════════════
function DetailPanel({ k, onBack }: { k: KelurahanData; onBack: () => void }) {
  const rate      = pct(k.stunting, k.total)
  const info      = stuntingInfo(rate)
  const pctNormal = pct(k.normal, k.total)
  const pctRisiko = pct(k.risiko, k.total)

  const metrics = [
    { label: "Total Anak Terdaftar", val: `${k.total} anak`,              color: "" },
    { label: "Status Normal",        val: `${k.normal} (${pctNormal}%)`,  color: "text-green-700" },
    { label: "Berisiko Gizi",        val: `${k.risiko} (${pctRisiko}%)`,  color: "text-amber-700" },
    { label: "Stunting",             val: `${k.stunting} (${rate}%)`,     color: "text-[#E24B4A]" },
    { label: "Petugas PJ",           val: k.petugas,                      color: "" },
  ]

  const bars = [
    { label: "Normal",   value: pctNormal, color: "#16a34a" },
    { label: "Berisiko", value: pctRisiko, color: "#EF9F27" },
    { label: "Stunting", value: rate,      color: "#E24B4A" },
  ]

  return (
    <>
      {/* Header */}
      <div className="flex-none px-5 pt-4 pb-3 border-b border-[#EAEEF2] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: info.fill }} />
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-[#378ADD] font-medium mb-2 hover:text-[#173753] transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
          Semua Wilayah
        </button>
        <p className="text-[15px] font-semibold text-[#173753] font-sans">{k.nama}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">Wilayah Kerja · Data Dinamis</p>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Status badge */}
        <span className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold", info.badgeClass)}>
          <span className="w-2 h-2 rounded-full flex-none" style={{ background: info.fill }} aria-hidden="true" />
          Risiko {info.label} · {rate}% Stunting
        </span>

        {/* Metric rows */}
        <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
          <CardContent className="p-0">
            {metrics.map((m, i) => (
              <div
                key={m.label}
                className={cn(
                  "flex items-center justify-between px-4 py-2.5",
                  i < metrics.length - 1 && "border-b border-[#F0F0F0]"
                )}
              >
                <span className="text-xs text-muted-foreground">{m.label}</span>
                <span className={cn("text-xs font-semibold text-[#173753] tabular-nums font-sans", m.color)}>
                  {m.val}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Distribution bars */}
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em] mb-2.5">
            Distribusi Status
          </p>
          <div className="space-y-2.5">
            {bars.map((bar) => (
              <div key={bar.label}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{bar.label}</span>
                  <span className="text-xs font-semibold text-[#173753] tabular-nums">{bar.value}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-1.5 rounded-full transition-[width] duration-500"
                    style={{ width: `${bar.value}%`, background: bar.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Posyandu list */}
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em] mb-2.5">
            Posyandu di Kelurahan Ini
          </p>
          <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
            <CardContent className="p-0">
              {k.posyandu.map((p, i) => (
                <div
                  key={p}
                  className={cn(
                    "flex items-center justify-between px-4 py-2.5",
                    i < k.posyandu.length - 1 && "border-b border-[#F0F0F0]"
                  )}
                >
                  <span className="text-xs font-medium text-[#173753]">{p}</span>
                  <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    Aktif
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
