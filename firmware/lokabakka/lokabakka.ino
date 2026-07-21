#include <TFT_eSPI.h>
#include <ArduinoJson.h>
#include "config.h"
#include "sensors.h"
#include "api.h"
#include "printer.h"
#include "screens.h"
#include "lamps.h"

TFT_eSPI tft = TFT_eSPI();

enum Layar {
  LAYAR_PILIH_KATEGORI,
  LAYAR_UKUR,
  LAYAR_KUESIONER,
  LAYAR_GAGAL,
  LAYAR_HASIL,
  LAYAR_SELESAI,
};

const char* PERTANYAAN[5] = {
  "Apakah Ibu makan gizi seimbang dan protein hewani (telur, ikan, daging, susu) setiap hari?",
  "Apakah Ibu rutin minum tablet tambah darah atau makan sumber zat besi (hati, bayam, dll)?",
  "Apakah Ibu sudah memahami info kehamilan sesuai usia kandungan saat ini?",
  "Apakah Ibu tinggal di lingkungan tanpa akses air bersih yang layak?",
  "Apakah Ibu merokok atau sering terpapar asap rokok selama kehamilan?",
};
// Urutan tetap: 0=protein 1=fe 2=pengetahuan 3=sanitasi 4=rokok - harus sama
// dengan key JSON yang dibaca lib/growth-standards/risiko-kehamilan-calc.ts
// di server (Task 2/4 pada plan backend).

Layar layarAktif = LAYAR_PILIH_KATEGORI;
int sorotanKategori = 0; // 0 = Anak, 1 = Ibu Hamil
const char* kategoriDipilih = "anak";
float bbUkur = 0, tbUkur = 0;
int kuesionerIndex = 0;
bool jawabanIbu[5];
HasilPemeriksaan hasilTerakhir;
bool wifiOk = false;

unsigned long lastBtnSatu = 0;
unsigned long lastBtnDua = 0;
unsigned long lastHeartbeat = 0;
unsigned long selesaiSejak = 0;

bool tombolDitekan(int pin, unsigned long &lastPress) {
  if (digitalRead(pin) == LOW && millis() - lastPress > 250) {
    lastPress = millis();
    return true;
  }
  return false;
}

void mulaiKirim() {
  layarAktif = LAYAR_UKUR; // dipakai sesaat sebelum digambar ulang di bawah
  layarKirim(bbUkur, tbUkur);

  if (strcmp(kategoriDipilih, "ibu") == 0) {
    JsonDocument jawabanDoc;
    jawabanDoc["protein"] = jawabanIbu[0];
    jawabanDoc["fe"] = jawabanIbu[1];
    jawabanDoc["pengetahuan"] = jawabanIbu[2];
    jawabanDoc["sanitasi"] = jawabanIbu[3];
    jawabanDoc["rokok"] = jawabanIbu[4];
    hasilTerakhir = kirimHasilPengukuran(kategoriDipilih, bbUkur, tbUkur, &jawabanDoc);
  } else {
    hasilTerakhir = kirimHasilPengukuran(kategoriDipilih, bbUkur, tbUkur, nullptr);
  }

  if (hasilTerakhir.ok) {
    layarAktif = LAYAR_HASIL;
    uint16_t warna = hasilTerakhir.kategoriHasil == "NORMAL" || hasilTerakhir.kategoriHasil == "RENDAH"
      ? COL_GREEN
      : hasilTerakhir.kategoriHasil == "PENDEK" || hasilTerakhir.kategoriHasil == "SEDANG"
        ? COL_YELLOW
        : COL_RED;
    layarHasil(strcmp(kategoriDipilih, "ibu") == 0, hasilTerakhir.bb, hasilTerakhir.tb,
               hasilTerakhir.kategoriHasil, warna, hasilTerakhir.teksEdukasi);
    lampDariKategori(hasilTerakhir.kategoriHasil); // nyalakan lampu sesuai hasil
  } else {
    layarAktif = LAYAR_GAGAL;
    layarGagal(hasilTerakhir.error);
  }
}

void kembaliKeMenu() {
  lampMati();                          // matikan semua lampu saat kembali ke menu
  sorotanKategori = 0;
  layarAktif = LAYAR_PILIH_KATEGORI;
  layarPilihKategori(sorotanKategori, wifiOk);
}

void setup() {
  Serial.begin(115200);

  pinMode(PIN_BTN_SATU, INPUT_PULLUP);
  pinMode(PIN_BTN_DUA, INPUT_PULLUP);

  // Inisialisasi lampu — semua mati sebelum apapun terjadi (§16 wiring doc)
  lampInit();

  tft.init();
  tft.setRotation(1);
  layarBoot();

  // Mode komisioning: tahan BTN_SATU saat boot → test sequence lampu
  // Berguna saat perakitan (§14 langkah 5) sebelum firmware lengkap diflash
  if (digitalRead(PIN_BTN_SATU) == LOW) {
    Serial.println("[COMMISSIONING] Mode test lampu aktif (BTN_SATU ditahan)");
    delay(500); // debounce boot
    lampTest(800);
    Serial.println("[COMMISSIONING] Selesai, lanjut normal.");
  }

  prnInit();

  wifiOk = wifiConnect();
  if (wifiOk) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }
  Serial.println(wifiOk ? "WiFi terhubung" : "WiFi gagal terhubung, lanjut ke kategori");

  kembaliKeMenu();
}

void loop() {
  if (millis() - lastHeartbeat > 8000) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }

  if (layarAktif == LAYAR_SELESAI && millis() - selesaiSejak > 5000) {
    kembaliKeMenu();
  }

  bool satu = tombolDitekan(PIN_BTN_SATU, lastBtnSatu);
  bool dua = tombolDitekan(PIN_BTN_DUA, lastBtnDua);
  if (!satu && !dua) return;

  switch (layarAktif) {
    case LAYAR_PILIH_KATEGORI:
      if (satu) {
        sorotanKategori = 1 - sorotanKategori;
        layarPilihKategori(sorotanKategori, wifiOk);
      } else if (dua) {
        kategoriDipilih = sorotanKategori == 0 ? "anak" : "ibu";
        bbUkur = readWeightKg(kategoriDipilih);
        tbUkur = readHeightCm(kategoriDipilih);
        layarAktif = LAYAR_UKUR;
        layarUkur(bbUkur, tbUkur);
      }
      break;

    case LAYAR_UKUR:
      if (satu) {
        bbUkur = readWeightKg(kategoriDipilih);
        tbUkur = readHeightCm(kategoriDipilih);
        layarUkur(bbUkur, tbUkur);
      } else if (dua) {
        if (strcmp(kategoriDipilih, "ibu") == 0) {
          kuesionerIndex = 0;
          layarAktif = LAYAR_KUESIONER;
          layarKuesioner(1, 5, PERTANYAAN[0]);
        } else {
          mulaiKirim();
        }
      }
      break;

    case LAYAR_KUESIONER:
      if (satu || dua) {
        jawabanIbu[kuesionerIndex] = dua; // dua = YA (true), satu = TIDAK (false)
        kuesionerIndex++;
        if (kuesionerIndex < 5) {
          layarKuesioner(kuesionerIndex + 1, 5, PERTANYAAN[kuesionerIndex]);
        } else {
          mulaiKirim();
        }
      }
      break;

    case LAYAR_GAGAL:
      if (satu) {
        kembaliKeMenu();
      } else if (dua) {
        mulaiKirim();
      }
      break;

    case LAYAR_HASIL:
      if (satu) {
        layarAktif = LAYAR_SELESAI;
        selesaiSejak = millis();
        layarSelesai();
      } else if (dua) {
        layarCetak();
        cetakStruk(hasilTerakhir.namaPasien, hasilTerakhir.tanggal, hasilTerakhir.bb, hasilTerakhir.tb,
                   hasilTerakhir.kategoriHasil, hasilTerakhir.teksEdukasi);
        layarAktif = LAYAR_SELESAI;
        selesaiSejak = millis();
        layarSelesai();
      }
      break;

    case LAYAR_SELESAI:
      if (dua) {
        kembaliKeMenu();
      }
      break;
  }
}
