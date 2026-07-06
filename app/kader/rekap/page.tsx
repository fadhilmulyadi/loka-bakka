"use client"

import React, { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import {
  Card, CardContent,
} from "@/components/ui/card"
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  LogOut, TriangleAlert, Clock, Search,
  ChevronDown, ChevronLeft, ChevronRight, ChevronRight as ArrowRight,
  CircleCheck, CircleAlert, Activity, Download, Plus, MoreHorizontal,
  SlidersHorizontal, X, Stethoscope, User, FileText, Bell, Pencil, PowerOff,
} from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { getChildren, getDashboardStats, getIbuHamil } from "@/lib/actions/kader"
import { toCSV, downloadCSV } from "@/lib/csv"
import { ImportPasienDialog } from "@/components/kader/import-pasien-dialog"
import { NotificationBell } from "@/components/kader/notification-bell"
import { Skeleton } from "@/components/ui/skeleton"

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"]

function useTime() {
  const [time, setTime] = useState(() => {
    const n = new Date()
    return `${n.getDate()} ${MONTHS_ID[n.getMonth()]} ${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`
  })
  useEffect(() => {
    const fmt = () => {
      const n = new Date()
      return `${n.getDate()} ${MONTHS_ID[n.getMonth()]} ${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`
    }
    const id = setInterval(() => setTime(fmt()), 60_000)
    return () => clearInterval(id)
  }, [])
  return time
}

type Status = "Normal" | "Berisiko" | "Stunting"

type Child = {
  no: number
  id: string
  nama: string
  sex: "L" | "P"
  usia: string
  bb: string
  tb: string
  status: Status
  sudah: boolean
  tgl: string
}

type Tab = "anak" | "ibu-hamil"

type IbuHamilRow = {
  no: number
  id: string
  nama: string
  usia: string
  trimester: 1 | 2 | 3 | null
  bbSaatIni: string
  hpl: string
  sudahKunjungan: boolean
  lastVisit: string
}


import { StatusBadge } from "@/components/status-badge"



export default function RekapPosyanduPage() {
  const { data: session } = useSession()
  const time = useTime()
  const [children, setChildren] = useState<Child[]>([])
  const [stats, setStats] = useState<{ totalChildren: number, measuredThisMonth: number, stuntingCount: number, posyanduName: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("anak")
  const [ibuHamil, setIbuHamil] = useState<IbuHamilRow[]>([])


  const [hamilTrimesterFilter, setHamilTrimesterFilter] = useState("")
  const [hamilKunjunganFilter, setHamilKunjunganFilter] = useState("")
  const [tempHamilTrimester, setTempHamilTrimester] = useState("")
  const [tempHamilKunjungan, setTempHamilKunjungan] = useState("")


  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [checkFilter, setCheckFilter] = useState("")
  const [tempStatus, setTempStatus] = useState("")
  const [tempCheck, setTempCheck] = useState("")

  const loadData = () =>
    Promise.all([getChildren(), getDashboardStats(), getIbuHamil()])
      .then(([childData, statData, hamilData]) => {
        setChildren(childData as Child[])
        setStats(statData)
        setIbuHamil(hamilData as IbuHamilRow[])

        setLoading(false)
      })

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

  const handleExport = () => {
    const today = new Date().toISOString().slice(0, 10)
    if (activeTab === "anak") {
      downloadCSV(`rekap-anak-${today}.csv`, toCSV(
        ["No", "Nama", "L/P", "Usia", "BB (kg)", "TB (cm)", "Status Gizi", "Periksa Bulan Ini", "Terakhir Periksa"],
        filtered.map((r) => [r.no, r.nama, r.sex, r.usia, r.bb, r.tb, r.status, r.sudah ? "Sudah" : "Belum", r.tgl])
      ))
    } else if (activeTab === "ibu-hamil") {
      downloadCSV(`rekap-ibu-hamil-${today}.csv`, toCSV(
        ["No", "Nama", "Usia", "Trimester", "BB Saat Ini", "HPL", "Kunjungan Bulan Ini", "Terakhir Kunjungan"],
        filteredHamil.map((r) => [r.no, r.nama, r.usia, r.trimester ?? "-", r.bbSaatIni, r.hpl, r.sudahKunjungan ? "Sudah" : "Belum", r.lastVisit])
      ))
    }
  }

  const activeCount = activeTab === "anak" ? filtered.length : filteredHamil.length


  return (
    <div className="min-h-full bg-[#EBF2F8] flex flex-col">
      {/* Topbar */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2 z-10">
        <div className="relative w-[291px] flex-none">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#173753] z-10" />
          <Input
            className="pl-8 h-8 text-xs text-[#173753] placeholder:text-[#BBBBBB] bg-white rounded-[50px] border-none shadow-[2px_2px_8px_rgba(0,0,0,0.08)] focus-visible:ring-1 focus-visible:ring-gray-200"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex-1 flex items-center gap-2 px-4 h-8 bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
          <TriangleAlert className="w-3.5 h-3.5 text-[#E53935] flex-none" />
          <span className="text-xs text-[#173753] truncate font-medium">
            {loading
              ? <Skeleton className="h-3.5 w-52 inline-block rounded" />
              : `${stats!.totalChildren - stats!.measuredThisMonth} pasien belum diperiksa bulan ini`
            }
          </span>
        </div>
        <div className="flex items-center gap-2 flex-none">
          <div className="flex items-center gap-2 px-4 h-8 text-xs text-[#173753] bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
            <Clock className="w-3.5 h-3.5" />
            <span className="tabular-nums">{time || "—"}</span>
          </div>
          <NotificationBell />
          <Button
            variant="ghost" size="sm"
            className="gap-1.5 text-xs h-8 px-4 bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-[#173753] hover:bg-white/80"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="w-3.5 h-3.5" />
            Log Out
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-5 flex-1">
        {/* Title + User */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium text-[#173753]">Pasien</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/kader/tambah-pasien">
              <Button
                size="sm"
                className="gap-1.5 text-xs h-8 px-4 rounded-[50px] text-white border-none font-medium shadow-[2px_2px_8px_rgba(0,0,0,0.08)] hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(to right, #52A9E3, #93D1F7)" }}
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Pasien
              </Button>
            </Link>
            <ImportPasienDialog kind={activeTab === "anak" ? "anak" : "ibu"} onImported={loadData} />
            <Button
              variant="ghost" size="sm"
              disabled={activeCount === 0}
              onClick={handleExport}
              className="gap-1.5 text-xs h-8 px-4 bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-[#173753] hover:bg-white/80"
            >
              <Download className="w-3.5 h-3.5" />
              Ekspor
            </Button>
            <div className="flex items-center gap-2 pl-1 pr-3 py-1 bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-teal-100 text-teal-700 text-xs font-semibold">
                  {session?.user?.name?.slice(0, 2).toUpperCase() ?? "ZA"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs text-[#173753] font-medium leading-none">{session?.user?.name ?? "Kader"}</p>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">Kader {stats?.posyanduName || "..."}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex p-1 rounded-[50px] bg-white shadow-[2px_2px_8px_rgba(0,0,0,0.08)] gap-1 w-fit">
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
                    ? "bg-[#52A9E3] text-white shadow-sm"
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
                <SelectTrigger className="w-fit min-w-[140px] h-8 px-3 rounded-[50px] bg-white shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-xs text-[#173753] border-none focus:ring-0">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Status Gizi:</span>
                    <SelectValue placeholder="Semua" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
                  <SelectItem value="" className="text-xs text-[#173753]">Semua</SelectItem>
                  <SelectItem value="Normal" className="text-xs text-[#173753]">Normal</SelectItem>
                  <SelectItem value="Berisiko" className="text-xs text-[#173753]">Berisiko</SelectItem>
                  <SelectItem value="Stunting" className="text-xs text-[#173753]">Stunting</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tempCheck} onValueChange={(v) => setTempCheck(v as string)}>
                <SelectTrigger className="w-fit min-w-[140px] h-8 px-3 rounded-[50px] bg-white shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-xs text-[#173753] border-none focus:ring-0">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Status Periksa:</span>
                    <SelectValue placeholder="Semua" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
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
                <button onClick={handleApplyFilters} className="flex items-center gap-1.5 px-4 h-8 rounded-[50px] text-white text-xs font-medium shadow-[2px_2px_8px_rgba(0,0,0,0.08)] hover:opacity-90 transition-opacity" style={{ background: "linear-gradient(to right, #52A9E3, #93D1F7)" }}>
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Terapkan Filter
                </button>
              )}
              {isFilterActive && (
                <button onClick={handleResetFilters} className="flex items-center gap-1.5 px-3 h-8 rounded-[50px] bg-white shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-xs text-[#173753] hover:bg-gray-50">
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
                <SelectTrigger className="w-fit min-w-[140px] h-8 px-3 rounded-[50px] bg-white shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-xs text-[#173753] border-none focus:ring-0">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Trimester:</span>
                    <SelectValue placeholder="Semua" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
                  <SelectItem value="" className="text-xs text-[#173753]">Semua</SelectItem>
                  <SelectItem value="1" className="text-xs text-[#173753]">Trimester 1</SelectItem>
                  <SelectItem value="2" className="text-xs text-[#173753]">Trimester 2</SelectItem>
                  <SelectItem value="3" className="text-xs text-[#173753]">Trimester 3</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tempHamilKunjungan} onValueChange={(v) => setTempHamilKunjungan(v as string)}>
                <SelectTrigger className="w-fit min-w-[140px] h-8 px-3 rounded-[50px] bg-white shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-xs text-[#173753] border-none focus:ring-0">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Kunjungan:</span>
                    <SelectValue placeholder="Semua" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
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
                <button onClick={handleApplyHamilFilters} className="flex items-center gap-1.5 px-4 h-8 rounded-[50px] text-white text-xs font-medium shadow-[2px_2px_8px_rgba(0,0,0,0.08)] hover:opacity-90 transition-opacity" style={{ background: "linear-gradient(to right, #52A9E3, #93D1F7)" }}>
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Terapkan Filter
                </button>
              )}
              {isHamilFilterActive && (
                <button onClick={handleResetHamilFilters} className="flex items-center gap-1.5 px-3 h-8 rounded-[50px] bg-white shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-xs text-[#173753] hover:bg-gray-50">
                  <X className="w-3.5 h-3.5" />
                  Hapus Filter
                </button>
              )}
            </div>
          )}


        </div>

        {/* Table Card */}
        <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
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
                            <Popover>
                              <PopoverTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100">
                                <MoreHorizontal className="w-4 h-4" />
                              </PopoverTrigger>
                              <PopoverContent side="left" align="start" className="w-52 p-1.5 rounded-2xl border-none shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                                {[
                                  { icon: Stethoscope, label: "Periksa Sekarang",     danger: false },
                                  { icon: User,        label: "Lihat Profil Anak",    danger: false },
                                  { icon: FileText,    label: "Riwayat Pemeriksaan",  danger: false },
                                  { icon: Bell,        label: "Ingatkan Ibu",         danger: false },
                                  { icon: User,        label: "Lihat Profil Ibu",     danger: false },
                                  { icon: Pencil,      label: "Edit Data",            danger: false },
                                  { icon: PowerOff,    label: "Nonaktifkan Pasien",   danger: true  },
                                ].map((item, i, arr) => (
                                  <React.Fragment key={item.label}>
                                    {i === arr.length - 1 && (
                                      <div className="my-1 border-t border-gray-100" />
                                    )}
                                    <button
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

            {/* Ibu Hamil Table */}
            {activeTab === "ibu-hamil" && (
              <div className="px-4 pb-1">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#E8E8E8]">
                      <TableHead className="text-[14px] text-[#173753] font-medium pl-2 w-10">No</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">Nama</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">Usia</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">Trimester</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">BB Saat Ini</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">HPL</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">Kunjungan Bulan Ini</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">Terakhir Kunjungan</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i} className="border-b border-[#F0F0F0]">
                          <TableCell className="pl-2"><Skeleton className="h-4 w-6" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-10 rounded-full" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-7 w-7 rounded-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredHamil.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-16">
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
                          <TableCell className="text-[14px] text-[#173753]">{row.usia}</TableCell>
                          <TableCell>
                            {row.trimester !== null ? (
                              <span className={cn(
                                "text-[13px] font-semibold px-2 py-0.5 rounded-full",
                                row.trimester === 1 ? "bg-blue-50 text-blue-600" :
                                row.trimester === 2 ? "bg-purple-50 text-purple-600" :
                                                      "bg-pink-50 text-pink-600"
                              )}>
                                T{row.trimester}
                              </span>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-[14px] text-[#173753]">{row.bbSaatIni}</TableCell>
                          <TableCell className="text-[14px] text-[#173753]">{row.hpl}</TableCell>
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
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-gray-100 rounded-full">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
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
    </div>
  )
}
