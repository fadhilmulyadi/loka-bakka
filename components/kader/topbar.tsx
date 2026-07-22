"use client"

import { useEffect, useState } from "react"
import { CircleCheck, Clock, ClipboardList, LogOut, Search, TriangleAlert } from "lucide-react"
import { signOut } from "next-auth/react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { NotificationBell } from "@/components/kader/notification-bell"
import { getStatusStyle } from "@/lib/status-styles"

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"]

export type TopbarAlertStats = {
  stuntingCount: number
  berisikoCount: number
  belumDiperiksa: number
}

function resolveAlert(stats: TopbarAlertStats) {
  if (stats.stuntingCount > 0) {
    return {
      Icon: TriangleAlert,
      color: getStatusStyle("Stunting").text,
      text: `${stats.stuntingCount} anak terdeteksi stunting bulan ini`,
    }
  }
  if (stats.berisikoCount > 0) {
    return {
      Icon: TriangleAlert,
      color: getStatusStyle("Pra Stunting").text,
      text: `${stats.berisikoCount} anak berisiko stunting, perlu dipantau`,
    }
  }
  if (stats.belumDiperiksa > 0) {
    return {
      Icon: ClipboardList,
      color: "#173753",
      text: `${stats.belumDiperiksa} pasien belum diperiksa bulan ini`,
    }
  }
  return {
    Icon: CircleCheck,
    color: getStatusStyle("Aman").text,
    text: "Semua anak dan bumil dalam kondisi normal bulan ini",
  }
}

function formatTime(d: Date) {
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function useTime() {
  const [time, setTime] = useState(() => formatTime(new Date()))
  useEffect(() => {
    const id = setInterval(() => setTime(formatTime(new Date())), 60_000)
    return () => clearInterval(id)
  }, [])
  return time
}

export function Topbar({
  alert,
  alertStats,
  searchValue,
  onSearchChange,
}: {
  /** Full custom override for the alert slot (e.g. map-context copy). Takes precedence over alertStats. */
  alert?: React.ReactNode
  /** Counts to derive a priority-ranked alert (stunting > berisiko > belum diperiksa > semua aman). null while loading. */
  alertStats?: TopbarAlertStats | null
  searchValue?: string
  onSearchChange?: (value: string) => void
}) {
  const time = useTime()
  const resolved = alert === undefined && alertStats ? resolveAlert(alertStats) : null

  return (
    <div className="flex items-center gap-3 px-4 pt-4 pb-2 z-10">
      <div className="relative w-[291px] flex-none">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#173753] z-10" />
        <Input
          className="pl-8 h-8 text-xs text-[#173753] placeholder:text-[#BBBBBB] bg-white rounded-[50px] border-none focus-visible:ring-1 focus-visible:ring-gray-200"
          placeholder="Search"
          value={searchValue}
          onChange={onSearchChange ? (e) => onSearchChange(e.target.value) : undefined}
        />
      </div>
      <div className="flex-1 flex items-center gap-2 px-4 h-8 bg-white rounded-[50px]">
        {resolved ? (
          <>
            <resolved.Icon className="w-3.5 h-3.5 flex-none" style={{ color: resolved.color }} />
            <span className="text-xs text-[#173753] truncate font-medium">{resolved.text}</span>
          </>
        ) : alert !== undefined ? (
          <>
            <TriangleAlert className="w-3.5 h-3.5 text-[#E53935] flex-none" />
            {alert}
          </>
        ) : (
          <span className="text-xs text-[#173753] truncate font-medium">Memuat...</span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-none">
        <div className="flex items-center gap-2 px-4 h-8 text-xs text-[#173753] bg-white rounded-[50px]">
          <Clock className="w-3.5 h-3.5" />
          <span className="tabular-nums">{time || "—"}</span>
        </div>
        <NotificationBell />
        <Button
          variant="ghost" size="sm"
          className="gap-1.5 text-xs h-8 px-4 bg-white rounded-[50px] text-[#173753] hover:bg-white/80"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="w-3.5 h-3.5" />
          Log Out
        </Button>
      </div>
    </div>
  )
}
