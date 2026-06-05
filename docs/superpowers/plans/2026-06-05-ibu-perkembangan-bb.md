# Ibu Perkembangan BB — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign ibu health monitoring — ganti self-check form dengan IMT-based weight gain tracking read-only dari data kader, dan tambahkan grafik BB menggunakan Recharts.

**Architecture:** Tambah dua Prisma model baru (`PregnancyProfile` dibuat kader di T1, `PregnancyVisit` per kunjungan). Server actions expose read-only data ke ibu UI. Dashboard menampilkan BB card dengan target range IOM dan satu kartu status aktif. Halaman `/ibu/status` dirombak total menjadi "Perkembangan BB" dengan 4 section read-only.

**Tech Stack:** Next.js, TypeScript, Prisma + PostgreSQL (via PrismaPg), Recharts, Tailwind CSS, NextAuth 5, Lucide React

**Spec:** `docs/superpowers/specs/2026-06-05-ibu-perkembangan-bb-design.md`

---

## File Map

### New Files
- `lib/growth-standards/imt-calc.ts` — IMT utility functions + shared TypeScript types
- `lib/actions/pregnancy.ts` — server actions: `getPregnancyProfile`, `getPregnancyVisits`
- `components/ibu/bb-chart.tsx` — Recharts chart: target zone + actual BB line + colored dots

### Modified Files
- `prisma/schema.prisma` — tambah model `PregnancyProfile` + `PregnancyVisit` + relasi ke `Ibu`
- `prisma/seed.mjs` — tambah data sample pregnancy profile + 4 kunjungan untuk `andi.pratama`
- `lib/actions/ibu.ts` — update `getIbuData()` include `pregnancyProfile` + `pregnancyVisits`
- `components/ibu-bottom-nav.tsx` — rename "Status Risiko" → "Progres", ganti icon ke TrendingUp
- `app/ibu/dashboard/page.tsx` — BB card dengan target range, risk bar dari visit data, 1 kartu status aktif, CTA renamed
- `app/ibu/status/page.tsx` — rombak total: 4 section read-only (IMT profile, kunjungan terakhir, grafik, riwayat)

---

## Task 1: IMT Utility Types & Functions

**Files:**
- Create: `lib/growth-standards/imt-calc.ts`

- [ ] **Step 1: Buat file utility dengan types dan functions**

```typescript
// lib/growth-standards/imt-calc.ts

export type IMTCategory = 'underweight' | 'normal' | 'overweight' | 'obese'

export interface IOMTargets {
  totalGainMinKg: number
  totalGainMaxKg: number
  weeklyGainMinKg: number
  weeklyGainMaxKg: number
}

export interface PregnancyProfileData {
  id: string
  bbPrepregnancyKg: number
  heightCm: number
  imtPrepregnancy: number
  imtCategory: IMTCategory
  targetGainMinKg: number
  targetGainMaxKg: number
  weeklyGainMinKg: number
  weeklyGainMaxKg: number
}

export interface PregnancyVisitData {
  id: string
  visitDate: Date
  currentWeightKg: number
  weightGainKg: number
  lilaCm: number
  hbGdl: number
  isOnTrack: boolean
}

export function calculateIMT(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100
  return weightKg / (heightM * heightM)
}

export function getIMTCategory(imt: number): IMTCategory {
  if (imt < 18.5) return 'underweight'
  if (imt < 25) return 'normal'
  if (imt < 30) return 'overweight'
  return 'obese'
}

const IOM_TABLE: Record<IMTCategory, IOMTargets> = {
  underweight: { totalGainMinKg: 12.7, totalGainMaxKg: 18,   weeklyGainMinKg: 0.45, weeklyGainMaxKg: 0.59 },
  normal:      { totalGainMinKg: 11.3, totalGainMaxKg: 15.9, weeklyGainMinKg: 0.36, weeklyGainMaxKg: 0.45 },
  overweight:  { totalGainMinKg: 6.8,  totalGainMaxKg: 11.3, weeklyGainMinKg: 0.27, weeklyGainMaxKg: 0.32 },
  obese:       { totalGainMinKg: 5,    totalGainMaxKg: 9,    weeklyGainMinKg: 0.22, weeklyGainMaxKg: 0.27 },
}

export function getIOMTargets(category: IMTCategory): IOMTargets {
  return IOM_TABLE[category]
}
```

- [ ] **Step 2: Verifikasi file terbuat tanpa TypeScript error**

```bash
npx tsc --noEmit
```

Expected: tidak ada error baru.

- [ ] **Step 3: Commit**

```bash
git add lib/growth-standards/imt-calc.ts
git commit -m "feat: add IMT utility types and IOM target lookup"
```

---

## Task 2: Prisma Schema — Tambah PregnancyProfile & PregnancyVisit

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Tambah dua model baru ke schema.prisma**

Buka `prisma/schema.prisma`. Temukan model `Ibu` dan tambahkan dua relasi baru di dalamnya:

```prisma
// Tambahkan ke dalam model Ibu (di antara field yang sudah ada):
  pregnancyProfile  PregnancyProfile?
  pregnancyVisits   PregnancyVisit[]
```

Lalu tambahkan dua model baru di bawah semua model yang sudah ada:

```prisma
model PregnancyProfile {
  id                String   @id @default(cuid())
  ibuId             String   @unique
  ibu               Ibu      @relation(fields: [ibuId], references: [id], onDelete: Cascade)
  bbPrepregnancyKg  Float
  heightCm          Float
  imtPrepregnancy   Float
  imtCategory       String
  targetGainMinKg   Float
  targetGainMaxKg   Float
  weeklyGainMinKg   Float
  weeklyGainMaxKg   Float
  createdAt         DateTime @default(now())
}

model PregnancyVisit {
  id              String   @id @default(cuid())
  ibuId           String
  ibu             Ibu      @relation(fields: [ibuId], references: [id], onDelete: Cascade)
  visitDate       DateTime
  currentWeightKg Float
  weightGainKg    Float
  lilaCm          Float
  hbGdl           Float
  isOnTrack       Boolean
  createdAt       DateTime @default(now())
}
```

- [ ] **Step 2: Jalankan migrasi database**

```bash
npx prisma migrate dev --name add_pregnancy_models
```

Expected output mengandung: `The following migration(s) have been applied` dan tidak ada error.

- [ ] **Step 3: Generate Prisma client**

```bash
npx prisma generate
```

Expected: `Generated Prisma Client`.

- [ ] **Step 4: Verifikasi TypeScript tidak error**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add PregnancyProfile and PregnancyVisit prisma models"
```

---

## Task 3: Seed Data — Tambah Sample Pregnancy Data

**Files:**
- Modify: `prisma/seed.mjs`

- [ ] **Step 1: Tambah seed data pregnancy setelah upsert ibu**

Buka `prisma/seed.mjs`. Setelah block `await prisma.ibu.upsert(...)` untuk `andi.pratama`, tambahkan:

```javascript
// Cari ibu yang baru di-upsert
const ibu = await prisma.ibu.findUnique({ where: { username: "andi.pratama" } })

// Pregnancy profile (IMT Normal: 52kg / 1.58² = 20.83)
await prisma.pregnancyProfile.upsert({
  where: { ibuId: ibu.id },
  update: {},
  create: {
    ibuId: ibu.id,
    bbPrepregnancyKg: 52,
    heightCm: 158,
    imtPrepregnancy: 20.83,
    imtCategory: "normal",
    targetGainMinKg: 11.3,
    targetGainMaxKg: 15.9,
    weeklyGainMinKg: 0.36,
    weeklyGainMaxKg: 0.45,
  },
})

// Hapus kunjungan lama agar seed idempoten
await prisma.pregnancyVisit.deleteMany({ where: { ibuId: ibu.id } })

// 4 kunjungan sample (urutan lama ke baru)
const visits = [
  { visitDate: new Date("2026-04-01"), currentWeightKg: 53.5, weightGainKg: 1.5,  lilaCm: 25.2, hbGdl: 12.0, isOnTrack: true  },
  { visitDate: new Date("2026-04-30"), currentWeightKg: 55.5, weightGainKg: 3.5,  lilaCm: 25.0, hbGdl: 11.8, isOnTrack: true  },
  { visitDate: new Date("2026-05-05"), currentWeightKg: 57.0, weightGainKg: 5.0,  lilaCm: 24.8, hbGdl: 10.9, isOnTrack: false },
  { visitDate: new Date("2026-06-02"), currentWeightKg: 60.5, weightGainKg: 8.5,  lilaCm: 25.1, hbGdl: 11.8, isOnTrack: true  },
]

for (const v of visits) {
  await prisma.pregnancyVisit.create({ data: { ibuId: ibu.id, ...v } })
}
```

- [ ] **Step 2: Jalankan seed**

```bash
node prisma/seed.mjs
```

Expected: `Seed berhasil` tanpa error.

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.mjs
git commit -m "feat: seed sample pregnancy profile and visits for andi.pratama"
```

---

## Task 4: Server Actions — getPregnancyProfile & getPregnancyVisits

**Files:**
- Create: `lib/actions/pregnancy.ts`
- Modify: `lib/actions/ibu.ts`

- [ ] **Step 1: Buat lib/actions/pregnancy.ts**

```typescript
// lib/actions/pregnancy.ts
"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import type { PregnancyProfileData, PregnancyVisitData } from "@/lib/growth-standards/imt-calc"

export async function getPregnancyProfile(): Promise<PregnancyProfileData | null> {
  const session = await auth()
  if (!session || session.user.role !== "ibu") throw new Error("Unauthorized")

  const profile = await prisma.pregnancyProfile.findUnique({
    where: { ibuId: session.user.id },
  })

  if (!profile) return null

  return {
    id: profile.id,
    bbPrepregnancyKg: profile.bbPrepregnancyKg,
    heightCm: profile.heightCm,
    imtPrepregnancy: profile.imtPrepregnancy,
    imtCategory: profile.imtCategory as PregnancyProfileData['imtCategory'],
    targetGainMinKg: profile.targetGainMinKg,
    targetGainMaxKg: profile.targetGainMaxKg,
    weeklyGainMinKg: profile.weeklyGainMinKg,
    weeklyGainMaxKg: profile.weeklyGainMaxKg,
  }
}

export async function getPregnancyVisits(): Promise<PregnancyVisitData[]> {
  const session = await auth()
  if (!session || session.user.role !== "ibu") throw new Error("Unauthorized")

  const visits = await prisma.pregnancyVisit.findMany({
    where: { ibuId: session.user.id },
    orderBy: { visitDate: "desc" },
  })

  return visits.map(v => ({
    id: v.id,
    visitDate: v.visitDate,
    currentWeightKg: v.currentWeightKg,
    weightGainKg: v.weightGainKg,
    lilaCm: v.lilaCm,
    hbGdl: v.hbGdl,
    isOnTrack: v.isOnTrack,
  }))
}
```

- [ ] **Step 2: Update lib/actions/ibu.ts — tambah include pregnancy ke getIbuData()**

Ganti seluruh isi `getIbuData()` dengan:

```typescript
"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/auth"

export async function getIbuData() {
  const session = await auth()
  if (!session || session.user.role !== "ibu") {
    throw new Error("Unauthorized")
  }

  const ibu = await prisma.ibu.findUnique({
    where: { id: session.user.id },
    include: {
      anaks: {
        include: {
          pengukurans: {
            orderBy: { tanggal: "desc" },
            take: 1,
          },
        },
      },
      skrinings: {
        orderBy: { tanggal: "desc" },
        take: 1,
      },
      pregnancyProfile: true,
      pregnancyVisits: {
        orderBy: { visitDate: "desc" },
        take: 1,
      },
    },
  })

  if (!ibu) return null

  const lastSkrining = ibu.skrinings[0]
  const pregnancyProfile = ibu.pregnancyProfile
  const lastVisit = ibu.pregnancyVisits[0] ?? null

  return {
    nama: ibu.nama,
    isPregnant: ibu.anaks.length === 0,
    weeksPregnant: 24,
    dueDate: "12 Sep 2026",
    riskStatus: lastSkrining?.kategori || "Aman",
    riskScore: lastSkrining?.skorRisiko || 16,
    lila: lastVisit?.lilaCm ?? 25.1,
    hb: lastVisit?.hbGdl ?? 11.8,
    bbGain: lastVisit?.weightGainKg ?? 6.5,
    isOnTrack: lastVisit?.isOnTrack ?? null as boolean | null,
    targetGainMin: pregnancyProfile?.targetGainMinKg ?? null as number | null,
    targetGainMax: pregnancyProfile?.targetGainMaxKg ?? null as number | null,
  }
}
```

- [ ] **Step 3: Verifikasi TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add lib/actions/pregnancy.ts lib/actions/ibu.ts
git commit -m "feat: add getPregnancyProfile/Visits actions, update getIbuData with real visit data"
```

---

## Task 5: Bottom Nav — Rename "Status Risiko" → "Progres"

**Files:**
- Modify: `components/ibu-bottom-nav.tsx`

- [ ] **Step 1: Tambah import TrendingUp dan update nav item**

Tambahkan import Lucide di baris paling atas file:

```typescript
import { TrendingUp } from 'lucide-react'
```

Lalu cari object nav item dengan `label: 'Status Risiko'` dan ganti seluruh object itu dengan:

```typescript
{
  label: 'Progres',
  href: '/ibu/status',
  icon: <TrendingUp width={21} height={21} strokeWidth={1.9} />,
},
```

- [ ] **Step 2: Verifikasi di browser**

Jalankan dev server (`npm run dev`), login sebagai `andi.pratama` (PIN: `1234`). Pastikan bottom nav menampilkan "Progres" dengan ikon panah naik, dan masih aktif saat di halaman `/ibu/status`.

- [ ] **Step 3: Commit**

```bash
git add components/ibu-bottom-nav.tsx
git commit -m "feat: rename Status Risiko nav tab to Progres with TrendingUp icon"
```

---

## Task 6: Dashboard Updates

**Files:**
- Modify: `app/ibu/dashboard/page.tsx`

- [ ] **Step 1: Update tipe state ibuData dan tambah helper computeRiskLevel**

Di bagian atas komponen, setelah import, tambahkan helper function dan STATUS_MESSAGES (di luar komponen):

```typescript
type RiskLevel = 'rendah' | 'sedang' | 'tinggi'

function computeRiskLevel(lila: number, hb: number, isOnTrack: boolean | null): RiskLevel {
  if (lila < 23.5 || hb < 11) return 'tinggi'
  if (isOnTrack === false) return 'sedang'
  return 'rendah'
}

const STATUS_MESSAGES: Record<RiskLevel, {
  bg: string; border: string; iconBg: string; textColor: string;
  Icon: React.ElementType; label: string; message: string;
}> = {
  rendah: {
    bg: 'bg-[#E7F7EF]', border: 'border-[#C3E9D4]',
    iconBg: 'bg-[#1E9E62]', textColor: 'text-[#0E6B3E]',
    Icon: Check,
    label: 'Status Aman',
    message: 'Saat ini, Bunda berada di Status Aman! Kondisi yang sangat ideal untuk tumbuh kembang janin. Pertahankan, ya!',
  },
  sedang: {
    bg: 'bg-[#FFF7E6]', border: 'border-[#F4E2BC]',
    iconBg: 'bg-[#D99100]', textColor: 'text-[#8A6100]',
    Icon: AlertTriangle,
    label: 'Perlu Perhatian',
    message: 'Kenaikan BB Bunda perlu lebih diperhatikan. Waktunya fokus pada asupan nutrisi harian, jangan lupa makan ekstra protein hewani, ya Bunda.',
  },
  tinggi: {
    bg: 'bg-[#FEF1F1]', border: 'border-[#F6D2D2]',
    iconBg: 'bg-[#DC2626]', textColor: 'text-[#9F1C1C]',
    Icon: Flame,
    label: 'Risiko Tinggi',
    message: 'Saat ini, Bunda berada di Status Risiko Tinggi. Jangan ditunda, mari jadwalkan periksa ke fasilitas kesehatan terdekat untuk penanganan yang tepat!',
  },
}
```

Ubah tipe state `ibuData`:

```typescript
const [ibuData, setIbuData] = useState<{
  nama: string
  weeksPregnant: number
  dueDate: string
  riskStatus: string
  riskScore: number
  lila: number
  hb: number
  bbGain: number
  isOnTrack: boolean | null
  targetGainMin: number | null
  targetGainMax: number | null
} | null>(null)
```

- [ ] **Step 2: Update card "Kenaikan BB" di section Indikator Risiko**

Cari JSX card yang menampilkan `Kenaikan BB`. Ganti seluruh card itu dengan:

```tsx
<div className="flex-1 bg-[#F1F7FE] border border-[#E4EDE7] rounded-[13px] p-2.5 text-center">
  <div className="text-[10px] font-medium text-[#697079]">Kenaikan BB</div>
  <div className="text-[17px] font-bold text-[#1F2937] mt-1 tracking-tight leading-none">
    +{ibuData?.bbGain ?? 0}<small className="text-[9px] font-medium text-[#697079] ml-0.5"> kg</small>
  </div>
  {ibuData?.targetGainMin != null && (
    <div className="text-[8px] text-[#697079] mt-0.5 leading-tight">
      dari {ibuData.targetGainMin}–{ibuData.targetGainMax} kg
    </div>
  )}
  <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[8.5px] font-bold ${
    ibuData?.isOnTrack === false
      ? 'bg-[#FFF7E6] text-[#8A6100]'
      : 'bg-[#E7F7EF] text-[#1E9E62]'
  }`}>
    {ibuData?.isOnTrack === false ? 'Perlu Perhatian' : 'Sesuai'}
  </span>
</div>
```

- [ ] **Step 3: Update posisi marker gradient risk bar**

Cari `<span` yang memiliki `style={{ left: '16%' }}`. Ganti dengan:

```tsx
{(() => {
  const level = computeRiskLevel(ibuData?.lila ?? 25, ibuData?.hb ?? 12, ibuData?.isOnTrack ?? null)
  const pos = { rendah: '16%', sedang: '50%', tinggi: '83%' }[level]
  const color = { rendah: '#1E9E62', sedang: '#F2B705', tinggi: '#E0524E' }[level]
  return (
    <span
      className="absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full bg-white shadow-[0_3px_8px_rgba(9,30,66,0.3)] transition-all duration-500"
      style={{ left: pos, borderWidth: '3px', borderStyle: 'solid', borderColor: color }}
    />
  )
})()}
```

- [ ] **Step 4: Ganti section "Pesan Harian" dari 3 kartu menjadi 1 kartu aktif**

Hapus seluruh 3 div kartu di dalam section "Pesan Harian" (div `.flex.flex-col.gap-2.5` yang berisi 3 kartu status). Ganti dengan:

```tsx
{(() => {
  const level = computeRiskLevel(ibuData?.lila ?? 25, ibuData?.hb ?? 12, ibuData?.isOnTrack ?? null)
  const s = STATUS_MESSAGES[level]
  return (
    <div className={`flex gap-3 items-start p-3 rounded-[14px] border ${s.border} ${s.bg}`}>
      <div className={`shrink-0 w-[30px] h-[30px] rounded-[9px] ${s.iconBg} flex items-center justify-center`}>
        <s.Icon className="w-[17px] h-[17px] text-white" strokeWidth={2.3} />
      </div>
      <div className="min-w-0">
        <div className={`text-[12.5px] font-semibold ${s.textColor} leading-tight flex items-center gap-2`}>
          {s.label}
          <span className="text-[8px] font-bold tracking-widest px-2 py-0.5 rounded-full bg-white opacity-80">SAAT INI</span>
        </div>
        <div className="text-[11.5px] font-normal text-[#4C545F] mt-1 leading-relaxed">
          {s.message}
        </div>
      </div>
    </div>
  )
})()}
```

- [ ] **Step 5: Rename tombol CTA "Lihat Status Risiko" → "Lihat Perkembangan BB"**

Cari `Lihat Status Risiko` di JSX. Ganti teks tersebut menjadi `Lihat Perkembangan BB`.

- [ ] **Step 6: Verifikasi di browser**

Login sebagai `andi.pratama`. Di dashboard:
- Card "Kenaikan BB" harus tampilkan "+8,5 kg" dengan sub-teks "dari 11,3–15,9 kg" dan badge "Sesuai" (hijau) — karena kunjungan terakhir `isOnTrack: true`
- Gradient bar marker harus di posisi hijau (kiri, 16%)
- "Pesan Harian" harus tampil 1 kartu "Status Aman"
- Tombol CTA berbunyi "Lihat Perkembangan BB"

- [ ] **Step 7: Commit**

```bash
git add app/ibu/dashboard/page.tsx
git commit -m "feat: update dashboard BB card with IOM target, dynamic risk bar, single active status card"
```

---

## Task 7: BBChart Component

**Files:**
- Create: `components/ibu/bb-chart.tsx`

- [ ] **Step 1: Buat komponen BBChart**

```tsx
// components/ibu/bb-chart.tsx
'use client'

import { useState } from 'react'
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceArea, ResponsiveContainer,
} from 'recharts'
import type { PregnancyProfileData, PregnancyVisitData } from '@/lib/growth-standards/imt-calc'

interface BBChartProps {
  profile: PregnancyProfileData
  visits: PregnancyVisitData[]
}

type ChartView = 'visit' | 'month'

function formatLabel(date: Date, view: ChartView): string {
  if (view === 'month') {
    return new Date(date).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
  }
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

export function BBChart({ profile, visits }: BBChartProps) {
  const [view, setView] = useState<ChartView>('visit')

  if (visits.length < 2) {
    return (
      <div className="bg-[#F4F7FA] border border-[#DCE6EF] rounded-[14px] p-5 text-center">
        <p className="text-[12px] text-[#697079]">
          Data akan muncul setelah minimal 2 kunjungan tercatat.
        </p>
      </div>
    )
  }

  const sorted = [...visits].sort(
    (a, b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime()
  )

  const data = sorted.map(v => ({
    label: formatLabel(new Date(v.visitDate), view),
    weight: v.currentWeightKg,
    isOnTrack: v.isOnTrack,
  }))

  const targetMin = profile.bbPrepregnancyKg + profile.targetGainMinKg
  const targetMax = profile.bbPrepregnancyKg + profile.targetGainMaxKg

  const allWeights = data.map(d => d.weight)
  const yMin = Math.floor(Math.min(...allWeights, targetMin) - 1)
  const yMax = Math.ceil(Math.max(...allWeights, targetMax) + 1)

  return (
    <div className="bg-white border border-[#E4EDE7] rounded-[18px] p-4 shadow-[0_4px_14px_-8px_rgba(9,30,66,0.12)]">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[12px] font-semibold text-[#1F2937]">Grafik BB</span>
        <div className="flex bg-[#F4F7FA] border border-[#DCE6EF] rounded-[10px] p-[3px] gap-[3px]">
          {(['visit', 'month'] as ChartView[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded-[8px] text-[11px] font-semibold transition-all ${
                view === v
                  ? 'bg-white text-[#1178D4] shadow-[0_2px_5px_rgba(9,30,66,0.1)]'
                  : 'text-[#697079]'
              }`}
            >
              {v === 'visit' ? 'Per Kunjungan' : 'Per Bulan'}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#697079' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 10, fill: '#697079' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid #E4EDE7', boxShadow: 'none' }}
            formatter={(value: number) => [`${value} kg`, 'Berat Badan']}
          />
          <ReferenceArea
            y1={targetMin}
            y2={targetMax}
            fill="#E7F7EF"
            fillOpacity={0.8}
            stroke="#C3E9D4"
            strokeWidth={1}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#1178D4"
            strokeWidth={2}
            dot={(props: any) => {
              const { cx, cy, index } = props
              const isOnTrack = data[index]?.isOnTrack ?? true
              return (
                <circle
                  key={`dot-${index}`}
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill={isOnTrack ? '#1E9E62' : '#D99100'}
                  stroke="white"
                  strokeWidth={2}
                />
              )
            }}
            activeDot={{ r: 6, fill: '#1178D4', stroke: 'white', strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-4 mt-3 justify-center flex-wrap">
        <span className="flex items-center gap-1.5 text-[10px] text-[#697079]">
          <span className="w-4 h-[2px] bg-[#1178D4] rounded-full inline-block" />
          BB Aktual
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-[#697079]">
          <span className="w-3 h-3 rounded-sm bg-[#E7F7EF] border border-[#C3E9D4] inline-block" />
          Zona Target
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-[#697079]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1E9E62] inline-block" />
          Sesuai
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-[#697079]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D99100] inline-block" />
          Perlu Perhatian
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verifikasi TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/ibu/bb-chart.tsx
git commit -m "feat: add BBChart component with Recharts target zone and colored visit dots"
```

---

## Task 8: Status Page — Rombak Total menjadi "Perkembangan BB"

**Files:**
- Rewrite: `app/ibu/status/page.tsx`

- [ ] **Step 1: Ganti seluruh isi app/ibu/status/page.tsx**

```tsx
// app/ibu/status/page.tsx
"use client"

import { useEffect, useState } from 'react'
import { TrendingUp, Calendar } from 'lucide-react'
import { getPregnancyProfile, getPregnancyVisits } from '@/lib/actions/pregnancy'
import { BBChart } from '@/components/ibu/bb-chart'
import type { PregnancyProfileData, PregnancyVisitData } from '@/lib/growth-standards/imt-calc'

const IMT_LABELS: Record<string, string> = {
  underweight: 'Underweight',
  normal: 'Normal',
  overweight: 'Overweight',
  obese: 'Obese',
}

const IMT_COLORS: Record<string, { bg: string; text: string }> = {
  underweight: { bg: 'bg-[#E7F2FB]', text: 'text-[#0A487F]' },
  normal:      { bg: 'bg-[#E7F7EF]', text: 'text-[#0E6B3E]' },
  overweight:  { bg: 'bg-[#FFF7E6]', text: 'text-[#8A6100]' },
  obese:       { bg: 'bg-[#FFF7E6]', text: 'text-[#8A6100]' },
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function getRiskBadge(visit: PregnancyVisitData) {
  if (visit.lilaCm < 23.5 || visit.hbGdl < 11) {
    return { label: 'Risiko Tinggi', bg: 'bg-[#FEF1F1]', text: 'text-[#9F1C1C]' }
  }
  if (!visit.isOnTrack) {
    return { label: 'Perlu Perhatian', bg: 'bg-[#FFF7E6]', text: 'text-[#8A6100]' }
  }
  return { label: 'Sesuai Target', bg: 'bg-[#E7F7EF]', text: 'text-[#0E6B3E]' }
}

export default function PerkembanganBBPage() {
  const [profile, setProfile] = useState<PregnancyProfileData | null>(null)
  const [visits, setVisits] = useState<PregnancyVisitData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    Promise.all([getPregnancyProfile(), getPregnancyVisits()]).then(([p, v]) => {
      if (!mounted) return
      setProfile(p)
      setVisits(v)
      setLoading(false)
    })
    return () => { mounted = false }
  }, [])

  if (loading) {
    return <div className="flex-1 flex items-center justify-center bg-white">Loading...</div>
  }

  const lastVisit = visits[0] ?? null
  const riskBadge = lastVisit ? getRiskBadge(lastVisit) : null

  return (
    <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar scroll-smooth">
      {/* Header */}
      <header className="shrink-0 px-[22px] pt-[6px] pb-4 bg-gradient-to-b from-white to-[#F1F7FE] rounded-b-[24px] shadow-[0_6px_16px_-10px_rgba(17,120,212,0.4)] z-[5]">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-[13px] h-[13px] text-[#1178D4]" strokeWidth={2} />
          <span className="text-[11px] font-medium text-[#1178D4]">Pantau Kehamilan</span>
        </div>
        <h1 className="text-[22px] font-semibold text-[#1F2937] tracking-tight leading-tight">
          Perkembangan Berat Badan
        </h1>
        <p className="text-[11.5px] text-[#697079] mt-1 leading-[1.4] max-w-[290px]">
          Pantau kenaikan BB-mu sesuai target kehamilan
        </p>
      </header>

      <main className="px-5 pt-4 pb-[108px] flex flex-col gap-4">

        {/* Section 1: Profil IMT */}
        <div>
          <h2 className="text-[14px] font-semibold text-[#1F2937] mb-2.5 px-0.5">Profil IMT</h2>
          {profile ? (
            <section className="bg-white border border-[#E4EDE7] rounded-[18px] p-4 shadow-[0_4px_14px_-8px_rgba(9,30,66,0.12)]">
              <div className="flex gap-2 mb-3">
                {[
                  { label: 'BB Pra-hamil', value: `${profile.bbPrepregnancyKg}`, unit: 'kg' },
                  { label: 'Tinggi', value: `${profile.heightCm}`, unit: 'cm' },
                  { label: 'IMT', value: profile.imtPrepregnancy.toFixed(1), unit: '' },
                ].map(({ label, value, unit }) => (
                  <div key={label} className="flex-1 bg-[#F4F7FA] rounded-[12px] p-2.5 text-center">
                    <div className="text-[9.5px] text-[#697079] font-medium">{label}</div>
                    <div className="text-[16px] font-bold text-[#1F2937] mt-0.5 leading-none">
                      {value}<small className="text-[9px] font-medium text-[#697079]"> {unit}</small>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[9.5px] text-[#697079] font-medium mb-1">Kategori</div>
                  <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold ${IMT_COLORS[profile.imtCategory]?.bg} ${IMT_COLORS[profile.imtCategory]?.text}`}>
                    {IMT_LABELS[profile.imtCategory] ?? profile.imtCategory}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-[9.5px] text-[#697079] font-medium mb-0.5">Target Kenaikan Total</div>
                  <div className="text-[15px] font-bold text-[#1178D4]">
                    {profile.targetGainMinKg}–{profile.targetGainMaxKg} kg
                  </div>
                  <div className="text-[9.5px] text-[#697079]">
                    {profile.weeklyGainMinKg}–{profile.weeklyGainMaxKg} kg/minggu
                  </div>
                </div>
              </div>
              <p className="text-[9px] text-[#989DA3] mt-3 flex items-center gap-1">
                📌 Dihitung sekali di awal kehamilan · Tidak berubah
              </p>
            </section>
          ) : (
            <div className="bg-[#F4F7FA] border border-[#DCE6EF] rounded-[18px] p-5 text-center">
              <p className="text-[12px] text-[#697079]">
                Data profil kehamilan belum tersedia. Kader akan mengisi saat kunjungan pertama.
              </p>
            </div>
          )}
        </div>

        {/* Section 2: Kunjungan Terakhir */}
        <div>
          <h2 className="text-[14px] font-semibold text-[#1F2937] mb-2.5 px-0.5">Kunjungan Terakhir</h2>
          {lastVisit ? (
            <section className="bg-white border border-[#E4EDE7] rounded-[18px] p-4 shadow-[0_4px_14px_-8px_rgba(9,30,66,0.12)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-[#697079] flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  {formatDate(lastVisit.visitDate)}
                </span>
                {riskBadge && (
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${riskBadge.bg} ${riskBadge.text}`}>
                    {riskBadge.label}
                  </span>
                )}
              </div>
              <div className="flex gap-2 mb-3">
                <div className="flex-1 bg-[#F4F7FA] rounded-[12px] p-3 text-center">
                  <div className="text-[9.5px] text-[#697079] font-medium">BB Sekarang</div>
                  <div className="text-[18px] font-bold text-[#1F2937] mt-0.5 leading-none">
                    {lastVisit.currentWeightKg}<small className="text-[9px] font-medium text-[#697079]"> kg</small>
                  </div>
                </div>
                <div className="flex-1 bg-[#F4F7FA] rounded-[12px] p-3 text-center">
                  <div className="text-[9.5px] text-[#697079] font-medium">Kenaikan Total</div>
                  <div className="text-[18px] font-bold text-[#1178D4] mt-0.5 leading-none">
                    +{lastVisit.weightGainKg}<small className="text-[9px] font-medium text-[#697079]"> kg</small>
                  </div>
                  {profile && (
                    <div className="text-[8px] text-[#697079] mt-0.5">
                      target {profile.targetGainMinKg}–{profile.targetGainMaxKg} kg
                    </div>
                  )}
                </div>
              </div>
              <div className="border-t border-[#E4EDE7] pt-3 flex gap-3">
                {[
                  {
                    label: 'LILA', value: lastVisit.lilaCm, unit: 'cm',
                    ok: lastVisit.lilaCm >= 23.5, okLabel: 'Normal', badLabel: 'KEK',
                  },
                  {
                    label: 'Hb', value: lastVisit.hbGdl, unit: 'g/dL',
                    ok: lastVisit.hbGdl >= 11, okLabel: 'Normal', badLabel: 'Anemia',
                  },
                ].map(({ label, value, unit, ok, okLabel, badLabel }) => (
                  <div key={label} className="flex-1 text-center">
                    <div className="text-[9.5px] text-[#697079] font-medium">{label}</div>
                    <div className="text-[14px] font-bold text-[#1F2937] mt-0.5">
                      {value}<small className="text-[9px] font-medium text-[#697079]"> {unit}</small>
                    </div>
                    <span className={`inline-block text-[8.5px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                      ok ? 'bg-[#E7F7EF] text-[#1E9E62]' : 'bg-[#FEF1F1] text-[#9F1C1C]'
                    }`}>
                      {ok ? okLabel : badLabel}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <div className="bg-[#F4F7FA] border border-[#DCE6EF] rounded-[18px] p-5 text-center">
              <p className="text-[12px] text-[#697079]">
                Belum ada data kunjungan. Kader akan mengisi saat kunjungan posyandu berikutnya.
              </p>
            </div>
          )}
        </div>

        {/* Section 3: Grafik BB */}
        {profile && (
          <div>
            <h2 className="text-[14px] font-semibold text-[#1F2937] mb-2.5 px-0.5">Grafik Berat Badan</h2>
            <BBChart profile={profile} visits={visits} />
          </div>
        )}

        {/* Section 4: Riwayat Kunjungan */}
        {visits.length > 0 && (
          <div>
            <h2 className="text-[14px] font-semibold text-[#1F2937] mb-2.5 px-0.5">Riwayat Kunjungan</h2>
            <div className="flex flex-col gap-2.5">
              {visits.map(v => {
                const badge = getRiskBadge(v)
                return (
                  <div
                    key={v.id}
                    className="bg-white border border-[#E4EDE7] rounded-[14px] px-4 py-3 shadow-[0_2px_8px_-6px_rgba(9,30,66,0.12)] flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[10.5px] text-[#697079] font-medium">{formatDate(v.visitDate)}</div>
                      <div className="text-[13px] font-semibold text-[#1F2937] mt-0.5">
                        {v.currentWeightKg} kg{' '}
                        <span className="text-[#1178D4]">+{v.weightGainKg} kg</span>
                      </div>
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verifikasi TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Verifikasi di browser**

Login sebagai `andi.pratama`, buka tab "Progres". Pastikan:
- Section "Profil IMT" tampil dengan BB 52 kg, Tinggi 158 cm, IMT 20.83, Kategori "Normal", Target 11,3–15,9 kg
- Section "Kunjungan Terakhir" tampil data 2 Jun 2026: BB 60,5 kg, +8,5 kg, badge "Sesuai Target"
- LILA 25,1 cm (Normal), Hb 11,8 g/dL (Normal)
- Grafik BB tampil dengan 4 titik kunjungan — titik kunjungan 5 Mei berwarna kuning (isOnTrack: false), sisanya hijau
- Zona target (hijau muda) terlihat di antara ~63,3 kg dan ~67,9 kg (52 + 11,3 dan 52 + 15,9)
- Riwayat Kunjungan tampil 4 kartu, terbaru di atas

- [ ] **Step 4: Commit**

```bash
git add app/ibu/status/page.tsx
git commit -m "feat: rewrite status page as Perkembangan BB with IMT profile, visit data, chart, and history"
```

---

## Selesai

Semua task selesai. Halaman ibu yang berubah:
- `/ibu/dashboard` — BB card dengan target IOM, risk bar dinamis, 1 kartu status aktif
- `/ibu/status` → "Perkembangan BB" — 4 section read-only: IMT profile, kunjungan terakhir, grafik, riwayat
- Bottom nav — tab "Progres" menggantikan "Status Risiko"
