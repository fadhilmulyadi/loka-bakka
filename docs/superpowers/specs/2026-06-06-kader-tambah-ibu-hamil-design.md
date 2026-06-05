# Design: Status Kehamilan saat Kader Mendaftarkan Ibu Baru

**Tanggal:** 2026-06-06  
**Status:** Approved

## Latar Belakang

Saat kader mendaftarkan ibu baru via form `/kader/tambah-pasien`, tidak ada opsi untuk menandai bahwa ibu tersebut sedang hamil. Akibatnya semua ibu terdaftar dalam mode "tidak hamil", padahal banyak pasien yang datang dalam kondisi hamil. Dashboard ibu hamil seharusnya langsung masuk mode kehamilan begitu akun dibuat.

## Konteks Teknis

- Saat ini mode hamil ditentukan dari keberadaan record `PregnancyProfile` (relasi dari `Ibu`)
- `PregnancyProfile` membutuhkan data detail (BB sebelum hamil, tinggi, dll) yang baru tersedia saat kunjungan pertama
- Ibu yang datang untuk didaftarkan = kunjungan pertama, jadi data ini akan langsung diisi

## Solusi

Tambah field `isHamil Boolean @default(false)` ke model `Ibu`. Field ini menjadi sumber kebenaran tunggal untuk mode kehamilan di seluruh aplikasi, menggantikan pengecekan keberadaan `PregnancyProfile`.

## Perubahan

### 1. Schema — `prisma/schema.prisma`

Tambah satu field di model `Ibu`:

```prisma
model Ibu {
  // ... field yang sudah ada ...
  isHamil      Boolean  @default(false)
}
```

Jalankan `prisma migrate dev` setelah perubahan ini.

### 2. Form — `app/kader/tambah-pasien/page.tsx`

Tambah `SectionCard` baru "Status kehamilan" di bawah section "Identitas ibu". Isinya dua toggle card horizontal yang bisa diklik:

- **Card kiri** — icon `User` (Lucide), label "Tidak hamil" — selected by default
- **Card kanan** — icon `Baby` (Lucide), label "Sedang hamil"

**Selected state:** border `#52A9E3`, background `#EBF2F8`, icon & text warna `#52A9E3`.  
**Unselected state:** border `#E5E7EB`, background putih, icon & text warna `#9CA3AF`.

Tambah state `isHamil: boolean` ke `FormState` (default `false`).

### 3. Preview Panel — `app/kader/tambah-pasien/page.tsx`

Tambah baris "Status" di grid pratinjau sebelah kanan:

- Nilai "Sedang Hamil" → badge `bg-[#52A9E3] text-white`
- Nilai "Tidak Hamil" → badge `bg-gray-100 text-gray-500`

### 4. Server Action — `lib/actions/kader.ts`

`createIbu` menerima parameter tambahan `isHamil?: boolean` dan menyimpannya ke DB:

```ts
export async function createIbu(data: {
  nama: string
  username: string
  password: string
  noHp?: string
  tanggalLahir?: string
  alamat?: string
  isHamil?: boolean   // ← tambah ini
}) {
  // ...
  await prisma.ibu.create({
    data: {
      // ...field lain...
      isHamil: data.isHamil ?? false,
    }
  })
}
```

### 5. Dashboard Ibu — pengecekan mode hamil

Ganti kondisi pengecekan mode hamil dari:
```ts
const isPregnant = !!ibu.pregnancyProfile
```
menjadi:
```ts
const isPregnant = ibu.isHamil
```

Berlaku untuk semua halaman ibu yang memiliki mode berbeda berdasarkan status kehamilan (dashboard, status, dll).

## Tidak Berubah

- Alur pengisian `PregnancyProfile` (detail BB, tinggi, dll) tetap dilakukan terpisah saat kunjungan
- Checklist wajib di form tetap: nama, username, password
- Redirect setelah simpan tetap ke `/kader/ibu/{id}`

## Kriteria Selesai

- [ ] Kader bisa toggle "Tidak hamil / Sedang hamil" di form tambah-pasien
- [ ] Preview panel menampilkan badge status kehamilan
- [ ] `isHamil` tersimpan ke DB
- [ ] Dashboard ibu langsung masuk mode hamil jika `isHamil = true`
- [ ] Default untuk ibu lama tetap `false` (tidak hamil) via migrasi
