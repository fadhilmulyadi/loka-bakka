# Kader: Status Kehamilan saat Daftar Ibu Baru — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kader bisa menandai ibu sebagai "sedang hamil" saat mendaftarkan akun baru, sehingga dashboard ibu langsung masuk mode kehamilan.

**Architecture:** Tambah field `isHamil Boolean` di schema `Ibu`. Form `tambah-pasien` mendapat dua toggle card (User / Baby icon). Action `createIbu` menyimpan flag ini. Action `getIbuData` dan `getIbuProfile` menggunakan `ibu.isHamil` sebagai sumber kebenaran mode kehamilan, menggantikan `!!ibu.pregnancyProfile`.

**Tech Stack:** Next.js App Router, Prisma ORM (PostgreSQL), Lucide React, Tailwind CSS, shadcn/ui

---

## File Map

| File | Aksi |
|------|------|
| `prisma/schema.prisma` | Modify — tambah `isHamil Boolean @default(false)` ke model `Ibu` |
| `lib/actions/kader.ts` | Modify — `createIbu` terima & simpan `isHamil` |
| `lib/actions/ibu.ts` | Modify — `getIbuData` + `getIbuProfile` pakai `ibu.isHamil` bukan `!!ibu.pregnancyProfile` |
| `app/kader/tambah-pasien/page.tsx` | Modify — tambah toggle card UI + badge di preview |

---

## Task 1: Schema — tambah field `isHamil`

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Tambah field `isHamil` ke model `Ibu`**

Buka `prisma/schema.prisma`. Temukan model `Ibu` (sekitar baris 45). Tambah field baru setelah `alamat`:

```prisma
model Ibu {
  id           String    @id @default(cuid())
  nama         String
  username     String    @unique
  pin          String
  noHp         String?
  tanggalLahir DateTime?
  alamat       String?
  isHamil      Boolean   @default(false)   // ← tambah ini
  posyanduId   String
  createdAt    DateTime  @default(now())

  posyandu         Posyandu         @relation(fields: [posyanduId], references: [id])
  anaks            Anak[]
  skrinings        SkriningShamil[]
  pregnancyProfile PregnancyProfile?
  pregnancyVisits  PregnancyVisit[]
}
```

- [ ] **Step 2: Jalankan migrasi**

```bash
npx prisma migrate dev --name add_isHamil_to_ibu
```

Expected output:
```
Applying migration `20260606_add_isHamil_to_ibu`
Your database is now in sync with your schema.
```

- [ ] **Step 3: Generate Prisma client**

```bash
npx prisma generate
```

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add isHamil field to Ibu schema"
```

---

## Task 2: Action — update `createIbu`

**Files:**
- Modify: `lib/actions/kader.ts` (sekitar baris 563–595)

- [ ] **Step 1: Update signature dan body `createIbu`**

Temukan fungsi `createIbu` di `lib/actions/kader.ts`. Ganti seluruh fungsi menjadi:

```ts
export async function createIbu(data: {
  nama: string
  username: string
  password: string
  noHp?: string
  tanggalLahir?: string
  alamat?: string
  isHamil?: boolean
}) {
  const posyanduId = await getValidatedPosyanduId()

  const existing = await prisma.ibu.findUnique({ where: { username: data.username } })
  if (existing) throw new Error("USERNAME_TAKEN")

  const hashed = await bcrypt.hash(data.password, 10)

  const result = await prisma.ibu.create({
    data: {
      nama: data.nama,
      username: data.username,
      pin: hashed,
      noHp: data.noHp ?? null,
      tanggalLahir: data.tanggalLahir ? new Date(data.tanggalLahir) : null,
      alamat: data.alamat ?? null,
      isHamil: data.isHamil ?? false,
      posyanduId: posyanduId,
    },
    select: { id: true, nama: true, username: true },
  })

  revalidatePath("/kader/rekap")
  revalidatePath("/kader/dashboard")

  return result
}
```

- [ ] **Step 2: Verifikasi TypeScript tidak error**

```bash
npx tsc --noEmit
```

Expected: tidak ada error.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/kader.ts
git commit -m "feat: createIbu accepts and saves isHamil flag"
```

---

## Task 3: Action — update `getIbuData` dan `getIbuProfile`

**Files:**
- Modify: `lib/actions/ibu.ts` (baris 38 dan 114)

- [ ] **Step 1: Update `getIbuData` — ganti sumber `isPregnant`**

Di `lib/actions/ibu.ts`, temukan baris 38:
```ts
const isPregnant = !!ibu.pregnancyProfile
```
Ganti menjadi:
```ts
const isPregnant = ibu.isHamil
```

- [ ] **Step 2: Update `getIbuProfile` — ganti sumber `isPregnant`**

Di fungsi `getIbuProfile` (sekitar baris 114), temukan:
```ts
isPregnant: !!ibu.pregnancyProfile,
```
Ganti menjadi:
```ts
isPregnant: ibu.isHamil,
```

- [ ] **Step 3: Verifikasi TypeScript tidak error**

```bash
npx tsc --noEmit
```

Expected: tidak ada error.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/ibu.ts
git commit -m "feat: use isHamil field as source of truth for pregnancy mode"
```

---

## Task 4: UI — toggle card + badge preview di form tambah-pasien

**Files:**
- Modify: `app/kader/tambah-pasien/page.tsx`

- [ ] **Step 1: Tambah `Baby` ke import Lucide**

Temukan baris import Lucide di bagian atas file:
```ts
import {
  ChevronRight, ChevronDown, Check, ArrowRight,
  Search, TriangleAlert, Clock, Bell, LogOut,
} from "lucide-react"
```
Ganti menjadi:
```ts
import {
  ChevronRight, ChevronDown, Check, ArrowRight,
  Search, TriangleAlert, Clock, Bell, LogOut,
  User, Baby,
} from "lucide-react"
```

- [ ] **Step 2: Tambah `isHamil` ke `FormState`**

Temukan interface `FormState`:
```ts
interface FormState {
  nama: string
  username: string
  password: string
  noHp: string
  tanggalLahir: string
  alamat: string
}
```
Ganti menjadi:
```ts
interface FormState {
  nama: string
  username: string
  password: string
  noHp: string
  tanggalLahir: string
  alamat: string
  isHamil: boolean
}
```

- [ ] **Step 3: Tambah `isHamil: false` ke initial state**

Temukan:
```ts
const [f, setF] = useState<FormState>({
  nama: "", username: "", password: "", noHp: "", tanggalLahir: "", alamat: "",
})
```
Ganti menjadi:
```ts
const [f, setF] = useState<FormState>({
  nama: "", username: "", password: "", noHp: "", tanggalLahir: "", alamat: "", isHamil: false,
})
```

- [ ] **Step 4: Tambah `isHamil` ke `handleSubmit`**

Temukan panggilan `createIbu` di dalam `handleSubmit`:
```ts
const ibu = await createIbu({
  nama: f.nama,
  username: f.username,
  password: f.password,
  noHp: f.noHp || undefined,
  tanggalLahir: f.tanggalLahir || undefined,
  alamat: f.alamat || undefined,
})
```
Ganti menjadi:
```ts
const ibu = await createIbu({
  nama: f.nama,
  username: f.username,
  password: f.password,
  noHp: f.noHp || undefined,
  tanggalLahir: f.tanggalLahir || undefined,
  alamat: f.alamat || undefined,
  isHamil: f.isHamil,
})
```

- [ ] **Step 5: Tambah SectionCard "Status kehamilan" di form**

Di dalam `<div className="flex flex-col gap-4">` (kiri form), tambah `SectionCard` baru **di bawah** SectionCard "Identitas ibu":

```tsx
<SectionCard title="Status kehamilan">
  <div className="grid grid-cols-2 gap-3 py-1">
    {([
      { value: false, label: "Tidak hamil", Icon: User },
      { value: true,  label: "Sedang hamil", Icon: Baby  },
    ] as { value: boolean; label: string; Icon: React.ElementType }[]).map(({ value, label, Icon }) => {
      const selected = f.isHamil === value
      return (
        <button
          key={label}
          type="button"
          onClick={() => setF(prev => ({ ...prev, isHamil: value }))}
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
</SectionCard>
```

- [ ] **Step 6: Tambah badge status di preview panel**

Di dalam preview panel (CardContent), temukan grid info yang berisi "No. HP" dan "Alamat":
```tsx
<div className="grid gap-x-3 gap-y-2.5 pt-4 text-sm" style={{ gridTemplateColumns: "88px 1fr" }}>
  {[
    { label: "No. HP", value: f.noHp || null },
    { label: "Alamat", value: f.alamat || null },
  ].map(({ label, value }) => (
```
Ganti menjadi:
```tsx
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
</div>
```

- [ ] **Step 7: Verifikasi TypeScript tidak error**

```bash
npx tsc --noEmit
```

Expected: tidak ada error.

- [ ] **Step 8: Commit**

```bash
git add app/kader/tambah-pasien/page.tsx
git commit -m "feat: add pregnancy status toggle to kader patient registration form"
```

---

## Task 5: Verifikasi Manual

- [ ] **Step 1: Jalankan dev server**

```bash
npm run dev
```

- [ ] **Step 2: Login sebagai kader, buka form tambah pasien**

Navigasi ke `/kader/tambah-pasien`. Pastikan:
- Section "Status kehamilan" muncul di bawah "Identitas ibu"
- Default selected: "Tidak hamil" (border biru, bg biru muda)
- Klik "Sedang hamil" → card kanan jadi biru, card kiri jadi abu

- [ ] **Step 3: Cek preview panel**

Saat toggle berganti, badge "Status" di preview panel ikut berubah:
- "Tidak Hamil" → badge abu dengan icon `User`
- "Sedang Hamil" → badge biru dengan icon `Baby`

- [ ] **Step 4: Daftarkan ibu baru dengan status "Sedang hamil"**

Isi form lengkap (nama, username, password), pilih "Sedang hamil", klik simpan. Pastikan redirect ke `/kader/ibu/{id}` berhasil.

- [ ] **Step 5: Login sebagai ibu tersebut**

Login dengan akun ibu yang baru dibuat. Pastikan dashboard langsung tampil dalam mode kehamilan (PregnancyDashboardView), bukan mode anak.

- [ ] **Step 6: Verifikasi ibu lama tidak terpengaruh**

Login dengan akun ibu lama yang tidak hamil. Pastikan dashboardnya tetap tampil mode anak seperti biasa.
