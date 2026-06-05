"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  AreaChart, Area, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, PolarAngleAxis,
} from "recharts"
import {
  ChartContainer, ChartTooltip,
  ChartTooltipContent, ChartLegend, ChartLegendContent,
} from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Bell, LogOut, TriangleAlert, Phone,
  ChevronDown, TrendingUp, Clock, Search,
  ChevronLeft, ChevronRight, CheckCircle,
} from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { getDashboardStats, getRecentMeasurements, getWeeklyData, getUncheckedChildren } from "@/lib/actions/kader"

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

function MonthPicker({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(value.getFullYear())
  const label = `${MONTHS_ID[value.getMonth()]} ${value.getFullYear()}`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 cursor-pointer">
        {label}
        <ChevronDown className="w-3 h-3" />
      </PopoverTrigger>
      <PopoverContent className="w-44 p-2" align="end">
        <div className="flex items-center justify-between mb-2 px-1">
          <button onClick={() => setViewYear(y => y - 1)} className="hover:text-foreground text-muted-foreground">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium">{viewYear}</span>
          <button onClick={() => setViewYear(y => y + 1)} className="hover:text-foreground text-muted-foreground">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {MONTHS_ID.map((m, i) => (
            <button
              key={m}
              onClick={() => { onChange(new Date(viewYear, i, 1)); setOpen(false) }}
              className={cn(
                "text-xs py-1 rounded hover:bg-[#52A9E3] hover:text-[#F5F7FA]",
                value.getMonth() === i && value.getFullYear() === viewYear
                  ? "bg-[#173753] text-[#F5F7FA]"
                  : "text-[#173753]"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

const weeklyConfig = {
  stunting: { label: "Anak Stunting & Risiko", color: "#E24B4A" },
  normal: { label: "Anak Normal", color: "#378ADD" },
}

const harianData = [
  { jam: "07:00", nilai: 5 },
  { jam: "08:00", nilai: 15 },
  { jam: "09:00", nilai: 30 },
  { jam: "10:00", nilai: 25 },
  { jam: "11:00", nilai: 20 },
  { jam: "12:00", nilai: 10 },
  { jam: "13:00", nilai: 8 },
]

const posyanduRanking = [
  { nama: "Posyandu Mawar", nilai: 15 },
  { nama: "Posyandu Melati", nilai: 13 },
  { nama: "Posyandu Kenanga", nilai: 11 },
  { nama: "Posyandu Anggrek", nilai: 14 },
  { nama: "Posyandu Dahlia", nilai: 6 },
  { nama: "Posyandu Aster", nilai: 8 },
  { nama: "Posyandu Kamboja", nilai: 12 },
  { nama: "Posyandu Seroja", nilai: 9 },
  { nama: "Posyandu Tulip", nilai: 7 },
]

function statusBadge(status: string) {
  const map: Record<string, string> = {
    "Normal": "bg-green-100 text-green-800",
    "Stunting Berat": "bg-red-100 text-red-800",
    "Risiko Stunting": "bg-amber-100 text-amber-800",
    "Gizi Kurang": "bg-purple-100 text-purple-800",
  }
  return map[status] ?? "bg-gray-100 text-gray-800"
}

function tindakBadge(tindak: string) {
  const map: Record<string, string> = {
    "Selesai": "bg-green-100 text-green-800",
    "Dipantau": "bg-amber-100 text-amber-800",
    "Perlu Intervensi": "bg-red-100 text-red-800",
  }
  return map[tindak] ?? "bg-gray-100 text-gray-800"
}

interface DashboardStats {
  totalChildren: number
  measuredThisMonth: number
  measuredToday: number
  stuntingCount: number
  posyanduName: string
  statusData?: { name: string; value: number; fill: string }[]
  improvedCount?: number
}

interface RecentMeasurement {
  id: string
  waktu: string
  posyandu: string
  nama: string
  status: string
  tindak: string
  kader: string
}

interface WeeklyData {
  hari: string
  stunting: number
  normal: number
}

interface UncheckedChild {
  id: string
  nama: string
  usia: string
  posyandu: string
  warna: string
}

export default function KaderDashboardPage() {
  const { data: session } = useSession()
  const time = useTime()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentMeasurements, setRecentMeasurements] = useState<RecentMeasurement[]>([])
  const [weeklyDataState, setWeeklyDataState] = useState<WeeklyData[]>([])
  const [uncheckedChildren, setUncheckedChildren] = useState<UncheckedChild[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getDashboardStats(),
      getRecentMeasurements(),
      getWeeklyData(),
      getUncheckedChildren()
    ]).then(([statsData, recentData, weeklyData, uncheckedData]) => {
      setStats(statsData)
      setRecentMeasurements(recentData)
      setWeeklyDataState(weeklyData)
      setUncheckedChildren(uncheckedData)
      setLoading(false)
    })
  }, [])

  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [selectedMonthGizi, setSelectedMonthGizi] = useState(new Date())
  const [selectedMonthHarian, setSelectedMonthHarian] = useState(new Date())
  const [selectedMonthWeekly, setSelectedMonthWeekly] = useState(new Date())
  const [selectedMonthDistribusi, setSelectedMonthDistribusi] = useState(new Date())
  const [selectedMonthPosyandu, setSelectedMonthPosyandu] = useState(new Date())

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
          <span className="text-xs text-[#173753] truncate font-medium">
            {stats ? `${stats.totalChildren - stats.measuredThisMonth} pasien belum diperiksa bulan ini` : "Loading..."}
          </span>
          <span className="text-xs text-muted-foreground flex-none font-medium">| {stats?.posyanduName || "Loading..."}</span>
        </div>
        <div className="flex items-center gap-2 flex-none">
          <div className="flex items-center gap-2 px-4 h-8 text-xs text-[#173753] bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
            <Clock className="w-3.5 h-3.5" />
            <span className="tabular-nums">{time || "—"}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 bg-white rounded-full shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-[#173753] hover:bg-white/80">
            <Bell className="w-4 h-4" />
          </Button>
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

      <div className="p-6 space-y-5 flex-1">
        {/* Title + User */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-medium">Pusat Pemantauan Stunting</h1>
          <div className="flex items-center gap-2 pl-1 pr-3 py-1 bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-teal-100 text-teal-700 text-sm font-semibold">
                {session?.user?.name?.slice(0, 2).toUpperCase() ?? "ZA"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs text-[#173753] font-medium leading-none">{session?.user?.name ?? "Kader"}</p>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">Kader {stats?.posyanduName || "..."}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-4 gap-4">
          {/* Left 3 cols */}
          <div className="col-span-3 space-y-4">
            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-4">
              {/* Card Hasil Pemeriksaan */}
              <Card className="h-38.75 ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
                <CardContent className="p-4 h-full flex flex-col justify-center">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-[14px] font-medium text-[#173753] leading-tight">Hasil Pemeriksaan<br />Bulan Ini</p>
                    <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl text-[#173753] font-medium">{stats?.measuredThisMonth ?? 0}</span>
                        <span className="text-xs font-medium text-muted-foreground">/ {stats?.totalChildren ?? 0}</span>
                      </div>
                      <p className="text-xs font-medium text-muted-foreground">anak diperiksa</p>
                      <p className="text-xs text-green-600 mt-2 flex items-center gap-1 font-medium">
                        <TrendingUp className="w-3 h-3" />
                        Updated just now
                      </p>
                    </div>
                    <ChartContainer config={{ value: { color: "#93D1F7" } }} className="h-21 w-21">
                      <RadialBarChart
                        data={[{ value: stats && stats.totalChildren > 0 ? (stats.measuredThisMonth / stats.totalChildren) * 100 : 0 }]}
                        startAngle={90}
                        endAngle={-270}
                        innerRadius={34}
                        outerRadius={40}
                      >
                        <defs>
                          <linearGradient id="radialGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#378ADD" />
                            <stop offset="100%" stopColor="#93D1F7" />
                          </linearGradient>
                        </defs>
                        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                        <RadialBar dataKey="value" background={{ fill: "#e5e7eb" }} cornerRadius={10} fill="url(#radialGrad)" />
                        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize={16} fontWeight={600} fill="#173753">
                          {stats && stats.totalChildren > 0 ? Math.round((stats.measuredThisMonth / stats.totalChildren) * 100) : 0}%
                        </text>
                      </RadialBarChart>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Card Status Gizi */}
              <Card className="h-38.75 ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
                <CardContent className="p-4 h-full flex flex-col justify-center">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-[14px] font-medium text-[#173753] leading-tight">Status Gizi<br />Bulan Ini</p>
                    <MonthPicker value={selectedMonthGizi} onChange={setSelectedMonthGizi} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-medium text-[#173753]">{stats?.stuntingCount ?? 0}</span>
                        <span className="text-xs font-medium text-muted-foreground">/ {stats?.measuredThisMonth ?? 0}</span>
                      </div>
                      <p className="text-xs font-medium text-muted-foreground">anak stunting</p>
                      <p className="text-xs text-green-600 mt-2 flex items-center gap-1 font-medium">
                        <TrendingUp className="w-3 h-3" />
                        Updated just now
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xl font-medium text-[#173753]">
                        {stats && stats.measuredThisMonth > 0 ? Math.round((stats.stuntingCount / stats.measuredThisMonth) * 100) : 0}%
                      </span>
                      <ChartContainer config={{ v: { color: "#7F77DD" } }} className="h-10 w-24">
                        <AreaChart data={[{v:5},{v:8},{v:6},{v:12},{v:9},{v:15},{v:10}]} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                          <Area type="monotone" dataKey="v" stroke="#7F77DD" fill="#7F77DD" fillOpacity={0.2} strokeWidth={1.5} dot={false} />
                        </AreaChart>
                      </ChartContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card Tren Harian */}
              <Card className="h-38.75 ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
                <CardContent className="p-4 h-full flex flex-col justify-center">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-[14px] font-medium text-[#173753] leading-tight">Tren Pemeriksaan<br />Harian</p>
                    <MonthPicker value={selectedMonthHarian} onChange={setSelectedMonthHarian} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-medium text-[#173753]">{stats?.measuredToday || 0}</span>
                        <span className="text-xs font-medium text-muted-foreground">/ {stats?.totalChildren || 0}</span>
                      </div>
                      <p className="text-xs font-medium text-muted-foreground">anak diperiksa hari ini</p>
                      <p className="text-xs font-medium text-muted-foreground mt-2 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                        jam sibuk
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xl font-medium text-[#173753]">60%</span>
                      <ChartContainer config={{ nilai: { color: "#E24B4A" } }} className="h-10 w-24">
                        <AreaChart data={harianData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                          <XAxis dataKey="jam" hide />
                          <Area type="monotone" dataKey="nilai" stroke="#E24B4A" fill="#E24B4A" fillOpacity={0.2} strokeWidth={1.5} dot={false} />
                        </AreaChart>
                      </ChartContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Weekly Chart */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="col-span-2 ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
                <CardContent className="px-4">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-[14px] font-medium text-[#173753] leading-tight">Tren Pemeriksaan Mingguan</p>
                    <MonthPicker value={selectedMonthWeekly} onChange={setSelectedMonthWeekly} />
                  </div>
                  <ChartContainer config={weeklyConfig} className="h-56 w-full">
                    <AreaChart data={weeklyDataState} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis 
                        dataKey="hari" 
                        tick={{ fontSize: 11 }} 
                        tickLine={false} 
                        axisLine={false}
                        padding={{ left: 10, right: 10 }}
                      />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent className="pb-3" />} />
                      <Area type="monotone" dataKey="stunting" stroke="#E24B4A" fill="#E24B4A" fillOpacity={0.15} strokeWidth={2} dot={false} />
                      <Area type="monotone" dataKey="normal" stroke="#378ADD" fill="#378ADD" fillOpacity={0.15} strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>
              <Card className="col-span-1 ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
                <CardContent className="px-4">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-[14px] font-medium text-[#173753] leading-tight">Distribusi<br />Status Gizi</p>
                    <MonthPicker value={selectedMonthDistribusi} onChange={setSelectedMonthDistribusi} />
                  </div>
                  <ChartContainer config={{}} className="h-36 w-full">
                  <RadialBarChart
                    data={stats?.statusData || []}
                    innerRadius={20}
                    outerRadius={72}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <RadialBar dataKey="value" background={{ fill: "#f3f4f6" }} cornerRadius={4} />
                  </RadialBarChart>
                  </ChartContainer>
                  <div className="space-y-1 mt-2">
                  {[...(stats?.statusData || [])].reverse().map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-none" style={{ background: item.fill }} />
                      <span className="text-xs text-muted-foreground">{item.value}% — {item.name}</span>
                    </div>
                  ))}
                  </div>
                  <p className="text-xs text-green-600 mt-3 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {stats?.improvedCount || 0} anak membaik dari bulan lalu
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Table */}
            <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
              <CardContent className="p-0">
                <div className="flex justify-between items-start px-4 mb-3">
                  <p className="text-[14px] font-medium text-[#173753] leading-tight">Pemeriksaan Terbaru</p>
                </div>
                <div className="px-4">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2! border-[#D9D9D9]!">
                      <TableHead className="text-xs pl-4">Waktu</TableHead>
                      <TableHead className="text-xs">Posyandu</TableHead>
                      <TableHead className="text-xs">Nama Anak</TableHead>
                      <TableHead className="text-xs">Status Gizi</TableHead>
                      <TableHead className="text-xs">Tindak Lanjut</TableHead>
                      <TableHead className="text-xs">Kader</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentMeasurements.length > 0 ? (
                      recentMeasurements.map((row, i) => (
                        <TableRow key={i} className="border-b-2! border-[#D9D9D9]!">
                          <TableCell className="text-xs pl-4">{row.waktu}</TableCell>
                          <TableCell className="text-xs">{row.posyandu}</TableCell>
                          <TableCell className="text-xs font-medium">
                            <Link href={`/kader/anak/${row.id}`} className="hover:text-[#52A9E3] transition-colors">
                              {row.nama}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(row.status)}`}>
                              {row.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tindakBadge(row.tindak)}`}>
                              {row.tindak}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs">{row.kader}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
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
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel */}
          <div className="col-span-1 space-y-4">
            {/* Posyandu Ranking */}
            <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] py-0">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-[14px] font-medium text-[#173753] leading-tight">Posyandu dengan<br />Stunting Tertinggi</p>
                    <p className="text-xs text-muted-foreground">Jumlah anak stunting</p>
                  </div>
                  <MonthPicker value={selectedMonthPosyandu} onChange={setSelectedMonthPosyandu} />
                </div>
                <div className="space-y-2">
                  {posyanduRanking.map((item) => (
                    <div key={item.nama} className="space-y-0.5">
                      <p className="text-xs truncate">{item.nama}</p>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-teal-500"
                          style={{ width: `${(item.nilai / 15) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs text-muted-foreground pt-1">
                    <div className="flex gap-2.5">
                      {[0, 5, 10, 15].map((n) => <span key={n}>{n}</span>)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Anak Belum Periksa */}
            <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] py-0">
              <CardContent className="p-4">
                <div className="mb-3">
                  <p className="text-[14px] font-medium text-[#173753] leading-tight">Anak Belum Periksa<br />Bulan Ini</p>
                  <p className="text-xs text-muted-foreground">Update terakhir: {MONTHS_ID[new Date().getMonth()]} {new Date().getFullYear()}</p>
                </div>
                <div className="space-y-3">
                  {uncheckedChildren.length > 0 ? (
                    uncheckedChildren.map((anak, i) => (
                      <Link
                        key={i}
                        href={`/kader/anak/${anak.id}`}
                        className="group flex items-start gap-2.5 rounded-[8px] px-3 py-1.5 -mx-3 cursor-pointer transition text-[#173753] hover:bg-[#52A9E3] hover:text-[#F5F7FA]"
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center flex-none text-white text-xs font-semibold"
                          style={{ background: anak.warna }}
                        >
                          {anak.nama.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-xs font-medium truncate group-hover:text-[#F5F7FA] transition">{anak.nama}</p>
                            <p className="text-xs text-muted-foreground flex-none group-hover:text-[#F5F7FA]/80 transition">{anak.posyandu}</p>
                          </div>
                          <p className="text-xs text-muted-foreground group-hover:text-[#F5F7FA]/80 transition">{anak.usia}</p>
                          <button className="text-xs text-teal-600 flex items-center gap-1 mt-0.5 group-hover:text-[#F5F7FA] transition">
                            <Phone className="w-3 h-3" />
                            Ingatkan
                          </button>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-[#F5F7FA] flex items-center justify-center mb-3">
                        <CheckCircle className="w-6 h-6 text-teal-500" />
                      </div>
                      <p className="text-sm font-medium text-[#173753]">Semua anak sudah periksa</p>
                      <p className="text-xs text-muted-foreground mt-1">Tidak ada anak yang terlewat bulan ini.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
