"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { X, Search, ChevronRight, ChevronLeft, Check, User, Loader2, ArrowRight, Eye, EyeOff, Info, Copy } from "lucide-react"
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { searchIbu, createIbu, createChildForIbu, getPosyanduName } from "@/lib/actions/kader"
import { KELURAHAN_NAMES } from "@/lib/constants/kelurahan"

const ACCENT = "#52A9E3"

// ─── Types ───────────────────────────────────────────────────────────────────

type IbuSearchResult = {
  id: string
  nama: string
  noHp: string | null
  alamat: string | null
  kelurahan: string | null
  username: string
}

interface IbuForm {
  nama: string
  noHp: string
  alamat: string
  kelurahan: string
  username: string
  password: string
}

interface AnakForm {
  nama: string
  jenisKelamin: "L" | "P" | ""
  tanggalLahir: string
  beratLahirKg: string
  panjangLahirCm: string
}

interface RegisterType {
  anak: boolean
  kehamilan: boolean
}

interface TambahPasienModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

// ─── Progress Stepper ─────────────────────────────────────────────────────────

const STEPS = [
  { num: 1, label: "Data Ibu & Akun" },
  { num: 2, label: "Data Pasien" },
  { num: 3, label: "Ringkasan" },
]

function StepBar({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-0 px-[26px] py-4">
      {STEPS.map((step, i) => {
        const done = current > step.num
        const active = current === step.num
        return (
          <div key={step.num} className="flex items-center gap-0 flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 flex-none">
              <div
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300",
                  done
                    ? "bg-[#52A9E3] text-white"
                    : active
                    ? "bg-[#52A9E3] text-white"
                    : "bg-gray-200 text-gray-400"
                )}
              >
                {done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : step.num}
              </div>
              <span
                className={cn(
                  "text-[10px] font-semibold whitespace-nowrap transition-colors duration-300",
                  active ? "text-[#173753]" : done ? "text-[#52A9E3]" : "text-gray-400"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-[2px] mx-2 rounded-full transition-all duration-500 mb-5",
                  current > step.num ? "bg-[#52A9E3]" : "bg-gray-200"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

export function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="text-[12px] font-semibold text-[#173753] mb-1 block">
      {label}
      {required && <span className="text-[#D93025] ml-0.5">*</span>}
    </label>
  )
}

export function StyledInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <Input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 text-[13px] border-gray-200 focus-visible:ring-1 focus-visible:ring-[#52A9E3] focus-visible:border-[#52A9E3] rounded-lg text-[#173753] placeholder:text-gray-300"
    />
  )
}

export function StyledTextarea({
  value,
  onChange,
  placeholder,
  rows = 2,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-[13px] border border-gray-200 focus-visible:ring-1 focus-visible:ring-[#52A9E3] focus-visible:border-[#52A9E3] rounded-lg text-[#173753] placeholder:text-gray-300 px-2.5 py-1.5 outline-none resize-none transition-colors"
    />
  )
}

export function SectionCard({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] border border-gray-100 overflow-hidden">
      <div className="px-4 py-2 bg-[#F4F8FD] flex items-center justify-between">
        <p className="text-[11px] font-bold text-[#173753]">{title}</p>
        {badge && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-600 uppercase tracking-wide">
            {badge}
          </span>
        )}
      </div>
      <div className="px-4 py-3 flex flex-col gap-3 bg-white">{children}</div>
    </div>
  )
}

// ─── Step 1: Data Ibu & Akun ──────────────────────────────────────────────────

function Step1({
  ibuForm,
  setIbuForm,
  selectedIbu,
  setSelectedIbu,
}: {
  ibuForm: IbuForm
  setIbuForm: (f: IbuForm) => void
  selectedIbu: IbuSearchResult | null
  setSelectedIbu: (ibu: IbuSearchResult | null) => void
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<IbuSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setShowResults(false)
      return
    }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await searchIbu(query)
        setResults(data)
        setShowResults(true)
      } finally {
        setSearching(false)
      }
    }, 350)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query])

  const set = (k: keyof IbuForm) => (v: string) => setIbuForm({ ...ibuForm, [k]: v })

  const handleSelectIbu = (ibuResult: IbuSearchResult) => {
    setSelectedIbu(ibuResult)
    setQuery("")
    setShowResults(false)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search existing ibu */}
      <SectionCard title="Cari data ibu yang sudah terdaftar">
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 z-10" />
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedIbu(null) }}
              placeholder="Cari nama atau No. HP ibu"
              className="pl-8 h-9 text-[13px] bg-white border-gray-200 focus-visible:ring-1 focus-visible:ring-[#52A9E3] rounded-lg text-[#173753] placeholder:text-gray-300"
            />
            {searching && (
              <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#52A9E3] animate-spin" />
            )}
          </div>

          {/* Search results dropdown */}
          {showResults && results.length > 0 && (
            <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelectIbu(r)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[#EBF2F8] transition-colors border-b border-gray-50 last:border-0"
                >
                  <div className="h-7 w-7 rounded-full bg-[#F0EBFB] flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-[#6A48C4]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold text-[#173753] truncate">{r.nama}</p>
                    <p className="text-[11px] text-muted-foreground">{r.noHp || "—"}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 ml-auto" />
                </button>
              ))}
            </div>
          )}
          {showResults && results.length === 0 && !searching && (
            <p className="text-[11px] text-muted-foreground text-center py-2">Ibu tidak ditemukan</p>
          )}

          {/* Selected ibu chip */}
          {selectedIbu && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#EBF2F8] border border-[#52A9E3]/20">
              <div className="h-8 w-8 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0" style={{ background: "#F0EBFB", color: "#6A48C4" }}>
                {selectedIbu.nama.trim()[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold text-[#173753] truncate">{selectedIbu.nama}</p>
                <p className="text-[11px] text-muted-foreground">{selectedIbu.noHp || "—"}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIbu(null)}
                className="h-5 w-5 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors flex-shrink-0"
              >
                <X className="w-2.5 h-2.5 text-gray-600" />
              </button>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Divider OR DAFTARKAN IBU BARU */}
      {!selectedIbu && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
              ATAU BUAT DATA IBU BARU
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* New ibu form */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <FieldLabel label="Nama Lengkap Ibu" required />
              <StyledInput value={ibuForm.nama} onChange={set("nama")} placeholder="mis. Siti Rahma" />
            </div>
            <div>
              <FieldLabel label="No. HP" required />
              <StyledInput value={ibuForm.noHp} onChange={set("noHp")} placeholder="0812 xxxx xxxx" />
            </div>
            <div>
              <FieldLabel label="Kelurahan" required />
              <Select value={ibuForm.kelurahan} onValueChange={(v) => set("kelurahan")(v as string)}>
                <SelectTrigger className="h-9 w-full text-[13px] border-gray-200 rounded-lg text-[#173753]">
                  <SelectValue placeholder="Pilih kelurahan" />
                </SelectTrigger>
                <SelectContent>
                  {KELURAHAN_NAMES.map((k) => (
                    <SelectItem key={k} value={k} className="text-[13px]">{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <FieldLabel label="Alamat" />
              <StyledTextarea value={ibuForm.alamat} onChange={set("alamat")} placeholder="Nama jalan, nomor rumah, RT/RW" />
            </div>
          </div>

          <SectionCard title="Akun Aplikasi Ibu">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel label="Username" required />
                <StyledInput value={ibuForm.username} onChange={set("username")} placeholder="mis. sitirahma01" />
              </div>
              <div>
                <FieldLabel label="Password" required />
                <div className="relative">
                  <StyledInput 
                    value={ibuForm.password} 
                    onChange={set("password")} 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••" 
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 h-full px-3 flex items-center justify-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            {ibuForm.password && ibuForm.password.length < 6 && (
              <p className="text-[11px] text-amber-600">Password minimal 6 karakter</p>
            )}
          </SectionCard>
        </>
      )}
    </div>
  )
}

// ─── Step 2: Data Pasien ──────────────────────────────────────────────────────

function RegisterTypeCard({
  title,
  desc,
  checked,
  onToggle,
}: {
  title: string
  desc: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3 rounded-lg border text-left transition-all",
        checked
          ? "border-[#52A9E3] bg-[#EBF2F8]"
          : "border-gray-200 bg-white hover:border-gray-300"
      )}
    >
      <div className="flex-1 min-w-0">
        <p className={cn("text-[13px] font-bold", checked ? "text-[#173753]" : "text-gray-500")}>{title}</p>
        <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-snug">{desc}</p>
      </div>
      <div
        className={cn(
          "h-5 w-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border-2 transition-all",
          checked ? "bg-[#52A9E3] border-[#52A9E3]" : "border-gray-300"
        )}
      >
        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </div>
    </button>
  )
}

function Step2({
  anakForm,
  setAnakForm,
  registerType,
  setRegisterType,
}: {
  anakForm: AnakForm
  setAnakForm: (f: AnakForm) => void
  registerType: RegisterType
  setRegisterType: (r: RegisterType) => void
}) {
  const set = (k: keyof AnakForm) => (v: string) => setAnakForm({ ...anakForm, [k]: v })

  return (
    <div className="flex flex-col gap-4">
      {/* Pilih jenis pasien */}
      <div className="flex flex-col gap-2">
        <p className="text-[12px] font-bold text-[#173753]">Pilih pasien yang didaftarkan</p>
        <p className="text-[11px] text-muted-foreground -mt-1">Boleh pilih keduanya</p>
        
        <div className="grid grid-cols-2 gap-3 mt-1">
          <RegisterTypeCard
            title="Anak"
            desc="Pemantauan tumbuh kembang (berat badan, tinggi badan, dan status gizi)."
            checked={registerType.anak}
            onToggle={() => setRegisterType({ ...registerType, anak: !registerType.anak })}
          />
          <RegisterTypeCard
            title="Ibu Hamil"
            desc="Skrining kesehatan kehamilan (berat badan, LILA, dan Hb)."
            checked={registerType.kehamilan}
            onToggle={() => setRegisterType({ ...registerType, kehamilan: !registerType.kehamilan })}
          />
        </div>
        {registerType.kehamilan && !registerType.anak && (
          <p className="text-[11px] text-muted-foreground bg-[#F8FAFC] rounded-xl px-3 py-2 leading-snug">
            Tidak mendaftarkan anak sekarang? Data anak bisa ditambahkan kapan saja dari profil ibu.
          </p>
        )}
        {!registerType.anak && !registerType.kehamilan && (
          <p className="text-[11px] text-muted-foreground bg-amber-50 rounded-xl px-3 py-2 leading-snug">
            Pilih minimal satu jenis pendaftaran.
          </p>
        )}
      </div>

      {/* Form anak */}
      {registerType.anak && (
        <SectionCard title="Data Anak">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <FieldLabel label="Nama Lengkap Anak" required />
              <StyledInput value={anakForm.nama} onChange={set("nama")} placeholder="mis. Ananda Putri" />
            </div>

            <div>
              <FieldLabel label="Tanggal Lahir" required />
              <StyledInput value={anakForm.tanggalLahir} onChange={set("tanggalLahir")} type="date" />
            </div>

            <div>
              <FieldLabel label="Jenis Kelamin" required />
              <div className="grid grid-cols-2 gap-2">
                {(["L", "P"] as const).map((jk) => (
                  <button
                    key={jk}
                    type="button"
                    onClick={() => setAnakForm({ ...anakForm, jenisKelamin: jk })}
                    className={cn(
                      "flex items-center justify-center h-9 rounded-lg border text-[13px] font-semibold transition-colors",
                      anakForm.jenisKelamin === jk
                        ? "border-[#52A9E3] bg-[#EBF2F8] text-[#52A9E3]"
                        : "border-gray-200 text-[#173753] hover:border-gray-300"
                    )}
                  >
                    {jk === "L" ? "Laki-laki" : "Perempuan"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel label="Berat Badan (kg)" />
              <StyledInput value={anakForm.beratLahirKg} onChange={set("beratLahirKg")} type="number" placeholder="mis. 3,2" />
            </div>
            <div>
              <FieldLabel label="Tinggi Badan (cm)" />
              <StyledInput value={anakForm.panjangLahirCm} onChange={set("panjangLahirCm")} type="number" placeholder="mis. 49" />
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  )
}

// ─── Step 3: Ringkasan ────────────────────────────────────────────────────────

function Step3({
  selectedIbu,
  ibuForm,
  anakForm,
  registerType,
}: {
  selectedIbu: IbuSearchResult | null
  ibuForm: IbuForm
  anakForm: AnakForm
  registerType: RegisterType
}) {
  const [copied, setCopied] = useState(false)

  const ibuDisplay = selectedIbu
    ? { nama: selectedIbu.nama, noHp: selectedIbu.noHp ?? "—", alamat: selectedIbu.alamat ?? "—", kelurahan: selectedIbu.kelurahan ?? "—", username: selectedIbu.username, isNew: false }
    : { nama: ibuForm.nama, noHp: ibuForm.noHp || "—", alamat: ibuForm.alamat || "—", kelurahan: ibuForm.kelurahan || "—", username: ibuForm.username, isNew: true }

  const ageText = (() => {
    if (!anakForm.tanggalLahir) return "—"
    const birth = new Date(anakForm.tanggalLahir)
    const now = new Date()
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
    if (months < 0) return "—"
    if (months < 24) return `${months} bulan`
    return `${Math.floor(months / 12)} tahun ${months % 12} bulan`
  })()

  const jkLabel = anakForm.jenisKelamin === "L" ? "Laki-laki" : anakForm.jenisKelamin === "P" ? "Perempuan" : "—"

  return (
    <div className="flex flex-col gap-4">
      {/* Ibu summary */}
      <SectionCard title="Data Ibu" badge={ibuDisplay.isNew ? "Data Baru" : undefined}>
        <div className="flex items-center gap-3 pb-1">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center text-[#6A48C4] bg-[#F0EBFB] text-[16px] font-bold flex-shrink-0"
          >
            {ibuDisplay.nama.trim()[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <p className="text-[14px] font-bold text-[#173753]">{ibuDisplay.nama || "—"}</p>
            {!ibuDisplay.isNew && (
              <p className="text-[11px] text-muted-foreground">@{ibuDisplay.username || "—"}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { k: "No. HP", v: ibuDisplay.noHp },
            { k: "Kelurahan", v: ibuDisplay.kelurahan },
            { k: "Alamat", v: ibuDisplay.alamat },
          ].map(({ k, v }) => (
            <div key={k} className="flex flex-col">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{k}</span>
              <span className="text-[12.5px] font-medium text-[#173753] leading-snug mt-0.5">{v}</span>
            </div>
          ))}
        </div>

        {ibuDisplay.isNew && (
          <div className="flex flex-col gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3.5 mt-1">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[12.5px] font-bold text-amber-900">Info Login Aplikasi Ibu</p>
                <p className="text-[11px] text-amber-700 leading-snug mt-0.5">
                  Salin kata sandi sekarang. Info ini hanya ditampilkan satu kali.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`Username: ${ibuForm.username}\nKata Sandi: ${ibuForm.password}`)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10.5px] font-bold border shadow-sm transition-all flex-shrink-0",
                  copied 
                    ? "bg-green-50 text-green-700 border-green-200" 
                    : "bg-white/60 hover:bg-white text-amber-800 border-amber-200/60"
                )}
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Tersalin" : "Salin"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-1.5">
              <div>
                <p className="text-[10px] font-semibold text-amber-700/70 uppercase">Username</p>
                <p className="text-[13px] font-bold text-amber-950">{ibuForm.username}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-amber-700/70 uppercase">Kata Sandi</p>
                <p className="text-[13px] font-bold text-amber-950">{ibuForm.password}</p>
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Anak summary */}
      {registerType.anak && (<SectionCard title="Data Anak" badge="Data Baru">
        <div className="flex items-center gap-3 pb-1">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center text-[#1D4ED8] bg-[#DBEAFE] text-[16px] font-bold flex-shrink-0"
          >
            {anakForm.nama.trim()[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <p className="text-[14px] font-bold text-[#173753] leading-none">{anakForm.nama || "—"}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-1.5">
          {[
            { k: "Jenis Kelamin", v: jkLabel },
            { k: "Tanggal Lahir", v: anakForm.tanggalLahir ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(anakForm.tanggalLahir)) : "—" },
            { k: "Usia", v: anakForm.tanggalLahir ? ageText : "—" },
            { k: "Berat Lahir", v: anakForm.beratLahirKg ? `${anakForm.beratLahirKg} kg` : "—" },
            { k: "Panjang Lahir", v: anakForm.panjangLahirCm ? `${anakForm.panjangLahirCm} cm` : "—" },
          ].map(({ k, v }) => (
            <div key={k} className="flex flex-col">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{k}</span>
              <span className="text-[12.5px] font-medium text-[#173753] leading-snug mt-0.5">{v}</span>
            </div>
          ))}
        </div>
      </SectionCard>)}
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function TambahPasienModal({ open, onOpenChange, onSaved }: TambahPasienModalProps) {
  const [posyanduName, setPosyanduName] = useState("")

  useEffect(() => {
    getPosyanduName().then(setPosyanduName).catch(() => setPosyanduName("Posyandu"))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedIbu, setSelectedIbu] = useState<IbuSearchResult | null>(null)
  const [ibuForm, setIbuForm] = useState<IbuForm>({
    nama: "", noHp: "", alamat: "", kelurahan: "", username: "", password: "",
  })
  const [anakForm, setAnakForm] = useState<AnakForm>({
    nama: "", jenisKelamin: "", tanggalLahir: "", beratLahirKg: "", panjangLahirCm: "",
  })
  const [registerType, setRegisterType] = useState<RegisterType>({ anak: true, kehamilan: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(1)
        setSelectedIbu(null)
        setIbuForm({ nama: "", noHp: "", alamat: "", kelurahan: "", username: "", password: "" })
        setAnakForm({ nama: "", jenisKelamin: "", tanggalLahir: "", beratLahirKg: "", panjangLahirCm: "" })
        setRegisterType({ anak: true, kehamilan: false })
        setError(null)
        setSaved(false)
      }, 300)
    }
  }, [open])

  // Step 1 validation
  const step1Valid = (() => {
    if (selectedIbu) return true
    return (
      ibuForm.nama.trim() !== "" &&
      ibuForm.noHp.trim() !== "" &&
      ibuForm.kelurahan !== "" &&
      ibuForm.username.trim() !== "" &&
      ibuForm.password.length >= 6
    )
  })()

  // Step 2 validation
  const step2Valid = (() => {
    if (!registerType.anak && !registerType.kehamilan) return false
    if (registerType.anak) {
      return anakForm.nama.trim() !== "" && anakForm.jenisKelamin !== "" && anakForm.tanggalLahir !== ""
    }
    return true // kehamilan only
  })()

  const handleNext = () => {
    if (step === 1 && step1Valid) setStep(2)
    else if (step === 2 && step2Valid) setStep(3)
  }

  const handleBack = () => {
    if (step === 2) setStep(1)
    else if (step === 3) setStep(2)
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)
    try {
      let ibuId: string
      if (selectedIbu) {
        ibuId = selectedIbu.id
      } else {
        const ibuRow = await createIbu({
          nama: ibuForm.nama,
          username: ibuForm.username,
          password: ibuForm.password,
          kelurahan: ibuForm.kelurahan,
          noHp: ibuForm.noHp || undefined,
          alamat: ibuForm.alamat || undefined,
          isHamil: registerType.kehamilan,
        })
        ibuId = ibuRow.id
      }

      if (registerType.anak) {
        await createChildForIbu({
          ibuId,
          nama: anakForm.nama,
          sex: anakForm.jenisKelamin,
          birth: anakForm.tanggalLahir,
        })
      }

      setSaved(true)
      onSaved()
      setTimeout(() => onOpenChange(false), 800)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan"
      setError(msg === "USERNAME_TAKEN" ? "Username sudah digunakan, coba yang lain" : msg)
    } finally {
      setSaving(false)
    }
  }

  const finalLabel = (registerType.anak && registerType.kehamilan)
    ? "Simpan Data Pasien"
    : "Simpan & Mulai Pemeriksaan"

  const nextLabel =
    step === 1 ? "Lanjut ke Data Pasien" :
    step === 2 ? "Lanjut ke Ringkasan" :
    saved ? "Tersimpan" : finalLabel

  const nextEnabled =
    step === 1 ? step1Valid :
    step === 2 ? step2Valid :
    !saving && !saved

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-[rgba(20,48,74,0.45)]" />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[580px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-48px)] flex flex-col rounded-[20px] bg-white shadow-[0_24px_64px_rgba(20,48,74,0.28)] outline-none">
          {/* ── Header ── */}
          <div className="pt-5 px-[26px] pb-0 flex items-start justify-between gap-3 flex-shrink-0">
            <div className="min-w-0">
              <DialogTitle className="text-[17px] font-semibold text-[#173753] leading-tight">
                Tambah Pasien
              </DialogTitle>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Daftarkan data ibu dan anak baru ke {posyanduName || "Posyandu Anda"}.
              </p>
            </div>
            <DialogClose className="h-[30px] w-[30px] rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-[#173753] transition-colors flex-shrink-0">
              <X className="w-4 h-4" />
            </DialogClose>
          </div>

          {/* ── Stepper ── */}
          <div className="flex-shrink-0">
            <StepBar current={step} />
          </div>

          <div className="h-px bg-gray-100 flex-shrink-0" />

          {/* ── Body ── */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="px-[26px] py-4 flex flex-col gap-4">
            {step === 1 && (
              <Step1
                ibuForm={ibuForm}
                setIbuForm={setIbuForm}
                selectedIbu={selectedIbu}
                setSelectedIbu={setSelectedIbu}
              />
            )}
            {step === 2 && (
              <Step2
                anakForm={anakForm}
                setAnakForm={setAnakForm}
                registerType={registerType}
                setRegisterType={setRegisterType}
              />
            )}
            {step === 3 && (
              <Step3
                selectedIbu={selectedIbu}
                ibuForm={ibuForm}
                anakForm={anakForm}
                registerType={registerType}
              />
            )}

            {error && (
              <p className="text-[12px] text-red-600 font-medium text-center bg-red-50 rounded-xl py-2 px-3">
                {error}
              </p>
            )}
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex-shrink-0 flex items-center justify-between px-[26px] py-[15px] border-t border-gray-100">
            {step === 1 ? (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="h-9 px-4 rounded-full text-[13px] font-medium text-muted-foreground hover:text-[#173753] transition-colors"
              >
                Batal
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBack}
                className="h-9 px-4 rounded-full text-[13px] font-medium text-muted-foreground hover:text-[#173753] transition-colors"
              >
                <div className="flex items-center"><ChevronLeft className="w-4 h-4 mr-0.5" /> Kembali</div>
              </button>
            )}

            <button
              type="button"
              disabled={!nextEnabled}
              onClick={step === 3 ? handleSubmit : handleNext}
              className={cn(
                "h-9 px-5 rounded-full text-[13px] font-semibold text-white flex items-center gap-1.5 transition-all",
                nextEnabled ? "hover:opacity-90" : "opacity-40 cursor-not-allowed"
              )}
              style={{
                background: nextEnabled
                  ? `linear-gradient(to right, ${ACCENT}, #93D1F7)`
                  : "#9CA3AF",
              }}
            >
              {saving ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan…</>
              ) : saved ? (
                <><Check className="w-3.5 h-3.5" strokeWidth={2.5} /> Tersimpan</>
              ) : (
                <>{nextLabel}{step < 3 && <ChevronRight className="w-4 h-4 ml-0.5" />}</>
              )}
            </button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
