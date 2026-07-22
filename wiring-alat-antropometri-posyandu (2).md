# WIRING — ALAT ANTROPOMETRI POSYANDU
**Pengukur Berat & Tinggi Badan + Skrining Stunting** · ESP32 DevKit V1 (30 pin) · v1.0 · Juli 2026

---

## 0. Keputusan Desain (Final)

| # | Keputusan | Alasan |
|---|-----------|--------|
| 1 | **Relay = saklar daya printer** (memutus jalur 9V ke VH) | QR204 menyedot arus besar (puncak ±2A) saat cetak. Printer hanya dinyalakan saat akan mencetak → hemat daya, mencegah brown-out ESP32 |
| 2 | **Lampu pilot 12V DC disaklar modul relay 4 channel** (kontak NO, suplai 9V) | GPIO 3,3V tidak mampu mendrive lampu 12V; modul relay menggantikan rencana driver diskrit yang stoknya kosong. Di 9V lampu tetap menyala jelas (±70% arus nominal); channel 4 jadi cadangan |
| 3 | **HX711 diletakkan di BAGIAN BAWAH**, menempel dekat load cell | Sinyal load cell hanya milivolt — tidak boleh melewati kabel panjang + konektor GX16 (rawan noise/drift). Yang lewat GX16 hanya sinyal digital |
| 4 | **TFT + microSD berbagi 1 bus SPI**, tapi **SDO/MISO TFT sengaja TIDAK disambung** | Modul microSD ber-level-shifter terkenal tidak melepas jalur MISO. Dengan SDO TFT kosong, MISO murni milik SD → konflik bus hilang |
| 5 | **HX711 disuplai 3,3V** (bukan 5V) | Agar sinyal DT keluaran HX711 aman untuk ESP32 yang tidak toleran 5V |
| 6 | **ECHO HC-SR04 melewati pembagi tegangan 1kΩ/2kΩ** | ECHO keluar 5V → diturunkan ke 3,3V (inilah fungsi kedua resistormu) |
| 7 | **LM2596 disetel 5,10V** (bukan 5,00V) | Memberi margin untuk drop regulator AMS1117 di board ESP32; masih aman untuk semua modul 5V |
| 8 | **JANGAN pernah ganti adaptor ke 12V** | Printer QR204 maksimum 9V. Lampu 12V-mu sudah cukup terang di 9V |

---

## 1. Diagram Blok Daya

```
ADAPTOR 9V 2A
     │
 Jack DC (+/−)
     │
     ├─── 9V ──► Relay printer: COM ──► NO ──► VH PRINTER QR204
     │                                        └─ Elco 2200µF (VH–GND, di terminal)
     │
     ├─── 9V ──► Relay 4ch: COM1–3 ──► NO1–3 ──► X1 LAMPU ×3 ── X2 ──► GND
     │
     └─── 9V ──► LM2596 (set 5,10V) ─┬─► ESP32 VIN
                  └ Elco 470µF di OUT ├─► TFT VCC
                                      ├─► Modul microSD VCC
                                      ├─► HC-SR04 VCC (via GX16-A, bagian ATAS)
                                      └─► VCC kedua modul relay
                                            │
                          ESP32 pin 3V3 ────┼─► HX711 VCC (via GX16-B, bagian BAWAH)
                                            └─► TFT LED (backlight)
```

---

## 2. Tambahan BOM (di luar daftarmu — wajib/disarankan)

| Item | Qty | Fungsi |
|------|-----|--------|
| Modul relay 4 channel 5V (optocoupler) | 1 | Saklar 3 lampu pilot (CH1–CH3, pakai kontak NO); CH4 cadangan untuk pengembangan |
| Heatshrink aneka ukuran + label kabel | 1 set | Isolasi sambungan Y-splice & penandaan nomor baris |
| Standoff/spacer nilon + baut M3 | 1 set | Dudukan semua modul di dalam box (jangan ada modul menggantung) |

---

## 3. Konvensi

**Penamaan terminal blok** — setiap baris punya dua sisi, **A dan B**, yang tersambung secara internal (satu baris = satu jalur listrik):

| Kode | Terminal | Fungsi |
|------|----------|--------|
| **TB-A** | TB 12 pin | Distribusi daya (9V, VH, GND, 5V, 3V3) |
| **TB-B** | TB 4 pin | Sinyal & daya bagian ATAS (HC-SR04 / GX16-A) |
| **TB-C** | TB 3 pin #1 | Pembagi tegangan ECHO (1kΩ/2kΩ) |
| **TB-D** | TB 3 pin #2 | Sinyal & daya bagian BAWAH (HX711 / GX16-B) |
| **TB-E** | TB 3 pin #3 | Jalur balik X2 (−) lampu pilot |

**Lokasi fisik: KELIMA TB SEMUANYA DI DALAM CONTROL BOX.** Case HC-SR04 (atas) dan case HX711 (bawah) TIDAK berisi terminal blok — di sana semua sambungan disolder langsung ke kabel 4-core (masuk via gland PG7), karena titik bongkar-pasangnya sudah diwakili soket GX16. Tata letak di dalam control box:

| TB | Posisi dalam control box |
|----|--------------------------|
| TB-A | Tengah, berdampingan dengan LM2596 dan relay (pusat distribusi daya) |
| TB-B + TB-C | Berdampingan, dekat soket GX16-A di muka ATAS box (TB-C wajib menempel TB-B karena menerima jalur ECHO) |
| TB-D | Dekat soket GX16-B di muka BAWAH box |
| TB-E | Dekat panel depan, di belakang ketiga lampu pilot |

**Warna kabel AWG24:** MERAH = tegangan positif (semua level; beri label "9V"/"5V"/"3V3" di ujungnya) · HITAM = GND · KUNING = sinyal masuk ke ESP32 (ECHO, DT) · PUTIH = sinyal keluar dari ESP32 (TRIG, SCK).

**Ujung kabel di terminal:** kupas ±7 mm, pilin rapat, jepit langsung di sekrup terminal — jangan dilapisi timah/solder (lapisan timah lambat laun mengendur di jepitan sekrup). **[rangkap]** = dua kabel AWG24 dipilin menjadi satu jepitan, khusus jalur berarus besar (printer). **[jumper]** = kabel pendek penghubung antar baris terminal.

---

## 4. Pinout ESP32 DevKit V1 — Peta Lengkap

### Sisi kiri (atas → bawah, sesuai gambar pinout-mu)

| Pin | GPIO | Sambungan | Ket. |
|-----|------|-----------|------|
| EN | — | *(kosong)* | |
| VP | 36 | *(kosong — cadangan input)* | |
| VN | 39 | Printer DTR — **OPSIONAL, baca §9 dulu** | Input-only |
| D34 | 34 | ECHO 3,3V ← **TB-C 2A** [kuning] | Input-only, via divider |
| D35 | 35 | HX711 DT ← **TB-D 2A** [kuning] | Input-only |
| D32 | 32 | HX711 SCK → **TB-D 3A** [putih] | |
| D33 | 33 | TFT RESET [putih] | Langsung ke modul TFT |
| D25 | 25 | Relay IN [putih] | Langsung ke modul relay |
| D26 | 26 | TRIG → **TB-B 3A** [putih] | |
| D27 | 27 | TFT DC/RS [putih] | Langsung ke modul TFT |
| D14 | 14 | Tombol MERAH (TIDAK) — kontak NO [kuning] | `INPUT_PULLUP` |
| D12 | 12 | **JANGAN DIPAKAI** | Strapping pin (tegangan flash) |
| D13 | 13 | Tombol HIJAU (YA) — kontak NO [kuning] | `INPUT_PULLUP` |
| GND | — | → **TB-A 6B** [hitam] | GND utama ESP32 |
| VIN | — | ← **TB-A 9B** [merah "5V"] | Suplai 5,1V |

### Sisi kanan (atas → bawah)

| Pin | GPIO | Sambungan | Ket. |
|-----|------|-----------|------|
| D23 | 23 | TFT SDI (MOSI), lalu Y-splice → SD MOSI | Bus SPI bersama |
| D22 | 22 | IN2 relay 4ch (lampu KUNING) [putih] | Langsung ke modul |
| TX0 | 1 | *(kosong — khusus USB/flash)* | |
| RX0 | 3 | *(kosong — khusus USB/flash)* | |
| D21 | 21 | IN1 relay 4ch (lampu HIJAU) [putih] | Langsung ke modul |
| D19 | 19 | SD MISO **saja** — SDO TFT DIBIARKAN KOSONG | |
| D18 | 18 | TFT SCK, lalu Y-splice → SD SCK | Bus SPI bersama |
| D5 | 5 | TFT CS [putih] | Idle HIGH saat boot ✓ |
| TX2 | 17 | → Printer RXD [putih] | UART2 |
| RX2 | 16 | ← Printer TXD — **OPSIONAL, baca §9 dulu** | UART2 |
| D4 | 4 | IN3 relay 4ch (lampu MERAH) [putih] | Langsung ke modul |
| D2 | 2 | **KOSONG — jangan dibebani input relay/opto** | Strapping pin; beban pull-up mengganggu flashing |
| D15 | 15 | SD CS [putih] | Pull-up internal saat boot ✓ |
| GND | — | COM tombol HIJAU & COM tombol MERAH (daisy-chain) [hitam] | |
| 3V3 | — | → **TB-A 11A** [merah "3V3"] | Sumber rail 3,3V |

> **Y-splice** (GPIO23 dan GPIO18 masing-masing menuju 2 modul): solder percabangan di tengah kabel, tutup heatshrink. Jaga total panjang jalur SPI **< 15 cm** dari ESP32 ke TFT maupun SD.

---

## 5. Terminal Blok

### TB-A (12 pin) — DISTRIBUSI DAYA

| Baris | Jalur | Sisi A | Sisi B |
|-------|-------|--------|--------|
| 1 | **+9V masuk** | Jack DC (+) [merah, rangkap] | LM2596 IN+ [merah] · jumper → 2B [merah, rangkap] |
| 2 | **+9V distribusi** | Relay printer COM [merah, rangkap] | jumper ← 1B · kabel → COM1 relay 4ch (suplai lampu) [merah] |
| 3 | **VH printer** (9V ter-saklar) | Relay printer NO [merah, rangkap] | Printer VH [merah, rangkap] · kaki (+) Elco 2200µF |
| 4 | **GND printer** | kaki (−) Elco 2200µF · jumper → 5A [hitam] | Printer GND [hitam, rangkap] *(GND power & GND TTL printer dipilin & dijepit jadi satu)* |
| 5 | **GND utama** | jumper ← 4A · Jack DC (−) [hitam, rangkap] | LM2596 IN− [hitam] · jumper → 6B [hitam] |
| 6 | **GND 5V** | LM2596 OUT− [hitam] · jumper → 7A [hitam] | jumper ← 5B · ESP32 GND (pin kiri) [hitam] |
| 7 | **GND modul** | jumper ← 6A · TFT GND [hitam] | SD GND [hitam] · jumper → 8B [hitam] |
| 8 | **GND sensor** | kabel → TB-B 2A [hitam] · GX16-B pin 2 (GND bawah) [hitam] | jumper ← 7B · jumper → 12B [hitam] |
| 9 | **+5V (1)** | LM2596 OUT+ [merah] · jumper → 10A [merah] | ESP32 VIN [merah] · TFT VCC [merah] |
| 10 | **+5V (2)** | jumper ← 9A · {Relay printer DC+ + Relay 4ch VCC, dipilin jadi satu} [merah] | SD VCC [merah] · kabel → TB-B 1A [merah] |
| 11 | **+3V3** | ESP32 pin 3V3 [merah "3V3"] | TFT LED (backlight) [merah "3V3"] · kabel → TB-D 1A [merah "3V3"] |
| 12 | **GND relay & lampu** | Relay 4ch GND [hitam] · kabel → TB-E 1A [hitam] | jumper ← 8B · Relay printer DC− [hitam] |

> **Elco 2200µF** dijepit langsung di baris 3–4 (perhatikan polaritas: + di baris 3, − di baris 4; sarungi kaki dengan heatshrink, sisakan ujungnya saja untuk dijepit sekrup). **Elco 470µF** TIDAK di terminal — solder langsung menumpang di terminal OUT LM2596 (+ di OUT+, − di OUT−).

### TB-B (4 pin) — BAGIAN ATAS (HC-SR04)

| Baris | Jalur | Sisi A | Sisi B |
|-------|-------|--------|--------|
| 1 | +5V atas | kabel ← TB-A 10B [merah] | GX16-A pin 1 [merah] |
| 2 | GND atas | kabel ← TB-A 8A [hitam] · kabel → TB-C 3A [hitam] | GX16-A pin 2 [hitam] |
| 3 | TRIG | ESP32 GPIO26 [putih] | GX16-A pin 3 [putih] |
| 4 | ECHO (level 5V) | kabel → TB-C 1A [kuning] | GX16-A pin 4 [kuning] |

### TB-C (3 pin) — PEMBAGI TEGANGAN ECHO

| Baris | Jalur | Sisi A | Sisi B |
|-------|-------|--------|--------|
| 1 | ECHO 5V | kabel ← TB-B 4A [kuning] | kaki resistor **1kΩ** (melintang ke 2B) |
| 2 | ECHO 3,3V | kabel → ESP32 GPIO34 [kuning] | kaki resistor 1kΩ (dari 1B) · kaki resistor **2kΩ** (melintang ke 3B) |
| 3 | GND | kabel ← TB-B 2A [hitam] | kaki resistor 2kΩ (dari 2B) |

> Kedua resistor terpasang "melintang" antar baris di sisi B. Tekuk ujung kaki resistor membentuk kait (bentuk J) agar jepitan sekrup kokoh dan tidak lolos. Hasil: 5V × 2k/(1k+2k) = **3,33V** → aman untuk GPIO34.

### TB-D (3 pin) — BAGIAN BAWAH (HX711)

| Baris | Jalur | Sisi A | Sisi B |
|-------|-------|--------|--------|
| 1 | +3V3 bawah | kabel ← TB-A 11B [merah "3V3"] | GX16-B pin 1 [merah] |
| 2 | DT | kabel → ESP32 GPIO35 [kuning] | GX16-B pin 3 [kuning] |
| 3 | SCK | kabel ← ESP32 GPIO32 [putih] | GX16-B pin 4 [putih] |

> GND bagian bawah (GX16-B pin 2) tidak lewat TB-D (barisnya habis) — langsung ke **TB-A 8A**, sudah tercantum di tabel TB-A.

### TB-E (3 pin) — LAMPU STATUS (jalur balik X2 → GND)

| Baris | Jalur | Sisi A | Sisi B |
|-------|-------|--------|--------|
| 1 | GND lampu | kabel ← TB-A 12A [hitam] · jumper → 2A [hitam] | X2 lampu HIJAU [hitam] |
| 2 | GND lampu | jumper ← 1A · jumper → 3A [hitam] | X2 lampu KUNING [hitam] |
| 3 | GND lampu | jumper ← 2A | X2 lampu MERAH [hitam] |

> Ketiga baris TB-E kini satu jalur GND yang sama (di-jumper berantai di sisi A). Terminal **X1** tiap lampu TIDAK lewat terminal blok — langsung dikabeli dari kontak **NO1/NO2/NO3** modul relay 4 channel (lihat §11d).

---

## 6. Soket GX16-5 & Kabel Antar Bagian

### GX16-A — BAGIAN ATAS (pasang soket di **sisi/permukaan ATAS control box**)

| Pin | Jalur | Warna kabel 4-core |
|-----|-------|--------------------|
| 1 | +5V | Merah |
| 2 | GND | Hitam |
| 3 | TRIG | Putih |
| 4 | ECHO (5V mentah) | Kuning |
| 5 | Cadangan (mis. DS18B20 kelak) | — |

### GX16-B — BAGIAN BAWAH (pasang soket di **sisi/permukaan BAWAH control box**)

| Pin | Jalur | Warna kabel 4-core |
|-----|-------|--------------------|
| 1 | +3V3 | Merah |
| 2 | GND | Hitam |
| 3 | DT (data HX711) | Kuning |
| 4 | SCK (clock HX711) | Putih |
| 5 | Cadangan | — |

> ⚠️ **Risiko tertukar colokan:** kedua soket identik secara fisik. Jika kabel ATAS tercolok ke soket BAWAH, ECHO 5V akan melawan output GPIO32 — bisa merusak ESP32. Mitigasi wajib: (1) soket atas di muka atas box, soket bawah di muka bawah box — orientasi alami mencegah salah colok; (2) label besar "ATAS" / "BAWAH" di soket dan di steker; (3) selongsong kabel beda warna bila ada.

Kabel antar bagian: pilin 4 kabel AWG24 (merah-hitam-putih-kuning) jadi satu bundel rapi per bagian, panjang secukupnya + kelonggaran 15 cm. Ujung box kecil masuk lewat **cable gland PG7** (#1 untuk kotak sensor atas, #2 untuk kotak HX711 bawah); ujung control box disolder ke steker GX16 (bukan gland — soketnya panel-mount).

---

## 7. Bagian ATAS — Sensor Tinggi (HC-SR04)

| HC-SR04 | Sambungan |
|---------|-----------|
| VCC | Kabel merah → steker GX16-A pin 1 |
| GND | Kabel hitam → steker GX16-A pin 2 |
| TRIG | Kabel putih → steker GX16-A pin 3 |
| ECHO | Kabel kuning → steker GX16-A pin 4 |

Catatan mekanis & akurasi:
- Sensor menghadap **lurus ke bawah**, kedua tabung transduser bebas halangan minimal Ø10 cm; jauhkan ±3 cm dari permukaan tiang agar tidak ada gema samping.
- Ukur dan catat **tinggi persis muka sensor dari lantai** (misal 199,5 cm) → konstanta firmware `H_SENSOR`. Tinggi badan = `H_SENSOR − jarak_terukur`.
- Rambut menyerap ultrasonik → gunakan **median dari 15 pembacaan** di firmware, dan idealnya sediakan papan datar ringan yang ditaruh di puncak kepala saat mengukur (praktik standar antropometri).
- Pin 5 GX16 dicadangkan untuk sensor suhu DS18B20 kelak (kompensasi kecepatan suara, ±0,17%/°C) — untuk skrining, tanpa kompensasi pun masih dalam toleransi ±1 cm.

---

## 8. Bagian BAWAH — Timbangan (HX711 + Load Cell 200 kg)

### 8a. Identifikasi kabel load cell — WAJIB sebelum menyambung

Warna Hitam/Oranye/Hijau/Abu-abu **tidak standar antar pabrikan**. Verifikasi dengan multimeter (mode ohm):

1. Ukur resistansi semua kombinasi pasangan (6 kombinasi).
2. **Pasangan dengan resistansi TERBESAR** (biasanya ±400–410 Ω) = **eksitasi** → E+ dan E−.
3. **Dua kabel sisanya** (biasanya ±350 Ω antar keduanya) = **sinyal** → A+ dan A−.
4. Polaritas awal bebas. Nanti saat uji: jika angka **negatif ketika dibebani**, cukup **tukar A+ ↔ A−**.

Pemetaan yang paling sering dijumpai (verifikasi tetap wajib): Oranye = E+, Hitam = E−, Hijau = A+, Abu-abu = A−.

### 8b. Sambungan HX711 (modul diletakkan dalam kotak kecil di bagian bawah, dekat load cell)

| HX711 P2 (analog) | Load cell | | HX711 P1 (digital) | Kabel 4-core → GX16-B |
|---|---|---|---|---|
| E+ | Kabel eksitasi + | | VCC | Merah → pin 1 (3,3V) |
| E− | Kabel eksitasi − | | GND | Hitam → pin 2 |
| A+ | Kabel sinyal + | | DT | Kuning → pin 3 |
| A− | Kabel sinyal − | | SCK | Putih → pin 4 |
| B+, B− | **KOSONG** (channel B tidak dipakai) | | | |

Catatan:
- Kabel load cell → HX711 sependek mungkin (< 20 cm), jangan disambung-sambung.
- Load cell single-point 200 kg dipasang "sandwich" antara dua pelat kaku; beban harus jatuh di **titik tengah area platform** sesuai tanda panah pada bodi load cell. Kapasitas 200 kg aman untuk balita maupun pendamping dewasa; resolusi tetap memadai (±20–50 g setelah perataan firmware).
- Kotak HX711 diberi cable gland PG7 untuk kabel 4-core yang menuju control box.

---

## 9. Printer Thermal QR204

| Konektor printer | Sambungan | Status |
|---|---|---|
| POWER · VH | **TB-A 3B** [merah rangkap] | Wajib |
| POWER · GND | Digabung dengan TTL GND (dipilin jadi satu) → **TB-A 4B** [hitam rangkap] | Wajib |
| POWER · NC | Kosong | — |
| TTL · GND | Dipilin jadi satu dengan GND power di atas | Wajib |
| TTL · RXD | ← ESP32 GPIO17 (TX2) [putih] | Wajib (jalur cetak) |
| TTL · TXD | → ESP32 GPIO16 (RX2) | **Opsional** — lihat prosedur di bawah |
| TTL · DTR | → ESP32 GPIO39 (VN) | **Opsional** — lihat prosedur di bawah |
| TTL · NC | Kosong | — |

**Prosedur TXD & DTR (lindungi ESP32):** level logika TXD/DTR QR204 berbeda-beda antar batch (3,3V atau 5V). Sebelum menyambung: nyalakan printer sendirian (VH 9V), ukur tegangan TXD saat idle dan DTR terhadap GND. Jika **≤ 3,4V** → sambungkan langsung. Jika **±5V** → JANGAN sambung langsung; tambahkan pembagi 1kΩ/2kΩ (beli lagi) per jalur, atau biarkan kosong. Tanpa TXD/DTR alat tetap berfungsi penuh — cetak memakai jeda waktu di firmware.

**Urutan firmware saat mencetak:** GPIO17 di-set LOW saat printer mati (jangan menyuntik 3,3V ke printer yang tidak berdaya) → Relay ON → tunggu 1,5–2 detik (printer boot) → inisialisasi `Serial2` (baud 9600, cek self-test: tahan tombol FEED sambil beri daya untuk melihat baud asli) → kirim data ESC/POS → tunggu selesai → tutup `Serial2`, GPIO17 LOW → Relay OFF.

Temuanmu benar dan kini terjelaskan: di 5V printer kekurangan headroom arus untuk memanaskan head → **VH tetap 9V langsung dari adaptor** (lewat relay), dengan Elco 2200µF sebagai penyangga lonjakan.

---

## 10. TFT 3,5" ILI9488 & Modul microSD (bus SPI bersama)

| Pin TFT | Sambungan | | Pin SD | Sambungan |
|---|---|---|---|---|
| VCC | TB-A 9B (5V) | | VCC | TB-A 10B (5V) |
| GND | TB-A 7A | | GND | TB-A 7B |
| CS | GPIO5 | | CS | GPIO15 |
| RESET | GPIO33 | | SCK | Y-splice dari GPIO18 |
| DC/RS | GPIO27 | | MOSI | Y-splice dari GPIO23 |
| SDI (MOSI) | GPIO23 | | MISO | GPIO19 (eksklusif) |
| SCK | GPIO18 | | | |
| LED | TB-A 11B (3,3V) | | | |
| **SDO (MISO)** | **TIDAK DISAMBUNG — biarkan kosong** | | | |

- SDO TFT yang kosong adalah **kunci** kestabilan bus bersama — jangan "dirapikan" dengan menyambungkannya.
- Modul TFT 9-pin umumnya punya regulator onboard → VCC 5V benar. Bila board-mu varian langka tanpa regulator (tertulis "3.3V only"), pindahkan VCC ke baris 3V3 (TB-A 11B).
- microSD: gunakan kartu class 10 ≤32 GB, format **FAT32** penuh sebelum dipakai.

---

## 11. Tombol Arcade & Lampu Status (via Modul Relay 4 Channel)

### 11a. Tombol — masing-masing punya terminal COM, NC, NO

| Terminal tombol | Sambungkan ke | Kabel |
|---|---|---|
| COM tombol HIJAU | COM tombol MERAH (daisy-chain antar tombol) | hitam |
| COM tombol MERAH | lanjut ke **pin GND kanan ESP32** | hitam |
| NO tombol HIJAU (jawab **YA**) | ESP32 GPIO13 | kuning |
| NO tombol MERAH (jawab **TIDAK**) | ESP32 GPIO14 | kuning |
| NC tombol HIJAU | **KOSONG** | — |
| NC tombol MERAH | **KOSONG** | — |

Firmware: `INPUT_PULLUP`, aktif LOW, debounce 30–50 ms. Jika tombolmu ada LED bawaan, biarkan dulu (bisa disusulkan ke 5V + resistor).

### 11b. Apa itu X1 dan X2 pada lampu pilot?

X1 dan X2 adalah **penandaan standar dua terminal lampu indikator/pilot lamp** (dipakai lintas merek, termasuk seri AD16-22 yang umum di pasaran). Konvensinya: **X1 = terminal masuk tegangan (+), X2 = terminal balik (−)**. Di alat ini X1 menerima 9V dari kontak relay, dan X2 pulang ke GND lewat TB-E. Banyak lampu AD16 12V adalah tipe AC/DC (penurun resistor) yang tidak peka polaritas; kalau ternyata lampumu peka dan tidak menyala saat diuji, cukup tukar kabel X1↔X2 lampu itu — aman.

### 11c. Modul relay 4 channel — sisi kontrol (GND, IN1–IN4, VCC)

Modul dipasang bersebelahan dengan relay printer, dekat TB-A. Penomoran channel: **channel 1 = terminal paling KIRI**.

| Pin modul | Sambungkan ke | Kabel |
|---|---|---|
| VCC | TB-A 10A — dipilin jadi satu dengan DC+ relay printer | merah "5V" |
| GND | TB-A 12A | hitam |
| IN1 | ESP32 GPIO21 | putih |
| IN2 | ESP32 GPIO22 | putih |
| IN3 | ESP32 GPIO4 | putih |
| IN4 | **KOSONG** (channel 4 = cadangan) | — |

### 11d. Modul relay 4 channel — sisi kontak, dan lampu

| Terminal | Sambungkan ke | Kabel |
|---|---|---|
| COM1 | kabel dari TB-A 2B (suplai 9V lampu) | merah "9V" |
| COM2 | jumper pendek dari COM1 | merah |
| COM3 | jumper pendek dari COM2 | merah |
| NO1 | **X1 lampu HIJAU** (NORMAL) | merah |
| NO2 | **X1 lampu KUNING** (WASPADA) | merah |
| NO3 | **X1 lampu MERAH** (STUNTING) | merah |
| X2 lampu HIJAU | TB-E 1B | hitam |
| X2 lampu KUNING | TB-E 2B | hitam |
| X2 lampu MERAH | TB-E 3B | hitam |
| NC1, NC2, NC3 dan NO4/COM4/NC4 | **KOSONG** | — |

Hanya satu lampu menyala pada satu waktu (satu kategori hasil), jadi beban koil di rail 5V kecil. Bunyi "klik" saat lampu berganti itu normal (relay mekanik).

---

## 12. Modul Relay 1 Channel (Saklar Printer)

| Pin relay | Sambungan |
|---|---|
| DC+ | TB-A 10A (5V — dipilin jadi satu dengan VCC relay 4ch) |
| DC− | TB-A 12B |
| IN | GPIO25 (langsung) |
| COM | TB-A 2A (9V) [rangkap] |
| NO | TB-A 3A (→ VH printer) [rangkap] |
| NC | Kosong |

Saat commissioning, tentukan polaritas trigger KEDUA modul relay (printer & lampu — biasanya sama): banyak modul opto **aktif-LOW** (GPIO LOW = relay ON). Uji dulu, lalu sesuaikan `RELAY_ON`/`RELAY_OFF` di firmware. Bila relay "setengah aktif" saat GPIO HIGH (kasus langka modul low-trigger + logika 3,3V), set pin ke `INPUT` sebagai kondisi OFF.

---

## 13. Verifikasi Desain (hasil simulasi rangkaian)

| Titik rawan | Risiko | Penanganan di desain ini |
|---|---|---|
| Bus SPI TFT+SD | Modul SD tidak melepas MISO → layar/kartu kacau | SDO TFT tidak disambung; MISO eksklusif SD |
| ESP32 tidak toleran 5V | Kerusakan GPIO | ECHO lewat divider; HX711 di 3,3V; TXD/DTR printer diukur dulu |
| Strapping pin boot | Gagal boot / gagal flash | GPIO12 & GPIO2 dikosongkan (input opto relay menarik pin ke atas — di GPIO2 ini bisa menggagalkan flashing, maka lampu MERAH ditempatkan di GPIO4); SD CS di GPIO15 (pull-up saat boot); TFT CS di GPIO5 |
| Lonjakan arus printer ±2A | Brown-out, ESP32 restart | Relay memutus VH saat idle; Elco 2200µF di terminal printer; firmware tidak melakukan kirim WiFi saat mencetak |
| Sinyal analog load cell | Drift/noise → berat tidak stabil | HX711 di bagian bawah; GX16 hanya membawa sinyal digital |
| Salah colok GX16 | ECHO 5V melawan GPIO output | Soket atas di muka atas box, bawah di muka bawah + label |
| Drop AMS1117 onboard ESP32 | 3,3V turun saat WiFi aktif | LM2596 disetel 5,10V |
| Budget adaptor 9V 2A | Puncak cetak + WiFi mendekati limit | Manajemen daya via relay + larangan cetak-sambil-kirim (adaptor tetap 9V — jangan pernah diganti 12V) |

---

## 14. Urutan Perakitan & Commissioning

1. **Set LM2596 dulu, tanpa beban:** beri 9V di IN, putar trimpot sampai OUT = **5,10V**. Kunci trimpot dengan setetes cat kuku/threadlock.
2. Pasang semua TB, modul (standoff), soket panel (jack DC, GX16 ×2, tombol, lampu, printer, TFT) di box. Kedua modul relay (1 channel & 4 channel) dipasang bersebelahan dekat TB-A.
3. Kabeli **jalur daya saja** (TB-A lengkap, kedua relay, lampu) — ESP32, TFT, SD, printer **belum dipasang**.
4. Uji daya: colok adaptor → ukur TB-A: baris 1 = 9V, baris 9/10 = 5,1V, baris 3 = 0V (relay off). Jumper sesaat IN relay printer ke GND/5V (sesuai trigger) → baris 3 harus 9V. Uji IN1–IN3 relay lampu dengan cara yang sama → lampu hijau/kuning/merah harus menyala bergantian.
5. Matikan. Pasang ESP32 (belum modul lain), flash program uji pin (blink lampu, baca tombol). Verifikasi ketiga lampu & kedua tombol.
6. Pasang TFT + SD → uji tampilan & tulis/baca file. Pasang printer → uji cetak "TEST" (relay ON otomatis dari firmware).
7. Rakit bagian ATAS & BAWAH, solder steker GX16 sesuai §6, colok → uji baca jarak & baca HX711 mentah.
8. Identifikasi load cell (§8a) **sebelum** menyambung ke HX711.
9. Uji integrasi penuh 30 menit: timbang-ukur-jawab kuesioner-cetak-kirim, sambil pantau ESP32 tidak pernah restart.

## 15. Kalibrasi

- **Berat:** tare (platform kosong) → letakkan beban acuan diketahui (mis. galon 19 L terisi yang sudah ditimbang di timbangan tersertifikasi, atau anak timbangan) → hitung `scale_factor = pembacaan_mentah / berat_kg`. Simpan faktor di NVS/SD. Ulangi 3 titik (±5, ±10, ±20 kg) untuk cek linearitas.
- **Tinggi:** ukur `H_SENSOR` dengan meteran pita dari lantai ke muka sensor. Validasi dengan benda tinggi diketahui (kotak 100 cm) di titik berdiri. Selisih > 1 cm → cek kemiringan sensor.
- Jadwalkan verifikasi ulang tiap 3 bulan (beban acuan + batang ukur) — tulis di SOP Posyandu.

## 16. Catatan Firmware

```cpp
// ==== PETA PIN (jangan diubah tanpa merevisi dokumen wiring) ====
#define PIN_SPI_MOSI   23   // TFT SDI + SD MOSI (Y-splice)
#define PIN_SPI_SCK    18   // TFT SCK + SD SCK  (Y-splice)
#define PIN_SPI_MISO   19   // SD MISO saja (SDO TFT tidak disambung)
#define PIN_TFT_CS      5
#define PIN_TFT_DC     27
#define PIN_TFT_RST    33
#define PIN_SD_CS      15
#define PIN_HX_DT      35   // input-only
#define PIN_HX_SCK     32
#define PIN_TRIG       26
#define PIN_ECHO       34   // input-only, sudah 3,3V via divider
#define PIN_PRN_TX     17   // -> RXD printer
#define PIN_PRN_RX     16   // <- TXD printer (opsional, lihat §9)
#define PIN_PRN_DTR    39   // <- DTR printer (opsional, lihat §9)
#define PIN_RELAY      25   // relay printer (1 channel)
#define PIN_BTN_YA     13   // tombol HIJAU, INPUT_PULLUP, aktif LOW
#define PIN_BTN_TIDAK  14   // tombol MERAH, INPUT_PULLUP, aktif LOW
#define PIN_LAMP_HIJAU  21  // IN1 relay 4ch
#define PIN_LAMP_KUNING 22  // IN2 relay 4ch
#define PIN_LAMP_MERAH   4  // IN3 relay 4ch — pindah dari GPIO2 (strapping)
```

- **TFT_eSPI User_Setup:** `ILI9488_DRIVER`, `TFT_MISO -1`, `SPI_FREQUENCY 27000000`. Panggil `tft.init()` **sebelum** `SD.begin(PIN_SD_CS)`. Jangan aktifkan DMA TFT selama akses SD.
- **Timbangan:** rata-rata 10–15 sampel HX711, deteksi kestabilan (variasi < 50 g selama 2 detik) sebelum mengunci nilai. **Tinggi:** median 15 ping HC-SR04, buang outlier, timeout `pulseIn` 30 ms.
- **Kategori NORMAL/WASPADA/STUNTING:** jangan pakai ambang tinggi mentah — stunting dinilai dari **z-score TB/U standar WHO**, yang butuh **umur (bulan) dan jenis kelamin**. Kumpulkan keduanya lewat alur kuesioner tombol YA/TIDAK (mis. pilih rentang umur bertahap), simpan tabel LMS WHO di SD/SPIFFS.
- **Antrian offline:** setiap hasil → tulis dulu ke SD sebagai `/antrian/<epoch>.json`, lalu coba HTTP POST; sukses → pindah ke `/terkirim/`. Task background mengirim ulang isi `/antrian/` tiap kali WiFi tersambung. Sinkronkan jam via NTP saat online; simpan waktu valid terakhir ke NVS agar penamaan berkas antrian tetap berurutan selama offline.
- **Larangan bersamaan:** jangan cetak sambil melakukan kirim WiFi (dua beban arus terbesar).
- **Relay lampu:** hanya satu channel menyala pada satu waktu (satu kategori). Set ketiga pin IN ke kondisi OFF di baris-baris pertama `setup()` agar lampu tidak berkedip saat boot, dan samakan logika ON/OFF dengan hasil uji polaritas trigger di §12.

## 17. Checklist Sebelum Power-On Pertama

- [ ] LM2596 sudah terkunci di 5,10V (diukur tanpa beban)
- [ ] Polaritas jack DC benar (+ tengah, cek adaptormu)
- [ ] Elco 2200µF: + di TB-A 3, − di TB-A 4 (terbalik = meledak)
- [ ] SDO TFT kosong · GPIO12 & GPIO2 kosong · TX0/RX0 kosong
- [ ] Ohm-meter: tidak ada hubung singkat 9V–GND, 5V–GND, 3V3–GND, 9V–5V
- [ ] Semua sekrup terminal kencang; tarik ringan tiap kabel (pull test)
- [ ] Label "ATAS"/"BAWAH" di kedua GX16 & stekernya
- [ ] Load cell sudah diverifikasi pasangan E/A dengan multimeter
- [ ] Kartu SD FAT32 terpasang

---

*Dokumen ini adalah acuan tunggal wiring. Setiap perubahan pin/jalur wajib memperbarui dokumen ini terlebih dahulu.*
