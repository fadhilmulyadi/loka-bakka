#pragma once

#include <TFT_eSPI.h>
#include "config.h"

extern TFT_eSPI tft;

// ---- Primitif bersama ----

void drawHeader(const String& title, bool wifiOk) {
  tft.fillRect(0, 0, SCR_W, 38, COL_BG);
  tft.drawFastHLine(0, 37, SCR_W, COL_LINE);
  tft.setTextColor(COL_TEXT, COL_BG);
  tft.setTextSize(2);
  tft.setTextDatum(TL_DATUM);
  tft.drawString(title, 16, 11);

  uint16_t wc = wifiOk ? COL_ACCENT : COL_INACTIVE;
  tft.drawCircle(SCR_W - 24, 20, 3, wc);
  tft.drawCircle(SCR_W - 24, 20, 8, wc);
  tft.drawCircle(SCR_W - 24, 20, 13, wc);
}

void drawFooter(const String& kiri, uint16_t kiriColor, const String& kanan, uint16_t kananColor) {
  tft.fillRect(0, 274, SCR_W, 46, COL_FOOTER);
  tft.drawFastHLine(0, 274, SCR_W, COL_LINE);
  tft.setTextSize(1);
  tft.setTextDatum(TL_DATUM);

  if (kiri.length() > 0) {
    tft.fillCircle(27, 297, 11, kiriColor);
    tft.setTextColor(COL_TEXT_2, COL_FOOTER);
    tft.drawString(kiri, 46, 293);
  }
  if (kanan.length() > 0) {
    tft.setTextDatum(TR_DATUM);
    tft.setTextColor(COL_TEXT, COL_FOOTER);
    tft.drawString(kanan, SCR_W - 46, 293);
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
  tft.setTextSize(3);
  tft.drawString("Loka Bakka", SCR_W / 2, 140);
  tft.setTextSize(1);
  tft.setTextColor(COL_TEXT_DIM, COL_BG);
  tft.drawString("Menghubungkan ke WiFi...", SCR_W / 2, 175);
  tft.setTextDatum(TL_DATUM);
}

// ---- Layar 1b/1c: Pilih Kategori (sorotan: 0 = Anak, 1 = Ibu Hamil) ----
void layarPilihKategori(int sorotan, bool wifiOk) {
  drawHeader("Pilih Kategori", wifiOk);
  clearContent();

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
    tft.fillCircle(x + cardW / 2, y + 60, 27, COL_BG);
    tft.drawCircle(x + cardW / 2, y + 60, 27, aktif ? COL_ACCENT : COL_TEXT_DIM);
    tft.setTextDatum(MC_DATUM);
    tft.setTextColor(aktif ? COL_TEXT : COL_TEXT_DIM, aktif ? COL_PANEL_ON : COL_PANEL);
    tft.setTextSize(2);
    tft.drawString(labels[i], x + cardW / 2, y + 118);
  }
  tft.setTextDatum(TL_DATUM);

  drawFooter("GANTI PILIHAN", COL_RED, "PILIH", COL_GREEN);
}

// ---- Layar 1d: Ukur Berat & Tinggi ----
void layarUkur(float bb, float tb) {
  drawHeader("Ukur Berat & Tinggi Badan", true);
  clearContent();

  int midX = SCR_W / 2;
  tft.drawFastVLine(midX, 58, 200, COL_LINE);

  tft.setTextDatum(MC_DATUM);

  tft.setTextSize(1);
  tft.setTextColor(COL_TEXT_DIM, COL_BG);
  tft.drawString("BERAT BADAN", midX / 2, 90);
  tft.setTextSize(4);
  tft.setTextColor(COL_TEXT, COL_BG);
  tft.drawString(String(bb, 1) + " kg", midX / 2, 140);

  tft.setTextSize(1);
  tft.setTextColor(COL_TEXT_DIM, COL_BG);
  tft.drawString("TINGGI BADAN", midX + midX / 2, 90);
  tft.setTextSize(4);
  tft.setTextColor(COL_TEXT, COL_BG);
  tft.drawString(String(tb, 1) + " cm", midX + midX / 2, 140);

  tft.setTextSize(1);
  tft.setTextColor(COL_GREEN, COL_BG);
  tft.drawString("SELESAI", midX / 2, 190);
  tft.drawString("SELESAI", midX + midX / 2, 190);

  tft.setTextDatum(TL_DATUM);
  drawFooter("ULANGI", COL_RED, "LANJUT", COL_GREEN);
}

// ---- Layar 1l/1m: Kuesioner (nomor 1-5 dari 5) ----
void layarKuesioner(int nomor, int total, const String& pertanyaan) {
  drawHeader("Kuesioner Ibu Hamil", true);
  clearContent();

  tft.setTextDatum(TR_DATUM);
  tft.setTextSize(1);
  tft.setTextColor(COL_TEXT_DIM, COL_BG);
  tft.drawString(String(nomor) + " / " + String(total), SCR_W - 20, 50);

  for (int i = 0; i < total; i++) {
    int cx = 24 + i * 18;
    if (i == nomor - 1) {
      tft.drawCircle(cx, 60, 6, COL_ACCENT);
    } else {
      tft.fillCircle(cx, 60, 4, i < nomor - 1 ? COL_ACCENT : COL_LINE);
    }
  }

  tft.setTextDatum(TL_DATUM);
  tft.setTextSize(2);
  tft.setTextColor(COL_TEXT, COL_BG);
  tft.setTextWrap(true);
  tft.drawString(pertanyaan, 22, 90);

  int btnY = 220, btnH = 40, gap = 12;
  int btnW = (SCR_W - 44 - gap) / 2;
  tft.fillRoundRect(22, btnY, btnW, btnH, 10, 0x1B5A);
  tft.drawRoundRect(22, btnY, btnW, btnH, 10, COL_GREEN);
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(COL_TEXT, 0x1B5A);
  tft.drawString("YA", 22 + btnW / 2, btnY + btnH / 2);

  int btn2X = 22 + btnW + gap;
  tft.fillRoundRect(btn2X, btnY, btnW, btnH, 10, 0x5943);
  tft.drawRoundRect(btn2X, btnY, btnW, btnH, 10, COL_RED);
  tft.drawString("TIDAK", btn2X + btnW / 2, btnY + btnH / 2);

  tft.setTextDatum(TL_DATUM);
  drawFooter("TIDAK", COL_RED, "YA", COL_GREEN);
}

// ---- Layar 1g: Mengirim Data ----
void layarKirim(float bb, float tb) {
  drawHeader("Mengirim Hasil", true);
  clearContent();

  tft.setTextDatum(MC_DATUM);
  tft.setTextSize(2);
  tft.setTextColor(COL_TEXT, COL_BG);
  tft.drawString("Mengirim data ke server...", SCR_W / 2, 140);
  tft.setTextSize(1);
  tft.setTextColor(COL_TEXT_DIM, COL_BG);
  tft.drawString("BB " + String(bb, 1) + " kg   TB " + String(tb, 1) + " cm", SCR_W / 2, 175);
  tft.setTextDatum(TL_DATUM);

  drawFooter("", COL_INACTIVE, "", COL_INACTIVE);
}

// ---- Layar 1h: Gagal Terhubung ----
void layarGagal(const String& pesan) {
  drawHeader("Mengirim Hasil", false);
  clearContent();

  tft.setTextDatum(MC_DATUM);
  tft.setTextSize(2);
  tft.setTextColor(COL_RED, COL_BG);
  tft.drawString("Gagal Terhubung", SCR_W / 2, 130);
  tft.setTextSize(1);
  tft.setTextColor(COL_TEXT_2, COL_BG);
  tft.drawString(pesan, SCR_W / 2, 160);
  tft.setTextDatum(TL_DATUM);

  drawFooter("GANTI PILIHAN", COL_RED, "COBA LAGI", COL_GREEN);
}

// ---- Layar 1i/1j/1k (anak) & 1n/1o/1p (ibu): Hasil ----
void layarHasil(bool isIbu, float bb, float tb, const String& kategoriHasil, uint16_t warna, const String& teksEdukasi) {
  drawHeader(isIbu ? "Hasil Pemeriksaan - Ibu Hamil" : "Hasil Pemeriksaan - Anak", true);
  clearContent();

  tft.setTextDatum(TL_DATUM);
  tft.setTextSize(1);
  tft.setTextColor(COL_TEXT_DIM, COL_BG);
  tft.drawString("BB " + String(bb, 1) + " kg   TB " + String(tb, 1) + " cm", 22, 48);

  tft.setTextColor(COL_TEXT_DIM, COL_BG);
  tft.drawString(isIbu ? "KATEGORI RISIKO KEHAMILAN" : "STATUS STUNTING (TB/U)", 22, 78);

  tft.setTextSize(3);
  tft.setTextColor(warna, COL_BG);
  tft.drawString(kategoriHasil, 22, 96);

  tft.fillRect(22, 132, 56, 5, warna);

  tft.setTextSize(1);
  tft.setTextColor(COL_TEXT_2, COL_BG);
  tft.setTextWrap(true);
  tft.drawString(teksEdukasi, 22, 148);

  drawFooter("SELANJUTNYA", COL_RED, "CETAK STRUK", COL_GREEN);
}

// ---- Layar 1q: Mencetak Struk ----
void layarCetak() {
  drawHeader("Mencetak Struk", true);
  clearContent();

  tft.setTextDatum(MC_DATUM);
  tft.setTextSize(2);
  tft.setTextColor(COL_TEXT, COL_BG);
  tft.drawString("Mencetak struk...", SCR_W / 2, 130);
  tft.setTextSize(1);
  tft.setTextColor(COL_TEXT_DIM, COL_BG);
  tft.drawString("Jangan tarik kertas sebelum selesai", SCR_W / 2, 165);
  tft.setTextDatum(TL_DATUM);

  drawFooter("", COL_INACTIVE, "", COL_INACTIVE);
}

// ---- Layar 1r: Selesai ----
void layarSelesai() {
  tft.fillScreen(COL_BG);
  tft.setTextDatum(MC_DATUM);

  tft.fillCircle(SCR_W / 2, 110, 36, COL_GREEN);
  tft.setTextSize(1);
  tft.setTextColor(COL_TEXT, COL_GREEN);
  tft.drawString("OK", SCR_W / 2, 110);

  tft.setTextSize(2);
  tft.setTextColor(COL_TEXT, COL_BG);
  tft.drawString("Pemeriksaan Selesai", SCR_W / 2, 165);
  tft.setTextSize(1);
  tft.setTextColor(COL_TEXT_2, COL_BG);
  tft.drawString("Terima kasih! Hasil terkirim & struk tercetak.", SCR_W / 2, 190);
  tft.setTextColor(COL_INACTIVE, COL_BG);
  tft.drawString("Kembali ke menu dalam 5 detik...", SCR_W / 2, 210);

  tft.setTextDatum(TL_DATUM);
  drawFooter("", COL_INACTIVE, "KE MENU", COL_GREEN);
}
