"use client"

import { useEffect, useState } from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { X, TriangleAlert } from "lucide-react"
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { savePregnancyVisit } from "@/lib/actions/pregnancy"
import { getWeightGainStatus, weightGainLabel } from "@/lib/growth-standards/imt-calc"
import { StatusBadge } from "@/components/status-badge"
import { FieldLabel, StyledTextarea } from "@/components/kader/tambah-pasien-modal"

const ACCENT = "#52A9E3"

type ReadState = "measuring" | "stable"

function MetricCard({
  label,
  value,
  unit,
  editable,
  onChange,
  stateLabel,
  stable,
  alert,
}: {
  label: string
  value: string
  unit: string
  editable: boolean
  onChange: (v: string) => void
  stateLabel?: string
  stable?: boolean
  alert?: boolean
}) {
  return (
    <div className={cn("rounded-[14px] border py-4 px-[18px]", alert ? "border-[#F4E2BC] bg-[#FFFBF2]" : "border-gray-200")}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
        {stateLabel && (
          <span
            className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap",
              stable ? "bg-[#E6F4EA] text-[#1E8E3E]" : "bg-[#FFF4E5] text-[#B06000]"
            )}
          >
            {stateLabel}
          </span>
        )}
      </div>
      {editable ? (
        <div className="flex items-baseline gap-1 mt-1.5">
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0.0"
            className={cn("w-full text-[20px] font-bold outline-none bg-transparent tabular-nums", alert ? "text-[#8A6100]" : "text-[#173753]")}
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

interface PeriksaKehamilanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ibu: {
    id: string
    nama: string
    gestationalWeeks: number
    trimester: number
    bbPrepregnancyKg: number
    weeklyGainMinKg: number
    weeklyGainMaxKg: number
  }
  onSaved: () => void
}

export function PeriksaKehamilanModal({ open, onOpenChange, ibu, onSaved }: PeriksaKehamilanModalProps) {
  const [tab, setTab] = useState<"alat" | "manual">("alat")
  const [bb, setBb] = useState("")
  const [bbState, setBbState] = useState<ReadState>("measuring")
  const [lila, setLila] = useState("")
  const [hb, setHb] = useState("")
  const [catatan, setCatatan] = useState("")
  const [saving, setSaving] = useState(false)

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [deviceStatus, setDeviceStatus] = useState<"terhubung" | "terputus">("terputus")

  const startSession = async () => {
    setBb("")
    setBbState("measuring")
    setSessionId(null)

    try {
      const res = await fetch("/api/pengukuran/mulai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: "esp32-01" })
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
          if (s.statusBerat === "selesai") {
            setBb(s.nilaiBerat?.toString() || "")
            setBbState("stable")
          }
        }
      } catch (err) {}
    }

    const intv = setInterval(pollSession, 1500)
    return () => clearInterval(intv)
  }, [open, tab, sessionId])

  useEffect(() => {
    if (open && tab === "alat") {
      startSession()
    }
  }, [open, tab])

  useEffect(() => {
    if (!open) {
      setTab("alat")
      setBb("")
      setLila("")
      setHb("")
      setCatatan("")
    }
  }, [open])

  const bbNum = bb ? parseFloat(bb) : null
  const lilaNum = lila ? parseFloat(lila.replace(",", ".")) : null
  const hbNum = hb ? parseFloat(hb.replace(",", ".")) : null

  const bbReady = tab === "manual" ? bbNum != null : bbState === "stable"
  const ready = bbReady && lilaNum != null && hbNum != null

  const weightGainKg = bbNum != null ? bbNum - ibu.bbPrepregnancyKg : null
  const gainStatus = weightGainKg != null
    ? getWeightGainStatus(weightGainKg, ibu.gestationalWeeks, ibu)
    : null

  const lilaLow = lilaNum != null && lilaNum < 23.5
  const hbLow = hbNum != null && hbNum < 11
  const showRiskAlert = lilaLow || hbLow

  const handleSubmit = async () => {
    if (!ready || bbNum == null || lilaNum == null || hbNum == null) return
    setSaving(true)
    try {
      await savePregnancyVisit({
        ibuId: ibu.id,
        currentWeightKg: bbNum,
        lilaCm: lilaNum,
        hbGdl: hbNum,
        catatanKader: catatan.trim() || undefined,
      })
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
          {/* Header */}
          <div className="pt-5 px-[26px] pb-0 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-[17px] font-semibold text-[#173753] leading-tight">
                Pemeriksaan Kehamilan
              </DialogTitle>
              <DialogDescription className="text-[12px] text-muted-foreground mt-0.5">
                {ibu.nama} · {ibu.gestationalWeeks} minggu · Trimester {ibu.trimester}
              </DialogDescription>
            </div>
            <DialogClose className="h-[30px] w-[30px] rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-[#173753] transition-colors flex-shrink-0">
              <X className="w-4 h-4" />
            </DialogClose>
          </div>

          {/* Tab switcher */}
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

          {/* Body */}
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

            <div className="grid grid-cols-3 gap-[14px]">
              <MetricCard
                label="BERAT BADAN"
                value={bb}
                unit="kg"
                editable={tab === "manual"}
                onChange={setBb}
                stateLabel={tab === "alat" ? (bbState === "stable" ? "Selesai" : "Mengukur") : undefined}
                stable={bbState === "stable"}
              />
              <MetricCard
                label="LILA"
                value={lila}
                unit="cm"
                editable
                onChange={setLila}
                alert={lilaLow}
              />
              <MetricCard
                label="HEMOGLOBIN"
                value={hb}
                unit="g/dL"
                editable
                onChange={setHb}
                alert={hbLow}
              />
            </div>

            {weightGainKg != null && gainStatus && (
              <div className="rounded-xl bg-[#F7FBFF] px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-medium text-muted-foreground">Skrining kenaikan berat badan</p>
                  <span className="text-[11px] font-semibold text-[#173753] bg-white px-2 py-0.5 rounded-full flex-shrink-0">BB</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[15px] font-bold text-[#173753] tabular-nums">
                    {weightGainKg >= 0 ? "+" : ""}{weightGainKg.toFixed(1).replace(".", ",")} kg
                  </span>
                  <StatusBadge status={weightGainLabel[gainStatus]} />
                </div>
              </div>
            )}

            {showRiskAlert && (
              <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5 bg-[#FFF7E6] border border-[#F4E2BC]">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#D99100] text-white flex-shrink-0">
                  <TriangleAlert className="w-4 h-4" />
                </div>
                <p className="text-[12px] text-[#8A6100] leading-relaxed">
                  Skrining: Risiko {lilaLow && hbLow ? "KEK + Anemia" : lilaLow ? "KEK" : "Anemia"}. Sistem akan menandai untuk tindak lanjut dan menyarankan rujukan ke Puskesmas. Catatan rujukan bisa ditambahkan sebelum menyimpan.
                </p>
              </div>
            )}

            <div>
              <FieldLabel label="Catatan Kader (opsional)" />
              <StyledTextarea value={catatan} onChange={setCatatan} placeholder="mis. Disarankan rujukan ke Puskesmas, diberikan PMT ibu hamil." rows={2} />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-[10px] px-[26px] py-[15px] border-t border-gray-100">
            {tab === "alat" && (
              <button
                type="button"
                onClick={startSession}
                className="text-[13px] font-medium text-[#173753] hover:text-[#52A9E3] transition-colors"
              >
                Ambil ulang
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
