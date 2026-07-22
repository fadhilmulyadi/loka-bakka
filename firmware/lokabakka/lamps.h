#pragma once

#include "config.h"

// =====================================================================
// KONTROL LAMPU STATUS (relay 4ch, §11c–d wiring doc)
//
// Hanya SATU lampu menyala pada satu waktu.
// Urutan wiring: IN1=HIJAU(GPIO21) IN2=KUNING(GPIO22) IN3=MERAH(GPIO4)
// Relay: aktif-LOW (RELAY_ON = LOW), set di config.h.
// =====================================================================

// ---- Inisialisasi — wajib dipanggil di setup() SEBELUM loop ----
void lampInit() {
  pinMode(PIN_LAMP_HIJAU,  OUTPUT);
  pinMode(PIN_LAMP_KUNING, OUTPUT);
  pinMode(PIN_LAMP_MERAH,  OUTPUT);

  // Pastikan semua lampu MATI saat boot (sesuai §16 catatan relay lampu)
  digitalWrite(PIN_LAMP_HIJAU,  RELAY_OFF);
  digitalWrite(PIN_LAMP_KUNING, RELAY_OFF);
  digitalWrite(PIN_LAMP_MERAH,  RELAY_OFF);
}

// ---- Matikan semua lampu ----
void lampMati() {
  digitalWrite(PIN_LAMP_HIJAU,  RELAY_OFF);
  digitalWrite(PIN_LAMP_KUNING, RELAY_OFF);
  digitalWrite(PIN_LAMP_MERAH,  RELAY_OFF);
}

// ---- Nyalakan satu lampu, matikan yang lain ----
// warna: 'H' = HIJAU, 'K' = KUNING, 'M' = MERAH
void lampNyala(char warna) {
  lampMati(); // matikan semua dulu, baru nyalakan satu
  switch (warna) {
    case 'H': digitalWrite(PIN_LAMP_HIJAU,  RELAY_ON); break;
    case 'K': digitalWrite(PIN_LAMP_KUNING, RELAY_ON); break;
    case 'M': digitalWrite(PIN_LAMP_MERAH,  RELAY_ON); break;
  }
}

// ---- Nyalakan lampu sesuai string kategori hasil API ----
//
// Taksonomi sama untuk anak (z-score TB/U WHO) dan ibu hamil (skor risiko):
//   "NORMAL"       -> hijau
//   "PRA STUNTING" -> kuning
//   "STUNTING"     -> merah
//
void lampDariKategori(const String& kategori) {
  if (kategori == "NORMAL") {
    lampNyala('H');
  } else if (kategori == "PRA STUNTING") {
    lampNyala('K');
  } else {
    // "STUNTING" atau kategori tidak dikenal -> merah
    lampNyala('M');
  }
}

// ---- Test sequence: nyala satu-satu selama durasiMs ms ----
// Berguna di commissioning (§14 langkah 5) tanpa perlu kirim data
void lampTest(int durasiMs = 600) {
  Serial.println("[LAMP] Test sequence: HIJAU -> KUNING -> MERAH -> OFF");
  lampNyala('H'); delay(durasiMs);
  lampNyala('K'); delay(durasiMs);
  lampNyala('M'); delay(durasiMs);
  lampMati();
  Serial.println("[LAMP] Test selesai.");
}
