# Ibu Child Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membuat halaman detail anak di portal ibu (`/ibu/anak/[id]`) dan membuat card di daftar anak bisa ditekan untuk navigasi ke halaman tersebut.

**Architecture:** Tiga perubahan terpisah — (1) tambah server action `getIbuAnakDetail` ke `lib/actions/ibu.ts` dengan security check ownership, (2) buat halaman baru `app/ibu/anak/[id]/page.tsx` mobile-first, (3) bungkus card di `app/ibu/anak/page.tsx` dengan `Link`. Tidak ada perubahan ke kode kader.

**Tech Stack:** Next.js App Router, Prisma, NextAuth, Recharts (`AreaChart`), Tailwind CSS, `lucide-react`

---

### Task 1: Tambah `getIbuAnakDetail` ke `lib/actions/ibu.ts`

**Files:**
- Modify: `lib/actions/ibu.ts` — tambah fungsi baru di akhir file (setelah `getIbuAnaks`)

- [ ] **Step 1: Tambah fungsi `getIbuAnakDetail` di akhir `lib/actions/ibu.ts`**

Paste tepat setelah closing brace dari `getIbuAnaks` (setelah baris 184):

```typescript
export async function getIbuAnakDetail(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "ibu") throw new Error("Unauthorized")

  const anak = await prisma.anak.findFirst({
    where: { id, ibuId: session.user.id },
    include: {
      pengukurans: { orderBy: { tanggal: "desc" } },
    },
  })

  if (!anak) return null

  const birth = new Date(anak.tanggalLahir)
  const now = new Date()
  const ageMonths =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth())

  const last = anak.pengukurans[0] ?? null

  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d)

  return {
    id: anak.id,
    nama: anak.nama,
    jenisKelamin: anak.jenisKelamin as "L" | "P",
    tanggalLahir: fmt(birth),
    usia:
      ageMonths < 12
        ? `${ageMonths} bln`
        : `${Math.floor(ageMonths / 12)} thn ${ageMonths % 12} bln`,
    anakKe: anak.anakKe?.toString() ?? "—",
    latest: last
      ? {
          bb: last.beratBadan,
          tb: last.tinggiBadan,
          status: last.statusTBU,
          zScore: last.zScoreTBU.toFixed(1),
          tanggal: fmt(new Date(last.tanggal)),
        }
      : null,
    visits: anak.pengukurans.map((p) => {
      const pDate = new Date(p.tanggal)
      const visitMonths =
        (pDate.getFullYear() - birth.getFullYear()) * 12 +
        (pDate.getMonth() - birth.getMonth())
      return {
        tanggal: fmt(pDate),
        usiaBulan: visitMonths,
        bb: p.beratBadan,
        tb: p.tinggiBadan,
        status: p.statusTBU,
      }
    }),
  }
}
```

- [ ] **Step 2: Verifikasi TypeScript tidak error**

```bash
npx tsc --noEmit
```

Expected: tidak ada error baru terkait `lib/actions/ibu.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/ibu.ts
git commit -m "feat(ibu): add getIbuAnakDetail server action with ownership check"
```

---

### Task 2: Buat halaman `/app/ibu/anak/[id]/page.tsx`

**Files:**
- Create: `app/ibu/anak/[id]/page.tsx`

- [ ] **Step 1: Buat direktori dan file**

```bash
mkdir -p app/ibu/anak/\[id\]
```

Buat file `app/ibu/anak/[id]/page.tsx` dengan isi berikut:

```tsx
"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { getIbuAnakDetail } from "@/lib/actions/ibu"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

type AnakDetail = {
  id: string
  nama: string
  jenisKelamin: "L" | "P"
  tanggalLahir: string
  usia: string
  anakKe: string
  latest: {
    bb: number
    tb: number
    status: string
    zScore: string
    tanggal: string
  } | null
  visits: {
    tanggal: string
    usiaBulan: number
    bb: number
    tb: number
    status: string
  }[]
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

export default function IbuAnakDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const [anak, setAnak] = useState<AnakDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getIbuAnakDetail(id)
      .then((data) => {
        if (data) setAnak(data)
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#52A9E3] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!anak) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center gap-3">
          <Link
            href="/ibu/anak"
            className="w-8 h-8 rounded-full bg-[#EBF2F8] flex items-center justify-center flex-none"
          >
            <ChevronLeft className="w-4 h-4 text-[#173753]" />
          </Link>
          <h1 className="text-xl font-semibold text-[#173753]">Profil Anak</h1>
        </div>
        <div className="flex-1 flex items-center justify-center px-5">
          <p className="text-sm text-muted-foreground text-center">
            Data anak tidak ditemukan.
          </p>
        </div>
      </div>
    )
  }

  const chartData = [...anak.visits].reverse().map((v) => ({
    bulan: v.usiaBulan,
    bb: v.bb,
  }))

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center gap-3">
        <Link
          href="/ibu/anak"
          className="w-8 h-8 rounded-full bg-[#EBF2F8] flex items-center justify-center flex-none"
        >
          <ChevronLeft className="w-4 h-4 text-[#173753]" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-[#173753]">Profil Anak</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Detail pertumbuhan</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24 space-y-4">
        {/* Identity */}
        <div className="bg-white rounded-2xl p-4 shadow-[2px_2px_8px_rgba(0,0,0,0.06)] flex items-center gap-3">
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white flex-none"
            style={{
              background:
                anak.jenisKelamin === "L"
                  ? "linear-gradient(135deg,#378ADD,#93D1F7)"
                  : "linear-gradient(135deg,#E879A0,#F9A8D4)",
            }}
          >
            {anak.nama.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-base font-semibold text-[#173753]">{anak.nama}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {anak.usia} · {anak.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}
            </p>
            <p className="text-xs text-muted-foreground">Lahir: {anak.tanggalLahir}</p>
          </div>
        </div>

        {/* Status Gizi */}
        <div className="bg-white rounded-2xl p-4 shadow-[2px_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-3">
            Status Gizi Terakhir
          </p>
          {anak.latest ? (
            <>
              <span
                className={cn(
                  "inline-block text-sm px-3 py-1 rounded-full font-medium mb-3",
                  statusBadge(anak.latest.status)
                )}
              >
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

        {/* Kurva BB */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-[2px_2px_8px_rgba(0,0,0,0.06)]">
            <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-3">
              Kurva Berat Badan
            </p>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="bbGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#52A9E3" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#52A9E3" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f0f0f0"
                  />
                  <XAxis
                    dataKey="bulan"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}bln`}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `${value.toFixed(1)} kg`,
                      "BB",
                    ]}
                    labelFormatter={(label) => `Usia: ${label} bulan`}
                  />
                  <Area
                    type="monotone"
                    dataKey="bb"
                    stroke="#52A9E3"
                    strokeWidth={2.5}
                    fill="url(#bbGrad)"
                    dot={{ r: 4, fill: "#52A9E3", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6 }}
                    name="Berat Badan"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Riwayat Pengukuran */}
        <div className="bg-white rounded-2xl p-4 shadow-[2px_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-3">
            Riwayat Pengukuran
          </p>
          {anak.visits.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada riwayat pengukuran.
            </p>
          ) : (
            <div className="space-y-2">
              {anak.visits.map((v, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-xl"
                >
                  <div>
                    <p className="text-xs font-medium text-[#173753]">{v.tanggal}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {v.usiaBulan} bulan
                    </p>
                    <p className="text-xs text-[#173753] mt-0.5">
                      {v.bb.toFixed(1)} kg · {v.tb.toFixed(1)} cm
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-[11px] px-2 py-0.5 rounded-full font-medium",
                      statusBadge(v.status)
                    )}
                  >
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

- [ ] **Step 2: Verifikasi TypeScript tidak error**

```bash
npx tsc --noEmit
```

Expected: tidak ada error baru.

- [ ] **Step 3: Commit**

```bash
git add "app/ibu/anak/[id]/page.tsx"
git commit -m "feat(ibu): add child detail page at /ibu/anak/[id]"
```

---

### Task 3: Buat card di daftar anak bisa ditekan

**Files:**
- Modify: `app/ibu/anak/page.tsx` — bungkus card dengan `Link`, tambah `ChevronRight`

- [ ] **Step 1: Tambah import `Link` dan `ChevronRight` di `app/ibu/anak/page.tsx`**

Ganti baris import yang ada:
```tsx
import { Baby } from "lucide-react"
```
Dengan:
```tsx
import { Baby, ChevronRight } from "lucide-react"
import Link from "next/link"
```

- [ ] **Step 2: Bungkus card dengan `Link` dan tambah `ChevronRight`**

Ganti blok card yang ada (dari `<div key={anak.id}` sampai penutup `</div>`):

```tsx
<Link
  key={anak.id}
  href={`/ibu/anak/${anak.id}`}
  className="bg-white rounded-2xl p-4 shadow-[2px_2px_8px_rgba(0,0,0,0.06)] flex items-center gap-3 active:bg-gray-50 transition-colors"
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
    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
  </div>
</Link>
```

Catatan: pindahkan `key={anak.id}` dari `<div>` ke `<Link>` karena `<Link>` sekarang jadi elemen terluar di dalam `.map()`.

- [ ] **Step 3: Verifikasi TypeScript tidak error**

```bash
npx tsc --noEmit
```

Expected: tidak ada error.

- [ ] **Step 4: Commit**

```bash
git add app/ibu/anak/page.tsx
git commit -m "feat(ibu): make child list cards navigable to detail page"
```
