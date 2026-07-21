"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts"
import {
  ChartContainer, ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { KaderUserPill } from "@/components/kader/kader-user-pill"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, CheckCircle, ArrowUpRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { getCached, setCached } from "@/lib/client-cache"
import {
  getDashboardStats, getRecentMeasurements, getSixMonthTrend,
  getUncheckedChildren, getUncheckedIbuHamil, getTindakLanjutList,
} from "@/lib/actions/kader"
import { Topbar } from "@/components/kader/topbar"
import { IngatkanIbuModal } from "@/components/kader/ingatkan-ibu-modal"
import { IngatkanIbuKehamilanModal } from "@/components/kader/ingatkan-ibu-kehamilan-modal"
import { IngatkanSemuaModal } from "@/components/kader/ingatkan-semua-modal"
import { IngatkanSemuaKehamilanModal } from "@/components/kader/ingatkan-semua-kehamilan-modal"
import { StatusBadge } from "@/components/status-badge"

const trendConfig = {
  cakupanAnak: { label: "Cakupan Anak", color: "#378ADD" },
  cakupanBumil: { label: "Cakupan Bumil", color: "#7F77DD" },
  kasusStunting: { label: "Kasus Stunting", color: "#E24B4A" },
}

interface DashboardStats {
  totalChildren: number
  totalIbuHamil: number
  measuredThisMonth: number
  measuredThisMonthIbu: number
  measuredToday: number
  measuredLast7DaysAnak: number
  measuredLast7DaysIbu: number
  stuntingCount: number
  posyanduName: string
  improvedCount: number
  anakStatus: { total: number; normal: number; risiko: number; stunting: number }
  ibuStatus: { total: number; rendah: number; sedang: number; tinggi: number }
}

interface RecentMeasurement {
  id: string
  waktu: string
  posyandu: string
  nama: string
  status: string
  kader: string
}

interface TrendPoint {
  bulan: string
  cakupanAnak: number
  cakupanBumil: number
  kasusStunting: number
}

interface UncheckedChild {
  id: string
  nama: string
  usia: string
  posyandu: string
  ibuName: string
  noHp: string | null
  terakhirDiingatkan: Date | null
  ageMo: number
  lastCheck: Date | null
  monthsSinceCheck: number | null
}

interface UncheckedIbu {
  id: string
  nama: string
  minggu: number | null
  noHp: string | null
  terakhirDiingatkan: Date | null
  lastCheck: Date | null
  monthsSinceCheck: number | null
}

interface TindakLanjutItem {
  id: string
  type: "anak" | "bumil"
  nama: string
  badge: string
  meta: string
  detail: string
  severity: number
  href: string
}

interface TindakLanjut {
  items: TindakLanjutItem[]
  total: number
  anakCount: number
  bumilCount: number
}

function formatTanggal(d: Date) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short" })
}

// One shared copy line for "belum diperiksa" rows so anak and ibu read the same way.
function belumPeriksaCopy(monthsSinceCheck: number | null, lastCheck: Date | null) {
  if (monthsSinceCheck == null || !lastCheck) return "Belum pernah diperiksa"
  if (monthsSinceCheck <= 0) return `Belum diperiksa bulan ini · terakhir ${formatTanggal(lastCheck)}`
  return `${monthsSinceCheck} bln tidak diperiksa · terakhir ${formatTanggal(lastCheck)}`
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <Card key={i} className="py-0 ring-0"><CardContent className="py-4 px-4 flex flex-col gap-2.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-1.5 w-full rounded-full" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-32" />
          </CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4 items-start">
        <Card className="col-span-2 py-0 gap-0 ring-0"><CardContent className="p-5 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-52 w-full" />
        </CardContent></Card>
        <div className="col-span-1 space-y-4">
          {[0, 1, 2].map(i => (
            <Card key={i} className="py-0 gap-0 ring-0"><CardContent className="p-4 space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent></Card>
          ))}
        </div>
      </div>
    </div>
  )
}

const DASHBOARD_CACHE_KEY = "kader-dashboard"

interface DashboardSnapshot {
  stats: DashboardStats
  recentMeasurements: RecentMeasurement[]
  trend: TrendPoint[]
  uncheckedChildren: UncheckedChild[]
  uncheckedIbu: UncheckedIbu[]
  tindakLanjut: TindakLanjut
}

export default function KaderDashboardPage() {
  const cached = getCached<DashboardSnapshot>(DASHBOARD_CACHE_KEY)
  const [stats, setStats] = useState<DashboardStats | null>(cached?.stats ?? null)
  const [recentMeasurements, setRecentMeasurements] = useState<RecentMeasurement[]>(cached?.recentMeasurements ?? [])
  const [trend, setTrend] = useState<TrendPoint[]>(cached?.trend ?? [])
  const [uncheckedChildren, setUncheckedChildren] = useState<UncheckedChild[]>(cached?.uncheckedChildren ?? [])
  const [uncheckedIbu, setUncheckedIbu] = useState<UncheckedIbu[]>(cached?.uncheckedIbu ?? [])
  const [tindakLanjut, setTindakLanjut] = useState<TindakLanjut>(cached?.tindakLanjut ?? { items: [], total: 0, anakCount: 0, bumilCount: 0 })
  const [loading, setLoading] = useState(!cached)

  const [belumPeriksaTab, setBelumPeriksaTab] = useState<"anak" | "ibu">("anak")
  const [ingatkanAnak, setIngatkanAnak] = useState<UncheckedChild | null>(null)
  const [ingatkanIbu, setIngatkanIbu] = useState<UncheckedIbu | null>(null)
  const [ingatkanSemuaAnakOpen, setIngatkanSemuaAnakOpen] = useState(false)
  const [ingatkanSemuaIbuOpen, setIngatkanSemuaIbuOpen] = useState(false)

  const anakPct = stats && stats.totalChildren > 0 ? Math.round((stats.measuredThisMonth / stats.totalChildren) * 100) : 0
  const ibuPct = stats && stats.totalIbuHamil > 0 ? Math.round((stats.measuredThisMonthIbu / stats.totalIbuHamil) * 100) : 0
  const belumAnak = stats ? stats.totalChildren - stats.measuredThisMonth : 0
  const belumIbu = stats ? stats.totalIbuHamil - stats.measuredThisMonthIbu : 0

  function loadAll() {
    return Promise.all([
      getDashboardStats(),
      getRecentMeasurements(),
      getSixMonthTrend(),
      getUncheckedChildren(),
      getUncheckedIbuHamil(),
      getTindakLanjutList(),
    ]).then(([statsData, recentData, trendData, uncheckedAnakData, uncheckedIbuData, tindakData]) => {
      setStats(statsData)
      setRecentMeasurements(recentData)
      setTrend(trendData)
      setUncheckedChildren(uncheckedAnakData)
      setUncheckedIbu(uncheckedIbuData)
      setTindakLanjut(tindakData)
      setLoading(false)
      setCached<DashboardSnapshot>(DASHBOARD_CACHE_KEY, {
        stats: statsData, recentMeasurements: recentData, trend: trendData,
        uncheckedChildren: uncheckedAnakData, uncheckedIbu: uncheckedIbuData, tindakLanjut: tindakData,
      })
    })
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const posyanduName = stats?.posyanduName ?? "Posyandu"

  return (
    <div className="flex-1 bg-[#EBF2F8] flex flex-col">
      <Topbar
        alertStats={stats ? {
          stuntingCount: stats.stuntingCount,
          berisikoCount: stats.anakStatus.risiko,
          belumDiperiksa: belumAnak + belumIbu,
        } : null}
      />

      <div className="p-6 space-y-5 flex-1">
        {/* Title + User */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-medium">Pusat Pemantauan Stunting</h1>
          <KaderUserPill />
        </div>

        {loading ? <DashboardSkeleton /> : (
        <>
        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-4">
          {/* Card Cakupan Periksa Anak */}
          <Card className="py-0 ring-0">
            <CardContent className="py-4 px-4 flex flex-col gap-2.5">
              <p className="text-[16px] font-medium text-[#173753] leading-tight">
                Cakupan Periksa · Anak
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold text-[#173753] tabular-nums">{stats?.measuredThisMonth ?? 0}</span>
                <span className="text-xs text-muted-foreground">dari {stats?.totalChildren ?? 0} anak · {anakPct}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#E7EEF5] overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{ width: `${anakPct}%`, background: "linear-gradient(90deg,#378ADD,#52A9E3)" }}
                />
              </div>
              <p className="text-xs font-medium flex items-center justify-between">
                <span className="text-[#E24B4A]">{belumAnak} belum diperiksa</span>
                <span className="text-[#15803D] font-semibold">▲ {stats?.measuredLast7DaysAnak ?? 0} minggu ini</span>
              </p>
            </CardContent>
          </Card>

          {/* Card Cakupan Periksa Ibu Hamil */}
          <Card className="py-0 ring-0">
            <CardContent className="py-4 px-4 flex flex-col gap-2.5">
              <p className="text-[16px] font-medium text-[#173753] leading-tight">
                Cakupan Periksa · Ibu Hamil
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold text-[#173753] tabular-nums">{stats?.measuredThisMonthIbu ?? 0}</span>
                <span className="text-xs text-muted-foreground">dari {stats?.totalIbuHamil ?? 0} ibu · {ibuPct}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#EDECFB] overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{ width: `${ibuPct}%`, background: "linear-gradient(90deg,#7F77DD,#A79FF0)" }}
                />
              </div>
              <p className="text-xs font-medium flex items-center justify-between">
                <span className="text-[#E24B4A]">{belumIbu} belum diperiksa</span>
                <span className="text-[#15803D] font-semibold">▲ {stats?.measuredLast7DaysIbu ?? 0} minggu ini</span>
              </p>
            </CardContent>
          </Card>

          {/* Card Perlu Tindak Lanjut (ringkasan) */}
          <Card className="py-0 ring-0">
            <CardContent className="py-4 px-4 flex flex-col gap-2.5">
              <p className="text-[16px] font-medium text-[#173753] leading-tight">
                Perlu Tindak Lanjut
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold text-[#173753] tabular-nums">{tindakLanjut.total}</span>
                <span className="text-xs text-muted-foreground">pasien prioritas bulan ini</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[#E3EFFC] text-[#2C6CB0]">{tindakLanjut.anakCount} anak</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-[#F0EBFB] text-[#6A48C4]">{tindakLanjut.bumilCount} Ibu Hamil</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-3 gap-4 items-start">
          {/* Left: analytics panel (trend + recent activity) */}
          <div className="col-span-2 flex flex-col gap-4">
          {/* Perlu Tindak Lanjut */}
          <Card className="py-0 gap-0 ring-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[16px] font-semibold text-[#173753] leading-tight">Perlu Tindak Lanjut</p>
                {tindakLanjut.total > 0 && (
                  <Link href="/kader/rekap" className="text-xs font-medium text-[#52A9E3] hover:text-[#3D95D1] transition-colors">
                    Lihat semua ({tindakLanjut.total})
                  </Link>
                )}
              </div>

              {tindakLanjut.items.length > 0 ? (
                <div className="flex flex-col mt-2">
                  {tindakLanjut.items.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="group flex items-center gap-2.5 rounded-lg px-3 py-2 -mx-3 transition-colors text-[#173753] hover:bg-[#52A9E3]/8"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-none text-xs font-semibold"
                        style={item.type === "anak" ? { background: "#DBEAFE", color: "#1D4ED8" } : { background: "#F0EBFB", color: "#6A48C4" }}
                      >
                        {item.nama.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-medium truncate">{item.nama}</p>
                          <StatusBadge status={item.badge} className="flex-none text-[10px] px-2 py-0.5" />
                          <span className="text-[10px] font-medium text-[#8CA3B8] uppercase tracking-wide flex-none">
                            {item.meta}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {item.detail}
                        </p>
                      </div>
                      <span className="flex-none text-[11px] font-semibold text-[#52A9E3] border border-[#52A9E3]/40 rounded-[50px] px-3 py-1 transition-colors group-hover:bg-[#52A9E3]/10">
                        Periksa
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#F5F7FA] flex items-center justify-center mb-3">
                    <CheckCircle className="w-6 h-6 text-teal-500" />
                  </div>
                  <p className="text-sm font-medium text-[#173753]">Tidak ada yang perlu ditindaklanjuti</p>
                  <p className="text-xs text-muted-foreground mt-1">Semua pasien dalam kondisi terpantau baik.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="py-0 gap-0 ring-0">
            <CardHeader className="px-5 pt-5 pb-0">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-[16px] font-semibold text-[#173753]">Tren 6 Bulan</CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Cakupan pemeriksaan & kasus stunting</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-end">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-[#378ADD]" />
                    <span className="text-[11px] font-medium text-[#173753]">Cakupan Anak</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-[#7F77DD]" />
                    <span className="text-[11px] font-medium text-[#173753]">Cakupan Bumil</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-[#E24B4A]" />
                    <span className="text-[11px] font-medium text-[#173753]">Kasus Stunting</span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="px-5 pt-3 pb-4">
              <ChartContainer config={trendConfig} className="h-52 w-full">
                <LineChart data={trend} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="bulan"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    padding={{ left: 10, right: 10 }}
                  />
                  <YAxis yAxisId="pct" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={34} />
                  <YAxis yAxisId="count" orientation="right" allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={26} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line yAxisId="pct" type="monotone" dataKey="cakupanAnak" stroke="#378ADD" strokeWidth={2} dot={false} />
                  <Line yAxisId="pct" type="monotone" dataKey="cakupanBumil" stroke="#7F77DD" strokeWidth={2} dot={false} />
                  <Line yAxisId="count" type="monotone" dataKey="kasusStunting" stroke="#E24B4A" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="py-0 gap-0 ring-0">
            <CardContent className="px-5 pt-5 pb-5">
              <p className="text-[16px] font-semibold text-[#173753] mb-3">Pemeriksaan Terbaru</p>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs pl-0">Waktu</TableHead>
                    <TableHead className="text-xs">Posyandu</TableHead>
                    <TableHead className="text-xs">Nama Anak</TableHead>
                    <TableHead className="text-xs">Status Gizi</TableHead>
                    <TableHead className="text-xs">Kader</TableHead>
                    <TableHead className="text-xs pr-0 text-right">Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentMeasurements.length > 0 ? (
                    recentMeasurements.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs pl-0">{row.waktu}</TableCell>
                        <TableCell className="text-xs">{row.posyandu}</TableCell>
                        <TableCell className="text-xs font-medium">
                          <Link href={`/kader/anak/${row.id}`} className="hover:text-[#52A9E3] transition-colors">
                            {row.nama}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={row.status} />
                        </TableCell>
                        <TableCell className="text-xs">{row.kader}</TableCell>
                        <TableCell className="pr-0 text-right">
                          <Link
                            href={`/kader/anak/${row.id}`}
                            aria-label={`Detail pemeriksaan ${row.nama}`}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full text-muted-foreground hover:text-[#52A9E3] hover:bg-[#52A9E3]/10 transition-colors"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={6} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-[#F5F7FA] flex items-center justify-center mb-3">
                            <Search className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-medium text-[#173753]">Belum ada pemeriksaan</p>
                          <p className="text-xs text-muted-foreground mt-1">Data pemeriksaan terbaru akan muncul di sini.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          </div>

          {/* Right: operations panel */}
          <div className="col-span-1 flex flex-col gap-4">
            {/* Belum Periksa Bulan Ini */}
            <Card className="py-0 gap-0 ring-0">
              <CardContent className="p-4">
                <p className="text-[16px] font-semibold text-[#173753] leading-tight">Belum Periksa Bulan Ini</p>

                <div className="flex items-center gap-1 mt-3 p-0.5 bg-[#F1F5F9] rounded-full">
                  <button
                    type="button"
                    onClick={() => setBelumPeriksaTab("anak")}
                    className={cn(
                      "flex-1 h-7 rounded-full text-xs font-semibold transition-colors tabular-nums",
                      belumPeriksaTab === "anak" ? "bg-white text-[#173753] shadow-sm" : "text-muted-foreground hover:text-[#173753]"
                    )}
                  >
                    Anak ({uncheckedChildren.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBelumPeriksaTab("ibu")}
                    className={cn(
                      "flex-1 h-7 rounded-full text-xs font-semibold transition-colors tabular-nums",
                      belumPeriksaTab === "ibu" ? "bg-white text-[#173753] shadow-sm" : "text-muted-foreground hover:text-[#173753]"
                    )}
                  >
                    Ibu Hamil ({uncheckedIbu.length})
                  </button>
                </div>

                <div className="space-y-1 mt-3">
                  {belumPeriksaTab === "anak" ? (
                    uncheckedChildren.length > 0 ? (
                      uncheckedChildren.slice(0, 5).map((anak) => {
                        const recentlyReminded = !!(anak.terakhirDiingatkan && new Date(anak.terakhirDiingatkan) > new Date(Date.now() - 24 * 60 * 60 * 1000))
                        return (
                          <Link
                            key={anak.id}
                            href={`/kader/anak/${anak.id}`}
                            className="group flex items-center gap-2.5 rounded-lg px-3 py-1.5 -mx-3 cursor-pointer transition-colors text-[#173753] hover:bg-[#52A9E3]/8"
                          >
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center flex-none text-xs font-semibold"
                              style={{ background: "#DBEAFE", color: "#1D4ED8" }}
                            >
                              {anak.nama.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{anak.nama}</p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {belumPeriksaCopy(anak.monthsSinceCheck, anak.lastCheck)}
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={recentlyReminded}
                              onClick={(e) => { e.preventDefault(); if (!recentlyReminded) setIngatkanAnak(anak) }}
                              className={cn(
                                "flex-none inline-flex items-center justify-center text-[11px] font-semibold rounded-[50px] h-7 px-3 border transition-colors",
                                recentlyReminded
                                  ? "border-transparent bg-teal-50/50 text-teal-600 cursor-default"
                                  : "border-[#52A9E3]/40 text-[#52A9E3] bg-transparent hover:bg-[#52A9E3]/10"
                              )}
                            >
                              {recentlyReminded ? "Diingatkan" : "Ingatkan"}
                            </button>
                          </Link>
                        )
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-[#F5F7FA] flex items-center justify-center mb-3">
                          <CheckCircle className="w-6 h-6 text-teal-500" />
                        </div>
                        <p className="text-sm font-medium text-[#173753]">Semua anak sudah periksa</p>
                        <p className="text-xs text-muted-foreground mt-1">Tidak ada anak yang terlewat bulan ini.</p>
                      </div>
                    )
                  ) : (
                    uncheckedIbu.length > 0 ? (
                      uncheckedIbu.slice(0, 5).map((m) => {
                        const recentlyReminded = !!(m.terakhirDiingatkan && new Date(m.terakhirDiingatkan) > new Date(Date.now() - 24 * 60 * 60 * 1000))
                        return (
                          <Link
                            key={m.id}
                            href={`/kader/ibu/${m.id}`}
                            className="group flex items-center gap-2.5 rounded-lg px-3 py-1.5 -mx-3 cursor-pointer transition-colors text-[#173753] hover:bg-[#52A9E3]/8"
                          >
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center flex-none text-xs font-semibold"
                              style={{ background: "#F0EBFB", color: "#6A48C4" }}
                            >
                              {m.nama.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{m.nama}</p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {belumPeriksaCopy(m.monthsSinceCheck, m.lastCheck)}
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={recentlyReminded}
                              onClick={(e) => { e.preventDefault(); if (!recentlyReminded) setIngatkanIbu(m) }}
                              className={cn(
                                "flex-none inline-flex items-center justify-center text-[11px] font-semibold rounded-[50px] h-7 px-3 border transition-colors",
                                recentlyReminded
                                  ? "border-transparent bg-teal-50/50 text-teal-600 cursor-default"
                                  : "border-[#52A9E3]/40 text-[#52A9E3] bg-transparent hover:bg-[#52A9E3]/10"
                              )}
                            >
                              {recentlyReminded ? "Diingatkan" : "Ingatkan"}
                            </button>
                          </Link>
                        )
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-[#F5F7FA] flex items-center justify-center mb-3">
                          <CheckCircle className="w-6 h-6 text-teal-500" />
                        </div>
                        <p className="text-sm font-medium text-[#173753]">Semua ibu hamil sudah periksa</p>
                        <p className="text-xs text-muted-foreground mt-1">Tidak ada ibu hamil yang terlewat bulan ini.</p>
                      </div>
                    )
                  )}
                </div>

                {(belumPeriksaTab === "anak" ? uncheckedChildren.length : uncheckedIbu.length) > 0 && (
                  <button
                    type="button"
                    onClick={() => belumPeriksaTab === "anak" ? setIngatkanSemuaAnakOpen(true) : setIngatkanSemuaIbuOpen(true)}
                    className="w-full mt-3 h-9 rounded-full bg-[#52A9E3] text-white text-xs font-semibold hover:bg-[#3D95D1] transition-colors"
                  >
                    Ingatkan semua ({belumPeriksaTab === "anak" ? uncheckedChildren.length : uncheckedIbu.length})
                  </button>
                )}
              </CardContent>
            </Card>

            {/* Status Bulan Ini */}
            <Card className="py-0 gap-0 ring-0">
              <CardContent className="p-4">
                <p className="text-[16px] font-semibold text-[#173753] leading-tight mb-3">Status Bulan Ini</p>

                <div>
                  <p className="text-[10px] font-bold text-[#8CA3B8] leading-tight mb-2 uppercase tracking-wide">
                    Status Gizi Anak · {stats?.anakStatus.total ?? 0}
                  </p>
                  <div className="h-2 w-full rounded-full overflow-hidden flex bg-[#F1F5F9]">
                    {stats && stats.anakStatus.total > 0 && (
                      <>
                        <div style={{ width: `${(stats.anakStatus.normal / stats.anakStatus.total) * 100}%`, background: "#378ADD" }} />
                        <div style={{ width: `${(stats.anakStatus.risiko / stats.anakStatus.total) * 100}%`, background: "#EF9F27" }} />
                        <div style={{ width: `${(stats.anakStatus.stunting / stats.anakStatus.total) * 100}%`, background: "#E24B4A" }} />
                      </>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 mt-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#173753] font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: "#378ADD" }} /> Normal
                      </span>
                      <span className="font-semibold text-[#173753]">{stats?.anakStatus.normal ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#173753] font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: "#EF9F27" }} /> Risiko Stunting
                      </span>
                      <span className="font-semibold text-[#173753]">{stats?.anakStatus.risiko ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#173753] font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: "#E24B4A" }} /> Stunting
                      </span>
                      <span className="font-semibold text-[#173753]">{stats?.anakStatus.stunting ?? 0}</span>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-border my-4" />

                <div>
                  <p className="text-[10px] font-bold text-[#8CA3B8] leading-tight mb-2 uppercase tracking-wide">
                    Status Ibu Hamil · {stats?.ibuStatus.total ?? 0}
                  </p>
                  <div className="h-2 w-full rounded-full overflow-hidden flex bg-[#F1F5F9]">
                    {stats && stats.ibuStatus.total > 0 && (
                      <>
                        <div style={{ width: `${(stats.ibuStatus.rendah / stats.ibuStatus.total) * 100}%`, background: "#22C55E" }} />
                        <div style={{ width: `${(stats.ibuStatus.sedang / stats.ibuStatus.total) * 100}%`, background: "#F97316" }} />
                        <div style={{ width: `${(stats.ibuStatus.tinggi / stats.ibuStatus.total) * 100}%`, background: "#E24B4A" }} />
                      </>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 mt-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#173753] font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: "#22C55E" }} /> Risiko Rendah
                      </span>
                      <span className="font-semibold text-[#173753]">{stats?.ibuStatus.rendah ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#173753] font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: "#F97316" }} /> Risiko Sedang
                      </span>
                      <span className="font-semibold text-[#173753]">{stats?.ibuStatus.sedang ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#173753] font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: "#E24B4A" }} /> Risiko Tinggi
                      </span>
                      <span className="font-semibold text-[#173753]">{stats?.ibuStatus.tinggi ?? 0}</span>
                    </div>
                  </div>
                </div>

                {(stats?.improvedCount ?? 0) > 0 && (
                  <>
                    <div className="h-px bg-border my-4" />
                    <p className="text-xs font-semibold text-[#15803D]">
                      ▲ {stats?.improvedCount} pasien membaik dari bulan lalu
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        </>
        )}
      </div>

      {ingatkanAnak && (
        <IngatkanIbuModal
          open={!!ingatkanAnak}
          onOpenChange={(o) => { if (!o) setIngatkanAnak(null) }}
          child={{
            id: ingatkanAnak.id,
            name: ingatkanAnak.nama,
            ibuName: ingatkanAnak.ibuName,
            noHp: ingatkanAnak.noHp,
          }}
          onSent={() => { getUncheckedChildren().then(setUncheckedChildren) }}
        />
      )}

      {ingatkanIbu && (
        <IngatkanIbuKehamilanModal
          open={!!ingatkanIbu}
          onOpenChange={(o) => { if (!o) setIngatkanIbu(null) }}
          ibu={{
            id: ingatkanIbu.id,
            nama: ingatkanIbu.nama,
            noHp: ingatkanIbu.noHp,
          }}
          onSent={() => { getUncheckedIbuHamil().then(setUncheckedIbu) }}
        />
      )}

      <IngatkanSemuaModal
        open={ingatkanSemuaAnakOpen}
        onOpenChange={setIngatkanSemuaAnakOpen}
        posyanduName={posyanduName}
        childrenList={uncheckedChildren.map(a => ({
          id: a.id, name: a.nama, ibuName: a.ibuName, noHp: a.noHp, terakhirDiingatkan: a.terakhirDiingatkan, ageMo: a.ageMo,
        }))}
        onSent={() => { getUncheckedChildren().then(setUncheckedChildren) }}
      />

      <IngatkanSemuaKehamilanModal
        open={ingatkanSemuaIbuOpen}
        onOpenChange={setIngatkanSemuaIbuOpen}
        posyanduName={posyanduName}
        ibuList={uncheckedIbu.map(m => ({ id: m.id, nama: m.nama, minggu: m.minggu, terakhirDiingatkan: m.terakhirDiingatkan }))}
        onSent={() => { getUncheckedIbuHamil().then(setUncheckedIbu) }}
      />
    </div>
  )
}
