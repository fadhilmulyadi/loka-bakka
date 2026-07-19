#pragma once

// ==== WiFi ====
// ponytail: ganti dengan kredensial WiFi posyandu sebelum flashing.
#define WIFI_SSID     "GANTI_SSID"
#define WIFI_PASSWORD "GANTI_PASSWORD"

// ==== Backend API ====
// ponytail: ganti dengan domain deployment web (mis. Vercel) dan API key
// yang sama dengan env ESP32_API_KEY di server.
#define API_BASE_URL  "https://ganti-domain-anda.example/api"
#define ESP32_API_KEY "GANTI_API_KEY"
#define DEVICE_ID     "esp32-01"

// ==== Pin TFT (ILI9488 480x320) ====
// MOSI/SCLK/MISO diatur di User_Setup.h milik library TFT_eSPI, bukan di sini.
#define PIN_TFT_CS   5
#define PIN_TFT_DC   27
#define PIN_TFT_RST  33

// ==== Pin Printer thermal (Serial2, 58mm, ESC/POS) ====
#define PIN_PRN_TX   17
#define PIN_PRN_RX   16

// ==== Pin Tombol ====
#define PIN_BTN_SATU 13   // tombol (1) - merah - tidak / ulangi / ganti pilihan
#define PIN_BTN_DUA  14   // tombol (2) - hijau - ya / lanjut / pilih

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
