"use client"

import React from 'react'
import { Activity, Calendar, MapPin, Check } from 'lucide-react'
import type { PregnancyProfileData, PregnancyVisitData } from '@/lib/growth-standards/imt-calc'
import { hitungRisikoIbu, statusKunjunganIbu, type RiskLevel } from '@/lib/growth-standards/risiko-kehamilan-calc'
import { getStatusStyle } from '@/lib/status-styles'
import { calculateGestationalAge } from '@/lib/pregnancy-utils'
import GrowthChart from '@/components/ibu/growth-chart'
import {
  SectionHeading, Card, MetricTile, RiskGauge, StatusVerdictCard, StatusEduCard, VisitRow,
  type StatusEdu,
} from '@/components/ibu/status-detail'

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

const STATUS_EDU: Record<RiskLevel, StatusEdu> = {
  rendah: {
    intro: 'Hasil pemeriksaan hari ini menunjukkan kehamilanmu dalam kondisi baik. Artinya, faktor-faktor penting yang mempengaruhi tumbuh kembang si kecil dalam kandungan saat ini terpantau aman. Meski begitu, kondisi ini bisa berubah seiring bertambahnya usia kehamilan, jadi tetap jaga kesehatan ya!',
    sections: [
      {
        heading: 'Apa itu status normal?',
        body: 'Status normal artinya data kesehatanmu seperti berat badan, kadar darah (Hb), lingkar lengan atas, dan kebiasaan minum tablet tambah darah semuanya dalam kondisi yang bagus untuk mendukung pertumbuhan si kecil.',
      },
      {
        heading: 'Hal yang perlu terus kamu jaga',
        items: [
          { text: 'Minum tablet tambah darah setiap hari tanpa skip, tetapi sesuai dengan anjuran/perintah dokter ya!' },
          { text: 'Makan 3 kali sehari, usahakan selalu makan lauk protein seperti telur, ikan, ayam, atau daging.' },
          { text: 'Tetap gerak ringan minimal 30 menit sehari, misalnya jalan pagi atau senam hamil.' },
          { text: 'Jangan lupa datang ke posyandu atau puskesmas sesuai jadwal untuk memantau kondisi si kecil, meskipun merasa sehat-sehat saja.' },
        ],
      },
      {
        heading: 'Hal yang perlu diwaspadai',
        body: 'Walaupun kondisimu bagus sekarang, ada beberapa hal yang bisa mengubah statusmu jika tidak dijaga, yaitu berat badan tidak naik dalam 4 minggu ke depan, tablet tambah darah sering terlewat, atau mual parah yang bikin susah makan.',
      },
    ],
    closing: 'Status normal bukan berarti bebas masalah selamanya. Ini artinya kamu sudah melakukan hal-hal yang benar dan asupan gizi pada janin terkontrol.',
    actions: [
      { label: 'Lihat Tugas Harian', href: '/ibu/tugas', icon: 'tugas' },
    ],
  },

  sedang: {
    intro: 'Hasil pemeriksaan hari ini menunjukkan kehamilanmu masuk kategori pra stunting. Hal ini bukan kondisi darurat kok, tetapi sinyal penting dari tubuhmu pada beberapa hal yang perlu segera diperbaiki supaya si kecil bisa terus tumbuh dengan baik.',
    sections: [
      {
        heading: 'Apa itu pra stunting?',
        body: 'Pra stunting artinya ada salah satu data kesehatanmu yang belum ideal. Seperti kadar darahmu mendekati batas anemia, berat badan kurang dari target ideal, lingkar lengan atas mendekati batas kekurangan gizi, atau tablet tambah darahmu belum rutin diminum. Satu faktor saja sudah bisa pelan-pelan mempengaruhi asupan gizi ke janin.',
      },
      {
        heading: 'Faktor yang paling sering jadi penyebab',
        items: [
          { lead: 'Anemia ringan (Hb 10–11 g/dL):', text: 'Darahmu membawa lebih sedikit oksigen dari yang dibutuhkan si kecil. Kalau ini dibiarkan, pertumbuhan si kecil bisa melambat. Solusinya: minum tablet tambah darah setiap malam sebelum tidur, barengan dengan vitamin C atau jus jeruk supaya lebih cepat diserap, tetapi ingat sesuai dengan anjuran rekomendasi dari dokter ya!' },
          { lead: 'Berat badan naik terlalu lambat:', text: 'Tiap trimester punya target kenaikan BB yang berbeda-beda. Kalau BB-mu kurang naik, bisa jadi si kecil tidak mendapat cadangan energi yang cukup. Solusinya: tambahkan camilan bergizi di antara makan utama seperti pisang, kacang tanah, atau segelas susu sudah sangat membantu!' },
          { lead: 'Tablet tambah darah sering terlewat:', text: 'Zat besi tidak bisa disimpan dalam sekejap. Melewatkan beberapa hari saja artinya pasokan zat besi ke si kecil sempat terputus. Solusinya: aktifkan reminder pada tugas harian dan minta bantuan suami atau keluarga untuk mengingatkan.' },
        ],
      },
      {
        heading: 'Hal yang perlu kamu lakukan sekarang',
        items: [
          { text: 'Hubungi kadermu minggu ini untuk menetapkan jadwal kontrol ke dokter kandungan.' },
          { text: 'Kalau ada keluhan tambahan, jangan tunda untuk ke bidan atau dokter.' },
          { text: 'Fokus perbaiki satu faktor yang belum mencukupi kategori normal.' },
        ],
      },
    ],
    closing: 'Pra stunting bisa kembali ke normal apabila Bunda tidak stress dan menjalani hidup sehat yang baik untuk janin. Jangan lupa untuk melakukan tugas harian!',
    actions: [
      { label: 'Lihat Tugas Harian', href: '/ibu/tugas', icon: 'tugas', primary: true },
      { label: 'Cari Faskes Terdekat', href: '#', icon: 'faskes' },
    ],
  },

  tinggi: {
    intro: 'Hasil pemeriksaan menunjukkan kehamilanmu masuk kategori stunting karena kurangnya asupan gizi atau suplemen yang dibutuhkan pada masa kehamilan untuk membantu perkembangan janin.',
    sections: [
      {
        heading: 'Apa maksud status ini?',
        body: 'Status ini bukan berarti si kecil pasti akan stunting. Tapi ini artinya ada beberapa faktor yang muncul bersamaan dan perlu segera ditangani, misalnya kadar darah rendah, kekurangan gizi, berat badan kurang naik, ditambah tablet tambah darah yang belum rutin. Kalau dibiarkan, ini bisa mempengaruhi tumbuh kembang janin secara perlahan.',
      },
      {
        heading: 'Kenapa ini perlu ditangani cepat?',
        body: 'Saat tubuh ibu kekurangan gizi dan zat besi sekaligus, tubuh ibu akan mendahulukan dirinya sendiri untuk bertahan hidup. Artinya si kecil mendapat bukan yang terbaik. Pada jangka pendek pertumbuhan janin bisa melambat, dan dalam jangka panjang sel otak serta organ vitalnya yang sedang berkembang bisa tidak terbentuk sempurna. Sayangnya apabila tidak ditangani segera, jendela emas ini tidak bisa diulang.',
      },
      {
        heading: '3 hal yang harus dilakukan dalam 3 hari ke depan',
        items: [
          { lead: 'Pertama: Pergi ke puskesmas atau bidan.', text: 'Kondisi ini perlu diperiksa langsung oleh tenaga kesehatan, bukan hanya dipantau lewat aplikasi. Tunjukkan hasil pemeriksaan ini ke bidan atau dokter, untuk menentukan apakah kamu perlu suplemen tambahan, penanganan anemia khusus, atau program makanan tambahan (PMT) dari puskesmas.' },
          { lead: 'Kedua: Perbaiki makan mulai hari ini.', text: 'Pastikan setiap makan ada protein hewani. Tidak harus mahal, kamu bisa makan telur rebus, ikan, atau tempe yang membantu sebagai langkah awal. Makan minimal 3 kali sehari dan tambahkan camilan sehat.' },
          { lead: 'Ketiga: Minum tablet tambah darah malam ini juga.', text: 'Apapun yang terjadi hari ini, jangan sampai tablet tambah darahmu terlewat malam ini. Minum dengan air putih atau jus jeruk, jauh dari teh atau kopi.' },
        ],
      },
    ],
    danger: {
      title: 'Tanda bahaya yang harus langsung ke IGD',
      note: 'Segera pergi ke fasilitas kesehatan terdekat apabila kamu mengalami:',
      items: [
        'Perdarahan dari jalan lahir',
        'Gerakan si kecil berkurang atau berhenti lebih dari 12 jam',
        'Sakit kepala hebat yang tidak membaik',
        'Pandangan tiba-tiba kabur',
        'Wajah atau tangan bengkak mendadak',
        'Kejang',
      ],
    },
    closing: 'Status ini bukan akhir dari segalanya. Ini justru informasi berharga yang memberimu kesempatan untuk bertindak sebelum terlambat. Hal paling penting: jangan diam dan jangan tunda.',
    actions: [
      { label: 'Cari Faskes Terdekat', href: '#', icon: 'faskes', primary: true },
      { label: 'Lihat Tugas Harian', href: '/ibu/tugas', icon: 'tugas' },
    ],
  },
}

interface Props {
  profile: PregnancyProfileData | null
  visits: PregnancyVisitData[]
}

export default function PregnancyStatusView({ profile, visits }: Props) {
  const latestVisit = visits[0] ?? null

  const level: RiskLevel = latestVisit && profile
    ? hitungRisikoIbu({
        imtCategory: profile.imtCategory,
        lilaCm: latestVisit.lilaCm,
        hbGdl: latestVisit.hbGdl,
        kuesionerBand: profile.kuesionerBand,
      }).level
    : 'rendah'

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">

      {/* ── Header ── */}
      <header className="flex-none px-6 pt-[6px] pb-4 bg-gradient-to-b from-white to-[#F1F7FE] rounded-b-[24px] shadow-[0_6px_16px_-10px_rgba(17,120,212,0.4)] z-[5]">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#1178D4] bg-[#E7F2FB] px-2.5 py-1 rounded-full mb-2.5">
          <Activity className="w-3 h-3" />
          Pemantauan Kesehatan Bunda
        </span>
        <h1 className="text-[24px] font-semibold text-[#1F2937] leading-tight tracking-tight">Status</h1>
        <p className="mt-1.5 text-[12.5px] text-[#697079] leading-[1.45] max-w-[310px]">
          Ringkasan kondisi terkini Bunda dari hasil pengukuran di posyandu. Data diperbarui setiap kunjungan rutin, Bunda tidak perlu mengisi sendiri.
        </p>
      </header>

      {/* ── Scrollable body ── */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-5 pt-4 pb-[108px]">

        {/* ── Section i: Profil IMT Awal Kehamilan ── */}
        <SectionHeading n="i">Profil IMT Awal Kehamilan</SectionHeading>
        <Card className="mb-4">
          {profile ? (
            <>
              <div className="flex gap-2.5 mb-3">
                <MetricTile label="BB Pra-hamil" value={profile.bbPrepregnancyKg.toFixed(1)} unit="kg" />
                <MetricTile label="Tinggi" value={profile.heightCm.toFixed(0)} unit="cm" />
                <MetricTile label="IMT" value={profile.imtPrepregnancy.toFixed(1)} />
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                {(() => {
                  const b = IMT_BADGE[profile.imtCategory] ?? IMT_BADGE.normal
                  return <span className={`text-[10.5px] font-bold px-3 py-1 rounded-full ${b.bg} ${b.text}`}>{b.label}</span>
                })()}
                <span className="text-[11px] font-medium text-[#697079] leading-snug">
                  Target kenaikan total{' '}
                  <strong className="text-[#1178D4] font-bold">
                    {profile.targetGainMinKg}–{profile.targetGainMaxKg} kg
                  </strong>
                  {' '}· sekitar {profile.weeklyGainMinKg.toFixed(2)}–{profile.weeklyGainMaxKg.toFixed(2)} kg/minggu
                </span>
              </div>
            </>
          ) : (
            <p className="text-[13px] text-[#697079] text-center py-2">
              Profil IMT belum tersedia. Kunjungi posyandu untuk pengukuran awal.
            </p>
          )}
        </Card>

        {/* ── Section 1: Indikator risiko ── */}
        <SectionHeading n="1">Indikator Risiko Stunting</SectionHeading>
        <Card className="mb-4">
          {latestVisit ? (
            <>
              <RiskGauge level={level} />

              <div className="flex items-center justify-between gap-2.5 mt-4 mb-2.5">
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#1F2937]">
                  <Calendar className="w-[15px] h-[15px] text-[#1178D4] flex-none" />
                  {formatVisitDate(latestVisit.visitDate)}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#1178D4] bg-[#E7F2FB] border border-[#C4DDF5] px-2 py-0.5 rounded-full">
                  <MapPin className="w-[11px] h-[11px]" />
                  Kunjungan Posyandu
                </span>
              </div>

              <div className="flex gap-2.5">
                <MetricTile
                  label="BB Sekarang"
                  value={latestVisit.currentWeightKg.toFixed(1)}
                  unit="kg"
                  note={`+${latestVisit.weightGainKg.toFixed(1)} kg dari awal`}
                />
                <MetricTile label="LILA" value={latestVisit.lilaCm.toFixed(1)} unit="cm" />
                <MetricTile label="Hb" value={latestVisit.hbGdl.toFixed(1)} unit="g/dL" />
              </div>

              <div className="flex items-start gap-1.5 mt-3 pt-3 border-t border-[#E4EDE7] text-[11px] text-[#989DA3] leading-[1.4]">
                <Check className="w-3 h-3 flex-none text-[#1178D4] mt-0.5" />
                Data diukur oleh kader setiap kunjungan posyandu.
              </div>
            </>
          ) : (
            <div className="py-6 text-center">
              <p className="text-[13px] text-[#697079]">Belum ada data pengukuran.</p>
              <p className="text-[11.5px] text-[#989DA3] mt-1">Data akan muncul setelah kunjungan pertama ke posyandu.</p>
            </div>
          )}
        </Card>

        {/* ── Section 2: Status kondisi ── */}
        {latestVisit && (
          <div className="mb-4">
            <SectionHeading n="2">Status Kondisi Anda</SectionHeading>
            <StatusVerdictCard level={level} />
            <StatusEduCard level={level} edu={STATUS_EDU[level]} />
          </div>
        )}

        {/* ── Section 3: Grafik berat badan ── */}
        {profile && visits.length > 0 && (
          <>
            <SectionHeading n="3">Grafik Berat Badan</SectionHeading>
            <Card className="mb-4">
              <GrowthChart
                unit="kg"
                valueLabel="Berat Badan"
                legend={['Normal', 'Pra Stunting', 'Stunting']}
                points={visits.map((v) => {
                  const week = calculateGestationalAge(new Date(profile.hpht), new Date(v.visitDate))
                  return {
                    order: week,
                    label: `${week} mg`,
                    value: v.currentWeightKg,
                    status: statusKunjunganIbu({ ...v, imtCategory: profile.imtCategory, kuesionerBand: profile.kuesionerBand }),
                    caption: formatVisitDate(v.visitDate),
                  }
                })}
              />
            </Card>
          </>
        )}

        {/* ── Section 4: Riwayat pengukuran ── */}
        {visits.length > 0 && (
          <>
            <SectionHeading n="4">Riwayat Pengukuran</SectionHeading>
            <Card>
              <div className="flex flex-col gap-2">
                {visits.map((v) => {
                  const status = statusKunjunganIbu({ ...v, imtCategory: profile?.imtCategory, kuesionerBand: profile?.kuesionerBand })
                  return (
                    <VisitRow
                      key={v.id}
                      title={formatVisitDate(v.visitDate)}
                      detail={`${v.currentWeightKg.toFixed(1)} kg · LILA ${v.lilaCm.toFixed(1)} cm · Hb ${v.hbGdl.toFixed(1)} g/dL`}
                      status={status}
                      style={getStatusStyle(status)}
                    />
                  )
                })}
              </div>
            </Card>
          </>
        )}
      </main>

    </div>
  )
}
