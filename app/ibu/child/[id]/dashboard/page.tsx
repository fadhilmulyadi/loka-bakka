"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { getIbuAnakDetail } from "@/lib/actions/ibu"

type AnakDetail = NonNullable<Awaited<ReturnType<typeof getIbuAnakDetail>>>

function statusBadge(status: string) {
  const map: Record<string, string> = {
    Normal: "bg-green-100 text-green-700",
    "Stunting Berat": "bg-red-100 text-red-700",
    "Risiko Stunting": "bg-amber-100 text-amber-700",
    "Gizi Kurang": "bg-purple-100 text-purple-700",
  }
  return map[status] ?? "bg-gray-100 text-gray-600"
}

export default function ChildDashboardPage() {
  const params = useParams()
  const id = params?.id as string
  const [anak, setAnak] = useState<AnakDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setAnak(null)
    setError(false)
    setLoading(true)
    getIbuAnakDetail(id)
      .then((data) => { if (data) setAnak(data) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#52A9E3] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error || !anak) return (
    <div className="flex-1 flex items-center justify-center px-5">
      <p className="text-sm text-muted-foreground text-center">
        {error ? "Terjadi kesalahan. Silakan coba lagi." : "Data anak tidak ditemukan."}
      </p>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="px-5 pt-5 pb-6 text-white"
        style={{ background: "linear-gradient(135deg, #1178D4, #52A9E3)" }}
      >
        <p className="text-xs font-medium text-white/70 mb-1">Memantau</p>
        <div className="flex items-center gap-3">
          <div
            className="h-12 w-12 rounded-2xl flex items-center justify-center text-base font-bold text-white flex-none"
            style={{ background: "rgba(255,255,255,0.25)" }}
          >
            {anak.nama.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold">{anak.nama}</h1>
            <p className="text-xs text-white/80">
              {anak.usia} · {anak.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24 pt-4 space-y-3">
        {/* Status Gizi */}
        <div className="bg-white rounded-2xl p-4 shadow-[2px_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-3">
            Status Gizi Terakhir
          </p>
          {anak.latest ? (
            <>
              <span className={cn(
                "inline-block text-sm px-3 py-1 rounded-full font-medium mb-3",
                statusBadge(anak.latest.status)
              )}>
                {anak.latest.status}
              </span>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Berat Badan", value: `${anak.latest.bb.toFixed(1)} kg` },
                  { label: "Tinggi Badan", value: `${anak.latest.tb.toFixed(1)} cm` },
                  { label: "Z-Score TB/U", value: `${anak.latest.zScore} SD` },
                  { label: "Tanggal Ukur", value: anak.latest.tanggal },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      {item.label}
                    </p>
                    <p className="text-sm font-semibold text-[#173753]">{item.value}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada data pengukuran.</p>
          )}
        </div>

        {/* Info Anak */}
        <div className="bg-white rounded-2xl p-4 shadow-[2px_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-3">
            Info Anak
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Tanggal Lahir", value: anak.tanggalLahir },
              { label: "Anak Ke-", value: anak.anakKe },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {item.label}
                </p>
                <p className="text-sm font-semibold text-[#173753]">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
