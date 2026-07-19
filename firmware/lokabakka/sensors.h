#pragma once

// ponytail: HX711 (berat) & HC-SR04 (tinggi) belum disambungkan -- kembalikan
// nilai uji tetap dulu, berbeda untuk anak vs ibu supaya alur terlihat masuk
// akal saat didemokan. Ganti isi kedua fungsi ini saat sensor asli siap;
// tidak ada bagian firmware lain yang bergantung pada detail sensor.

float readWeightKg(const char* kategori) {
  if (strcmp(kategori, "ibu") == 0) return 58.2f;
  return 12.4f;
}

float readHeightCm(const char* kategori) {
  if (strcmp(kategori, "ibu") == 0) return 155.0f;
  return 87.5f;
}
