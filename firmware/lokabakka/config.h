#pragma once

// ==== WiFi ====
// ponytail: ganti dengan kredensial WiFi posyandu sebelum flashing.
#define WIFI_SSID     "Padil"
#define WIFI_PASSWORD "anjay0987"

// ==== Backend API ====
// ponytail: ganti dengan domain deployment web (mis. Vercel) dan API key
// yang sama dengan env ESP32_API_KEY di server.
// Harus pakai host www: lokabakka.my.id membalas 308 redirect, dan HTTPClient
// tidak mengikuti redirect sehingga body-nya HTML "Redirecting..." bukan JSON.
#define API_BASE_URL  "https://www.lokabakka.my.id/api"
#define ESP32_API_KEY "akusayangazizi"
#define DEVICE_ID     "esp32-01"

// ==== Pin TFT (ILI9488 480x320) ====
// CATATAN: nilai di bawah TIDAK dibaca kode manapun — TFT_eSPI ambil semua pin
// (MOSI/SCLK/MISO + CS/DC/RST) dari User_Setup.h di folder library. Ini cuma
// dokumentasi wiring; kalau diubah, ubah juga User_Setup.h atau layar putih.
#define PIN_TFT_CS   5
#define PIN_TFT_DC   27
#define PIN_TFT_RST  33

// ==== Pin Printer thermal (Serial2, 58mm, ESC/POS) ====
#define PIN_PRN_TX   17
#define PIN_PRN_RX   16
#define PIN_PRN_RELAY 25  // relay daya printer — tanpa ini printer mati total
// Relay printer ini aktif-HIGH (beda modul dari relay 4ch lampu di bawah).
#define PRN_RELAY_ON  HIGH
#define PRN_RELAY_OFF LOW

// ==== Pin Tombol ====
// Sesuai wiring §4 & §11a: NO tombol MERAH → GPIO14, NO tombol HIJAU → GPIO13.
#define PIN_BTN_SATU 14   // tombol (1) - merah - tidak / ulangi / ganti pilihan
#define PIN_BTN_DUA  13   // tombol (2) - hijau - ya / lanjut / pilih

// ==== Pin Lampu Status (via Modul Relay 4 Channel) ====
// Sesuai wiring §11c & §16 — IN1/IN2/IN3 relay 4ch
// CATATAN: pemetaan diverifikasi lewat lampTest saat boot, bukan dari §16 —
// kabel IN modul relay ternyata tak terpasang seperti dokumen. Nilai di bawah
// mengikuti lampu yang benar-benar menyala; kalau modul/kabel diganti,
// verifikasi ulang dengan urutan boot harus hijau → kuning → merah.
#define PIN_LAMP_HIJAU   22  // lampu HIJAU  (NORMAL)
#define PIN_LAMP_KUNING   4  // lampu KUNING (PRA STUNTING)
#define PIN_LAMP_MERAH   21  // lampu MERAH  (STUNTING)
//
// RELAY_ON / RELAY_OFF: Sebagian besar modul optocoupler 5V aktif-LOW.
// Jika lampu tidak merespons benar, tukar nilai keduanya.
#define RELAY_ON   LOW   // GPIO LOW  → relay ON  → lampu menyala
#define RELAY_OFF  HIGH  // GPIO HIGH → relay OFF → lampu mati

// ==== Pin Sensor (wiring §16) ====
#define PIN_HX_DT    35   // HX711 DT  ← TB-D 2A (input-only)
#define PIN_HX_SCK   32   // HX711 SCK → TB-D 3A
#define PIN_TRIG     26   // HC-SR04 TRIG → TB-B 3A
#define PIN_ECHO     34   // HC-SR04 ECHO ← TB-C 2A (input-only, 3,3V via divider)
#define PIN_SD_CS    15   // microSD CS (SPI berbagi bus dengan TFT, MISO di 19)

// ==== Mode Uji Tanpa Sensor ====
// 1 = HX711 & HC-SR04 tidak disentuh sama sekali, pengukuran memakai angka
// tetap di bawah. Dipakai untuk menguji alur layar, skoring server, lampu, dan
// struk sebelum sensor terpasang. Lihat skenario.md di akar proyek.
// WAJIB kembali ke 0 setelah sensor asli dipasang.
#define SENSOR_DUMMY 1
#define DUMMY_BB     12.4f
#define DUMMY_TB     85.0f

// ==== Kalibrasi Sensor (§15) — WAJIB disetel per unit alat ====
//
// HX_SCALE: pembacaan_mentah / berat_kg. Cara dapat: flash dulu dengan nilai
// apapun, buka Serial Monitor, taruh beban acuan yang sudah ditimbang (mis.
// galon 19 L), baca angka "[HX711] mentah" lalu bagi dengan berat aslinya.
// Tanda MINUS bila angka mengecil saat dibebani (arah load cell terbalik).
#define HX_SCALE     -7050.0f
//
// H_SENSOR: tinggi persis muka HC-SR04 dari lantai, dalam cm (§7).
// Tinggi badan = H_SENSOR − jarak terukur. Ukur pakai meteran pita.
#define H_SENSOR     199.5f

// ==== Ukuran layar ====
#define SCR_W 480
#define SCR_H 320

// ==== Palet warna (RGB565), dari spec 1t ====
#define COL_BG        0x1147  // #10283F latar
#define COL_PANEL     0x19CB  // #1A3A5A panel
#define COL_PANEL_ON  0x1A6F  // #1C4E7E panel aktif
#define COL_LINE      0x222D  // #24466A garis
#define COL_FOOTER    0x0906  // #0C2036 bar footer
#define COL_TEXT      0xFFFF  // #FFFFFF teks utama
#define COL_TEXT_2    0xCEDD  // #C9D9E8 teks isi
#define COL_TEXT_DIM  0x9DB9  // #9FB6CD teks redup
#define COL_INACTIVE  0x5391  // #51708F nonaktif
#define COL_ACCENT    0x4CFD  // #4D9FE8 aksen biru
#define COL_GREEN     0x3E51  // #38C98A hijau
#define COL_YELLOW    0xF5C9  // #F6B94B kuning
#define COL_RED       0xF32C  // #F26461 merah
