"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ChevronRight, ChevronDown, Check, ArrowRight,
  Search, TriangleAlert, Clock, LogOut,
  User, Baby,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { signOut, useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { createIbu } from "@/lib/actions/kader"
import { NotificationBell } from "@/components/kader/notification-bell"
import { calculateIMT, getIMTCategory, getIOMTargets } from "@/lib/growth-standards/imt-calc"

const MONTHS_ID = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"]
const FULL_MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
const ACCENT = "#52A9E3"

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

interface FormState {
  nama: string
  username: string
  password: string
  noHp: string
  tanggalLahir: string
  alamat: string
  isHamil: boolean
  hpht: string
  bbPrepregnancyKg: string
  heightCm: string
  currentWeightKg: string
}

const requiredFields = ["nama", "username", "password"] as const
type RequiredKey = (typeof requiredFields)[number]

function FormField({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-[#173753]">
        {label}{required && <span className="text-[#D93025] ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, type = "text", suffix }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; suffix?: string
}) {
  return (
    <div className="relative">
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-10 text-sm border-gray-200 focus-visible:ring-1 focus-visible:ring-[#52A9E3] focus-visible:border-[#52A9E3] rounded-lg text-[#173753] placeholder:text-gray-300",
          suffix && "pr-10"
        )}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl border-none overflow-hidden">
      <CardHeader className="pb-1.5 border-b border-[#F0F0F0] px-4">
        <CardTitle className="text-[16px] font-semibold text-[#173753] leading-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-2 px-4">{children}</CardContent>
    </Card>
  )
}

export default function TambahPasienPage() {
  const { data: session } = useSession()
  const time = useTime()
  const router = useRouter()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [f, setF] = useState<FormState>({
    nama: "", username: "", password: "", noHp: "", tanggalLahir: "", alamat: "", isHamil: false,
    hpht: "", bbPrepregnancyKg: "", heightCm: "", currentWeightKg: "",
  })

  const set = (k: keyof FormState) => (v: string | boolean) =>
    setF((prev) => ({ ...prev, [k]: v }))

  // Pregnancy calculations
  const preg = (() => {
    if (!f.isHamil || !f.hpht) return null
    const hpht = new Date(f.hpht)
    const now = new Date()
    const diffTime = now.getTime() - hpht.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const weeks = Math.floor(diffDays / 7)
    
    const edd = new Date(hpht)
    edd.setDate(edd.getDate() + 280)
    
    let trimester = 1
    if (weeks >= 28) trimester = 3
    else if (weeks >= 14) trimester = 2

    const imt = (f.bbPrepregnancyKg && f.heightCm) 
      ? calculateIMT(Number(f.bbPrepregnancyKg), Number(f.heightCm)) 
      : null
    const targets = imt ? getIOMTargets(getIMTCategory(imt)) : null
    const currentGain = (f.currentWeightKg && f.bbPrepregnancyKg)
      ? Number(f.currentWeightKg) - Number(f.bbPrepregnancyKg)
      : null

    return { weeks, edd, trimester, targets, currentGain }
  })()

  const filled = requiredFields.filter((k) => !!f[k as RequiredKey]).length
  const pregComplete = !f.isHamil || (!!f.hpht && !!f.bbPrepregnancyKg && !!f.heightCm)
  const complete = filled === requiredFields.length && f.password.length >= 6 && pregComplete

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!complete) return
    setError(null)
    try {
      const ibu = await createIbu({
        nama: f.nama,
        username: f.username,
        password: f.password,
        noHp: f.noHp || undefined,
        tanggalLahir: f.tanggalLahir || undefined,
        alamat: f.alamat || undefined,
        isHamil: f.isHamil,
        hpht: f.isHamil ? f.hpht : undefined,
        bbPrepregnancyKg: f.isHamil ? Number(f.bbPrepregnancyKg) : undefined,
        heightCm: f.isHamil ? Number(f.heightCm) : undefined,
        currentWeightKg: f.isHamil ? Number(f.currentWeightKg) : undefined,
      })
      setSaved(true)
      setTimeout(() => router.push(`/kader/ibu/${ibu.id}`), 1000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal mendaftarkan ibu"
      setError(msg === "USERNAME_TAKEN" ? "Username sudah digunakan, coba yang lain" : msg)
    }
  }

  const initial = (f.nama.trim()[0] ?? "?").toUpperCase()

  return (
    <div className="flex-1 bg-[#EBF2F8] flex flex-col">
      {/* Topbar */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2 z-10">
        <div className="relative w-[291px] flex-none">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#173753] z-10" />
          <Input className="pl-8 h-8 text-xs text-[#173753] placeholder:text-[#BBBBBB] bg-white rounded-[50px] border-none shadow-[2px_2px_8px_rgba(0,0,0,0.08)] focus-visible:ring-1 focus-visible:ring-gray-200" placeholder="Search" />
        </div>
        <div className="flex-1 flex items-center gap-2 px-4 h-8 bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
          <TriangleAlert className="w-3.5 h-3.5 text-[#E53935] flex-none" />
          <span className="text-xs text-[#173753] truncate font-medium">Daftarkan pasien baru</span>
        </div>
        <div className="flex items-center gap-2 flex-none">
          <div className="flex items-center gap-2 px-4 h-8 text-xs text-[#173753] bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
            <Clock className="w-3.5 h-3.5" />
            <span className="tabular-nums">{time}</span>
          </div>
          <NotificationBell />
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8 px-4 bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-[#173753] hover:bg-white/80" onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut className="w-3.5 h-3.5" />
            Log Out
          </Button>
        </div>
      </div>

      <div className="p-6 lg:p-8 space-y-6">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div>
            <nav className="flex items-center gap-1 mb-1.5">
              <Link href="/kader/dashboard" className="text-xs text-[#173753]/50 hover:text-[#173753] transition-colors">Dashboard</Link>
              <ChevronRight className="w-3 h-3 text-[#173753]/30 flex-none" />
              <Link href="/kader/rekap" className="text-xs text-[#173753]/50 hover:text-[#173753] transition-colors">Pasien</Link>
              <ChevronRight className="w-3 h-3 text-[#173753]/30 flex-none" />
              <span className="text-xs text-[#173753] font-medium">Tambah Pasien</span>
            </nav>
            <h1 className="text-2xl font-medium text-[#173753]">Daftarkan Ibu Baru</h1>
          </div>
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

        <form
          onSubmit={handleSubmit}
          className="grid gap-5"
          style={{ gridTemplateColumns: "1fr 360px", alignItems: "start" }}
        >
          {/* Left */}
          <div className="flex flex-col gap-4">
            <SectionCard title="Identitas ibu">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <FormField label="Nama lengkap" required>
                    <TextInput value={f.nama} onChange={set("nama")} placeholder="mis. Sri Wahyuni" />
                  </FormField>
                </div>
                <FormField label="Username" required hint="Digunakan untuk login ke aplikasi">
                  <TextInput value={f.username} onChange={set("username")} placeholder="mis. sri.wahyuni" />
                </FormField>
                <FormField label="Password" required hint="Minimal 6 karakter">
                  <TextInput value={f.password} onChange={set("password")} type="password" placeholder="••••••" />
                </FormField>
                <FormField label="No. telepon">
                  <TextInput value={f.noHp} onChange={set("noHp")} placeholder="08xx xxxx xxxx" />
                </FormField>
                <FormField label="Tanggal lahir">
                  <TextInput value={f.tanggalLahir} onChange={set("tanggalLahir")} type="date" />
                </FormField>
                <div className="col-span-2">
                  <FormField label="Alamat tinggal">
                    <TextInput value={f.alamat} onChange={set("alamat")} placeholder="RT/RW, dusun, desa" />
                  </FormField>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Status kehamilan">
              <div className="grid grid-cols-2 gap-3 py-1 mb-2">
                {([
                  { value: false, label: "Tidak hamil", Icon: User },
                  { value: true,  label: "Sedang hamil", Icon: Baby  },
                ] as { value: boolean; label: string; Icon: React.ElementType }[]).map(({ value, label, Icon }) => {
                  const selected = f.isHamil === value
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => set("isHamil")(value)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 rounded-xl border-2 py-4 px-3 transition-all text-sm font-medium",
                        selected
                          ? "border-[#52A9E3] bg-[#EBF2F8] text-[#52A9E3]"
                          : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"
                      )}
                    >
                      <Icon className="w-6 h-6" strokeWidth={1.8} />
                      {label}
                    </button>
                  )
                })}
              </div>

              {f.isHamil && (
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                  <div className="col-span-2 bg-[#F8FAFC] p-4 rounded-xl border border-blue-50/50">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-[#52A9E3] uppercase tracking-wider mb-1">Usia Kehamilan</p>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-bold text-[#173753]">{preg?.weeks ?? "—"}</span>
                          <span className="text-sm font-medium text-[#173753]/60">Minggu</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">
                          {preg ? `Trimester ${preg.trimester} · Perkiraan Lahir: ${preg.edd.getDate()} ${MONTHS_ID[preg.edd.getMonth()]} ${preg.edd.getFullYear()}` : "Input HPHT untuk kalkulasi"}
                        </p>
                      </div>
                      <div className="h-12 w-[1px] bg-gray-200" />
                      <div className="flex-1 pl-2">
                        <p className="text-[10px] font-bold text-[#52A9E3] uppercase tracking-wider mb-1">Target Kenaikan</p>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl font-bold text-[#173753]">
                            {preg?.targets ? `${preg.targets.totalGainMinKg}-${preg.targets.totalGainMaxKg}` : "—"}
                          </span>
                          <span className="text-sm font-medium text-[#173753]/60">kg</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">
                          Kenaikan saat ini: <span className={cn("font-bold", (preg?.currentGain ?? 0) > 0 ? "text-green-600" : "text-[#173753]")}>
                            {preg?.currentGain != null ? `${preg.currentGain.toFixed(1)} kg` : "—"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <FormField label="HPHT (Haid Terakhir)" required hint="Kalkulasi usia & EDD">
                    <TextInput value={f.hpht} onChange={set("hpht")} type="date" />
                  </FormField>
                  <FormField label="Tinggi Badan" required hint="Untuk hitung IMT">
                    <TextInput value={f.heightCm} onChange={set("heightCm")} type="number" placeholder="0" suffix="cm" />
                  </FormField>
                  <FormField label="BB Pre-Kehamilan" required>
                    <TextInput value={f.bbPrepregnancyKg} onChange={set("bbPrepregnancyKg")} type="number" placeholder="0" suffix="kg" />
                  </FormField>
                  <FormField label="BB Saat Ini">
                    <TextInput value={f.currentWeightKg} onChange={set("currentWeightKg")} type="number" placeholder="0" suffix="kg" />
                  </FormField>
                </div>
              )}
            </SectionCard>
          </div>

          {/* Right */}
          <div className="flex flex-col gap-4 sticky top-6">
            {/* Preview */}
            <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl">
              <CardHeader className="pb-1.5 border-b border-gray-100 px-4">
                <CardTitle className="text-[16px] font-medium text-[#173753]">Pratinjau</CardTitle>
              </CardHeader>
              <CardContent className="pt-2 px-4">
                <div className="flex flex-col items-center text-center pb-5 border-b border-gray-100 relative">
                  <div
                    className="h-18 w-18 rounded-[20px] flex items-center justify-center text-[38px] font-bold text-[#173753] mb-3.5 select-none"
                    style={{ background: "linear-gradient(135deg, #C4D6E8, #52A9E3)" }}
                  >
                    {initial}
                  </div>
                  <div className="text-xl font-bold text-[#173753] leading-tight">
                    {f.nama || <span className="text-muted-foreground font-normal text-base">Nama ibu</span>}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {f.username
                      ? <span className="font-medium">@{f.username}</span>
                      : <span className="italic text-gray-300">(username)</span>}
                  </div>
                </div>
                <div className="grid gap-x-3 gap-y-2.5 pt-4 text-sm" style={{ gridTemplateColumns: "88px 1fr" }}>
                  {[
                    { label: "No. HP", value: f.noHp || null },
                    { label: "Alamat", value: f.alamat || null },
                  ].map(({ label, value }) => (
                    <div key={label} className="contents">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider self-center">{label}</span>
                      <span className={cn("text-sm font-medium", value ? "text-[#173753]" : "text-gray-300 italic font-normal")}>
                        {value || "(Belum diisi)"}
                      </span>
                    </div>
                  ))}
                  <div className="contents">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider self-center">Status</span>
                    <span className={cn(
                      "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full w-fit",
                      f.isHamil ? "bg-[#52A9E3] text-white" : "bg-gray-100 text-gray-500"
                    )}>
                      {f.isHamil ? <Baby className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      {f.isHamil ? "Sedang Hamil" : "Tidak Hamil"}
                    </span>
                  </div>

                  {f.isHamil && (
                    <>
                      <div className="contents">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider self-center">Hamil</span>
                        <span className="text-sm font-bold text-[#52A9E3]">
                          {preg?.weeks ?? "—"} Minggu (T{preg?.trimester ?? "—"})
                        </span>
                      </div>
                      <div className="contents">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider self-center">HPL</span>
                        <span className="text-sm font-medium text-[#173753]">
                          {preg ? `${preg.edd.getDate()} ${MONTHS_ID[preg.edd.getMonth()]} ${preg.edd.getFullYear()}` : "—"}
                        </span>
                      </div>
                      <div className="contents">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider self-center">Target</span>
                        <span className="text-sm font-medium text-[#173753]">
                          {preg?.targets ? `${preg.targets.totalGainMinKg}-${preg.targets.totalGainMaxKg} kg` : "—"}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Checklist */}
            <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl">
              <CardContent className="pt-2 pb-3 px-4">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Wajib diisi · {filled + (f.isHamil ? (pregComplete ? 1 : 0) : 0)}/{requiredFields.length + (f.isHamil ? 1 : 0)}
                </div>
                <div className="flex flex-col gap-2.5">
                  {[
                    { k: "nama", l: "Nama lengkap", ok: !!f.nama },
                    { k: "username", l: "Username", ok: !!f.username },
                    { k: "password", l: "Password (min. 6)", ok: f.password.length >= 6 },
                    ...(f.isHamil ? [{ k: "preg", l: "Data detail kehamilan", ok: pregComplete }] : []),
                  ].map(({ k, l, ok }) => (
                    <div key={k} className={cn("flex items-center gap-2.5 text-sm transition-colors", ok ? "text-[#173753]" : "text-muted-foreground")}>
                      <span
                        className="h-4.5 w-4.5 rounded-full flex items-center justify-center shrink-0"
                        style={ok ? { background: "#1E8E3E" } : { border: "1.5px solid #D1D5DB" }}
                      >
                        {ok && <Check className="h-2.5 w-2.5 text-white" strokeWidth={2.8} />}
                      </span>
                      {l}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {error && <p className="text-xs text-red-600 text-center font-medium">{error}</p>}

            <button
              type="submit"
              disabled={!complete}
              className={cn(
                "h-12 w-full rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all",
                complete ? "text-white cursor-pointer hover:opacity-90" : "text-white/60 cursor-not-allowed",
              )}
              style={{ background: complete ? `linear-gradient(to right, ${ACCENT}, #93D1F7)` : "#9CA3AF" }}
            >
              {saved
                ? <><Check className="h-4 w-4" strokeWidth={2.5} />Tersimpan</>
                : <>Simpan & daftarkan ibu<ArrowRight className="h-4 w-4" /></>}
            </button>

            <Button type="button" variant="ghost" className="w-full text-sm text-muted-foreground hover:text-[#173753]" onClick={() => router.push("/kader/rekap")}>
              Batal
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
