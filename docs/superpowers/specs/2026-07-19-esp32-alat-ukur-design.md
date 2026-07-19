# ESP32 Alat Ukur — Firmware & Integrasi Web (Design)

## Ringkasan

Alat ESP32 DevKit V1 (layar TFT ILI9488 3.5" 480x320 + printer thermal 58mm + 2 tombol)
dipakai kader untuk mengukur berat/tinggi anak atau ibu hamil, mengisi kuesioner risiko
kehamilan (khusus ibu), lalu mengirim data mentah ke backend web. Backend menghitung status
gizi/kategori risiko dan mengembalikannya ke alat untuk ditampilkan dan dicetak di struk.
Tampilan layar mengikuti mockup `Loka Bakka - Layar TFT Alat.html` (screens 1a–1t) persis.

Referensi kode kerja awal (WiFi/TFT/printer/relay/tombol dasar): `lokabakka.ino` (saat ini kosong,
menggantikan contoh kode yang diberikan user di percakapan).

## Arsitektur & Alur Data

1. **Web (kader, pasien sudah diketahui)** — kader membuka modal pasien yang sudah ada
   (`CatatKunjunganModal` untuk anak, `PeriksaKehamilanModal` untuk ibu). Untuk ibu, kader
   mengisi LILA & Hb manual **lebih dulu** (field sudah ada). Tombol "Mulai dengan Alat"
   memanggil `POST /api/pengukuran/mulai` dengan
   `{ deviceId: "esp32-01", kategori: "anak"|"ibu", anakId?, ibuId?, lilaCm?, hbGdl? }`
   → membuat baris `sesiPengukuran` baru, `statusHasil = "menunggu"`.
2. **ESP32 (berdiri sendiri, tidak tahu identitas pasien)**:
   - Boot → sambung WiFi → `PILIH_KATEGORI` (kader menekan tombol fisik memilih Anak/Ibu
     Hamil — independen dari klik web, hanya menentukan alur mana yang dijalankan alat).
   - `UKUR` — baca berat & tinggi (fungsi `readWeight()`/`readHeight()`, saat ini
     mengembalikan nilai uji tetap — sensor HX711/HC-SR04 asli menyusul, lihat
     [Sensor](#sensor-berat--tinggi-stub)).
   - Jika Ibu: `KUESIONER` 5 pertanyaan berurutan, jawaban mentah (ya/tidak) disimpan di
     memori alat, tanpa penilaian di alat.
   - `KIRIM` — setelah BB & TB stabil (bukan streaming per-nilai), satu `POST` ke
     `/api/device/selesai` berisi `{ device_id, kategori, bb, tb, jawaban? }` + header
     `x-api-key`. Timeout 8 detik.
3. **Backend (endpoint finalize baru)**:
   - Mencari sesi `statusHasil = "menunggu"` milik `device_id` tsb. Jika `kategori` yang
     dikirim alat tidak cocok dengan sesi yang sedang menunggu (atau tidak ada sesi sama
     sekali), balas error — alat menampilkan layar `GAGAL_TERHUBUNG` yang sama (pesan log
     berbeda, UI sama).
   - **Anak**: pakai ulang `calcHeightZScore` + `stuntingLabel` (logika sama dengan
     `savePengukuran` di `lib/actions/kader.ts`) → NORMAL / PENDEK / SANGAT PENDEK.
   - **Ibu**: hitung skor gabungan 0–8 (lihat [Skoring](#skoring-risiko-ibu-hamil)) → RENDAH /
     SEDANG / TINGGI.
   - Susun teks edukasi singkat (2–3 baris, tanpa em dash) sesuai kategori.
   - Simpan hasil pada sesi (`statusHasil = "selesai"`, `kategoriHasil`, `skorAkhir`,
     `skorKuesioner`, `teksEdukasi`, `namaPasien` snapshot).
   - Balas ke alat: kategori/status, skor, teks edukasi, nama pasien, bb, tb, tanggal —
     semua yang dibutuhkan untuk layar hasil + struk.
4. **ESP32**: tampilkan layar `HASIL` sesuai kategori → `CETAK_STRUK` (cetak struk ESC/POS,
   lihat [Struk](#desain-struk-58mm-esc-pos)) → `SELESAI` (kembali otomatis 5 detik atau
   tombol ②) → kembali ke `PILIH_KATEGORI`.
5. **Web (konfirmasi)** — modal yang tadi terbuka (masih polling status sesi) melihat
   `statusHasil = "selesai"`, menampilkan hasil yang sama dengan tombol **Ulangi** (reset
   sesi, kader bisa mengulang dari alat) dan **Simpan Pemeriksaan** (menyimpan hasil yang
   *sudah dihitung* — tanpa hitung ulang — ke `pengukuran` / `pregnancyVisit` /
   `skriningShamil`).

### Penanganan gagal

Timeout HTTP 8 detik, sesi tidak ditemukan, dan kategori tidak cocok semuanya berujung ke
layar `GAGAL_TERHUBUNG` yang sama dari mockup (① ganti pilihan → kembali ke `PILIH_KATEGORI`,
② coba lagi → ulangi POST yang sama). Tidak perlu layar error terpisah.

## Skoring Risiko Ibu Hamil

Skor kuesioner (0–16, dihitung di backend saat finalize, bukan di alat):

| Pertanyaan | Jawaban berisiko | Bobot | Skor maks |
|---|---|---|---|
| Rokok / asap rokok | Ya = 2 | ×2 | 4 |
| Protein & gizi seimbang | Tidak = 2 | ×2 | 4 |
| Tablet tambah darah (Fe) | Tidak = 2 | ×1.5 | 3 |
| Sanitasi/akses air bersih | Ya (tidak ada akses) = 2 | ×1.5 | 3 |
| Pengetahuan usia kandungan | Tidak = 2 | ×1 | 2 |

Total 0–16 → band kuesioner: **0–4 Rendah, 5–10 Sedang, 11–16 Tinggi** → dikonversi ke skor
0/1/2 untuk digabung.

Skor gabungan final (0–8), dihitung sekali saat alat mengirim data (LILA & Hb sudah ada di
sesi sejak `/mulai`, IMT dari `pregnancyProfile.imtCategory`):

| Faktor | Aturan | Skor |
|---|---|---|
| IMT | `underweight` | 2 |
| | `normal` / `overweight` / `obese` | 0 |
| LILA | < 23.5 cm | 2 |
| | ≥ 23.5 cm | 0 |
| Hb | < 10 g/dL | 2 |
| | ≥ 10 g/dL | 0 |
| Band kuesioner | Rendah / Sedang / Tinggi | 0 / 1 / 2 |

Total 0–8 → **0–1 RENDAH, 2–5 SEDANG, 6–8 TINGGI**. Ini kategori final yang ditampilkan di
alat, dicetak di struk, dan (saat kader klik Simpan) disimpan sebagai `skriningShamil.kategori`
/ `skorRisiko`.

## Perubahan Backend

`sesiPengukuran` (schema) menambah kolom:
- `kategori` text (`"anak" | "ibu"`)
- `anakId`, `ibuId` text nullable (referensi `anak.id` / `ibu.id`)
- `lilaCm`, `hbGdl` doublePrecision nullable (ibu, diisi saat `/mulai`)
- `jawaban` jsonb nullable (5 jawaban ibu, diisi saat finalize)
- `statusHasil` text default `"menunggu"` (`"menunggu" | "selesai"`)
- `kategoriHasil`, `teksEdukasi`, `namaPasien` text nullable
- `skorAkhir`, `skorKuesioner` integer nullable

Routes:
- `POST /api/pengukuran/mulai` — tambah parameter `kategori`, `anakId`/`ibuId`, `lilaCm`,
  `hbGdl` pada body.
- `POST /api/device/selesai` (baru) — endpoint finalize yang dijelaskan di atas. Endpoint
  granular `POST /api/device/data` (kirim tinggi/berat terpisah) **dihapus** — tidak
  dipakai lagi karena alat hanya mengirim sekali setelah stabil.
- Aksi baru (server action) untuk menyimpan hasil ibu yang sudah dihitung ke
  `pregnancyVisit` + `skriningShamil` saat kader klik Simpan (tanpa hitung ulang skor).

Modal web (`CatatKunjunganModal`, `PeriksaKehamilanModal`) diperbarui:
- Sesi tidak lagi auto-mulai saat modal dibuka; tombol "Mulai dengan Alat" baru aktif
  setelah field wajib terisi (ibu: LILA & Hb).
- Saat `statusHasil = "selesai"`, tampilkan ringkasan hasil (kategori, skor, teks edukasi)
  alih-alih form kosong menunggu, dengan tombol Ulangi/Simpan.

## Firmware ESP32

### State machine

`BOOT → PILIH_KATEGORI → UKUR → [KUESIONER_1..5 (ibu saja)] → KIRIM → HASIL → CETAK_STRUK → SELESAI → (kembali ke PILIH_KATEGORI)`

Cabang gagal: `KIRIM → GAGAL_TERHUBUNG → (① PILIH_KATEGORI | ② retry KIRIM)`

Setiap layar & pemetaan tombol mengikuti tabel "PEMETAAN TOMBOL PER LAYAR" di mockup
(screen `1t`) persis — tombol ① kiri (merah, umumnya "batal/ulangi/tidak"), tombol ② kanan
(hijau, umumnya "lanjut/ya/pilih").

### Hardware

- TFT_eSPI + ILI9488 480×320 landscape, pin sesuai wiring yang sudah diberikan user
  (CS 5, DC 27, RST 33). Konfigurasi pin SPI (MOSI/SCLK/MISO) diatur di `User_Setup.h`
  library TFT_eSPI, bukan di `.ino` — perlu dikonfigurasi manual saat setup project.
- 2 tombol GPIO 13 & 14, `INPUT_PULLUP`, debounce 30ms, hanya tekan singkat (sesuai contoh
  kode awal).
- Printer thermal di `Serial2` (TX 17, RX 16), 58mm / 32 kolom, ESC/POS penuh (termasuk
  `GS ( k` untuk QR code).
- Font: placeholder pakai font bawaan TFT_eSPI (GFXFF) di 8 ukuran dari spec (96/44/34/25/
  20/15/13/11px). Komentar kode menandai cara mengganti ke Inter Tight asli nanti (konversi
  ke TFT_eSPI "smooth font" `.vlw` via tool terpisah — di luar cakupan ini).

### Sensor berat & tinggi (stub)

`readWeightKg()` dan `readHeightCm()` mengembalikan nilai uji tetap (mis. 12.4 kg / 87.5 cm
untuk anak, 58.2 kg / 155.0 cm untuk ibu — sesuai contoh angka di mockup) sampai kode
HX711/HC-SR04 asli disambungkan. Hanya dua fungsi ini yang perlu diganti nanti — tidak ada
bagian lain firmware yang bergantung pada detail sensor.

## Desain Struk (58mm, ESC/POS)

Ditulis lewat helper ESC/POS mentah (align, bold, ukuran font, cut, `GS ( k` untuk QR) —
tanpa dependency library printer tambahan.

```
========[centered]========
        LOKA BAKKA
   Hasil Pemeriksaan
===========================
Nama    : {namaPasien}
Tanggal : {tanggal}
---------------------------
Berat Badan     : {bb} kg
Tinggi Badan    : {tb} cm
---------------------------
STATUS: {kategoriHasil}      <- bold, font besar
---------------------------
{teksEdukasi, 2-3 baris}
---------------------------
      [QR ke www.lokabakka.my.id]
   www.lokabakka.my.id
===========================
```

Teks edukasi ringkas per kategori (anak & ibu), tanpa em dash, cukup untuk 2–3 baris cetak
di 32 kolom — final wording ditulis saat implementasi, mengikuti isi yang diberikan user di
percakapan (disingkat, arah makna dipertahankan).

## Di luar cakupan

- Kalibrasi/kode HX711 & HC-SR04 asli (fungsi stub sudah disiapkan sebagai titik sambung).
- Lampu indikator hijau/kuning/merah (`PIN_LAMP_*`) — sesuai instruksi user, tidak
  dikerjakan dulu.
- Konversi font Inter Tight asli ke format bitmap TFT_eSPI.
- Autentikasi multi-device (sistem tetap asumsi 1 alat `"esp32-01"`, sesuai kondisi saat
  ini).
