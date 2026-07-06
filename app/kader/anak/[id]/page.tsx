"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ChevronRight,
  Search,
  LogOut,
  TriangleAlert,
  Clock,
  ChevronDown,
  Calendar,
  Baby,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { signOut, useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { getStatusStyle } from "@/lib/status-styles"
import { NotificationBell } from "@/components/kader/notification-bell"
import { getChildDetail } from "@/lib/actions/kader"
import { StatusBadge } from "@/components/status-badge"
import { CatatKunjunganModal } from "@/components/kader/catat-kunjungan-modal"

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer
} from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"]

function useTime() {
  const [time, setTime] = useState(() => {
    const n = new Date()
    return `${n.getDate()} ${MONTHS_ID[n.getMonth()]} ${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`
  })
  useEffect(() => {
    const fmt = () => {
      const n = new Date()
      return `${n.getDate()} ${MONTHS_ID[n.getMonth()]} ${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`
    }
    const id = setInterval(() => setTime(fmt()), 60_000)
    return () => clearInterval(id)
  }, [])
  return time
}

// WHO Reference Data (Boys 0-24 months)
const WHO_DATA = Array.from({ length: 25 }, (_, i) => ({
  month: i,
  wtMedian: [3.3,4.5,5.6,6.4,7.0,7.5,7.9,8.3,8.6,8.9,9.2,9.4,9.6,9.9,10.1,10.3,10.5,10.7,10.9,11.1,11.3,11.5,11.7,11.9,12.0][i],
  wtSD2:    [2.5,3.4,4.3,4.9,5.5,5.9,6.3,6.7,6.9,7.2,7.5,7.7,7.8,8.0,8.2,8.4,8.5,8.7,8.9,9.1,9.2,9.4,9.5,9.7,9.8][i],
  wtSD3:    [2.1,2.9,3.8,4.4,4.9,5.3,5.7,6.0,6.3,6.5,6.7,7.0,7.1,7.3,7.4,7.6,7.7,7.9,8.1,8.2,8.4,8.5,8.6,8.8,8.9][i],
  htMedian: [49.9,54.7,58.4,61.4,63.9,65.9,67.6,69.2,70.6,72.0,73.3,74.5,75.7,76.9,78.0,79.1,80.2,81.2,82.3,83.2,84.2,85.1,86.0,86.9,87.8][i],
  htSD2:    [46.1,50.8,54.4,57.3,59.7,61.7,63.3,64.8,66.2,67.5,68.7,69.9,71.0,72.2,73.3,74.4,75.3,76.3,77.2,78.1,79.1,79.9,80.9,81.6,82.7][i],
  htSD3:    [44.2,48.9,52.4,55.3,57.6,59.6,61.2,62.7,64.0,65.2,66.5,67.6,68.6,69.8,70.9,71.9,72.9,73.9,74.7,75.6,76.6,77.4,78.4,79.1,80.2][i],
}))

// ============ DESIGN TOKENS (mapped to project palette) ============
const NAVY = "#173753"
const ACCENT = "#52A9E3"

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

export default function ChildDetailPage() {
  const { data: session } = useSession()
  const time = useTime()
  const params = useParams()
  const childId = (params?.id as string) ?? "1"
  const [childDataState, setChildDataState] = useState<ChildDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [visitModalOpen, setVisitModalOpen] = useState(false)

  const loadChild = () => {
    if (childId) {
      getChildDetail(childId).then((data) => {
        setChildDataState(data as unknown as ChildDetail)
        setLoading(false)
      })
    }
  }

  useEffect(() => {
    loadChild()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId])

  if (loading) return <div className="p-8">Loading...</div>
  if (!childDataState) return <div className="p-8">Anak tidak ditemukan</div>

  const chartData = WHO_DATA.map((d, i) => {
    const visit = childDataState.visits.find((v) => parseInt(v.usia) === i)
    return {
      ...d,
      wtActual: visit ? visit.bb : null,
      htActual: visit ? visit.tb : null,
    }
  })

  return (
    <div className="flex-1 bg-[#EBF2F8] flex flex-col">
      {/* Topbar */}
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
          <span className="text-xs text-[#173753] truncate font-medium">6 pasien belum diperiksa bulan ini</span>
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

      <div className="p-6 lg:p-8 space-y-6">
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
            <div className="flex items-center gap-2 pl-1 pr-3 py-1 bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-teal-100 text-teal-700 text-xs font-semibold">
                  {session?.user?.name?.slice(0, 2).toUpperCase() ?? "ZA"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs text-[#173753] font-medium leading-none">{session?.user?.name ?? "Kader"}</p>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">Kader {childDataState.posyandu}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Hero Card */}
        <div className="bg-white rounded-2xl shadow-[2px_2px_8px_rgba(0,0,0,0.08)] px-6 py-5 flex items-center gap-5">
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
            {/* Periksa Sekarang — opens Pemeriksaan Anak modal */}
            <Button
              onClick={() => setVisitModalOpen(true)}
              className="gap-1.5 text-xs h-9 px-4 rounded-[50px] text-white shadow-[0_4px_12px_rgba(82,169,227,0.3)] hover:opacity-90 transition-opacity"
              style={{ background: `linear-gradient(to right, ${ACCENT}, #93D1F7)` }}
            >
              Periksa Sekarang
            </Button>

            {/* Ingatkan Ibu — outlined style */}
            <Button
              variant="ghost"
              className="gap-1.5 text-xs h-9 px-4 rounded-[50px] text-[#52A9E3] border border-[#52A9E3]/40 bg-[#52A9E3]/5 hover:bg-[#52A9E3]/10 hover:border-[#52A9E3]/60 transition-all"
            >
              Ingatkan Ibu
            </Button>

            {/* Dot menu */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full bg-gray-100 hover:bg-gray-200 text-[#173753] transition-colors flex-shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="3" r="1.5" />
                <circle cx="8" cy="8" r="1.5" />
                <circle cx="8" cy="13" r="1.5" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Stats + Growth Chart + Ibu/Wali */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left: 4 stat cards + growth chart */}
          <div className="lg:col-span-2 space-y-6">
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
                <div key={s.label} className="bg-white rounded-2xl shadow-[2px_2px_8px_rgba(0,0,0,0.08)] py-3.5 px-4">
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

            <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl border-none overflow-hidden py-0 gap-0">
              <CardHeader className="px-[22px] pt-[18px]">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-[16px] font-semibold text-[#173753]">Kurva Pertumbuhan</CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">WHO Growth Standard (0-24 Bulan)</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-[#173753]" />
                    <span className="text-[11px] font-medium text-[#173753]">Aktual</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-3 px-[22px] pb-[18px]">
                <div className="h-[300px] w-full mt-4">
                  <ChartContainer config={{ wtActual: { color: NAVY }, htActual: { color: ACCENT } }} className="h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                        <defs>
                          <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={NAVY} stopOpacity={0.1}/>
                            <stop offset="95%" stopColor={NAVY} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                          padding={{ left: 10, right: 10 }}
                        />
                        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={35} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area
                          type="monotone"
                          dataKey="htSD2"
                          stroke="#E5E7EB"
                          fill="#F3F4F6"
                          strokeWidth={1}
                          fillOpacity={1}
                          name="Normal (SD-2)"
                        />
                        <Area
                          type="monotone"
                          dataKey="htMedian"
                          stroke="#10B981"
                          fill="#ECFDF5"
                          strokeWidth={1.5}
                          fillOpacity={0.4}
                          name="Median"
                        />
                        <Area
                          type="monotone"
                          dataKey="htActual"
                          stroke={ACCENT}
                          strokeWidth={3}
                          fill="url(#colorActual)"
                          dot={{ r: 4, fill: ACCENT, strokeWidth: 2, stroke: "#fff" }}
                          activeDot={{ r: 6, fill: ACCENT, strokeWidth: 2, stroke: "#fff" }}
                          name="Tinggi Aktual"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            {/* History Table */}
            <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl border-none overflow-hidden py-0 gap-0">
              <CardHeader className="px-[22px] pt-[14px]">
                <div className="flex-none">
                  <CardTitle className="text-[16px] font-semibold text-[#173753] leading-tight">Riwayat Pengukuran</CardTitle>
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
                    {childDataState.visits.map((v, i) => (
                      <tr key={i} className="border-b border-[#F0F0F0] hover:bg-[#F7FBFF] transition-colors">
                        <td className="p-3 text-[14px] text-[#173753] pl-2">{v.tgl}</td>
                        <td className="p-3 text-[14px] text-[#173753]">{v.bb.toFixed(1).replace(".", ",")} kg</td>
                        <td className="p-3 text-[14px] text-[#173753]">{v.tb.toFixed(1).replace(".", ",")} cm</td>
                        <td className="p-3">
                          <StatusBadge status={v.status} />
                        </td>
                        <td className="p-3 text-[14px] text-muted-foreground">{v.examiner}</td>
                      </tr>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Right: Ibu/Wali + Saudara Terdaftar + Jadwal Berikutnya */}
          <div className="space-y-6">
            <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl border-none overflow-hidden py-0 gap-0">
              <CardHeader className="px-5 pt-[18px]">
                <CardTitle className="text-[16px] font-semibold text-[#173753] leading-tight">Ibu / Wali</CardTitle>
              </CardHeader>
              <CardContent className="pt-3 px-5 pb-[18px]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-11 w-11 rounded-full bg-[#DBEAFE] flex items-center justify-center text-[14px] font-bold text-[#1D4ED8] flex-shrink-0">
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
                  <div className="flex items-center gap-1.5 rounded-full bg-pink-50 border border-pink-100 px-3 py-1.5 mb-3 w-fit">
                    <span className="h-1.5 w-1.5 rounded-full bg-pink-500" />
                    <span className="text-[11px] font-semibold text-pink-700">
                      Sedang hamil{childDataState.parent.gestationalWeek != null ? ` · ${childDataState.parent.gestationalWeek} minggu` : ""}
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <Link
                    href={`/kader/ibu/${childDataState.parent.id}`}
                    className="block text-center px-3 py-2 rounded-lg bg-[#F7FBFF] hover:bg-[#EBF2F8] transition-colors text-[13px] font-medium text-[#173753]"
                  >
                    Lihat Profil Ibu
                  </Link>
                  <button className="w-full text-center px-3 py-2 rounded-lg bg-[#F7FBFF] hover:bg-[#EBF2F8] transition-colors text-[13px] font-medium text-[#173753]">
                    Reset Password Akun
                  </button>
                </div>

                <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-[#F0F0F0]">
                  Hasil setiap pemeriksaan otomatis terkirim ke aplikasi ibu.
                </p>
              </CardContent>
            </Card>

            <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl border-none overflow-hidden py-0 gap-0">
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
                        <div className="h-9 w-9 rounded-xl bg-[#DBEAFE] flex items-center justify-center text-[12px] font-bold text-[#1D4ED8] flex-shrink-0">
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

            <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl border-none overflow-hidden py-0 gap-0">
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
                  <p className="text-[12px] text-muted-foreground text-center py-2">Belum ada jadwal berikutnya</p>
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
    </div>
  )
}
