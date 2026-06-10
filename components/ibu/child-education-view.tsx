"use client"

import React, { useState, useEffect, useRef } from 'react'
import { BookOpen, Lightbulb, AlertCircle, Droplets, Heart, LayoutList, Utensils, Activity, Smile, Disc, Frown, GraduationCap, ShieldCheck, Ruler, Clock, Layers, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

const AGE_GROUPS = [
  { id: 0, title: '0–6 Bln', sub: 'ASI Eksklusif' },
  { id: 1, title: '6–12 Bln', sub: 'MPASI' },
  { id: 2, title: '1–2 Thn', sub: 'Mkn Keluarga' },
  { id: 3, title: '2–3 Thn', sub: 'Isi Piringku' },
  { id: 4, title: '3–5 Thn', sub: 'Prasekolah' },
]

const CHILD_EDU_DATA = [
  {
    tri: 0,
    meta: '0–6 Bulan · Masa ASI Eksklusif',
    articles: [
      {
        icon: <Droplets className="w-[23px] h-[23px]" />,
        title: 'ASI Eksklusif: Perisai Pertama dari Stunting',
        body: 'Tahukah Bunda? Memberikan ASI eksklusif selama 6 bulan pertama dapat melindungi si kecil dari stunting. ASI menyediakan semua zat gizi yang dibutuhkan, membantu imunitas bayi, serta mendukung tumbuh kembang fisik dan otaknya secara optimal.',
        tip: 'Cukup ASI saja sampai usia 6 bulan — belum perlu air putih, madu, atau makanan tambahan.'
      },
      {
        icon: <LayoutList className="w-[23px] h-[23px]" />,
        title: 'Hal yang Perlu Bunda Perhatikan',
        body: (
          <ul className="list-none flex flex-col gap-2.5 mt-2.5">
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[7px] before:h-[7px] before:rounded-full before:bg-[#0F6CBF]">
              Susui bayi minimal <span className="font-semibold text-[#0A487F]">8–12 kali</span> dalam 24 jam, siang dan malam.
            </li>
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[7px] before:h-[7px] before:rounded-full before:bg-[#0F6CBF]">
              <span className="font-semibold text-[#0A487F]">Posisi & perlekatan benar:</span> pastikan pelekatan sudah tepat agar ASI keluar optimal.
            </li>
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[7px] before:h-[7px] before:rounded-full before:bg-[#0F6CBF]">
              <span className="font-semibold text-[#0A487F]">Gizi ibu terjaga:</span> konsumsi makanan bergizi seimbang, cukup air putih, dan suplemen tambah darah bila dianjurkan bidan.
            </li>
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[7px] before:h-[7px] before:rounded-full before:bg-[#0F6CBF]">
              <span className="font-semibold text-[#0A487F]">Pantau berat badan:</span> timbang bayi setiap bulan di Posyandu.
            </li>
          </ul>
        ),
        tip: 'Susui kapan pun bayi mau, siang dan malam — sering menyusu membuat ASI makin banyak.'
      }
    ]
  },
  {
    tri: 1,
    meta: '6–12 Bulan · Masa MPASI',
    articles: [
      {
        icon: <Utensils className="w-[23px] h-[23px]" />,
        title: 'Saatnya MPASI: Pelengkap ASI di Usia 6 Bulan',
        body: 'Halo Bunda! Di usia 6 bulan, ASI saja sudah tidak cukup memenuhi kebutuhan gizi si kecil yang terus berkembang. MPASI hadir sebagai pelengkap ASI untuk memastikan bayi mendapat energi, protein, zat besi, dan nutrisi penting lainnya demi mencegah stunting.',
        tip: 'MPASI melengkapi, bukan menggantikan ASI. Lanjutkan ASI berdampingan dengan MPASI.'
      },
      {
        icon: <Layers className="w-[23px] h-[23px]" />,
        title: 'Tekstur MPASI Sesuai Usia',
        body: (
          <ul className="list-none flex flex-col gap-2.5 mt-2.5">
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[7px] before:h-[7px] before:rounded-full before:bg-[#0F6CBF]">
              <span className="font-semibold text-[#0A487F]">6–8 bulan:</span> bubur lumat kental, dihaluskan dengan saringan atau blender.
            </li>
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[7px] before:h-[7px] before:rounded-full before:bg-[#0F6CBF]">
              <span className="font-semibold text-[#0A487F]">9–11 bulan:</span> makanan cincang halus — bubur kasar atau nasi tim.
            </li>
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[7px] before:h-[7px] before:rounded-full before:bg-[#0F6CBF]">
              <span className="font-semibold text-[#0A487F]">12 bulan ke atas:</span> makanan dengan tekstur lunak.
            </li>
          </ul>
        ),
        tip: 'Naikkan tekstur secara bertahap agar kemampuan mengunyah si kecil berkembang.'
      },
      {
        icon: <Clock className="w-[23px] h-[23px]" />,
        title: 'Frekuensi Makan',
        body: (
          <ul className="list-none flex flex-col gap-2.5 mt-2.5">
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[7px] before:h-[7px] before:rounded-full before:bg-[#0F6CBF]">
              <span className="font-semibold text-[#0A487F]">6–8 bulan:</span> mulai 2–3 sendok makan per kali, 3x sehari + 1–2x camilan.
            </li>
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[7px] before:h-[7px] before:rounded-full before:bg-[#0F6CBF]">
              <span className="font-semibold text-[#0A487F]">9–11 bulan:</span> ½ mangkuk (250 ml) per kali, 3–4x sehari + 1–2x camilan.
            </li>
          </ul>
        ),
        tip: 'Tetapkan jadwal makan yang teratur agar si kecil belajar mengenal rasa lapar dan kenyang.'
      },
      {
        icon: <Utensils className="w-[23px] h-[23px]" />,
        title: 'Contoh Menu MPASI Bergizi',
        body: (
          <ul className="list-none flex flex-col gap-2.5 mt-2.5">
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[7px] before:h-[7px] before:rounded-full before:bg-[#0F6CBF]">
              <span className="font-semibold text-[#0A487F]">Protein hewani:</span> telur, ikan, ayam, hati ayam, daging sapi.
            </li>
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[7px] before:h-[7px] before:rounded-full before:bg-[#0F6CBF]">
              <span className="font-semibold text-[#0A487F]">Sayuran:</span> bayam, wortel, brokoli, labu kuning.
            </li>
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[7px] before:h-[7px] before:rounded-full before:bg-[#0F6CBF]">
              <span className="font-semibold text-[#0A487F]">Karbohidrat:</span> nasi, ubi, kentang.
            </li>
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[7px] before:h-[7px] before:rounded-full before:bg-[#0F6CBF]">
              <span className="font-semibold text-[#0A487F]">Lemak sehat:</span> tambahkan 1 sdt minyak kelapa atau mentega ke dalam MPASI.
            </li>
          </ul>
        ),
        tip: 'Protein hewani adalah kunci pertumbuhan tinggi badan yang optimal.'
      }
    ]
  },
  {
    tri: 2,
    meta: '1–2 Tahun · Makanan Keluarga & Kelulusan ASI',
    articles: [
      {
        icon: <Activity className="w-[23px] h-[23px]" />,
        title: 'Fase Akhir Periode Emas 1000 HPK',
        body: 'Halo Bunda! Di usia 1–2 tahun, si kecil memasuki fase akhir periode emas 1000 HPK yang sangat menentukan. Sistem pencernaan anak kini semakin matang dan siap menerima makanan keluarga sebagai sumber pemenuhan energi serta nutrisi utamanya demi mencegah risiko stunting.',
        tip: '1000 HPK berakhir di usia 2 tahun — manfaatkan momen ini sebaik mungkin.'
      },
      {
        icon: <Utensils className="w-[23px] h-[23px]" />,
        title: 'Tekstur & Porsi Makanan',
        body: (
          <ul className="list-none flex flex-col gap-2.5 mt-2.5">
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[7px] before:h-[7px] before:rounded-full before:bg-[#0F6CBF]">
              <span className="font-semibold text-[#0A487F]">Makanan keluarga:</span> tidak perlu lagi bubur saring — tekstur sudah padat, sama dengan menu orang dewasa di rumah.
            </li>
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[7px] before:h-[7px] before:rounded-full before:bg-[#0F6CBF]">
              <span className="font-semibold text-[#0A487F]">Frekuensi & porsi:</span> 3x makan utama sehari (sekitar ⅓–½ porsi orang dewasa) + 2x camilan sehat di antara jam makan.
            </li>
          </ul>
        ),
        tip: 'Pastikan piring si kecil tetap bergizi seimbang dengan protein hewani.'
      },
      {
        icon: <Heart className="w-[23px] h-[23px]" />,
        title: 'Kelulusan ASI: Menyapih dengan Kasih Sayang',
        body: (
          <ul className="list-none flex flex-col gap-2.5 mt-2.5">
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[7px] before:h-[7px] before:rounded-full before:bg-[#0F6CBF]">
              <span className="font-semibold text-[#0A487F]">Lanjutkan ASI:</span> diteruskan berdampingan dengan makanan utama hingga anak genap 2 tahun (24 bulan).
            </li>
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[7px] before:h-[7px] before:rounded-full before:bg-[#0F6CBF]">
              <span className="font-semibold text-[#0A487F]">Menyapih bertahap:</span> lakukan weaning with love dengan kasih sayang. Hindari paksaan atau zat pahit agar nafsu makan si kecil tidak terganggu.
            </li>
          </ul>
        ),
        tip: 'Menyapih adalah proses emosional, lakukan dengan sabar dan penuh cinta.'
      },
      {
        isWarn: true,
        icon: <Activity className="w-[23px] h-[23px]" />,
        title: 'Pantau Tumbuh Kembang (Z-Score PB/U)',
        body: (
          <ul className="list-none flex flex-col gap-2.5 mt-2.5">
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[6px] before:h-[6px] before:bg-[#ED5610] before:rotate-45">
              <span className="font-semibold text-[#C2410C]">Ukur rutin:</span> Panjang Badan menurut Umur (PB/U) diukur posisi telentang di Posyandu setiap bulan.
            </li>
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[6px] before:h-[6px] before:bg-[#ED5610] before:rotate-45">
              <span className="font-semibold text-[#C2410C]">Kategori normal:</span> grafik berada pada rentang <span className="font-bold">−2 SD s/d 2 SD</span>.
            </li>
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[6px] before:h-[6px] before:bg-[#ED5610] before:rotate-45">
              <span className="font-semibold text-[#C2410C]">Pra-stunting:</span> bila nilai di antara <span className="font-bold">−1 SD s/d −2 SD</span>, segera konsultasi ke petugas kesehatan untuk menaikkan asupan protein hewani sebelum jadi stunting kronis.
            </li>
          </ul>
        ),
        tip: 'Protein hewani adalah kunci memperbaiki grafik pertumbuhan yang melambat.'
      }
    ]
  },
  {
    tri: 3,
    meta: '2–3 Tahun · Masa Toddler & Isi Piringku',
    articles: [
      {
        icon: <Smile className="w-[23px] h-[23px]" />,
        title: 'Masa Toddler: Si Kecil Mulai Bereksplorasi',
        body: 'Halo Bunda! Setelah berhasil melewati 1000 HPK, si kecil kini memasuki fase toddler (2–3 tahun). Pemantauan status gizi harus tetap optimal karena ia mulai aktif mengeksplorasi lingkungan secara fisik dan membutuhkan fondasi zat pembangun yang kuat.',
        tip: 'Anak aktif butuh energi besar — pastikan setiap piring lengkap dan seimbang.'
      },
      {
        icon: <Disc className="w-[23px] h-[23px]" />,
        title: 'Panduan "Isi Piringku"',
        body: (
          <ul className="list-none flex flex-col gap-2.5 mt-2.5">
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[7px] before:h-[7px] before:rounded-full before:bg-[#0F6CBF]">
              <span className="font-semibold text-[#0A487F]">Karbohidrat (⅓ piring):</span> nasi, ubi, jagung, atau kentang sebagai sumber energi aktivitas fisik.
            </li>
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[7px] before:h-[7px] before:rounded-full before:bg-[#0F6CBF]">
              <span className="font-semibold text-[#0A487F]">Protein hewani (⅓ piring):</span> telur, ikan lokal, hati ayam, atau daging — struktur utama penyusun hormon pertumbuhan.
            </li>
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[7px] before:h-[7px] before:rounded-full before:bg-[#0F6CBF]">
              <span className="font-semibold text-[#0A487F]">Sayur & buah (⅓ piring):</span> dibagi seimbang sebagai penunjang imunitas tubuh.
            </li>
          </ul>
        ),
        tip: 'Isi piringku membantu Bunda memastikan semua gizi anak terpenuhi.'
      },
      {
        icon: <Frown className="w-[23px] h-[23px]" />,
        title: 'Menghadapi GTM (Gerakan Tutup Mulut)',
        body: (
          <ul className="list-none flex flex-col gap-2.5 mt-2.5">
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[7px] before:h-[7px] before:rounded-full before:bg-[#0F6CBF]">
              <span className="font-semibold text-[#0A487F]">Variasi menu & tampilan:</span> sajikan dengan kombinasi warna menarik atau cetakan karakter lucu untuk memicu minat makan.
            </li>
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[7px] before:h-[7px] before:rounded-full before:bg-[#0F6CBF]">
              <span className="font-semibold text-[#0A487F]">Disiplin jadwal makan:</span> hindari susu formula atau camilan minimal 2 jam sebelum waktu makan utama agar si kecil merasakan lapar alami.
            </li>
          </ul>
        ),
        tip: 'Ciptakan suasana makan yang menyenangkan tanpa paksaan.'
      },
      {
        isWarn: true,
        icon: <Activity className="w-[23px] h-[23px]" />,
        title: 'Pantau Berat Badan (BB/U)',
        body: (
          <ul className="list-none flex flex-col gap-2.5 mt-2.5">
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[6px] before:h-[6px] before:bg-[#ED5610] before:rotate-45">
              <span className="font-semibold text-[#C2410C]">Weight faltering:</span> berat badan tidak naik atau turun 2 bulan berturut-turut adalah alarm sensitif sebelum mengarah ke stunting.
            </li>
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[6px] before:h-[6px] before:bg-[#ED5610] before:rotate-45">
              <span className="font-semibold text-[#C2410C]">Kategori normal:</span> BB/U anak usia 0–60 bulan wajib dijaga pada rentang <span className="font-bold">−2 SD s/d 2 SD</span>.
            </li>
          </ul>
        ),
        tip: 'Segera periksakan ke dokter atau bidan jika berat badan tidak naik.'
      }
    ]
  },
  {
    tri: 4,
    meta: '3–5 Tahun · Prasekolah & Proteksi Sanitasi',
    articles: [
      {
        icon: <GraduationCap className="w-[23px] h-[23px]" />,
        title: 'Masa Prasekolah yang Aktif Bersosialisasi',
        body: 'Halo Bunda! Di usia 3–5 tahun, si kecil berada pada masa prasekolah yang aktif bersosialisasi. Pemantauan status kesehatan di kluster usia ini bertujuan mengunci hasil pertumbuhan fisik yang optimal sebelum masa balita berakhir pada batas usia 60 bulan.',
        tip: 'Ini garis finish balita — kunci pertumbuhan optimal sebelum usia 60 bulan.'
      },
      {
        icon: <Utensils className="w-[23px] h-[23px]" />,
        title: 'Melatih Kemandirian Makan (Self-Feeding)',
        body: (
          <ul className="list-none flex flex-col gap-2.5 mt-2.5">
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[7px] before:h-[7px] before:rounded-full before:bg-[#0F6CBF]">
              <span className="font-semibold text-[#0A487F]">Eksplorasi mandiri:</span> biarkan si kecil belajar makan sendiri dengan sendok & garpu untuk melatih motorik halus.
            </li>
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[7px] before:h-[7px] before:rounded-full before:bg-[#0F6CBF]">
              <span className="font-semibold text-[#0A487F]">Batasi makanan siap saji:</span> hindari jajanan rendah gizi tinggi pemanis buatan, pewarna, atau pengawet yang dapat memicu malnutrisi sekunder.
            </li>
          </ul>
        ),
        tip: 'Kebiasaan makan sehat yang dibentuk sekarang akan terbawa hingga dewasa.'
      },
      {
        icon: <ShieldCheck className="w-[23px] h-[23px]" />,
        title: 'Memutus Rantai Infeksi (Sanitasi Lingkungan)',
        body: (
          <ul className="list-none flex flex-col gap-2.5 mt-2.5">
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[7px] before:h-[7px] before:rounded-full before:bg-[#0F6CBF]">
              <span className="font-semibold text-[#0A487F]">Cegah diare & ISPA:</span> infeksi berulang dapat menghentikan pertumbuhan karena energi tubuh dialihkan hanya untuk melawan penyakit.
            </li>
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[7px] before:h-[7px] before:rounded-full before:bg-[#0F6CBF]">
              <span className="font-semibold text-[#0A487F]">Budaya CTPS:</span> biasakan cuci tangan pakai sabun di air mengalir sebelum makan, setelah bermain di luar, dan setelah dari kamar mandi.
            </li>
          </ul>
        ),
        tip: 'Sanitasi yang baik mencegah kuman penyakit masuk ke tubuh si kecil.'
      },
      {
        isWarn: true,
        badgeText: 'Garis Finish',
        badgeIcon: <Activity className="w-3 h-3" />,
        icon: <Ruler className="w-[23px] h-[23px]" />,
        title: 'Pantau Antropometri Balita (TB/U)',
        body: (
          <ul className="list-none flex flex-col gap-2.5 mt-2.5">
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[6px] before:h-[6px] before:bg-[#1178D4] before:rotate-45">
              <span className="font-semibold text-[#0A487F]">Kunci TB/U:</span> hingga batas akhir 60 bulan, tinggi badan diukur kader dalam posisi berdiri.
            </li>
            <li className="relative pl-[18px] text-[12.5px] text-[#4C545F] leading-relaxed before:content-[''] before:absolute before:left-0.5 before:top-2 before:w-[6px] before:h-[6px] before:bg-[#1178D4] before:rotate-45">
              <span className="font-semibold text-[#0A487F]">Lulus normal:</span> pastikan Z-Score akhir bertahan pada rentang <span className="font-bold">−2 SD s/d 2 SD</span> agar si kecil dinyatakan bebas stunting permanen saat memasuki usia sekolah.
            </li>
          </ul>
        ),
        tip: 'Konsistensi sejak 0 bulan terbayar di sini — jaga grafik tetap di zona normal.'
      }
    ]
  }
]

export default function ChildEducationView() {
  const [activeGroup, setActiveGroup] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('edukasi_anak_tri')
    if (saved !== null) {
      const idx = parseInt(saved, 10)
      if (!isNaN(idx) && idx >= 0 && idx < AGE_GROUPS.length) {
        setActiveGroup(idx)
      }
    }
  }, [])

  useEffect(() => {
    const activeBtn = buttonsRef.current[activeGroup]
    const container = scrollRef.current
    if (activeBtn && container) {
      const left = activeBtn.offsetLeft - (container.clientWidth - activeBtn.clientWidth) / 2
      container.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
    }
  }, [activeGroup])

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

        <div 
          ref={scrollRef}
          className="flex gap-1.5 mt-4 bg-[#F4F7F5] border border-[#E4EDE7] p-1.25 rounded-[14px] overflow-x-auto no-scrollbar scroll-smooth"
        >
          {AGE_GROUPS.map((g, idx) => (
            <button
              key={g.id}
              ref={el => { buttonsRef.current[idx] = el }}
              onClick={() => handleGroupChange(g.id)}
              className={cn(
                "flex-none min-w-[72px] flex flex-col items-center gap-0.25 py-2 px-2 rounded-[10px] transition-all duration-250",
                activeGroup === g.id 
                  ? "bg-white shadow-[0_2px_6px_rgba(17,120,212,0.18),inset_0_0_0_1px_rgba(17,120,212,0.9)]" 
                  : "bg-transparent"
              )}
            >
              <span className={cn(
                "text-[12px] font-semibold transition-colors duration-250 whitespace-nowrap",
                activeGroup === g.id ? "text-[#0A487F]" : "text-[#989DA3]"
              )}>{g.title}</span>
              <span className={cn(
                "text-[9px] font-medium transition-colors duration-250 whitespace-nowrap",
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

                  {((art as any).isWarn || (art as any).badgeText) && (
                    <div className={cn(
                      "inline-flex items-center gap-1.25 px-2.25 py-0.75 rounded-full border text-[10px] font-bold mb-2.5",
                      (art as any).badgeText === 'Garis Finish'
                        ? "bg-[#E7F2FB] border-[#C4DDF5] text-[#1178D4]"
                        : "bg-[#FFF3EB] border-[#FAD9C5] text-[#ED5610]"
                    )}>
                      {(art as any).badgeIcon || <AlertCircle className="w-3 h-3" />}
                      {(art as any).badgeText || 'Tanda Bahaya'}
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
