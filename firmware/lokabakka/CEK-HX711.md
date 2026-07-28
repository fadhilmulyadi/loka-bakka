# Panduan Cek & Perbaikan HX711 (Sensor Berat)

Runbook diagnosa saat `raw` timbangan tidak wajar. Ikuti berurutan — tiap
langkah menyempitkan penyebab. Jangan lompat ke kalibrasi sebelum `raw`
**bergoyang saat ditekan**.

---

## 0. Arti angka `raw` di Serial Monitor

| Bacaan `raw` | Arti |
|---|---|
| Angka **bergoyang** (mis. 8200, 8130, 8340…) | ✅ SEHAT. Sinyal hidup, siap kalibrasi. |
| `0` **persis, tanpa noise**, tetap saat ditekan | ❌ Sinyal tidak sampai ke ADC (DT / kontak / excitation). |
| `-1073741824` (0xC0000000) konstan | ❌ Input analog "mentok" rail — pasangan kabel salah / bridge railed. |
| Berubah antara `0` ↔ `-1073741824` saat tukar kabel | Analog terhubung tapi belum benar. Lanjut cek pasangan. |

> Load cell **sehat**: `raw` selalu ada **noise** (goyang sedikit) walau tanpa
> beban. `0.000` mati total = bukan bacaan asli.

---

## 1. Wiring pasangan kabel yang BENAR

Load cell 4 kawat = jembatan Wheatstone. Hanya **satu** cara pemasangan pasangan
yang benar. Pasangan yang benar untuk unit ini (terverifikasi lewat tes ohm):

| Pin HX711 | Kabel load cell |
|---|---|
| **E+** | Merah |
| **E−** | Hijau |
| **A+** | Putih |
| **A−** | Hitam |

- **Merah↔Hijau** satu diagonal (excitation), **Putih↔Hitam** diagonal lain (signal).
- Menukar A+↔A− hanya membalik tanda (tidak merusak). Menukar E dengan A =
  salah, `raw` akan mentok.
- Kalau warna kabelmu beda → tentukan pasangan lewat **tes ohm** (langkah 2).

---

## 2. Tes ohm load cell (memastikan cell tidak rusak)

**Cabut load cell dari HX711.** Multimeter mode **Ohm (Ω)**, range 200–2000Ω.
Ukur 6 kombinasi, catat:

| Pasangan | Ω |
|---|---|
| Merah–Hitam | |
| Merah–Putih | |
| Merah–Hijau | |
| Hitam–Putih | |
| Hitam–Hijau | |
| Putih–Hijau | |

**Cara baca:**
- **Tidak boleh ada** `OL`/tak hingga (= kawat putus) atau `0`Ω (= short).
  Kalau ada → **load cell RUSAK, ganti.**
- Cell sehat: **2 nilai tertinggi & kira-kira sama** = pasangan **E** dan **A**
  (dua diagonal). 4 nilai sisanya lebih kecil (~0.75× nilai diagonal).
- Contoh unit ini: Merah–Hijau ~340Ω & Hitam–Putih ~390Ω (dua tertinggi) →
  E = Merah/Hijau, A = Putih/Hitam. Sisanya ~260–305Ω.

---

## 3. Mode stream kalibrasi (lihat `raw` tanpa batas 3 detik)

Di `config.h`:
```c
#define HX_DEBUG_STREAM 1
```
Flash → Serial Monitor. `raw` tercetak **terus-menerus**, bisa menekan platform
sambil mengamati.

> ⚠️ **WAJIB balikin `HX_DEBUG_STREAM` ke `0`** setelah selesai — kalau 1, alat
> berhenti di sini dan tak pernah lanjut ke pengukuran normal.

---

## 4. Tes tekan (penentu hidup/mati)

Mode stream jalan, wiring benar (langkah 1):
1. **Tekan / dorong platform** sekuat mungkin.
2. Amati `raw`.

| Hasil | Kesimpulan | Aksi |
|---|---|---|
| `raw` **berubah** saat ditekan | ✅ Sensor hidup | Lanjut kalibrasi (langkah 9) |
| `raw` **diam** (0 / rail) | Beban tak sampai ke ADC | Lanjut langkah 5 |

---

## 5. Tes goyang jumper (paling cepat untuk setup male header + DuPont)

Penyebab #1 pada setup jumper: **crimp DuPont longgar** (kabel terlihat nyambung
tapi kontak dalam konektor putus).

Mode stream jalan, `raw` tercetak:
- **Goyang satu per satu** tiap jumper: E+ (Merah), E− (Hijau), A+ (Putih),
  A− (Hitam), DT, SCK.
- `raw` **melonjak/berubah** saat satu jumper digoyang → **itu jumper-nya jelek**,
  ganti / crimp ulang.

---

## 6. Cek mekanik load cell

Load cell batang harus dipasang **melengkung**, bukan datar:
- Satu ujung dibaut ke **rangka bawah**, ujung lain ke **platform**.
- **Harus ada celah/spacer** supaya batang bisa **menekuk** saat dibebani.
- Ada **panah arah beban** di body cell — pasang sesuai arah.
- Kalau platform "mentok" ke rangka (bottoming out) atau kedua ujung di
  permukaan sama → strain gauge tak menekuk → `raw` diam walau cell sempurna.

**Cek:** apakah batang benar-benar melentur saat platform ditekan?

---

## 7. Cek daya & ground (multimeter DC Volt, range 20V)

Alat menyala. **Jangan pakai range 1000V** (terlalu kasar).

| Cek | Probe merah | Probe hitam | Harusnya | Kalau salah |
|---|---|---|---|---|
| **Output LM2596** | OUT+ | OUT− | ~5V | Setel trimpot ke 5V (jangan >5V) |
| **VCC HX711** | pin VCC | pin GND | 5V (sama dgn LM2596) | Jumper VCC putus → ganti |
| **Ground bersama** | GND HX711 | GND ESP32 | ~0Ω (mode Ohm) | Sambungkan GND jadi satu jalur |
| **GND LM2596 ↔ ESP32** | OUT− LM2596 | GND ESP32 | ~0Ω (mode Ohm) | **WAJIB satu jalur**, sering terlewat |

> Multimeter tanpa fitur bip → pakai **mode Ohm range 200Ω**: **~0Ω = nyambung**,
> **`OL`/tak hingga = putus**.

---

## 8. Cek excitation & sinyal (kalau daya OK tapi `raw` masih diam)

### 8a. Excitation E+/E− — DC Volt range 20V, alat menyala
- Merah → **pin E+** (Merah), hitam → **pin E−** (Hijau).

| Bacaan | Kesimpulan |
|---|---|
| **~4.3V** (sedikit di bawah VCC) | HX711 menyuplai bridge, bagus → lanjut 8b |
| **0V** padahal VCC 5V | **Chip HX711 RUSAK**, ganti board HX711 |

### 8b. Sinyal A+/A− — DC **milivolt (mV)** range 200mV, alat menyala
Menguji sinyal analog langsung, melewati HX711:
- Merah → **pin A+** (Putih), hitam → **pin A−** (Hitam).
- Baca, lalu **tekan platform**.

| Bacaan | Kesimpulan | Aksi |
|---|---|---|
| mV **berubah** saat ditekan | ✅ Analog sehat, masalah di jalur DT/HX711 baca | Cek 8c |
| mV **diam** | Sinyal tak sampai | Cek continuity jumper A (8c) |

### 8c. Continuity jumper A & jalur DT/SCK — mode Ohm 200Ω, alat **MATI**

| Dari | Ke | Harusnya |
|---|---|---|
| pin A+ HX711 | ujung kabel Putih (sisi cell) | ~0Ω |
| pin A− HX711 | ujung kabel Hitam (sisi cell) | ~0Ω |
| pin DT HX711 | GPIO35 ESP32 | ~0Ω |
| pin SCK HX711 | GPIO32 ESP32 | ~0Ω |

`OL`/tak hingga di baris mana pun → **jumper itu putus, ganti.**

---

## 9. Kalibrasi (setelah `raw` bergoyang saat ditekan)

1. Mode stream jalan. Platform **kosong** → catat `raw` diam di sekitar nilai X.
2. Taruh **beban acuan** yang sudah ditimbang (mis. galon 19 L, atau dumbbell).
   Catat `raw` baru = Y.
3. Hitung:
   ```
   HX_SCALE = (Y − X) / berat_acuan_kg
   ```
4. Kalau `raw` **mengecil** saat dibebani → beri **tanda minus** pada HX_SCALE.
5. Isikan ke `config.h`:
   ```c
   #define HX_SCALE   <hasil>
   ```
6. **`HX_DEBUG_STREAM = 0`**, flash ulang.
7. Verifikasi: taruh beban acuan lagi, cek `[HX711] berat=…` menunjukkan kg yang
   benar. Selesai.

---

## Ringkasan alur cepat

```
raw diam/mentok?
 ├─ Tes ohm cell (2)      → OL/short? → GANTI CELL
 ├─ Mekanik melentur? (6) → tidak?    → perbaiki pemasangan
 ├─ Tes goyang jumper (5) → raw lonjak? → GANTI jumper itu
 ├─ Daya & ground (7)     → 0V / no-GND? → perbaiki daya/ground
 └─ Excitation E+/E− (8a) → 0V? → GANTI HX711
      └─ Sinyal A+/A− mV (8b) → diam? → cek jumper A (8c)
                              → berubah? → cek DT/SCK (8c)
```

**Fakta terverifikasi untuk unit ini:** load cell sehat (tes ohm), pasangan
benar = coba-3, LM2596 output 5.1V, ESP32 + HX711 (chip) hidup. Tersisa cek
excitation E+/E−, sinyal A+/A−, jalur DT, dan ground bersama LM2596↔ESP32.
****