#pragma once

#include <TFT_eSPI.h>
#include <WiFi.h>
#include "config.h"
// FreeFont GFXFF (FreeSans*) sudah di-include otomatis oleh TFT_eSPI.h karena
// LOAD_GFXFF aktif di User_Setup.h — jangan include manual, header-nya tidak
// punya guard dan akan bentrok "redefinition".

extern TFT_eSPI tft;

// FreeFont bawaan TFT_eSPI (Nimbus Sans) — pengganti font GLCD 5x7 yang kotak.
#define FONT_S  &FreeSans9pt7b
#define FONT_M  &FreeSans12pt7b
#define FONT_L  &FreeSansBold18pt7b
#define FONT_XL &FreeSansBold24pt7b

// setTextSize(1) wajib: FreeFont ikut dikali textSize, kalau nilai lama (mis. 4)
// tertinggal dari pemanggilan sebelumnya hurufnya jadi raksasa.
void setFont(const GFXfont* f) {
  tft.setTextSize(1);
  tft.setFreeFont(f);
}

// drawString tidak pernah wrap (setTextWrap hanya berlaku untuk print()), jadi
// teks panjang dipotong per kata di sini.
void drawWrapped(const String& teks, int x, int y, int maxW, int lineH) {
  tft.setTextDatum(TL_DATUM);
  String baris = "";
  int cy = y;
  int start = 0;
  while (true) {
    int spasi = teks.indexOf(' ', start);
    String kata = spasi < 0 ? teks.substring(start) : teks.substring(start, spasi);
    String coba = baris.length() ? baris + " " + kata : kata;
    if (tft.textWidth(coba) > maxW && baris.length()) {
      tft.drawString(baris, x, cy);
      cy += lineH;
      baris = kata;
    } else {
      baris = coba;
    }
    if (spasi < 0) break;
    start = spasi + 1;
  }
  if (baris.length()) tft.drawString(baris, x, cy);
}

// ---- Primitif bersama ----

void drawHeader(const String& title) {
  tft.fillRect(0, 0, SCR_W, 38, COL_BG);
  tft.drawFastHLine(0, 37, SCR_W, COL_LINE);
  tft.setTextColor(COL_TEXT, COL_BG);
  setFont(FONT_M);
  tft.setTextDatum(TL_DATUM);
  tft.drawString(title, 16, 9);
}

void drawFooter(const String& kiri, uint16_t kiriColor, const String& kanan, uint16_t kananColor) {
  tft.fillRect(0, 274, SCR_W, 46, COL_FOOTER);
  tft.drawFastHLine(0, 274, SCR_W, COL_LINE);
  setFont(FONT_S);
  tft.setTextDatum(ML_DATUM);

  if (kiri.length() > 0) {
    tft.fillCircle(27, 297, 11, kiriColor);
    tft.setTextColor(COL_TEXT_2, COL_FOOTER);
    tft.drawString(kiri, 46, 297);
  }
  if (kanan.length() > 0) {
    tft.setTextDatum(MR_DATUM);
    tft.setTextColor(COL_TEXT, COL_FOOTER);
    tft.drawString(kanan, SCR_W - 46, 297);
    tft.fillCircle(SCR_W - 27, 297, 11, kananColor);
  }
  tft.setTextDatum(TL_DATUM);
}

void clearContent() {
  tft.fillRect(0, 38, SCR_W, 236, COL_BG);
}

// ---- Layar 1a: Boot ----
void layarBoot() {
  tft.fillScreen(COL_BG);
  tft.setTextColor(COL_TEXT, COL_BG);
  tft.setTextDatum(MC_DATUM);
  setFont(FONT_XL);
  tft.drawString("Loka Bakka", SCR_W / 2, 140);
  setFont(FONT_S);
  tft.setTextColor(COL_TEXT_DIM, COL_BG);
  tft.drawString("Menghubungkan ke WiFi...", SCR_W / 2, 180);
  tft.setTextDatum(TL_DATUM);
}

// ---- Layar setup WiFi (portal aktif) ----
// Alat tidak punya keyboard, jadi SSID/sandi diketik dari HP. Layar ini satu-
// satunya petunjuk yang dilihat kader saat portal terbuka.
void layarSetupWifi(const String& apSsid, const String& apPass) {
  drawHeader("Setup WiFi");
  clearContent();

  tft.setTextDatum(TL_DATUM);
  setFont(FONT_S);
  tft.setTextColor(COL_TEXT_2, COL_BG);
  tft.drawString("1.  Buka pengaturan WiFi di HP", 26, 56);
  tft.drawString("2.  Sambungkan ke jaringan ini:", 26, 82);

  tft.fillRoundRect(46, 106, SCR_W - 92, 76, 12, COL_PANEL_ON);
  tft.setTextDatum(MC_DATUM);
  setFont(FONT_L);
  tft.setTextColor(COL_TEXT, COL_PANEL_ON);
  tft.drawString(apSsid, SCR_W / 2, 133);
  setFont(FONT_S);
  tft.setTextColor(COL_TEXT_DIM, COL_PANEL_ON);
  tft.drawString("sandi:  " + apPass, SCR_W / 2, 163);

  tft.setTextDatum(TL_DATUM);
  setFont(FONT_S);
  tft.setTextColor(COL_TEXT_2, COL_BG);
  tft.drawString("3.  Halaman setup terbuka sendiri.", 26, 200);
  tft.drawString("     Pilih WiFi posyandu, isi sandinya.", 26, 222);
  tft.setTextColor(COL_TEXT_DIM, COL_BG);
  tft.drawString("Kalau tidak terbuka, buka 192.168.4.1 di browser.", 26, 250);

  drawFooter("", COL_INACTIVE, "", COL_INACTIVE);
}

// ---- Layar 1b/1c: Pilih Kategori (sorotan: 0 = Anak, 1 = Ibu Hamil) ----
// Indikator WiFi. Digambar ulang berkala dari loop(), bukan sekali saat layar
// dibuat — kalau tidak, WiFi yang putus di tengah kegiatan tetap terlihat
// tersambung sampai kader kebetulan pindah layar.
// Hanya menyentuh dua pita sempit (header kanan + bawah kartu), jadi aman
// dipanggil berulang tanpa menggambar ulang seluruh layar.
//
// Sengaja TIDAK menampilkan alamat IP: WiFi posyandu memakai AP isolation,
// jadi alamat itu tidak pernah bisa dibuka dari HP. Memajangnya cuma memancing
// kader mencoba sesuatu yang mustahil.
void gambarStatusWifi() {
  bool ok = WiFi.status() == WL_CONNECTED;

  tft.fillRect(SCR_W - 210, 4, 194, 28, COL_BG);
  tft.fillCircle(SCR_W - 22, 18, 6, ok ? COL_GREEN : COL_RED);
  setFont(FONT_S);
  tft.setTextDatum(MR_DATUM);
  tft.setTextColor(ok ? COL_TEXT_DIM : COL_RED, COL_BG);
  tft.drawString(ok ? "Terhubung" : "Tidak terhubung", SCR_W - 38, 18);

  // Saat putus, beri satu tindakan yang jelas. "Tidak terhubung" saja membuat
  // kader menunggu sesuatu yang tidak akan pulih sendiri.
  tft.fillRect(0, 246, SCR_W, 26, COL_BG);
  if (!ok) {
    tft.setTextDatum(MC_DATUM);
    tft.setTextColor(COL_TEXT_DIM, COL_BG);
    tft.drawString("Nyalakan ulang alat untuk memilih WiFi", SCR_W / 2, 258);
  }
  tft.setTextDatum(TL_DATUM);
}

void layarPilihKategori(int sorotan) {
  drawHeader("Pilih Kategori");
  clearContent();
  gambarStatusWifi();

  int cardW = 210, cardH = 170;
  int gap = 16;
  int totalW = cardW * 2 + gap;
  int startX = (SCR_W - totalW) / 2;
  int y = 38 + (236 - cardH) / 2;

  const char* labels[2] = { "ANAK", "IBU HAMIL" };
  for (int i = 0; i < 2; i++) {
    int x = startX + i * (cardW + gap);
    bool aktif = (i == sorotan);
    tft.fillRoundRect(x, y, cardW, cardH, 14, aktif ? COL_PANEL_ON : COL_PANEL);
    if (aktif) tft.drawRoundRect(x, y, cardW, cardH, 14, COL_ACCENT);
    tft.setTextDatum(MC_DATUM);
    tft.setTextColor(aktif ? COL_TEXT : COL_TEXT_DIM, aktif ? COL_PANEL_ON : COL_PANEL);
    setFont(FONT_L);
    tft.drawString(labels[i], x + cardW / 2, y + cardH / 2);
  }
  tft.setTextDatum(TL_DATUM);

  drawFooter("GANTI PILIHAN", COL_RED, "PILIH", COL_GREEN);
}

// ---- Layar 1d: Ukur Berat & Tinggi ----
void layarUkur(float bb, float tb) {
  drawHeader("Ukur Berat & Tinggi Badan");
  clearContent();

  int midX = SCR_W / 2;
  tft.drawFastVLine(midX, 58, 200, COL_LINE);

  tft.setTextDatum(MC_DATUM);

  setFont(FONT_S);
  tft.setTextColor(COL_TEXT_DIM, COL_BG);
  tft.drawString("BERAT BADAN", midX / 2, 90);
  tft.drawString("TINGGI BADAN", midX + midX / 2, 90);

  setFont(FONT_XL);
  tft.setTextColor(COL_TEXT, COL_BG);
  tft.drawString(String(bb, 1) + " kg", midX / 2, 145);
  tft.drawString(String(tb, 1) + " cm", midX + midX / 2, 145);

  setFont(FONT_S);
  tft.setTextColor(COL_GREEN, COL_BG);
  tft.drawString("SELESAI", midX / 2, 200);
  tft.drawString("SELESAI", midX + midX / 2, 200);

  tft.setTextDatum(TL_DATUM);
  drawFooter("ULANGI", COL_RED, "LANJUT", COL_GREEN);
}

// ---- Layar loading: sedang membaca sensor ----
// Pembacaan sensor memblokir (berat sampai 12 detik menunggu angka stabil),
// jadi tanpa layar ini kader lihat layar kategori membeku dan mengira alat hang.
static unsigned long ukurTikTerakhir = 0;
static int ukurTikIndex = 0;

void layarMengukur(const String& langkah, const String& petunjuk) {
  drawHeader("Sedang Mengukur");
  clearContent();

  tft.setTextDatum(MC_DATUM);
  setFont(FONT_M);
  tft.setTextColor(COL_TEXT, COL_BG);
  tft.drawString(langkah, SCR_W / 2, 78);

  setFont(FONT_S);
  tft.setTextColor(COL_TEXT_DIM, COL_BG);
  tft.drawString(petunjuk, SCR_W / 2, 240);
  tft.setTextDatum(TL_DATUM);

  ukurTikTerakhir = 0; // paksa titik pertama langsung tergambar
  ukurTikIndex = 0;
  drawFooter("", COL_INACTIVE, "", COL_INACTIVE);
}

// Titik berjalan, dipanggil dari dalam loop sensor lewat callback. Sengaja
// tidak menampilkan angka mentah: nilai yang belum stabil terlihat seperti
// hasil akhir dan bisa dicatat kader, padahal masih goyang.
void layarMengukurTik() {
  // ponytail: throttle 200ms. Loop sensor memanggil ini jauh lebih cepat dari
  // yang perlu digambar. Turunkan kalau animasinya terasa lambat.
  if (millis() - ukurTikTerakhir < 200) return;
  ukurTikTerakhir = millis();

  const int n = 5, jarak = 32, r = 8, cy = 150;
  int x0 = SCR_W / 2 - (n - 1) * jarak / 2;
  for (int i = 0; i < n; i++) {
    tft.fillCircle(x0 + i * jarak, cy, r, i == ukurTikIndex ? COL_ACCENT : COL_LINE);
  }
  ukurTikIndex = (ukurTikIndex + 1) % n;
}

// ---- Layar 1l/1m: Kuesioner (nomor 1-5 dari 5) ----
void layarKuesioner(int nomor, int total, const String& pertanyaan) {
  drawHeader("Kuesioner Ibu Hamil");
  clearContent();

  setFont(FONT_S);
  tft.setTextDatum(TR_DATUM);
  tft.setTextColor(COL_TEXT_DIM, COL_BG);
  tft.drawString(String(nomor) + " / " + String(total), SCR_W - 20, 52);

  for (int i = 0; i < total; i++) {
    int cx = 24 + i * 18;
    if (i == nomor - 1) {
      tft.drawCircle(cx, 60, 6, COL_ACCENT);
    } else {
      tft.fillCircle(cx, 60, 4, i < nomor - 1 ? COL_ACCENT : COL_LINE);
    }
  }

  setFont(FONT_M);
  tft.setTextColor(COL_TEXT, COL_BG);
  // ponytail: muat ~6 baris (start 76, lineH 24) untuk pertanyaan terpanjang
  // ~168 char sebelum tombol di y=220. Kalau teks ditambah lagi, turunkan ke
  // FONT_S atau geser tombol, dan cek langsung di layar 480x320.
  drawWrapped(pertanyaan, 22, 76, SCR_W - 44, 24);

  int btnY = 220, btnH = 40, gap = 12;
  int btnW = (SCR_W - 44 - gap) / 2;
  tft.fillRoundRect(22, btnY, btnW, btnH, 10, 0x1B5A);
  tft.drawRoundRect(22, btnY, btnW, btnH, 10, COL_GREEN);
  tft.setTextDatum(MC_DATUM);
  setFont(FONT_M);
  tft.setTextColor(COL_TEXT, 0x1B5A);
  tft.drawString("YA", 22 + btnW / 2, btnY + btnH / 2);

  int btn2X = 22 + btnW + gap;
  tft.fillRoundRect(btn2X, btnY, btnW, btnH, 10, 0x5943);
  tft.drawRoundRect(btn2X, btnY, btnW, btnH, 10, COL_RED);
  tft.setTextColor(COL_TEXT, 0x5943);
  tft.drawString("TIDAK", btn2X + btnW / 2, btnY + btnH / 2);

  tft.setTextDatum(TL_DATUM);
  drawFooter("TIDAK", COL_RED, "YA", COL_GREEN);
}

// ---- Layar 1g: Mengirim Data ----
void layarKirim(float bb, float tb) {
  drawHeader("Mengirim Hasil");
  clearContent();

  tft.setTextDatum(MC_DATUM);
  setFont(FONT_M);
  tft.setTextColor(COL_TEXT, COL_BG);
  tft.drawString("Mengirim data ke server...", SCR_W / 2, 140);
  setFont(FONT_S);
  tft.setTextColor(COL_TEXT_DIM, COL_BG);
  tft.drawString("BB " + String(bb, 1) + " kg   TB " + String(tb, 1) + " cm", SCR_W / 2, 178);
  tft.setTextDatum(TL_DATUM);

  drawFooter("", COL_INACTIVE, "", COL_INACTIVE);
}

// ---- Layar 1h: Gagal Terhubung ----
void layarGagal(const String& pesan) {
  drawHeader("Mengirim Hasil");
  clearContent();

  tft.setTextDatum(MC_DATUM);
  setFont(FONT_L);
  tft.setTextColor(COL_RED, COL_BG);
  tft.drawString("Gagal Terhubung", SCR_W / 2, 130);
  setFont(FONT_S);
  tft.setTextColor(COL_TEXT_2, COL_BG);
  tft.drawString(pesan, SCR_W / 2, 168);
  tft.setTextDatum(TL_DATUM);

  drawFooter("GANTI PILIHAN", COL_RED, "COBA LAGI", COL_GREEN);
}

// ---- Layar 1i/1j/1k (anak) & 1n/1o/1p (ibu): Hasil ----
void layarHasil(bool isIbu, float bb, float tb, const String& kategoriHasil, uint16_t warna, const String& teksEdukasi) {
  drawHeader(isIbu ? "Hasil Pemeriksaan - Ibu Hamil" : "Hasil Pemeriksaan - Anak");
  clearContent();

  tft.setTextDatum(TL_DATUM);
  setFont(FONT_S);
  tft.setTextColor(COL_TEXT_DIM, COL_BG);
  tft.drawString("BB " + String(bb, 1) + " kg   TB " + String(tb, 1) + " cm", 22, 48);
  tft.drawString(isIbu ? "KATEGORI RISIKO KEHAMILAN" : "STATUS STUNTING (TB/U)", 22, 74);

  setFont(FONT_L);
  tft.setTextColor(warna, COL_BG);
  tft.drawString(kategoriHasil, 22, 96);

  tft.fillRect(22, 134, 56, 5, warna);

  setFont(FONT_S);
  tft.setTextColor(COL_TEXT_2, COL_BG);
  drawWrapped(teksEdukasi, 22, 152, SCR_W - 44, 21);

  drawFooter("SELANJUTNYA", COL_RED, "CETAK STRUK", COL_GREEN);
}

// ---- Layar 1q: Mencetak Struk ----
void layarCetak() {
  drawHeader("Mencetak Struk");
  clearContent();

  tft.setTextDatum(MC_DATUM);
  setFont(FONT_M);
  tft.setTextColor(COL_TEXT, COL_BG);
  tft.drawString("Mencetak struk...", SCR_W / 2, 130);
  setFont(FONT_S);
  tft.setTextColor(COL_TEXT_DIM, COL_BG);
  tft.drawString("Jangan tarik kertas sebelum selesai", SCR_W / 2, 168);
  tft.setTextDatum(TL_DATUM);

  drawFooter("", COL_INACTIVE, "", COL_INACTIVE);
}

// ---- Layar 1r: Selesai ----
void layarSelesai() {
  tft.fillScreen(COL_BG);
  tft.setTextDatum(MC_DATUM);

  tft.fillCircle(SCR_W / 2, 110, 36, COL_GREEN);
  setFont(FONT_L);
  tft.setTextColor(COL_TEXT, COL_GREEN);
  tft.drawString("OK", SCR_W / 2, 110);

  setFont(FONT_M);
  tft.setTextColor(COL_TEXT, COL_BG);
  tft.drawString("Pemeriksaan Selesai", SCR_W / 2, 168);
  setFont(FONT_S);
  tft.setTextColor(COL_TEXT_2, COL_BG);
  tft.drawString("Terima kasih! Hasil terkirim & struk tercetak.", SCR_W / 2, 196);
  tft.setTextColor(COL_INACTIVE, COL_BG);
  tft.drawString("Kembali ke menu dalam 5 detik...", SCR_W / 2, 220);

  tft.setTextDatum(TL_DATUM);
  drawFooter("", COL_INACTIVE, "KE MENU", COL_GREEN);
}
