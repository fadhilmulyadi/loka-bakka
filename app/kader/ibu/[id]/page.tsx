"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ChevronRight,
  Plus,
  Baby,
  Activity,
  MoreHorizontal,
  Stethoscope,
  Bell,
  Pencil,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { KaderUserPill } from "@/components/kader/kader-user-pill"
import { cn } from "@/lib/utils"
import { getCached, setCached, KADER_STATS_KEY } from "@/lib/client-cache"
import { getIbuById, getDashboardStats } from "@/lib/actions/kader"
import { calculateGestationalAge, calculateHPL } from "@/lib/pregnancy-utils"
import { type IMTCategory } from "@/lib/growth-standards/imt-calc"
import { BBChart } from "@/components/ibu/bb-chart"
import { TrimesterPill } from "@/components/ibu/trimester-pill"
import { hitungRisikoIbu, hitungSkorKuesioner, type JawabanKuesioner } from "@/lib/growth-standards/risiko-kehamilan-calc"
import { Topbar } from "@/components/kader/topbar"
import { StatusBadge } from "@/components/status-badge"
import { TambahAnakModal } from "@/components/kader/tambah-anak-modal"
import { CatatKehamilanModal } from "@/components/kader/catat-kehamilan-modal"
import { PeriksaKehamilanModal } from "@/components/kader/periksa-kehamilan-modal"
import { AkhiriKehamilanModal } from "@/components/kader/akhiri-kehamilan-modal"
import { IngatkanIbuKehamilanModal } from "@/components/kader/ingatkan-ibu-kehamilan-modal"
import { EditDataIbuModal } from "@/components/kader/edit-data-ibu-modal"
import { ResetPasswordModal } from "@/components/kader/reset-password-modal"
import { TugasHarianCard } from "@/components/kader/tugas-harian-card"

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"]

// ============ DESIGN TOKENS ============
const NAVY = "#173753"
const ACCENT = "#52A9E3"
const PURPLE = "#6A48C4"
const PURPLE_BG = "#F0EBFB"

// ============ MAIN PAGE ============

type IbuProfile = Awaited<ReturnType<typeof getIbuById>>

export default function IbuProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const ibuCacheKey = `kader-ibu-${id}`
  const cachedIbu = getCached<IbuProfile>(ibuCacheKey)
  const [ibu, setIbu] = useState<IbuProfile | null>(cachedIbu ?? null)
  const [loading, setLoading] = useState(!cachedIbu)
  const [stats, setStats] = useState<{ totalChildren: number, measuredThisMonth: number, stuntingCount: number, anakStatus: { risiko: number } } | null>(getCached(KADER_STATS_KEY) ?? null)
  const [tambahAnakOpen, setTambahAnakOpen] = useState(false)
  const [tambahAnakInitialDate, setTambahAnakInitialDate] = useState<string>("")
  const [catatKehamilanOpen, setCatatKehamilanOpen] = useState(false)
  const [periksaKehamilanOpen, setPeriksaKehamilanOpen] = useState(false)
  const [akhiriKehamilanOpen, setAkhiriKehamilanOpen] = useState(false)
  const [ingatkanKehamilanOpen, setIngatkanKehamilanOpen] = useState(false)
  const [editDataOpen, setEditDataOpen] = useState(false)
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false)
  const [actionMenuOpen, setActionMenuOpen] = useState(false)
  const [showAllVisits, setShowAllVisits] = useState(false)

  const loadIbu = async () => {
    if (!id) return
    try {
      const data = await getIbuById(id)
      setIbu(data)
      setCached(ibuCacheKey, data)
      return data
    } catch {
      router.replace("/kader/rekap")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadIbu() }, [id, router])
  useEffect(() => {
    getDashboardStats().then((data) => {
      setStats(data)
      setCached(KADER_STATS_KEY, data)
    })
  }, [])

  if (loading) return <div className="flex-1 flex items-center justify-center bg-[#EBF2F8] min-h-screen">Loading...</div>
  if (!ibu) return null

  const initial = ibu.nama.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()

  const hphtDate = ibu.pregnancyProfile?.hpht ? new Date(ibu.pregnancyProfile.hpht) : null
  const visits = ibu.pregnancyVisits ?? []
  const latestVisit = visits.length > 0 ? visits[visits.length - 1] : null
  const previousVisit = visits.length > 1 ? visits[visits.length - 2] : null
  const visitsDesc = [...visits].reverse()

  const gestationalAge = hphtDate ? calculateGestationalAge(hphtDate) : null
  const hpl = hphtDate ? calculateHPL(hphtDate) : null
  const trimester = gestationalAge == null ? null : gestationalAge <= 13 ? 1 : gestationalAge <= 27 ? 2 : 3
  const deltaBB = latestVisit && previousVisit
    ? +(latestVisit.currentWeightKg - previousVisit.currentWeightKg).toFixed(1)
    : null
  const lastSkrining = ibu.skrinings?.[0] ?? null
  const kuesionerBand = lastSkrining
    ? hitungSkorKuesioner(lastSkrining.jawaban as JawabanKuesioner).band
    : null

  // Status ibu memakai skor gabungan yang sama dengan alat & aplikasi ibu,
  // bukan sekadar kenaikan BB, supaya labelnya konsisten di semua layar.
  const risikoIbu = latestVisit && ibu.pregnancyProfile
    ? hitungRisikoIbu({
        imtCategory: ibu.pregnancyProfile.imtCategory as IMTCategory,
        lilaCm: latestVisit.lilaCm,
        hbGdl: latestVisit.hbGdl,
        kuesionerBand: kuesionerBand,
      })
    : null
  const overallStatus = risikoIbu
    ? { rendah: "Normal", sedang: "Pra Stunting", tinggi: "Stunting" }[risikoIbu.level]
    : "Normal"

  return (
    <div className="flex-1 bg-[#EBF2F8] flex flex-col min-h-screen">
      <Topbar
        alertStats={stats ? {
          stuntingCount: stats.stuntingCount,
          berisikoCount: stats.anakStatus.risiko,
          belumDiperiksa: stats.totalChildren - stats.measuredThisMonth,
        } : null}
      />

      <div className="p-6 lg:p-8 space-y-4">
        {/* Title + User */}
        <div className="flex items-center justify-between">
          <div>
            <nav className="flex items-center gap-1 mb-1.5" aria-label="Breadcrumb">
              <Link href="/kader/dashboard" className="text-xs text-[#173753]/50 hover:text-[#173753] transition-colors">Dashboard</Link>
              <ChevronRight className="w-3 h-3 text-[#173753]/30 flex-none" />
              <Link href="/kader/rekap" className="text-xs text-[#173753]/50 hover:text-[#173753] transition-colors">Rekap Pasien</Link>
              <ChevronRight className="w-3 h-3 text-[#173753]/30 flex-none" />
              <span className="text-xs text-[#173753] font-medium">Profil Ibu</span>
            </nav>
            <h1 className="text-2xl font-medium text-[#173753]">Profil Ibu</h1>
          </div>

          <div className="flex items-center gap-3">
            <KaderUserPill />
          </div>
        </div>

        {ibu.isHamil ? (
          <>
            {/* Hero Card */}
            <div className="bg-white rounded-2xl px-6 py-5 flex items-center gap-5">
              <div
                className="h-[52px] w-[52px] rounded-full flex items-center justify-center text-[18px] font-bold flex-shrink-0"
                style={{ background: PURPLE_BG, color: PURPLE }}
              >
                {initial}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[15px] font-semibold text-[#173753] leading-tight">{ibu.nama}</span>
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full"
                    style={{ background: PURPLE_BG, color: PURPLE }}
                  >
                    Ibu Hamil
                  </span>
                  <StatusBadge status={overallStatus} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  No. Hp: {ibu.noHp || "—"}{ibu.kelurahan && ` · Kelurahan ${ibu.kelurahan}`}
                </p>
                {ibu.alamat && (
                  <p className="text-xs text-muted-foreground mt-0.5">{ibu.alamat}</p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  onClick={() => ibu.pregnancyProfile ? setPeriksaKehamilanOpen(true) : setCatatKehamilanOpen(true)}
                  className="gap-1.5 text-xs h-9 px-4 rounded-[50px] text-white shadow-[0_4px_12px_rgba(82,169,227,0.3)] hover:opacity-90 transition-opacity"
                  style={{ background: `linear-gradient(to right, ${ACCENT}, #93D1F7)` }}
                >
                  Periksa Kehamilan
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setIngatkanKehamilanOpen(true)}
                  className="text-xs h-9 px-4 rounded-full bg-gray-100 hover:bg-gray-200 text-[#173753] transition-colors"
                >
                  Ingatkan Ibu
                </Button>

                <Popover open={actionMenuOpen} onOpenChange={setActionMenuOpen}>
                  <PopoverTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-[#173753] transition-colors flex-shrink-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </PopoverTrigger>
                  <PopoverContent side="bottom" align="end" className="w-52 p-1.5 rounded-2xl border-none shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                    {[
                      {
                        icon: Stethoscope,
                        label: "Periksa Kehamilan",
                        danger: false,
                        onClick: () => {
                          setActionMenuOpen(false);
                          ibu.pregnancyProfile ? setPeriksaKehamilanOpen(true) : setCatatKehamilanOpen(true)
                        }
                      },
                      { icon: Bell, label: "Ingatkan Ibu", danger: false, onClick: () => { setActionMenuOpen(false); setIngatkanKehamilanOpen(true) } },
                      { icon: Pencil, label: "Edit Data", danger: false, onClick: () => { setActionMenuOpen(false); setEditDataOpen(true) } },
                    ].map((item) => (
                      <React.Fragment key={item.label}>
                        <button
                          onClick={item.onClick}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-[8px] text-[12.5px] font-medium transition",
                            item.danger
                              ? "text-red-500 hover:bg-[#52A9E3] hover:text-[#F5F7FA]"
                              : "text-[#173753] hover:bg-[#52A9E3] hover:text-[#F5F7FA]"
                          )}
                        >
                          <item.icon className="w-3.5 h-3.5 flex-none" />
                          {item.label}
                        </button>
                      </React.Fragment>
                    ))}
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Kehamilan Aktif + Anak Terdaftar (left) / Akun Aplikasi Ibu (right) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    {
                      label: "USIA KANDUNGAN",
                      value: gestationalAge != null ? `${gestationalAge} mgg` : "—",
                      sub: hpl ? `HPL ${hpl.getDate()} ${MONTHS_ID[hpl.getMonth()]} ${hpl.getFullYear()}` : null,
                      subColor: "text-muted-foreground",
                    },
                    {
                      label: "BB TERAKHIR",
                      value: latestVisit ? `${latestVisit.currentWeightKg.toFixed(1).replace(".", ",")} kg` : "—",
                      delta: deltaBB,
                      deltaUnit: "kg",
                    },
                    {
                      label: "LILA",
                      value: latestVisit ? `${latestVisit.lilaCm.toFixed(1).replace(".", ",")} cm` : "—",
                      sub: latestVisit ? (latestVisit.lilaCm >= 23.5 ? "Normal (≥ 23,5)" : "Perlu Perhatian (< 23,5)") : null,
                      subColor: latestVisit ? (latestVisit.lilaCm >= 23.5 ? "text-[#15803D]" : "text-[#D93025]") : "",
                    },
                    {
                      label: "HEMOGLOBIN",
                      value: latestVisit ? `${latestVisit.hbGdl.toFixed(1).replace(".", ",")} g/dL` : "—",
                      sub: latestVisit ? (latestVisit.hbGdl >= 11 ? "Normal (≥ 11)" : "Perlu Perhatian (< 11)") : null,
                      subColor: latestVisit ? (latestVisit.hbGdl >= 11 ? "text-[#15803D]" : "text-[#D93025]") : "",
                    },
                  ].map((s) => (
                    <div key={s.label} className="bg-white rounded-2xl py-3.5 px-4 flex flex-col justify-between h-full">
                      <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">{s.label}</p>
                      <div>
                        <div className="flex items-baseline gap-2">
                          <p className="text-[20px] font-bold text-[#173753] leading-none">{s.value}</p>
                        </div>
                        {s.delta != null ? (
                          <p className={cn("text-[10px] mt-1.5 font-semibold whitespace-nowrap", s.delta >= 0 ? "text-[#15803D]" : "text-[#D93025]")}>
                            {s.delta >= 0 ? "▲" : "▼"} {s.delta >= 0 ? "+" : ""}{s.delta.toFixed(1).replace(".", ",")} {s.deltaUnit} dari bulan lalu
                          </p>
                        ) : s.sub ? (
                          <p className={cn("text-[10px] mt-1.5 font-medium whitespace-nowrap", s.subColor)}>{s.sub}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                {ibu.pregnancyProfile && (
                  <Card className="ring-0 shadow-none bg-white rounded-xl border-none overflow-hidden py-0 gap-0">
                    <CardHeader className="px-5 pt-[18px] pb-3">
                      <CardTitle className="text-[16px] font-semibold text-[#173753] leading-tight">
                        Kurva Kenaikan Berat Badan
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-5">
                      <BBChart
                        nama={ibu.nama}
                        profile={{
                          hpht: ibu.pregnancyProfile.hpht,
                          jumlahJanin: ibu.pregnancyProfile.jumlahJanin,
                          imtCategory: ibu.pregnancyProfile.imtCategory as IMTCategory,
                          bbPrepregnancyKg: ibu.pregnancyProfile.bbPrepregnancyKg,
                        }}
                        visits={visits}
                      />
                    </CardContent>
                  </Card>
                )}

                <Card className="ring-0 shadow-none bg-white rounded-xl border-none overflow-hidden py-0 gap-0">
                  <CardHeader className="px-5 pt-[18px] pb-3 flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-2.5">
                      <CardTitle className="text-[16px] font-semibold text-[#173753] leading-tight">Riwayat Pemeriksaan
                        
                      </CardTitle>
                      <TrimesterPill trimester={trimester as 1 | 2 | 3 | null} long />
                    </div>
                    <button
                      type="button"
                      onClick={() => setAkhiriKehamilanOpen(true)}
                      className="text-xs font-semibold text-[#D93025] border border-[#D93025]/40 bg-transparent hover:bg-[#D93025]/5 rounded-[50px] h-8 px-3.5 transition-colors"
                    >
                      Akhiri Kehamilan
                    </button>
                  </CardHeader>

                  <CardContent className="px-5 pb-5">

                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-[#E8E8E8]">
                          <TableHead className="text-[14px] text-[#173753] font-medium pl-2">Tanggal</TableHead>
                          <TableHead className="text-[14px] text-[#173753] font-medium">BB</TableHead>
                          <TableHead className="text-[14px] text-[#173753] font-medium">LILA</TableHead>
                          <TableHead className="text-[14px] text-[#173753] font-medium">Hb</TableHead>
                          <TableHead className="text-[14px] text-[#173753] font-medium">Status</TableHead>
                          <TableHead className="text-[14px] text-[#173753] font-medium">Kader</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visitsDesc.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6}>
                              <div className="text-center py-4">
                                <Activity className="w-6 h-6 text-gray-300 mx-auto mb-1.5" />
                                <p className="text-[12px] text-muted-foreground">Belum ada riwayat pemeriksaan</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          (showAllVisits ? visitsDesc : visitsDesc.slice(0, 5)).map((v) => (
                            <TableRow key={v.id} className="border-b border-[#F0F0F0] hover:bg-[#F7FBFF] transition-colors">
                              <TableCell className="text-[14px] text-[#173753] pl-2">
                                {new Date(v.visitDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                              </TableCell>
                              <TableCell className="text-[14px] text-[#173753]">{v.currentWeightKg.toFixed(1).replace(".", ",")} kg</TableCell>
                              <TableCell className="text-[14px] text-[#173753]">{v.lilaCm.toFixed(1).replace(".", ",")} cm</TableCell>
                              <TableCell className="text-[14px] text-[#173753]">{v.hbGdl.toFixed(1).replace(".", ",")}</TableCell>
                              <TableCell>
                                <StatusBadge status={
                                  ibu.pregnancyProfile
                                    ? { rendah: "Normal", sedang: "Pra Stunting", tinggi: "Stunting" }[
                                        hitungRisikoIbu({
                                          imtCategory: ibu.pregnancyProfile.imtCategory as IMTCategory,
                                          lilaCm: v.lilaCm,
                                          hbGdl: v.hbGdl,
                                          kuesionerBand: kuesionerBand,
                                        }).level
                                      ]
                                    : v.isOnTrack ? "Normal" : "Pra Stunting"
                                } />
                              </TableCell>
                              <TableCell className="text-[14px] text-muted-foreground">{v.kader?.nama ?? "—"}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>

                    {visitsDesc.length > 5 && (
                      <button
                        type="button"
                        onClick={() => setShowAllVisits(v => !v)}
                        className="w-full mt-1 py-2.5 text-[12px] font-medium text-[#52A9E3] hover:bg-[#F7FBFF] rounded-lg transition-colors"
                      >
                        {showAllVisits
                          ? "Tampilkan lebih sedikit"
                          : `Tampilkan semua (${visitsDesc.length})`}
                      </button>
                    )}
                  </CardContent>
                </Card>

                <Card className="ring-0 shadow-none bg-white rounded-xl border-none overflow-hidden py-0 gap-0">
                  <CardHeader className="px-5 pt-[18px] pb-3 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-[16px] font-semibold text-[#173753] leading-tight">Anak Terdaftar</CardTitle>
                    <button
                      type="button"
                      onClick={() => setTambahAnakOpen(true)}
                      className="inline-flex items-center justify-center text-xs font-semibold text-[#52A9E3] border border-[#52A9E3]/40 bg-transparent hover:bg-[#52A9E3]/5 rounded-[50px] h-8 px-3.5 transition-colors"
                    >
                      + Tambah Anak
                    </button>
                  </CardHeader>
                  <CardContent className="pt-3 px-5 pb-[18px]">
                    {ibu.anaks.length === 0 ? (
                      <div className="text-center py-4">
                        <Baby className="w-6 h-6 text-gray-300 mx-auto mb-1.5" />
                        <p className="text-[12px] text-muted-foreground">Belum ada anak terdaftar</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {ibu.anaks.map((anak) => {
                          const last = anak.pengukurans[0]
                          const birth = new Date(anak.tanggalLahir)
                          const ageMonths = (new Date().getFullYear() - birth.getFullYear()) * 12 + (new Date().getMonth() - birth.getMonth())

                          return (
                            <Link
                              key={anak.id}
                              href={`/kader/anak/${anak.id}`}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[#F0F0F0] hover:bg-[#F7FBFF] hover:border-[#52A9E3]/30 transition-colors"
                            >
                              <div className="h-9 w-9 rounded-full bg-[#DBEAFE] flex items-center justify-center text-[12px] font-bold text-[#1D4ED8] flex-shrink-0">
                                {anak.nama[0]}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-medium text-[#173753] truncate">{anak.nama}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {anak.jenisKelamin} · {ageMonths} bln · {last?.statusTBU || "Normal"}
                                </p>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-[#52A9E3] flex-shrink-0" />
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="ring-0 shadow-none bg-white rounded-xl border-none overflow-hidden py-0 gap-0">
                  <CardHeader className="px-5 pt-[18px]">
                    <CardTitle className="text-[16px] font-semibold text-[#173753] leading-tight">Akun Aplikasi Ibu</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3 px-5 pb-[18px] space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[12px] text-slate-500 font-medium">Username</span>
                      <span className="text-[13px] font-bold text-[#173753]">{ibu.username}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setResetPasswordOpen(true)}
                      className="w-full text-center px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-[13px] font-medium text-[#173753] mt-2"
                    >
                      Reset Password
                    </button>
                  </CardContent>
                </Card>

                <TugasHarianCard ibu={ibu} />
              </div>
            </div>
          </>

        ) : (
          <>
            {/* Hero Card */}
            <div className="bg-white rounded-2xl px-6 py-5 flex items-center gap-5">
              <div
                className="h-[52px] w-[52px] rounded-full flex items-center justify-center text-[18px] font-bold flex-shrink-0"
                style={{ background: "#F1F5F9", color: "#5B7A96" }}
              >
                {initial}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[15px] font-semibold text-[#173753] leading-tight">{ibu.nama}</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#F1F5F9] text-[#5B7A96]">
                    Ibu
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#E7F0FA] text-[#2E7CE4]">
                    {ibu.anaks.length} Anak Terdaftar
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  No. Hp: {ibu.noHp || "—"}{ibu.kelurahan && ` · Kelurahan ${ibu.kelurahan}`} · Akun: {ibu.username}
                </p>
                {ibu.alamat && (
                  <p className="text-xs text-muted-foreground mt-0.5">{ibu.alamat}</p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  onClick={() => setCatatKehamilanOpen(true)}
                  className="gap-1.5 text-xs h-9 px-4 rounded-[50px] text-white shadow-[0_4px_12px_rgba(82,169,227,0.3)] hover:opacity-90 transition-opacity"
                  style={{ background: `linear-gradient(to right, ${ACCENT}, #93D1F7)` }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Catat Kehamilan
                </Button>

                <Popover open={actionMenuOpen} onOpenChange={setActionMenuOpen}>
                  <PopoverTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-[#173753] transition-colors flex-shrink-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </PopoverTrigger>
                  <PopoverContent side="bottom" align="end" className="w-52 p-1.5 rounded-2xl border-none shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                    {[
                      { icon: Stethoscope, label: "Catat Kehamilan", danger: false, onClick: () => { setActionMenuOpen(false); setCatatKehamilanOpen(true) } },
                      { icon: Pencil, label: "Edit Data", danger: false, onClick: () => { setActionMenuOpen(false); setEditDataOpen(true) } },
                    ].map((item) => (
                      <React.Fragment key={item.label}>
                        <button
                          onClick={item.onClick}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-[8px] text-[12.5px] font-medium transition",
                            item.danger
                              ? "text-red-500 hover:bg-[#52A9E3] hover:text-[#F5F7FA]"
                              : "text-[#173753] hover:bg-[#52A9E3] hover:text-[#F5F7FA]"
                          )}
                        >
                          <item.icon className="w-3.5 h-3.5 flex-none" />
                          {item.label}
                        </button>
                      </React.Fragment>
                    ))}
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Anak Terdaftar (left) / Status Kehamilan + Akun Aplikasi Ibu (right) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
              <div className="lg:col-span-2 space-y-4">
                <Card className="ring-0 shadow-none bg-white rounded-xl border-none overflow-hidden py-0 gap-0">
                  <CardHeader className="px-5 pt-[18px] pb-3 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-[16px] font-semibold text-[#173753] leading-tight">Anak Terdaftar</CardTitle>
                    <button
                      type="button"
                      onClick={() => setTambahAnakOpen(true)}
                      className="inline-flex items-center justify-center text-xs font-semibold text-[#52A9E3] border border-[#52A9E3]/40 bg-transparent hover:bg-[#52A9E3]/5 rounded-[50px] h-8 px-3.5 transition-colors"
                    >
                      + Tambah Anak
                    </button>
                  </CardHeader>
                  <CardContent className="pt-3 px-5 pb-[18px]">
                    {ibu.anaks.length === 0 ? (
                      <div className="text-center py-4">
                        <Baby className="w-6 h-6 text-gray-300 mx-auto mb-1.5" />
                        <p className="text-[12px] text-muted-foreground">Belum ada anak terdaftar</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {ibu.anaks.map((anak) => {
                          const last = anak.pengukurans[0]
                          const birth = new Date(anak.tanggalLahir)
                          const ageMonths = (new Date().getFullYear() - birth.getFullYear()) * 12 + (new Date().getMonth() - birth.getMonth())

                          return (
                            <Link
                              key={anak.id}
                              href={`/kader/anak/${anak.id}`}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[#F0F0F0] hover:bg-[#F7FBFF] hover:border-[#52A9E3]/30 transition-colors"
                            >
                              <div className="h-9 w-9 rounded-full bg-[#DBEAFE] flex items-center justify-center text-[12px] font-bold text-[#1D4ED8] flex-shrink-0">
                                {anak.nama[0]}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-medium text-[#173753] truncate">{anak.nama}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {anak.jenisKelamin} · {ageMonths} bln · {last?.statusTBU || "Normal"}
                                </p>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-[#52A9E3] flex-shrink-0" />
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="ring-0 shadow-none bg-white rounded-xl border-none overflow-hidden py-0 gap-0">
                  <CardHeader className="px-5 pt-[18px]">
                    <CardTitle className="text-[16px] font-semibold text-[#173753] leading-tight">Status Kehamilan</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3 px-5 pb-[18px] space-y-2.5">
                    <div className="flex items-center gap-2.5 bg-[#F8FAFD] rounded-xl px-3.5 py-3">
                      <span className="w-2 h-2 rounded-full bg-[#9AB0C4] flex-none" />
                      <p className="text-[12.5px] text-[#173753]">Tidak ada kehamilan aktif.</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="ring-0 shadow-none bg-white rounded-xl border-none overflow-hidden py-0 gap-0">
                  <CardHeader className="px-5 pt-[18px]">
                    <CardTitle className="text-[16px] font-semibold text-[#173753] leading-tight">Akun Aplikasi Ibu</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3 px-5 pb-[18px] space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[12px] text-slate-500 font-medium">Username</span>
                      <span className="text-[13px] font-bold text-[#173753]">{ibu.username}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setResetPasswordOpen(true)}
                      className="w-full text-center px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-[13px] font-medium text-[#173753] mt-2"
                    >
                      Reset Password
                    </button>
                  </CardContent>
                </Card>

                <TugasHarianCard ibu={ibu} />
              </div>
            </div>
          </>
        )}
      </div>

      <TambahAnakModal
        open={tambahAnakOpen}
        onOpenChange={setTambahAnakOpen}
        ibu={{ id: ibu.id, nama: ibu.nama, username: ibu.username, posyandu: ibu.posyandu, anakCount: ibu.anaks.length }}
        initialDate={tambahAnakInitialDate}
      />

      <CatatKehamilanModal
        open={catatKehamilanOpen}
        onOpenChange={setCatatKehamilanOpen}
        onSaved={loadIbu}
        onLangsungPeriksa={async () => {
          await loadIbu()
          setPeriksaKehamilanOpen(true)
        }}
        alreadyHamil={ibu.isHamil}
        ibu={{ id: ibu.id, nama: ibu.nama, username: ibu.username, posyandu: ibu.posyandu, anakCount: ibu.anaks.length }}
      />

      {ibu.pregnancyProfile && (
        <PeriksaKehamilanModal
          open={periksaKehamilanOpen}
          onOpenChange={setPeriksaKehamilanOpen}
          onSaved={loadIbu}
          ibu={{
            id: ibu.id,
            nama: ibu.nama,
            gestationalWeeks: gestationalAge ?? 0,
            trimester: trimester ?? 1,
            bbPrepregnancyKg: ibu.pregnancyProfile.bbPrepregnancyKg,
            imtCategory: ibu.pregnancyProfile.imtCategory as IMTCategory,
            jumlahJanin: ibu.pregnancyProfile.jumlahJanin,
          }}
        />
      )}

      <AkhiriKehamilanModal
        open={akhiriKehamilanOpen}
        onOpenChange={setAkhiriKehamilanOpen}
        onSaved={loadIbu}
        onDaftarkanBayi={(tglLahir) => {
          setTambahAnakInitialDate(tglLahir)
          setTambahAnakOpen(true)
        }}
        ibu={{
          id: ibu.id,
          nama: ibu.nama,
          pregnancyInfo: `kehamilan ke-${ibu.anaks.length + 1} · ${gestationalAge != null ? gestationalAge : 0} minggu`
        }}
      />

      <IngatkanIbuKehamilanModal
        open={ingatkanKehamilanOpen}
        onOpenChange={setIngatkanKehamilanOpen}
        onSent={loadIbu}
        ibu={{ id: ibu.id, nama: ibu.nama, noHp: ibu.noHp, posyanduName: ibu.posyandu }}
      />

      <EditDataIbuModal
        open={editDataOpen}
        onOpenChange={setEditDataOpen}
        onSaved={loadIbu}
        ibu={{ id: ibu.id, nama: ibu.nama, noHp: ibu.noHp, kelurahan: ibu.kelurahan, alamat: ibu.alamat }}
      />

      <ResetPasswordModal
        open={resetPasswordOpen}
        onOpenChange={setResetPasswordOpen}
        ibu={{ id: ibu.id, nama: ibu.nama, username: ibu.username }}
      />
    </div>
  )
}
