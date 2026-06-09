# Daftar Pasien Tab Per Kategori — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor halaman `/kader/rekap` agar menampilkan tiga tab — Anak, Ibu Hamil, dan Ibu — masing-masing dengan kolom dan filter yang relevan.

**Architecture:** Dua server action baru (`getIbuHamil`, `getIbuBiasa`) ditambahkan ke `lib/actions/kader.ts` mengikuti pola yang sudah ada. Halaman `app/kader/rekap/page.tsx` direfactor dengan state `activeTab` dan tiga conditional table block. Status risiko (Aman/Waspada/Bahaya) ditambahkan ke `lib/status-styles.ts` agar `StatusBadge` yang ada bisa dipakai ulang.

**Tech Stack:** Next.js (App Router), TypeScript, Prisma ORM, Tailwind CSS, shadcn/ui (Table, Select), Lucide icons, `@/auth` untuk session.

---

## File Map

| File | Aksi | Tanggung Jawab |
|---|---|---|
| `lib/status-styles.ts` | Modify | Tambah entries Aman / Waspada / Bahaya ke `statusMap` |
| `lib/actions/kader.ts` | Modify | Tambah `getIbuHamil()` dan `getIbuBiasa()` |
| `app/kader/rekap/page.tsx` | Modify | Refactor ke tab UI — state, tab bar, 3 tabel, filter, footer |

---

## Task 1: Tambah status risiko ke `lib/status-styles.ts`

**Files:**
- Modify: `lib/status-styles.ts`

- [ ] **Step 1: Tambah tiga entries ke `statusMap`**

Buka `lib/status-styles.ts`. Temukan objek `statusMap` dan tambahkan tiga baris baru setelah entry `Buruk`:

```ts
Aman:    { bg: "#E6F4EA", text: "#1E8E3E", dot: "#1E8E3E", border: "#DCFCE7" },
Waspada: { bg: "#FFF4E5", text: "#B06000", dot: "#B06000", border: "#FEF3C7" },
Bahaya:  { bg: "#FCE8E6", text: "#D93025", dot: "#D93025", border: "#FEE2E2" },
```

Hasil `statusMap` setelah edit:
```ts
export const statusMap: Record<string, StatusStyle> = {
  Normal:            { bg: "#E6F4EA", text: "#1E8E3E", dot: "#1E8E3E", border: "#DCFCE7" },
  Stunting:          { bg: "#FCE8E6", text: "#D93025", dot: "#D93025", border: "#FEE2E2" },
  "Stunting Berat":  { bg: "#FCE8E6", text: "#D93025", dot: "#D93025", border: "#FEE2E2" },
  "Risiko Stunting": { bg: "#FFF4E5", text: "#B06000", dot: "#B06000", border: "#FEF3C7" },
  "Gizi Kurang":     { bg: "#F3E8FD", text: "#8E24AA", dot: "#8E24AA", border: "#E9D5FF" },
  Buruk:             { bg: "#FCE8E6", text: "#D93025", dot: "#D93025", border: "#FEE2E2" },
  Aman:              { bg: "#E6F4EA", text: "#1E8E3E", dot: "#1E8E3E", border: "#DCFCE7" },
  Waspada:           { bg: "#FFF4E5", text: "#B06000", dot: "#B06000", border: "#FEF3C7" },
  Bahaya:            { bg: "#FCE8E6", text: "#D93025", dot: "#D93025", border: "#FEE2E2" },
  Default:           { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF", border: "#E5E7EB" },
}
```

- [ ] **Step 2: Cek TypeScript**

```powershell
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```powershell
git add lib/status-styles.ts
git commit -m "feat: add Aman/Waspada/Bahaya to statusMap for risk badge support"
```

---

## Task 2: Tambah `getIbuHamil()` ke `lib/actions/kader.ts`

**Files:**
- Modify: `lib/actions/kader.ts`

- [ ] **Step 1: Tambah fungsi di akhir file**

Append ke bawah `lib/actions/kader.ts`:

```ts
export async function getIbuHamil() {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

  const list = await prisma.ibu.findMany({
    where: { posyanduId: session.user.posyanduId, isHamil: true },
    include: {
      pregnancyProfile: { select: { hpht: true } },
      pregnancyVisits: {
        orderBy: { visitDate: "desc" },
        take: 1,
        select: { visitDate: true, currentWeightKg: true },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  const now = new Date()

  return list.map((ibu, i) => {
    const hpht = ibu.pregnancyProfile?.hpht ? new Date(ibu.pregnancyProfile.hpht) : null
    const diffDays = hpht ? Math.floor((now.getTime() - hpht.getTime()) / 86_400_000) : null
    const weeks = diffDays !== null ? Math.floor(diffDays / 7) : null
    const trimester: 1 | 2 | 3 | null =
      weeks === null ? null : weeks < 14 ? 1 : weeks < 28 ? 2 : 3

    const hpl = hpht ? new Date(hpht.getTime() + 280 * 86_400_000) : null
    const hplStr = hpl
      ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(hpl)
      : "—"

    const visit = ibu.pregnancyVisits[0] ?? null
    const sudahKunjungan = visit
      ? new Date(visit.visitDate).getMonth() === now.getMonth() &&
        new Date(visit.visitDate).getFullYear() === now.getFullYear()
      : false

    const birth = ibu.tanggalLahir ? new Date(ibu.tanggalLahir) : null
    const usiaYears = birth
      ? Math.floor((now.getTime() - birth.getTime()) / (365.25 * 86_400_000))
      : null

    return {
      no: i + 1,
      id: ibu.id,
      nama: ibu.nama,
      usia: usiaYears !== null ? `${usiaYears} th` : "—",
      trimester,
      bbSaatIni: visit ? `${visit.currentWeightKg} kg` : "—",
      hpl: hplStr,
      sudahKunjungan,
      lastVisit: visit
        ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(visit.visitDate))
        : "-",
    }
  })
}
```

- [ ] **Step 2: Cek TypeScript**

```powershell
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```powershell
git add lib/actions/kader.ts
git commit -m "feat: add getIbuHamil server action"
```

---

## Task 3: Tambah `getIbuBiasa()` ke `lib/actions/kader.ts`

**Files:**
- Modify: `lib/actions/kader.ts`

- [ ] **Step 1: Tambah fungsi setelah `getIbuHamil()`**

Append ke bawah `lib/actions/kader.ts`:

```ts
export async function getIbuBiasa() {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

  const list = await prisma.ibu.findMany({
    where: { posyanduId: session.user.posyanduId, isHamil: false },
    include: {
      skrinings: {
        orderBy: { tanggal: "desc" },
        take: 1,
        select: { tanggal: true, kategori: true, skorRisiko: true },
      },
      _count: { select: { anaks: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  const now = new Date()

  return list.map((ibu, i) => {
    const skrining = ibu.skrinings[0] ?? null
    const birth = ibu.tanggalLahir ? new Date(ibu.tanggalLahir) : null
    const usiaYears = birth
      ? Math.floor((now.getTime() - birth.getTime()) / (365.25 * 86_400_000))
      : null

    return {
      no: i + 1,
      id: ibu.id,
      nama: ibu.nama,
      usia: usiaYears !== null ? `${usiaYears} th` : "—",
      jumlahAnak: ibu._count.anaks,
      skriningTerakhir: skrining
        ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(skrining.tanggal))
        : "Belum",
      kategoriRisiko: skrining?.kategori ?? null,
    }
  })
}
```

- [ ] **Step 2: Cek TypeScript**

```powershell
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```powershell
git add lib/actions/kader.ts
git commit -m "feat: add getIbuBiasa server action"
```

---

## Task 4: Update `app/kader/rekap/page.tsx` — types, state, imports, data loading

**Files:**
- Modify: `app/kader/rekap/page.tsx`

- [ ] **Step 1: Tambah import actions baru**

Temukan baris import actions yang ada:
```ts
import { getChildren, getDashboardStats } from "@/lib/actions/kader"
```
Ganti dengan:
```ts
import { getChildren, getDashboardStats, getIbuHamil, getIbuBiasa } from "@/lib/actions/kader"
```

- [ ] **Step 2: Tambah tipe baru setelah `type Child`**

Setelah blok `type Child = { ... }`, tambahkan:

```ts
type Tab = "anak" | "ibu-hamil" | "ibu"

type IbuHamilRow = {
  no: number
  id: string
  nama: string
  usia: string
  trimester: 1 | 2 | 3 | null
  bbSaatIni: string
  hpl: string
  sudahKunjungan: boolean
  lastVisit: string
}

type IbuBiasaRow = {
  no: number
  id: string
  nama: string
  usia: string
  jumlahAnak: number
  skriningTerakhir: string
  kategoriRisiko: string | null
}
```

- [ ] **Step 3: Tambah state baru di dalam komponen**

Setelah `const [loading, setLoading] = useState(true)`, tambahkan:

```ts
const [activeTab, setActiveTab] = useState<Tab>("anak")
const [ibuHamil, setIbuHamil] = useState<IbuHamilRow[]>([])
const [ibuBiasa, setIbuBiasa] = useState<IbuBiasaRow[]>([])

// Ibu Hamil filters
const [hamilTrimesterFilter, setHamilTrimesterFilter] = useState("")
const [hamilKunjunganFilter, setHamilKunjunganFilter] = useState("")

// Ibu filters
const [ibuRisikoFilter, setIbuRisikoFilter] = useState("")
```

- [ ] **Step 4: Ganti `useEffect` data loading**

Temukan `useEffect` yang ada:
```ts
useEffect(() => {
  Promise.all([getChildren(), getDashboardStats()]).then(([childData, statData]) => {
    setChildren(childData as Child[])
    setStats(statData)
    setLoading(false)
  })
}, [])
```
Ganti dengan:
```ts
useEffect(() => {
  Promise.all([getChildren(), getDashboardStats(), getIbuHamil(), getIbuBiasa()])
    .then(([childData, statData, hamilData, biasaData]) => {
      setChildren(childData as Child[])
      setStats(statData)
      setIbuHamil(hamilData as IbuHamilRow[])
      setIbuBiasa(biasaData as IbuBiasaRow[])
      setLoading(false)
    })
}, [])
```

- [ ] **Step 5: Tambah memo untuk filtered data ibu**

Setelah blok `const filtered = useMemo(...)` yang sudah ada, tambahkan:

```ts
const filteredHamil = useMemo(() => {
  return ibuHamil.filter((r) => {
    const matchName = r.nama.toLowerCase().includes(query.toLowerCase())
    const matchTrimester =
      !hamilTrimesterFilter || r.trimester === Number(hamilTrimesterFilter)
    const matchKunjungan =
      !hamilKunjunganFilter ||
      (hamilKunjunganFilter === "Sudah" && r.sudahKunjungan) ||
      (hamilKunjunganFilter === "Belum" && !r.sudahKunjungan)
    return matchName && matchTrimester && matchKunjungan
  })
}, [ibuHamil, query, hamilTrimesterFilter, hamilKunjunganFilter])

const filteredBiasa = useMemo(() => {
  return ibuBiasa.filter((r) => {
    const matchName = r.nama.toLowerCase().includes(query.toLowerCase())
    const matchRisiko = !ibuRisikoFilter || r.kategoriRisiko === ibuRisikoFilter
    return matchName && matchRisiko
  })
}, [ibuBiasa, query, ibuRisikoFilter])
```

- [ ] **Step 6: Tambah useEffect reset filter saat ganti tab**

Setelah blok memo di atas, tambahkan:

```ts
useEffect(() => {
  setQuery("")
  setStatusFilter("")
  setCheckFilter("")
  setTempStatus("")
  setTempCheck("")
  setHamilTrimesterFilter("")
  setHamilKunjunganFilter("")
  setIbuRisikoFilter("")
}, [activeTab])
```

- [ ] **Step 7: Cek TypeScript dan page masih load normal**

```powershell
npx tsc --noEmit
```
Jalankan dev server, buka `/kader/rekap` — halaman harus tetap tampil seperti sebelumnya (tab belum ada, tabel Anak masih muncul).

- [ ] **Step 8: Commit**

```powershell
git add app/kader/rekap/page.tsx
git commit -m "refactor: add multi-tab state, types, and data loading to rekap page"
```

---

## Task 5: Tambah Tab Bar UI

**Files:**
- Modify: `app/kader/rekap/page.tsx`

- [ ] **Step 1: Ganti header card dengan tab bar**

Di dalam `<Card>`, temukan blok header ini:
```tsx
<div className="flex items-center gap-3 px-4 pb-3 flex-wrap border-b border-[#F0F0F0]">
  <div className="flex-none">
    <p className="text-[16px] font-semibold text-[#173753] leading-tight">Daftar Pasien</p>
  </div>
</div>
```
Ganti dengan:
```tsx
<div className="flex items-center gap-0 px-4 border-b border-[#F0F0F0]">
  {([
    { key: "anak"      as Tab, label: "Anak",      count: children.length },
    { key: "ibu-hamil" as Tab, label: "Ibu Hamil", count: ibuHamil.length },
    { key: "ibu"       as Tab, label: "Ibu",        count: ibuBiasa.length },
  ]).map(({ key, label, count }) => (
    <button
      key={key}
      onClick={() => setActiveTab(key)}
      className={cn(
        "px-5 py-3.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5",
        activeTab === key
          ? "border-[#52A9E3] text-[#173753]"
          : "border-transparent text-muted-foreground hover:text-[#173753]"
      )}
    >
      {label}
      <span className={cn(
        "text-[11px] px-1.5 py-0.5 rounded-full font-semibold",
        activeTab === key
          ? "bg-[#52A9E3]/10 text-[#52A9E3]"
          : "bg-gray-100 text-gray-500"
      )}>
        {count}
      </span>
    </button>
  ))}
</div>
```

- [ ] **Step 2: Wrap tabel Anak yang ada dalam kondisional**

Temukan `<div className="px-4 pb-1">` yang membungkus `<Table>`, wrap dengan:
```tsx
{activeTab === "anak" && (
  <div className="px-4 pb-1">
    {/* <Table> yang sudah ada, tidak perlu diubah */}
  </div>
)}
```

- [ ] **Step 3: Verifikasi visual**

Buka `/kader/rekap`:
- Tiga tab muncul di atas tabel
- Tab "Anak" aktif by default dan tabel anak tampil
- Klik "Ibu Hamil" dan "Ibu" → tab aktif berubah, tabel kosong (konten belum ditambah)

- [ ] **Step 4: Commit**

```powershell
git add app/kader/rekap/page.tsx
git commit -m "feat: add tab bar to daftar pasien rekap page"
```

---

## Task 6: Ibu Hamil tab — filter bar + tabel + footer

**Files:**
- Modify: `app/kader/rekap/page.tsx`

- [ ] **Step 1: Update filter bar menjadi kondisional per tab**

Temukan blok filter bar yang ada (dimulai `<div className="flex items-center justify-between flex-wrap gap-4">`). Seluruh isi dalamnya perlu dibungkus kondisional. Ganti konten bagian dalam menjadi:

```tsx
{/* Filter Anak */}
{activeTab === "anak" && (
  <div className="flex items-center gap-2 flex-wrap">
    <span className="text-xs font-medium text-muted-foreground">Filter</span>
    <Select value={tempStatus} onValueChange={setTempStatus}>
      <SelectTrigger className="w-fit min-w-[140px] h-8 px-3 rounded-[50px] bg-white shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-xs text-[#173753] border-none focus:ring-0">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Status Gizi:</span>
          <SelectValue placeholder="Semua" />
        </div>
      </SelectTrigger>
      <SelectContent className="rounded-xl border-none shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
        <SelectItem value="" className="text-xs text-[#173753]">Semua</SelectItem>
        <SelectItem value="Normal" className="text-xs text-[#173753]">Normal</SelectItem>
        <SelectItem value="Berisiko" className="text-xs text-[#173753]">Berisiko</SelectItem>
        <SelectItem value="Stunting" className="text-xs text-[#173753]">Stunting</SelectItem>
      </SelectContent>
    </Select>
    <Select value={tempCheck} onValueChange={setTempCheck}>
      <SelectTrigger className="w-fit min-w-[140px] h-8 px-3 rounded-[50px] bg-white shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-xs text-[#173753] border-none focus:ring-0">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Status Periksa:</span>
          <SelectValue placeholder="Semua" />
        </div>
      </SelectTrigger>
      <SelectContent className="rounded-xl border-none shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
        <SelectItem value="" className="text-xs text-[#173753]">Semua</SelectItem>
        <SelectItem value="Sudah Periksa" className="text-xs text-[#173753]">Sudah Periksa</SelectItem>
        <SelectItem value="Belum Periksa" className="text-xs text-[#173753]">Belum Periksa</SelectItem>
      </SelectContent>
    </Select>
    {(isFilterActive || isFilterChanged) && (
      <div className="flex items-center gap-2">
        {isFilterChanged && (
          <button onClick={handleApplyFilters} className="flex items-center gap-1.5 px-4 h-8 rounded-[50px] text-white text-xs font-medium shadow-[2px_2px_8px_rgba(0,0,0,0.08)] hover:opacity-90 transition-opacity" style={{ background: "linear-gradient(to right, #52A9E3, #93D1F7)" }}>
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Terapkan Filter
          </button>
        )}
        {isFilterActive && (
          <button onClick={handleResetFilters} className="flex items-center gap-1.5 px-3 h-8 rounded-[50px] bg-white shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-xs text-[#173753] hover:bg-gray-50">
            <X className="w-3.5 h-3.5" />
            Hapus Filter
          </button>
        )}
      </div>
    )}
  </div>
)}

{/* Filter Ibu Hamil */}
{activeTab === "ibu-hamil" && (
  <div className="flex items-center gap-2 flex-wrap">
    <span className="text-xs font-medium text-muted-foreground">Filter</span>
    <Select value={hamilTrimesterFilter} onValueChange={setHamilTrimesterFilter}>
      <SelectTrigger className="w-fit min-w-[140px] h-8 px-3 rounded-[50px] bg-white shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-xs text-[#173753] border-none focus:ring-0">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Trimester:</span>
          <SelectValue placeholder="Semua" />
        </div>
      </SelectTrigger>
      <SelectContent className="rounded-xl border-none shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
        <SelectItem value="" className="text-xs text-[#173753]">Semua</SelectItem>
        <SelectItem value="1" className="text-xs text-[#173753]">Trimester 1</SelectItem>
        <SelectItem value="2" className="text-xs text-[#173753]">Trimester 2</SelectItem>
        <SelectItem value="3" className="text-xs text-[#173753]">Trimester 3</SelectItem>
      </SelectContent>
    </Select>
    <Select value={hamilKunjunganFilter} onValueChange={setHamilKunjunganFilter}>
      <SelectTrigger className="w-fit min-w-[140px] h-8 px-3 rounded-[50px] bg-white shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-xs text-[#173753] border-none focus:ring-0">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Kunjungan:</span>
          <SelectValue placeholder="Semua" />
        </div>
      </SelectTrigger>
      <SelectContent className="rounded-xl border-none shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
        <SelectItem value="" className="text-xs text-[#173753]">Semua</SelectItem>
        <SelectItem value="Sudah" className="text-xs text-[#173753]">Sudah Kunjungan</SelectItem>
        <SelectItem value="Belum" className="text-xs text-[#173753]">Belum Kunjungan</SelectItem>
      </SelectContent>
    </Select>
  </div>
)}
```

- [ ] **Step 2: Tambah tabel Ibu Hamil**

Setelah blok `{activeTab === "anak" && <div className="px-4 pb-1">...</div>}`, tambahkan:

```tsx
{activeTab === "ibu-hamil" && (
  <div className="px-4 pb-1">
    <Table>
      <TableHeader>
        <TableRow className="border-b border-[#E8E8E8]">
          <TableHead className="text-[14px] text-[#173753] font-medium pl-2 w-10">No</TableHead>
          <TableHead className="text-[14px] text-[#173753] font-medium">Nama</TableHead>
          <TableHead className="text-[14px] text-[#173753] font-medium">Usia</TableHead>
          <TableHead className="text-[14px] text-[#173753] font-medium">Trimester</TableHead>
          <TableHead className="text-[14px] text-[#173753] font-medium">BB Saat Ini</TableHead>
          <TableHead className="text-[14px] text-[#173753] font-medium">HPL</TableHead>
          <TableHead className="text-[14px] text-[#173753] font-medium">Kunjungan Bulan Ini</TableHead>
          <TableHead className="text-[14px] text-[#173753] font-medium">Terakhir Kunjungan</TableHead>
          <TableHead className="text-[14px] text-[#173753] font-medium">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredHamil.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-center py-16">
              <div className="flex flex-col items-center gap-2">
                <Search className="w-8 h-8 text-gray-200" />
                <p className="text-sm font-medium text-muted-foreground">Tidak ada data yang cocok</p>
                <p className="text-xs text-muted-foreground">Coba ubah filter atau kata kunci pencarian</p>
              </div>
            </TableCell>
          </TableRow>
        ) : (
          filteredHamil.map((row) => (
            <TableRow
              key={row.id}
              className={cn(
                "border-b border-[#F0F0F0] transition-colors hover:bg-[#F7FBFF]",
                !row.sudahKunjungan && "bg-amber-50/40"
              )}
            >
              <TableCell className="text-[14px] pl-2 text-[#173753]">{row.no}</TableCell>
              <TableCell className="text-[14px] font-medium text-[#173753]">
                <Link href={`/kader/ibu/${row.id}`} className="hover:text-[#52A9E3] transition-colors">
                  {row.nama}
                </Link>
              </TableCell>
              <TableCell className="text-[14px] text-[#173753]">{row.usia}</TableCell>
              <TableCell>
                {row.trimester !== null ? (
                  <span className={cn(
                    "text-[13px] font-semibold px-2 py-0.5 rounded-full",
                    row.trimester === 1 ? "bg-blue-50 text-blue-600" :
                    row.trimester === 2 ? "bg-purple-50 text-purple-600" :
                                          "bg-pink-50 text-pink-600"
                  )}>
                    T{row.trimester}
                  </span>
                ) : "—"}
              </TableCell>
              <TableCell className="text-[14px] text-[#173753]">{row.bbSaatIni}</TableCell>
              <TableCell className="text-[14px] text-[#173753]">{row.hpl}</TableCell>
              <TableCell>
                {row.sudahKunjungan ? (
                  <span className="text-[14px] font-medium text-green-700 flex items-center gap-1">
                    <CircleCheck className="w-3.5 h-3.5 flex-none" />
                    Sudah
                  </span>
                ) : (
                  <span className="text-[14px] font-medium text-amber-700 flex items-center gap-1">
                    <CircleAlert className="w-3.5 h-3.5 flex-none" />
                    Belum
                  </span>
                )}
              </TableCell>
              <TableCell className="text-[14px] text-[#173753]">{row.lastVisit}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-gray-100 rounded-full">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </div>
)}
```

- [ ] **Step 3: Ganti footer yang ada menjadi kondisional Anak + tambah footer Ibu Hamil**

Temukan footer block `{filtered.length > 0 && (...)}` dan ganti seluruhnya dengan:

```tsx
{activeTab === "anak" && filtered.length > 0 && (
  <div className="px-4 py-2.5 border-t border-[#F0F0F0] flex items-center justify-between">
    <p className="text-xs text-muted-foreground">
      Menampilkan <span className="font-medium text-[#173753]">{filtered.length}</span> dari{" "}
      <span className="font-medium text-[#173753]">{children.length}</span> data
    </p>
    <div className="flex items-center gap-1">
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
        <CircleCheck className="w-2.5 h-2.5" />
        {filtered.filter(c => c.sudah).length} sudah
      </span>
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
        <CircleAlert className="w-2.5 h-2.5" />
        {filtered.filter(c => !c.sudah).length} belum
      </span>
      {filtered.filter(c => c.status === "Stunting").length > 0 && (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
          <Activity className="w-2.5 h-2.5" />
          {filtered.filter(c => c.status === "Stunting").length} stunting
        </span>
      )}
    </div>
  </div>
)}

{activeTab === "ibu-hamil" && filteredHamil.length > 0 && (
  <div className="px-4 py-2.5 border-t border-[#F0F0F0] flex items-center justify-between">
    <p className="text-xs text-muted-foreground">
      Menampilkan <span className="font-medium text-[#173753]">{filteredHamil.length}</span> dari{" "}
      <span className="font-medium text-[#173753]">{ibuHamil.length}</span> data
    </p>
    <div className="flex items-center gap-1">
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
        <CircleCheck className="w-2.5 h-2.5" />
        {filteredHamil.filter(r => r.sudahKunjungan).length} sudah kunjungan
      </span>
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
        <CircleAlert className="w-2.5 h-2.5" />
        {filteredHamil.filter(r => !r.sudahKunjungan).length} belum kunjungan
      </span>
    </div>
  </div>
)}
```

- [ ] **Step 4: Verifikasi tab Ibu Hamil**

Buka `/kader/rekap` → klik tab "Ibu Hamil":
- Tabel dengan 9 kolom tampil
- Filter Trimester dan Kunjungan muncul di filter bar
- Row highlight amber jika belum kunjungan
- Klik nama → navigasi ke `/kader/ibu/[id]`
- Footer menampilkan count sudah/belum kunjungan

- [ ] **Step 5: TypeScript check**

```powershell
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```powershell
git add app/kader/rekap/page.tsx
git commit -m "feat: add ibu hamil tab with table, filters, and footer"
```

---

## Task 7: Ibu tab — filter bar + tabel + footer

**Files:**
- Modify: `app/kader/rekap/page.tsx`

- [ ] **Step 1: Tambah filter Ibu ke filter bar**

Setelah blok `{activeTab === "ibu-hamil" && ...}` di filter bar, tambahkan:

```tsx
{activeTab === "ibu" && (
  <div className="flex items-center gap-2 flex-wrap">
    <span className="text-xs font-medium text-muted-foreground">Filter</span>
    <Select value={ibuRisikoFilter} onValueChange={setIbuRisikoFilter}>
      <SelectTrigger className="w-fit min-w-[160px] h-8 px-3 rounded-[50px] bg-white shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-xs text-[#173753] border-none focus:ring-0">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Kategori Risiko:</span>
          <SelectValue placeholder="Semua" />
        </div>
      </SelectTrigger>
      <SelectContent className="rounded-xl border-none shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
        <SelectItem value="" className="text-xs text-[#173753]">Semua</SelectItem>
        <SelectItem value="Aman" className="text-xs text-[#173753]">Aman</SelectItem>
        <SelectItem value="Waspada" className="text-xs text-[#173753]">Waspada</SelectItem>
        <SelectItem value="Bahaya" className="text-xs text-[#173753]">Bahaya</SelectItem>
      </SelectContent>
    </Select>
  </div>
)}
```

- [ ] **Step 2: Tambah tabel Ibu**

Setelah blok `{activeTab === "ibu-hamil" && <div className="px-4 pb-1">...</div>}`, tambahkan:

```tsx
{activeTab === "ibu" && (
  <div className="px-4 pb-1">
    <Table>
      <TableHeader>
        <TableRow className="border-b border-[#E8E8E8]">
          <TableHead className="text-[14px] text-[#173753] font-medium pl-2 w-10">No</TableHead>
          <TableHead className="text-[14px] text-[#173753] font-medium">Nama</TableHead>
          <TableHead className="text-[14px] text-[#173753] font-medium">Usia</TableHead>
          <TableHead className="text-[14px] text-[#173753] font-medium">Jml Anak</TableHead>
          <TableHead className="text-[14px] text-[#173753] font-medium">Skrining Terakhir</TableHead>
          <TableHead className="text-[14px] text-[#173753] font-medium">Kategori Risiko</TableHead>
          <TableHead className="text-[14px] text-[#173753] font-medium">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredBiasa.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-16">
              <div className="flex flex-col items-center gap-2">
                <Search className="w-8 h-8 text-gray-200" />
                <p className="text-sm font-medium text-muted-foreground">Tidak ada data yang cocok</p>
                <p className="text-xs text-muted-foreground">Coba ubah filter atau kata kunci pencarian</p>
              </div>
            </TableCell>
          </TableRow>
        ) : (
          filteredBiasa.map((row) => (
            <TableRow
              key={row.id}
              className="border-b border-[#F0F0F0] transition-colors hover:bg-[#F7FBFF]"
            >
              <TableCell className="text-[14px] pl-2 text-[#173753]">{row.no}</TableCell>
              <TableCell className="text-[14px] font-medium text-[#173753]">
                <Link href={`/kader/ibu/${row.id}`} className="hover:text-[#52A9E3] transition-colors">
                  {row.nama}
                </Link>
              </TableCell>
              <TableCell className="text-[14px] text-[#173753]">{row.usia}</TableCell>
              <TableCell className="text-[14px] text-[#173753]">{row.jumlahAnak} anak</TableCell>
              <TableCell className="text-[14px] text-[#173753]">{row.skriningTerakhir}</TableCell>
              <TableCell>
                {row.kategoriRisiko ? (
                  <StatusBadge status={row.kategoriRisiko} />
                ) : (
                  <span className="text-[12px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                    Belum Skrining
                  </span>
                )}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-gray-100 rounded-full">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </div>
)}
```

- [ ] **Step 3: Tambah footer Ibu**

Setelah blok footer Ibu Hamil, tambahkan:

```tsx
{activeTab === "ibu" && filteredBiasa.length > 0 && (
  <div className="px-4 py-2.5 border-t border-[#F0F0F0] flex items-center justify-between">
    <p className="text-xs text-muted-foreground">
      Menampilkan <span className="font-medium text-[#173753]">{filteredBiasa.length}</span> dari{" "}
      <span className="font-medium text-[#173753]">{ibuBiasa.length}</span> data
    </p>
    <div className="flex items-center gap-1">
      {(["Aman", "Waspada", "Bahaya"] as const).map((k) => {
        const count = filteredBiasa.filter(r => r.kategoriRisiko === k).length
        if (count === 0) return null
        const colors: Record<string, string> = {
          Aman:    "bg-green-100 text-green-700",
          Waspada: "bg-amber-100 text-amber-700",
          Bahaya:  "bg-red-100 text-red-700",
        }
        return (
          <span key={k} className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${colors[k]}`}>
            {count} {k.toLowerCase()}
          </span>
        )
      })}
    </div>
  </div>
)}
```

- [ ] **Step 4: Verifikasi semua tiga tab**

Buka `/kader/rekap` dan cek:
- **Tab Anak**: tabel dengan BB/TB/Status Gizi, filter Status Gizi & Status Periksa, footer count stunting
- **Tab Ibu Hamil**: tabel dengan Trimester/HPL/BB, filter Trimester & Kunjungan, footer count kunjungan
- **Tab Ibu**: tabel dengan Jml Anak/Skrining, filter Kategori Risiko, footer count risiko
- Ganti tab → filter reset, query reset
- Search di topbar → filter nama dalam tab aktif
- Klik nama di tab Anak → `/kader/anak/[id]`, di tab Ibu/Ibu Hamil → `/kader/ibu/[id]`

- [ ] **Step 5: TypeScript final check**

```powershell
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```powershell
git add app/kader/rekap/page.tsx
git commit -m "feat: add ibu tab with table, filters, and footer — complete daftar pasien tabs"
```
