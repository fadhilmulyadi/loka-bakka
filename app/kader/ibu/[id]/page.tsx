"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ChevronRight, ChevronDown, Search, TriangleAlert,
  Clock, Bell, LogOut, Plus, Baby,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { signOut, useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { getIbuById } from "@/lib/actions/kader"

const MONTHS_ID = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"]

function useTime() {
  const [time, setTime] = useState(() => {
    const n = new Date()
    return `${n.getDate()} ${MONTHS_ID[n.getMonth()]} ${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`
  })
  useEffect(() => {
    const fmt = () => {
      const n = new Date()
      return `${n.getDate()} ${MONTHS_ID[n.getMonth()]} ${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`
    }
    const id = setInterval(() => setTime(fmt()), 60_000)
    return () => clearInterval(id)
  }, [])
  return time
}

type IbuProfile = Awaited<ReturnType<typeof getIbuById>>

function statusBadge(status: string) {
  const map: Record<string, string> = {
    Normal: "bg-green-100 text-green-800",
    "Stunting Berat": "bg-red-100 text-red-800",
    "Risiko Stunting": "bg-amber-100 text-amber-800",
    "Gizi Kurang": "bg-purple-100 text-purple-800",
  }
  return map[status] ?? "bg-gray-100 text-gray-800"
}

export default function IbuProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const time = useTime()
  const router = useRouter()
  const [ibu, setIbu] = useState<IbuProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getIbuById(id)
      .then(setIbu)
      .catch(() => router.replace("/kader/rekap"))
      .finally(() => setLoading(false))
  }, [id, router])

  if (loading) return <div className="flex-1 flex items-center justify-center bg-[#EBF2F8]">Loading...</div>
  if (!ibu) return null

  const initial = ibu.nama.slice(0, 2).toUpperCase()

  return (
    <div className="flex-1 bg-[#EBF2F8] flex flex-col">
      {/* Topbar */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2 z-10">
        <div className="relative w-[291px] flex-none">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#173753] z-10" />
          <Input className="pl-8 h-8 text-xs text-[#173753] placeholder:text-[#BBBBBB] bg-white rounded-[50px] border-none shadow-[2px_2px_8px_rgba(0,0,0,0.08)] focus-visible:ring-1 focus-visible:ring-gray-200" placeholder="Search" />
        </div>
        <div className="flex-1 flex items-center gap-2 px-4 h-8 bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
          <TriangleAlert className="w-3.5 h-3.5 text-[#E53935] flex-none" />
          <span className="text-xs text-[#173753] truncate font-medium">Profil pasien</span>
        </div>
        <div className="flex items-center gap-2 flex-none">
          <div className="flex items-center gap-2 px-4 h-8 text-xs text-[#173753] bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
            <Clock className="w-3.5 h-3.5" />
            <span className="tabular-nums">{time}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 bg-white rounded-full shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-[#173753] hover:bg-white/80">
            <Bell className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8 px-4 bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-[#173753] hover:bg-white/80" onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut className="w-3.5 h-3.5" />
            Log Out
          </Button>
        </div>
      </div>

      <div className="p-6 lg:p-8 space-y-5">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div>
            <nav className="flex items-center gap-1 mb-1.5">
              <Link href="/kader/dashboard" className="text-xs text-[#173753]/50 hover:text-[#173753]">Dashboard</Link>
              <ChevronRight className="w-3 h-3 text-[#173753]/30 flex-none" />
              <Link href="/kader/rekap" className="text-xs text-[#173753]/50 hover:text-[#173753]">Pasien</Link>
              <ChevronRight className="w-3 h-3 text-[#173753]/30 flex-none" />
              <span className="text-xs text-[#173753] font-medium">{ibu.nama}</span>
            </nav>
            <h1 className="text-2xl font-medium text-[#173753]">Profil Ibu</h1>
          </div>
          <div className="flex items-center gap-2 pl-1 pr-3 py-1 bg-white rounded-[50px] shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-teal-100 text-teal-700 text-sm font-semibold">
                {session?.user?.name?.slice(0, 2).toUpperCase() ?? "KD"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs text-[#173753] font-medium leading-none">{session?.user?.name ?? "Kader"}</p>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">Kader Posyandu</p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5 items-start">
          {/* Left: info ibu */}
          <div className="col-span-1 space-y-4">
            <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center pb-4 border-b border-gray-100 mb-4">
                  <div className="h-16 w-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-[#173753] mb-3" style={{ background: "linear-gradient(135deg, #C4D6E8, #52A9E3)" }}>
                    {initial}
                  </div>
                  <p className="text-base font-semibold text-[#173753]">{ibu.nama}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">@{ibu.username}</p>
                  <span className={cn("mt-2 text-xs px-2 py-0.5 rounded-full font-medium", ibu.pregnancyProfile ? "bg-pink-100 text-pink-700" : "bg-gray-100 text-gray-600")}>
                    {ibu.pregnancyProfile ? "Sedang Hamil" : "Tidak Hamil"}
                  </span>
                </div>
                <div className="space-y-2.5 text-sm">
                  {[
                    { label: "No. HP", value: ibu.noHp },
                    { label: "Tgl Lahir", value: ibu.tanggalLahir ? new Date(ibu.tanggalLahir).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : null },
                    { label: "Alamat", value: ibu.alamat },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex gap-2">
                      <span className="text-xs text-muted-foreground w-16 shrink-0 font-medium">{label}</span>
                      <span className={cn("text-xs flex-1", value ? "text-[#173753] font-medium" : "text-gray-300 italic")}>
                        {value || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: daftar anak */}
          <div className="col-span-2">
            <Card className="ring-0 shadow-[2px_2px_8px_rgba(0,0,0,0.08)]">
              <CardHeader className="border-b border-gray-100 px-4 py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[15px] font-medium text-[#173753]">
                    Daftar Anak
                    <span className="ml-2 text-xs font-normal text-muted-foreground">({ibu.anaks.length} anak)</span>
                  </CardTitle>
                  <Link href={`/kader/ibu/${id}/tambah-anak`}>
                    <Button size="sm" className="gap-1.5 text-xs h-8 px-3 rounded-[50px] text-white border-none font-medium hover:opacity-90" style={{ background: "linear-gradient(to right, #52A9E3, #93D1F7)" }}>
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Anak
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {ibu.anaks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#F5F7FA] flex items-center justify-center mb-3">
                      <Baby className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-[#173753]">Belum ada anak terdaftar</p>
                    <p className="text-xs text-muted-foreground mt-1">Klik "Tambah Anak" untuk mendaftarkan anak ibu ini.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {ibu.anaks.map((anak) => {
                      const last = anak.pengukurans[0] ?? null
                      const birth = new Date(anak.tanggalLahir)
                      const now = new Date()
                      const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
                      const usia = months < 12 ? `${months} bln` : `${Math.floor(months / 12)} thn ${months % 12} bln`
                      return (
                        <div key={anak.id} className="flex items-center gap-3 px-4 py-3">
                          <div className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-none" style={{ background: anak.jenisKelamin === "L" ? "#378ADD" : "#E879A0" }}>
                            {anak.nama.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link href={`/kader/anak/${anak.id}`} className="hover:text-[#52A9E3] transition-colors">
                              <p className="text-sm font-medium text-[#173753] truncate">{anak.nama}</p>
                            </Link>
                            <p className="text-xs text-muted-foreground">{usia} · {anak.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}</p>
                          </div>
                          {last && (
                            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium flex-none", statusBadge(last.statusTBU))}>
                              {last.statusTBU}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
