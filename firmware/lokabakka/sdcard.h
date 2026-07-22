#pragma once

#include <SD.h>
#include <ArduinoJson.h>
#include "config.h"

// =====================================================================
// PENYIMPANAN KARTU microSD
//
// Untuk sekarang: catatan mentah saja. Setiap pengukuran ditulis sebagai
// satu baris JSON di /pengukuran.jsonl, sebelum dikirim ke server.
//
// ponytail: BELUM antrian kirim-ulang. Baris di sini tidak memuat identitas
// pasien, karena alat memang tidak pernah tahu siapa yang diukur — server
// yang mencocokkan ke sesi "menunggu" terbaru (app/api/device/selesai).
// Mengirim ulang baris lama akan menempel ke pasien yang salah. Jadi berkas
// ini murni cadangan agar angka ukur tidak hilang saat WiFi mati; pemulihannya
// masih manual. Antrian sungguhan butuh sesi_id ikut tersimpan.
// =====================================================================

static bool sdSiap = false;

// Panggil di setup() SESUDAH tft.init() — keduanya berbagi bus SPI (§16).
void sdInit() {
  sdSiap = SD.begin(PIN_SD_CS);
  Serial.println(sdSiap ? "[SD] Kartu siap." : "[SD] Kartu tidak terbaca — pengukuran tidak dicadangkan.");
}

bool sdTersedia() { return sdSiap; }

// jawabanDoc boleh nullptr (kategori "anak").
bool sdSimpanPengukuran(const char* kategori, float bb, float tb, JsonDocument* jawabanDoc) {
  if (!sdSiap) return false;

  File f = SD.open("/pengukuran.jsonl", FILE_APPEND);
  if (!f) {
    Serial.println("[SD] Gagal membuka /pengukuran.jsonl");
    return false;
  }

  JsonDocument doc;
  doc["ms"] = millis(); // belum ada jam — waktu nyata menyusul saat NTP dipasang
  doc["device_id"] = DEVICE_ID;
  doc["kategori"] = kategori;
  doc["bb"] = bb;
  doc["tb"] = tb;
  if (jawabanDoc != nullptr) doc["jawaban"] = *jawabanDoc;

  serializeJson(doc, f);
  f.println();
  f.close();

  Serial.printf("[SD] Tersimpan: %s bb=%.2f tb=%.1f\n", kategori, bb, tb);
  return true;
}
