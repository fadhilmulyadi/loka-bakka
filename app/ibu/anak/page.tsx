"use client"

import { useState, useEffect } from "react"
import { Baby } from "lucide-react"
import { cn } from "@/lib/utils"
import { getIbuAnaks } from "@/lib/actions/ibu"

type AnakItem = {
  id: string
  nama: string
  jenisKelamin: "L" | "P"
  usia: string
  status: string | null
  bb: number | null
  tanggalPengukuran: Date | null
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    Normal: "bg-green-100 text-green-700",
    "Stunting Berat": "bg-red-100 text-red-700",
    "Risiko Stunting": "bg-amber-100 text-amber-700",
    "Gizi Kurang": "bg-purple-100 text-purple-700",
  }
  return map[status] ?? "bg-gray-100 text-gray-600"
}

const MONTHS_ID = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"]

function formatDate(date: Date) {
  const d = new Date(date)
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`
}

export default function IbuAnakPage() {
  const [anaks, setAnaks] = useState<AnakItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getIbuAnaks()
      .then(setAnaks)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <h1 className="text-xl font-semibold text-[#173753]">Anak Saya</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Data pertumbuhan anak terdaftar</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#52A9E3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : anaks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[#EBF2F8] flex items-center justify-center mb-4">
              <Baby className="w-8 h-8 text-[#52A9E3]" />
            </div>
            <p className="text-sm font-semibold text-[#173753]">Belum ada anak terdaftar</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
              Hubungi kader posyandu untuk mendaftarkan anak Anda.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {anaks.map((anak) => (
              <div
                key={anak.id}
                className="bg-white rounded-2xl p-4 shadow-[2px_2px_8px_rgba(0,0,0,0.06)] flex items-center gap-3"
              >
                <div
                  className="h-12 w-12 rounded-2xl flex items-center justify-center text-base font-bold text-white flex-none"
                  style={{ background: anak.jenisKelamin === "L" ? "linear-gradient(135deg,#378ADD,#93D1F7)" : "linear-gradient(135deg,#E879A0,#F9A8D4)" }}
                >
                  {anak.nama.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#173753] truncate">{anak.nama}</p>
                  <p className="text-xs text-muted-foreground">
                    {anak.usia} · {anak.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}
                  </p>
                  {anak.bb !== null && (
                    <p className="text-xs text-muted-foreground">{anak.bb} kg</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-none">
                  {anak.status ? (
                    <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium", statusBadge(anak.status))}>
                      {anak.status}
                    </span>
                  ) : (
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">
                      Belum diukur
                    </span>
                  )}
                  {anak.tanggalPengukuran && (
                    <p className="text-[10px] text-muted-foreground">{formatDate(anak.tanggalPengukuran)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
