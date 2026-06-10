"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  ChevronRight,
  Check,
  Lock,
  ArrowRight,
  ChevronDown,
  Search,
  TriangleAlert,
  Clock,
  Bell,
  LogOut,
  Venus,
  Mars,
  Camera,
  X as CloseIcon,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { signOut, useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { createChild } from "@/lib/actions/kader"

// ============ CONSTANTS ============

const NAVY = "#173753"
const ACCENT = "#52A9E3"

const posyanduList = [
  "Posyandu Melati — Desa Tugumukti",
  "Posyandu Anggrek — Desa Pasirhalang",
  "Posyandu Kenanga — Desa Cipada",
  "Posyandu Mawar — Desa Padaasih",
  "Posyandu Dahlia — Desa Jambudipa",
]

const requiredFields = ["nama", "sex", "birth", "ibu", "ibuUsername"] as const
type RequiredKey = (typeof requiredFields)[number]

interface FormState {
  nama: string
  sex: string
  birth: string
  birthPlace: string
  anakKe: string
  ibu: string
  ayah: string
  telp: string
  alamat: string
  ibuUsername: string
  photo: string | null
  bbLahir: string
  tbLahir: string
  asi: string
  imunisasi: string
}

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

// ============ UTILS ============

function monthsBetween(birthStr: string): number | null {
  if (!birthStr) return null
  const b = new Date(birthStr)
  if (isNaN(b.getTime())) return null
  const now = new Date()
  let m =
    (now.getFullYear() - b.getFullYear()) * 12 +
    (now.getMonth() - b.getMonth())
  if (now.getDate() < b.getDate()) m -= 1
  return m < 0 ? null : m
}

function ageLabel(m: number | null): string {
  if (m == null) return "(Belum diisi)"
  const y = Math.floor(m / 12)
  const mo = m % 12
  if (y === 0) return `${mo} bulan`
  if (mo === 0) return `${y} tahun`
  return `${y} tahun ${mo} bulan`
}

// ============ FIELD COMPONENTS ============

function FormField({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-[#173753]">
        {label}
        {required && (
          <span className="text-[#D93025] ml-0.5">*</span>
        )}
      </label>
      {children}
      {hint && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  disabled?: boolean
}) {
  return (
    <Input
      type={type}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 text-sm border-gray-200 focus-visible:ring-1 focus-visible:ring-[#52A9E3] focus-visible:border-[#52A9E3] rounded-lg text-[#173753] placeholder:text-gray-300"
    />
  )
}

function SexToggle({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <FormField label="Jenis kelamin" required>
      <div className="grid grid-cols-2 gap-1">
        {[
          { v: "L", l: "Laki-laki", icon: Mars, color: "text-blue-500" },
          { v: "P", l: "Perempuan", icon: Venus, color: "text-pink-500" },
        ].map((opt) => {
          const active = value === opt.v
          const Icon = opt.icon
          return (
            <button
              key={opt.v}
              type="button"
              onClick={() => onChange(opt.v)}
              className={cn(
                "h-10 flex items-center gap-1 px-1.5 rounded-lg border text-sm font-medium transition-all",
                active
                  ? "bg-[#52A9E3] text-[#F5F7FA] border-[#52A9E3] shadow-sm"
                  : "border-gray-200 text-muted-foreground hover:border-gray-300 hover:text-[#173753] bg-white",
              )}
            >
              <div
                className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-colors",
                  active ? "bg-white/20" : "bg-gray-50",
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5",
                    active ? "text-white" : opt.color
                  )}
                  strokeWidth={2.5}
                />
              </div>
              <span className="whitespace-nowrap">{opt.l}</span>
            </button>
          )
        })}
      </div>
    </FormField>
  )
}

// ============ SECTION CARD ============

function SectionCard({
  title,
  badge,
  children,
}: {
  title: string
  badge?: string
  children: React.ReactNode
}) {
  return (
    <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl">
      <CardHeader className="pb-1.5 border-b border-gray-100 px-4">
        <CardTitle className="text-[16px] font-medium text-[#173753]">
          {title}
          {badge && (
            <span className="text-xs font-normal text-muted-foreground ml-1">
              {badge}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 px-4">{children}</CardContent>
    </Card>
  )
}

// ============ MAIN PAGE ============

export default function TambahAnakPage() {
  const { data: session } = useSession()
  const time = useTime()
  const router = useRouter()
  const [saved, setSaved] = useState(false)
  const [f, setF] = useState<FormState>({
    nama: "",
    sex: "",
    birth: "",
    birthPlace: "",
    anakKe: "",
    jumlahSaudara: "",
    ibu: "",
    ayah: "",
    telp: "",
    alamat: "",
    ibuUsername: "",
    photo: null,
    bbLahir: "",
    tbLahir: "",
    asi: "",
    imunisasi: "",
  })

  const set = (k: keyof FormState) => (v: any) =>
    setF((prev) => ({ ...prev, [k]: v }))

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        set("photo")(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const ageMo = useMemo(() => monthsBetween(f.birth), [f.birth])
  const initial = (f.nama.trim()[0] ?? "?").toUpperCase()
  const posyanduShort = "Posyandu Melati"
  const desa = "Kedungmundu"

  const filled = requiredFields.filter((k) => !!f[k as keyof FormState]).length
  const complete = filled === requiredFields.length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!complete) return
    
    try {
      await createChild({
        nama: f.nama,
        sex: f.sex,
        birth: f.birth,
        ibu: f.ibu,
        ibuUsername: f.ibuUsername,
        telp: f.telp,
        alamat: f.alamat,
        namaAyah: f.ayah,
        anakKe: f.anakKe ? parseInt(f.anakKe) : undefined,
      })
      setSaved(true)
      setTimeout(() => router.push("/kader/rekap"), 1100)
    } catch (err: any) {
      console.error(err)
      if (err.message === "POSYANDU_NOT_FOUND") {
        alert("Sesi Anda tidak valid (Posyandu tidak ditemukan). Silakan Logout dan Login kembali.")
      } else {
        alert("Gagal mendaftarkan anak: " + (err.message || "Terjadi kesalahan"))
      }
    }
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
          <span className="text-xs text-muted-foreground flex-none font-medium">| Posyandu Melati</span>
        </div>
        <div className="flex items-center gap-2 flex-none">
          <div className="flex items-center gap-2 px-4 h-8 text-xs text-[#173753] bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
            <Clock className="w-3.5 h-3.5" />
            <span className="tabular-nums">{time || <span className="text-gray-300">(Belum diisi)</span>}</span>
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
              <span className="text-xs text-[#173753] font-medium">Tambah Anak</span>
            </nav>
            <h1 className="text-2xl font-medium text-[#173753]">Daftarkan Anak Baru</h1>
          </div>

          <div className="flex items-center gap-2 pl-1 pr-3 py-1 bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-teal-100 text-teal-700 text-sm font-semibold">
                {session?.user?.name?.slice(0, 2).toUpperCase() ?? "ZA"}
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
          {/* ──────────────── LEFT: form sections ──────────────── */}
          <div className="flex flex-col gap-4">

            {/* 1. Identitas anak */}
            <SectionCard title="Identitas anak">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 flex items-center gap-4 mb-2">
                  <div className="relative group shrink-0">
                    <div className={cn(
                      "h-20 w-20 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden transition-all group-hover:border-[#52A9E3]",
                      f.photo && "border-solid border-[#52A9E3]"
                    )}>
                      {f.photo ? (
                        <img src={f.photo} alt="Child" className="h-full w-full object-cover" />
                      ) : (
                        <Camera className="h-6 w-6 text-gray-400 group-hover:text-[#52A9E3]" />
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {f.photo && (
                      <button
                        onClick={(e) => { e.preventDefault(); set("photo")(null); }}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                      >
                        <CloseIcon className="h-3 w-3" strokeWidth={3} />
                      </button>
                    )}
                  </div>
                  <div className="flex-1">
                    <FormField label="Nama lengkap" required>
                      <TextInput
                        value={f.nama}
                        onChange={set("nama")}
                        placeholder="mis. Ayla Khaira Putri"
                      />
                    </FormField>
                  </div>
                </div>

                <FormField label="Tanggal lahir" required>
                  <TextInput
                    value={f.birth}
                    onChange={set("birth")}
                    type="date"
                  />
                </FormField>

                <FormField label="Umur (Otomatis)">
                  <div className="h-10 flex items-center px-3.5 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-[#173753]">
                    {ageMo != null ? (
                      ageLabel(ageMo)
                    ) : (
                      <span className="text-gray-300 font-normal italic">(Belum diisi)</span>
                    )}
                  </div>
                </FormField>

                <SexToggle value={f.sex} onChange={set("sex")} />

                <FormField label="Tempat lahir">
                  <TextInput
                    value={f.birthPlace}
                    onChange={set("birthPlace")}
                    placeholder="mis. Makassar"
                  />
                </FormField>

                <FormField label="Anak ke-">
                  <TextInput
                    value={f.anakKe}
                    onChange={set("anakKe")}
                    placeholder="mis. 2"
                    type="number"
                  />
                </FormField>
              </div>
            </SectionCard>

            {/* 2. Data orang tua */}
            <SectionCard title="Data orang tua">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Nama ibu" required>
                  <TextInput
                    value={f.ibu}
                    onChange={set("ibu")}
                    placeholder="Nama lengkap ibu"
                  />
                </FormField>

                <FormField label="Username ibu" required>
                  <TextInput
                    value={f.ibuUsername}
                    onChange={set("ibuUsername")}
                    placeholder="mis. sri.wahyuni"
                  />
                </FormField>

                <FormField label="Nama ayah">
                  <TextInput
                    value={f.ayah}
                    onChange={set("ayah")}
                    placeholder="Nama lengkap ayah"
                  />
                </FormField>

                <FormField label="No. telepon">
                  <TextInput
                    value={f.telp}
                    onChange={set("telp")}
                    placeholder="08xx xxxx xxxx"
                  />
                </FormField>

                <div className="col-span-2">
                  <FormField label="Alamat tinggal">
                    <TextInput
                      value={f.alamat}
                      onChange={set("alamat")}
                      placeholder="RT/RW, dusun, desa"
                    />
                  </FormField>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* ──────────────── RIGHT: sticky preview ──────────────── */}
          <div className="flex flex-col gap-4 sticky top-6">

            {/* Preview card */}
            <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl">
              <CardHeader className="pb-1.5 border-b border-gray-100 px-4">
                <CardTitle className="text-[16px] font-medium text-[#173753]">
                  Pratinjau
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2 px-4">
                {/* Avatar + name */}
                <div className="flex flex-col items-center text-center pb-5 border-b border-gray-100">
                  <div
                    className="h-18 w-18 rounded-[20px] flex items-center justify-center text-[38px] font-bold text-[#173753] mb-3.5 select-none overflow-hidden"
                    style={{ background: f.photo ? "none" : "linear-gradient(135deg, #C4D6E8, #52A9E3)" }}
                  >
                    {f.photo ? (
                      <img src={f.photo} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      initial
                    )}
                  </div>
                  <div className="text-xl font-bold text-[#173753] leading-tight">
                    {f.nama || (
                      <span className="text-muted-foreground font-normal text-base">Nama anak</span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {f.sex === "L"
                      ? "Laki-laki"
                      : f.sex === "P"
                      ? "Perempuan"
                      : <span className="italic text-gray-300">(Jenis kelamin)</span>}{" "}
                    · {ageMo != null ? ageLabel(ageMo) : <span className="italic text-gray-300">(Usia)</span>}
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-gray-200 text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    Menunggu pemeriksaan pertama
                  </span>
                </div>

                {/* Detail grid */}
                <div
                  className="grid gap-x-3 gap-y-2.5 pt-4 text-sm"
                  style={{ gridTemplateColumns: "88px 1fr" }}
                >
                  {[
                    { label: "Posyandu", value: posyanduShort },
                    { label: "Desa", value: desa || null },
                    {
                      label: "Tgl lahir",
                      value: f.birth
                        ? new Date(f.birth).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                        : null,
                    },
                    { label: "Ibu", value: f.ibu || null },
                  ].map(({ label, value }) => (
                    <div key={label} className="contents">
                      <span
                        className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider self-center"
                      >
                        {label}
                      </span>
                      <span className={cn(
                        "text-sm font-medium",
                        value ? "text-[#173753]" : "text-gray-300 italic font-normal"
                      )}>
                        {value || "(Belum diisi)"}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Required checklist */}
            <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl">
              <CardContent className="pt-2 pb-3 px-4">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Wajib diisi · {filled}/{requiredFields.length}
                </div>
                <div className="flex flex-col gap-2.5">
                  {(
                    [
                      { k: "nama" as const, l: "Nama lengkap" },
                      { k: "sex" as const, l: "Jenis kelamin" },
                      { k: "birth" as const, l: "Tanggal lahir" },
                      { k: "ibu" as const, l: "Nama ibu" },
                      { k: "ibuUsername" as const, l: "Username ibu" },
                    ] as { k: RequiredKey; l: string }[]
                  ).map(({ k, l }) => {
                    const ok = !!f[k as keyof FormState]
                    return (
                      <div
                        key={k}
                        className={cn(
                          "flex items-center gap-2.5 text-sm transition-colors",
                          ok ? "text-[#173753]" : "text-muted-foreground",
                        )}
                      >
                        <span
                          className="h-4.5 w-4.5 rounded-full flex items-center justify-center shrink-0 transition-all"
                          style={
                            ok
                              ? { background: "#1E8E3E" }
                              : { border: "1.5px solid #D1D5DB" }
                          }
                        >
                          {ok && (
                            <Check className="h-2.5 w-2.5 text-white" strokeWidth={2.8} />
                          )}
                        </span>
                        {l}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <button
              type="submit"
              disabled={!complete}
              className={cn(
                "h-12 w-full rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all",
                complete
                  ? "text-white cursor-pointer hover:opacity-90"
                  : "text-white/60 cursor-not-allowed",
              )}
              style={{
                background: complete
                  ? `linear-gradient(to right, ${ACCENT}, #93D1F7)`
                  : "#9CA3AF",
              }}
            >
              {saved ? (
                <>
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                  Tersimpan
                </>
              ) : (
                <>
                  Simpan & daftarkan anak
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-sm text-muted-foreground hover:text-[#173753]"
              onClick={() => router.push("/kader/rekap")}
            >
              Batal
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
