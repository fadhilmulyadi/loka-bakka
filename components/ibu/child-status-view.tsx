"use client"

import React, { useState, useEffect } from 'react'
import { Activity, RefreshCw } from 'lucide-react'
import { getIbuAnakDetail } from '@/lib/actions/ibu'
import { getStatusStyle } from '@/lib/status-styles'
import type { RiskLevel } from '@/lib/growth-standards/risiko-kehamilan-calc'
import GrowthChart from '@/components/ibu/growth-chart'
import {
  SectionHeading, Card, MetricTile, RiskGauge, StatusVerdictCard, StatusEduCard, VisitRow,
  LEVEL_STYLE, type StatusEdu,
} from '@/components/ibu/status-detail'

type AnakDetail = NonNullable<Awaited<ReturnType<typeof getIbuAnakDetail>>>

function getStatusLevel(status: string): RiskLevel {
  if (status === 'Normal') return 'rendah'
  if (status === 'Pra Stunting' || status === 'Gizi Kurang') return 'sedang'
  return 'tinggi'
}

const STATUS_EDU: Record<RiskLevel, (nama: string) => StatusEdu> = {
  rendah: (nama) => ({
    intro: `Kabar baik! Hasil pemeriksaan hari ini menunjukkan tinggi badan ${nama} sesuai dengan usianya. Tumbuh kembangnya berjalan dengan baik dan tidak ada tanda gangguan pertumbuhan untuk saat ini. Tapi ingat, kondisi ini perlu terus dijaga karena tumbuh kembang anak berubah setiap bulannya.`,
    sections: [
      {
        heading: 'Apa itu kategori normal?',
        body: 'Sederhananya, tinggi badan anak masuk dalam rentang yang sehat untuk usianya berdasarkan standar WHO. Ini tanda bahwa asupan gizi dan pola pengasuhannya selama ini sudah berjalan dengan baik.',
      },
      {
        heading: 'Hal yang perlu dijaga',
        items: [
          { text: 'Lanjutkan ASI eksklusif hingga 6 bulan, lalu mulai MPASI yang bervariasi dan bergizi seperti buah dan sayur.' },
          { text: 'Ajak anak bermain aktif setiap hari untuk mendukung tumbuh kembang motorik dan otaknya.' },
          { text: 'Tetap rutin ke posyandu setiap bulan meskipun anak terlihat sehat-sehat saja.' },
        ],
      },
      {
        heading: 'Hal yang perlu diwaspadai',
        body: 'Kondisi baik sekarang bukan jaminan seterusnya aman. Perhatikan jika nafsu makan anak tiba-tiba turun drastis dalam waktu lama, sering sakit berulang, atau tinggi badannya tidak bertambah selama 2 bulan berturut-turut.',
      },
    ],
    closing: 'Normal bukan berarti bisa santai sepenuhnya. Justru ini saatnya mempertahankan hal baik dan tetap pantau setiap bulan!',
  }),

  sedang: (nama) => ({
    intro: `Hasil pemeriksaan menunjukkan tinggi badan ${nama} sedikit di bawah ideal untuk usianya. Belum masuk stunting, tapi perlu segera diperhatikan sebelum kondisinya semakin jauh dari angka normal.`,
    sections: [
      {
        heading: 'Apa itu pra stunting?',
        body: 'Artinya pertumbuhan anak mulai melambat dari yang seharusnya. Biasanya hal ini terjadi karena faktor yang sudah berlangsung beberapa waktu, seperti asupan gizi yang kurang mencukupi, sering sakit, atau pola makan yang kurang bervariasi.',
      },
      {
        heading: 'Hal yang sering jadi penyebab',
        items: [
          {
            lead: 'Pemberian ASI dan MPASI yang tidak tepat.',
            text: 'ASI tidak eksklusif pada 0–6 bulan membuat anak kehilangan zat gizi penting dan lebih rentan infeksi. MPASI yang terlalu dini atau terlambat, serta hanya terdiri dari karbohidrat tanpa protein hewani (telur, ayam, ikan, hati), membuat anak kenyang tapi tetap kekurangan zat gizi untuk membangun jaringan tubuh. Frekuensi dan tekstur MPASI yang tidak sesuai usia juga membuat asupan kalori dan protein kurang.',
          },
          {
            lead: 'Sakit berulang.',
            text: 'ISPA dan diare yang sering membuat seluruh energi dan zat gizi difokuskan untuk penyembuhan, bukan untuk pertumbuhan fisik. Cegah dengan menjaga kebersihan tangan serta lingkungan sekitar, imunisasi lengkap, dan segera ke puskesmas jika sakit tidak membaik dalam 2–3 hari.',
          },
          {
            lead: 'Susah makan atau porsi terlalu sedikit.',
            text: 'Anak yang kurang makan dalam waktu lama tidak mendapat cukup energi dan zat gizi untuk tumbuh. Coba variasikan tampilan makanan agar menarik, dan hindari memaksa anak makan karena justru dapat membuatnya semakin menolak.',
          },
        ],
      },
      {
        heading: 'Hal yang perlu dilakukan sekarang',
        items: [
          { text: 'Hubungi kader posyandu minggu ini untuk mendapat panduan makanan tambahan (PMT) yang sesuai usia anak.' },
          { text: 'Catat pola makan anak selama seminggu dan konsultasikan ke bidan atau petugas gizi.' },
          { text: 'Fokus perbaiki satu faktor yang paling terlihat bermasalah dulu, lakukan secara konsisten.' },
        ],
      },
    ],
    closing: 'Pra stunting masih bisa kembali ke normal kalau ditangani dari sekarang. Jangan tunda dan jangan lupa melakukan tugas harian!',
  }),

  tinggi: (nama) => ({
    intro: `Hasil pemeriksaan menunjukkan tinggi badan ${nama} jauh di bawah standar untuk usianya. Ini artinya pertumbuhannya sudah terhambat cukup lama dan butuh penanganan yang tidak bisa ditunda.`,
    sections: [
      {
        heading: 'Apa itu stunting?',
        body: 'Stunting bukan sekadar soal tubuh yang pendek. Ini tanda bahwa anak sudah kekurangan gizi dalam waktu yang cukup panjang, yang berdampak tidak hanya pada tinggi badannya tapi juga pada perkembangan otak, daya tahan tubuh, dan potensinya ke depan.',
      },
      {
        heading: 'Kenapa tidak boleh ditunda?',
        body: 'Pertumbuhan anak punya jendela waktu yang terbatas. Setiap bulan yang terlewat tanpa penanganan berarti ada potensi tumbuh kembang yang tidak bisa dikembalikan. Anak yang mengalami stunting memang berisiko menghadapi tantangan lebih besar ke depannya, tapi dengan intervensi yang tepat dan konsisten mulai sekarang, dampaknya masih dapat diminimalkan.',
      },
      {
        heading: '3 langkah dalam 3 hari ke depan',
        items: [
          {
            lead: 'Pertama, bawa anak ke posyandu.',
            text: 'Kondisi ini perlu dievaluasi langsung oleh tenaga kesehatan. Tunjukkan hasil pemeriksaan ini ke dokter atau ahli gizi untuk menentukan apakah anak perlu program makanan tambahan (PMT) atau pemeriksaan lanjutan.',
          },
          {
            lead: 'Kedua, perbaiki asupan gizi.',
            text: 'Berikan protein hewani setiap hari seperti telur, hati ayam, ikan, daging, dan susu. Pastikan anak makan 3 kali sehari plus 1–2 kali camilan bergizi. Jika disarankan dokter, berikan suplemen vitamin A atau multivitamin sesuai anjuran.',
          },
          {
            lead: 'Ketiga, perbaiki pola asuh dan lingkungan.',
            text: 'Pastikan sanitasi dan air bersih, cuci tangan pakai sabun, lengkapi imunisasi anak, serta ajak anak bermain, berbicara, dan berinteraksi.',
          },
        ],
      },
    ],
    danger: {
      title: 'Tanda bahaya yang harus langsung ke IGD',
      note: 'Segera bawa anak ke fasilitas kesehatan terdekat apabila mengalami:',
      items: [
        'Berat badan turun drastis dalam waktu singkat',
        'Tidak mau makan atau minum lebih dari 24 jam',
        'Terlihat sangat lemas dan tidak responsif',
        'Kaki atau perut bengkak',
        'Diare atau muntah yang tidak berhenti',
      ],
    },
    closing: 'Stunting bukan akhir segalanya. Anak yang stunting tetap punya kesempatan tumbuh lebih baik dengan gizi yang tepat dan konsisten. Yang paling penting sekarang: jangan diam dan jangan tunda.',
  }),
}

export default function ChildStatusView({ childId }: { childId: string }) {
  const [anak, setAnak] = useState<AnakDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setAnak(null)
    setError(false)
    setLoading(true)
    getIbuAnakDetail(childId)
      .then((data) => { if (data) setAnak(data) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [childId])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-[#3B93E6] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error || !anak) return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center bg-white">
      <div className="w-16 h-16 rounded-full bg-[#F1F7FE] flex items-center justify-center mb-4">
        <span className="text-3xl">👶</span>
      </div>
      <h2 className="text-[16px] font-semibold text-[#1F2937]">
        {error ? 'Terjadi kesalahan' : 'Data tidak ditemukan'}
      </h2>
    </div>
  )

  const level = anak.latest ? getStatusLevel(anak.latest.status) : 'rendah'

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* ── Header ── */}
      <header className="flex-none px-6 pt-[6px] pb-4 bg-gradient-to-b from-white to-[#F1F7FE] rounded-b-[24px] shadow-[0_6px_16px_-10px_rgba(17,120,212,0.4)] z-[5]">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#1178D4] bg-[#E7F2FB] px-2.5 py-1 rounded-full mb-2.5">
          <Activity className="w-3 h-3" />
          Pemantauan Tumbuh Kembang
        </span>
        <h1 className="text-[24px] font-semibold text-[#1F2937] leading-tight tracking-tight">Status Anak</h1>
        <p className="mt-1.5 text-[12.5px] text-[#697079] leading-[1.45] max-w-[310px]">
          Data pertumbuhan <b className="text-[#1178D4]">{anak.nama}</b> dari hasil pengukuran di posyandu.
        </p>
      </header>

      {/* ── Scrollable body ── */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-5 pt-4 pb-[108px]">

        {/* ── Section 1: Indikator risiko ── */}
        <SectionHeading n="1">Indikator Risiko Stunting</SectionHeading>
        <Card className="mb-4">
          {anak.latest ? (
            <>
              <RiskGauge level={level} />

              <div className="flex gap-2.5 mt-4">
                <MetricTile label="Berat Badan" value={anak.latest.bb.toFixed(1)} unit="kg" />
                <MetricTile label="Tinggi Badan" value={anak.latest.tb.toFixed(1)} unit="cm" />
                <MetricTile
                  label="Z-Score TB/U"
                  value={String(anak.latest.zScore)}
                  unit="SD"
                  note={
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ backgroundColor: LEVEL_STYLE[level].tint, color: LEVEL_STYLE[level].text }}
                    >
                      {anak.latest.status}
                    </span>
                  }
                />
              </div>

              <div className="flex items-start gap-1.5 mt-3 pt-3 border-t border-[#E4EDE7] text-[11px] text-[#989DA3] leading-[1.4]">
                <RefreshCw className="w-3 h-3 flex-none text-[#1178D4] mt-0.5" />
                Data diperbarui setiap kunjungan posyandu.
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
        {anak.latest && (
          <div className="mb-4">
            <SectionHeading n="2">Status Kondisi Anak</SectionHeading>
            <StatusVerdictCard level={level} eyebrow={`Status ${anak.nama} saat ini`} />
            <StatusEduCard level={level} edu={STATUS_EDU[level](anak.nama)} />
          </div>
        )}

        {/* ── Section 3: Grafik tinggi badan ── */}
        {anak.visits.length > 0 && (
          <>
            <SectionHeading n="3">Grafik Tinggi Badan</SectionHeading>
            <Card className="mb-4">
              <GrowthChart
                unit="cm"
                valueLabel="Tinggi Badan"
                legend={['Normal', 'Pra Stunting', 'Stunting']}
                points={anak.visits.map((v) => ({
                  order: v.usiaBulan,
                  label: `${v.usiaBulan} bln`,
                  value: v.tb,
                  status: v.status,
                  caption: v.tanggal,
                }))}
              />
            </Card>
          </>
        )}

        {/* ── Section 4: Riwayat pengukuran ── */}
        {anak.visits.length > 0 && (
          <>
            <SectionHeading n="4">Riwayat Pengukuran</SectionHeading>
            <Card>
              <div className="flex flex-col gap-2">
                {anak.visits.map((v, i) => (
                  <VisitRow
                    key={i}
                    title={v.tanggal}
                    detail={`${v.usiaBulan} bln · ${v.bb.toFixed(1)} kg · ${v.tb.toFixed(1)} cm`}
                    status={v.status}
                    style={getStatusStyle(v.status)}
                  />
                ))}
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
