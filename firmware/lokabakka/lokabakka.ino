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
  "Apakah Ibu mengonsumsi makanan gizi seimbang (karbohidrat, protein, sayur, dan buah) dan sumber protein hewani (telur, ikan, daging, atau susu) setiap hari selama hamil?",
  "Apakah Ibu mengonsumsi tablet tambah darah (zat besi) atau makanan sumber zat besi (seperti hati, bayam, dan sejenisnya) secara rutin selama hamil?",
  "Apakah Ibu telah mengetahui/memahami informasi kehamilan sesuai dengan usia kandungan saat ini?",
  "Apakah Ibu tinggal di lingkungan tanpa akses air bersih yang layak?",
  "Apakah Ibu merokok atau sering terpapar asap rokok selama kehamilan ini?",
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
unsigned long lastStatusWifi = 0;
// Melebar sendiri saat server tak menjawab — lihat komentar di sendHeartbeat().
unsigned long jedaHeartbeat = 8000;

bool tombolDitekan(int pin, unsigned long &lastPress) {
  if (digitalRead(pin) == LOW && millis() - lastPress > 250) {
    lastPress = millis();
    return true;
  }
  return false;
}

// Dua tahap terpisah supaya kader tahu sedang menunggu apa: berat dulu (bisa
// sampai 12 detik menunggu angka stabil), baru tinggi.
void ukurSekarang() {
  layarMengukur("Menimbang berat badan", "Berdiri tegak di atas timbangan, jangan bergerak");
  bbUkur = readWeightKg(layarMengukurTik);

  layarMengukur("Mengukur tinggi badan", "Tetap berdiri tegak, pandangan lurus ke depan");
  tbUkur = readHeightCm(layarMengukurTik);

  layarAktif = LAYAR_UKUR;
  layarUkur(bbUkur, tbUkur);
}

void mulaiKirim() {
  layarAktif = LAYAR_UKUR; // dipakai sesaat sebelum digambar ulang di bawah
  layarKirim(bbUkur, tbUkur);

  JsonDocument jawabanDoc;
  JsonDocument* jawabanPtr = nullptr;
  if (strcmp(kategoriDipilih, "ibu") == 0) {
    jawabanDoc["protein"] = jawabanIbu[0];
    jawabanDoc["fe"] = jawabanIbu[1];
    jawabanDoc["pengetahuan"] = jawabanIbu[2];
    jawabanDoc["sanitasi"] = jawabanIbu[3];
    jawabanDoc["rokok"] = jawabanIbu[4];
    jawabanPtr = &jawabanDoc;
  }

  hasilTerakhir = kirimHasilPengukuran(kategoriDipilih, bbUkur, tbUkur, jawabanPtr);

  if (hasilTerakhir.ok) {
    layarAktif = LAYAR_HASIL;
    uint16_t warna = hasilTerakhir.kategoriHasil == "NORMAL"
      ? COL_GREEN
      : hasilTerakhir.kategoriHasil == "PRA STUNTING"
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
  layarPilihKategori(sorotanKategori);
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

  // Self-test lampu tiap boot (§14 langkah 5): hijau → kuning → merah → mati.
  // Alat dinyalakan sekali per hari kegiatan, jadi tambahan aus relay diabaikan
  // — beda dengan animasi per pengukuran yang menguras umur kontak relay.
  lampTest();

  sensorsInit(); // tare timbangan — platform harus kosong saat alat dinyalakan
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
  wifiLoop(); // layani halaman setup WiFi dari browser HP

  if (millis() - lastHeartbeat > jedaHeartbeat) {
    // Hanya minta job cetak saat diam di menu: mencetak mematikan WiFi dan
    // memblokir ±10 detik, tidak boleh menyela pengukuran atau kuesioner.
    TugasCetak tugas;
    bool idle = (layarAktif == LAYAR_PILIH_KATEGORI);
    jedaHeartbeat = sendHeartbeat(idle, &tugas) ? 8000 : 60000;
    lastHeartbeat = millis();

    if (tugas.ada) {
      layarCetak();
      lampMati(); // lepas beban koil relay dari rel 5V sebelum printer nyala
      cetakStruk(tugas.namaPasien, tugas.tanggal, tugas.bb, tugas.tb,
                 tugas.kategoriHasil, tugas.teksEdukasi);
      kembaliKeMenu();
      lastHeartbeat = millis(); // cetak makan waktu; jangan langsung heartbeat lagi
    }
  }

  // Hanya di layar menu: layar lain bersifat sementara dan header-nya dipakai
  // untuk hal lain, jadi tidak perlu diganggu.
  if (layarAktif == LAYAR_PILIH_KATEGORI && millis() - lastStatusWifi > 3000) {
    lastStatusWifi = millis();
    gambarStatusWifi();
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
        layarPilihKategori(sorotanKategori);
      } else if (dua) {
        kategoriDipilih = sorotanKategori == 0 ? "anak" : "ibu";
        ukurSekarang();
      }
      break;

    case LAYAR_UKUR:
      if (satu) {
        ukurSekarang(); // ULANGI — lewat layar loading yang sama
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
        lampMati(); // lepas beban koil relay dari rel 5V sebelum printer nyala
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
