"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Bell, MessageCircle, AlertTriangle, Flame, CheckCircle } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { markIbuNotificationsRead } from '@/lib/actions/notifikasi'

export interface IbuNotifItem {
  level: 'merah' | 'kuning' | 'info'
  title: string
  message: string
  actionLabel: string
  actionUrl: string
  // hanya notifikasi tersimpan yang punya status baca; item turunan status
  // kesehatan tidak diikutkan supaya titiknya tidak menyala selamanya
  isRead?: boolean
}

const LEVEL_ICON = { merah: Flame, kuning: AlertTriangle, info: MessageCircle } as const
const LEVEL_ICON_BG = { merah: 'bg-[#DC2626]', kuning: 'bg-[#D99100]', info: 'bg-[#1178D4]' } as const

export function IbuNotificationBell({ items }: { items: IbuNotifItem[] }) {
  const [dibaca, setDibaca] = useState(false)
  const adaBaru = !dibaca && items.some(n => n.isRead === false)

  const handleOpenChange = (open: boolean) => {
    if (!open || !adaBaru) return
    setDibaca(true)
    markIbuNotificationsRead().catch(() => setDibaca(false))
  }

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger
        className="shrink-0 w-[42px] h-[42px] rounded-[13px] bg-white border border-[#E4EDE7] flex items-center justify-center text-[#1178D4] relative shadow-[0_3px_8px_-5px_rgba(9,30,66,0.2)] hover:bg-gray-50 transition-colors"
        aria-label="Notifikasi"
      >
        {adaBaru && (
          <span className="absolute top-[9px] right-[11px] w-[7px] h-[7px] rounded-full bg-[#ED5610] border-[1.5px] border-white" />
        )}
        <Bell className="w-[19px] h-[19px]" />
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="end">
        <div className="px-3.5 py-2.5 border-b border-[#E4EDE7]">
          <p className="text-[13px] font-semibold text-[#1F2937]">Notifikasi</p>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center gap-1.5">
              <CheckCircle className="w-5 h-5 text-[#1E9E62]" />
              <p className="text-[12px] text-[#697079]">Tidak ada notifikasi baru</p>
            </div>
          ) : (
            items.map((n, i) => {
              const Icon = LEVEL_ICON[n.level]
              const belumDibaca = n.isRead === false && !dibaca
              return (
                <Link
                  key={i}
                  href={n.actionUrl}
                  className={`flex gap-2.5 px-3.5 py-3 border-b border-[#E4EDE7] last:border-b-0 hover:bg-[#F1F7FE] transition-colors ${belumDibaca ? 'bg-[#F8FBFE]' : ''}`}
                >
                  <div className={`shrink-0 w-7 h-7 rounded-full ${LEVEL_ICON_BG[n.level]} flex items-center justify-center`}>
                    <Icon className="w-3.5 h-3.5 text-white" strokeWidth={2.4} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold text-[#1F2937] flex items-center gap-1.5">
                      {n.title}
                      {belumDibaca && <span className="w-[6px] h-[6px] rounded-full bg-[#ED5610] shrink-0" />}
                    </p>
                    <p className="text-[11.5px] text-[#697079] mt-0.5 leading-snug text-pretty">{n.message}</p>
                    <span className="text-[11px] font-semibold text-[#1178D4] mt-1 inline-block">{n.actionLabel}</span>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
