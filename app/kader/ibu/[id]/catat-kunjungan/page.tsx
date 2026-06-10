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
  Sparkles,
  Activity,
  Calendar,
  Search,
  TriangleAlert,
  Clock,
  Bell,
  LogOut,
  ChevronDown,
  Droplet,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { signOut, useSession } from "next-auth/react"
import { cn } from "@/lib/utils"

import { getIbuById } from "@/lib/actions/kader"
import { savePregnancyVisit } from "@/lib/actions/pregnancy"
import { calculateGestationalAge, calculateHPL } from "@/lib/pregnancy-utils"

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

type StatusKey = "baik" | "cukup" | "buruk"

const statusInfo: Record<StatusKey, { label: string; bg: string; text: string; dot: string }> = {
  baik:  { label: "Normal",          bg: "#E6F4EA", text: "#1E8E3E", dot: "#1E8E3E" },
  cukup: { label: "Perlu pantau",    bg: "#FFF4E5", text: "#B06000", dot: "#B06000" },
  buruk: { label: "Perlu perhatian", bg: "#FCE8E6", text: "#D93025", dot: "#D93025" },
}

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

function Delta({ now, prev, unit, isWeight = false }: { now: string; prev: number; unit: string; isWeight?: boolean }) {
  const v = parseFloat(now)
  if (now === "" || isNaN(v)) return null
  const d = v - prev
  const sign = d > 0 ? "+" : ""
  const color = d >= 0 ? "#1E8E3E" : "#D93025"
  return (
    <div className="text-[10px] font-medium tabular-nums mt-0.5" style={{ color }}>
      {sign}{d.toFixed(1)} {unit} <span className="text-muted-foreground font-normal">{isWeight ? "total naik" : "vs lalu"}</span>
    </div>
  )
}

function MeasureRow({
  icon: Icon,
  label,
  value,
  onChange,
  unit,
  status,
}: {
  icon: React.ElementType
  label: string
  value: string
  onChange: (v: string) => void
  unit: string
  status?: StatusKey | null
}) {
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
          {status && <StatusPill status={status} />}
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

type IbuProfile = Awaited<ReturnType<typeof getIbuById>>

export default function CatatKunjunganIbuPage() {
  const { data: session } = useSession()
  const time = useTime()
  const router = useRouter()
  const params = useParams()
  const ibuId = (params?.id as string) ?? ""

  const [ibu, setIbu] = useState<IbuProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (ibuId) {
      getIbuById(ibuId).then(data => {
        setIbu(data)
        setLoading(false)
      })
    }
  }, [ibuId])

  const [bb, setBb] = useState("")
  const [lila, setLila] = useState("")
  const [hb, setHb] = useState("")
  const [hpht, setHpht] = useState("")
  
  // Baseline states for first visit
  const [tb, setTb] = useState("")
  const [bbBefore, setBbBefore] = useState("")

  const [source, setSource] = useState<"alat" | "manual">("manual")
  const [saved, setSaved] = useState(false)

  // Classify metrics
  const bbStatus: StatusKey | null = useMemo(() => {
    if (bb === "") return null
    // Simple logic for weight gain track (needs gestational age for real calc)
    return "baik"
  }, [bb])

  const lilaStatus: StatusKey | null = useMemo(() => {
    if (lila === "") return null
    const v = parseFloat(lila)
    if (v < 23.5) return "buruk"
    return "baik"
  }, [lila])

  const hbStatus: StatusKey | null = useMemo(() => {
    if (hb === "") return null
    const v = parseFloat(hb)
    if (v < 11.0) return "buruk"
    if (v < 12.0) return "cukup"
    return "baik"
  }, [hb])

  const overall: StatusKey = useMemo(() => {
    if (lilaStatus === "buruk" || hbStatus === "buruk") return "buruk"
    if (hbStatus === "cukup") return "cukup"
    return "baik"
  }, [lilaStatus, hbStatus])

  const complete = bb !== "" && lila !== "" && hb !== "" && 
    (ibu?.pregnancyProfile ? true : (tb !== "" && bbBefore !== ""))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!complete) return
    
    try {
      await savePregnancyVisit({
        ibuId,
        currentWeightKg: parseFloat(bb),
        lilaCm: parseFloat(lila),
        hbGdl: parseFloat(hb),
        heightCm: tb !== "" ? parseFloat(tb) : 0,
        bbPrepregnancyKg: bbBefore !== "" ? parseFloat(bbBefore) : 0,
        hpht: hpht !== "" ? new Date(hpht) : new Date(),
      })
      setSaved(true)
      setTimeout(() => router.push(`/kader/ibu/${ibuId}`), 1200)
    } catch (err) {
      console.error(err)
      alert("Gagal menyimpan data kunjungan")
    }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center bg-[#EBF2F8] min-h-screen">Loading...</div>
  if (!ibu) return <div className="p-8">Ibu tidak ditemukan</div>

  const lastVisit = ibu.pregnancyVisits?.[0] || null

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
          <span className="text-xs text-[#173753] truncate font-medium">Catat data kunjungan rutin ibu hamil</span>
        </div>
        <div className="flex items-center gap-2 flex-none">
          <div className="flex items-center gap-2 px-4 h-8 text-xs text-[#173753] bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
            <Clock className="w-3.5 h-3.5" />
            <span className="tabular-nums font-medium">{time}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 bg-white rounded-full shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-[#173753]">
            <Bell className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost" size="sm"
            className="gap-1.5 text-xs h-8 px-4 bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-[#173753]"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="w-3.5 h-3.5" />
            Log Out
          </Button>
        </div>
      </div>

      <div className="p-6 lg:p-8 space-y-6">
        {/* Title + Breadcrumbs */}
        <div className="flex items-center justify-between">
          <div>
            <nav className="flex items-center gap-1 mb-1.5">
              <Link href="/kader/dashboard" className="text-xs text-[#173753]/50 hover:text-[#173753]">Dashboard</Link>
              <ChevronRight className="w-3 h-3 text-[#173753]/30 flex-none" />
              <Link href={`/kader/ibu/${ibuId}`} className="text-xs text-[#173753]/50 hover:text-[#173753]">Profil Ibu</Link>
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
            <p className="text-xs text-[#173753] font-medium leading-none">{session?.user?.name ?? "Zee Asadel"}</p>
            <p className="text-xs font-medium text-muted-foreground mt-0.5">Kader Posyandu {ibu.posyandu?.split(" · ")[0]}</p>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

        {/* Mother Banner */}
        <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl overflow-hidden border-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div
                className="h-13 w-13 rounded-[14px] flex items-center justify-center text-2xl font-bold text-[#173753] shrink-0"
                style={{ background: "linear-gradient(135deg, #C4D6E8, #52A9E3)" }}
              >
                {ibu.nama[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-medium text-[#173753] leading-tight">{ibu.nama}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    {ibu.pregnancyProfile?.hpht ? `${calculateGestationalAge(new Date(ibu.pregnancyProfile.hpht))} Minggu` : "— Minggu"}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    {ibu.pregnancyProfile?.hpht ? (() => {
                      const age = calculateGestationalAge(new Date(ibu.pregnancyProfile.hpht))
                      const tri = age <= 13 ? 1 : age <= 27 ? 2 : 3
                      return `Trimester ${tri}`
                    })() : "Trimester —"}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0 border-l border-gray-200 pl-4">
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Pemeriksaan terakhir</div>
                <div className="text-sm font-semibold text-[#173753] mt-0.5">
                  {lastVisit ? new Date(lastVisit.visitDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'long' }) : "—"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="grid gap-6"
          style={{ gridTemplateColumns: "1fr 340px", alignItems: "start" }}
        >
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            {!ibu.pregnancyProfile && (
              <SectionCard title="Data Dasar (Hanya Kunjungan Pertama)">
                <p className="text-[11px] text-slate-500 mb-6 font-medium leading-relaxed">
                  Data ini hanya perlu diisi satu kali di awal kehamilan untuk menghitung target kenaikan berat badan (IOM).
                </p>
                <MeasureRow icon={Ruler} label="Tinggi Badan" value={tb} onChange={setTb} unit="CM" />
                <MeasureRow icon={Scale} label="BB Sebelum Hamil" value={bbBefore} onChange={setBbBefore} unit="KG" />
                
                {/* Add HPHT input */}
                <div className="grid items-center gap-4 py-3 border-b border-gray-100 last:border-0" style={{ gridTemplateColumns: "40px 1fr 160px" }}>
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#EFF6FF", color: NAVY }}>
                    <Calendar className="h-[18px] w-[18px]" />
                  </div>
                  <div className="text-sm font-semibold text-[#173753]">HPHT</div>
                  <input type="date" value={hpht} onChange={(e) => setHpht(e.target.value)} className="w-full h-11 pl-3.5 pr-3 rounded-xl border border-gray-200 text-sm" />
                </div>
              </SectionCard>
            )}

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

              {/* Measurements */}
              <MeasureRow icon={Scale} label="Berat Badan" value={bb} onChange={setBb} unit="KG" status={bbStatus} />
              <MeasureRow icon={Ruler} label="Lingkar Lengan (LILA)" value={lila} onChange={setLila} unit="CM" status={lilaStatus} />
              <MeasureRow icon={Droplet} label="Kadar Hemoglobin (HB)" value={hb} onChange={setHb} unit="G/DL" status={hbStatus} />

              {/* Overall feedback */}
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

          {/* RIGHT COLUMN (STICKY) */}
          <div className="sticky top-8 space-y-6">
            <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl">
              <CardHeader className="pb-1 border-b border-gray-100 px-4">
                <CardTitle className="text-[16px] font-medium text-[#173753]">Ringkasan Kunjungan</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 px-4">
                {/* Measurements */}
                <div className="space-y-0 mb-4">
                  {[
                    { label: "Berat Badan", value: bb, unit: "kg", prev: ibu.pregnancyProfile?.bbPrepregnancyKg || 0, isWeight: true },
                    { label: "LILA", value: lila, unit: "cm", prev: lastVisit?.lilaCm || 0 },
                    { label: "Hemoglobin", value: hb, unit: "g/dl", prev: lastVisit?.hbGdl || 0 },
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
                        <Delta now={m.value} prev={m.prev} unit={m.unit} isWeight={m.isWeight} />
                      </span>
                    </div>
                  ))}
                </div>

                {/* Overall status */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Kondisi Ibu
                  </span>
                  <StatusPill status={overall} />
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <button
              type="submit"
              disabled={!complete || saved}
              className={cn(
                "h-12 w-full rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all",
                complete && !saved ? "cursor-pointer hover:opacity-90" : "cursor-not-allowed opacity-50",
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
              onClick={() => router.push(`/kader/ibu/${ibuId}`)}
            >
              Batal
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
