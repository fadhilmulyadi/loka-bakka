"use client"

import React, { useState, useEffect } from 'react'
import { Activity, Check, AlertTriangle, Flame, RefreshCw } from 'lucide-react'
import { getIbuAnakDetail } from '@/lib/actions/ibu'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

type AnakDetail = NonNullable<Awaited<ReturnType<typeof getIbuAnakDetail>>>

function getStatusLevel(status: string): 'rendah' | 'sedang' | 'tinggi' {
  if (status === 'Normal') return 'rendah'
  if (status === 'Pra Stunting' || status === 'Gizi Kurang') return 'sedang'
  return 'tinggi'
}

const STATUS_INFO = {
  rendah: {
    label: 'Normal',
    bg: 'bg-[#E7F7EF]', border: 'border-[#C3E9D4]',
    iconBg: 'bg-[#1E9E62]', textColor: 'text-[#0E6B3E]', dot: '#1E9E62',
    Icon: Check,
  },
  sedang: {
    label: 'Pra Stunting',
    bg: 'bg-[#FFF7E6]', border: 'border-[#F4E2BC]',
    iconBg: 'bg-[#D99100]', textColor: 'text-[#8A6100]', dot: '#D99100',
    Icon: AlertTriangle,
  },
  tinggi: {
    label: 'Stunting',
    bg: 'bg-[#FEF1F1]', border: 'border-[#F6D2D2]',
    iconBg: 'bg-[#DC2626]', textColor: 'text-[#9F1C1C]', dot: '#DC2626',
    Icon: Flame,
  },
}

type EduSection = {
  heading: string
  body?: string
  items?: { lead?: string; text: string }[]
}

const STATUS_EDU: Record<string, {
  intro: (nama: string) => string
  sections: EduSection[]
  closing: string
}> = {
  rendah: {
    intro: (nama) => `Kabar baik! Hasil pemeriksaan hari ini menunjukkan tinggi badan ${nama} sesuai dengan usianya. Tumbuh kembangnya berjalan dengan baik dan tidak ada tanda gangguan pertumbuhan untuk saat ini. Tapi ingat, kondisi ini perlu terus dijaga karena tumbuh kembang anak berubah setiap bulannya.`,
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
  },
  sedang: {
    intro: (nama) => `Hasil pemeriksaan menunjukkan tinggi badan ${nama} sedikit di bawah ideal untuk usianya. Belum masuk stunting, tapi perlu segera diperhatikan sebelum kondisinya semakin jauh dari angka normal.`,
    sections: [
      {
        heading: 'Apa itu pra-stunting?',
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
    closing: 'Pra-stunting masih bisa kembali ke normal kalau ditangani dari sekarang. Jangan tunda dan jangan lupa melakukan tugas harian!',
  },
  tinggi: {
    intro: (nama) => `Hasil pemeriksaan menunjukkan tinggi badan ${nama} jauh di bawah standar untuk usianya. Ini artinya pertumbuhannya sudah terhambat cukup lama dan butuh penanganan yang tidak bisa ditunda.`,
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
      {
        heading: 'Segera ke fasilitas kesehatan jika anak mengalami',
        body: 'Berat badan turun drastis dalam waktu singkat, tidak mau makan atau minum sama sekali lebih dari 24 jam, terlihat sangat lemas dan tidak responsif, kaki atau perut bengkak, atau diare dan muntah yang tidak berhenti.',
      },
    ],
    closing: 'Stunting bukan akhir segalanya. Anak yang stunting tetap punya kesempatan tumbuh lebih baik dengan gizi yang tepat dan konsisten. Yang paling penting sekarang: jangan diam dan jangan tunda.',
  },
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
  const gaugePos = { rendah: '17%', sedang: '50%', tinggi: '83%' }[level]
  const gaugeColor = { rendah: '#1E9E62', sedang: '#F2B705', tinggi: '#E0524E' }[level]
  const s = STATUS_INFO[level]

  const chartData = [...anak.visits].reverse().map((v) => ({
    label: `${v.usiaBulan}bln`,
    bb: v.bb,
    tb: v.tb,
  }))

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 px-6 pt-[6px] pb-4 bg-gradient-to-b from-white to-[#F1F7FE] rounded-b-[24px] shadow-[0_6px_16px_-10px_rgba(17,120,212,0.4)] z-[5]">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#1178D4] bg-[#E7F2FB] px-2.5 py-1 rounded-full mb-2.5">
          <Activity className="w-3 h-3" />
          Pemantauan Tumbuh Kembang
        </span>
        <h1 className="text-[24px] font-semibold text-[#1F2937] leading-tight tracking-tight">Status Anak</h1>
        <p className="mt-1.5 text-[12px] text-[#697079] leading-[1.45] max-w-[310px]">
          Data pertumbuhan <b className="text-[#1178D4]">{anak.nama}</b> dari hasil pengukuran di posyandu.
        </p>
      </header>

      {/* Scrollable body */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-5 pt-4 pb-[108px]">

        {/* Section 1: Indikator risiko */}
        <div className="flex items-center gap-2 mx-0.5 mb-3">
          <span className="flex-none w-5 h-5 rounded-full bg-[#1178D4] text-white text-[11px] font-bold flex items-center justify-center font-mono">1</span>
          <h2 className="text-[14px] font-semibold text-[#1F2937]">Indikator Risiko Stunting</h2>
        </div>
        <section className="bg-white border border-[#E4EDE7] rounded-[18px] p-4 shadow-[0_4px_14px_-8px_rgba(9,30,66,0.12)] mb-4">
          {anak.latest ? (
            <>
              <div className="mt-1">
                <div className="relative h-[11px] rounded-full bg-gradient-to-r from-[#1E9E62] from-33% via-[#F2B705] via-66% to-[#E0524E]">
                  <span
                    className="absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full bg-white shadow-[0_3px_8px_rgba(9,30,66,0.3)] transition-all duration-500"
                    style={{ left: gaugePos, borderWidth: '3px', borderStyle: 'solid', borderColor: gaugeColor }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[11px] font-semibold text-[#1E9E62] flex items-center gap-1 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-current">Aman</span>
                  <span className="text-[11px] font-semibold text-[#B07B00] flex items-center gap-1 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#F2B705]">Pra Stunting</span>
                  <span className="text-[11px] font-semibold text-[#C0322E] flex items-center gap-1 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#E0524E]">Stunting</span>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <div className="flex-1 bg-[#F1F7FE] border border-[#E4EDE7] rounded-[13px] p-2.5 text-center">
                  <div className="text-[11px] font-medium text-[#697079]">Berat Badan</div>
                  <div className="text-[17px] font-bold text-[#1F2937] mt-1 tracking-tight leading-none">
                    {anak.latest.bb.toFixed(1)}<small className="text-[10px] font-medium text-[#697079] ml-0.5"> kg</small>
                  </div>
                </div>
                <div className="flex-1 bg-[#F1F7FE] border border-[#E4EDE7] rounded-[13px] p-2.5 text-center">
                  <div className="text-[11px] font-medium text-[#697079]">Tinggi Badan</div>
                  <div className="text-[17px] font-bold text-[#1F2937] mt-1 tracking-tight leading-none">
                    {anak.latest.tb.toFixed(1)}<small className="text-[10px] font-medium text-[#697079] ml-0.5"> cm</small>
                  </div>
                </div>
                <div className="flex-1 bg-[#F1F7FE] border border-[#E4EDE7] rounded-[13px] p-2.5 text-center">
                  <div className="text-[11px] font-medium text-[#697079]">Z-Score TB/U</div>
                  <div className="text-[17px] font-bold text-[#1F2937] mt-1 tracking-tight leading-none">
                    {anak.latest.zScore}<small className="text-[10px] font-medium text-[#697079] ml-0.5"> SD</small>
                  </div>
                  <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    level === 'rendah' ? 'bg-[#E7F7EF] text-[#1E9E62]' :
                    level === 'sedang' ? 'bg-[#FFF7E6] text-[#8A6100]' :
                    'bg-[#FEF1F1] text-[#9F1C1C]'
                  }`}>
                    {anak.latest.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 mt-3 text-[11px] text-[#989DA3] leading-tight">
                <RefreshCw className="w-3 h-3 shrink-0" />
                Data diperbarui setiap kunjungan posyandu.
              </div>
            </>
          ) : (
            <div className="py-6 text-center">
              <p className="text-[13px] text-[#697079]">Belum ada data pengukuran.</p>
              <p className="text-[11px] text-[#989DA3] mt-1">Data akan muncul setelah kunjungan pertama ke posyandu.</p>
            </div>
          )}
        </section>

        {/* Section 2: Status kondisi */}
        {anak.latest && (
          <>
            <div className="flex items-center gap-2 mx-0.5 mb-3">
              <span className="flex-none w-5 h-5 rounded-full bg-[#1178D4] text-white text-[11px] font-bold flex items-center justify-center font-mono">2</span>
              <h2 className="text-[14px] font-semibold text-[#1F2937]">Status Kondisi Anak</h2>
            </div>
            <div className={`p-4 rounded-[18px] border ${s.border} ${s.bg} shadow-[0_4px_14px_-8px_rgba(9,30,66,0.10)] mb-4`}>
              <div className="flex gap-3 items-start">
                <div className={`shrink-0 w-[38px] h-[38px] rounded-[12px] ${s.iconBg} flex items-center justify-center`}>
                  <s.Icon className="w-[20px] h-[20px] text-white" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <div className={`text-[13px] font-bold ${s.textColor} leading-tight flex items-center gap-2`}>
                    {s.label}
                    <span className="text-[8px] font-bold tracking-widest px-2 py-0.5 rounded-full bg-white/70 opacity-80">SAAT INI</span>
                  </div>
                  <div className="text-[12px] font-normal text-[#4C545F] mt-1 leading-[1.55]">
                    {STATUS_EDU[level].intro(anak.nama)}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3.5">
                {STATUS_EDU[level].sections.map((sec) => (
                  <div key={sec.heading}>
                    <div className={`text-[12px] font-bold ${s.textColor} leading-tight`}>{sec.heading}</div>
                    {sec.body && (
                      <p className="text-[12px] text-[#4C545F] mt-1 leading-[1.55]">{sec.body}</p>
                    )}
                    {sec.items && (
                      <ul className="mt-1.5 flex flex-col gap-1.5">
                        {sec.items.map((item, i) => (
                          <li key={i} className="relative pl-[16px] text-[12px] text-[#4C545F] leading-[1.55]">
                            <span
                              className="absolute left-0 top-[7px] w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: s.dot }}
                            />
                            {item.lead && <span className={`font-semibold ${s.textColor}`}>{item.lead} </span>}
                            {item.text}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>

              <div className={`mt-4 rounded-[13px] border ${s.border} bg-white/70 px-3 py-2.5`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${s.textColor}`}>Ingat ya</span>
                <p className="text-[12px] font-medium text-[#4C545F] mt-0.5 leading-[1.55]">
                  {STATUS_EDU[level].closing}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Section 3: Grafik pertumbuhan */}
        {chartData.length > 0 && (
          <>
            <div className="flex items-center gap-2 mx-0.5 mb-3">
              <span className="flex-none w-5 h-5 rounded-full bg-[#1178D4] text-white text-[11px] font-bold flex items-center justify-center font-mono">3</span>
              <h2 className="text-[14px] font-semibold text-[#1F2937]">Grafik Pertumbuhan</h2>
            </div>
            <section className="bg-white border border-[#E4EDE7] rounded-[18px] p-4 shadow-[0_4px_14px_-8px_rgba(9,30,66,0.12)] mb-4">
              <p className="text-[11px] text-[#697079] mb-3">Berat badan per kunjungan posyandu</p>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="childBBGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1178D4" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#1178D4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f4f8" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#989DA3' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#989DA3' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(value) => [
                        typeof value === 'number' ? `${value.toFixed(1)} kg` : value,
                        'Berat Badan',
                      ]}
                      contentStyle={{ borderRadius: 12, border: '1px solid #E4EDE7', fontSize: 12 }}
                    />
                    <Area
                      type="monotone" dataKey="bb" stroke="#1178D4" strokeWidth={2.5}
                      fill="url(#childBBGrad)"
                      dot={{ r: 4, fill: '#1178D4', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          </>
        )}

        {/* Section 4: Riwayat pengukuran */}
        {anak.visits.length > 0 && (
          <>
            <div className="flex items-center gap-2 mx-0.5 mb-3">
              <span className="flex-none w-5 h-5 rounded-full bg-[#1178D4] text-white text-[11px] font-bold flex items-center justify-center font-mono">4</span>
              <h2 className="text-[14px] font-semibold text-[#1F2937]">Riwayat Pengukuran</h2>
            </div>
            <section className="bg-white border border-[#E4EDE7] rounded-[18px] p-4 shadow-[0_4px_14px_-8px_rgba(9,30,66,0.12)]">
              <div className="flex flex-col gap-2">
                {anak.visits.map((v, i) => {
                  const vLevel = getStatusLevel(v.status)
                  const vColor =
                    vLevel === 'rendah' ? { bg: '#E7F7EF', text: '#1E9E62' } :
                    vLevel === 'sedang' ? { bg: '#FFF7E6', text: '#8A6100' } :
                    { bg: '#FEF1F1', text: '#9F1C1C' }
                  return (
                    <div key={i} className="flex items-center justify-between p-3 bg-[#F8FBFE] border border-[#E4EDE7] rounded-[13px]">
                      <div>
                        <div className="text-[12px] font-semibold text-[#1F2937]">{v.tanggal}</div>
                        <div className="text-[11px] text-[#697079] mt-0.5">
                          {v.usiaBulan} bln · {v.bb.toFixed(1)} kg · {v.tb.toFixed(1)} cm
                        </div>
                      </div>
                      <span
                        className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold"
                        style={{ backgroundColor: vColor.bg, color: vColor.text }}
                      >
                        {v.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
