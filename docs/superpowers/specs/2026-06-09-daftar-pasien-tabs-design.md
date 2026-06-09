# Design Spec: Daftar Pasien — Tab Per Kategori

**Date:** 2026-06-09  
**Status:** Approved  
**Page:** `/kader/rekap`

---

## Overview

Halaman Daftar Pasien saat ini hanya menampilkan **Anak**. Perlu diperluas agar kader juga bisa memantau **Ibu Hamil** dan **Ibu (tidak hamil)** yang anaknya terdaftar di posyandu yang sama.

Pendekatan yang dipilih: **Tab per kategori** — tiga tab dengan kolom masing-masing yang relevan, menggantikan tabel tunggal yang ada sekarang.

---

## Tab Bar

Ditempatkan di dalam card, menggantikan header "Daftar Pasien" yang sekarang ada.

```
[ Anak (24) ]  [ Ibu Hamil (8) ]  [ Ibu (15) ]
```

- Count badge = jumlah total pasien per kategori, diambil saat halaman load
- Tab aktif: teks `#173753`, border bawah `#52A9E3`, menggunakan style konsisten dengan design system yang ada
- Filter bar di bawah tab hanya menampilkan filter yang relevan untuk tab aktif

---

## Kolom Per Tab

### Tab Anak
Tidak berubah dari implementasi saat ini.

| No | Nama Pasien | L/P | Usia | BB | TB | Status Gizi | Periksa Bulan Ini | Terakhir Periksa | Aksi |

- Klik nama → `/kader/anak/[id]`
- Row highlight amber jika `sudah === false` (sudah ada)

### Tab Ibu Hamil

| No | Nama | Usia | Trimester | BB Saat Ini | HPL | Kunjungan Bulan Ini | Terakhir Kunjungan | Aksi |

- **Trimester**: badge T1/T2/T3, dihitung dari `pregnancyProfile.hpht`
- **BB Saat Ini**: dari `pregnancyVisits` paling baru (`currentWeightKg`), tampilkan "—" jika belum ada kunjungan
- **HPL**: dihitung dari HPHT + 280 hari, format `DD Mon YYYY`
- **Kunjungan Bulan Ini**: `CircleCheck` hijau "Sudah" / `CircleAlert` amber "Belum" — logika sama dengan tab Anak
- Klik nama → `/kader/ibu/[id]`
- Row highlight amber jika belum kunjungan bulan ini

### Tab Ibu (tidak hamil)

| No | Nama | Usia | Jml Anak | Skrining Terakhir | Kategori Risiko | Aksi |

- **Jml Anak**: count dari `anaks` yang terdaftar
- **Skrining Terakhir**: tanggal `skrinings[0].tanggal`, format `DD Mon YYYY`, "Belum" jika null
- **Kategori Risiko**: `StatusBadge` dengan `type="risk"` (Aman/Waspada/Bahaya), dari `skrinings[0].kategori`; badge abu-abu "Belum Skrining" jika belum ada
- Klik nama → `/kader/ibu/[id]`

---

## Filter Per Tab

| Tab | Filter |
|---|---|
| Anak | Status Gizi (Normal / Berisiko / Stunting), Status Periksa (Sudah / Belum) |
| Ibu Hamil | Trimester (1 / 2 / 3), Status Kunjungan (Sudah / Belum) |
| Ibu | Kategori Risiko (Aman / Waspada / Bahaya) |

- Search bar di topbar tetap berfungsi, mencari nama dalam tab aktif
- Filter state di-reset saat berpindah tab

---

## Footer Summary Badge

Konten menyesuaikan tab aktif:

- **Anak**: `X sudah` · `Y belum` · `Z stunting`
- **Ibu Hamil**: `X sudah kunjungan` · `Y belum kunjungan`
- **Ibu**: `X aman` · `Y waspada` · `Z bahaya`

---

## Data Layer — `lib/actions/kader.ts`

Dua fungsi baru ditambahkan di samping `getChildren()` yang sudah ada:

### `getIbuHamil()`
```ts
// Returns Ibu[] where isHamil === true
// Include: pregnancyProfile (untuk hpht → trimester & HPL)
//          pregnancyVisits (latest, untuk BB saat ini & cek kunjungan bulan ini)
```

Return type per baris:
```ts
{
  id: string
  nama: string
  tanggalLahir: Date | null
  pregnancyProfile: { hpht: Date; ... } | null
  pregnancyVisits: { visitDate: Date; currentWeightKg: number }[]
  // computed (di action atau di komponen):
  // trimester: 1 | 2 | 3
  // hpl: Date
  // sudahKunjunganBulanIni: boolean
}
```

### `getIbuBiasa()`
```ts
// Returns Ibu[] where isHamil === false
// Include: skrinings (latest, untuk kategori & tanggal)
//          _count: { anaks: true }
```

Return type per baris:
```ts
{
  id: string
  nama: string
  tanggalLahir: Date | null
  _count: { anaks: number }
  skrinings: { tanggal: Date; kategori: string; skorRisiko: number }[]
}
```

---

## Komponen

Page `app/kader/rekap/page.tsx` direfactor:

- State `activeTab: "anak" | "ibu-hamil" | "ibu"` menggantikan logika yang ada
- Tiga sub-komponen tabel lokal (atau inline) per tab — tidak perlu file terpisah
- `useEffect` load ketiga dataset paralel dengan `Promise.all([getChildren(), getIbuHamil(), getIbuBiasa()])`
- Filter state terpisah per tab, di-reset saat tab berganti

---

## Constraints

- Tidak ada perubahan routing — `/kader/rekap` tetap
- Tidak ada perubahan schema Prisma
- Komponen `StatusBadge` yang sudah ada dipakai ulang (`type="risk"` untuk tab Ibu)
- Style mengikuti design tokens yang sudah ada: `#173753`, `#52A9E3`, `#EBF2F8`, shadow `2px_2px_8px_rgba(0,0,0,0.08)`
