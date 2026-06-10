"use client"

import React from 'react'
import Link from 'next/link'
import { Activity, Calendar, MapPin, Check, AlertTriangle, Flame, Lightbulb, Heart, Siren, ClipboardList } from 'lucide-react'
import type { PregnancyProfileData, PregnancyVisitData } from '@/lib/growth-standards/imt-calc'      

type RiskLevel = 'rendah' | 'sedang' | 'tinggi'

function computeRiskLevel(lila: number, hb: number, isOnTrack: boolean): RiskLevel {
  if (lila < 23.5 || hb < 11) return 'tinggi'
  if (!isOnTrack) return 'sedang'
  return 'rendah'
}

function formatVisitDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

const IMT_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  normal:      { label: 'Normal',   bg: 'bg-[#E7F7EF]', text: 'text-[#0E6B3E]' },
  underweight: { label: 'Kurang',   bg: 'bg-[#FFF7E6]', text: 'text-[#8A6100]' },
  overweight:  { label: 'Lebih',    bg: 'bg-[#FFF7E6]', text: 'text-[#8A6100]' },
  obese:       { label: 'Obesitas', bg: 'bg-[#FEF1F1]', text: 'text-[#9F1C1C]' },
}

interface Props {
  profile: PregnancyProfileData | null
  latestVisit: PregnancyVisitData | null
}

export default function PregnancyStatusView({ profile, latestVisit }: Props) {
  const activeTab = latestVisit
    ? computeRiskLevel(latestVisit.lilaCm, latestVisit.hbGdl, latestVisit.isOnTrack)
    : 'rendah'

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">

      {/* ── Header ── */}
      <header
        className="flex-none px-6 pt-[6px] pb-4 border-b-0 z-[5]"
        style={{
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F1F7FE 100%)',
          boxShadow: '0 6px 16px -10px rgba(17,120,212,0.4)',
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
        }}
      >
        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#1178D4] bg-[#E7F2FB] px-2.5 py-1 rounded-full mb-2.5">
          <Activity className="w-3 h-3" />
          Pemantauan Kesehatan Bunda
        </span>
        <h1 className="text-[24px] font-semibold text-[#1F2937] leading-tight tracking-tight">Status</h1>
        <p className="mt-1.5 text-[12px] text-[#697079] leading-[1.45] max-w-[310px]">
          Ringkasan kondisi terkini Bunda dari hasil pengukuran di posyandu. Data diperbarui setiap kunjungan rutin — Bunda tidak perlu mengisi sendiri.
        </p>
      </header>

      {/* ── Scrollable body ── */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-5 pt-4.5 pb-[108px]">
        {/* ── Section i: IMT Awal Kehamilan ── */}
        <div className="flex items-center gap-2 mx-0.5 mb-3">
          <span className="flex-none w-5 h-5 rounded-full bg-[#1178D4] text-white text-[11px] font-bold flex items-center justify-center font-mono">i</span>
          <h2 className="text-[14px] font-semibold text-[#1F2937]">Profil IMT Awal Kehamilan</h2>
        </div>

        <section className="bg-white border border-[#E4EDE7] rounded-[18px] p-4 shadow-[0_4px_14px_-8px_rgba(9,30,66,0.12)] mb-4">
          {profile ? (
            <>
              <div className="flex gap-2.5 mb-3">
                {[
                  { k: 'BB Pra-hamil', v: profile.bbPrepregnancyKg.toFixed(1), u: 'kg' },
                  { k: 'Tinggi',       v: profile.heightCm.toFixed(0),         u: 'cm' },
                  { k: 'IMT',          v: profile.imtPrepregnancy.toFixed(1),   u: '' },
                ].map(({ k, v, u }) => (
                  <div key={k} className="flex-1 bg-[#F1F7FE] border border-[#E4EDE7] rounded-[12px] px-2 py-2.5 text-center">
                    <div className="text-[9.5px] font-medium text-[#697079] leading-tight">{k}</div>
                    <div className="text-[18px] font-bold text-[#1F2937] mt-1 leading-none tracking-tight">
                      {v}{u && <span className="text-[10px] font-medium text-[#697079]"> {u}</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                {(() => {
                  const b = IMT_BADGE[profile.imtCategory] ?? IMT_BADGE.normal
                  return (
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${b.bg} ${b.text}`}>
                      {b.label}
                    </span>
                  )
                })()}
                <span className="text-[10.5px] font-medium text-[#697079] leading-snug">
                  Target kenaikan total{' '}
                  <strong className="text-[#1178D4] font-bold">
                    {profile.targetGainMinKg}–{profile.targetGainMaxKg} kg
                  </strong>
                  {' '}· sekitar {profile.weeklyGainMinKg}–{profile.weeklyGainMaxKg} kg/minggu
                </span>
              </div>
            </>
          ) : (
            <p className="text-[12px] text-[#697079] text-center py-2">
              Profil IMT belum tersedia. Kunjungi posyandu untuk pengukuran awal.
            </p>
          )}
        </section>

        {/* ── Section 1: Hasil Pengukuran Terakhir ── */}
        <div className="flex items-center gap-2 mx-0.5 mb-3">
          <span className="flex-none w-5 h-5 rounded-full bg-[#1178D4] text-white text-[11px] font-bold flex items-center justify-center font-mono">1</span>
          <h2 className="text-[14px] font-semibold text-[#1F2937]">Hasil Pengukuran Terakhir</h2>
        </div>

        <section className="bg-white border border-[#E4EDE7] rounded-[18px] p-4 shadow-[0_4px_14px_-8px_rgba(9,30,66,0.12)] mb-4">
          {latestVisit ? (
            <>
              <div className="flex items-center justify-between gap-2.5 mb-3">
                <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#1F2937]">
                  <Calendar className="w-[15px] h-[15px] text-[#1178D4] flex-none" />
                  {formatVisitDate(latestVisit.visitDate)}
                </span>
                <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-[#1178D4] bg-[#E7F2FB] border border-[#C4DDF5] px-2 py-0.5 rounded-full">
                  <MapPin className="w-[11px] h-[11px]" />
                  Kunjungan Posyandu
                </span>
              </div>

              <div className="flex gap-2.5">
                {/* BB */}
                <div className="flex-1 flex flex-col justify-between bg-white border border-[#E4EDE7] rounded-[12px] px-1 py-3 text-center">
                  <div>
                    <div className="text-[9.5px] font-medium text-[#697079] leading-tight">BB Sekarang</div>
                    <div className="text-[17px] font-bold text-[#1F2937] mt-1 leading-none tracking-tight">
                      {latestVisit.currentWeightKg.toFixed(1)}<span className="text-[9px] font-medium text-[#697079]"> kg</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center h-[18px] mt-1.5">
                    <span className="text-[8.5px] font-medium text-[#1178D4] leading-tight">
                      +{latestVisit.weightGainKg.toFixed(1)} kg dari awal
                    </span>
                  </div>
                </div>
                {/* LILA */}
                <div className="flex-1 flex flex-col justify-between bg-white border border-[#E4EDE7] rounded-[12px] px-1 py-3 text-center">
                  <div>
                    <div className="text-[9.5px] font-medium text-[#697079] leading-tight">LILA</div>
                    <div className="text-[17px] font-bold text-[#1F2937] mt-1 leading-none tracking-tight">
                      {latestVisit.lilaCm.toFixed(1)}<span className="text-[9px] font-medium text-[#697079]"> cm</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center h-[18px] mt-1.5">
                    <span className={`inline-block text-[8.5px] font-bold px-2 py-0.5 rounded-full ${
                      latestVisit.lilaCm >= 23.5
                        ? 'bg-[#E7F7EF] text-[#0E6B3E]'
                        : 'bg-[#FEF1F1] text-[#9F1C1C]'
                    }`}>
                      {latestVisit.lilaCm >= 23.5 ? 'Normal' : 'Kurang'}
                    </span>
                  </div>
                </div>
                {/* Hb */}
                <div className="flex-1 flex flex-col justify-between bg-white border border-[#E4EDE7] rounded-[12px] px-1 py-3 text-center">
                  <div>
                    <div className="text-[9.5px] font-medium text-[#697079] leading-tight">Hb</div>
                    <div className="text-[17px] font-bold text-[#1F2937] mt-1 leading-none tracking-tight">
                      {latestVisit.hbGdl.toFixed(1)}<span className="text-[9px] font-medium text-[#697079]"> g/dL</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center h-[18px] mt-1.5">
                    <span className={`inline-block text-[8.5px] font-bold px-2 py-0.5 rounded-full ${
                      latestVisit.hbGdl >= 11
                        ? 'bg-[#E7F7EF] text-[#0E6B3E]'
                        : latestVisit.hbGdl >= 10
                          ? 'bg-[#FFF7E6] text-[#8A6100]'
                          : 'bg-[#FEF1F1] text-[#9F1C1C]'
                    }`}>
                      {latestVisit.hbGdl >= 11 ? 'Normal' : latestVisit.hbGdl >= 10 ? 'Rendah' : 'Sangat Rendah'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-1.5 mt-3 pt-3 border-t border-[#E4EDE7] text-[10px] text-[#989DA3] leading-[1.4]">
                <Check className="w-3 h-3 flex-none text-[#1178D4] mt-0.5" />
                Data diukur oleh kader saat kunjungan. Lihat tren lengkap berat badan di halaman Beranda.
              </div>
            </>
          ) : (
            <p className="text-[12px] text-[#697079] text-center py-2">
              Belum ada data pengukuran dari posyandu.
            </p>
          )}
        </section>

        {/* ── Section 2: Status Kondisi Anda ── */}
        {latestVisit && (
          <section className="mt-2">
            <div className="flex items-center gap-2 mx-0.5 mb-3">
              <span className="flex-none w-5 h-5 rounded-full bg-[#1178D4] text-white text-[11px] font-bold flex items-center justify-center font-mono">2</span>
              <h2 className="text-[14px] font-semibold text-[#1F2937]">Status Kondisi Anda</h2>
            </div>

            {/* Zone bar card */}
            <div className="bg-white border border-[#E4EDE7] rounded-[18px] p-4 shadow-[0_4px_14px_-8px_rgba(9,30,66,0.12)]">
              {/* Verdict */}
              <div className="flex items-center gap-3">
                <div className={`flex-none w-10 h-10 rounded-[12px] flex items-center justify-center ${
                  activeTab === 'rendah' ? 'bg-[#1E9E62]'
                  : activeTab === 'sedang' ? 'bg-[#D99100]'
                  : 'bg-[#DC2626]'
                }`}>
                  {activeTab === 'rendah' && <Check className="w-[22px] h-[22px] text-white" />}
                  {activeTab === 'sedang' && <AlertTriangle className="w-[22px] h-[22px] text-white" />}
                  {activeTab === 'tinggi' && <Flame className="w-[22px] h-[22px] text-white" />}
                </div>
                <div>
                  <div className="text-[10px] font-semibold tracking-[0.04em] uppercase text-[#697079]">
                    Status kondisimu saat ini
                  </div>
                  <div className={`text-[17px] font-bold leading-tight mt-0.5 ${
                    activeTab === 'rendah' ? 'text-[#0E6B3E]'
                    : activeTab === 'sedang' ? 'text-[#8A6100]'
                    : 'text-[#9F1C1C]'
                  }`}>
                    {activeTab === 'rendah' && 'Risiko Rendah · Status Aman'}
                    {activeTab === 'sedang' && 'Risiko Sedang · Perlu Perhatian'}
                    {activeTab === 'tinggi' && 'Risiko Tinggi · Status Risiko Tinggi'}
                  </div>
                </div>
              </div>
            </div>

            {/* Education card */}
            <div className={`mt-3.5 rounded-[18px] p-[18px] border ${
              activeTab === 'rendah' ? 'bg-gradient-to-b from-white to-[#E7F7EF] border-[#C3E9D4]'
              : activeTab === 'sedang' ? 'bg-gradient-to-b from-white to-[#FFF7E6] border-[#F4E2BC]'
              : 'bg-gradient-to-b from-white to-[#FEF1F1] border-[#F6D2D2]'
            }`}>

              {/* Lead paragraph */}
              <p className="text-[13px] font-medium text-[#1F2937] leading-[1.6]">
                {activeTab === 'rendah' && 'Hasil pemeriksaan hari ini menunjukkan kehamilanmu dalam kondisi baik. Artinya, faktor-faktor penting yang mempengaruhi tumbuh kembang si kecil dalam kandungan saat ini terpantau aman. Meski begitu, kondisi ini bisa berubah seiring bertambahnya usia kehamilan, jadi tetap jaga kesehatan ya!'}
                {activeTab === 'sedang' && 'Hasil pemeriksaan hari ini menunjukkan kehamilanmu masuk kategori risiko sedang. Hal ini bukan kondisi darurat kok, tetapi sinyal penting dari tubuhmu pada beberapa hal yang perlu segera diperbaiki supaya si kecil bisa terus tumbuh dengan baik.'}
                {activeTab === 'tinggi' && 'Hasil pemeriksaan menunjukkan kehamilanmu masuk kategori risiko tinggi stunting pada janin karena kurangnya asupan gizi atau suplemen yang dibutuhkan pada masa kehamilan untuk membantu perkembangan janin.'}
              </p>

              {/* Rendah blocks */}
              {activeTab === 'rendah' && (
                <>
                  <h3 className="text-[13.5px] font-semibold text-[#0E6B3E] mt-4 leading-snug">Apa itu risiko rendah?</h3>
                  <p className="text-[12.5px] text-[#4C545F] leading-[1.62] mt-1.5">Risiko rendah artinya data kesehatanmu seperti berat badan, kadar darah (Hb), lingkar lengan atas, dan kebiasaan minum tablet Fe semuanya dalam kondisi yang bagus untuk mendukung pertumbuhan si kecil.</p>
                  <h3 className="text-[13.5px] font-semibold text-[#0E6B3E] mt-4 leading-snug">Hal yang perlu terus kamu jaga:</h3>
                  <ul className="flex flex-col gap-2.5 mt-2.5 list-none">
                    {[
                      'Minum tablet Fe setiap hari tanpa skip, tetapi sesuai dengan anjuran/perintah dokter ya!',
                      'Makan 3 kali sehari, usahakan selalu makan lauk protein seperti telur, ikan, ayam, atau daging.',
                      'Tetap gerak ringan minimal 30 menit sehari, misalnya jalan pagi atau senam hamil.',
                      'Jangan lupa datang ke posyandu atau puskesmas sesuai jadwal untuk memantau kondisi si kecil, meskipun merasa sehat-sehat saja.',
                    ].map((t, i) => (
                      <li key={i} className="flex items-baseline gap-2.5 text-[12.5px] text-[#4C545F] leading-[1.6]">
                        <span className="flex-none w-1.5 h-1.5 rounded-full bg-[#1E9E62] translate-y-[-2px]" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                  <h3 className="text-[13.5px] font-semibold text-[#0E6B3E] mt-4 leading-snug">Hal yang perlu diwaspadai:</h3>
                  <p className="text-[12.5px] text-[#4C545F] leading-[1.62] mt-1.5">Walaupun kondisimu bagus sekarang, ada beberapa hal yang bisa mengubah kategorimu jika tidak dijaga, yaitu berat badan tidak naik dalam 4 minggu ke depan, tablet Fe sering terlewat, atau mual parah yang bikin susah makan.</p>
                </>
              )}

              {/* Sedang blocks */}
              {activeTab === 'sedang' && (
                <>
                  <h3 className="text-[13.5px] font-semibold text-[#8A6100] mt-4 leading-snug">Apa itu risiko sedang?</h3>
                  <p className="text-[12.5px] text-[#4C545F] leading-[1.62] mt-1.5">Risiko sedang artinya ada salah satu data kesehatanmu yang belum ideal. Seperti kadar darahmu mendekati batas anemia, berat badan kurang dari target ideal, lingkar lengan atas mendekati batas kekurangan gizi, atau tablet Fe-mu belum rutin diminum. Satu faktor saja sudah bisa pelan-pelan mempengaruhi asupan gizi ke janin.</p>
                  <h3 className="text-[13.5px] font-semibold text-[#8A6100] mt-4 leading-snug">Faktor risiko yang paling sering jadi penyebab:</h3>
                  <ul className="flex flex-col gap-2.5 mt-2.5 list-none">
                    {[
                      { lead: 'Anemia ringan (Hb 10–11 g/dL):', text: 'Darahmu membawa lebih sedikit oksigen dari yang dibutuhkan si kecil. Kalau ini dibiarkan, pertumbuhan si kecil bisa melambat. Solusinya: minum tablet Fe setiap malam sebelum tidur, barengan dengan vitamin C atau jus jeruk supaya lebih cepat diserap, tetapi ingat sesuai dengan anjuran rekomendasi dari dokter ya!' },
                      { lead: 'Berat badan naik terlalu lambat:', text: 'Tiap trimester punya target kenaikan BB yang berbeda-beda. Kalau BB-mu kurang naik, bisa jadi si kecil tidak mendapat cadangan energi yang cukup. Solusinya: tambahkan camilan bergizi di antara makan utama seperti pisang, kacang tanah, atau segelas susu sudah sangat membantu!' },
                      { lead: 'Tablet Fe sering terlewat:', text: 'Zat besi tidak bisa disimpan dalam sekejap. Melewatkan beberapa hari saja artinya pasokan zat besi ke si kecil sempat terputus. Solusinya: aktifkan reminder pada tugas harian dan minta bantuan suami atau keluarga untuk mengingatkan.' },
                    ].map(({ lead, text }, i) => (
                      <li key={i} className="flex items-baseline gap-2.5 text-[12.5px] text-[#4C545F] leading-[1.6]">
                        <span className="flex-none w-1.5 h-1.5 rounded-full bg-[#1E9E62] translate-y-[-2px]" />
                        <div>
                          <span className="font-semibold text-[#8A6100] block mb-0.5">{lead}</span>
                          {text}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <h3 className="text-[13.5px] font-semibold text-[#8A6100] mt-4 leading-snug">Hal yang perlu kamu lakukan sekarang:</h3>
                  <ul className="flex flex-col gap-2.5 mt-2.5 list-none">
                    {[
                      'Hubungi kadermu minggu ini untuk menetapkan jadwal kontrol ke dokter kandungan.',
                      'Kalau ada keluhan tambahan, jangan tunda untuk ke bidan atau dokter.',
                      'Fokus perbaiki satu faktor risiko yang belum mencukupi kategori normal.',
                    ].map((t, i) => (
                      <li key={i} className="flex items-baseline gap-2.5 text-[12.5px] text-[#4C545F] leading-[1.6]">
                        <span className="flex-none w-1.5 h-1.5 rounded-full bg-[#1E9E62] translate-y-[-2px]" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {/* Tinggi blocks */}
              {activeTab === 'tinggi' && (
                <>
                  <h3 className="text-[13.5px] font-semibold text-[#9F1C1C] mt-4 leading-snug">Apa itu risiko tinggi?</h3>
                  <p className="text-[12.5px] text-[#4C545F] leading-[1.62] mt-1.5">Risiko tinggi bukan berarti si kecil pasti akan stunting. Tapi ini artinya ada beberapa faktor yang muncul bersamaan dan perlu segera ditangani, misalnya kadar darah rendah, kekurangan gizi, berat badan kurang naik, ditambah tablet Fe yang belum rutin. Kalau dibiarkan, ini bisa mempengaruhi tumbuh kembang janin secara perlahan.</p>
                  <h3 className="text-[13.5px] font-semibold text-[#9F1C1C] mt-4 leading-snug">Kenapa ini perlu ditangani cepat?</h3>
                  <p className="text-[12.5px] text-[#4C545F] leading-[1.62] mt-1.5">Saat tubuh ibu kekurangan gizi dan zat besi sekaligus, tubuh ibu akan &quot;mendahulukan dirinya sendiri&quot; untuk bertahan hidup. Artinya si kecil mendapat bukan yang terbaik. Pada jangka pendek pertumbuhan janin bisa melambat, dan dalam jangka panjang sel otak serta organ vitalnya yang sedang berkembang bisa tidak terbentuk sempurna. Sayangnya apabila tidak ditangani segera, jendela emas ini tidak bisa diulang.</p>
                  <h3 className="text-[13.5px] font-semibold text-[#9F1C1C] mt-4 leading-snug">3 hal yang harus dilakukan dalam 3 hari ke depan:</h3>
                  <ul className="flex flex-col gap-2.5 mt-2.5 list-none">
                    {[
                      { lead: 'Pertama — Pergi ke puskesmas atau bidan.', text: 'Kondisi ini perlu diperiksa langsung oleh tenaga kesehatan, bukan hanya dipantau lewat aplikasi. Tunjukkan hasil pemeriksaan ini ke bidan atau dokter, untuk menentukan apakah kamu perlu suplemen tambahan, penanganan anemia khusus, atau program makanan tambahan (PMT) dari puskesmas.' },
                      { lead: 'Kedua — Perbaiki makan mulai hari ini.', text: 'Pastikan setiap makan ada protein hewani. Tidak harus mahal, kamu bisa makan telur rebus, ikan, atau tempe yang membantu sebagai langkah awal. Makan minimal 3 kali sehari dan tambahkan camilan sehat.' },
                      { lead: 'Ketiga — Minum tablet Fe malam ini juga.', text: 'Apapun yang terjadi hari ini, jangan sampai tablet Fe-mu terlewat malam ini. Minum dengan air putih atau jus jeruk, jauh dari teh atau kopi.' },
                    ].map(({ lead, text }, i) => (
                      <li key={i} className="flex items-baseline gap-2.5 text-[12.5px] text-[#4C545F] leading-[1.6]">
                        <span className="flex-none w-1.5 h-1.5 rounded-full bg-[#1E9E62] translate-y-[-2px]" />
                        <div>
                          <span className="font-semibold text-[#9F1C1C] block mb-0.5">{lead}</span>
                          {text}
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* Danger box */}
                  <div className="mt-4 rounded-[14px] border-[1.5px] border-[#F6D2D2] bg-[#FEF1F1] p-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex-none w-[30px] h-[30px] rounded-[9px] bg-[#DC2626] text-white flex items-center justify-center">
                        <Siren className="w-[18px] h-[18px]" />
                      </span>
                      <span className="text-[12.5px] font-bold text-[#9F1C1C] leading-snug">
                        Tanda bahaya yang harus langsung ke IGD
                      </span>
                    </div>
                    <p className="text-[11.5px] text-[#4C545F] leading-[1.5] mt-2.5">
                      Segera pergi ke fasilitas kesehatan terdekat apabila kamu mengalami:
                    </p>
                    <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2.5 list-none">
                      {[
                        'Perdarahan dari jalan lahir',
                        'Gerakan si kecil berkurang atau berhenti lebih dari 12 jam',
                        'Sakit kepala hebat yang tidak membaik',
                        'Pandangan tiba-tiba kabur',
                        'Wajah atau tangan bengkak mendadak',
                        'Kejang',
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-[11px] font-medium text-[#9F1C1C] leading-snug">
                          <span
                            className="flex-none w-1.5 h-1.5 rounded-[2px] bg-[#DC2626] mt-[5px]"
                            style={{ transform: 'rotate(45deg)' }}
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {/* Callout "Ingat ya" */}
              <div className={`mt-4 flex gap-3 items-start rounded-[13px] p-3.5 border ${
                activeTab === 'rendah' ? 'bg-white border-[#C3E9D4]'
                : activeTab === 'sedang' ? 'bg-white border-[#F4E2BC]'
                : 'bg-white border-[#F6D2D2]'
              }`}>
                <span className={`flex-none w-7 h-7 rounded-[9px] flex items-center justify-center text-white ${
                  activeTab === 'rendah' ? 'bg-[#1E9E62]'
                  : activeTab === 'sedang' ? 'bg-[#D99100]'
                  : 'bg-[#DC2626]'
                }`}>
                  {activeTab === 'tinggi'
                    ? <Heart className="w-4 h-4" />
                    : <Lightbulb className="w-4 h-4" />
                  }
                </span>
                <div>
                  <div className={`text-[10px] font-bold tracking-[0.04em] uppercase ${
                    activeTab === 'rendah' ? 'text-[#1E9E62]'
                    : activeTab === 'sedang' ? 'text-[#8A6100]'
                    : 'text-[#9F1C1C]'
                  }`}>Ingat ya</div>
                  <div className={`text-[12px] font-medium leading-[1.5] mt-0.5 ${
                    activeTab === 'rendah' ? 'text-[#0E6B3E]'
                    : activeTab === 'sedang' ? 'text-[#8A6100]'
                    : 'text-[#9F1C1C]'
                  }`}>
                    {activeTab === 'rendah' && 'Risiko rendah bukan berarti bebas masalah selamanya. Ini artinya kamu sudah melakukan hal-hal yang benar dan terkontrol asupan gizi pada janin.'}
                    {activeTab === 'sedang' && 'Risiko sedang bisa turun jadi rendah apabila bunda tidak stress dan melakukan hidup sehat yang baik untuk janin. Jangan lupa untuk melakukan tugas harian!'}
                    {activeTab === 'tinggi' && 'Kategori risiko tinggi bukan akhir dari segalanya. Ini justru informasi berharga yang memberimu kesempatan untuk bertindak sebelum terlambat. Hal paling penting: jangan diam dan jangan tunda.'}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2.5 mt-4 flex-wrap">
                {activeTab === 'rendah' && (
                  <Link
                    href="/ibu/tugas"
                    className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-1.5 text-[12.5px] font-semibold px-3 py-3 rounded-[12px] text-[#1178D4] bg-[#E7F2FB] border border-[#C4DDF5] active:scale-[0.97] transition-transform"
                  >
                    <ClipboardList className="w-[15px] h-[15px]" />
                    Lihat Tugas Harian
                  </Link>
                )}
                {activeTab === 'sedang' && (
                  <>
                    <Link
                      href="/ibu/tugas"
                      className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-1.5 text-[12.5px] font-semibold px-3 py-3 rounded-[12px] text-white active:scale-[0.97] transition-transform"
                      style={{ background: 'linear-gradient(135deg,#2B93E6,#1178D4)', boxShadow: '0 9px 18px -9px rgba(17,120,212,0.7)' }}
                    >
                      <ClipboardList className="w-[15px] h-[15px]" />
                      Lihat Tugas Harian
                    </Link>
                    <a
                      href="#"
                      className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-1.5 text-[12.5px] font-semibold px-3 py-3 rounded-[12px] text-[#1178D4] bg-[#E7F2FB] border border-[#C4DDF5] active:scale-[0.97] transition-transform"
                    >
                      <MapPin className="w-[15px] h-[15px]" />
                      Cari Faskes Terdekat
                    </a>
                  </>
                )}
                {activeTab === 'tinggi' && (
                  <>
                    <a
                      href="#"
                      className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-1.5 text-[12.5px] font-semibold px-3 py-3 rounded-[12px] text-white active:scale-[0.97] transition-transform"
                      style={{ background: 'linear-gradient(135deg,#EF5B4C,#DC2626)', boxShadow: '0 9px 18px -9px rgba(220,38,38,0.7)' }}
                    >
                      <MapPin className="w-[15px] h-[15px]" />
                      Cari Faskes Terdekat
                    </a>
                    <Link
                      href="/ibu/tugas"
                      className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-1.5 text-[12.5px] font-semibold px-3 py-3 rounded-[12px] text-[#1178D4] bg-[#E7F2FB] border border-[#C4DDF5] active:scale-[0.97] transition-transform"
                    >
                      <ClipboardList className="w-[15px] h-[15px]" />
                      Lihat Tugas Harian
                    </Link>
                  </>
                )}
              </div>

            </div>
          </section>
        )}
      </main>

    </div>
  )
}