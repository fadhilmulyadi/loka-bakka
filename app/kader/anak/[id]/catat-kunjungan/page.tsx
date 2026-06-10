"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  ChevronRight,
  Check,
  ArrowRight,
  Info,
  Wifi,
  Ruler,
  Scale,
  Brain,
  Sparkles,
  User,
  Plus,
  Activity,
  Calendar,
  Search,
  TriangleAlert,
  Clock,
  Bell,
  LogOut,
  ChevronDown,
  Baby,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { signOut, useSession } from "next-auth/react"
import { cn } from "@/lib/utils"

import { getChildDetail, savePengukuran } from "@/lib/actions/kader"

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"]

function useTime() {
  const [time, setTime] = useState("")
  useEffect(() => {
    const fmt = () => {
      const n = new Date()
      return `${n.getDate()} ${MONTHS_ID[n.getMonth()]} ${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`
    }
    setTime(fmt())
    const id = setInterval(() => setTime(fmt()), 60_000)
    return () => clearInterval(id)
  }, [])
  return time
}

// ============ CONSTANTS ============
const NAVY = "#173753"
const ACCENT = "#52A9E3"

// Status bands for ~28-month-old (Mock, ideally from WHO)
const bands = {
  tb: { perhatian: 84, pantau: 87 },   // cm
  bb: { perhatian: 10.5, pantau: 11.5 }, // kg
}

type StatusKey = "baik" | "cukup" | "buruk"

function classify(metric: "tb" | "bb", v: number | null): StatusKey | null {
  if (v == null || isNaN(v)) return null
  const b = bands[metric]
  if (v < b.perhatian) return "buruk"
  if (v < b.pantau) return "cukup"
  return "baik"
}

const statusInfo: Record<StatusKey, { label: string; bg: string; text: string; dot: string }> = {
  baik:  { label: "Normal",          bg: "#E6F4EA", text: "#1E8E3E", dot: "#1E8E3E" },
  cukup: { label: "Perlu pantau",    bg: "#FFF4E5", text: "#B06000", dot: "#B06000" },
  buruk: { label: "Perlu perhatian", bg: "#FCE8E6", text: "#D93025", dot: "#D93025" },
}

const rank: Record<StatusKey, number> = { baik: 0, cukup: 1, buruk: 2 }

// ============ SUB-COMPONENTS ============

function StatusPill({ status }: { status: StatusKey }) {
  const s = statusInfo[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: s.dot }} />
      {s.label}
    </span>
  )
}

function Delta({ now, prev, unit }: { now: string; prev: number; unit: string }) {
  const v = parseFloat(now)
  if (now === "" || isNaN(v) || prev === 0) return null
  const d = v - prev
  const sign = d > 0 ? "+" : ""
  const color = d > 0 ? "#1E8E3E" : d < 0 ? "#D93025" : "#9CA3AF"
  return (
    <div className="text-[10px] font-medium tabular-nums mt-0.5" style={{ color }}>
      {sign}{d.toFixed(1)} {unit} <span className="text-muted-foreground font-normal">vs lalu</span>
    </div>
  )
}

function MeasureRow({
  icon: Icon,
  label,
  metric,
  value,
  onChange,
  unit,
}: {
  icon: React.ElementType
  label: string
  metric: "tb" | "bb"
  value: string
  onChange: (v: string) => void
  unit: string
}) {
  const st = classify(metric, value === "" ? null : parseFloat(value))

  return (
    <div
      className="grid items-center gap-4 py-3 border-b border-gray-100 last:border-0"
      style={{ gridTemplateColumns: "40px 1fr 160px" }}
    >
      {/* Icon */}
      <div
        className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "#EFF6FF", color: NAVY }}
      >
        <Icon className="h-[18px] w-[18px]" />
      </div>

      {/* Label + status */}
      <div>
        <div className="text-sm font-semibold text-[#173753]">{label}</div>
        <div className="flex items-center gap-2 mt-0.5">
          {st && <StatusPill status={st} />}
        </div>
      </div>

      {/* Input */}
      <div>
        <div className="relative">
          <input
            type="number"
            step="0.1"
            value={value}
            placeholder="0.0"
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              "w-full h-11 pl-3.5 pr-10 rounded-xl border text-base font-semibold tabular-nums outline-none transition-colors",
              "border-gray-200 bg-white text-[#173753]",
              "focus:border-[#52A9E3] focus:ring-1 focus:ring-[#52A9E3]/20",
            )}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {unit}
          </span>
        </div>
      </div>
    </div>
  )
}

function SectionCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl">
      <CardHeader className="pb-1.5 border-b border-gray-100 px-4">
        <CardTitle className="text-[16px] font-medium text-[#173753]">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 px-4">{children}</CardContent>
    </Card>
  )
}

// ============ MAIN PAGE ============

export default function CatatKunjunganPage() {
  const { data: session } = useSession()
  const time = useTime()
  const router = useRouter()
  const params = useParams()
  const childId = (params?.id as string) ?? ""

  const [childData, setChildData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (childId) {
      getChildDetail(childId).then(data => {
        setChildData(data)
        setLoading(false)
      })
    }
  }, [childId])

  const [tb, setTb] = useState("")
  const [bb, setBb] = useState("")
  const [source, setSource] = useState<"alat" | "manual">("manual")
  const [saved, setSaved] = useState(false)

  // Per-metric status
  const tbStatus = classify("tb", tb === "" ? null : parseFloat(tb))
  const bbStatus = classify("bb", bb === "" ? null : parseFloat(bb))

  // Overall = worst of the three filled values
  const overall: StatusKey = useMemo(() => {
    const statuses = [tbStatus, bbStatus].filter((s): s is StatusKey => s !== null)
    if (statuses.length === 0) return "baik"
    return statuses.sort((a, b) => rank[b] - rank[a])[0]
  }, [tbStatus, bbStatus])

  const complete = tb !== "" && bb !== ""

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!complete) return
    
    try {
      await savePengukuran({
        anakId: childId,
        beratBadan: parseFloat(bb),
        tinggiBadan: parseFloat(tb),
      })
      setSaved(true)
      setTimeout(() => router.push(`/kader/anak/${childId}`), 1100)
    } catch (err) {
      console.error(err)
      alert("Gagal menyimpan data")
    }
  }

  if (loading) return <div className="p-8">Loading...</div>
  if (!childData) return <div className="p-8">Anak tidak ditemukan</div>

  const lastVisit = {
    date: childData.latestCheckDate,
    tb: childData.latestTB,
    bb: childData.latestBB
  }

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
          <span className="text-xs text-muted-foreground flex-none font-medium">| {childData.posyandu}</span>
        </div>
        <div className="flex items-center gap-2 flex-none">
          <div className="flex items-center gap-2 px-4 h-8 text-xs text-[#173753] bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
            <Clock className="w-3.5 h-3.5" />
            <span className="tabular-nums font-medium">{time || <span className="text-gray-300 italic font-normal text-sm">—</span>}</span>
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
              <Link href={`/kader/anak/${childId}`} className="text-xs text-[#173753]/50 hover:text-[#173753] transition-colors">Profil Anak</Link>
              <ChevronRight className="w-3 h-3 text-[#173753]/30 flex-none" />
              <span className="text-xs text-[#173753] font-medium">Catat Kunjungan</span>
            </nav>
            <h1 className="text-2xl font-medium text-[#173753]">Catat Kunjungan</h1>
          </div>

          <div className="flex items-center gap-2 pl-1 pr-3 py-1 bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-teal-100 text-teal-700 text-sm font-semibold">
                {session?.user?.name?.slice(0, 2).toUpperCase() ?? "ZA"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs text-[#173753] font-medium leading-none">{session?.user?.name ?? "Kader"}</p>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">Kader {childData.posyandu}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {/* Child banner */}
        <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl mb-5">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div
                className="h-13 w-13 rounded-[14px] flex items-center justify-center text-2xl font-bold text-[#173753] shrink-0 select-none"
                style={{ background: "linear-gradient(135deg, #C4D6E8, #52A9E3)" }}
              >
                {childData.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-medium text-[#173753] leading-tight">{childData.name}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    {childData.age}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg">
                    <Baby className={cn("w-3.5 h-3.5", childData.gender === 'Perempuan' ? "text-pink-400" : "text-blue-400")} />
                    {childData.gender}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0 border-l border-gray-200 pl-4">
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Pemeriksaan terakhir</div>
                <div className="text-sm font-semibold text-[#173753] mt-0.5">{lastVisit.date}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="grid gap-5"
          style={{ gridTemplateColumns: "1fr 340px", alignItems: "start" }}
        >
        {/* ──────────── LEFT ──────────── */}
        <div className="flex flex-col gap-4">

          {/* Hasil pengukuran */}
          <SectionCard title="Hasil pengukuran">
            {/* Source toggle */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">Metode Penginputan</span>
              <div className="flex p-1 rounded-xl bg-slate-100 gap-1">
                {(["alat", "manual"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSource(s)}
                    className={cn(
                      "px-4 py-1.5 text-[10px] font-medium uppercase tracking-widest rounded-lg transition-all",
                      source === s
                        ? "bg-[#52A9E3] text-white shadow-sm"
                        : "text-[#173753] hover:bg-[#52A9E3]/10",
                    )}
                  >
                    {s === "alat" ? "Auto-Sync" : "Manual"}
                  </button>
                ))}
              </div>
            </div>

            {/* Device sync banner */}
            {source === "alat" && (
              <div className="flex items-start justify-between p-4 rounded-2xl mb-6 bg-blue-50/50 border border-blue-100 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600 shrink-0">
                    <Wifi className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-[#173753]">Terhubung ke Antropometri Kit</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-green-500 text-white text-[9px] font-medium uppercase tracking-tighter">Live</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium leading-relaxed">
                      Menunggu data dari perangkat bluetooth... Pastikan alat dalam keadaan menyala.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Measurement rows */}
            <MeasureRow icon={Ruler}  label="Tinggi badan" metric="tb" value={tb} onChange={setTb} unit="cm" />
            <MeasureRow icon={Scale}  label="Berat badan"  metric="bb" value={bb} onChange={setBb} unit="kg" />

            {/* Overall status */}
            <div className={cn(
              "mt-6 p-4 rounded-2xl flex items-center justify-between transition-colors",
              overall === "baik" ? "bg-green-50/50 border border-green-100" : 
              overall === "cukup" ? "bg-amber-50/50 border border-amber-100" : 
              "bg-red-50/50 border border-red-100"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  overall === "baik" ? "bg-green-100 text-green-600" :
                  overall === "cukup" ? "bg-amber-100 text-amber-600" :
                  "bg-red-100 text-red-600"
                )}>
                  <Info className="w-4 h-4" />
                </div>
                <span className="text-[13px] font-medium text-[#173753]">Analisis Kesehatan Kunjungan</span>
              </div>
              <StatusPill status={overall} />
            </div>
          </SectionCard>
        </div>

        {/* ──────────── RIGHT: sticky summary ──────────── */}
        <div className="flex flex-col gap-4 sticky top-6">

          {/* Summary card */}
          <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl">
            <CardHeader className="pb-1 border-b border-gray-100 px-4">
              <CardTitle className="text-[16px] font-medium text-[#173753]">Ringkasan kunjungan</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-4">
              {/* Measurements */}
              <div className="space-y-0 mb-4">
                {[
                  { label: "Tinggi",        value: tb, unit: "cm", prev: lastVisit.tb },
                  { label: "Berat",         value: bb, unit: "kg", prev: lastVisit.bb },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="flex items-baseline justify-between py-2.5 border-b border-gray-100 last:border-0"
                  >
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {m.label}
                    </span>
                    <span className="text-right">
                      <span className="text-xl font-bold text-[#173753] tabular-nums">
                        {m.value || <span className="text-gray-300 italic font-normal text-sm">—</span>}
                      </span>
                      {m.value && <span className="text-xs text-muted-foreground ml-1">{m.unit}</span>}
                      <Delta now={m.value} prev={m.prev} unit={m.unit} />
                    </span>
                  </div>
                ))}
              </div>

              {/* Overall status */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Status gizi
                </span>
                <StatusPill status={overall} />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <button
            type="submit"
            disabled={!complete}
            className={cn(
              "h-12 w-full rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all",
              complete ? "cursor-pointer hover:opacity-90" : "cursor-not-allowed opacity-50",
            )}
            style={{ background: `linear-gradient(to right, ${ACCENT}, #93D1F7)`, color: "white" }}
          >
            {saved ? (
              <>
                <Check className="h-4 w-4" strokeWidth={2.5} />
                Tersimpan
              </>
            ) : (
              <>
                Simpan kunjungan
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <Button
            type="button"
            variant="ghost"
            className="w-full text-sm text-muted-foreground hover:text-[#173753]"
            onClick={() => router.push(`/kader/anak/${childId}`)}
          >
            Batal
          </Button>
        </div>
        </form>
      </div>
    </div>
  )
}
