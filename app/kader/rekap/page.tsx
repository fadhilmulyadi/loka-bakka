"use client"

import React, { useState, useMemo, useEffect, useRef, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Card, CardContent,
} from "@/components/ui/card"
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { KaderUserPill } from "@/components/kader/kader-user-pill"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Search,
  ChevronLeft, ChevronRight, ChevronRight as ArrowRight,
  CircleCheck, CircleAlert, Activity, Download, Plus, MoreHorizontal,
  SlidersHorizontal, X, Stethoscope, User, Bell, Pencil, PowerOff,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { getCached, setCached } from "@/lib/client-cache"
import { getChildren, getRekapStats, getIbuHamil } from "@/lib/actions/kader"
import { toCSV, downloadCSV } from "@/lib/csv"
import { ImportPasienDialog } from "@/components/kader/import-pasien-dialog"
import { TambahPasienModal } from "@/components/kader/tambah-pasien-modal"
import { Topbar } from "@/components/kader/topbar"
import { Skeleton } from "@/components/ui/skeleton"
import { CatatKunjunganModal } from "@/components/kader/catat-kunjungan-modal"
import { IngatkanIbuModal } from "@/components/kader/ingatkan-ibu-modal"
import { PeriksaKehamilanModal } from "@/components/kader/periksa-kehamilan-modal"
import { AkhiriKehamilanModal } from "@/components/kader/akhiri-kehamilan-modal"
import { IngatkanIbuKehamilanModal } from "@/components/kader/ingatkan-ibu-kehamilan-modal"
import { EditDataIbuModal } from "@/components/kader/edit-data-ibu-modal"
import { EditDataAnakModal } from "@/components/kader/edit-data-anak-modal"
import { TrimesterPill } from "@/components/ibu/trimester-pill"
import type { IMTCategory } from "@/lib/growth-standards/imt-calc"

type Status = "Normal" | "Risiko Stunting" | "Stunting"

type Child = {
  no: number
  id: string
  ibuId: string
  nama: string
  sex: "L" | "P"
  ageMo: number
  usia: string
  bb: string
  tb: string
  status: Status
  sudah: boolean
  tgl: string
  ibuName: string
  noHp: string | null
  terakhirDiingatkan: Date | null
  birthDateRaw: string
  beratLahir: number | null
  panjangLahir: number | null
}

type Tab = "anak" | "ibu-hamil"

type IbuHamilRow = {
  no: number
  id: string
  nama: string
  gestationalWeeks: number | null
  trimester: 1 | 2 | 3 | null
  statusRisiko: "RENDAH" | "SEDANG" | "TINGGI" | null
  sudahKunjungan: boolean
  lastVisit: string
  imtCategory: IMTCategory
  bbPrepregnancyKg: number
  jumlahJanin: number
  jumlahKehamilan: number
  noHp: string | null
  kelurahan: string | null
  alamat: string | null
}


import { StatusBadge } from "@/components/status-badge"



export default function RekapPosyanduPage() {
  return (
    <Suspense fallback={null}>
      <RekapPosyanduPageInner />
    </Suspense>
  )
}

const REKAP_STATS_CACHE_KEY = "kader-rekap-stats"
const REKAP_TABLE_CACHE_KEY = "kader-rekap-table"

type RekapStats = { totalChildren: number, measuredThisMonth: number, posyanduName: string }
type RekapTable = { children: Child[], ibuHamil: IbuHamilRow[] }

function RekapPosyanduPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const cachedTable = getCached<RekapTable>(REKAP_TABLE_CACHE_KEY)
  const [children, setChildren] = useState<Child[]>(cachedTable?.children ?? [])
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [visitChild, setVisitChild] = useState<Child | null>(null)
  const [ingatkanAnak, setIngatkanAnak] = useState<Child | null>(null)
  const [stats, setStats] = useState<RekapStats | null>(getCached<RekapStats>(REKAP_STATS_CACHE_KEY) ?? null)
  const [loading, setLoading] = useState(!cachedTable)
  const [activeTab, setActiveTab] = useState<Tab>(() => (searchParams.get("tab") === "ibu-hamil" ? "ibu-hamil" : "anak"))
  const [ibuHamil, setIbuHamil] = useState<IbuHamilRow[]>(cachedTable?.ibuHamil ?? [])
  const [ibuAction, setIbuAction] = useState<{ row: IbuHamilRow; type: "periksa" | "akhiri" | "ingatkan" | "edit" } | null>(null)
  const [editAnakRow, setEditAnakRow] = useState<Child | null>(null)


  const [hamilTrimesterFilter, setHamilTrimesterFilter] = useState("")
  const [hamilKunjunganFilter, setHamilKunjunganFilter] = useState("")
  const [tempHamilTrimester, setTempHamilTrimester] = useState("")
  const [tempHamilKunjungan, setTempHamilKunjungan] = useState("")


  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [checkFilter, setCheckFilter] = useState(() => searchParams.get("check") || "")
  const [tempStatus, setTempStatus] = useState("")
  const [tempCheck, setTempCheck] = useState(() => searchParams.get("check") || "")
  const skipNextTabReset = useRef(true)

  const [tambahPasienOpen, setTambahPasienOpen] = useState(false)

  const loadData = () => {
    // Stats load secara independen — tidak blok tabel
    getRekapStats().then((data) => {
      setStats(data)
      setCached(REKAP_STATS_CACHE_KEY, data)
    })
    // Tabel anak + ibu hamil load bersamaan, skeleton hilang saat keduanya siap
    Promise.all([getChildren(), getIbuHamil()])
      .then(([childData, hamilData]) => {
        setChildren(childData as Child[])
        setIbuHamil(hamilData as IbuHamilRow[])
        setLoading(false)
        setCached<RekapTable>(REKAP_TABLE_CACHE_KEY, { children: childData as Child[], ibuHamil: hamilData as IbuHamilRow[] })
      })
  }

  useEffect(() => { loadData() }, [])

  const filtered = useMemo(() => {
    return children.filter((c) => {
      const matchName = c.nama.toLowerCase().includes(query.toLowerCase())
      const matchStatus = !statusFilter || c.status === statusFilter
      const matchCheck =
        !checkFilter ||
        (checkFilter === "Sudah Periksa" && c.sudah) ||
        (checkFilter === "Belum Periksa" && !c.sudah)
      return matchName && matchStatus && matchCheck
    })
  }, [children, query, statusFilter, checkFilter])

  const filteredHamil = useMemo(() => {
    return ibuHamil.filter((r) => {
      const matchName = r.nama.toLowerCase().includes(query.toLowerCase())
      const matchTrimester =
        !hamilTrimesterFilter || r.trimester === Number(hamilTrimesterFilter)
      const matchKunjungan =
        !hamilKunjunganFilter ||
        (hamilKunjunganFilter === "Sudah" && r.sudahKunjungan) ||
        (hamilKunjunganFilter === "Belum" && !r.sudahKunjungan)
      return matchName && matchTrimester && matchKunjungan
    })
  }, [ibuHamil, query, hamilTrimesterFilter, hamilKunjunganFilter])



  useEffect(() => {
    if (skipNextTabReset.current) {
      skipNextTabReset.current = false
      return
    }
    setQuery("")
    setStatusFilter("")
    setCheckFilter("")
    setTempStatus("")
    setTempCheck("")
    setHamilTrimesterFilter("")
    setHamilKunjunganFilter("")
    setTempHamilTrimester("")
    setTempHamilKunjungan("")
  }, [activeTab])

  const handleApplyFilters = () => {
    setStatusFilter(tempStatus)
    setCheckFilter(tempCheck)
  }
  const handleResetFilters = () => {
    setTempStatus("")
    setTempCheck("")
    setStatusFilter("")
    setCheckFilter("")
  }
  const isFilterActive = !!statusFilter || !!checkFilter
  const isFilterChanged = tempStatus !== statusFilter || tempCheck !== checkFilter

  const handleApplyHamilFilters = () => {
    setHamilTrimesterFilter(tempHamilTrimester)
    setHamilKunjunganFilter(tempHamilKunjungan)
  }
  const handleResetHamilFilters = () => {
    setTempHamilTrimester("")
    setTempHamilKunjungan("")
    setHamilTrimesterFilter("")
    setHamilKunjunganFilter("")
  }
  const isHamilFilterActive = !!hamilTrimesterFilter || !!hamilKunjunganFilter
  const isHamilFilterChanged = tempHamilTrimester !== hamilTrimesterFilter || tempHamilKunjungan !== hamilKunjunganFilter


  const total = children.length

  const alertStats = !loading && stats ? {
    stuntingCount: children.filter((c) => c.status === "Stunting").length,
    berisikoCount: children.filter((c) => c.status === "Risiko Stunting").length,
    belumDiperiksa: stats.totalChildren - stats.measuredThisMonth,
  } : null

  const handleExport = () => {
    const today = new Date().toISOString().slice(0, 10)
    if (activeTab === "anak") {
      downloadCSV(`rekap-anak-${today}.csv`, toCSV(
        ["No", "Nama", "L/P", "Usia", "BB (kg)", "TB (cm)", "Status Gizi", "Periksa Bulan Ini", "Terakhir Periksa"],
        filtered.map((r) => [r.no, r.nama, r.sex, r.usia, r.bb, r.tb, r.status, r.sudah ? "Sudah" : "Belum", r.tgl])
      ))
    } else if (activeTab === "ibu-hamil") {
      downloadCSV(`rekap-ibu-hamil-${today}.csv`, toCSV(
        ["No", "Nama", "Usia Kandungan", "Status Risiko", "Periksa Bulan Ini", "Terakhir Periksa"],
        filteredHamil.map((r) => [r.no, r.nama, r.gestationalWeeks != null ? `${r.gestationalWeeks} mgg` : "-", r.statusRisiko ?? "-", r.sudahKunjungan ? "Sudah" : "Belum", r.lastVisit])
      ))
    }
  }

  const activeCount = activeTab === "anak" ? filtered.length : filteredHamil.length


  return (
    <div className="min-h-full bg-[#EBF2F8] flex flex-col">
      <Topbar
        searchValue={query}
        onSearchChange={setQuery}
        alertStats={alertStats}
      />

      <div className="p-6 space-y-5 flex-1">
        {/* Title + User */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium text-[#173753]">Pasien</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTambahPasienOpen(true)}
              className="gap-1.5 text-xs h-8 px-4 rounded-[50px] text-white border-none font-medium hover:opacity-90 transition-opacity flex items-center"
              style={{ background: "linear-gradient(to right, #52A9E3, #93D1F7)" }}
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Pasien
            </button>
            <ImportPasienDialog kind={activeTab === "anak" ? "anak" : "ibu"} onImported={loadData} />
            <Button
              variant="ghost" size="sm"
              disabled={activeCount === 0}
              onClick={handleExport}
              className="gap-1.5 text-xs h-8 px-4 bg-white rounded-[50px] text-[#173753] hover:bg-white/80"
            >
              <Download className="w-3.5 h-3.5" />
              Ekspor
            </Button>
            <KaderUserPill />
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex p-1 rounded-[50px] bg-white gap-1 w-fit">
          {(["anak", "ibu-hamil"] as const).map((tab) => {
            const labels: Record<string, string> = { anak: "Anak", "ibu-hamil": "Ibu Hamil" }
            const counts: Record<string, number> = { anak: children.length, "ibu-hamil": ibuHamil.length }
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex items-center gap-2 px-5 py-1.5 text-[12px] font-medium rounded-[50px] transition-all",
                  isActive
                    ? "bg-[#52A9E3] text-white"
                    : "text-[#173753] hover:bg-[#52A9E3]/10"
                )}
              >
                {labels[tab]}
                <span className={cn(
                  "text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none",
                  isActive
                    ? "bg-white/25 text-white"
                    : "bg-[#52A9E3]/10 text-[#52A9E3]"
                )}>
                  {loading ? <Skeleton className="h-2.5 w-4 inline-block rounded" /> : counts[tab]}
                </span>
              </button>
            )
          })}
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Filter Anak */}
          {activeTab === "anak" && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground">Filter</span>
              <Select value={tempStatus} onValueChange={(v) => setTempStatus(v as string)}>
                <SelectTrigger className="w-fit min-w-[140px] h-8 px-3 rounded-[50px] bg-white text-xs text-[#173753] border-none shadow-none focus:ring-0">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Status Gizi:</span>
                    <SelectValue placeholder="Semua" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-none">
                  <SelectItem value="" className="text-xs text-[#173753]">Semua</SelectItem>
                  <SelectItem value="Normal" className="text-xs text-[#173753]">Normal</SelectItem>
                  <SelectItem value="Risiko Stunting" className="text-xs text-[#173753]">Risiko Stunting</SelectItem>
                  <SelectItem value="Stunting" className="text-xs text-[#173753]">Stunting</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tempCheck} onValueChange={(v) => setTempCheck(v as string)}>
                <SelectTrigger className="w-fit min-w-[140px] h-8 px-3 rounded-[50px] bg-white text-xs text-[#173753] border-none shadow-none focus:ring-0">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Status Periksa:</span>
                    <SelectValue placeholder="Semua" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-none">
                  <SelectItem value="" className="text-xs text-[#173753]">Semua</SelectItem>
                  <SelectItem value="Sudah Periksa" className="text-xs text-[#173753]">Sudah Periksa</SelectItem>
                  <SelectItem value="Belum Periksa" className="text-xs text-[#173753]">Belum Periksa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {activeTab === "anak" && (isFilterActive || isFilterChanged) && (
            <div className="flex items-center gap-2">
              {isFilterChanged && (
                <button onClick={handleApplyFilters} className="flex items-center gap-1.5 px-4 h-8 rounded-[50px] text-white text-xs font-medium hover:opacity-90 transition-opacity" style={{ background: "linear-gradient(to right, #52A9E3, #93D1F7)" }}>
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Terapkan Filter
                </button>
              )}
              {isFilterActive && (
                <button onClick={handleResetFilters} className="flex items-center gap-1.5 px-3 h-8 rounded-[50px] bg-white text-xs text-[#173753] hover:bg-gray-50">
                  <X className="w-3.5 h-3.5" />
                  Hapus Filter
                </button>
              )}
            </div>
          )}

          {/* Filter Ibu Hamil */}
          {activeTab === "ibu-hamil" && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground">Filter</span>
              <Select value={tempHamilTrimester} onValueChange={(v) => setTempHamilTrimester(v as string)}>
                <SelectTrigger className="w-fit min-w-[140px] h-8 px-3 rounded-[50px] bg-white text-xs text-[#173753] border-none shadow-none focus:ring-0">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Trimester:</span>
                    <SelectValue placeholder="Semua" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-none">
                  <SelectItem value="" className="text-xs text-[#173753]">Semua</SelectItem>
                  <SelectItem value="1" className="text-xs text-[#173753]">Trimester 1</SelectItem>
                  <SelectItem value="2" className="text-xs text-[#173753]">Trimester 2</SelectItem>
                  <SelectItem value="3" className="text-xs text-[#173753]">Trimester 3</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tempHamilKunjungan} onValueChange={(v) => setTempHamilKunjungan(v as string)}>
                <SelectTrigger className="w-fit min-w-[140px] h-8 px-3 rounded-[50px] bg-white text-xs text-[#173753] border-none shadow-none focus:ring-0">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Kunjungan:</span>
                    <SelectValue placeholder="Semua" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-none">
                  <SelectItem value="" className="text-xs text-[#173753]">Semua</SelectItem>
                  <SelectItem value="Sudah" className="text-xs text-[#173753]">Sudah Kunjungan</SelectItem>
                  <SelectItem value="Belum" className="text-xs text-[#173753]">Belum Kunjungan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {activeTab === "ibu-hamil" && (isHamilFilterActive || isHamilFilterChanged) && (
            <div className="flex items-center gap-2">
              {isHamilFilterChanged && (
                <button onClick={handleApplyHamilFilters} className="flex items-center gap-1.5 px-4 h-8 rounded-[50px] text-white text-xs font-medium hover:opacity-90 transition-opacity" style={{ background: "linear-gradient(to right, #52A9E3, #93D1F7)" }}>
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Terapkan Filter
                </button>
              )}
              {isHamilFilterActive && (
                <button onClick={handleResetHamilFilters} className="flex items-center gap-1.5 px-3 h-8 rounded-[50px] bg-white text-xs text-[#173753] hover:bg-gray-50">
                  <X className="w-3.5 h-3.5" />
                  Hapus Filter
                </button>
              )}
            </div>
          )}


        </div>

        {/* Table Card */}
        <Card className="ring-0">
          <CardContent className="p-0">
            {/* Anak Table */}
            {activeTab === "anak" && (
              <div className="px-4 pb-1">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#E8E8E8]">
                      <TableHead className="text-[14px] text-[#173753] font-medium pl-2 w-10">No</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">Nama Pasien</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium w-10">L/P</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">Usia</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">BB</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">TB</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">Status Gizi</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">Periksa Bulan Ini</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">Terakhir Periksa</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i} className="border-b border-[#F0F0F0]">
                          <TableCell className="pl-2"><Skeleton className="h-4 w-6" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-7 rounded" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-7 w-7 rounded-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-16">
                          <div className="flex flex-col items-center gap-2">
                            <Search className="w-8 h-8 text-gray-200" />
                            <p className="text-sm font-medium text-muted-foreground">Tidak ada data yang cocok</p>
                            <p className="text-xs text-muted-foreground">Coba ubah filter atau kata kunci pencarian</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((row) => (
                        <TableRow
                          key={row.no}
                          className={cn(
                            "border-b border-[#F0F0F0] transition-colors hover:bg-[#F7FBFF]",
                            !row.sudah && "bg-amber-50/40"
                          )}
                        >
                          <TableCell className="text-[14px] pl-2 text-[#173753]">{row.no}</TableCell>
                          <TableCell className="text-[14px] font-medium text-[#173753]">
                            <Link href={`/kader/anak/${row.id}`} className="hover:text-[#52A9E3] transition-colors">
                              {row.nama}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              "text-[14px] font-semibold px-1.5 py-0.5 rounded-[4px]",
                              row.sex === "L"
                                ? "bg-[#378ADD]/10 text-[#378ADD]"
                                : "bg-pink-100 text-pink-600"
                            )}>
                              {row.sex}
                            </span>
                          </TableCell>
                          <TableCell className="text-[14px] text-[#173753]">{row.usia}</TableCell>
                          <TableCell className="text-[14px] text-[#173753]">{row.bb} kg</TableCell>
                          <TableCell className="text-[14px] text-[#173753]">{row.tb} cm</TableCell>
                          <TableCell>
                            <StatusBadge status={row.status} />
                          </TableCell>
                          <TableCell>
                            {row.sudah ? (
                              <span className="text-[14px] font-medium text-green-700 flex items-center gap-1">
                                <CircleCheck className="w-3.5 h-3.5 flex-none" />
                                Sudah Periksa
                              </span>
                            ) : (
                              <span className="text-[14px] font-medium text-amber-700 flex items-center gap-1">
                                <CircleAlert className="w-3.5 h-3.5 flex-none" />
                                Belum Periksa
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-[14px] text-[#173753]">{row.tgl}</TableCell>
                          <TableCell className="text-muted-foreground">
                            <Popover open={openMenuId === row.id} onOpenChange={(o) => setOpenMenuId(o ? row.id : null)}>
                              <PopoverTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100">
                                <MoreHorizontal className="w-4 h-4" />
                              </PopoverTrigger>
                              <PopoverContent side="left" align="start" className="w-52 p-1.5 rounded-2xl border-none">
                                {[
                                  { icon: Stethoscope, label: "Periksa Sekarang",     danger: false, onClick: () => { setOpenMenuId(null); setVisitChild(row) } },
                                  { icon: User,        label: "Lihat Profil Anak",    danger: false, onClick: () => { setOpenMenuId(null); router.push(`/kader/anak/${row.id}`) } },
                                  {
                                    icon: Bell,        
                                    label: (() => {
                                      const isRecentlyReminded = row.terakhirDiingatkan && new Date(row.terakhirDiingatkan) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                                      return isRecentlyReminded ? "✓ Diingatkan hari ini" : "Ingatkan Ibu"
                                    })(),         
                                    danger: false, 
                                    onClick: () => { 
                                      const isRecentlyReminded = row.terakhirDiingatkan && new Date(row.terakhirDiingatkan) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                                      if (!isRecentlyReminded) {
                                        setOpenMenuId(null); 
                                        setIngatkanAnak(row);
                                      }
                                    } 
                                  },
                                  { icon: User,        label: "Lihat Profil Ibu",     danger: false, onClick: () => { setOpenMenuId(null); router.push(`/kader/ibu/${row.ibuId}`) } },
                                  { icon: Pencil,      label: "Edit Data",            danger: false, onClick: () => { setOpenMenuId(null); setEditAnakRow(row) } },
                                ].map((item, i) => (
                                  <React.Fragment key={i}>
                                    <button
                                      onClick={item.onClick}
                                      disabled={item.label === "✓ Diingatkan hari ini"}
                                      className={cn(
                                        "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-[8px] text-[12.5px] font-medium transition",
                                        item.danger
                                          ? "text-red-500 hover:bg-[#52A9E3] hover:text-[#F5F7FA]"
                                          : item.label === "✓ Diingatkan hari ini"
                                          ? "text-teal-600 bg-teal-50/50 cursor-not-allowed"
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
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Ibu Hamil Table */}
            {activeTab === "ibu-hamil" && (
              <div className="px-4 pb-1">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#E8E8E8]">
                      <TableHead className="text-[14px] text-[#173753] font-medium pl-2 w-10">No</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">Nama</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">Usia Kandungan</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">Status Risiko</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">Periksa Bulan Ini</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">Terakhir Periksa</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i} className="border-b border-[#F0F0F0]">
                          <TableCell className="pl-2"><Skeleton className="h-4 w-6" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-7 w-7 rounded-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredHamil.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-16">
                          <div className="flex flex-col items-center gap-2">
                            <Search className="w-8 h-8 text-gray-200" />
                            <p className="text-sm font-medium text-muted-foreground">Tidak ada data yang cocok</p>
                            <p className="text-xs text-muted-foreground">Coba ubah filter atau kata kunci pencarian</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredHamil.map((row) => (
                        <TableRow
                          key={row.id}
                          className={cn(
                            "border-b border-[#F0F0F0] transition-colors hover:bg-[#F7FBFF]",
                            !row.sudahKunjungan && "bg-amber-50/40"
                          )}
                        >
                          <TableCell className="text-[14px] pl-2 text-[#173753]">{row.no}</TableCell>
                          <TableCell className="text-[14px] font-medium text-[#173753]">
                            <Link href={`/kader/ibu/${row.id}`} className="hover:text-[#52A9E3] transition-colors">
                              {row.nama}
                            </Link>
                          </TableCell>
                          <TableCell className="text-[14px] text-[#173753]">
                            {row.gestationalWeeks !== null ? (
                              <span className="inline-flex items-center gap-2">
                                {row.gestationalWeeks} mgg
                                {row.trimester !== null && <TrimesterPill trimester={row.trimester} />}
                              </span>
                            ) : "-"}
                          </TableCell>
                          <TableCell>
                            {row.statusRisiko ? (
                              <StatusBadge
                                status={row.statusRisiko}
                                label={row.statusRisiko[0] + row.statusRisiko.slice(1).toLowerCase()}
                              />
                            ) : "-"}
                          </TableCell>
                          <TableCell>
                            {row.sudahKunjungan ? (
                              <span className="text-[14px] font-medium text-green-700 flex items-center gap-1">
                                <CircleCheck className="w-3.5 h-3.5 flex-none" />
                                Sudah
                              </span>
                            ) : (
                              <span className="text-[14px] font-medium text-amber-700 flex items-center gap-1">
                                <CircleAlert className="w-3.5 h-3.5 flex-none" />
                                Belum
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-[14px] text-[#173753]">{row.lastVisit}</TableCell>
                          <TableCell className="text-muted-foreground">
                            <Popover open={openMenuId === row.id} onOpenChange={(o) => setOpenMenuId(o ? row.id : null)}>
                              <PopoverTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100">
                                <MoreHorizontal className="w-4 h-4" />
                              </PopoverTrigger>
                              <PopoverContent side="left" align="start" className="w-52 p-1.5 rounded-2xl border-none">
                                {[
                                  { icon: Stethoscope, label: "Catat Kunjungan", danger: false, onClick: () => { setOpenMenuId(null); setIbuAction({ row, type: "periksa" }) } },
                                  { icon: User,        label: "Lihat Profil",     danger: false, onClick: () => { setOpenMenuId(null); router.push(`/kader/ibu/${row.id}`) } },
                                  { icon: Bell,        label: "Ingatkan Ibu",     danger: false, onClick: () => { setOpenMenuId(null); setIbuAction({ row, type: "ingatkan" }) } },
                                  { icon: Pencil,      label: "Edit Data",        danger: false, onClick: () => { setOpenMenuId(null); setIbuAction({ row, type: "edit" }) } },
                                  { icon: PowerOff,    label: "Akhiri Kehamilan", danger: true,  onClick: () => { setOpenMenuId(null); setIbuAction({ row, type: "akhiri" }) } },
                                ].map((item, i, arr) => (
                                  <React.Fragment key={i}>
                                    {i === arr.length - 1 && <div className="my-1 border-t border-gray-100" />}
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
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}


            {/* Footer */}
            {activeTab === "anak" && filtered.length > 0 && (
              <div className="px-4 py-2.5 border-t border-[#F0F0F0] flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Menampilkan <span className="font-medium text-[#173753]">{filtered.length}</span> dari <span className="font-medium text-[#173753]">{total}</span> data
                </p>
                <div className="flex items-center gap-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    <CircleCheck className="w-2.5 h-2.5" />
                    {filtered.filter(c => c.sudah).length} sudah
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    <CircleAlert className="w-2.5 h-2.5" />
                    {filtered.filter(c => !c.sudah).length} belum
                  </span>
                  {filtered.filter(c => c.status === "Stunting").length > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      <Activity className="w-2.5 h-2.5" />
                      {filtered.filter(c => c.status === "Stunting").length} stunting
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Ibu Hamil Footer */}
            {activeTab === "ibu-hamil" && filteredHamil.length > 0 && (
              <div className="px-4 py-2.5 border-t border-[#F0F0F0] flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Menampilkan <span className="font-medium text-[#173753]">{filteredHamil.length}</span> dari{" "}
                  <span className="font-medium text-[#173753]">{ibuHamil.length}</span> data
                </p>
                <div className="flex items-center gap-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    <CircleCheck className="w-2.5 h-2.5" />
                    {filteredHamil.filter(r => r.sudahKunjungan).length} sudah kunjungan
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    <CircleAlert className="w-2.5 h-2.5" />
                    {filteredHamil.filter(r => !r.sudahKunjungan).length} belum kunjungan
                  </span>
                </div>
              </div>
            )}


          </CardContent>
        </Card>
      </div>

      <TambahPasienModal
        open={tambahPasienOpen}
        onOpenChange={setTambahPasienOpen}
        onSaved={loadData}
      />

      {visitChild && (
        <CatatKunjunganModal
          open={!!visitChild}
          onOpenChange={(o) => { if (!o) setVisitChild(null) }}
          child={{
            id: visitChild.id,
            name: visitChild.nama,
            gender: visitChild.sex === "L" ? "Laki-laki" : "Perempuan",
            ageMo: visitChild.ageMo,
          }}
          onSaved={loadData}
        />
      )}

      {ingatkanAnak && (
        <IngatkanIbuModal
          open={!!ingatkanAnak}
          onOpenChange={(o) => { if (!o) setIngatkanAnak(null) }}
          child={{
            id: ingatkanAnak.id,
            name: ingatkanAnak.nama,
            ibuName: ingatkanAnak.ibuName,
            noHp: ingatkanAnak.noHp,
            posyanduName: stats?.posyanduName,
          }}
          onSent={loadData}
        />
      )}

      {ibuAction?.type === "periksa" && (
        <PeriksaKehamilanModal
          open
          onOpenChange={(o) => { if (!o) setIbuAction(null) }}
          onSaved={loadData}
          ibu={{
            id: ibuAction.row.id,
            nama: ibuAction.row.nama,
            gestationalWeeks: ibuAction.row.gestationalWeeks ?? 0,
            trimester: ibuAction.row.trimester ?? 1,
            bbPrepregnancyKg: ibuAction.row.bbPrepregnancyKg,
            imtCategory: ibuAction.row.imtCategory,
            jumlahJanin: ibuAction.row.jumlahJanin,
          }}
        />
      )}

      {ibuAction?.type === "akhiri" && (
        <AkhiriKehamilanModal
          open
          onOpenChange={(o) => { if (!o) setIbuAction(null) }}
          onSaved={loadData}
          ibu={{
            id: ibuAction.row.id,
            nama: ibuAction.row.nama,
            pregnancyInfo: `kehamilan ke-${ibuAction.row.jumlahKehamilan} · ${ibuAction.row.gestationalWeeks ?? 0} minggu`,
          }}
        />
      )}

      {ibuAction?.type === "ingatkan" && (
        <IngatkanIbuKehamilanModal
          open
          onOpenChange={(o) => { if (!o) setIbuAction(null) }}
          onSent={loadData}
          ibu={{ id: ibuAction.row.id, nama: ibuAction.row.nama, noHp: ibuAction.row.noHp, posyanduName: stats?.posyanduName }}
        />
      )}

      {ibuAction?.type === "edit" && (
        <EditDataIbuModal
          open
          onOpenChange={(o) => { if (!o) setIbuAction(null) }}
          onSaved={loadData}
          ibu={{ id: ibuAction.row.id, nama: ibuAction.row.nama, noHp: ibuAction.row.noHp, kelurahan: ibuAction.row.kelurahan, alamat: ibuAction.row.alamat }}
        />
      )}

      {editAnakRow && (
        <EditDataAnakModal
          open
          onOpenChange={(o) => { if (!o) setEditAnakRow(null) }}
          onSaved={loadData}
          anak={{
            id: editAnakRow.id,
            nama: editAnakRow.nama,
            genderRaw: editAnakRow.sex,
            birthDateRaw: editAnakRow.birthDateRaw,
            beratLahir: editAnakRow.beratLahir,
            panjangLahir: editAnakRow.panjangLahir,
          }}
        />
      )}

    </div>
  )
}
