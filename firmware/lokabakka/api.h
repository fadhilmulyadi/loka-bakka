#pragma once

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include "config.h"

bool wifiConnect() {
  WiFi.mode(WIFI_STA);
  // Hapus kredensial sisa di NVS dari flash sebelumnya — penyebab umum error
  // "Association refused too many times, max allowed 1".
  WiFi.disconnect(true, true);
  delay(100);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(250);
  }
  return WiFi.status() == WL_CONNECTED;
}

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure(); // ponytail: lewati verifikasi sertifikat TLS; tambahkan root CA jika perlu

  HTTPClient http;
  http.begin(client, String(API_BASE_URL) + "/device/heartbeat");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", ESP32_API_KEY);
  http.setTimeout(8000);

  JsonDocument doc;
  doc["device_id"] = DEVICE_ID;
  String body;
  serializeJson(doc, body);

  http.POST(body);
  http.end();
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
