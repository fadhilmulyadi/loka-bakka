#pragma once

#include <Arduino.h>
#include <WiFi.h>
#include "config.h"

// Printer dimatikan lewat relay saat idle (hemat daya + tidak panas). Selama
// mati, TX ditahan LOW supaya tidak menyuplai printer lewat pin data.
void prnInit() {
  pinMode(PIN_PRN_RELAY, OUTPUT);
  digitalWrite(PIN_PRN_RELAY, PRN_RELAY_OFF);
  pinMode(PIN_PRN_TX, OUTPUT);
  digitalWrite(PIN_PRN_TX, LOW);
}

void prnPowerOn() {
  // Lepas dulu semua beban ESP32 yang bisa dilepas, SEBELUM relay printer nyala.
  // Adaptor 9V 2A tidak punya sisa saat head printer memanas (printer sendirian
  // sudah ±2A), jadi tiap mA yang tidak ditarik ESP32 jadi margin sebelum rel
  // 5V jatuh dan memicu brownout-reset. Ini mitigasi yang sudah tertulis di
  // wiring §17 ("firmware tidak kirim WiFi saat mencetak") tapi belum terpasang.
  WiFi.mode(WIFI_OFF);    // radio mati: ±100mA rata-rata, ±250mA puncak
  setCpuFrequencyMhz(80); // 240→80MHz: ±30mA. JANGAN di bawah 80 — APB ikut
                          // turun dan baud Serial2 ke printer jadi kacau.

  digitalWrite(PIN_PRN_RELAY, PRN_RELAY_ON);
  delay(2000); // printer butuh waktu boot sebelum menerima data
  Serial2.begin(9600, SERIAL_8N1, PIN_PRN_RX, PIN_PRN_TX);
  delay(50);
  Serial2.write(0x1B); Serial2.write(0x40); // ESC @ - reset printer

  // ESC 7 - parameter panas head. Sekarang di nilai default: brownout sudah
  // ditangani di sisi hardware (elco 2200uF dipindah ke rel yang sama dengan
  // printer), jadi tidak perlu lagi memperlambat cetak. Sempat dipakai n1=2 /
  // n2=160 dan itu bikin cetak 3-4x lebih lambat sampai relay keburu putus di
  // prnPowerOff sebelum struk habis tercetak.
  // ponytail: knob kalibrasi. Restart balik saat cetak → turunkan n1 (7→4→2),
  // cetakan jadi pudar → tebus dengan menaikkan n2.
  Serial2.write(0x1B); Serial2.write(0x37);
  Serial2.write(7);  // n1: dot maks serentak (unit 8 dot), default 7
  Serial2.write(80); // n2: lama panas (unit 10us), default 80
  Serial2.write(2);  // n3: jeda antar panas (unit 10us), default 2
  delay(20);
}

void prnPowerOff() {
  Serial2.flush();
  delay(3000); // tunggu buffer printer habis tercetak sebelum daya dicabut
  Serial2.end();
  pinMode(PIN_PRN_TX, OUTPUT);
  digitalWrite(PIN_PRN_TX, LOW);
  digitalWrite(PIN_PRN_RELAY, PRN_RELAY_OFF);

  // Printer sudah lepas dari rel — aman menyalakan lagi radio & CPU penuh.
  // WiFi.begin() tidak diblokir: heartbeat di loop() sudah menjaga diri dengan
  // cek WiFi.status(), jadi sambungan pulih sendiri dalam beberapa detik.
  setCpuFrequencyMhz(240);
  WiFi.mode(WIFI_STA);
  WiFi.begin(); // tanpa argumen: pakai kredensial tersimpan di NVS
}

void prnAlign(uint8_t n) { // 0 = kiri, 1 = tengah, 2 = kanan
  Serial2.write(0x1B); Serial2.write(0x61); Serial2.write(n);
}

void prnBold(bool on) {
  Serial2.write(0x1B); Serial2.write(0x45); Serial2.write(on ? 1 : 0);
}

void prnSize(uint8_t w, uint8_t h) { // 1-8x ukuran normal
  uint8_t n = ((w - 1) << 4) | (h - 1);
  Serial2.write(0x1D); Serial2.write(0x21); Serial2.write(n);
}

void prnLine(const String& s) {
  Serial2.println(s); // printer auto-wrap di lebar kertas (32 kolom / 58mm)
}

void prnFeed(uint8_t n) {
  Serial2.write(0x1B); Serial2.write(0x64); Serial2.write(n);
}

void prnCut() {
  Serial2.write(0x1D); Serial2.write(0x56); Serial2.write(0x01); // partial cut
}

void prnGaris() {
  prnLine("--------------------------------");
}

// GS ( k - urutan standar ESC/POS 5 langkah untuk mencetak QR code model 2.
void prnQR(const String& data) {
  int len = data.length() + 3;
  uint8_t pL = len & 0xFF;
  uint8_t pH = (len >> 8) & 0xFF;

  // 1) Pilih model QR (model 2)
  Serial2.write(0x1D); Serial2.write(0x28); Serial2.write(0x6B);
  Serial2.write(0x04); Serial2.write(0x00); Serial2.write(0x31); Serial2.write(0x41);
  Serial2.write(0x32); Serial2.write(0x00);

  // 2) Ukuran modul (1-16) - pakai 6 agar cukup besar dipindai HP
  Serial2.write(0x1D); Serial2.write(0x28); Serial2.write(0x6B);
  Serial2.write(0x03); Serial2.write(0x00); Serial2.write(0x31); Serial2.write(0x43);
  Serial2.write(6);

  // 3) Tingkat koreksi error - M (49)
  Serial2.write(0x1D); Serial2.write(0x28); Serial2.write(0x6B);
  Serial2.write(0x03); Serial2.write(0x00); Serial2.write(0x31); Serial2.write(0x45);
  Serial2.write(49);

  // 4) Simpan data QR ke buffer printer
  Serial2.write(0x1D); Serial2.write(0x28); Serial2.write(0x6B);
  Serial2.write(pL); Serial2.write(pH); Serial2.write(0x31); Serial2.write(0x50);
  Serial2.write(0x30);
  Serial2.print(data);

  // 5) Cetak QR dari buffer
  Serial2.write(0x1D); Serial2.write(0x28); Serial2.write(0x6B);
  Serial2.write(0x03); Serial2.write(0x00); Serial2.write(0x31); Serial2.write(0x51);
  Serial2.write(0x30);
}

void cetakStruk(const String& namaPasien, const String& tanggal, float bb, float tb,
                const String& kategoriHasil, const String& teksEdukasi) {
  prnPowerOn();

  prnAlign(1);
  prnBold(true);
  prnSize(2, 2);
  prnLine("LOKA BAKKA");
  prnSize(1, 1);
  prnLine("Hasil Pemeriksaan");
  prnBold(false);
  prnGaris();

  prnAlign(0);
  prnLine("Nama    : " + namaPasien);
  prnLine("Tanggal : " + tanggal);
  prnGaris();
  prnLine("Berat Badan  : " + String(bb, 1) + " kg");
  prnLine("Tinggi Badan : " + String(tb, 1) + " cm");
  prnGaris();

  prnAlign(1);
  prnBold(true);
  prnSize(2, 2);
  prnLine(kategoriHasil);
  prnSize(1, 1);
  prnBold(false);
  prnGaris();

  prnAlign(0);
  prnLine(teksEdukasi);
  prnGaris();

  prnAlign(1);
  prnQR("https://www.lokabakka.my.id");
  prnFeed(1);
  prnLine("www.lokabakka.my.id");
  prnLine("================================");
  prnFeed(3);
  prnCut();

  prnPowerOff();
}
