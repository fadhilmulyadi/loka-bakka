"use client"

import { useEffect, useState } from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { savePengukuran } from "@/lib/actions/kader"
import { calcHeightZScore, stuntingLabel } from "@/lib/growth-standards/stunting-calc"
import { StatusBadge } from "@/components/status-badge"

const ACCENT = "#52A9E3"

function MetricCard({
  label,
  value,
  unit,
  editable,
  onChange,
}: {
  label: string
  value: string
  unit: string
  editable: boolean
  onChange: (v: string) => void
}) {
  return (
    <div className="rounded-[14px] border border-gray-200 py-4 px-[18px]">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
      {editable ? (
        <div className="flex items-baseline gap-1 mt-1.5">
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0.0"
            className="w-full text-[20px] font-bold text-[#173753] outline-none bg-transparent tabular-nums"
          />
          <span className="text-[12px] text-muted-foreground flex-shrink-0">{unit}</span>
        </div>
      ) : (
        <p className={cn("text-[20px] font-bold mt-1.5 tabular-nums", value ? "text-[#173753]" : "text-gray-300")}>
          {value ? `${value.replace(".", ",")} ${unit}` : `0,0 ${unit}`}
        </p>
      )}
    </div>
  )
}

interface CatatKunjunganModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  child: {
    id: string
    name: string
    gender: string
    ageMo: number
  }
  onSaved: () => void
}

export function CatatKunjunganModal({ open, onOpenChange, child, onSaved }: CatatKunjunganModalProps) {
  const [tab, setTab] = useState<"alat" | "manual">("alat")
  const [bb, setBb] = useState("")
  const [tb, setTb] = useState("")
  const [saving, setSaving] = useState(false)

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [deviceStatus, setDeviceStatus] = useState<"terhubung" | "terputus">("terputus")
  const [hasilSelesai, setHasilSelesai] = useState(false)
  const [kategoriHasil, setKategoriHasil] = useState("")
  const [teksEdukasi, setTeksEdukasi] = useState("")

  const startSession = async () => {
    setBb("")
    setTb("")
    setHasilSelesai(false)
    setKategoriHasil("")
    setTeksEdukasi("")
    setSessionId(null)

    try {
      const res = await fetch("/api/pengukuran/mulai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: "esp32-01", kategori: "anak", anakId: child.id })
      })
      const data = await res.json()
      if (data.success) {
        setSessionId(data.sessionId)
      }
    } catch (err) {
      console.error("Failed to start session:", err)
    }
  }

  // Poll device connection status
  useEffect(() => {
    if (!open) return
    const pollDevice = async () => {
      try {
        const res = await fetch("/api/device/esp32-01/status")
        const data = await res.json()
        if (data.success) {
          setDeviceStatus(data.status)
        }
      } catch (err) {}
    }
    pollDevice()
    const intv = setInterval(pollDevice, 5000)
    return () => clearInterval(intv)
  }, [open])

  // Poll session data
  useEffect(() => {
    if (!open || tab !== "alat" || !sessionId) return

    const pollSession = async () => {
      try {
        const res = await fetch(`/api/pengukuran/${sessionId}/status`)
        const data = await res.json()
        if (data.success && data.data) {
          const s = data.data
          if (s.statusHasil === "selesai") {
            setBb(s.nilaiBerat?.toString() || "")
            setTb(s.nilaiTinggi?.toString() || "")
            setKategoriHasil(s.kategoriHasil || "")
            setTeksEdukasi(s.teksEdukasi || "")
            setHasilSelesai(true)
          }
        }
      } catch (err) {}
    }

    const intv = setInterval(pollSession, 1500)
    return () => clearInterval(intv)
  }, [open, tab, sessionId])

  useEffect(() => {
    if (!open) {
      setTab("alat")
      setBb("")
      setTb("")
      setSessionId(null)
      setHasilSelesai(false)
      setKategoriHasil("")
      setTeksEdukasi("")
    }
  }, [open])

  const sex = child.gender === "Laki-laki" ? "L" : "P"
  const bbNum = bb ? parseFloat(bb) : null
  const tbNum = tb ? parseFloat(tb) : null

  const ready = tab === "manual"
    ? bbNum != null && tbNum != null
    : hasilSelesai

  const zTBU = tab === "manual" && ready && tbNum != null ? calcHeightZScore(tbNum, child.ageMo, sex) : null

  const handleSubmit = async () => {
    if (!ready || bbNum == null || tbNum == null) return
    setSaving(true)
    try {
      await savePengukuran({ anakId: child.id, beratBadan: bbNum, tinggiBadan: tbNum })
      onSaved()
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      alert("Gagal menyimpan data")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-[rgba(20,48,74,0.45)]" />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[600px] max-w-[calc(100vw-80px)] max-h-[calc(100vh-80px)] overflow-y-auto rounded-[18px] bg-white shadow-[0_20px_60px_rgba(20,48,74,0.3)] outline-none">
          <div className="pt-5 px-[26px] pb-0 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-[17px] font-semibold text-[#173753] leading-tight">
                Catat Kunjungan
              </DialogTitle>
              <DialogDescription className="text-[12px] text-muted-foreground mt-0.5">
                {child.name} · {sex} · {child.ageMo} bulan
              </DialogDescription>
            </div>
            <DialogClose className="h-[30px] w-[30px] rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-[#173753] transition-colors flex-shrink-0">
              <X className="w-4 h-4" />
            </DialogClose>
          </div>

          <div className="mx-[26px] my-4 flex p-1 gap-1 rounded-xl bg-[#F1F5F9]">
            {(["alat", "manual"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 py-[9px] rounded-[9px] text-[12px] font-semibold transition-colors",
                  tab === t ? "bg-white text-[#173753] shadow-sm" : "text-muted-foreground hover:text-[#173753]"
                )}
              >
                {t === "alat" ? "Otomatis" : "Manual"}
              </button>
            ))}
          </div>

          <div className="px-[26px] pb-[22px] flex flex-col gap-[14px]">
            {tab === "alat" && (
              <div className={cn("flex items-center justify-between rounded-xl px-4 py-[11px]", deviceStatus === "terhubung" ? "bg-[#E6F4EA]" : "bg-gray-100")}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn("h-2 w-2 rounded-full flex-shrink-0", deviceStatus === "terhubung" ? "bg-[#1E8E3E]" : "bg-gray-400")} />
                  <span className={cn("text-[13px] font-medium truncate", deviceStatus === "terhubung" ? "text-[#173753]" : "text-gray-500")}>
                    {deviceStatus === "terhubung" ? "Terhubung" : "Alat terputus"}
                  </span>
                </div>
              </div>
            )}

            {tab === "alat" && !sessionId && (
              <button
                type="button"
                onClick={startSession}
                className="h-11 rounded-xl text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: `linear-gradient(to right, ${ACCENT}, #93D1F7)` }}
              >
                Mulai Pengukuran dengan Alat
              </button>
            )}

            {tab === "alat" && sessionId && !hasilSelesai && (
              <div className="rounded-xl bg-[#F7FBFF] px-4 py-3 text-[13px] text-muted-foreground text-center">
                Menunggu alat menyelesaikan pengukuran…
              </div>
            )}

            {(tab === "manual" || hasilSelesai) && (
              <div className="grid grid-cols-2 gap-[14px]">
                <MetricCard label="BERAT BADAN" value={bb} unit="kg" editable={tab === "manual"} onChange={setBb} />
                <MetricCard label="TINGGI BADAN" value={tb} unit="cm" editable={tab === "manual"} onChange={setTb} />
              </div>
            )}

            {tab === "manual" && ready && zTBU && (
              <div className="rounded-xl bg-[#F7FBFF] px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-medium text-muted-foreground">Hasil skrining otomatis</p>
                  <span className="text-[11px] font-semibold text-[#173753] bg-white px-2 py-0.5 rounded-full flex-shrink-0">TB/U</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[15px] font-bold text-[#173753] tabular-nums">
                    {zTBU.zScore.toFixed(1).replace(".", ",")} SD
                  </span>
                  <StatusBadge status={stuntingLabel[zTBU.status]} />
                </div>
              </div>
            )}

            {tab === "alat" && hasilSelesai && (
              <div className="rounded-xl bg-[#F7FBFF] px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-medium text-muted-foreground">Hasil dari alat</p>
                  <span className="text-[11px] font-semibold text-[#173753] bg-white px-2 py-0.5 rounded-full flex-shrink-0">TB/U</span>
                </div>
                <div className="mt-2">
                  <StatusBadge status={kategoriHasil} />
                </div>
                <p className="text-[12px] text-muted-foreground mt-2 leading-relaxed">{teksEdukasi}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-[10px] px-[26px] py-[15px] border-t border-gray-100">
            {tab === "alat" && sessionId && (
              <button
                type="button"
                onClick={startSession}
                className="text-[13px] font-medium text-[#173753] hover:text-[#52A9E3] transition-colors"
              >
                Ulangi
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 px-4 rounded-full text-[13px] font-medium text-muted-foreground hover:text-[#173753] transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!ready || saving}
              onClick={handleSubmit}
              className={cn(
                "h-9 px-5 rounded-full text-[13px] font-semibold text-white flex items-center gap-1.5 transition-opacity",
                (!ready || saving) ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"
              )}
              style={{ background: `linear-gradient(to right, ${ACCENT}, #93D1F7)` }}
            >
              {saving ? "Menyimpan…" : "Simpan Pemeriksaan"}
            </button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
