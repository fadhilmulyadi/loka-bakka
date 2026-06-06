"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ChevronRight,
  Plus,
  Search,
  Bell,
  LogOut,
  TriangleAlert,
  Clock,
  ChevronDown,
  Calendar,
  User,
  MapPin,
  Baby,
  Users,
  Hash,
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
import { getChildDetail } from "@/lib/actions/kader"
import { StatusBadge } from "@/components/status-badge"

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
  latest: boolean
}

interface ChildDetail {
  id: string
  name: string
  gender: string
  birthDate: string
  age: string
  posyandu: string
  desa: string
  address: string
  childOrder: string
  parent: {
    mother: string
    father?: string
    phone: string
  }
  status: string
  latestCheckDate: string
  latestTB: number
  latestBB: number
  zScoreTBU: string
  bbTB: string
  examiner: string
  visits: Visit[]
}

export default function ChildDetailPage() {
  const { data: session } = useSession()
  const time = useTime()
  const params = useParams()
  const childId = (params?.id as string) ?? "1"
  const [childDataState, setChildDataState] = useState<ChildDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (childId) {
      getChildDetail(childId).then((data) => {
        setChildDataState(data as unknown as ChildDetail)
        setLoading(false)
      })
    }
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
          <span className="text-xs text-muted-foreground flex-none font-medium">| {childDataState.posyandu}</span>
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
            <Link href={`/kader/anak/${childId}/catat-kunjungan`}>
              <Button
                className="gap-1.5 text-xs h-9 px-4 rounded-[50px] text-white shadow-[0_4px_12px_rgba(82,169,227,0.3)] hover:opacity-90 transition-opacity"
                style={{ background: `linear-gradient(to right, ${ACCENT}, #93D1F7)` }}
              >
                <Plus className="w-3.5 h-3.5" />
                Catat Kunjungan Baru
              </Button>
            </Link>

            <div className="flex items-center gap-2 pl-1 pr-3 py-1 bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-teal-100 text-teal-700 text-sm font-semibold">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Left: Identity */}
          <Card className="lg:col-span-2 ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl border-none overflow-hidden">
            <CardHeader className="pb-1.5 border-b border-gray-100 px-4">
              <div className="flex items-center gap-4">
                <div className="h-[50px] w-[50px] rounded-[14px] bg-[#DBEAFE] flex items-center justify-center text-[18px] font-bold text-[#1D4ED8] flex-shrink-0">
                  {childDataState.name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div>
                  <h2 className="text-[16px] font-medium text-[#173753] leading-tight">{childDataState.name}</h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    No. Register: {childDataState.id}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 px-4 pb-6">
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                {[
                  { icon: Calendar, label: "TANGGAL LAHIR", value: childDataState.birthDate },
                  { icon: Clock, label: "USIA SAAT INI", value: childDataState.age },
                  { icon: Users, label: "JENIS KELAMIN", value: childDataState.gender },
                  { icon: Hash, label: "ANAK KE-", value: childDataState.childOrder || "—" },
                  { icon: User, label: "NAMA IBU", value: childDataState.parent.mother },
                  { icon: User, label: "NAMA AYAH", value: childDataState.parent.father || "—" },
                  { icon: MapPin, label: "ALAMAT", value: childDataState.address, full: true },
                ].map((item) => (
                  <div key={item.label} className={cn("flex gap-3", item.full && "col-span-2")}>
                    <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4 text-[#64748B]" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-[#94A3B8] mb-0.5 uppercase tracking-wider">
                        {item.label}
                      </label>
                      <span className="text-[13px] font-semibold text-[#173753]">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Right: Nutrition Status */}
          <Card className="lg:col-span-1 ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl border-none overflow-hidden">
            <CardHeader className="pb-1.5 border-b border-[#F0F0F0] px-4">
              <CardTitle className="text-[16px] font-semibold text-[#173753] leading-tight">Status Gizi Terakhir</CardTitle>
            </CardHeader>

            <CardContent className="pt-2 px-4 pb-4 flex flex-col h-full">
              {(() => {
                const s = getStatusStyle(childDataState.status)
                return (
                  <div className="flex items-center gap-3 rounded-[10px] px-3.5 py-3 mb-4 mt-2 border" style={{ background: s.bg, borderColor: s.border }}>
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.dot }} />
                    <div>
                      <p className="text-[15px] font-bold leading-none mb-0.5" style={{ color: s.text }}>{childDataState.status}</p>
                      <p className="text-[11.5px]" style={{ color: s.text }}>Diperiksa: {childDataState.latestCheckDate}</p>
                    </div>
                  </div>
                )
              })()}

              <div className="space-y-2.5 flex-1">
                {[
                  { label: "Berat Badan", value: `${childDataState.latestBB.toFixed(1).replace(".", ",")} kg`, color: "text-[#15803D]" },
                  { label: "Tinggi Badan", value: `${childDataState.latestTB.toFixed(1).replace(".", ",")} cm`, color: "text-[#15803D]" },
                  { divider: true },
                  { label: "Z-Score TB/U", value: childDataState.zScoreTBU, color: "text-[#15803D]" },
                  { label: "BB/TB", value: childDataState.bbTB, color: "text-[#15803D]" },
                  { divider: true },
                  { label: "Pemeriksa", value: childDataState.examiner, color: "text-[#0F172A] text-[12.5px]" },
                ].map((item, idx) => (
                  item.divider ? (
                    <div key={`div-${idx}`} className="h-px bg-gray-100 my-2.5" />
                  ) : (
                    <div key={item.label} className="flex justify-between items-center">
                      <span className="text-[12px] text-muted-foreground">{item.label}</span>
                      <span className={cn("text-[13.5px] font-semibold", item.color)}>{item.value}</span>
                    </div>
                  )
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle: Growth Chart */}
        <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl border-none overflow-hidden">
          <CardHeader className="pb-1.5 border-b border-[#F0F0F0] px-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[16px] font-semibold text-[#173753]">Kurva Pertumbuhan</CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">WHO Growth Standard (0-24 Bulan)</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-[#173753]" />
                  <span className="text-[11px] font-medium text-[#173753]">Aktual</span>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-2 px-4 pb-4">
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

        {/* Bottom Card: History Table */}
        <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl border-none overflow-hidden">
        <CardHeader className="pb-1.5 border-b border-[#F0F0F0] px-4">
          <div className="flex-none">
            <CardTitle className="text-[16px] font-semibold text-[#173753] leading-tight">Riwayat Pengukuran</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Menampilkan <span className="font-medium text-[#173753]">{childDataState.visits.length}</span> kali pengukuran tercatat
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-2 px-4 pb-1">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[#E8E8E8]">
                <TableHead className="text-[14px] text-[#173753] font-medium pl-2">Tanggal Periksa</TableHead>
                <TableHead className="text-[14px] text-[#173753] font-medium">Usia</TableHead>
                <TableHead className="text-[14px] text-[#173753] font-medium">Berat Badan</TableHead>
                <TableHead className="text-[14px] text-[#173753] font-medium">Tinggi Badan</TableHead>
                <TableHead className="text-[14px] text-[#173753] font-medium">Z-Score TB/U</TableHead>
                <TableHead className="text-[14px] text-[#173753] font-medium">Status</TableHead>
                <TableHead className="text-[14px] text-[#173753] font-medium">Pemeriksa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {childDataState.visits.map((v, i) => (
                <tr key={i} className="border-b border-[#F0F0F0] hover:bg-[#F7FBFF] transition-colors">
                  <td className="p-3 text-[14px] text-[#173753] pl-2">
                    <span>{v.tgl}</span>
                  </td>
                  <td className="p-3 text-[14px] text-[#173753]">{v.usia}</td>
                  <td className="p-3 text-[14px] text-[#173753]">{v.bb.toFixed(1).replace(".", ",")} kg</td>
                  <td className="p-3 text-[14px] text-[#173753]">{v.tb.toFixed(1).replace(".", ",")} cm</td>
                  <td className="p-3 text-[14px] font-mono text-[#173753]">{v.zTb} SD</td>
                  <td className="p-3">
                    <StatusBadge status={v.status} />
                  </td>
                  <td className="p-3 text-[14px] text-muted-foreground">{childDataState.examiner}</td>
                </tr>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  </div>
  )
}
