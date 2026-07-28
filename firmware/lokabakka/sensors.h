#pragma once

#include "config.h"

#if SENSOR_DUMMY

// Mode uji: kedua chip tidak disentuh. Penting — HX711.tare() memblokir
// selamanya menunggu chip yang belum terpasang, jadi init pun harus dilewati.
void sensorsInit() {
  Serial.println("[SENSOR] MODE DUMMY — HX711 & HC-SR04 tidak dibaca.");
}
float readWeightKg(void (*tick)() = nullptr) {
  for (int i = 0; i < 10; i++) { delay(300); if (tick) tick(); } // meniru jeda ukur
  return DUMMY_BB;
}
float readHeightCm(void (*tick)() = nullptr) {
  for (int i = 0; i < 5; i++) { delay(200); if (tick) tick(); }
  return DUMMY_TB;
}

#else

// =====================================================================
// SENSOR BERAT (HX711 + load cell 200 kg) & TINGGI (HC-SR04)
// =====================================================================
// HX711 diakses langsung via GPIO — tidak pakai library HX711 apapun.
// Alasan: Channel A trace PCB rusak, dipakai Channel B (gain=32 = 2 pulsa).
// Implementasi GPIO langsung menghilangkan ketergantungan versi library.
// =====================================================================

// ---- Variabel tare & skala ----
static long  hx_offset = 0;   // nilai raw platform kosong (tare)

// Berat dianggap terkunci bila tidak berubah > 50 g selama 2 detik.
#define BERAT_TOLERANSI_KG 0.05f
#define BERAT_STABIL_MS    2000UL
#define BERAT_TIMEOUT_MS   12000UL

// ---- Baca satu sampel HX711 (Channel B, gain=32) via GPIO langsung ----
// Mengembalikan nilai 24-bit sign-extended ke 32-bit.
// Timeout 500ms jika DOUT tidak turun LOW (chip tidak merespons).
static long hx711_read() {
  unsigned long t = millis();
  while (digitalRead(PIN_HX_DT)) {           // tunggu DOUT LOW (data siap)
    if (millis() - t > 500) return 0;        // timeout — chip tidak merespons
  }

  long result = 0;

  // Masuk critical section: cegah interrupt meregangkan pulsa SCK > 60µs
  // (kalau SCK HIGH > 60µs chip masuk power-down, data kacau).
  portMUX_TYPE mux = portMUX_INITIALIZER_UNLOCKED;
  portENTER_CRITICAL(&mux);

  // Baca 24 bit MSB-first
  for (int i = 0; i < 24; i++) {
    digitalWrite(PIN_HX_SCK, HIGH);
    delayMicroseconds(1);
    result = (result << 1) | digitalRead(PIN_HX_DT);
    digitalWrite(PIN_HX_SCK, LOW);
    delayMicroseconds(1);
  }

  // 2 pulsa ekstra → Channel B gain=32 untuk konversi berikutnya
  for (int i = 0; i < 2; i++) {
    digitalWrite(PIN_HX_SCK, HIGH);
    delayMicroseconds(1);
    digitalWrite(PIN_HX_SCK, LOW);
    delayMicroseconds(1);
  }

  portEXIT_CRITICAL(&mux);

  // Sign-extend 24-bit ke 32-bit
  if (result & 0x800000) result |= 0xFF000000;

  return result;
}

static bool hx711_ready() { return !digitalRead(PIN_HX_DT); }

// ---- Rata-rata n sampel ----
static long hx711_average(int n) {
  long sum = 0;
  int  got = 0;
  unsigned long t = millis();
  while (got < n) {
    if (millis() - t > 5000) break; // guard jangan macet
    if (hx711_ready()) { sum += hx711_read(); got++; delay(5); }
  }
  return got ? sum / got : 0;
}

// ---- Inisialisasi — panggil di setup(), platform HARUS kosong ----
void sensorsInit() {
  // Diagnostik pin DT
  pinMode(PIN_HX_DT,  INPUT);  // GPIO35 = input-only, no pull-up; HX711 DOUT push-pull jadi tidak perlu
  pinMode(PIN_HX_SCK, OUTPUT);
  digitalWrite(PIN_HX_SCK, LOW);

  int hi = 0, lo = 0;
  unsigned long t0 = millis();
  while (millis() - t0 < 300) {
    if (digitalRead(PIN_HX_DT)) hi++; else lo++;
  }
  Serial.printf("[HX711] cek DT: HIGH=%d LOW=%d %s\n", hi, lo,
                hi == 0 ? "-> DT stuck LOW (chip mati?)" : "-> DT bergerak, chip hidup");

  // Tunggu konversi pertama selesai (Channel A default setelah power-on)
  delay(500);

  // Dummy read: buang konversi Channel A, pasang 2 pulsa → Channel B aktif
  hx711_read();
  Serial.println("[HX711] Channel B dikunci (gain=32, 2 pulsa ekstra).");

  // Probe 3 detik: pastikan Channel B membaca data nyata
  int nReady = 0;
  unsigned long tp = millis();
  while (millis() - tp < 3000) {
    if (hx711_ready()) {
      long r = hx711_read();
      nReady++;
      Serial.printf("[HX711] READY  raw=%ld\n", r);
      delay(150);
    }
  }
  Serial.printf("[HX711] probe: %d sampel dalam 3 dtk %s\n", nReady,
                nReady == 0 ? "-> HARDWARE (chip tidak merespons)"
                            : "-> Channel B hidup");

#if HX_DEBUG_STREAM
  Serial.println("[HX711] STREAM kalibrasi — tekan platform, amati raw. (HX_DEBUG_STREAM=0 utk normal)");
  while (true) {
    if (hx711_ready()) Serial.printf("[HX711] raw=%ld\n", hx711_read());
    delay(200);
  }
#endif

  // Tare: ambil rata-rata 20 sampel saat platform kosong
  hx_offset = hx711_average(20);
  Serial.printf("[HX711] Tare selesai. offset=%ld\n", hx_offset);

  pinMode(PIN_TRIG, OUTPUT);
  digitalWrite(PIN_TRIG, LOW);
  pinMode(PIN_ECHO, INPUT);
}

// ---- Berat (kg) — rata-rata 10 sampel, tunggu stabil ----
// tick (opsional) dipanggil tiap kali ada angka baru. Fungsi ini memblokir
// sampai 12 detik, jadi tanpa tick layar TFT diam total dan terlihat hang.
float readWeightKg(void (*tick)() = nullptr) {
  unsigned long mulai      = millis();
  unsigned long stabilSejak = millis();
  float terakhir = ((float)(hx711_average(10) - hx_offset)) / HX_SCALE;
  if (tick) tick();

  while (millis() - stabilSejak < BERAT_STABIL_MS) {
    float kini = ((float)(hx711_average(10) - hx_offset)) / HX_SCALE;
    if (tick) tick();
    if (fabs(kini - terakhir) > BERAT_TOLERANSI_KG) stabilSejak = millis();
    terakhir = kini;
    if (millis() - mulai > BERAT_TIMEOUT_MS) {
      Serial.println("[HX711] Timeout, berat tidak kunjung stabil.");
      break;
    }
  }

  long mentah = hx711_average(10) - hx_offset;
  Serial.printf("[HX711] mentah=%ld berat=%.2f kg\n", mentah, terakhir);
  return terakhir < 0 ? 0 : terakhir;
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
float readHeightCm(void (*tick)() = nullptr) {
  float d[15];
  int   n = 0;

  for (int i = 0; i < 15; i++) {
    float jarak = pingCm();
    if (jarak > 2.0f && jarak < H_SENSOR) d[n++] = jarak; // buang outlier
    if (tick) tick();
    delay(60); // beri jeda agar gema ping sebelumnya reda
  }

  if (n == 0) {
    Serial.println("[HC-SR04] Semua ping gagal.");
    return 0;
  }

  for (int i = 1; i < n; i++) { // insertion sort, n <= 15
    float v = d[i];
    int   k = i - 1;
    while (k >= 0 && d[k] > v) { d[k + 1] = d[k]; k--; }
    d[k + 1] = v;
  }

  float tinggi = H_SENSOR - d[n / 2];
  Serial.printf("[HC-SR04] %d ping valid, jarak=%.1f tinggi=%.1f cm\n", n, d[n / 2], tinggi);
  return tinggi < 0 ? 0 : tinggi;
}

#endif // SENSOR_DUMMY
