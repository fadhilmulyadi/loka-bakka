# Child Context Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ketika ibu menekan card anak, seluruh bottom tab bar berubah ke child context (Beranda/Edukasi/Status/Tugas/Profil untuk anak tersebut) via route `/ibu/child/[id]/`.

**Architecture:** `IbuNavWrapper` (client component) di ibu layout switch antara `IbuBottomNav` ↔ `ChildBottomNav` berdasarkan `usePathname()`. Route `/ibu/child/[id]/{dashboard,edukasi,status,tugas}` masing-masing render konten child-specific. Tidak ada nested child layout.

**Tech Stack:** Next.js App Router, Tailwind CSS, `lucide-react`, `recharts`, `next/navigation` (`usePathname`, `useParams`)

---

### Task 1: Cleanup — hapus old [id] page dan update card navigation

**Files:**
- Delete: `app/ibu/anak/[id]/page.tsx`
- Modify: `app/ibu/anak/page.tsx` — ubah href dari `/ibu/anak/${anak.id}` ke `/ibu/child/${anak.id}/dashboard`

- [ ] **Step 1: Hapus `app/ibu/anak/[id]/page.tsx`**

```bash
rm "app/ibu/anak/[id]/page.tsx"
rmdir "app/ibu/anak/[id]"
```
(Windows PowerShell: `Remove-Item -Recurse "app\ibu\anak\[id]"`)

- [ ] **Step 2: Update href di `app/ibu/anak/page.tsx`**

Cari baris:
```tsx
href={`/ibu/anak/${anak.id}`}
```
Ganti dengan:
```tsx
href={`/ibu/child/${anak.id}/dashboard`}
```

- [ ] **Step 3: Verifikasi TypeScript**
```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**
```bash
git add app/ibu/anak/page.tsx
git commit -m "refactor(ibu): update child card navigation to /ibu/child/[id]/dashboard"
```

---

### Task 2: Buat `IbuNavWrapper` dan update ibu layout

**Files:**
- Create: `components/ibu-nav-wrapper.tsx`
- Modify: `app/ibu/layout.tsx`

- [ ] **Step 1: Buat `components/ibu-nav-wrapper.tsx`**

```tsx
"use client"

import { usePathname, useParams } from "next/navigation"
import { IbuBottomNav } from "@/components/ibu-bottom-nav"
import { ChildBottomNav } from "@/components/child-bottom-nav"

export function IbuNavWrapper() {
  const pathname = usePathname()
  const params = useParams()

  if (pathname.includes("/ibu/child/")) {
    return <ChildBottomNav childId={params.id as string} />
  }

  return <IbuBottomNav />
}
```

- [ ] **Step 2: Update `app/ibu/layout.tsx`**

Ganti import:
```tsx
import { IbuBottomNav } from "@/components/ibu-bottom-nav"
```
Dengan:
```tsx
import { IbuNavWrapper } from "@/components/ibu-nav-wrapper"
```

Ganti render:
```tsx
<IbuBottomNav />
```
Dengan:
```tsx
<IbuNavWrapper />
```

- [ ] **Step 3: Verifikasi TypeScript**
```bash
npx tsc --noEmit
```
Expected: error karena `ChildBottomNav` belum ada — ini expected, lanjut ke Task 3.

- [ ] **Step 4: Commit setelah Task 3 selesai** (gabung dengan Task 3)

---

### Task 3: Buat `ChildBottomNav`

**Files:**
- Create: `components/child-bottom-nav.tsx`

- [ ] **Step 1: Buat `components/child-bottom-nav.tsx`**

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, BookOpen, TrendingUp, ClipboardList, User } from "lucide-react"

export function ChildBottomNav({ childId }: { childId: string }) {
  const pathname = usePathname()

  const items = [
    {
      label: "Beranda",
      href: `/ibu/child/${childId}/dashboard`,
      icon: <Home size={21} strokeWidth={1.9} />,
    },
    {
      label: "Edukasi",
      href: `/ibu/child/${childId}/edukasi`,
      icon: <BookOpen size={21} strokeWidth={1.9} />,
    },
    {
      label: "Status",
      href: `/ibu/child/${childId}/status`,
      icon: <TrendingUp size={21} strokeWidth={1.9} />,
    },
    {
      label: "Tugas",
      href: `/ibu/child/${childId}/tugas`,
      icon: <ClipboardList size={21} strokeWidth={1.9} />,
    },
    {
      label: "Profil",
      href: "/ibu/akun",
      icon: <User size={21} strokeWidth={1.9} />,
    },
  ]

  return (
    <nav className="h-[64px] bg-white/80 backdrop-blur-md border border-white/20 rounded-[24px] shadow-[0_8px_32px_-10px_rgba(9,30,66,0.3)] flex items-center justify-between px-[12px] py-2">
      {items.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex-1 flex flex-col items-center gap-[3px] transition-colors",
              isActive ? "text-[#1178D4]" : "text-[#989DA3]"
            )}
          >
            {item.icon}
            <span
              className={cn(
                "text-[9.5px] tracking-[0.01em]",
                isActive ? "font-semibold" : "font-medium"
              )}
            >
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 2: Verifikasi TypeScript**
```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit Task 2 + 3 bersama**
```bash
git add components/ibu-nav-wrapper.tsx components/child-bottom-nav.tsx app/ibu/layout.tsx
git commit -m "feat(ibu): add IbuNavWrapper and ChildBottomNav for child context navigation"
```

---

### Task 4: Buat child pages — dashboard, edukasi, status, tugas

**Files:**
- Create: `app/ibu/child/[id]/dashboard/page.tsx`
- Create: `app/ibu/child/[id]/edukasi/page.tsx`
- Create: `app/ibu/child/[id]/status/page.tsx`
- Create: `app/ibu/child/[id]/tugas/page.tsx`

- [ ] **Step 1: Buat direktori**

PowerShell:
```powershell
New-Item -ItemType Directory -Force -Path "app\ibu\child\[id]\dashboard"
New-Item -ItemType Directory -Force -Path "app\ibu\child\[id]\edukasi"
New-Item -ItemType Directory -Force -Path "app\ibu\child\[id]\status"
New-Item -ItemType Directory -Force -Path "app\ibu\child\[id]\tugas"
```

- [ ] **Step 2: Buat `app/ibu/child/[id]/dashboard/page.tsx`**

```tsx
"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { getIbuAnakDetail } from "@/lib/actions/ibu"

type AnakDetail = NonNullable<Awaited<ReturnType<typeof getIbuAnakDetail>>>

function statusBadge(status: string) {
  const map: Record<string, string> = {
    Normal: "bg-green-100 text-green-700",
    "Stunting Berat": "bg-red-100 text-red-700",
    "Risiko Stunting": "bg-amber-100 text-amber-700",
    "Gizi Kurang": "bg-purple-100 text-purple-700",
  }
  return map[status] ?? "bg-gray-100 text-gray-600"
}

export default function ChildDashboardPage() {
  const params = useParams()
  const id = params?.id as string
  const [anak, setAnak] = useState<AnakDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setAnak(null)
    setError(false)
    setLoading(true)
    getIbuAnakDetail(id)
      .then((data) => { if (data) setAnak(data) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#52A9E3] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error || !anak) return (
    <div className="flex-1 flex items-center justify-center px-5">
      <p className="text-sm text-muted-foreground text-center">
        {error ? "Terjadi kesalahan. Silakan coba lagi." : "Data anak tidak ditemukan."}
      </p>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="px-5 pt-5 pb-6 text-white"
        style={{ background: "linear-gradient(135deg, #1178D4, #52A9E3)" }}
      >
        <p className="text-xs font-medium text-white/70 mb-1">Memantau</p>
        <div className="flex items-center gap-3">
          <div
            className="h-12 w-12 rounded-2xl flex items-center justify-center text-base font-bold text-white flex-none"
            style={{
              background: anak.jenisKelamin === "L"
                ? "rgba(255,255,255,0.25)"
                : "rgba(255,255,255,0.25)",
            }}
          >
            {anak.nama.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold">{anak.nama}</h1>
            <p className="text-xs text-white/80">
              {anak.usia} · {anak.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24 pt-4 space-y-3">
        {/* Status Gizi */}
        <div className="bg-white rounded-2xl p-4 shadow-[2px_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-3">
            Status Gizi Terakhir
          </p>
          {anak.latest ? (
            <>
              <span className={cn(
                "inline-block text-sm px-3 py-1 rounded-full font-medium mb-3",
                statusBadge(anak.latest.status)
              )}>
                {anak.latest.status}
              </span>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Berat Badan", value: `${anak.latest.bb.toFixed(1)} kg` },
                  { label: "Tinggi Badan", value: `${anak.latest.tb.toFixed(1)} cm` },
                  { label: "Z-Score TB/U", value: `${anak.latest.zScore} SD` },
                  { label: "Tanggal Ukur", value: anak.latest.tanggal },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      {item.label}
                    </p>
                    <p className="text-sm font-semibold text-[#173753]">{item.value}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada data pengukuran.</p>
          )}
        </div>

        {/* Info Lahir */}
        <div className="bg-white rounded-2xl p-4 shadow-[2px_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-3">
            Info Anak
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Tanggal Lahir", value: anak.tanggalLahir },
              { label: "Anak Ke-", value: anak.anakKe },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {item.label}
                </p>
                <p className="text-sm font-semibold text-[#173753]">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Buat `app/ibu/child/[id]/edukasi/page.tsx`**

```tsx
import ChildEducationView from "@/components/ibu/child-education-view"

export default function ChildEdukasiPage() {
  return <ChildEducationView />
}
```

- [ ] **Step 4: Buat `app/ibu/child/[id]/status/page.tsx`**

```tsx
"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { getIbuAnakDetail } from "@/lib/actions/ibu"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts"

type AnakDetail = NonNullable<Awaited<ReturnType<typeof getIbuAnakDetail>>>

function statusBadge(status: string) {
  const map: Record<string, string> = {
    Normal: "bg-green-100 text-green-700",
    "Stunting Berat": "bg-red-100 text-red-700",
    "Risiko Stunting": "bg-amber-100 text-amber-700",
    "Gizi Kurang": "bg-purple-100 text-purple-700",
  }
  return map[status] ?? "bg-gray-100 text-gray-600"
}

export default function ChildStatusPage() {
  const params = useParams()
  const id = params?.id as string
  const [anak, setAnak] = useState<AnakDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setAnak(null)
    setError(false)
    setLoading(true)
    getIbuAnakDetail(id)
      .then((data) => { if (data) setAnak(data) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#52A9E3] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error || !anak) return (
    <div className="flex-1 flex items-center justify-center px-5">
      <p className="text-sm text-muted-foreground text-center">
        {error ? "Terjadi kesalahan. Silakan coba lagi." : "Data tidak ditemukan."}
      </p>
    </div>
  )

  const chartData = [...anak.visits].reverse().map((v) => ({
    bulan: v.usiaBulan,
    bb: v.bb,
  }))

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <h1 className="text-xl font-semibold text-[#173753]">Status Tumbuh</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{anak.nama}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24 space-y-4">
        {/* Kurva BB */}
        {chartData.length > 0 ? (
          <div className="bg-white rounded-2xl p-4 shadow-[2px_2px_8px_rgba(0,0,0,0.06)]">
            <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-3">
              Kurva Berat Badan
            </p>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="bbGradStatus" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#52A9E3" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#52A9E3" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="bulan" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}bln`} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(value: unknown) => typeof value === "number" ? [`${value.toFixed(1)} kg`, "BB"] : [value, "BB"]}
                    labelFormatter={(label) => `Usia: ${label} bulan`}
                  />
                  <Area
                    type="monotone" dataKey="bb" stroke="#52A9E3" strokeWidth={2.5}
                    fill="url(#bbGradStatus)"
                    dot={{ r: 4, fill: "#52A9E3", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6 }} name="Berat Badan"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-4 shadow-[2px_2px_8px_rgba(0,0,0,0.06)]">
            <p className="text-sm text-muted-foreground">Belum ada data pengukuran.</p>
          </div>
        )}

        {/* Riwayat Pengukuran */}
        <div className="bg-white rounded-2xl p-4 shadow-[2px_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-3">
            Riwayat Pengukuran
          </p>
          {anak.visits.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada riwayat pengukuran.</p>
          ) : (
            <div className="space-y-2">
              {anak.visits.map((v, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-xl">
                  <div>
                    <p className="text-xs font-medium text-[#173753]">{v.tanggal}</p>
                    <p className="text-[11px] text-muted-foreground">{v.usiaBulan} bulan</p>
                    <p className="text-xs text-[#173753] mt-0.5">
                      {v.bb.toFixed(1)} kg · {v.tb.toFixed(1)} cm
                    </p>
                  </div>
                  <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium", statusBadge(v.status))}>
                    {v.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Buat `app/ibu/child/[id]/tugas/page.tsx`**

```tsx
import ChildTasksView from "@/components/ibu/child-tasks-view"

export default function ChildTugasPage() {
  return <ChildTasksView />
}
```

- [ ] **Step 6: Verifikasi TypeScript**
```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 7: Commit**
```bash
git add "app/ibu/child"
git commit -m "feat(ibu): add child context pages at /ibu/child/[id]/{dashboard,edukasi,status,tugas}"
```
