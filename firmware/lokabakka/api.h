#pragma once

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

// TFT_eSPI meng-include FS.h lebih dulu dengan FS_NO_GLOBALS aktif, sehingga
// "using namespace fs;" di dalam FS.h dilewati. WebServer.h (ditarik oleh
// WiFiManager) menulis tipe FS tanpa namespace dan gagal compile. Dipasang
// manual di sini — TFT_eSPI sudah selesai di-parse duluan, jadi tidak ada
// bentrok nama File. JANGAN dipindah ke atas include TFT_eSPI.
#include <FS.h>
using namespace fs;

#include <WiFiManager.h>
#include <ESPmDNS.h>
#include "config.h"
#include "screens.h"

// Objek global, bukan lokal di wifiConnect(): startWebPortal() menaruh halaman
// setup di IP alat dan process() harus terus dipanggil dari loop(), jadi
// instance-nya tidak boleh ikut mati saat wifiConnect() selesai.
static WiFiManager wm;

// Dipanggil WiFiManager tepat saat hotspot setup menyala.
static void portalTerbuka(WiFiManager* w) {
  Serial.println("[WIFI] hotspot setup terbuka — sambungkan HP ke " SETUP_AP_SSID);
  layarSetupWifi(SETUP_AP_SSID, SETUP_AP_PASS);
}

// Kredensial disimpan WiFiManager di NVS dan sengaja TIDAK dihapus tiap boot.
// Dulu ada WiFi.disconnect(true, true) di sini untuk membersihkan sisa flash
// lama ("Association refused too many times"); sekarang justru isi NVS itu
// yang harus bertahan antar boot. Kalau kredensialnya memang salah, portal
// yang jadi jalan pulihnya — bukan menghapus paksa.
bool wifiConnect() {
  wm.setAPCallback(portalTerbuka);
  wm.setConnectTimeout(WIFI_CONNECT_TIMEOUT);
  wm.setConfigPortalTimeout(SETUP_PORTAL_TIMEOUT);
  wm.setAPClientCheck(true); // timeout berhenti selama ada HP tersambung

  bool ok = wm.autoConnect(SETUP_AP_SSID, SETUP_AP_PASS);

  if (ok) {
    MDNS.begin(MDNS_NAME);
    // Halaman setup yang sama, tapi disajikan di IP alat pada WiFi posyandu.
    // Ini yang bikin ganti WiFi tidak butuh tombol maupun restart: buka dari
    // browser HP selama alat masih tersambung ke jaringan lama.
    wm.setConfigPortalBlocking(false);
    wm.startWebPortal();
    Serial.printf("[WIFI] setup HP: http://%s  atau  http://" MDNS_NAME ".local\n",
                  WiFi.localIP().toString().c_str());
  }
  return ok;
}

// Wajib dipanggil tiap loop(): ini yang melayani permintaan browser HP.
void wifiLoop() { wm.process(); }

// Struk untuk pengukuran yang diketik manual di web: alat tidak punya jalur
// lain untuk menerimanya, jadi dititipkan pada balasan heartbeat.
struct TugasCetak {
  bool ada = false;
  String namaPasien;
  String kategoriHasil;
  String teksEdukasi;
  String tanggal;
  float bb = 0;
  float tb = 0;
};

// Mengembalikan false kalau server tidak menjawab. Pemanggil WAJIB memakai itu
// untuk melebarkan jeda: fungsi ini memblokir loop() selama menunggu, dan di
// jaringan yang memblokir akses keluar tiap percobaan habis timeout penuh —
// akibatnya wm.process() tak pernah dapat giliran dan halaman setup dari HP
// tidak pernah terbuka meski alat terlihat tersambung.
//
// siapCetak hanya boleh true saat alat diam di menu. Server melepas job cetak
// sekali saja, jadi meminta job selagi sibuk sama dengan membuangnya.
bool sendHeartbeat(bool siapCetak = false, TugasCetak* tugas = nullptr) {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  client.setInsecure(); // ponytail: lewati verifikasi sertifikat TLS; tambahkan root CA jika perlu

  HTTPClient http;
  http.begin(client, String(API_BASE_URL) + "/device/heartbeat");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", ESP32_API_KEY);
  http.setTimeout(4000);

  JsonDocument doc;
  doc["device_id"] = DEVICE_ID;
  doc["siap_cetak"] = siapCetak;
  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  if (code <= 0) {
    http.end();
    return false;
  }

  String response = http.getString();
  http.end();

  if (tugas != nullptr) {
    JsonDocument respDoc;
    if (!deserializeJson(respDoc, response) && respDoc["cetak"].is<JsonObject>()) {
      JsonObject c = respDoc["cetak"];
      tugas->ada = true;
      tugas->namaPasien = c["namaPasien"].as<String>();
      tugas->kategoriHasil = c["kategoriHasil"].as<String>();
      tugas->teksEdukasi = c["teksEdukasi"].as<String>();
      tugas->tanggal = c["tanggal"].as<String>();
      tugas->bb = c["bb"].as<float>();
      tugas->tb = c["tb"].as<float>();
    }
  }
  return true;
}

struct HasilPemeriksaan {
  bool ok = false;
  String error;
  String namaPasien;
  String kategoriHasil;
  String teksEdukasi;
  String tanggal;
  float bb = 0;
  float tb = 0;
};

// jawabanDoc boleh nullptr (dipakai untuk kategori "anak"); untuk "ibu" harus
// berisi objek dengan key: protein, fe, pengetahuan, sanitasi, rokok (bool).
HasilPemeriksaan kirimHasilPengukuran(const char* kategori, float bb, float tb, JsonDocument* jawabanDoc) {
  HasilPemeriksaan hasil;

  if (WiFi.status() != WL_CONNECTED) {
    hasil.error = "WiFi tidak terhubung";
    return hasil;
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.begin(client, String(API_BASE_URL) + "/device/selesai");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", ESP32_API_KEY);
  http.setTimeout(8000);

  JsonDocument doc;
  doc["device_id"] = DEVICE_ID;
  doc["kategori"] = kategori;
  doc["bb"] = bb;
  doc["tb"] = tb;
  if (jawabanDoc != nullptr) {
    doc["jawaban"] = *jawabanDoc;
  }
  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  if (code <= 0) {
    hasil.error = "Timeout / tidak terhubung ke server";
    http.end();
    return hasil;
  }

  String response = http.getString();
  http.end();

  JsonDocument respDoc;
  DeserializationError err = deserializeJson(respDoc, response);
  if (err) {
    hasil.error = "Respons server tidak valid";
    return hasil;
  }
  if (!respDoc["success"].as<bool>()) {
    hasil.error = respDoc["error"] | "Gagal memproses di server";
    return hasil;
  }

  hasil.ok = true;
  hasil.namaPasien = respDoc["namaPasien"].as<String>();
  hasil.kategoriHasil = respDoc["kategoriHasil"].as<String>();
  hasil.teksEdukasi = respDoc["teksEdukasi"].as<String>();
  hasil.tanggal = respDoc["tanggal"].as<String>();
  hasil.bb = respDoc["bb"].as<float>();
  hasil.tb = respDoc["tb"].as<float>();
  return hasil;
}
