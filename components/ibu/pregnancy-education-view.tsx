"use client"

import React, { useState, useEffect } from 'react'
import { BookOpen, Lightbulb, Heart, Pill, ClipboardCheck, AlertCircle, Droplets } from 'lucide-react'
import { cn } from '@/lib/utils'

const TRIMESTERS = [
  { id: 0, title: 'Trimester I', weeks: '0–12 Minggu' },
  { id: 1, title: 'Trimester II', weeks: '13–27 Minggu' },
  { id: 2, title: 'Trimester III', weeks: '28–40 Minggu' },
]

const EDU_DATA = [
  {
    tri: 0,
    meta: 'Trimester I · Usia Kehamilan 0–12 Minggu',
    articles: [
      {
        icon: <Heart className="w-[23px] h-[23px]" />,
        title: 'Selamat Atas Kehamilan Anda! Mari Kenali Trimester I (Fase Embriogenesis)',
        body: 'Selamat Ibu! Saat ini, janin di dalam rahim Ibu sedang menjalani fase paling krusial yang disebut embriogenesis. Pada 12 minggu pertama ini, seluruh susunan saraf pusat, otak, jantung, tangan, dan kaki janin sedang dibentuk dari nol. Tubuh Ibu juga sedang mengalami perubahan hormon yang besar. Wajar jika Ibu merasakan mual, muntah (morning sickness), atau merasa sangat lelah. Ingat, mual adalah tanda bahwa hormon kehamilan bekerja dengan baik, namun jangan biarkan asupan nutrisi janin terputus.',
        tip: 'Mual adalah hal yang wajar, tetap jaga asupan gizi janin agar tidak terputus.'
      },
      {
        icon: <Pill className="w-[23px] h-[23px]" />,
        title: 'Tameng Janin: Pentingnya Asam Folat dan Zat Besi (Fe)',
        body: (
          <>
            <p>Pada trimester pertama, ada dua zat gizi yang tidak boleh absen: Asam Folat dan Zat Besi.</p>
            <ul className="list-none flex flex-col gap-2 mt-2.5">
              <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#1E9E62]">
                <span className="font-semibold text-[#0A487F]">Asam Folat:</span> Berperan vital mencegah cacat tabung saraf otak pada janin. Ibu bisa mendapatkannya dari sayuran hijau (bayam, broccoli), kacang-kacangan, dan telur.
              </li>
              <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#1E9E62]">
                <span className="font-semibold text-[#0A487F]">Zat Besi (Tablet Tambah Darah/TTD):</span> Mencegah Ibu dari anemia. Jika Ibu mengalami anemia di awal kehamilan, aliran oksigen dan makanan ke janin akan terhambat, meningkatkan risiko stunting sejak di rahim. Minumlah 1 TTD setiap hari. Tips mengurangi mual: minum TTD di malam hari sebelum tidur dengan air putih atau air jeruk (vitamin C membantu penyerapan). Jangan minum bersama teh atau kopi karena zat gizi akan terbuang.
              </li>
            </ul>
            <p className="mt-3">Pada trimester 1, kebutuhan porsi makan harian Ibu adalah 5 porsi makanan pokok, 4 porsi protein hewani, 4 porsi protein nabati, 4 porsi sayur, dan 4 porsi buah. Contoh takaran per porsi:</p>
            <ul className="list-none flex flex-col gap-2 mt-2.5">
              <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#1E9E62]">
                <span className="font-semibold text-[#0A487F]">Makanan pokok:</span> 1 porsi = ¾ gelas nasi (100 g), atau 3 buah jagung ukuran sedang (125 g), atau 2 kentang ukuran sedang (210 g), atau 3 iris roti putih (70 g).
              </li>
              <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#1E9E62]">
                <span className="font-semibold text-[#0A487F]">Protein hewani:</span> 1 porsi = 1 potong sedang ikan (50 g) atau 1 butir telur ayam (55 g).
              </li>
              <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#1E9E62]">
                <span className="font-semibold text-[#0A487F]">Protein nabati:</span> 1 porsi = 1 potong sedang tempe (50 g) atau 2 potong sedang tahu (100 g).
              </li>
              <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#1E9E62]">
                <span className="font-semibold text-[#0A487F]">Sayur:</span> 1 porsi = 1 mangkuk sayur matang tanpa kuah (100 g).
              </li>
              <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#1E9E62]">
                <span className="font-semibold text-[#0A487F]">Buah:</span> 1 porsi = 1 potong sedang pisang (100 g) atau 1 potong besar pepaya (100–190 g).
              </li>
            </ul>
            <p className="mt-3">Konsumsi asam folat dan zat besi harian Ibu di atas akan lebih optimal terserap bila dilengkapi porsi makan seimbang ini setiap hari.</p>
          </>
        ),
        tip: 'Jangan lupa minum Tablet Tambah Darah dan konsumsi makanan gizi!'
      },
      {
        icon: <ClipboardCheck className="w-[23px] h-[23px]" />,
        title: 'Membaca Kartu Kesehatan Anda: Apa Arti LILA dan HB?',
        body: (
          <>
            <p>Saat berkunjung ke Posyandu, Kader Kesehatan akan mengukur LILA (Lingkar Lengan Atas) dan kadar HB (Hemoglobin) Ibu. Mari pahami artinya:</p>
            <ul className="list-none flex flex-col gap-2 mt-2.5">
              <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#1E9E62]">
                <span className="font-semibold text-[#0A487F]">LILA Normal (≥ 23,5 cm):</span> Menandakan energi Ibu cukup untuk mendukung pertumbuhan berat badan janin. Jika &lt; 23,5 cm, Ibu termasuk kategori Kurang Energi Kronis (KEK) dan berhak mendapatkan Makanan Tambahan (PMT) dari Puskesmas.
              </li>
              <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#1E9E62]">
                <span className="font-semibold text-[#0A487F]">HB Normal (≥ 11 gr/dL):</span> Menandakan sel darah merah Ibu sehat. Jika &lt; 11 gr/dL, Ibu mengalami anemia dan membutuhkan pengawasan gizi lebih ketat agar janin tidak lahir dengan berat rendah (BBLR).
              </li>
            </ul>
          </>
        ),
        tip: 'Periksa dasbor kesehatan Ibu di website ini secara berkala untuk melihat grafik risiko Anda.'
      }
    ]
  },
  {
    tri: 1,
    meta: 'Trimester II · Usia Kehamilan 13–27 Minggu',
    articles: [
      {
        icon: <Droplets className="w-[23px] h-[23px]" />,
        title: 'Fase Nyaman dan Kebutuhan Energi Ekstra (+300 Kkal)',
        body: (
          <>
            <p>Kabar baik, Ibu! Memasuki minggu ke-13, gejala mual biasanya mulai mereda dan nafsu makan Ibu kembali pulih. Ini adalah fase pertumbuhan cepat bagi janin. Janin mulai bisa bergerak, mendengar suara Ibu, dan ukurannya bertambah panjang dengan cepat. Karena janin tumbuh pesat, Ibu membutuhkan tambahan energi sebesar +300 Kkal setiap hari (setara dengan makan 1 porsi kecil nasi ditambah 1 potong ikan lokal atau telur rebus sebagai selingan). Penuhilah dengan protein hewani, bukan makanan ringan tinggi gula atau tepung kosong.</p>
            <p className="mt-3">Memasuki trimester 2, porsi makanan pokok naik menjadi 6 porsi/hari (setara 6 × ¾ gelas nasi/100 g, atau dikombinasi dengan 3 buah jagung sedang/125 g, 2 kentang sedang/210 g, atau 3 iris roti putih/70 g), sementara protein hewani, protein nabati, sayur, dan buah tetap masing-masing 4 porsi/hari. Batasi konsumsi garam maksimal 1 sendok teh/hari dan cukupi minum air putih 8–12 gelas/hari.</p>
          </>
        ),
        tip: 'Manfaatkan pulihnya nafsu makan Ibu untuk mengonsumsi protein hewani berkualitas tinggi.'
      },
      {
        icon: <Droplets className="w-[23px] h-[23px]" />,
        title: 'Investasi Tulang Janin: Penuhi Kalsium Harian Anda',
        body: 'Pernahkah Ibu merasakan kram pada kaki di malam hari? Itu bisa jadi pertanda janin sedang kekurangan kalsium. Pada trimester kedua, janin menarik cadangan kalsium dari tubuh Ibu secara masif untuk mengeraskan struktur tulang dan bakal giginya di dalam rahim. Jika asupan kalsium Ibu rendah, tubuh akan mengambil kalsium dari tulang Ibu sendiri, yang menyebabkan kram kaki dan pengeroposan tulang Ibu di masa depan. Konsumsilah teri medan, susu, tahu, tempe, dan sayur sesawi secara teratur.',
        tip: 'Konsumsi makanan kaya kalsium melindungi tulang Ibu sekaligus membangun postur tinggi janin.'
      },
      {
        icon: <ClipboardCheck className="w-[23px] h-[23px]" />,
        title: 'Imunisasi Tetanus Toxoid (TT): Perlindungan Persalinan',
        body: 'Imunisasi Tetanus Toxoid (TT) bagi ibu hamil sangat penting untuk memberikan kekebalan tubuh alamiah kepada bayi sebelum dilahirkan. Imunisasi ini melindungi Ibu dan bayi dari infeksi bakteri tetanus yang mematikan yang dapat terjadi saat proses persalinan, terutama jika ada penggunaan alat medis darurat. Konsultasikan dengan kader atau bidan di Puskesmas mengenai jadwal suntik TT Ibu sesuai petunjuk Buku KIA.',
        tip: 'Catat jadwal imunisasi TT Ibu demi persalinan yang bersih dan aman.'
      }
    ]
  },
  {
    tri: 2,
    meta: 'Trimester III · Usia Kehamilan 28–40 Minggu',
    articles: [
      {
        icon: <Heart className="w-[23px] h-[23px]" />,
        title: 'Menuju Hari Kelahiran: Puncak Pemenuhan Nutrisi Otak',
        body: 'Ibu sudah berada di garis akhir! Pada trimester ketiga, berat badan janin akan meningkat hingga dua kali lipat, dan jaringan otaknya sedang mengalami pematangan akhir. Ibu membutuhkan tambahan energi hingga +400 Kkal per hari. Fokuskan makanan pada lemak sehat dan asam lemak esensial (seperti ikan bandeng, ikan cakalang, atau telur) untuk mendukung kecerdasan otak janin. Kebutuhan porsi harian pada trimester 3 sama dengan trimester 2, yaitu 6 porsi makanan pokok, 4 porsi protein hewani, 4 porsi protein nabati, 4 porsi sayur, dan 4 porsi buah per hari. Batasi konsumsi garam maksimal 1 sendok teh/hari dan cukupi minum air putih 8–12 gelas/hari untuk mencegah bengkak dan mendukung volume cairan ketuban. Selain itu, mulailah menghitung gerakan janin secara mandiri. Janin yang sehat akan bergerak minimal 10 kali dalam waktu 12 jam.',
        tip: 'Janin yang aktif bergerak menandakan pasokan oksigen dan gizi dari Ibu berjalan lancar.'
      },
      {
        isWarn: true,
        icon: <AlertCircle className="w-[23px] h-[23px]" />,
        title: 'Sistem Peringatan Dini: Waspadai Tanda Bahaya Trimester 3',
        body: (
          <>
            <p>Ibu harus selalu waspada terhadap tanda-tanda darurat kehamilan tua berikut ini. Jika Ibu mengalami salah satu gejala di bawah ini, segera pergi ke fasilitas kesehatan terdekat tanpa menunda:</p>
            <ul className="list-none flex flex-col gap-2 mt-2.5">
              <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-1.5 before:h-1.5 before:bg-[#ED5610] before:rotate-45">
                Kaki, tangan, atau wajah bengkak disertai sakit kepala hebat dan pandangan kabur.
              </li>
              <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-1.5 before:h-1.5 before:bg-[#ED5610] before:rotate-45">
                Keluar darah atau flek pekat dari jalan lahir.
              </li>
              <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-1.5 before:h-1.5 before:bg-[#ED5610] before:rotate-45">
                Air ketuban merembes atau pecah sebelum waktunya.
              </li>
              <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-1.5 before:h-1.5 before:bg-[#ED5610] before:rotate-45">
                Gerakan bayi di dalam rahim berkurang drastis atau tidak terasa.
              </li>
            </ul>
          </>
        ),
        tip: 'Mengetahui tanda bahaya kehamilan adalah kunci menyelamatkan nyawa Ibu dan bayi.'
      },
      {
        icon: <Droplets className="w-[23px] h-[23px]" />,
        title: 'Persiapan Menyusui: Keajaiban Tetesan Pertama Kolostrum',
        body: 'Setelah bayi lahir, pastikan Ibu meminta kepada bidan untuk melakukan Inisiasi Menyusui Dini (IMD), yaitu membiarkan bayi merangkak di dada Ibu segera setelah lahir. Bayi akan mengisap ASI pertama Ibu yang berwarna kuning kental, yang disebut Kolostrum. Kolostrum adalah imunisasi alamiah pertama di dunia bagi bayi karena kaya akan zat kekebalan tubuh, vitamin, dan protein makro. Memberikan kolostrum dan melanjutkan ASI Eksklusif hingga usia 6 bulan adalah langkah paling ampuh untuk mengunci tameng anti-stunting pada anak.',
        tip: 'ASI pertama yang berwarna kuning jangan dibuang! Itu adalah emas cair untuk imunitas bayi.'
      }
    ]
  }
]

export default function PregnancyEducationView({ trimester }: { trimester?: number }) {
  const [activeTri, setActiveTri] = useState((trimester && trimester > 0) ? trimester - 1 : 0)

  useEffect(() => {
    const saved = localStorage.getItem('edukasi_tri')
    if (saved !== null) {
      setActiveTri(parseInt(saved, 10))
    } else if (trimester && trimester > 0) {
      setActiveTri(trimester - 1)
    }
  }, [trimester])

  const handleTriChange = (idx: number) => {
    setActiveTri(idx)
    localStorage.setItem('edukasi_tri', idx.toString())
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="shrink-0 px-6 pt-[6px] pb-4 bg-gradient-to-b from-white to-[#F1F7FE] rounded-b-[24px] shadow-[0_6px_16px_-10px_rgba(17,120,212,0.4)] z-[5]">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E7F2FB] text-[10px] font-medium text-[#1178D4] mb-2.5">
          <BookOpen className="w-[13px] h-[13px]" />
          Pusat Edukasi Bunda
        </span>
        <h1 className="text-2xl font-semibold text-[#1F2937] tracking-tight leading-tight">Edukasi Kehamilan</h1>
        <p className="mt-1.5 text-[12px] font-normal text-[#697079] leading-relaxed max-w-[300px]">
          Panduan lembut menemani Bunda di setiap langkah kehamilan. Pilih trimester Anda untuk membaca materinya.
        </p>

        <div className="flex gap-1.5 mt-4 bg-[#F4F7F5] border border-[#E4EDE7] p-1.25 rounded-[14px]">
          {TRIMESTERS.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTriChange(t.id)}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.25 py-2 px-1 rounded-[10px] transition-all duration-250",
                activeTri === t.id 
                  ? "bg-white shadow-[0_2px_6px_rgba(17,120,212,0.18),inset_0_0_0_1px_rgba(17,120,212,0.9)]" 
                  : "bg-transparent"
              )}
            >
              <span className={cn(
                "text-[12px] font-semibold transition-colors duration-250",
                activeTri === t.id ? "text-[#0A487F]" : "text-[#989DA3]"
              )}>{t.title}</span>
              <span className={cn(
                "text-[9px] font-medium transition-colors duration-250",
                activeTri === t.id ? "text-[#1178D4]" : "text-[#989DA3] opacity-85"
              )}>{t.weeks}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth px-5 pt-4.5 pb-[108px]">
        {EDU_DATA.map((panel) => (
          <div key={panel.tri} className={cn("space-y-4", activeTri === panel.tri ? "block" : "hidden")}>
            <div className="flex items-center gap-2 mx-0.5 mb-3.5 text-[11px] font-medium text-[#697079]">
              <span><b>{panel.articles.length} materi</b></span>
              <span className="w-0.75 h-0.75 rounded-full bg-[#C7CDD4]" />
              <span>{panel.meta}</span>
            </div>
            
            <div className="flex flex-col gap-4">
              {panel.articles.map((art, idx) => (
                <article 
                  key={idx} 
                  className={cn(
                    "p-4 rounded-[18px] border shadow-[0_4px_14px_-8px_rgba(9,30,66,0.12)] animate-in fade-in slide-in-from-bottom-3 duration-450",
                    (art as any).isWarn 
                      ? "bg-gradient-to-b from-white to-[#FFF8F3] border-[#FAD9C5]" 
                      : "bg-gradient-to-b from-white via-[#FCFEFD] to-[#F1F7FE] border-[#E4EDE7]"
                  )}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={cn(
                      "shrink-0 w-[42px] h-[42px] rounded-[13px] flex items-center justify-center",
                      (art as any).isWarn ? "bg-[#FFF3EB] text-[#ED5610]" : "bg-[#E7F2FB] text-[#1178D4]"
                    )}>
                      {art.icon}
                    </div>
                    <h3 className={cn(
                      "text-[15px] font-semibold leading-tight tracking-[-0.005em] self-center",
                      (art as any).isWarn ? "text-[#C2410C]" : "text-[#1F2937]"
                    )}>
                      {art.title}
                    </h3>
                  </div>

                  {(art as any).isWarn && (
                    <div className="inline-flex items-center gap-1.25 px-2.25 py-0.75 rounded-full bg-[#FFF3EB] border border-[#FAD9C5] text-[10px] font-bold text-[#ED5610] mb-2.5">
                      <AlertCircle className="w-3 h-3" />
                      Tanda Bahaya
                    </div>
                  )}

                  <div className="text-[12.5px] font-normal text-[#4C545F] leading-relaxed">
                    {typeof art.body === 'string' ? <p>{art.body}</p> : art.body}
                  </div>

                  <div className={cn(
                    "mt-3.5 flex gap-2.5 items-start p-[11px_12px] rounded-[13px] border",
                    (art as any).isWarn 
                      ? "bg-[#FFF3EB] border-[#FAD9C5]" 
                      : "bg-[#E7F2FB] border-[#C4DDF5]"
                  )}>
                    <div className={cn(
                      "shrink-0 w-[26px] h-[26px] rounded-lg flex items-center justify-center text-white",
                      (art as any).isWarn ? "bg-[#ED5610]" : "bg-[#1178D4]"
                    )}>
                      {(art as any).isWarn ? <AlertCircle className="w-[15px] h-[15px]" /> : <Lightbulb className="w-[15px] h-[15px]" />}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className={cn("text-[10px] font-bold tracking-wider uppercase", (art as any).isWarn ? "text-[#ED5610]" : "text-[#1178D4]")}>
                        Tips Singkat
                      </span>
                      <span className={cn("text-[12px] font-medium leading-relaxed", (art as any).isWarn ? "text-[#C2410C]" : "text-[#0A487F]")}>
                        {art.tip}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
