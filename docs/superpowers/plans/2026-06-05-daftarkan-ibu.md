# Daftarkan Ibu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kader dapat mendaftarkan ibu baru via `/kader/tambah-pasien`, ibu bisa login, dan dashboard ibu mengarahkan ibu tidak hamil ke halaman anak.

**Architecture:** Server actions di `lib/actions/kader.ts` (createIbu, getIbuById) dan `lib/actions/ibu.ts` (perbaikan isPregnant + tambah getIbuAnaks). Tiga halaman baru: `/kader/tambah-pasien`, `/kader/ibu/[id]`, `/ibu/anak`. Dashboard ibu ditambah redirect logic.

**Tech Stack:** Next.js App Router, Prisma (PostgreSQL), NextAuth v5, bcryptjs, Tailwind CSS, shadcn/ui, Lucide icons

---

## File Map

| Status | File | Perubahan |
|---|---|---|
| Modify | `lib/actions/kader.ts` | Tambah `createIbu()` + `getIbuById()`, import bcryptjs |
| Modify | `lib/actions/ibu.ts` | Fix `isPregnant` logic (baris 43), tambah `getIbuAnaks()` |
| Create | `app/kader/tambah-pasien/page.tsx` | Form daftarkan ibu baru |
| Create | `app/kader/ibu/[id]/page.tsx` | Profil ibu — info + daftar anak |
| Modify | `app/kader/rekap/page.tsx` | Ganti href button "Tambah Pasien" ke `/kader/tambah-pasien` |
| Create | `app/ibu/anak/page.tsx` | Halaman daftar anak untuk ibu |
| Modify | `app/ibu/dashboard/page.tsx` | Redirect ke `/ibu/anak` jika tidak hamil |

---

## Task 1: Server actions — `createIbu()` dan `getIbuById()`

**Files:**
- Modify: `lib/actions/kader.ts`

- [ ] **Tambah import bcryptjs di baris 4**

  Buka `lib/actions/kader.ts`. Baris 1–4 sekarang:
  ```ts
  "use server"

  import { prisma } from "@/lib/db"
  import { auth } from "@/auth"
  ```
  Ubah menjadi:
  ```ts
  "use server"

  import { prisma } from "@/lib/db"
  import { auth } from "@/auth"
  import bcrypt from "bcryptjs"
  ```

- [ ] **Tambah `createIbu()` di akhir file**

  ```ts
  export async function createIbu(data: {
    nama: string
    username: string
    password: string
    noHp?: string
    tanggalLahir?: string
    alamat?: string
  }) {
    const session = await auth()
    if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

    const existing = await prisma.ibu.findUnique({ where: { username: data.username } })
    if (existing) throw new Error("USERNAME_TAKEN")

    const hashed = await bcrypt.hash(data.password, 10)

    return prisma.ibu.create({
      data: {
        nama: data.nama,
        username: data.username,
        pin: hashed,
        noHp: data.noHp ?? null,
        tanggalLahir: data.tanggalLahir ? new Date(data.tanggalLahir) : null,
        alamat: data.alamat ?? null,
        posyanduId: session.user.posyanduId,
      },
      select: { id: true, nama: true, username: true },
    })
  }
  ```

- [ ] **Tambah `getIbuById()` di akhir file**

  ```ts
  export async function getIbuById(id: string) {
    const session = await auth()
    if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

    const ibu = await prisma.ibu.findUnique({
      where: { id },
      include: {
        anaks: {
          include: {
            pengukurans: { orderBy: { tanggal: "desc" }, take: 1 },
          },
          orderBy: { createdAt: "asc" },
        },
        pregnancyProfile: true,
      },
    })

    if (!ibu || ibu.posyanduId !== session.user.posyanduId) throw new Error("Not found")
    return ibu
  }
  ```

- [ ] **Commit**

  ```bash
  git add lib/actions/kader.ts
  git commit -m "feat: add createIbu and getIbuById server actions"
  ```

---

## Task 2: Fix `isPregnant` dan tambah `getIbuAnaks()` di `lib/actions/ibu.ts`

**Files:**
- Modify: `lib/actions/ibu.ts`

- [ ] **Fix bug `isPregnant` di baris 43**

  Baris 43 sekarang:
  ```ts
  isPregnant: ibu.anaks.length === 0,
  ```
  Ubah menjadi:
  ```ts
  isPregnant: !!ibu.pregnancyProfile,
  ```

- [ ] **Tambah `getIbuAnaks()` di akhir file**

  ```ts
  export async function getIbuAnaks() {
    const session = await auth()
    if (!session || session.user.role !== "ibu") throw new Error("Unauthorized")

    const ibu = await prisma.ibu.findUnique({
      where: { id: session.user.id },
      include: {
        anaks: {
          include: {
            pengukurans: { orderBy: { tanggal: "desc" }, take: 1 },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!ibu) return []

    return ibu.anaks.map((anak) => {
      const last = anak.pengukurans[0] ?? null
      const birth = new Date(anak.tanggalLahir)
      const now = new Date()
      const months =
        (now.getFullYear() - birth.getFullYear()) * 12 +
        (now.getMonth() - birth.getMonth())
      return {
        id: anak.id,
        nama: anak.nama,
        jenisKelamin: anak.jenisKelamin as "L" | "P",
        usia: months < 12 ? `${months} bln` : `${Math.floor(months / 12)} thn ${months % 12} bln`,
        status: last?.statusTBU ?? null,
        bb: last?.beratBadan ?? null,
        tanggalPengukuran: last?.tanggal ?? null,
      }
    })
  }
  ```

- [ ] **Commit**

  ```bash
  git add lib/actions/ibu.ts
  git commit -m "fix: correct isPregnant logic and add getIbuAnaks action"
  ```

---

## Task 3: Halaman `/kader/tambah-pasien`

**Files:**
- Create: `app/kader/tambah-pasien/page.tsx`

- [ ] **Buat file `app/kader/tambah-pasien/page.tsx`**

  ```tsx
  "use client"

  import { useState, useEffect } from "react"
  import { useRouter } from "next/navigation"
  import Link from "next/link"
  import {
    ChevronRight, ChevronDown, Check, ArrowRight,
    Search, TriangleAlert, Clock, Bell, LogOut,
  } from "lucide-react"
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
  import { Button } from "@/components/ui/button"
  import { Input } from "@/components/ui/input"
  import { Avatar, AvatarFallback } from "@/components/ui/avatar"
  import { signOut, useSession } from "next-auth/react"
  import { cn } from "@/lib/utils"
  import { createIbu } from "@/lib/actions/kader"

  const MONTHS_ID = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"]
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

  function TextInput({ value, onChange, placeholder, type = "text" }: {
    value: string; onChange: (v: string) => void; placeholder?: string; type?: string
  }) {
    return (
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 text-sm border-gray-200 focus-visible:ring-1 focus-visible:ring-[#52A9E3] focus-visible:border-[#52A9E3] rounded-lg text-[#173753] placeholder:text-gray-300"
      />
    )
  }

  function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl">
        <CardHeader className="pb-1.5 border-b border-gray-100 px-4">
          <CardTitle className="text-[16px] font-medium text-[#173753]">{title}</CardTitle>
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
      nama: "", username: "", password: "", noHp: "", tanggalLahir: "", alamat: "",
    })

    const set = (k: keyof FormState) => (v: string) =>
      setF((prev) => ({ ...prev, [k]: v }))

    const filled = requiredFields.filter((k) => !!f[k]).length
    const complete = filled === requiredFields.length && f.password.length >= 6

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
            <Button variant="ghost" size="icon" className="h-8 w-8 bg-white rounded-full shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-[#173753] hover:bg-white/80">
              <Bell className="w-4 h-4" />
            </Button>
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
            </div>

            {/* Right */}
            <div className="flex flex-col gap-4 sticky top-6">
              {/* Preview */}
              <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl">
                <CardHeader className="pb-1.5 border-b border-gray-100 px-4">
                  <CardTitle className="text-[16px] font-medium text-[#173753]">Pratinjau</CardTitle>
                </CardHeader>
                <CardContent className="pt-2 px-4">
                  <div className="flex flex-col items-center text-center pb-5 border-b border-gray-100">
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
                  </div>
                </CardContent>
              </Card>

              {/* Checklist */}
              <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl">
                <CardContent className="pt-2 pb-3 px-4">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Wajib diisi · {filled}/{requiredFields.length}
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {([
                      { k: "nama" as const, l: "Nama lengkap" },
                      { k: "username" as const, l: "Username" },
                      { k: "password" as const, l: "Password (min. 6 karakter)" },
                    ] as { k: RequiredKey; l: string }[]).map(({ k, l }) => {
                      const ok = k === "password" ? f.password.length >= 6 : !!f[k]
                      return (
                        <div key={k} className={cn("flex items-center gap-2.5 text-sm transition-colors", ok ? "text-[#173753]" : "text-muted-foreground")}>
                          <span
                            className="h-4.5 w-4.5 rounded-full flex items-center justify-center shrink-0"
                            style={ok ? { background: "#1E8E3E" } : { border: "1.5px solid #D1D5DB" }}
                          >
                            {ok && <Check className="h-2.5 w-2.5 text-white" strokeWidth={2.8} />}
                          </span>
                          {l}
                        </div>
                      )
                    })}
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
  ```

- [ ] **Commit**

  ```bash
  git add app/kader/tambah-pasien/page.tsx
  git commit -m "feat: add tambah-pasien page for ibu registration"
  ```

---

## Task 4: Halaman `/kader/ibu/[id]` — Profil Ibu

**Files:**
- Create: `app/kader/ibu/[id]/page.tsx`

- [ ] **Buat file `app/kader/ibu/[id]/page.tsx`**

  ```tsx
  "use client"

  import { useState, useEffect } from "react"
  import { useParams, useRouter } from "next/navigation"
  import Link from "next/link"
  import {
    ChevronRight, ChevronDown, Search, TriangleAlert,
    Clock, Bell, LogOut, Plus, Baby, ArrowLeft,
  } from "lucide-react"
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
  import { Button } from "@/components/ui/button"
  import { Input } from "@/components/ui/input"
  import { Avatar, AvatarFallback } from "@/components/ui/avatar"
  import { signOut, useSession } from "next-auth/react"
  import { cn } from "@/lib/utils"
  import { getIbuById } from "@/lib/actions/kader"

  const MONTHS_ID = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"]

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

  type IbuProfile = Awaited<ReturnType<typeof getIbuById>>

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      Normal: "bg-green-100 text-green-800",
      "Stunting Berat": "bg-red-100 text-red-800",
      "Risiko Stunting": "bg-amber-100 text-amber-800",
      "Gizi Kurang": "bg-purple-100 text-purple-800",
    }
    return map[status] ?? "bg-gray-100 text-gray-800"
  }

  export default function IbuProfilePage() {
    const { id } = useParams<{ id: string }>()
    const { data: session } = useSession()
    const time = useTime()
    const router = useRouter()
    const [ibu, setIbu] = useState<IbuProfile | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      getIbuById(id)
        .then(setIbu)
        .catch(() => router.replace("/kader/rekap"))
        .finally(() => setLoading(false))
    }, [id, router])

    if (loading) return <div className="flex-1 flex items-center justify-center bg-[#EBF2F8]">Loading...</div>
    if (!ibu) return null

    const initial = ibu.nama.slice(0, 2).toUpperCase()

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
            <span className="text-xs text-[#173753] truncate font-medium">Profil pasien</span>
          </div>
          <div className="flex items-center gap-2 flex-none">
            <div className="flex items-center gap-2 px-4 h-8 text-xs text-[#173753] bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
              <Clock className="w-3.5 h-3.5" />
              <span className="tabular-nums">{time}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 bg-white rounded-full shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-[#173753] hover:bg-white/80">
              <Bell className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8 px-4 bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-[#173753] hover:bg-white/80" onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="w-3.5 h-3.5" />
              Log Out
            </Button>
          </div>
        </div>

        <div className="p-6 lg:p-8 space-y-5">
          {/* Title */}
          <div className="flex items-center justify-between">
            <div>
              <nav className="flex items-center gap-1 mb-1.5">
                <Link href="/kader/dashboard" className="text-xs text-[#173753]/50 hover:text-[#173753]">Dashboard</Link>
                <ChevronRight className="w-3 h-3 text-[#173753]/30 flex-none" />
                <Link href="/kader/rekap" className="text-xs text-[#173753]/50 hover:text-[#173753]">Pasien</Link>
                <ChevronRight className="w-3 h-3 text-[#173753]/30 flex-none" />
                <span className="text-xs text-[#173753] font-medium">{ibu.nama}</span>
              </nav>
              <h1 className="text-2xl font-medium text-[#173753]">Profil Ibu</h1>
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

          <div className="grid grid-cols-3 gap-5 items-start">
            {/* Left: info ibu */}
            <div className="col-span-1 space-y-4">
              <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center pb-4 border-b border-gray-100 mb-4">
                    <div className="h-16 w-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-[#173753] mb-3" style={{ background: "linear-gradient(135deg, #C4D6E8, #52A9E3)" }}>
                      {initial}
                    </div>
                    <p className="text-base font-semibold text-[#173753]">{ibu.nama}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">@{ibu.username}</p>
                    <span className={cn("mt-2 text-xs px-2 py-0.5 rounded-full font-medium", ibu.pregnancyProfile ? "bg-pink-100 text-pink-700" : "bg-gray-100 text-gray-600")}>
                      {ibu.pregnancyProfile ? "Sedang Hamil" : "Tidak Hamil"}
                    </span>
                  </div>
                  <div className="space-y-2.5 text-sm">
                    {[
                      { label: "No. HP", value: ibu.noHp },
                      { label: "Tgl Lahir", value: ibu.tanggalLahir ? new Date(ibu.tanggalLahir).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : null },
                      { label: "Alamat", value: ibu.alamat },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex gap-2">
                        <span className="text-xs text-muted-foreground w-16 shrink-0 font-medium">{label}</span>
                        <span className={cn("text-xs flex-1", value ? "text-[#173753] font-medium" : "text-gray-300 italic")}>
                          {value || "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: daftar anak */}
            <div className="col-span-2">
              <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
                <CardHeader className="border-b border-gray-100 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[15px] font-medium text-[#173753]">
                      Daftar Anak
                      <span className="ml-2 text-xs font-normal text-muted-foreground">({ibu.anaks.length} anak)</span>
                    </CardTitle>
                    <Link href={`/kader/ibu/${id}/tambah-anak`}>
                      <Button size="sm" className="gap-1.5 text-xs h-8 px-3 rounded-[50px] text-white border-none font-medium hover:opacity-90" style={{ background: "linear-gradient(to right, #52A9E3, #93D1F7)" }}>
                        <Plus className="w-3.5 h-3.5" />
                        Tambah Anak
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {ibu.anaks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-12 h-12 rounded-full bg-[#F5F7FA] flex items-center justify-center mb-3">
                        <Baby className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-[#173753]">Belum ada anak terdaftar</p>
                      <p className="text-xs text-muted-foreground mt-1">Klik "Tambah Anak" untuk mendaftarkan anak ibu ini.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {ibu.anaks.map((anak) => {
                        const last = anak.pengukurans[0] ?? null
                        const birth = new Date(anak.tanggalLahir)
                        const now = new Date()
                        const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
                        const usia = months < 12 ? `${months} bln` : `${Math.floor(months / 12)} thn ${months % 12} bln`
                        return (
                          <div key={anak.id} className="flex items-center gap-3 px-4 py-3">
                            <div className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-none" style={{ background: anak.jenisKelamin === "L" ? "#378ADD" : "#E879A0" }}>
                              {anak.nama.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#173753] truncate">{anak.nama}</p>
                              <p className="text-xs text-muted-foreground">{usia} · {anak.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}</p>
                            </div>
                            {last && (
                              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium flex-none", statusBadge(last.statusTBU))}>
                                {last.statusTBU}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }
  ```

- [ ] **Commit**

  ```bash
  git add app/kader/ibu/
  git commit -m "feat: add ibu profile page at /kader/ibu/[id]"
  ```

---

## Task 5: Update href tombol "Tambah Pasien" di rekap

**Files:**
- Modify: `app/kader/rekap/page.tsx` baris 150

- [ ] **Ganti href dari `/kader/tambah-anak` ke `/kader/tambah-pasien`**

  Cari baris (sekitar baris 150):
  ```tsx
  <Link href="/kader/tambah-anak">
  ```
  Ubah menjadi:
  ```tsx
  <Link href="/kader/tambah-pasien">
  ```

- [ ] **Commit**

  ```bash
  git add app/kader/rekap/page.tsx
  git commit -m "feat: point Tambah Pasien button to /kader/tambah-pasien"
  ```

---

## Task 6: Halaman `/ibu/anak`

**Files:**
- Create: `app/ibu/anak/page.tsx`

- [ ] **Buat file `app/ibu/anak/page.tsx`**

  ```tsx
  "use client"

  import { useState, useEffect } from "react"
  import { Baby, ChevronRight } from "lucide-react"
  import { cn } from "@/lib/utils"
  import { getIbuAnaks } from "@/lib/actions/ibu"

  type AnakItem = {
    id: string
    nama: string
    jenisKelamin: "L" | "P"
    usia: string
    status: string | null
    bb: number | null
    tanggalPengukuran: Date | null
  }

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      Normal: "bg-green-100 text-green-700",
      "Stunting Berat": "bg-red-100 text-red-700",
      "Risiko Stunting": "bg-amber-100 text-amber-700",
      "Gizi Kurang": "bg-purple-100 text-purple-700",
    }
    return map[status] ?? "bg-gray-100 text-gray-600"
  }

  const MONTHS_ID = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"]

  function formatDate(date: Date) {
    const d = new Date(date)
    return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`
  }

  export default function IbuAnakPage() {
    const [anaks, setAnaks] = useState<AnakItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      getIbuAnaks()
        .then(setAnaks)
        .finally(() => setLoading(false))
    }, [])

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <h1 className="text-xl font-semibold text-[#173753]">Anak Saya</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Data pertumbuhan anak terdaftar</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-24">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-[#52A9E3] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : anaks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-[#EBF2F8] flex items-center justify-center mb-4">
                <Baby className="w-8 h-8 text-[#52A9E3]" />
              </div>
              <p className="text-sm font-semibold text-[#173753]">Belum ada anak terdaftar</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                Hubungi kader posyandu untuk mendaftarkan anak Anda.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {anaks.map((anak) => (
                <div
                  key={anak.id}
                  className="bg-white rounded-2xl p-4 shadow-[2px_2px_8px_rgba(0,0,0,0.06)] flex items-center gap-3"
                >
                  <div
                    className="h-12 w-12 rounded-2xl flex items-center justify-center text-base font-bold text-white flex-none"
                    style={{ background: anak.jenisKelamin === "L" ? "linear-gradient(135deg,#378ADD,#93D1F7)" : "linear-gradient(135deg,#E879A0,#F9A8D4)" }}
                  >
                    {anak.nama.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#173753] truncate">{anak.nama}</p>
                    <p className="text-xs text-muted-foreground">
                      {anak.usia} · {anak.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}
                    </p>
                    {anak.bb !== null && (
                      <p className="text-xs text-muted-foreground">{anak.bb} kg</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-none">
                    {anak.status ? (
                      <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium", statusBadge(anak.status))}>
                        {anak.status}
                      </span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">
                        Belum diukur
                      </span>
                    )}
                    {anak.tanggalPengukuran && (
                      <p className="text-[10px] text-muted-foreground">{formatDate(anak.tanggalPengukuran)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }
  ```

- [ ] **Commit**

  ```bash
  git add app/ibu/anak/page.tsx
  git commit -m "feat: add ibu anak page showing children list"
  ```

---

## Task 7: Fix dashboard ibu — redirect jika tidak hamil

**Files:**
- Modify: `app/ibu/dashboard/page.tsx`

- [ ] **Tambah `useRouter` ke import di baris 7**

  Cari:
  ```tsx
  import React, { useEffect, useState } from 'react'
  ```
  Ubah menjadi:
  ```tsx
  import React, { useEffect, useState } from 'react'
  import { useRouter } from 'next/navigation'
  ```

- [ ] **Inisialisasi router di dalam komponen, tepat setelah deklarasi state**

  Cari baris pertama state di dalam `IbuDashboardPage()`:
  ```tsx
  const [doneCount, setDoneCount] = useState(4)
  ```
  Tambahkan `useRouter` di atasnya:
  ```tsx
  const router = useRouter()
  const [doneCount, setDoneCount] = useState(4)
  ```

- [ ] **Tambah useEffect redirect setelah useEffect yang load ibuData**

  Cari useEffect yang ada sekarang (yang memanggil `getIbuData()`):
  ```tsx
  useEffect(() => {
    let mounted = true
    getIbuData().then(data => {
      if (mounted) {
        setIbuData(data)
        setLoading(false)
      }
    })
    
    return () => { mounted = false }
  }, [])
  ```
  Tambahkan useEffect baru tepat di bawahnya:
  ```tsx
  useEffect(() => {
    if (!loading && ibuData && !ibuData.isPregnant) {
      router.replace("/ibu/anak")
    }
  }, [loading, ibuData, router])
  ```

- [ ] **Commit**

  ```bash
  git add app/ibu/dashboard/page.tsx
  git commit -m "feat: redirect non-pregnant ibu to /ibu/anak on dashboard load"
  ```

---

## Cara Test Manual

Setelah semua task selesai:

1. Jalankan `npm run dev`
2. Login sebagai kader (username + password kader yang ada di seed)
3. Buka `/kader/rekap` → klik tombol **"Tambah Pasien"** → harus masuk ke `/kader/tambah-pasien`
4. Isi form (nama, username, password minimal 6 karakter) → klik **Simpan** → harus redirect ke `/kader/ibu/[id]`
5. Di profil ibu, pastikan section **"Daftar Anak"** muncul dengan empty state
6. Logout dari kader
7. Login sebagai ibu baru (gunakan username + password yang baru didaftarkan)
8. Harus otomatis redirect ke `/ibu/anak` (karena tidak hamil)
9. Pastikan halaman anak tampil dengan empty state "Belum ada anak terdaftar"
