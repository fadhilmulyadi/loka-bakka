"use client"

import { useState, useMemo, useEffect } from "react"
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
  Bell, LogOut, TriangleAlert, Clock, Search,
  ChevronDown, ChevronLeft, ChevronRight, ChevronRight as ArrowRight,
  CircleCheck, CircleAlert, Activity, Download, Upload, Plus, MoreHorizontal,
  SlidersHorizontal, X,
} from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { getChildren, getDashboardStats, getIbuHamil, getIbuBiasa } from "@/lib/actions/kader"

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

type Tab = "anak" | "ibu-hamil" | "ibu"

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

type IbuBiasaRow = {
  no: number
  id: string
  nama: string
  usia: string
  jumlahAnak: number
  skriningTerakhir: string
  kategoriRisiko: string | null
}

import { StatusBadge } from "@/components/status-badge"

// ... (existing imports)

function statusBadge(status: string) {
  // Keeping this for compatibility in other places if needed, but not using it here for the table.
  const map: Record<string, string> = {
    "Normal":   "bg-green-100 text-green-800",
    "Stunting": "bg-red-100 text-red-800",
    "Berisiko": "bg-amber-100 text-amber-800",
  }
  return map[status] ?? "bg-gray-100 text-gray-800"
}

export default function RekapPosyanduPage() {
  const { data: session } = useSession()
  const time = useTime()
  const [children, setChildren] = useState<Child[]>([])
  const [stats, setStats] = useState<{ totalChildren: number, measuredThisMonth: number, stuntingCount: number, posyanduName: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("anak")
  const [ibuHamil, setIbuHamil] = useState<IbuHamilRow[]>([])
  const [ibuBiasa, setIbuBiasa] = useState<IbuBiasaRow[]>([])

  // Ibu Hamil filters
  const [hamilTrimesterFilter, setHamilTrimesterFilter] = useState("")
  const [hamilKunjunganFilter, setHamilKunjunganFilter] = useState("")
  const [tempHamilTrimester, setTempHamilTrimester] = useState("")
  const [tempHamilKunjungan, setTempHamilKunjungan] = useState("")

  // Ibu filters
  const [ibuRisikoFilter, setIbuRisikoFilter] = useState("")
  const [tempIbuRisiko, setTempIbuRisiko] = useState("")

  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [checkFilter, setCheckFilter] = useState("")
  const [tempStatus, setTempStatus] = useState("")
  const [tempCheck, setTempCheck] = useState("")

  useEffect(() => {
    Promise.all([getChildren(), getDashboardStats(), getIbuHamil(), getIbuBiasa()])
      .then(([childData, statData, hamilData, biasaData]) => {
        setChildren(childData as Child[])
        setStats(statData)
        setIbuHamil(hamilData as IbuHamilRow[])
        setIbuBiasa(biasaData as IbuBiasaRow[])
        setLoading(false)
      })
  }, [])

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

  const filteredBiasa = useMemo(() => {
    return ibuBiasa.filter((r) => {
      const matchName = r.nama.toLowerCase().includes(query.toLowerCase())
      const matchRisiko = !ibuRisikoFilter || r.kategoriRisiko === ibuRisikoFilter
      return matchName && matchRisiko
    })
  }, [ibuBiasa, query, ibuRisikoFilter])

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
    setIbuRisikoFilter("")
    setTempIbuRisiko("")
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

  const handleApplyIbuFilters = () => {
    setIbuRisikoFilter(tempIbuRisiko)
  }
  const handleResetIbuFilters = () => {
    setTempIbuRisiko("")
    setIbuRisikoFilter("")
  }
  const isIbuFilterActive = !!ibuRisikoFilter
  const isIbuFilterChanged = tempIbuRisiko !== ibuRisikoFilter

  const total = children.length

  if (loading) return <div className="flex-1 flex items-center justify-center bg-[#EBF2F8]">Loading...</div>

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
            {stats ? `${stats.totalChildren - stats.measuredThisMonth} pasien belum diperiksa bulan ini` : "Loading..."}
          </span>
          <span className="text-xs text-muted-foreground flex-none font-medium">| {stats?.posyanduName || "Loading..."}</span>
        </div>
        <div className="flex items-center gap-2 flex-none">
          <div className="flex items-center gap-2 px-4 h-8 text-xs text-[#173753] bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
            <Clock className="w-3.5 h-3.5" />
            <span className="tabular-nums">{time || "—"}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 bg-white rounded-full shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-[#173753] hover:bg-white/80">
            <Bell className="w-4 h-4" />
          </Button>
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
            <Button
              variant="ghost" size="sm"
              className="gap-1.5 text-xs h-8 px-4 bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-[#173753] hover:bg-white/80"
            >
              <Upload className="w-3.5 h-3.5" />
              Impor
            </Button>
            <Button
              variant="ghost" size="sm"
              className="gap-1.5 text-xs h-8 px-4 bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-[#173753] hover:bg-white/80"
            >
              <Download className="w-3.5 h-3.5" />
              Ekspor
            </Button>
            <div className="flex items-center gap-2 pl-1 pr-3 py-1 bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-teal-100 text-teal-700 text-sm font-semibold">
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
        <div className="flex p-1 rounded-xl bg-white shadow-[2px_2px_8px_rgba(0,0,0,0.08)] gap-1 w-fit">
          {(["anak", "ibu-hamil", "ibu"] as const).map((tab) => {
            const labels: Record<string, string> = { anak: "Anak", "ibu-hamil": "Ibu Hamil", ibu: "Ibu" }
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-5 py-1.5 text-[10px] font-medium uppercase tracking-widest rounded-lg transition-all",
                  activeTab === tab
                    ? "bg-[#52A9E3] text-white shadow-sm"
                    : "text-[#173753] hover:bg-[#52A9E3]/10"
                )}
              >
                {labels[tab]}
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

          {/* Filter Ibu */}
          {activeTab === "ibu" && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground">Filter</span>
              <Select value={tempIbuRisiko} onValueChange={(v) => setTempIbuRisiko(v as string)}>
                <SelectTrigger className="w-fit min-w-[160px] h-8 px-3 rounded-[50px] bg-white shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-xs text-[#173753] border-none focus:ring-0">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Kategori Risiko:</span>
                    <SelectValue placeholder="Semua" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
                  <SelectItem value="" className="text-xs text-[#173753]">Semua</SelectItem>
                  <SelectItem value="Aman" className="text-xs text-[#173753]">Aman</SelectItem>
                  <SelectItem value="Waspada" className="text-xs text-[#173753]">Waspada</SelectItem>
                  <SelectItem value="Bahaya" className="text-xs text-[#173753]">Bahaya</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {activeTab === "ibu" && (isIbuFilterActive || isIbuFilterChanged) && (
            <div className="flex items-center gap-2">
              {isIbuFilterChanged && (
                <button onClick={handleApplyIbuFilters} className="flex items-center gap-1.5 px-4 h-8 rounded-[50px] text-white text-xs font-medium shadow-[2px_2px_8px_rgba(0,0,0,0.08)] hover:opacity-90 transition-opacity" style={{ background: "linear-gradient(to right, #52A9E3, #93D1F7)" }}>
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Terapkan Filter
                </button>
              )}
              {isIbuFilterActive && (
                <button onClick={handleResetIbuFilters} className="flex items-center gap-1.5 px-3 h-8 rounded-[50px] bg-white shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-xs text-[#173753] hover:bg-gray-50">
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
                    {filtered.length === 0 ? (
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
                    {filteredHamil.length === 0 ? (
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

            {/* Ibu Table */}
            {activeTab === "ibu" && (
              <div className="px-4 pb-1">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#E8E8E8]">
                      <TableHead className="text-[14px] text-[#173753] font-medium pl-2 w-10">No</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">Nama</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">Usia</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">Jml Anak</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">Skrining Terakhir</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">Kategori Risiko</TableHead>
                      <TableHead className="text-[14px] text-[#173753] font-medium">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBiasa.length === 0 ? (
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
                      filteredBiasa.map((row) => (
                        <TableRow
                          key={row.id}
                          className="border-b border-[#F0F0F0] transition-colors hover:bg-[#F7FBFF]"
                        >
                          <TableCell className="text-[14px] pl-2 text-[#173753]">{row.no}</TableCell>
                          <TableCell className="text-[14px] font-medium text-[#173753]">
                            <Link href={`/kader/ibu/${row.id}`} className="hover:text-[#52A9E3] transition-colors">
                              {row.nama}
                            </Link>
                          </TableCell>
                          <TableCell className="text-[14px] text-[#173753]">{row.usia}</TableCell>
                          <TableCell className="text-[14px] text-[#173753]">{row.jumlahAnak} anak</TableCell>
                          <TableCell className="text-[14px] text-[#173753]">{row.skriningTerakhir}</TableCell>
                          <TableCell>
                            {row.kategoriRisiko ? (
                              <StatusBadge status={row.kategoriRisiko} />
                            ) : (
                              <span className="text-[12px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                                Belum Skrining
                              </span>
                            )}
                          </TableCell>
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

            {/* Ibu Footer */}
            {activeTab === "ibu" && filteredBiasa.length > 0 && (
              <div className="px-4 py-2.5 border-t border-[#F0F0F0] flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Menampilkan <span className="font-medium text-[#173753]">{filteredBiasa.length}</span> dari{" "}
                  <span className="font-medium text-[#173753]">{ibuBiasa.length}</span> data
                </p>
                <div className="flex items-center gap-1">
                  {(["Aman", "Waspada", "Bahaya"] as const).map((k) => {
                    const count = filteredBiasa.filter(r => r.kategoriRisiko === k).length
                    if (count === 0) return null
                    const colors: Record<string, string> = {
                      Aman:    "bg-green-100 text-green-700",
                      Waspada: "bg-amber-100 text-amber-700",
                      Bahaya:  "bg-red-100 text-red-700",
                    }
                    return (
                      <span key={k} className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${colors[k]}`}>
                        {count} {k.toLowerCase()}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
