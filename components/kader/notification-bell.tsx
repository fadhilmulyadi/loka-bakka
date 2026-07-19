"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell, TriangleAlert, Clock, CheckCircle, ChevronRight } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { getNotifications, markAllNotificationsRead } from "@/lib/actions/notifikasi"
import { cn } from "@/lib/utils"

type Notif = Awaited<ReturnType<typeof getNotifications>>[number]
type FilterTab = "semua" | "perlu-tindakan" | "pengingat"

const LEVEL_ICON = { merah: TriangleAlert, kuning: Clock } as const
const LEVEL_ICON_BG = { merah: "bg-[#DC2626]", kuning: "bg-[#D99100]" } as const

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString()
}

function formatWaktu(date: Date) {
  const now = new Date()
  if (isSameDay(date, now)) {
    return `${String(date.getHours()).padStart(2, "0")}.${String(date.getMinutes()).padStart(2, "0")}`
  }
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long" }).format(date)
}

function formatDateHeader(date: Date) {
  const now = new Date()
  if (isSameDay(date, now)) return "Hari ini"
  return new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long" }).format(date)
}

export function NotificationBell() {
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [tab, setTab] = useState<FilterTab>("semua")

  useEffect(() => {
    getNotifications().then(setNotifs)
  }, [])

  const unreadCount = notifs.filter((n) => !n.isRead).length
  const merahCount = notifs.filter((n) => n.level === "merah").length
  const kuningCount = notifs.filter((n) => n.level === "kuning").length

  const filtered = notifs.filter((n) => {
    if (tab === "perlu-tindakan") return n.level === "merah"
    if (tab === "pengingat") return n.level === "kuning"
    return true
  })

  const handleMarkAllRead = async () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })))
    await markAllNotificationsRead()
  }

  return (
    <Popover>
      <PopoverTrigger className="relative h-8 w-8 flex items-center justify-center bg-white rounded-full text-[#173753] hover:bg-white/80 transition-colors cursor-pointer">
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#DC2626] border-2 border-white text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 rounded-2xl border-none shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden" align="end">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <p className="text-[15px] font-mediumtext-[#173753]">Notifikasi</p>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="text-[12px] font-semibold text-[#52A9E3] hover:underline cursor-pointer">
              Tandai semua dibaca
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex p-1 gap-1 mx-3 mt-3 rounded-xl bg-[#F1F5F9]">
          {(
            [
              ["semua", `Semua · ${notifs.length}`],
              ["perlu-tindakan", `Perlu Tindakan · ${merahCount}`],
              ["pengingat", `Pengingat · ${kuningCount}`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex-1 py-[7px] rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer",
                tab === key ? "bg-white text-[#173753] shadow-sm" : "text-muted-foreground hover:text-[#173753]"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="max-h-96 overflow-y-auto mt-2 pb-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center gap-2">
              <div className="w-9 h-9 rounded-full bg-[#E6F4EA] flex items-center justify-center">
                <CheckCircle className="w-[18px] h-[18px] text-[#1E8E3E]" />
              </div>
              <p className="text-[12px] text-muted-foreground font-medium">Tidak ada notifikasi</p>
            </div>
          ) : (
            filtered.map((n, i) => {
              const Icon = LEVEL_ICON[n.level as keyof typeof LEVEL_ICON]
              const createdAt = new Date(n.createdAt)
              const prevCreatedAt = i > 0 ? new Date(filtered[i - 1].createdAt) : null
              const showDateHeader = !prevCreatedAt || !isSameDay(createdAt, prevCreatedAt)

              return (
                <div key={n.id}>
                  {showDateHeader && (
                    <p className={cn("px-4 pb-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider", i === 0 ? "pt-1" : "pt-3")}>
                      {formatDateHeader(createdAt)}
                    </p>
                  )}
                  <Link
                    href={n.actionUrl}
                    className="flex items-start gap-3 px-4 py-2.5 hover:bg-[#F7FBFF] transition-colors"
                  >
                    <div className={cn("shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-0.5", LEVEL_ICON_BG[n.level as keyof typeof LEVEL_ICON_BG])}>
                      <Icon className="w-4 h-4 text-white" strokeWidth={2.3} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-[12.5px] leading-snug", n.isRead ? "font-medium text-[#173753]" : "font-bold text-[#173753]")}>
                          {n.judul}
                        </p>
                        <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums mt-0.5">{formatWaktu(createdAt)}</span>
                      </div>
                      <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-snug">{n.pesan}</p>
                      <span className="inline-flex items-center gap-0.5 mt-1.5 text-[11px] font-semibold text-[#52A9E3]">
                        {n.actionLabel} <ChevronRight className="w-3 h-3" strokeWidth={2.5} />
                      </span>
                    </div>
                    {!n.isRead && <span className="shrink-0 w-[7px] h-[7px] rounded-full bg-[#DC2626] mt-2" />}
                  </Link>
                </div>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
