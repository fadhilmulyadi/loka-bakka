# Skenario Uji Alat Tanpa Sensor

Cara menguji ketiga kategori hasil (NORMAL / PRA STUNTING / STUNTING) untuk anak
maupun ibu hamil, sebelum HX711 dan HC-SR04 terpasang.

Semua angka di dokumen ini dihitung dari tabel WHO LMS dan fungsi skoring yang
ada di repo (`lib/growth-standards/`), bukan perkiraan.

---

## 1. Menyalakan mode dummy

Di `firmware/lokabakka/config.h`:

```c
#define SENSOR_DUMMY 1
#define DUMMY_BB     12.4f
#define DUMMY_TB     85.0f
```

`SENSOR_DUMMY 1` membuat alat melewati HX711 dan HC-SR04 sepenuhnya dan
mengembalikan dua angka di atas. Ini bukan sekadar kenyamanan: `HX711.tare()`
akan menggantung selamanya menunggu chip yang belum terpasang, jadi tanpa mode
ini alat tidak akan sampai ke menu.

**Seluruh skenario di bawah memakai `DUMMY_TB 85.0` — cukup satu kali flash.**
Yang membedakan hasilnya adalah pasien mana yang sesinya dibuat di web, karena
z-score bergantung pada umur dan jenis kelamin anak.

Setelah sensor terpasang, kembalikan ke `#define SENSOR_DUMMY 0`.

---

## 2. Alur satu kali uji

1. Login web sebagai kader (`kader1` / lihat `scripts/seed-demo.ts`).
2. Buat sesi pengukuran: pilih pasien, kategori, dan untuk ibu hamil isi LILA & Hb.
3. Di alat: pilih kategori dengan tombol **merah**, konfirmasi dengan **hijau**.
4. Alat "mengukur" (langsung keluar angka dummy), tekan **hijau** untuk lanjut.
5. Untuk ibu hamil, jawab 5 pertanyaan. Untuk anak, langsung terkirim.
6. Periksa: kategori di layar, warna lampu, dan isi struk.

Server mencocokkan hasil ke **sesi "menunggu" paling baru** untuk device ini
(`app/api/device/selesai/route.ts:41`). Jadi buat satu sesi, uji, selesaikan —
jangan menumpuk beberapa sesi sekaligus.

Kategori di alat harus sama dengan kategori sesi, kalau tidak server menolak
dengan 409 dan alat menampilkan layar gagal.

---

## 3. Skenario ANAK

Dengan `DUMMY_TB = 85.0 cm`, ketiga anak berikut menghasilkan tiga kategori
berbeda. Buat sesi untuk anak yang dituju, lalu ukur.

| # | Anak | JK | Umur | z-score di TB 85 | Hasil | Lampu |
|---|------|----|------|------------------|-------|-------|
| A1 | **Gibran Yuli** | L | 9 bln | +5.81 | NORMAL | Hijau |
| A2 | **Mia Lestari** | P | 36 bln | −2.64 | PRA STUNTING | Kuning |
| A3 | **Bintang Ani** | L | 38 bln | −3.26 | STUNTING | Merah |

Ambang batasnya (kalau ingin menguji tepat di perbatasan, ubah `DUMMY_TB`):

| Anak | z = −2 (batas Pra Stunting) | z = −3 (batas Stunting) |
|------|------------------------------|--------------------------|
| Gibran Yuli (L, 9 bln) | 67.5 cm | 65.2 cm |
| Mia Lestari (P, 36 bln) | 87.4 cm | 83.6 cm |
| Bintang Ani (L, 38 bln) | 89.8 cm | 86.0 cm |

Batas resminya (`stunting-calc.ts:43`): `z < −3` Stunting, `−3 ≤ z < −2` Pra
Stunting, `z ≥ −2` Normal. Jadi TB tepat di angka "z = −2" masih **Normal**.

Berat badan tidak memengaruhi kategori sama sekali — klasifikasi anak murni
dari TB/U. `DUMMY_BB` boleh diisi apa saja.

> **Umur bergeser tiap bulan.** Seed membuat tanggal lahir relatif terhadap
> tanggal seeding, dan server menghitung umur dari selisih bulan berjalan.
> Kalau sudah lewat pergantian bulan sejak `seed-demo.ts` dijalankan, umur
> setiap anak bertambah 1 dan z-score di tabel ini bergeser (makin negatif).
> Jalankan ulang seed sebelum menguji, atau sesuaikan `DUMMY_TB` memakai tabel
> ambang di atas.

---

## 4. Skenario IBU HAMIL

### 4a. Cara skornya dihitung

**Langkah 1 — skor kuesioner (0–16), dari 5 jawaban di alat.** Urutan
pertanyaan di alat tetap: Q1 protein, Q2 Fe, Q3 pengetahuan, Q4 sanitasi,
Q5 rokok. Tombol **hijau = YA**, **merah = TIDAK**.

| Pertanyaan | Jawab YA | Jawab TIDAK |
|------------|----------|-------------|
| Q1 protein hewani tiap hari | 0 | **+4** |
| Q2 rutin tablet Fe | 0 | **+3** |
| Q3 paham info kehamilan | 0 | **+2** |
| Q4 **tanpa** akses air bersih | **+3** | 0 |
| Q5 merokok / terpapar asap | **+4** | 0 |

Perhatikan Q4 dan Q5 terbalik arah: di sana "YA" berarti berisiko.

Band: skor ≤ 4 → RENDAH · 5–10 → SEDANG · > 10 → TINGGI.

**Langkah 2 — skor gabungan (0–8).**

| Faktor | Poin |
|--------|------|
| IMT pra-hamil `underweight` | +2 |
| LILA < 23,5 cm | +2 |
| Hb < 10 g/dL | +2 |
| Band kuesioner: RENDAH / SEDANG / TINGGI | +0 / +1 / +2 |

Kategori akhir: skor ≤ 1 → RENDAH (**NORMAL**, hijau) · 2–5 → SEDANG
(**PRA STUNTING**, kuning) · > 5 → TINGGI (**STUNTING**, merah).

IMT tidak bisa diubah dari form sesi — ia melekat pada profil kehamilan ibu.
Dari data seed, **hanya Hartini Wahab yang `underweight`**; Mariam Hasanah,
Fadilah Nuraini, Sumiati Basri, dan Rahmawati Syah semuanya `normal`.

### 4b. Skenario

| # | Ibu | LILA | Hb | Q1 | Q2 | Q3 | Q4 | Q5 | Skor kuesioner | Skor akhir | Hasil | Lampu |
|---|-----|------|-----|----|----|----|----|----|----------------|------------|-------|-------|
| I1 | Mariam Hasanah | 26.0 | 12.0 | YA | YA | YA | TIDAK | TIDAK | 0 → RENDAH | 0 | NORMAL | Hijau |
| I2 | Mariam Hasanah | 22.0 | 11.5 | YA | YA | YA | TIDAK | TIDAK | 0 → RENDAH | 2 | PRA STUNTING | Kuning |
| I3 | Mariam Hasanah | 26.0 | 12.0 | TIDAK | TIDAK | TIDAK | TIDAK | YA | 13 → TINGGI | 2 | PRA STUNTING | Kuning |
| I4 | Hartini Wahab | 22.0 | 9.5 | YA | YA | YA | TIDAK | TIDAK | 0 → RENDAH | 6 | STUNTING | Merah |
| I5 | Hartini Wahab | 21.0 | 9.0 | TIDAK | TIDAK | TIDAK | YA | YA | 16 → TINGGI | 8 | STUNTING | Merah |

Empat di antaranya sengaja menguji hal yang berbeda:

- **I2 vs I3** — keduanya kuning, tapi lewat jalur berbeda. I2 dipicu murni dari
  LILA, I3 murni dari kuesioner. Kalau salah satu tidak kuning, ketahuan
  bagian mana yang bermasalah.
- **I3** juga membuktikan **kuesioner sendirian tidak akan pernah mencapai
  merah**: bandnya maksimal menyumbang 2 poin dari 8, sedangkan merah butuh > 5.
  Jawaban terburuk di semua pertanyaan tetap berhenti di kuning selama LILA,
  Hb, dan IMT normal.
- **I4** kebalikannya: semua jawaban ideal, tapi tetap merah karena tiga faktor
  klinis menumpuk. Ini yang paling penting diverifikasi — hasil tidak boleh
  ikut melunak hanya karena ibu menjawab bagus.
- **I5** adalah skor maksimum 8.

### 4c. Kasus perbatasan yang layak dicoba

| Uji | Isian | Yang diharapkan |
|-----|-------|-----------------|
| LILA tepat di batas | LILA **23.5** | 0 poin — syaratnya `< 23,5`, bukan `≤` |
| Hb tepat di batas | Hb **10.0** | 0 poin — syaratnya `< 10` |
| Batas band kuesioner | Q5 YA saja, sisanya sehat | Skor tepat 4 → masih **RENDAH** |

Baris ketiga sengaja dicantumkan: **merokok saja, tanpa faktor lain, masih
masuk band RENDAH** dan tidak menaikkan skor akhir sama sekali. Secara
perhitungan ini konsisten dengan `risiko-kehamilan-calc.ts:25`, tapi ada
baiknya dipastikan ke pembimbing apakah memang begitu yang dimaui.

---

## 5. Yang ikut terverifikasi

Setiap skenario di atas sekaligus menguji rantai penuhnya:

- Alur layar dan tombol (pilih kategori → ukur → kuesioner → hasil → cetak)
- Pemetaan kategori ke lampu (`lamps.h:50`)
- Skoring di server, keduanya (`stunting-calc.ts`, `risiko-kehamilan-calc.ts`)
- Pencetakan struk

Untuk menguji layar gagal: matikan hotspot sebelum menekan hijau di layar ukur.
Alat harus menampilkan layar gagal.
