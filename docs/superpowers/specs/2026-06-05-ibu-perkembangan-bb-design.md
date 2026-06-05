# Design Spec: Ibu — Perkembangan BB & Perubahan Alur Status Risiko

**Tanggal:** 2026-06-05  
**Status:** Approved  
**Scope:** Seluruh tampilan role `ibu` — dashboard, halaman status, bottom nav

---

## Konteks & Motivasi

Sebelumnya, ibu bisa mengecek risiko stunting sendiri dengan menginput LILA, Hb, dan kenaikan BB secara manual di halaman Status. Ini tidak akurat secara klinis karena ibu tidak bisa mengukur sendiri dengan benar.

**Model baru:** Kader mencatat semua data saat kunjungan posyandu. Ibu hanya menerima dan membaca hasilnya. Selain itu, ditambahkan fitur grafik kenaikan BB ibu hamil per minggu/bulan berdasarkan standar IOM.

---

## Logika Bisnis Baru

### IMT & Target Kenaikan BB (IOM)

IMT dihitung **sekali di Trimester 1** menggunakan BB pra-hamil dan tinggi badan ibu. Kader yang menginput data ini saat registrasi atau kunjungan pertama.

```
IMT = BB_prahamil (kg) / Tinggi (m)²
```

| Kategori    | IMT         | Target Total   | Naik/minggu (Tri 2 & 3) |
|-------------|-------------|----------------|--------------------------|
| Underweight | < 18,5      | 12,7 – 18 kg   | 0,45 – 0,59 kg           |
| Normal      | 18,5 – 24,9 | 11,3 – 15,9 kg | 0,36 – 0,45 kg           |
| Overweight  | 25 – 29,9   | 6,8 – 11,3 kg  | 0,27 – 0,32 kg           |
| Obese       | ≥ 30        | 5 – 9 kg       | 0,22 – 0,27 kg           |

### Penentuan Status Risiko

Status risiko ditentukan dari data kunjungan kader terakhir (`pregnancy_visits`):

| Kondisi                                          | Status            |
|--------------------------------------------------|-------------------|
| LILA < 23,5 cm **atau** Hb < 11 g/dL            | 🔴 Risiko Tinggi  |
| `is_on_track = false` (BB gain di luar target)   | 🟡 Perlu Perhatian |
| Semua normal                                     | 🟢 Aman           |

Ibu **tidak bisa** menghitung atau mengubah status ini sendiri.

### Data Model (Supabase / Prisma)

**`pregnancy_profile`** — dibuat sekali di Trimester 1 oleh kader:
```
imt_prepregnancy    Float   -- BB_prahamil / tinggi²
imt_category        String  -- 'underweight' | 'normal' | 'overweight' | 'obese'
bb_prepregnancy_kg  Float   -- BB sebelum hamil
height_cm           Float   -- tinggi badan
target_gain_min_kg  Float   -- batas bawah target IOM
target_gain_max_kg  Float   -- batas atas target IOM
weekly_gain_min_kg  Float   -- target naik/minggu (min)
weekly_gain_max_kg  Float   -- target naik/minggu (max)
```

**`pregnancy_visits`** — diisi kader setiap kunjungan:
```
visit_date          DateTime
current_weight_kg   Float
weight_gain_kg      Float   -- selisih dari BB pra-hamil
lila_cm             Float
hb_gdl              Float
is_on_track         Boolean -- apakah BB gain sesuai target
```

---

## Perubahan per Halaman

### 1. Dashboard (`/ibu/dashboard`)

#### 1A — Card "Kenaikan BB" (di section Indikator Risiko)

**Sebelum:** Menampilkan "+6,5 kg" dan badge "Sesuai" statis tanpa konteks target.

**Sesudah:** Tambahkan baris target range IOM di bawah angka BB gain:
- `+8,5 kg` (angka utama)
- `dari 11,3 – 15,9 kg` (sub-teks kecil, warna muted)
- Badge `✅ Sesuai` / `⚠️ Perlu Perhatian` / `🔴 Di Bawah Target` — dari `pregnancy_visits.is_on_track` terbaru

LILA dan Hb card **tidak berubah** strukturnya, hanya datanya nanti dari kunjungan kader.

#### 1B — Gradient Risk Bar

Logika penentuan posisi marker berubah dari input manual ibu ke data kunjungan kader:
- Posisi merah: LILA < 23,5 cm atau Hb < 11 g/dL
- Posisi kuning: `is_on_track = false`
- Posisi hijau: semua normal

Visual bar **tidak berubah**.

#### 1C — Section "Pesan Harian"

**Sebelum:** 3 kartu tampil bersamaan (aman, perlu perhatian, risiko tinggi) — 2 di-opacity-kan.

**Sesudah:** Hanya **1 kartu aktif** yang tampil sesuai status dari kunjungan kader terakhir. Konten pesan tetap sama per status, tapi tidak lagi menampilkan kartu yang tidak relevan.

#### 1D — Tombol CTA di section Indikator Risiko

**Sebelum:** "Lihat Status Risiko"  
**Sesudah:** "Lihat Perkembangan BB" → navigasi ke `/ibu/status`

---

### 2. Halaman Status → "Perkembangan BB" (`/ibu/status`)

Halaman ini **dirombak total**. Tidak ada form input. Semua read-only.

#### 2A — Header

```
Perkembangan Berat Badan
Pantau kenaikan BB-mu sesuai target kehamilan
```

Tidak ada eyebrow chip seperti halaman lama.

#### 2B — Card Profil IMT

Card pertama, posisi paling atas. Data statis dari `pregnancy_profile`.

Konten:
- BB Pra-hamil, Tinggi Badan, Nilai IMT (3 kolom horizontal)
- Badge kategori IMT: `Underweight` / `Normal` / `Overweight` / `Obese`
- Target Naik BB Total: `11,3 – 15,9 kg` (range IOM)
- Target kenaikan per minggu: `0,36 – 0,45 kg`
- Footer note: "📌 Dihitung sekali di awal kehamilan"

Warna border card mengikuti kategori IMT:
- Normal → hijau muted (`#C3E9D4` / `#E7F7EF`)
- Underweight → biru muda (`#C4DDF5` / `#E7F2FB`)
- Overweight / Obese → amber (`#F4E2BC` / `#FFF7E6`)

Empty state (jika `pregnancy_profile` belum ada):
> "Data profil kehamilan belum tersedia. Kader akan mengisi saat kunjungan pertama."

#### 2C — Card Kunjungan Terakhir

Data dari `pregnancy_visits` terbaru. Konten:
- Label tanggal kunjungan
- BB sekarang (kg) dan kenaikan total (`+X kg dari BB pra-hamil`)
- Badge status: `✅ Sesuai Target` / `⚠️ Perlu Perhatian` / `🔴 Di Bawah Target`
- Sub-teks: "Masih dalam rentang 11,3–15,9 kg" (atau pesan sesuai status)
- Divider
- LILA (cm) + badge Normal/KEK
- Hb (g/dL) + badge Normal/Anemia

Empty state (jika belum ada kunjungan):
> "Belum ada data kunjungan. Kader akan mengisi data saat kunjungan posyandu berikutnya."

#### 2D — Grafik BB

Library: **Recharts** (sudah terpasang di project).

Konfigurasi chart:
- **X-axis:** waktu (toggle: Per Minggu / Per Bulan)
- **Y-axis:** berat badan dalam kg
- **Elemen:**
  - `ReferenceArea` — zona target (shaded hijau muda) antara `BB_prahamil + target_min` s/d `BB_prahamil + target_max`
  - `Line` — BB aktual dari setiap `pregnancy_visits` (warna `#1178D4`)
  - `ReferenceLine` — garis batas min dan max target
  - `Dot` pada setiap titik kunjungan, warna sesuai posisi:
    - Di dalam zona → hijau (`#1E9E62`) — konsisten dengan `is_on_track = true`
    - Di bawah zona → kuning (`#D99100`) — konsisten dengan `is_on_track = false`
    - Di atas zona → kuning (`#D99100`) — untuk overweight/obese yang naik terlalu cepat
    - Merah (`#DC2626`) hanya digunakan di status keseluruhan (LILA/Hb buruk), bukan di titik chart

Toggle Per Minggu / Per Bulan: hanya mengubah label X-axis dan agregasi tampilan. Data tetap sama dari kunjungan kader.

Legend:
- `● BB Aktual`
- `▓ Zona Target`

Empty state (< 2 titik data): tampilkan placeholder chart dengan zona target saja + pesan "Data akan muncul setelah minimal 2 kunjungan."

#### 2E — Riwayat Kunjungan

List kartu vertikal, urutan terbaru di atas. Setiap kartu:
- Tanggal kunjungan
- BB saat kunjungan + kenaikan total
- Badge `is_on_track`

Empty state: "Belum ada riwayat kunjungan."

---

### 3. Bottom Nav

**Sebelum:** Dashboard · Status · Tugas · Edukasi  
**Sesudah:** Beranda · Progres · Tugas · Edukasi

Tab "Status" → rename **"Progres"** dengan ikon `TrendingUp` (dari Lucide, sudah tersedia).

File: `components/ibu-bottom-nav.tsx` — ubah label dan ikon tab kedua.

---

## Halaman yang Tidak Berubah

- `/ibu/tugas` — tidak ada perubahan
- `/ibu/edukasi` — tidak ada perubahan
- `/ibu/layout.tsx` — tidak ada perubahan
- Auth flow — tidak ada perubahan

---

## Ringkasan Perubahan File

| File | Jenis Perubahan |
|------|----------------|
| `app/ibu/dashboard/page.tsx` | Edit: card BB gain + risk bar logic + pesan harian + CTA label |
| `app/ibu/status/page.tsx` | Rombak total: hapus form, ganti dengan 4 section read-only |
| `components/ibu-bottom-nav.tsx` | Edit: rename tab + ganti ikon |
| `lib/actions/ibu.ts` | Edit: tambah query pregnancy_profile + pregnancy_visits |
| `prisma/schema.prisma` | Tambah model PregnancyProfile + PregnancyVisit |
