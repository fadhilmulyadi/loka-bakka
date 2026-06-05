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
import { getChildren, getDashboardStats } from "@/lib/actions/kader"

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

function statusBadge(status: string) {
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
  const [query, setQuery]             = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [checkFilter, setCheckFilter]   = useState("all")

  useEffect(() => {
    Promise.all([getChildren(), getDashboardStats()]).then(([childData, statData]) => {
      setChildren(childData as Child[])
      setStats(statData)
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    return children.filter((c) => {
      const matchName   = c.nama.toLowerCase().includes(query.toLowerCase())
      const matchStatus = statusFilter === "all" || c.status === statusFilter
      const matchCheck  =
        checkFilter === "all" ||
        (checkFilter === "sudah" && c.sudah) ||
        (checkFilter === "belum" && !c.sudah)
      return matchName && matchStatus && matchCheck
    })
  }, [children, query, statusFilter, checkFilter])

  const total = children.length

  if (loading) return <div className="flex-1 flex items-center justify-center bg-[#EBF2F8]">Loading...</div>

  return (
    <div className="flex-1 bg-[#EBF2F8] flex flex-col">
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

        {/* Filter Bar */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground">Filter</span>
            
            <button className="flex items-center gap-1 px-3 h-8 rounded-[50px] bg-white shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-xs text-[#173753] hover:bg-gray-50 transition-colors">
              <span className="text-muted-foreground">Kategori:</span>
              <span className="font-medium ml-0.5">Semua</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5" />
            </button>

            <button className="flex items-center gap-1 px-3 h-8 rounded-[50px] bg-white shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-xs text-[#173753] hover:bg-gray-50 transition-colors">
              <span className="text-muted-foreground">Posyandu:</span>
              <span className="font-medium ml-0.5">Semua</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5" />
            </button>

            <button className="flex items-center gap-1 px-3 h-8 rounded-[50px] bg-white shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-xs text-[#173753] hover:bg-gray-50 transition-colors">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-medium ml-0.5">Semua</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5" />
            </button>

            <button className="flex items-center gap-1 px-3 h-8 rounded-[50px] bg-white shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-xs text-[#173753] hover:bg-gray-50 transition-colors">
              <span className="text-muted-foreground">Status Periksa:</span>
              <span className="font-medium ml-0.5">Semua</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 px-4 h-8 rounded-[50px] text-white text-xs font-medium shadow-[2px_2px_8px_rgba(0,0,0,0.08)] hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(to right, #52A9E3, #93D1F7)" }}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Terapkan Filter
            </button>
            <button className="flex items-center gap-1.5 px-3 h-8 rounded-[50px] bg-white shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-xs text-[#173753] hover:bg-gray-50 transition-colors">
              <X className="w-3.5 h-3.5" />
              Hapus Filter
            </button>
          </div>
        </div>

        {/* Table Card */}
        <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
          <CardContent className="p-0">
            {/* Header + Filter Bar */}
            <div className="flex items-center gap-3 px-4 pb-3 flex-wrap border-b border-[#F0F0F0]">
              <div className="flex-none">
                <p className="text-[16px] font-semibold text-[#173753] leading-tight">Daftar Pasien</p>
              </div>
            </div>

            {/* Table */}
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
                          <span className={`text-[14px] px-2 py-0.5 rounded-full font-medium ${statusBadge(row.status)}`}>
                            {row.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {row.sudah ? (
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

            {/* Footer */}
            {filtered.length > 0 && (
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
