// ============================================================
// TEST HX711 v3 — Coba Channel B (bypass Channel A yang rusak)
// Library : HX711 Arduino Library 0.7.5 (bogde)
// ============================================================
// Sambung load cell ke B+ dan B- di modul HX711
// (bukan A+ dan A- yang sebelumnya):
//
//   HX711 B+  → Load cell Putih  (sinyal +)
//   HX711 B-  → Load cell Hitam  (sinyal -)
//   HX711 E+  → Load cell Merah  (tetap)
//   HX711 E-  → Load cell Hijau  (tetap)
//
// Channel B: gain = 32 (lebih rendah dari A=128, tapi cukup)
// ============================================================

#include <HX711.h>

#define PIN_DT   13
#define PIN_SCK  32
#define GAIN_B   32   // Channel B selalu gain 32

HX711 scale;

long lastRaw = 0;
long minRaw  =  999999999L;
long maxRaw  = -999999999L;

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("===========================================");
  Serial.println("  TEST HX711 v3 — Channel B (gain=32)     ");
  Serial.println("===========================================");
  Serial.println("  Sambung load cell ke B+ dan B-");
  Serial.println("  E+/E- tetap ke Merah/Hijau");
  Serial.println("-------------------------------------------");

  // begin dengan gain 32 → otomatis pakai channel B
  scale.begin(PIN_DT, PIN_SCK, GAIN_B);
  scale.power_down();
  delay(200);
  scale.power_up();
  delay(500);

  // Ambil baseline
  Serial.println("Menunggu HX711 siap...");
  int wait = 0;
  while (!scale.is_ready() && wait < 50) { delay(100); wait++; }

  if (!scale.is_ready()) {
    Serial.println("✗ is_ready() timeout — cek wiring DT/SCK/VCC");
    while(true) delay(1000);
  }

  lastRaw = scale.read();
  minRaw = maxRaw = lastRaw;

  Serial.printf("Baseline raw = %ld\n", lastRaw);
  Serial.println();
  Serial.println("Tekan platform → amati raw berubah");
  Serial.println("[ raw         ] [ min         ] [ max         ] [ delta ]");
  Serial.println("------------------------------------------------------------");
}

void loop() {
  if (!scale.is_ready()) return;

  long raw = scale.read();

  if (raw < minRaw) minRaw = raw;
  if (raw > maxRaw) maxRaw = raw;
  long delta = maxRaw - minRaw;

  if (abs(raw - lastRaw) > 50) {
    Serial.printf("[ %-12ld] [ %-12ld] [ %-12ld] [ %ld ]\n",
                  raw, minRaw, maxRaw, delta);
    lastRaw = raw;
  }

  static unsigned long tLast = 0;
  if (millis() - tLast > 10000) {
    tLast = millis();
    Serial.printf("\n--- 10 dtk: delta=%ld | %s ---\n\n",
                  delta,
                  delta > 2000   ? "✓ CHANNEL B HIDUP! Sinyal ada!" :
                  delta > 100    ? "~ ada noise, goyang lebih keras" :
                                   "✗ DIAM — channel B juga rusak / E+E- tidak ada");
    minRaw = maxRaw = raw;
  }

  delay(100);
}
