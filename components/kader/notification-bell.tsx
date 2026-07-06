"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell, CheckCircle } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { getUncheckedChildren } from "@/lib/actions/kader"

type UncheckedChild = Awaited<ReturnType<typeof getUncheckedChildren>>[number]

export function NotificationBell() {
  const [children, setChildren] = useState<UncheckedChild[]>([])

  useEffect(() => {
    getUncheckedChildren().then(setChildren)
  }, [])

  return (
    <Popover>
      <PopoverTrigger className="relative h-8 w-8 flex items-center justify-center bg-white rounded-full shadow-[2px_2px_8px_rgba(0,0,0,0.08)] text-[#173753] hover:bg-white/80 cursor-pointer">
        <Bell className="w-4 h-4" />
        {children.length > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#E53935]" />
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="end">
        <p className="text-xs font-medium text-[#173753] px-2 py-1.5">Anak belum diperiksa bulan ini</p>
        {children.length > 0 ? (
          <div className="space-y-1">
            {children.map((anak) => (
              <Link
                key={anak.id}
                href={`/kader/anak/${anak.id}`}
                className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-[#52A9E3] hover:text-[#F5F7FA] transition"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-none text-white text-[10px] font-semibold"
                  style={{ background: anak.warna }}
                >
                  {anak.nama.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{anak.nama}</p>
                  <p className="text-[11px] opacity-70">{anak.usia}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-4 text-center gap-1.5">
            <CheckCircle className="w-5 h-5 text-teal-500" />
            <p className="text-xs text-muted-foreground">Semua anak sudah diperiksa</p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
