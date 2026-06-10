"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
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
  Baby,
  Activity,
  Droplet,
  User,
  Calendar,
  Phone,
  MapPin,
  ClipboardList,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { signOut, useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { getIbuById } from "@/lib/actions/kader"
import { calculateGestationalAge, calculateHPL, MONTHS_ID as UTILS_MONTHS } from "@/lib/pregnancy-utils"

import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
} from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
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

// ============ DESIGN TOKENS ============
const NAVY = "#173753"
const ACCENT = "#52A9E3"
const PINK = "#E879A0"

// ============ COMPONENTS ============

function StatusBadge({ status, type = "nutrition" }: { status: string, type?: "nutrition" | "pregnancy" | "risk" }) {
  const nutritionMap: Record<string, { bg: string; text: string; dot: string }> = {
    Normal:          { bg: "#E6F4EA", text: "#1E8E3E", dot: "#1E8E3E" },
    Stunting:        { bg: "#FCE8E6", text: "#D93025", dot: "#D93025" },
    "Risiko Stunting": { bg: "#FFF4E5", text: "#B06000", dot: "#B06000" },
    "Gizi Kurang":   { bg: "#F3E8FD", text: "#8E24AA", dot: "#8E24AA" },
    "Stunting Berat": { bg: "#FCE8E6", text: "#D93025", dot: "#D93025" },
  }
  
  const riskMap: Record<string, { bg: string; text: string; dot: string }> = {
    Aman: { bg: "#E6F4EA", text: "#1E8E3E", dot: "#1E8E3E" },
    Waspada: { bg: "#FFF4E5", text: "#B06000", dot: "#B06000" },
    Bahaya: { bg: "#FCE8E6", text: "#D93025", dot: "#D93025" },
  }

  const map = type === "risk" ? riskMap : nutritionMap
  const s = map[status] ?? { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" }
  
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider"
      style={{ background: s.bg, color: s.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      {status}
    </span>
  )
}

// ============ MAIN PAGE ============

type IbuProfile = Awaited<ReturnType<typeof getIbuById>>

export default function IbuProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const time = useTime()
  const router = useRouter()
  const [ibu, setIbu] = useState<IbuProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      getIbuById(id)
        .then(setIbu)
        .catch(() => router.replace("/kader/rekap"))
        .finally(() => setLoading(false))
    }
  }, [id, router])

  if (loading) return <div className="flex-1 flex items-center justify-center bg-[#EBF2F8] min-h-screen">Loading...</div>
  if (!ibu) return null

  const initial = ibu.nama.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()

  // Calculate age
  const birthDate = ibu.tanggalLahir ? new Date(ibu.tanggalLahir) : null
  const age = birthDate ? Math.floor((new Date().getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null

  const hphtDate = ibu.pregnancyProfile?.hpht ? new Date(ibu.pregnancyProfile.hpht) : null
  const bbPre = ibu.pregnancyProfile?.bbPrepregnancyKg ?? 0
  const gainMin = ibu.pregnancyProfile?.targetGainMinKg ?? 0
  const gainMax = ibu.pregnancyProfile?.targetGainMaxKg ?? 0
  const chartData = (hphtDate && (ibu.pregnancyVisits?.length ?? 0) > 0)
    ? ibu.pregnancyVisits.map((v) => {
        const week = Math.max(0, Math.floor(
          (new Date(v.visitDate).getTime() - hphtDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
        ))
        return {
          week,
          actual: v.currentWeightKg,
          isOnTrack: v.isOnTrack,
          targetMin: +(bbPre + (week / 40) * gainMin).toFixed(1),
          targetMax: +(bbPre + (week / 40) * gainMax).toFixed(1),
        }
      })
    : []

  return (
    <div className="flex-1 bg-[#EBF2F8] flex flex-col min-h-screen">
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
          <span className="text-xs text-[#173753] truncate font-medium">Lengkapi data kunjungan ibu bulan ini</span>
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
              <span className="text-xs text-[#173753] font-medium">Profil Ibu</span>
            </nav>
            <h1 className="text-2xl font-medium text-[#173753]">Profil Ibu</h1>
          </div>

          <div className="flex items-center gap-3">
            {ibu.isHamil && (
              <Link href={`/kader/ibu/${id}/catat-kunjungan`}>
                <Button
                  className="gap-1.5 text-xs h-9 px-4 rounded-[50px] text-white shadow-[0_4px_12px_rgba(82,169,227,0.3)] hover:opacity-90 transition-opacity"
                  style={{ background: `linear-gradient(to right, ${ACCENT}, #93D1F7)` }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Catat Kunjungan
                </Button>
              </Link>
            )}

            <Link href={`/kader/ibu/${id}/tambah-anak`}>
              <Button
                className="gap-1.5 text-xs h-9 px-4 rounded-[50px] text-white shadow-[0_4px_12px_rgba(82,169,227,0.3)] hover:opacity-90 transition-opacity"
                style={{ background: `linear-gradient(to right, ${ACCENT}, #93D1F7)` }}
              >
                <Plus className="w-3.5 h-3.5" />
                Daftarkan Anak Baru
              </Button>
            </Link>

            <div className="flex items-center gap-2 pl-1 pr-3 py-1 bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-teal-100 text-teal-700 text-sm font-semibold">
                  {session?.user?.name?.slice(0, 2).toUpperCase() ?? "KD"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs text-[#173753] font-medium leading-none">{session?.user?.name ?? "Kader"}</p>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">Kader Posyandu</p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Left: Identity */}
          <Card className="lg:col-span-2 ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl border-none overflow-hidden">
            <CardHeader className="pb-1.5 border-b border-[#F0F0F0] px-4">
              <div className="flex items-center gap-4">
                <div className="h-[60px] w-[60px] rounded-[18px] bg-gradient-to-br from-[#C4D6E8] to-[#52A9E3] flex items-center justify-center text-[20px] font-bold text-white flex-shrink-0 shadow-sm">
                  {initial}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[18px] font-bold text-[#173753] leading-tight">{ibu.nama}</h2>
                    {ibu.isHamil && (
                      <span className="px-2 py-0.5 bg-pink-50 text-pink-600 text-[10px] font-bold rounded-full border border-pink-100 uppercase tracking-tight">
                        Sedang Hamil
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                    No. Register: {ibu.id.slice(0, 8).toUpperCase()} · @{ibu.username}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 px-4 pb-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
                {[
                  { icon: Calendar, label: "TANGGAL LAHIR", value: birthDate?.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) || "—" },
                  { icon: User, label: "USIA", value: age ? `${age} Tahun` : "—" },
                  { icon: Phone, label: "NOMOR TELEPON", value: ibu.noHp || "—" },
                  { icon: MapPin, label: "ALAMAT DOMISILI", value: ibu.alamat || "—", full: true },
                ].map((item) => (
                  <div key={item.label} className={cn("flex gap-3", item.full && "col-span-2 md:col-span-3")}>
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

          {/* Top Right: Status / Pregnancy Summary */}
          <Card className="lg:col-span-1 ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl border-none overflow-hidden flex flex-col">
            <CardHeader className="pb-1.5 border-b border-[#F0F0F0] px-4">
              <CardTitle className="text-[16px] font-semibold text-[#173753] leading-tight">
                {ibu.isHamil ? "Status Kehamilan" : "Status Kesehatan"}
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-4 px-4 pb-4 flex-1">
              {ibu.isHamil ? (() => {
                    const hpht = ibu.pregnancyProfile?.hpht;
                    if (!hpht) return null;

                    const age = calculateGestationalAge(new Date(hpht));
                    const hpl = calculateHPL(new Date(hpht));
                    const trimester = age <= 12 ? 1 : age <= 27 ? 2 : 3;
                    const hplStr = `${hpl.getDate()} ${MONTHS_ID[hpl.getMonth()]} ${hpl.getFullYear()}`;
                    const progress = Math.min((age / 40) * 100, 100);

                    return (
                      <div className="space-y-4">
                        <div className="bg-pink-50 border border-pink-100 rounded-xl p-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[11px] font-bold text-pink-700">USIA KEHAMILAN</span>
                            <span className="text-[14px] font-bold text-pink-800">{age} Minggu</span>
                          </div>
                          <div className="w-full bg-pink-200/50 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-pink-500 h-full rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                          <p className="text-[10px] text-pink-600 mt-2 font-medium">Trimester {trimester} · Perkiraan Lahir: {hplStr}</p>
                        </div>
                        <div className="space-y-3 pt-2">
                          {[
                            { label: "Berat Badan Pre-Kehamilan", value: `${ibu.pregnancyProfile?.bbPrepregnancyKg || "—"} kg` },
                            { label: "Target Kenaikan", value: `${ibu.pregnancyProfile?.targetGainMinKg || "—"} - ${ibu.pregnancyProfile?.targetGainMaxKg || "—"} kg` },
                            { 
                              label: "Kenaikan Saat Ini", 
                              value: ibu.pregnancyVisits?.length > 0 
                                ? `+${ibu.pregnancyVisits[ibu.pregnancyVisits.length - 1].weightGainKg} kg` 
                                : "0 kg", 
                              color: "text-green-600" 
                            },
                          ].map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                              <span className="text-[12px] text-slate-500 font-medium">{item.label}</span>
                              <span className={cn("text-[13px] font-bold text-[#173753]", item.color)}>{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })() : (
                <div className="space-y-4">
                  <div className="bg-[#F0FDF4] border border-[#DCFCE7] rounded-xl p-4 text-center">
                    <p className="text-[10px] font-bold text-[#15803D] uppercase tracking-widest mb-1">Hasil Skrining Terakhir</p>
                    <p className="text-[20px] font-black text-[#15803D] leading-none mb-1">
                      {ibu.skrinings[0]?.kategori || "Aman"}
                    </p>
                    <p className="text-[11px] text-[#16A34A] font-medium">Skor: {ibu.skrinings[0]?.skorRisiko || 0}</p>
                  </div>

                  <div className="space-y-3 pt-2">
                    {[
                      { label: "Total Anak", value: `${ibu.anaks.length} Anak` },
                      { label: "Terakhir Skrining", value: ibu.skrinings[0]?.tanggal ? new Date(ibu.skrinings[0].tanggal).toLocaleDateString("id-ID") : "—" },
                      { label: "Status Posyandu", value: "Aktif", color: "text-blue-600" },
                    ].map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-[12px] text-slate-500 font-medium">{item.label}</span>
                        <span className={cn("text-[13px] font-bold text-[#173753]", item.color)}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Middle: Growth / Weight Chart (Conditional) */}
        {ibu.isHamil && chartData.length > 0 && (
          <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl border-none overflow-hidden">
            <CardHeader className="pb-1.5 border-b border-[#F0F0F0] px-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[16px] font-semibold text-[#173753] leading-tight">Kurva Kenaikan Berat Badan</CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">Target vs Aktual Berdasarkan IOM Guidelines</p>
                </div>
                <div className="flex gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-pink-500" />
                    <span className="text-[10px] font-bold text-pink-600 uppercase tracking-tighter">Berat Aktual</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-[#FDF2F8] border border-pink-200 rounded-sm" />
                    <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-tighter">Target IOM</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#1E8E3E]" />
                    <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-tighter">Sesuai</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#B06000]" />
                    <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-tighter">Perlu Perhatian</span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-2 px-4 pb-4">
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 10, fontWeight: 600, fill: '#94A3B8' }}
                      tickLine={false}
                      axisLine={false}
                      label={{ value: 'Minggu Ke-', position: 'bottom', offset: 0, fontSize: 10, fontWeight: 700 }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fontWeight: 600, fill: '#94A3B8' }}
                      tickLine={false}
                      axisLine={false}
                      width={35}
                      label={{ value: 'Berat (kg)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fontWeight: 700 }}
                    />
                    <ReTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const entry = payload.find(p => p.dataKey === 'actual')
                          if (!entry) return null
                          const d = entry.payload as { week: number; isOnTrack: boolean; targetMin: number; targetMax: number }
                          return (
                            <div className="bg-white p-3 rounded-xl shadow-xl border border-slate-100">
                              <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Minggu Ke-{d.week}</p>
                              <p className="text-[14px] font-black text-[#173753]">{entry.value} kg</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">Target IOM: {d.targetMin}–{d.targetMax} kg</p>
                              <p className={`text-[10px] font-bold mt-0.5 ${d.isOnTrack ? 'text-[#1E8E3E]' : 'text-[#B06000]'}`}>
                                {d.isOnTrack ? '✓ Sesuai Target' : '⚠ Perlu Perhatian'}
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Area type="monotone" dataKey="targetMax" stroke="none" fill="#FDF2F8" fillOpacity={1} legendType="none" />
                    <Area type="monotone" dataKey="targetMin" stroke="none" fill="white" fillOpacity={1} legendType="none" />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke={PINK}
                      strokeWidth={3}
                      name="Berat Aktual"
                      dot={(props) => {
                        const { cx, cy } = props as { cx: number; cy: number; index: number }
                        const index = (props as { cx: number; cy: number; index: number }).index
                        const isOnTrack = chartData[index]?.isOnTrack ?? true
                        return (
                          <circle
                            key={`dot-${index}`}
                            cx={cx}
                            cy={cy}
                            r={4}
                            fill={isOnTrack ? '#1E8E3E' : '#B06000'}
                            stroke="white"
                            strokeWidth={2}
                          />
                        )
                      }}
                      activeDot={{ r: 6, fill: PINK, strokeWidth: 2, stroke: '#fff' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Children List */}
          <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl border-none overflow-hidden">
            <CardHeader className="pb-1.5 border-b border-[#F0F0F0] px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[16px] font-semibold text-[#173753] leading-tight">
                Daftar Anak Terdaftar
              </CardTitle>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{ibu.anaks.length} ANAK</span>
            </CardHeader>
            <CardContent className="p-0">
              {ibu.anaks.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Baby className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-400">Belum ada anak terdaftar</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {ibu.anaks.map((anak) => {
                    const last = anak.pengukurans[0]
                    const birth = new Date(anak.tanggalLahir)
                    const ageMonths = (new Date().getFullYear() - birth.getFullYear()) * 12 + (new Date().getMonth() - birth.getMonth())
                    
                    return (
                      <div key={anak.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center text-[14px] font-bold text-white shadow-sm",
                            anak.jenisKelamin === 'L' ? 'bg-[#378ADD]' : 'bg-[#E879A0]'
                          )}>
                            {anak.nama[0]}
                          </div>
                          <div>
                            <Link href={`/kader/anak/${anak.id}`} className="text-[14px] font-bold text-[#173753] hover:text-[#52A9E3] transition-colors">
                              {anak.nama}
                            </Link>
                            <p className="text-[11px] text-slate-400 font-medium">
                              {ageMonths} Bulan · {anak.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={last?.statusTBU || "Normal"} />
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* History (Screening or Visits) */}
          <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl border-none overflow-hidden">
            <CardHeader className="pb-1.5 border-b border-[#F0F0F0] px-4">
              <CardTitle className="text-[16px] font-semibold text-[#173753] leading-tight">
                {ibu.isHamil ? "Riwayat Kunjungan" : "Riwayat Skrining"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4">Tanggal</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {ibu.isHamil ? "Berat (kg)" : "Skor"}
                    </TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-4">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ibu.isHamil ? (
                    ibu.pregnancyVisits?.map((v, i) => (
                      <TableRow key={v.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="text-[12px] font-bold text-[#173753] pl-4">
                          {new Date(v.visitDate).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="text-[12px] font-bold text-[#173753]">{v.currentWeightKg}</TableCell>
                        <TableCell className="pr-4">
                          <StatusBadge status={v.isOnTrack ? "Aman" : "Waspada"} type="risk" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    ibu.skrinings?.map((s, i) => (
                      <TableRow key={s.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="text-[12px] font-bold text-[#173753] pl-4">
                          {new Date(s.tanggal).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="text-[12px] font-bold text-[#173753]">{s.skorRisiko}</TableCell>
                        <TableCell className="pr-4">
                          <StatusBadge status={s.kategori} type="risk" />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {((ibu.isHamil ? ibu.pregnancyVisits?.length : ibu.skrinings?.length) || 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-slate-400 font-semibold italic">
                        Belum ada riwayat tercatat
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
