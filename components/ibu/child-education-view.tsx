"use client"

import React, { useState, useEffect } from 'react'
import { BookOpen, Lightbulb, AlertCircle, Droplets, Heart, Pill, ClipboardCheck, LayoutList, Utensils, Syringe, MessageCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

const AGE_GROUPS = [
  { id: 0, title: '0–6 Bulan', sub: 'ASI Eksklusif' },
  { id: 1, title: '6–24 Bulan', sub: 'MPASI' },
  { id: 2, title: '2–5 Tahun', sub: 'Balita' },
]

const CHILD_EDU_DATA = [
  {
    tri: 0,
    meta: '0–6 Bulan · ASI Eksklusif',
    articles: [
      {
        icon: <Droplets className="w-[23px] h-[23px]" />,
        title: 'ASI Eksklusif: Imunisasi Pertama & Gizi Terlengkap',
        body: 'Pada 6 bulan pertama, ASI saja sudah cukup memenuhi seluruh kebutuhan gizi dan cairan si kecil — tidak perlu tambahan air putih, madu, pisang, atau makanan lain. ASI mengandung zat kekebalan tubuh yang melindungi bayi dari diare dan infeksi, dua hal yang sering memicu anak gagal tumbuh. Memberi ASI eksklusif adalah langkah pertama paling kuat untuk mencegah stunting.',
        tip: 'Cukup ASI saja sampai usia 6 bulan — belum perlu air putih atau makanan tambahan.'
      },
      {
        icon: <Heart className="w-[23px] h-[23px]" />,
        title: 'Menyusui Sesering Mungkin, Siang dan Malam',
        body: (
          <>
            <p>Semakin sering bayi menyusu, semakin banyak ASI yang diproduksi. Susui bayi setiap kali ia ingin (on demand), minimal 8–12 kali dalam 24 jam, termasuk malam hari. Pastikan pelekatan benar: mulut bayi terbuka lebar menutupi sebagian besar areola, dagu menempel ke payudara, dan tidak terdengar bunyi berdecak.</p>
            <ul className="list-none flex flex-col gap-2 mt-2.5">
              <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#1178D4]">
                <span className="font-semibold text-[#0A487F]">Tanda bayi cukup ASI:</span> pipis lebih dari 6 kali sehari, berat badan naik, dan bayi tampak tenang setelah menyusu.
              </li>
              <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#1178D4]">
                <span className="font-semibold text-[#0A487F]">Jaga gizi Ibu menyusui:</span> makan beragam dan cukup, serta minum air yang banyak agar produksi ASI lancar.
              </li>
            </ul>
          </>
        ),
        tip: 'Susui kapan pun bayi mau, siang dan malam — sering menyusu membuat ASI makin banyak.'
      },
      {
        icon: <ClipboardCheck className="w-[23px] h-[23px]" />,
        title: 'Timbang & Ukur di Posyandu Setiap Bulan',
        body: 'Datang ke posyandu setiap bulan agar berat badan dan panjang badan bayi tercatat di Buku KIA. Yang terpenting bukan hanya angkanya, tapi apakah grafiknya terus naik mengikuti garis. Bila berat badan tidak naik (T) atau grafik mendatar, kader atau bidan dapat segera membantu sebelum menjadi masalah.',
        tip: 'Pastikan garis di Buku KIA selalu naik — bukan sekadar angka, tapi arah pertumbuhannya.'
      }
    ]
  },
  {
    tri: 1,
    meta: '6–24 Bulan · MPASI',
    articles: [
      {
        icon: <Utensils className="w-[23px] h-[23px]" />,
        title: 'MPASI Dimulai Tepat di Usia 6 Bulan',
        body: (
          <>
            <p>Setelah 6 bulan, ASI saja tidak lagi cukup — si kecil butuh Makanan Pendamping ASI (MPASI) sambil ASI tetap dilanjutkan hingga 2 tahun. Mulai dari tekstur lembut (saring/lumat), lalu naik bertahap ke cincang dan makanan keluarga seiring usia. Periode 6–24 bulan adalah jendela emas; kekurangan gizi di masa ini paling berisiko menyebabkan stunting.</p>
            <ul className="list-none flex flex-col gap-2 mt-2.5">
              <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#1178D4]">
                <span className="font-semibold text-[#0A487F]">6–8 bulan:</span> bubur kental/lumat, 2–3 kali makan + camilan.
              </li>
              <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#1178D4]">
                <span className="font-semibold text-[#0A487F]">9–11 bulan:</span> makanan cincang halus, 3–4 kali makan.
              </li>
              <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#1178D4]">
                <span className="font-semibold text-[#0A487F]">12–24 bulan:</span> makanan keluarga, 3–4 kali makan + 1–2 camilan.
              </li>
            </ul>
          </>
        ),
        tip: 'Mulai MPASI tepat di usia 6 bulan, tekstur naik bertahap, ASI tetap jalan sampai 2 tahun.'
      },
      {
        icon: <LayoutList className="w-[23px] h-[23px]" />,
        title: 'Protein Hewani Setiap Kali Makan — Kunci Anti-Stunting',
        body: 'Inilah pesan terpenting: setiap kali makan harus ada protein hewani seperti telur, ikan, ayam, hati, atau daging. Protein hewani mengandung zat gizi yang paling dibutuhkan untuk pertumbuhan tinggi badan dan otak, yang sulit digantikan oleh sayur atau tempe saja. Tidak harus mahal — telur dan ikan lokal sangat bergizi dan terjangkau.',
        tip: 'Telur, ikan, atau ayam di setiap piring MPASI — bukan hanya kuah atau sayur saja.'
      },
      {
        icon: <Syringe className="w-[23px] h-[23px]" />,
        title: 'Imunisasi Lengkap & Kebiasaan Bersih',
        body: 'Anak yang sering sakit (diare, batuk-pilek berulang) mudah kehilangan gizi dan gagal tumbuh. Lindungi si kecil dengan imunisasi lengkap sesuai jadwal Buku KIA. Biasakan cuci tangan pakai sabun sebelum menyiapkan makanan dan setelah dari toilet, serta pastikan air dan alat makan bersih.',
        tip: 'Imunisasi lengkap + cuci tangan pakai sabun melindungi gizi si kecil dari penyakit.'
      }
    ]
  },
  {
    tri: 2,
    meta: '2–5 Tahun · Balita',
    articles: [
      {
        icon: <Utensils className="w-[23px] h-[23px]" />,
        title: 'Makan Bergizi Seimbang ala "Isi Piringku"',
        body: 'Di usia balita, terapkan panduan "Isi Piringku" setiap kali makan: setengah piring berisi sayur dan buah, setengahnya lagi berisi makanan pokok (nasi/umbi) dan lauk — utamakan lauk protein hewani. Beri makan 3 kali sehari ditambah camilan sehat, dan batasi makanan/minuman manis serta jajanan rendah gizi.',
        tip: 'Setiap makan: ada makanan pokok, lauk protein hewani, sayur, dan buah.'
      },
      {
        icon: <MessageCircle className="w-[23px] h-[23px]" />,
        title: 'Stimulasi, Bermain & Bicara Setiap Hari',
        body: 'Tumbuh kembang bukan hanya soal tinggi badan, tapi juga otak dan kemampuannya. Ajak anak bermain, bernyanyi, membaca buku bergambar, dan banyak mengobrol setiap hari. Stimulasi yang konsisten membantu kecerdasan, kemampuan bicara, dan rasa percaya diri anak. Pantau juga tahapan perkembangan di Buku KIA (berjalan, bicara, dll).',
        tip: 'Luangkan waktu bermain dan mengobrol tiap hari — itu "gizi" untuk otak si kecil.'
      },
      {
        isWarn: true,
        icon: <AlertTriangle className="w-[23px] h-[23px]" />,
        title: 'Kenali Tanda Anak Berisiko Stunting',
        body: (
          <>
            <p>Tetap tenang, ini bukan untuk menakuti — justru agar Bunda bisa bertindak lebih awal. Segera konsultasi ke posyandu atau puskesmas bila menemukan salah satu tanda berikut:</p>
            <ul className="list-none flex flex-col gap-2 mt-2.5">
              <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-1.5 before:h-1.5 before:bg-[#ED5610] before:rotate-45">
                Tinggi badan anak tampak jauh lebih pendek dibanding teman seusianya.
              </li>
              <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-1.5 before:h-1.5 before:bg-[#ED5610] before:rotate-45">
                Berat badan tidak naik atau grafik di Buku KIA mendatar/turun beberapa bulan.
              </li>
              <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-1.5 before:h-1.5 before:bg-[#ED5610] before:rotate-45">
                Anak terlihat kurang aktif, lemas, atau perkembangannya terlambat (telat berjalan/bicara).
              </li>
              <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-1.5 before:h-1.5 before:bg-[#ED5610] before:rotate-45">
                Sering sakit berulang seperti diare dan batuk-pilek.
              </li>
            </ul>
          </>
        ),
        tip: 'Menemukan tanda lebih awal adalah kesempatan — segera periksakan ke posyandu/puskesmas, jangan ditunda.'
      }
    ]
  }
]

export default function ChildEducationView() {
  const [activeGroup, setActiveGroup] = useState(0)

  useEffect(() => {
    const saved = localStorage.getItem('edukasi_anak_tri')
    if (saved !== null) {
      setActiveGroup(parseInt(saved, 10))
    }
  }, [])

  const handleGroupChange = (idx: number) => {
    setActiveGroup(idx)
    localStorage.setItem('edukasi_anak_tri', idx.toString())
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="shrink-0 px-6 pt-[6px] pb-4 bg-gradient-to-b from-white to-[#F1F7FE] rounded-b-[24px] shadow-[0_6px_16px_-10px_rgba(17,120,212,0.4)] z-[5]">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E7F2FB] text-[10px] font-medium text-[#1178D4] mb-2.5">
          <BookOpen className="w-[13px] h-[13px]" />
          Pusat Edukasi Tumbuh Kembang
        </span>
        <h1 className="text-2xl font-semibold text-[#1F2937] tracking-tight leading-tight">Edukasi Anak</h1>
        <p className="mt-1.5 text-[12px] font-normal text-[#697079] leading-relaxed max-w-[300px]">
          Panduan lembut menemani perjalanan tumbuh kembang si kecil. Pilih fase usia anak untuk membaca materinya.
        </p>

        <div className="flex gap-1.5 mt-4 bg-[#F4F7F5] border border-[#E4EDE7] p-1.25 rounded-[14px]">
          {AGE_GROUPS.map((g) => (
            <button
              key={g.id}
              onClick={() => handleGroupChange(g.id)}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.25 py-2 px-1 rounded-[10px] transition-all duration-250",
                activeGroup === g.id 
                  ? "bg-white shadow-[0_2px_6px_rgba(17,120,212,0.18),inset_0_0_0_1px_rgba(17,120,212,0.9)]" 
                  : "bg-transparent"
              )}
            >
              <span className={cn(
                "text-[12px] font-semibold transition-colors duration-250",
                activeGroup === g.id ? "text-[#0A487F]" : "text-[#989DA3]"
              )}>{g.title}</span>
              <span className={cn(
                "text-[9px] font-medium transition-colors duration-250",
                activeGroup === g.id ? "text-[#1178D4]" : "text-[#989DA3] opacity-85"
              )}>{g.sub}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth px-5 pt-4.5 pb-[108px]">
        {CHILD_EDU_DATA.map((panel) => (
          <div key={panel.tri} className={cn("space-y-4", activeGroup === panel.tri ? "block" : "hidden")}>
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
                      {(art as any).isWarn ? <AlertTriangle className="w-[15px] h-[15px]" /> : <Lightbulb className="w-[15px] h-[15px]" />}
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
