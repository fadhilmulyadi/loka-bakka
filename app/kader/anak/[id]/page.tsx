"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ChevronRight,
  Calendar,
  Baby,
  Activity,
  MoreHorizontal,
  Stethoscope,
  Bell,
  User,
  Pencil,
  PowerOff,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { KaderUserPill } from "@/components/kader/kader-user-pill"
import { cn } from "@/lib/utils"
import { getCached, setCached, KADER_STATS_KEY } from "@/lib/client-cache"
import { getStatusStyle } from "@/lib/status-styles"
import { Topbar } from "@/components/kader/topbar"
import { getChildDetail, getDashboardStats } from "@/lib/actions/kader"
import { StatusBadge } from "@/components/status-badge"
import { CatatKunjunganModal } from "@/components/kader/catat-kunjungan-modal"
import { IngatkanIbuModal } from "@/components/kader/ingatkan-ibu-modal"
import { EditDataAnakModal } from "@/components/kader/edit-data-anak-modal"
import { ResetPasswordModal } from "@/components/kader/reset-password-modal"
import { heightForAgeBoys, heightForAgeGirls } from "@/lib/growth-standards/height-for-age"

import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip
} from "recharts"

import { ChartContainer } from "@/components/ui/chart"

// ============ DESIGN TOKENS (mapped to project palette) ============
const ACCENT = "#52A9E3"
const PURPLE = "#6A48C4"
const PURPLE_BG = "#F0EBFB"

// ... (existing imports)

// ============ MAIN PAGE ============

interface Visit {
  tgl: string
  usia: string
  bb: number
  tb: number
  zBb: string
  zTb: string
  status: string
  examiner: string
  latest: boolean
}

interface Sibling {
  id: string
  name: string
  age: string
  status: string
}

interface ChildDetail {
  id: string
  name: string
  gender: string
  genderRaw: "L" | "P"
  birthDateRaw: string
  beratLahir: number | null
  panjangLahir: number | null
  birthDate: string
  age: string
  ageMo: number
  posyandu: string
  desa: string
  address: string
  childOrder: string
  parent: {
    id: string
    mother: string
    father?: string
    phone: string
    username: string
    isHamil: boolean
    gestationalWeek: number | null
  }
  status: string
  latestCheckDate: string
  latestTB: number
  latestBB: number
  deltaBB: number | null
  deltaTB: number | null
  zScoreTBU: string
  zScoreTBURaw: number | null
  bbTB: string
  examiner: string
  nextCheckDate: string | null
  daysUntilNextCheck: number | null
  siblings: Sibling[]
  visits: Visit[]
}

function GrowthTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ payload: { sd2neg: number; sd2: number; median: number; actual: number | null } }>
  label?: number
}) {
  if (!active || !payload || payload.length === 0) return null
  const row = payload[0].payload
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[11px] shadow-sm">
      <p className="font-semibold text-[#173753] mb-1">Usia {label} bulan</p>
      <p className="text-muted-foreground">Rentang normal: {row.sd2neg.toFixed(1)}–{row.sd2.toFixed(1)} cm</p>
      <p className="text-muted-foreground">Median WHO: {row.median.toFixed(1)} cm</p>
      {row.actual != null && (
        <p className="font-medium text-[#2E7CE4]">Tinggi anak: {row.actual.toFixed(1)} cm</p>
      )}
    </div>
  )
}

export default function ChildDetailPage() {
  const params = useParams()
  const router = useRouter()
  const childId = (params?.id as string) ?? "1"
  const childCacheKey = `kader-anak-${childId}`
  const cachedChild = getCached<ChildDetail>(childCacheKey)
  const [childDataState, setChildDataState] = useState<ChildDetail | null>(cachedChild ?? null)
  const [loading, setLoading] = useState(!cachedChild)
  const [stats, setStats] = useState<{ totalChildren: number, measuredThisMonth: number, stuntingCount: number, anakStatus: { berisikoGiziKurang: number } } | null>(getCached(KADER_STATS_KEY) ?? null)
  const [visitModalOpen, setVisitModalOpen] = useState(false)
  const [ingatkanIbuOpen, setIngatkanIbuOpen] = useState(false)
  const [editDataOpen, setEditDataOpen] = useState(false)
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false)
  const [actionMenuOpen, setActionMenuOpen] = useState(false)

  const loadChild = () => {
    if (childId) {
      getChildDetail(childId).then((data) => {
        setChildDataState(data as unknown as ChildDetail)
        setLoading(false)
        setCached(childCacheKey, data as unknown as ChildDetail)
      })
    }
  }

  useEffect(() => {
    loadChild()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId])

  useEffect(() => {
    getDashboardStats().then((data) => {
      setStats(data)
      setCached(KADER_STATS_KEY, data)
    })
  }, [])

  if (loading) return <div className="p-8">Loading...</div>
  if (!childDataState) return <div className="p-8">Anak tidak ditemukan</div>

  const whoTable = childDataState.gender === "Laki-laki" ? heightForAgeBoys : heightForAgeGirls
  const chartData = whoTable
    .filter((d) => d.ageMonths <= 24)
    .map((d) => {
      const visit = childDataState.visits.find((v) => parseInt(v.usia) === d.ageMonths)
      return {
        month: d.ageMonths,
        sd2neg: d.sd2neg,
        band: d.sd2 - d.sd2neg,
        sd2: d.sd2,
        median: d.sd0,
        actual: visit ? visit.tb : null,
      }
    })

  const heights = chartData.flatMap((d) => [d.sd2neg, d.sd2, d.actual].filter((v): v is number => v != null))
  const yMin = Math.floor(Math.min(...heights) / 5) * 5
  const yMax = Math.ceil(Math.max(...heights) / 5) * 5
  const yMid = Math.round((yMin + yMax) / 2 / 5) * 5

  return (
    <div className="flex-1 bg-[#EBF2F8] flex flex-col">
      <Topbar
        alertStats={stats ? {
          stuntingCount: stats.stuntingCount,
          berisikoCount: stats.anakStatus.berisikoGiziKurang,
          belumDiperiksa: stats.totalChildren - stats.measuredThisMonth,
        } : null}
      />

      <div className="p-6 lg:p-8 space-y-4">
        {/* Title + User */}
        <div className="flex items-center justify-between">
          <div>
            <nav className="flex items-center gap-1 mb-1.5" aria-label="Breadcrumb">
              <Link href="/kader/dashboard" className="text-xs text-[#173753]/50 hover:text-[#173753] transition-colors">Dashboard</Link>
              <ChevronRight className="w-3 h-3 text-[#173753]/30 flex-none" />
              <Link href="/kader/rekap" className="text-xs text-[#173753]/50 hover:text-[#173753] transition-colors">Rekap Pasien</Link>
              <ChevronRight className="w-3 h-3 text-[#173753]/30 flex-none" />
              <span className="text-xs text-[#173753] font-medium">Profil Anak</span>
            </nav>
            <h1 className="text-2xl font-medium text-[#173753]">Profil Anak</h1>
          </div>

          <div className="flex items-center gap-3">
            <KaderUserPill />
          </div>
        </div>

        {/* Hero Card */}
        <div className="bg-white rounded-2xl px-6 py-5 flex items-center gap-5">
          {/* Avatar */}
          <div className="h-[52px] w-[52px] rounded-full bg-[#DBEAFE] flex items-center justify-center text-[18px] font-bold text-[#1D4ED8] flex-shrink-0">
            {childDataState.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[15px] font-semibold text-[#173753] leading-tight">{childDataState.name}</span>
              <StatusBadge status={childDataState.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Jenis Kelamin: {childDataState.gender} · Usia: {childDataState.age}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Periksa Tumbuh Kembang — opens Pemeriksaan Anak modal */}
            <Button
              onClick={() => setVisitModalOpen(true)}
              className="gap-1.5 text-xs h-9 px-4 rounded-[50px] text-white shadow-[0_4px_12px_rgba(82,169,227,0.3)] hover:opacity-90 transition-opacity"
              style={{ background: `linear-gradient(to right, ${ACCENT}, #93D1F7)` }}
            >
              Periksa Tumbuh Kembang
            </Button>

            {/* Ingatkan Ibu */}
            <Button
              variant="ghost"
              onClick={() => setIngatkanIbuOpen(true)}
              className="text-xs h-9 px-4 rounded-full bg-gray-100 hover:bg-gray-200 text-[#173753] transition-colors"
            >
              Ingatkan Ibu
            </Button>

            {/* Dot menu */}
            <Popover open={actionMenuOpen} onOpenChange={setActionMenuOpen}>
              <PopoverTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-[#173753] transition-colors flex-shrink-0">
                <MoreHorizontal className="w-4 h-4" />
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" className="w-52 p-1.5 rounded-2xl border-none shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                {[
                  { icon: Stethoscope, label: "Periksa Tumbuh Kembang", danger: false, onClick: () => { setActionMenuOpen(false); setVisitModalOpen(true) } },
                  { icon: Bell, label: "Ingatkan Ibu", danger: false, onClick: () => { setActionMenuOpen(false); setIngatkanIbuOpen(true) } },
                  { icon: User, label: "Lihat Profil Ibu", danger: false, onClick: () => { setActionMenuOpen(false); router.push(`/kader/ibu/${childDataState.parent.id}`) } },
                  { icon: Pencil, label: "Edit Data", danger: false, onClick: () => { setActionMenuOpen(false); setEditDataOpen(true) } },
                  { icon: PowerOff, label: "Nonaktifkan Pasien", danger: true },
                ].map((item, i, arr) => (
                  <React.Fragment key={item.label}>
                    {i === arr.length - 1 && (
                      <div className="my-1 border-t border-gray-100" />
                    )}
                    <button
                      onClick={item.onClick}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-[8px] text-[12.5px] font-medium transition",
                        item.danger
                          ? "text-red-500 hover:bg-[#52A9E3] hover:text-[#F5F7FA]"
                          : "text-[#173753] hover:bg-[#52A9E3] hover:text-[#F5F7FA]"
                      )}
                    >
                      <item.icon className="w-3.5 h-3.5 flex-none" />
                      {item.label}
                    </button>
                  </React.Fragment>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Stats + Growth Chart + Ibu/Wali */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Left: 4 stat cards + growth chart */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  label: "BB TERAKHIR",
                  value: `${childDataState.latestBB.toFixed(1).replace(".", ",")} kg`,
                  delta: childDataState.deltaBB,
                  deltaUnit: "kg",
                },
                {
                  label: "TB TERAKHIR",
                  value: `${childDataState.latestTB.toFixed(1).replace(".", ",")} cm`,
                  delta: childDataState.deltaTB,
                  deltaUnit: "cm",
                },
                {
                  label: "Z-SCORE TB/U",
                  value: childDataState.zScoreTBURaw != null
                    ? childDataState.zScoreTBURaw.toFixed(1).replace(".", ",").replace("-", "−")
                    : "—",
                  sub: childDataState.zScoreTBURaw == null ? null
                    : childDataState.zScoreTBURaw >= -2 ? "Normal (≥ −2 SD)"
                    : childDataState.zScoreTBURaw >= -3 ? "Risiko Stunting (−3 s/d −2 SD)"
                    : "Stunting (< −3 SD)",
                  subColor: childDataState.zScoreTBURaw == null ? ""
                    : childDataState.zScoreTBURaw >= -2 ? "text-[#15803D]"
                    : childDataState.zScoreTBURaw >= -3 ? "text-[#B06000]"
                    : "text-[#D93025]",
                },
                {
                  label: "PERIKSA TERAKHIR",
                  value: childDataState.latestCheckDate !== "-" ? childDataState.latestCheckDate.split(" ").slice(0, 2).join(" ") : "—",
                  sub: childDataState.examiner !== "-" ? `oleh ${childDataState.examiner}` : null,
                  subColor: "text-muted-foreground",
                },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-2xl py-3.5 px-4">
                  <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">{s.label}</p>
                  <p className="text-[20px] font-bold text-[#173753] leading-none">{s.value}</p>
                  {s.delta != null ? (
                    <p className={cn("text-[10px] mt-1.5 font-semibold whitespace-nowrap", s.delta >= 0 ? "text-[#15803D]" : "text-[#D93025]")}>
                      {s.delta >= 0 ? "▲" : "▼"} {s.delta >= 0 ? "+" : ""}{s.delta.toFixed(1).replace(".", ",")} {s.deltaUnit} dari bulan lalu
                    </p>
                  ) : s.sub ? (
                    <p className={cn("text-[10px] mt-1.5 font-medium whitespace-nowrap", s.subColor)}>{s.sub}</p>
                  ) : null}
                </div>
              ))}
            </div>

            <Card className="ring-0 bg-white rounded-xl border-none overflow-hidden py-0 gap-0">
              <CardHeader className="px-[22px] pt-[18px]">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-[16px] font-semibold text-[#173753]">Kurva Pertumbuhan</CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">WHO Growth Standard (0-24 Bulan)</p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap justify-end">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-[#DCEAF8]" />
                      <span className="text-[11px] font-medium text-[#173753]">Rentang Normal (±2 SD)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-0.5 border-t-2 border-dashed border-[#B9D4EE]" />
                      <span className="text-[11px] font-medium text-[#173753]">Median WHO</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-0.5 bg-[#2E7CE4]" />
                      <span className="text-[11px] font-medium text-[#173753]">{childDataState.name}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-3 px-[22px] pb-[18px]">
                <div className="h-[300px] w-full mt-4">
                  <ChartContainer config={{}} className="h-full w-full">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis
                        dataKey="month"
                        type="number"
                        domain={[0, 24]}
                        ticks={[0, 6, 12, 18, 24]}
                        tickFormatter={(v) => `${v} bln`}
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        padding={{ left: 10, right: 10 }}
                      />
                      <YAxis
                        domain={[yMin, yMax]}
                        ticks={[yMin, yMid, yMax]}
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        width={35}
                      />
                      <ReTooltip content={<GrowthTooltip />} />
                      {/* stacked base (invisible) + band gives a true sd2neg–sd2 range fill */}
                      <Area dataKey="sd2neg" stackId="band" stroke="none" fill="transparent" isAnimationActive={false} />
                      <Area dataKey="band" stackId="band" stroke="none" fill="#DCEAF8" fillOpacity={1} isAnimationActive={false} />
                      <Line
                        type="monotone"
                        dataKey="median"
                        stroke="#B9D4EE"
                        strokeWidth={1.5}
                        strokeDasharray="5 4"
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="actual"
                        stroke="#2E7CE4"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#2E7CE4", strokeWidth: 2, stroke: "#fff" }}
                        activeDot={{ r: 6, fill: "#2E7CE4", strokeWidth: 2, stroke: "#fff" }}
                        connectNulls
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            {/* History Table */}
            <Card className="ring-0 bg-white rounded-xl border-none overflow-hidden py-0 gap-0">
              <CardHeader className="px-[22px] pt-[14px]">
                <div className="flex-none">
                  <CardTitle className="text-[16px] font-semibold text-[#173753] leading-tight">Riwayat Pemeriksaan</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Menampilkan <span className="font-medium text-[#173753]">{childDataState.visits.length}</span> kali pengukuran tercatat
                  </p>
                </div>
              </CardHeader>
              <CardContent className="pt-3 px-[22px] pb-2.5">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#E8E8E8]">
                      <TableHead className="text-[14px] text-[#173753] font-medium pl-2">Tanggal</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">BB</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">TB</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">Status Gizi</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">Kader</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {childDataState.visits.length === 0 ? (
                      <TableRow>
                        <td colSpan={5}>
                          <div className="text-center py-8">
                            <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-[12px] text-muted-foreground">Belum ada riwayat pemeriksaan</p>
                          </div>
                        </td>
                      </TableRow>
                    ) : (
                      childDataState.visits.map((v, i) => (
                        <tr key={i} className="border-b border-[#F0F0F0] hover:bg-[#F7FBFF] transition-colors">
                          <td className="p-3 text-[14px] text-[#173753] pl-2">{v.tgl}</td>
                          <td className="p-3 text-[14px] text-[#173753]">{v.bb.toFixed(1).replace(".", ",")} kg</td>
                          <td className="p-3 text-[14px] text-[#173753]">{v.tb.toFixed(1).replace(".", ",")} cm</td>
                          <td className="p-3">
                            <StatusBadge status={v.status} />
                          </td>
                          <td className="p-3 text-[14px] text-muted-foreground">{v.examiner}</td>
                        </tr>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Right: Ibu/Wali + Saudara Terdaftar + Jadwal Berikutnya */}
          <div className="space-y-4">
            <Card className="ring-0 bg-white rounded-xl border-none overflow-hidden py-0 gap-0">
              <CardHeader className="px-5 pt-[18px]">
                <CardTitle className="text-[16px] font-semibold text-[#173753] leading-tight">Ibu / Wali</CardTitle>
              </CardHeader>
              <CardContent className="pt-3 px-5 pb-[18px]">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="h-11 w-11 rounded-full flex items-center justify-center text-[14px] font-bold flex-shrink-0"
                    style={{
                      background: childDataState.parent.isHamil ? PURPLE_BG : "#F1F5F9",
                      color: childDataState.parent.isHamil ? PURPLE : "#5B7A96"
                    }}
                  >
                    {childDataState.parent.mother.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#173753] truncate">{childDataState.parent.mother}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {childDataState.parent.phone} · {childDataState.parent.username}
                    </p>
                  </div>
                </div>

                {childDataState.parent.isHamil && (
                  <div
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 mb-3 w-fit"
                    style={{ background: PURPLE_BG }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: PURPLE }} />
                    <span className="text-xs font-semibold" style={{ color: PURPLE }}>
                      Sedang hamil{childDataState.parent.gestationalWeek != null ? ` · ${childDataState.parent.gestationalWeek} minggu` : ""}
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <Link
                    href={`/kader/ibu/${childDataState.parent.id}`}
                    className="block text-center px-3 py-2 rounded-lg border border-[#52A9E3]/40 hover:border-[#52A9E3]/60 hover:bg-[#52A9E3]/5 transition-all text-[13px] font-medium text-[#52A9E3] bg-transparent"
                  >
                    Lihat Profil Ibu
                  </Link>
                  <button
                    onClick={() => setResetPasswordOpen(true)}
                    className="w-full text-center px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-[13px] font-medium text-[#173753] bg-transparent"
                  >
                    Reset Password
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card className="ring-0 bg-white rounded-xl border-none overflow-hidden py-0 gap-0">
              <CardHeader className="px-5 pt-[18px]">
                <CardTitle className="text-[16px] font-semibold text-[#173753] leading-tight">Saudara Terdaftar</CardTitle>
              </CardHeader>
              <CardContent className="pt-3 px-5 pb-[18px]">
                {childDataState.siblings.length === 0 ? (
                  <div className="text-center py-4">
                    <Baby className="w-6 h-6 text-gray-300 mx-auto mb-1.5" />
                    <p className="text-[12px] text-muted-foreground">Belum ada saudara terdaftar</p>
                  </div>
                ) : (
                  <div className="space-y-1 -mx-1">
                    {childDataState.siblings.map((s) => (
                      <Link key={s.id} href={`/kader/anak/${s.id}`} className="flex items-center gap-3 px-1 py-2 rounded-lg hover:bg-[#F7FBFF] transition-colors">
                        <div className="h-9 w-9 rounded-full bg-[#DBEAFE] flex items-center justify-center text-[12px] font-bold text-[#1D4ED8] flex-shrink-0">
                          {s.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-[#173753] truncate">{s.name}</p>
                          <p className="text-[11px] text-muted-foreground">{s.age} · {s.status}</p>
                        </div>
                        <span className="text-[11px] font-medium text-[#52A9E3] flex items-center gap-0.5 flex-shrink-0">
                          Lihat <ChevronRight className="w-3 h-3" />
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="ring-0 bg-white rounded-xl border-none overflow-hidden py-0 gap-0">
              <CardHeader className="px-5 pt-[18px]">
                <CardTitle className="text-[16px] font-semibold text-[#173753] leading-tight">Jadwal Berikutnya</CardTitle>
              </CardHeader>
              <CardContent className="pt-3 px-5 pb-[18px]">
                {childDataState.nextCheckDate ? (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#EBF2F8] flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4.5 h-4.5 text-[#52A9E3]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#173753]">
                        Penimbangan {childDataState.nextCheckDate.split(" ")[1]}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        ±{childDataState.nextCheckDate}
                        {childDataState.daysUntilNextCheck != null && (
                          childDataState.daysUntilNextCheck > 0
                            ? ` · H-${childDataState.daysUntilNextCheck}`
                            : childDataState.daysUntilNextCheck === 0
                            ? " · Hari ini"
                            : ` · Terlambat ${Math.abs(childDataState.daysUntilNextCheck)} hari`
                        )}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Calendar className="w-6 h-6 text-gray-300 mx-auto mb-1.5" />
                    <p className="text-[12px] text-muted-foreground">Belum ada jadwal berikutnya</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <CatatKunjunganModal
        open={visitModalOpen}
        onOpenChange={setVisitModalOpen}
        child={{
          id: childDataState.id,
          name: childDataState.name,
          gender: childDataState.gender,
          ageMo: childDataState.ageMo,
        }}
        onSaved={loadChild}
      />

      <IngatkanIbuModal
        open={ingatkanIbuOpen}
        onOpenChange={setIngatkanIbuOpen}
        child={{
          id: childDataState.id,
          name: childDataState.name,
          ibuName: childDataState.parent.mother,
          noHp: childDataState.parent.phone,
          posyanduName: childDataState.posyandu,
        }}
        onSent={loadChild}
      />

      <EditDataAnakModal
        open={editDataOpen}
        onOpenChange={setEditDataOpen}
        anak={{
          id: childDataState.id,
          nama: childDataState.name,
          genderRaw: childDataState.genderRaw,
          birthDateRaw: childDataState.birthDateRaw,
          beratLahir: childDataState.beratLahir,
          panjangLahir: childDataState.panjangLahir,
        }}
        onSaved={loadChild}
      />

      <ResetPasswordModal
        open={resetPasswordOpen}
        onOpenChange={setResetPasswordOpen}
        ibu={{ id: childDataState.parent.id, nama: childDataState.parent.mother, username: childDataState.parent.username }}
      />
    </div>
  )
}
