#pragma once

#include "config.h"

#if SENSOR_DUMMY

// Mode uji: kedua chip tidak disentuh. Penting — HX711.tare() memblokir
// selamanya menunggu chip yang belum terpasang, jadi init pun harus dilewati.
void sensorsInit() {
  Serial.println("[SENSOR] MODE DUMMY — HX711 & HC-SR04 tidak dibaca.");
}
float readWeightKg() { delay(400); return DUMMY_BB; } // delay meniru jeda ukur
float readHeightCm() { delay(400); return DUMMY_TB; }

#else

#include <HX711.h>

// =====================================================================
// SENSOR BERAT (HX711 + load cell 200 kg) & TINGGI (HC-SR04)
// Parameter perataan/median sesuai §16 dokumen wiring.
// =====================================================================

static HX711 timbangan;

// Berat dianggap terkunci bila tidak berubah > 50 g selama 2 detik.
#define BERAT_TOLERANSI_KG 0.05f
#define BERAT_STABIL_MS    2000UL
#define BERAT_TIMEOUT_MS   12000UL

// ---- Inisialisasi — panggil di setup(), platform HARUS kosong ----
void sensorsInit() {
  timbangan.begin(PIN_HX_DT, PIN_HX_SCK);
  timbangan.set_scale(HX_SCALE);
  timbangan.tare(20); // titik nol diambil sekali per boot
  Serial.println("[HX711] Tare selesai (platform kosong).");

  pinMode(PIN_TRIG, OUTPUT);
  digitalWrite(PIN_TRIG, LOW);
  pinMode(PIN_ECHO, INPUT);
}

// ---- Berat (kg) — rata-rata 10 sampel, ditunggu sampai stabil ----
float readWeightKg() {
  unsigned long mulai = millis();
  unsigned long stabilSejak = millis();
  float terakhir = timbangan.get_units(10);

  while (millis() - stabilSejak < BERAT_STABIL_MS) {
    float kini = timbangan.get_units(10);
    if (fabs(kini - terakhir) > BERAT_TOLERANSI_KG) {
      stabilSejak = millis(); // masih goyang — hitungan 2 detik diulang
    }
    terakhir = kini;
    if (millis() - mulai > BERAT_TIMEOUT_MS) {
      Serial.println("[HX711] Timeout, berat tidak kunjung stabil.");
      break;
    }
  }

  // Angka mentah (sudah dikurangi tare) dipakai untuk menghitung HX_SCALE, §15.
  Serial.printf("[HX711] mentah=%ld berat=%.2f kg\n", (long)timbangan.get_value(10), terakhir);
  return terakhir < 0 ? 0 : terakhir; // beban negatif = drift, laporkan 0
}

// ---- Satu ping HC-SR04, kembalikan jarak cm (-1 bila gagal) ----
static float pingCm() {
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  unsigned long us = pulseIn(PIN_ECHO, HIGH, 30000UL); // 30 ms ≈ 5 m
  if (us == 0) return -1;
  return us * 0.0343f / 2.0f; // 343 m/s, pulang-pergi
}

// ---- Tinggi badan (cm) — median 15 ping, rambut sering menyerap gema ----
float readHeightCm() {
  float d[15];
  int n = 0;

  for (int i = 0; i < 15; i++) {
    float jarak = pingCm();
    if (jarak > 2.0f && jarak < H_SENSOR) d[n++] = jarak; // buang outlier
    delay(60); // beri jeda agar gema ping sebelumnya reda
  }

  if (n == 0) {
    Serial.println("[HC-SR04] Semua ping gagal.");
    return 0;
  }

  for (int i = 1; i < n; i++) { // insertion sort, n <= 15
    float v = d[i];
    int k = i - 1;
    while (k >= 0 && d[k] > v) { d[k + 1] = d[k]; k--; }
    d[k + 1] = v;
  }

  float tinggi = H_SENSOR - d[n / 2];
  Serial.printf("[HC-SR04] %d ping valid, jarak=%.1f tinggi=%.1f cm\n", n, d[n / 2], tinggi);
  return tinggi < 0 ? 0 : tinggi;
}

#endif // SENSOR_DUMMY
