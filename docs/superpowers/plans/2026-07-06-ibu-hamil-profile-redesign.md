# Ibu Hamil Profile Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the pregnant-mother (`isHamil === true`) view of `app/kader/ibu/[id]/page.tsx` to follow the hero-header + stat-tile + nested-table pattern already used on the child profile page, per the approved spec at `docs/superpowers/specs/2026-07-06-ibu-hamil-profile-redesign-design.md`.

**Architecture:** Two small Prisma/schema-and-action tasks unblock the data the new UI needs (`Ibu.isActive`, `PregnancyVisit.kaderId`), then one UI task rewrites `app/kader/ibu/[id]/page.tsx` in place — replacing the old two-card identity/status row + weight chart + bottom grid with a hero card and a new `Kehamilan Aktif` / `Anak Terdaftar` / `Akun Aplikasi Ibu` layout, gated behind `ibu.isHamil`. The non-pregnant branch is untouched except for swapping to the shared `StatusBadge` component.

**Tech Stack:** Next.js 16 (App Router, client components), Prisma 7 + PostgreSQL (schema synced via `prisma db push`, no migrations folder in this repo), Tailwind v4, shadcn/ui primitives, TypeScript 5. No test runner is configured (no Jest/Vitest) — verification is `npx tsc --noEmit`, `npm run lint`, and manual dev-server checks, matching how prior UI work in this repo was verified.

## Global Constraints

- All UI copy is Indonesian, matching existing pages.
- Color tokens: navy `#173753`, accent `#52A9E3`, new purple `#6A48C4` / bg `#F0EBFB` for the "Ibu Hamil" identity.
- Card shell convention: `ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl border-none overflow-hidden py-0 gap-0`, header padding `px-5 pt-[18px]`, content padding `px-5 pb-[18px]` (copied from `app/kader/anak/[id]/page.tsx`).
- Prisma schema changes are applied with `npx prisma db push` (this repo has no `prisma/migrations` folder — do not run `prisma migrate dev`).
- **Akhiri Kehamilan**, **Edit Data**, the **⋮** menu, and **Reset Password** are UI stubs (no `onClick`/handler) — do not wire real behavior for them in this plan.
- Do not modify the non-pregnant (`ibu.isHamil === false`) branch's layout or the `catat-kunjungan` page/flow, beyond the mechanical `StatusBadge` swap described in Task 3.

---

### Task 1: Add `isActive` to `Ibu` and `kaderId` to `PregnancyVisit`

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `Ibu.isActive: boolean` (default `true`), `PregnancyVisit.kaderId: string | null`, `PregnancyVisit.kader: { nama: string } | null` (via relation), `Kader.pregnancyVisits: PregnancyVisit[]` back-relation. These are consumed by Task 2 and Task 3.

- [ ] **Step 1: Add `isActive` to the `Ibu` model**

In `prisma/schema.prisma`, find:

```prisma
model Ibu {
  id          String   @id @default(cuid())
  nama        String
  username    String   @unique
  password    String
  noHp        String?
  tanggalLahir DateTime?
  alamat      String?
  isHamil     Boolean   @default(false)
  posyanduId  String
  createdAt   DateTime @default(now())

  posyandu          Posyandu         @relation(fields: [posyanduId], references: [id])
  anaks             Anak[]
  skrinings         SkriningShamil[]
  pregnancyProfile  PregnancyProfile?
  pregnancyVisits   PregnancyVisit[]
  dailyTasks        DailyTask[]
}
```

Replace with:

```prisma
model Ibu {
  id          String   @id @default(cuid())
  nama        String
  username    String   @unique
  password    String
  noHp        String?
  tanggalLahir DateTime?
  alamat      String?
  isHamil     Boolean   @default(false)
  isActive    Boolean   @default(true)
  posyanduId  String
  createdAt   DateTime @default(now())

  posyandu          Posyandu         @relation(fields: [posyanduId], references: [id])
  anaks             Anak[]
  skrinings         SkriningShamil[]
  pregnancyProfile  PregnancyProfile?
  pregnancyVisits   PregnancyVisit[]
  dailyTasks        DailyTask[]
}
```

- [ ] **Step 2: Add the `kaderId`/`kader` relation to `PregnancyVisit`, and the back-relation on `Kader`**

Find:

```prisma
model Kader {
  id         String   @id @default(cuid())
  nama       String
  username   String   @unique
  password   String
  posyanduId String
  createdAt  DateTime @default(now())

  posyandu    Posyandu         @relation(fields: [posyanduId], references: [id])
  pengukurans Pengukuran[]
  skrinings   SkriningShamil[]
}
```

Replace with:

```prisma
model Kader {
  id         String   @id @default(cuid())
  nama       String
  username   String   @unique
  password   String
  posyanduId String
  createdAt  DateTime @default(now())

  posyandu        Posyandu         @relation(fields: [posyanduId], references: [id])
  pengukurans     Pengukuran[]
  skrinings       SkriningShamil[]
  pregnancyVisits PregnancyVisit[]
}
```

Find:

```prisma
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

Replace with:

```prisma
model PregnancyVisit {
  id              String   @id @default(cuid())
  ibuId           String
  ibu             Ibu      @relation(fields: [ibuId], references: [id], onDelete: Cascade)
  kaderId         String?
  kader           Kader?   @relation(fields: [kaderId], references: [id])
  visitDate       DateTime
  currentWeightKg Float
  weightGainKg    Float
  lilaCm          Float
  hbGdl           Float
  isOnTrack       Boolean
  createdAt       DateTime @default(now())
}
```

- [ ] **Step 3: Validate and push the schema**

Run:

```bash
npx prisma format
npx prisma validate
npx prisma db push
```

Expected: all three commands exit 0. `prisma db push` prints `Your database is now in sync with your Prisma schema` and regenerates the Prisma client.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add Ibu.isActive and PregnancyVisit.kaderId to schema"
```

---

### Task 2: Wire `kaderId` into visit recording and expose it on `getIbuById`

**Files:**
- Modify: `lib/actions/pregnancy.ts:106-116`
- Modify: `lib/actions/kader.ts:704-708`

**Interfaces:**
- Consumes: `Task 1`'s `PregnancyVisit.kaderId` / `.kader` relation.
- Produces: `getIbuById(id).pregnancyVisits[].kader: { nama: string } | null`, consumed by Task 3's history table.

- [ ] **Step 1: Set `kaderId` when a kader records a pregnancy visit**

In `lib/actions/pregnancy.ts`, find:

```typescript
  const result = await prisma.pregnancyVisit.create({
    data: {
      ibuId: data.ibuId,
      visitDate: new Date(),
      currentWeightKg: data.currentWeightKg,
      weightGainKg: weightGainKg,
      lilaCm: data.lilaCm,
      hbGdl: data.hbGdl,
      isOnTrack: isOnTrack,
    }
  })
```

Replace with:

```typescript
  const result = await prisma.pregnancyVisit.create({
    data: {
      ibuId: data.ibuId,
      kaderId: session.user.id!,
      visitDate: new Date(),
      currentWeightKg: data.currentWeightKg,
      weightGainKg: weightGainKg,
      lilaCm: data.lilaCm,
      hbGdl: data.hbGdl,
      isOnTrack: isOnTrack,
    }
  })
```

- [ ] **Step 2: Include the recorder's name in `getIbuById`**

In `lib/actions/kader.ts`, find:

```typescript
      pregnancyProfile: true,
      pregnancyVisits: {
        orderBy: { visitDate: "asc" },
      },
      skrinings: {
        orderBy: { tanggal: "desc" },
      },
```

Replace with:

```typescript
      pregnancyProfile: true,
      pregnancyVisits: {
        orderBy: { visitDate: "asc" },
        include: { kader: { select: { nama: true } } },
      },
      skrinings: {
        orderBy: { tanggal: "desc" },
      },
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/pregnancy.ts lib/actions/kader.ts
git commit -m "feat: record and expose which kader logged each pregnancy visit"
```

---

### Task 3: Add `Aktif` / `Non-aktif` to the shared status style map

**Files:**
- Modify: `lib/status-styles.ts`

**Interfaces:**
- Produces: `getStatusStyle("Aktif")` and `getStatusStyle("Non-aktif")` resolve to real colors instead of the gray `Default` fallback. Consumed by Task 4's "Akun Aplikasi Ibu" card.

- [ ] **Step 1: Add the two status keys**

In `lib/status-styles.ts`, find:

```typescript
export const statusMap: Record<string, StatusStyle> = {
  Normal:          { bg: "#E6F4EA", text: "#1E8E3E", dot: "#1E8E3E", border: "#DCFCE7" },
  Stunting:        { bg: "#FCE8E6", text: "#D93025", dot: "#D93025", border: "#FEE2E2" },
  "Stunting Berat": { bg: "#FCE8E6", text: "#D93025", dot: "#D93025", border: "#FEE2E2" },
  "Risiko Stunting": { bg: "#FFF4E5", text: "#B06000", dot: "#B06000", border: "#FEF3C7" },
  "Gizi Kurang":   { bg: "#F3E8FD", text: "#8E24AA", dot: "#8E24AA", border: "#E9D5FF" },
  Buruk:           { bg: "#FCE8E6", text: "#D93025", dot: "#D93025", border: "#FEE2E2" },
  Aman:            { bg: "#E6F4EA", text: "#1E8E3E", dot: "#1E8E3E", border: "#DCFCE7" },
  Waspada:         { bg: "#FFF4E5", text: "#B06000", dot: "#B06000", border: "#FEF3C7" },
  Bahaya:          { bg: "#FCE8E6", text: "#D93025", dot: "#D93025", border: "#FEE2E2" },
  Default:         { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF", border: "#E5E7EB" },
}
```

Replace with:

```typescript
export const statusMap: Record<string, StatusStyle> = {
  Normal:          { bg: "#E6F4EA", text: "#1E8E3E", dot: "#1E8E3E", border: "#DCFCE7" },
  Stunting:        { bg: "#FCE8E6", text: "#D93025", dot: "#D93025", border: "#FEE2E2" },
  "Stunting Berat": { bg: "#FCE8E6", text: "#D93025", dot: "#D93025", border: "#FEE2E2" },
  "Risiko Stunting": { bg: "#FFF4E5", text: "#B06000", dot: "#B06000", border: "#FEF3C7" },
  "Gizi Kurang":   { bg: "#F3E8FD", text: "#8E24AA", dot: "#8E24AA", border: "#E9D5FF" },
  Buruk:           { bg: "#FCE8E6", text: "#D93025", dot: "#D93025", border: "#FEE2E2" },
  Aman:            { bg: "#E6F4EA", text: "#1E8E3E", dot: "#1E8E3E", border: "#DCFCE7" },
  Waspada:         { bg: "#FFF4E5", text: "#B06000", dot: "#B06000", border: "#FEF3C7" },
  Bahaya:          { bg: "#FCE8E6", text: "#D93025", dot: "#D93025", border: "#FEE2E2" },
  Aktif:           { bg: "#E6F4EA", text: "#1E8E3E", dot: "#1E8E3E", border: "#DCFCE7" },
  "Non-aktif":     { bg: "#FCE8E6", text: "#D93025", dot: "#D93025", border: "#FEE2E2" },
  Default:         { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF", border: "#E5E7EB" },
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/status-styles.ts
git commit -m "feat: add Aktif/Non-aktif status colors"
```

---

### Task 4: Rebuild the pregnant-mother branch of the ibu profile page

**Files:**
- Modify: `app/kader/ibu/[id]/page.tsx`

**Interfaces:**
- Consumes: `getIbuById` return type (includes `isActive`, `pregnancyVisits[].kader.nama` from Tasks 1-2), `StatusBadge` from `@/components/status-badge` (consumes `status: string`), `calculateGestationalAge`/`calculateHPL` from `@/lib/pregnancy-utils`.
- Produces: no exports consumed elsewhere — this is a leaf page component.

- [ ] **Step 1: Clean up imports — drop the growth-chart and now-unused icon imports, add the shared `StatusBadge`**

Find:

```typescript
import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ChevronRight,
  Plus,
  Search,
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
import { NotificationBell } from "@/components/kader/notification-bell"

import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
} from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
```

Replace with:

```typescript
import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ChevronRight,
  Plus,
  Search,
  LogOut,
  TriangleAlert,
  Clock,
  ChevronDown,
  Baby,
  User,
  Calendar,
  Phone,
  MapPin,
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
import { calculateGestationalAge, calculateHPL } from "@/lib/pregnancy-utils"
import { NotificationBell } from "@/components/kader/notification-bell"
import { StatusBadge } from "@/components/status-badge"
```

- [ ] **Step 2: Remove the local `StatusBadge` component (replaced by the shared one) and the now-unused `PINK` chart color**

Find:

```typescript
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
```

Replace with:

```typescript
// ============ DESIGN TOKENS ============
const NAVY = "#173753"
const ACCENT = "#52A9E3"
const PURPLE = "#6A48C4"
const PURPLE_BG = "#F0EBFB"

// ============ MAIN PAGE ============
```

- [ ] **Step 3: Replace the chart-only computed values with the values the new pregnant branch needs**

Find:

```typescript
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
```

Replace with:

```typescript
  const initial = ibu.nama.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()

  // Calculate age
  const birthDate = ibu.tanggalLahir ? new Date(ibu.tanggalLahir) : null
  const age = birthDate ? Math.floor((new Date().getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null

  const hphtDate = ibu.pregnancyProfile?.hpht ? new Date(ibu.pregnancyProfile.hpht) : null
  const visits = ibu.pregnancyVisits ?? []
  const latestVisit = visits.length > 0 ? visits[visits.length - 1] : null
  const previousVisit = visits.length > 1 ? visits[visits.length - 2] : null
  const visitsDesc = [...visits].reverse()

  const gestationalAge = hphtDate ? calculateGestationalAge(hphtDate) : null
  const hpl = hphtDate ? calculateHPL(hphtDate) : null
  const trimester = gestationalAge == null ? null : gestationalAge <= 13 ? 1 : gestationalAge <= 27 ? 2 : 3
  const deltaBB = latestVisit && previousVisit
    ? +(latestVisit.currentWeightKg - previousVisit.currentWeightKg).toFixed(1)
    : null
  const overallStatus = latestVisit ? (latestVisit.isOnTrack ? "Normal" : "Waspada") : "Normal"
```

- [ ] **Step 4: Hide the top-row "Daftarkan Anak Baru"/"Catat Kunjungan" buttons for pregnant mothers and open the `isHamil` branch**

Find:

```typescript
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
```

Replace with:

```typescript
          <div className="flex items-center gap-3">
            {!ibu.isHamil && (
              <Link href={`/kader/ibu/${id}/tambah-anak`}>
                <Button
                  className="gap-1.5 text-xs h-9 px-4 rounded-[50px] text-white shadow-[0_4px_12px_rgba(82,169,227,0.3)] hover:opacity-90 transition-opacity"
                  style={{ background: `linear-gradient(to right, ${ACCENT}, #93D1F7)` }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Daftarkan Anak Baru
                </Button>
              </Link>
            )}

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

        {ibu.isHamil ? (
          <>
            {/* Hero Card */}
            <div className="bg-white rounded-2xl shadow-[2px_2px_8px_rgba(0,0,0,0.08)] px-6 py-5 flex items-center gap-5">
              <div
                className="h-[52px] w-[52px] rounded-full flex items-center justify-center text-[18px] font-bold flex-shrink-0"
                style={{ background: PURPLE_BG, color: PURPLE }}
              >
                {initial}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[15px] font-semibold text-[#173753] leading-tight">{ibu.nama}</span>
                  <span
                    className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-tight"
                    style={{ background: PURPLE_BG, color: PURPLE }}
                  >
                    Ibu Hamil
                  </span>
                  <StatusBadge status={overallStatus} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  No. Hp: {ibu.noHp || "—"} · Akun: {ibu.username}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Link href={`/kader/ibu/${id}/catat-kunjungan`}>
                  <Button
                    className="gap-1.5 text-xs h-9 px-4 rounded-[50px] text-white shadow-[0_4px_12px_rgba(82,169,227,0.3)] hover:opacity-90 transition-opacity"
                    style={{ background: `linear-gradient(to right, ${ACCENT}, #93D1F7)` }}
                  >
                    Periksa Kehamilan
                  </Button>
                </Link>

                <Button
                  variant="ghost"
                  className="gap-1.5 text-xs h-9 px-4 rounded-[50px] text-[#52A9E3] border border-[#52A9E3]/40 bg-[#52A9E3]/5 hover:bg-[#52A9E3]/10 hover:border-[#52A9E3]/60 transition-all"
                >
                  Edit Data
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full bg-gray-100 hover:bg-gray-200 text-[#173753] transition-colors flex-shrink-0"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="8" cy="3" r="1.5" />
                    <circle cx="8" cy="8" r="1.5" />
                    <circle cx="8" cy="13" r="1.5" />
                  </svg>
                </Button>
              </div>
            </div>

            {/* Kehamilan Aktif + Anak Terdaftar (left) / Akun Aplikasi Ibu (right) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 space-y-6">
                <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl border-none overflow-hidden py-0 gap-0">
                  <CardHeader className="px-5 pt-[18px] pb-3 flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-2.5">
                      <CardTitle className="text-[16px] font-semibold text-[#173753] leading-tight">Kehamilan Aktif</CardTitle>
                      {trimester != null && (
                        <span
                          className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-tight"
                          style={{ background: PURPLE_BG, color: PURPLE }}
                        >
                          Trimester {trimester}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="text-xs font-semibold text-[#D93025] border border-[#D93025]/40 bg-transparent hover:bg-[#D93025]/5 rounded-[50px] h-8 px-3.5 transition-colors"
                    >
                      Akhiri Kehamilan
                    </button>
                  </CardHeader>

                  <CardContent className="px-5 pb-5 space-y-5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        {
                          label: "USIA KANDUNGAN",
                          value: gestationalAge != null ? `${gestationalAge} mgg` : "—",
                          sub: hpl ? `HPL ${hpl.getDate()} ${MONTHS_ID[hpl.getMonth()]} ${hpl.getFullYear()}` : null,
                          subColor: "text-muted-foreground",
                        },
                        {
                          label: "BB TERAKHIR",
                          value: latestVisit ? `${latestVisit.currentWeightKg.toFixed(1).replace(".", ",")} kg` : "—",
                          delta: deltaBB,
                          deltaUnit: "kg",
                        },
                        {
                          label: "LILA",
                          value: latestVisit ? `${latestVisit.lilaCm.toFixed(1).replace(".", ",")} cm` : "—",
                          sub: latestVisit ? (latestVisit.lilaCm >= 23.5 ? "Normal (≥ 23,5)" : "Perlu Perhatian (< 23,5)") : null,
                          subColor: latestVisit ? (latestVisit.lilaCm >= 23.5 ? "text-[#15803D]" : "text-[#D93025]") : "",
                        },
                        {
                          label: "HEMOGLOBIN",
                          value: latestVisit ? `${latestVisit.hbGdl.toFixed(1).replace(".", ",")} g/dL` : "—",
                          sub: latestVisit ? (latestVisit.hbGdl >= 11 ? "Normal (≥ 11)" : "Perlu Perhatian (< 11)") : null,
                          subColor: latestVisit ? (latestVisit.hbGdl >= 11 ? "text-[#15803D]" : "text-[#D93025]") : "",
                        },
                      ].map((s) => (
                        <div key={s.label} className="bg-white rounded-2xl shadow-[2px_2px_8px_rgba(0,0,0,0.08)] py-3.5 px-4">
                          <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">{s.label}</p>
                          <p className="text-[20px] font-bold text-[#173753] leading-none">{s.value}</p>
                          {s.delta != null ? (
                            <p className={cn("text-[10px] mt-1.5 font-semibold whitespace-nowrap", s.delta >= 0 ? "text-[#15803D]" : "text-[#D93025]")}>
                              {s.delta >= 0 ? "▲" : "▼"} {s.delta >= 0 ? "+" : ""}{s.delta.toFixed(1).replace(".", ",")} {s.deltaUnit}
                            </p>
                          ) : s.sub ? (
                            <p className={cn("text-[10px] mt-1.5 font-medium whitespace-nowrap", s.subColor)}>{s.sub}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-[#E8E8E8]">
                          <TableHead className="text-[14px] text-[#173753] font-medium pl-2">Tanggal</TableHead>
                          <TableHead className="text-[14px] text-[#173753] font-medium">BB</TableHead>
                          <TableHead className="text-[14px] text-[#173753] font-medium">LILA</TableHead>
                          <TableHead className="text-[14px] text-[#173753] font-medium">Hb</TableHead>
                          <TableHead className="text-[14px] text-[#173753] font-medium">Status</TableHead>
                          <TableHead className="text-[14px] text-[#173753] font-medium">Kader</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visitsDesc.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-slate-400 font-semibold italic">
                              Belum ada riwayat kunjungan tercatat
                            </TableCell>
                          </TableRow>
                        ) : (
                          visitsDesc.map((v) => (
                            <TableRow key={v.id} className="border-b border-[#F0F0F0] hover:bg-[#F7FBFF] transition-colors">
                              <TableCell className="text-[14px] text-[#173753] pl-2">
                                {new Date(v.visitDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                              </TableCell>
                              <TableCell className="text-[14px] text-[#173753]">{v.currentWeightKg.toFixed(1).replace(".", ",")} kg</TableCell>
                              <TableCell className="text-[14px] text-[#173753]">{v.lilaCm.toFixed(1).replace(".", ",")} cm</TableCell>
                              <TableCell className="text-[14px] text-[#173753]">{v.hbGdl.toFixed(1).replace(".", ",")}</TableCell>
                              <TableCell>
                                <StatusBadge status={v.isOnTrack ? "Normal" : "Waspada"} />
                              </TableCell>
                              <TableCell className="text-[14px] text-muted-foreground">{v.kader?.nama ?? "—"}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl border-none overflow-hidden py-0 gap-0">
                  <CardHeader className="px-5 pt-[18px] pb-3 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-[16px] font-semibold text-[#173753] leading-tight">Anak Terdaftar</CardTitle>
                    <Link
                      href={`/kader/ibu/${id}/tambah-anak`}
                      className="text-[11px] font-semibold text-[#52A9E3] hover:text-[#3d8dc9] transition-colors"
                    >
                      + Tambah Anak
                    </Link>
                  </CardHeader>
                  <CardContent className="pt-3 px-5 pb-[18px]">
                    {ibu.anaks.length === 0 ? (
                      <div className="text-center py-4">
                        <Baby className="w-6 h-6 text-gray-300 mx-auto mb-1.5" />
                        <p className="text-[12px] text-muted-foreground">Belum ada anak terdaftar</p>
                      </div>
                    ) : (
                      <div className="space-y-1 -mx-1">
                        {ibu.anaks.map((anak) => {
                          const last = anak.pengukurans[0]
                          const birth = new Date(anak.tanggalLahir)
                          const ageMonths = (new Date().getFullYear() - birth.getFullYear()) * 12 + (new Date().getMonth() - birth.getMonth())

                          return (
                            <Link
                              key={anak.id}
                              href={`/kader/anak/${anak.id}`}
                              className="flex items-center gap-3 px-1 py-2 rounded-lg hover:bg-[#F7FBFF] transition-colors"
                            >
                              <div
                                className={cn(
                                  "h-9 w-9 rounded-xl flex items-center justify-center text-[12px] font-bold text-white shrink-0",
                                  anak.jenisKelamin === "L" ? "bg-[#378ADD]" : "bg-[#E879A0]"
                                )}
                              >
                                {anak.nama[0]}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-medium text-[#173753] truncate">{anak.nama}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {anak.jenisKelamin} · {ageMonths} bln · {last?.statusTBU || "Normal"}
                                </p>
                              </div>
                              <span className="text-[11px] font-medium text-[#52A9E3] flex items-center gap-0.5 flex-shrink-0">
                                Lihat <ChevronRight className="w-3 h-3" />
                              </span>
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)] bg-white rounded-xl border-none overflow-hidden py-0 gap-0">
                  <CardHeader className="px-5 pt-[18px]">
                    <CardTitle className="text-[16px] font-semibold text-[#173753] leading-tight">Akun Aplikasi Ibu</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3 px-5 pb-[18px] space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[12px] text-slate-500 font-medium">Username</span>
                      <span className="text-[13px] font-bold text-[#173753]">{ibu.username}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[12px] text-slate-500 font-medium">Status</span>
                      <StatusBadge status={ibu.isActive ? "Aktif" : "Non-aktif"} />
                    </div>
                    <button
                      type="button"
                      className="w-full text-center px-3 py-2 rounded-lg bg-[#F7FBFF] hover:bg-[#EBF2F8] transition-colors text-[13px] font-medium text-[#173753] mt-2"
                    >
                      Reset Password
                    </button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        ) : (
          <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Left: Identity */}
```

- [ ] **Step 5: Close the `else` branch after the old bottom grid, and remove the now-orphaned growth chart block**

Find:

```typescript
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
```

Replace with:

```typescript
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Children List */}
```

- [ ] **Step 6: Fix the two `StatusBadge` calls in the unchanged non-pregnant branch that used the old `type` prop, and close the `else` branch**

Find:

```typescript
                        <TableCell className="pr-4">
                          <StatusBadge status={v.isOnTrack ? "Aman" : "Waspada"} type="risk" />
                        </TableCell>
```

Replace with:

```typescript
                        <TableCell className="pr-4">
                          <StatusBadge status={v.isOnTrack ? "Aman" : "Waspada"} />
                        </TableCell>
```

Find:

```typescript
                        <TableCell className="pr-4">
                          <StatusBadge status={s.kategori} type="risk" />
                        </TableCell>
```

Replace with:

```typescript
                        <TableCell className="pr-4">
                          <StatusBadge status={s.kategori} />
                        </TableCell>
```

Find the final closing of the page's outer content `div` and `return`:

```typescript
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

Replace with:

```typescript
              </Table>
            </CardContent>
          </Card>
        </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. If JSX-nesting errors appear, re-check that every `{ibu.isHamil ? ( <> ... </> ) : ( <> ... </> )}` fragment is balanced — the two edits in Step 4 and Step 6 open/close this same conditional.

- [ ] **Step 8: Lint**

Run: `npm run lint`
Expected: no errors (warnings about pre-existing code are acceptable, but no new errors from this file).

- [ ] **Step 9: Manual verification**

Run: `npm run dev`, then in a browser:
1. Open the profile page for a mother with `isHamil = true` and at least one `PregnancyVisit` (use an existing seeded record, e.g. from `prisma/seed-trimester1.mjs`). Confirm: hero card shows purple avatar/badge, correct trimester badge, 4 stat tiles with real numbers, history table with a `Kader` column populated (once at least one visit was recorded after Task 2 lands), Anak Terdaftar list, and Akun Aplikasi Ibu card showing username + Aktif badge.
2. Open the profile page for a mother with `isHamil = false`. Confirm the page renders the old identity/status/children/skrining layout unchanged, with badges still colored correctly (Normal/Stunting/Aman/Waspada/Bahaya).
3. Confirm no console errors in the browser dev tools on either page.

- [ ] **Step 10: Commit**

```bash
git add app/kader/ibu/\[id\]/page.tsx
git commit -m "feat(ibu): redesign pregnant-mother profile page with hero header and Kehamilan Aktif card"
```

## Self-Review Notes

- **Spec coverage:** Hero header (Task 4 Step 4), Kehamilan Aktif card with 4 stat tiles + history table incl. Kader column (Task 4 Step 4, backed by Tasks 1-2), Anak Terdaftar card (Task 4 Step 4), Akun Aplikasi Ibu card with Username/Status/Reset Password (Task 4 Step 4, backed by Task 1's `isActive` + Task 3's status colors) — all covered. Stubs for Akhiri Kehamilan/Edit Data/⋮/Reset Password are explicitly non-functional per the approved spec.
- **Type consistency:** `visits`, `latestVisit`, `previousVisit`, `visitsDesc`, `gestationalAge`, `hpl`, `trimester`, `deltaBB`, `overallStatus` are each defined once (Task 4 Step 3) and used consistently by name in Step 4's JSX. `StatusBadge` signature (`status: string`) matches every call site after Step 6 removes the stray `type` props.
- **Scope:** Confined to one page, one server-action file pair, one schema file, one style-map file — no unrelated refactors.
