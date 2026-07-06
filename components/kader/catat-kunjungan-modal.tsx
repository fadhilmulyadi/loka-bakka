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
}: {
  label: string
  value: string
  unit: string
  editable: boolean
  onChange: (v: string) => void
  stateLabel?: string
  stable?: boolean
}) {
  return (
    <div className="rounded-[14px] border border-gray-200 py-4 px-[18px]">
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
            className="w-full text-[20px] font-bold text-[#173753] outline-none bg-transparent tabular-nums"
          />
          <span className="text-[12px] text-muted-foreground flex-shrink-0">{unit}</span>
        </div>
      ) : (
        <p className="text-[20px] font-bold text-[#173753] mt-1.5 tabular-nums">
          {value ? `${value.replace(".", ",")} ${unit}` : "—"}
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
  const [bbState, setBbState] = useState<ReadState>("measuring")
  const [tbState, setTbState] = useState<ReadState>("measuring")
  const [saving, setSaving] = useState(false)

  const runSimulation = () => {
    setBb("")
    setTb("")
    setBbState("measuring")
    setTbState("measuring")
    const t1 = setTimeout(() => {
      setBb((11 + Math.random() * 0.6).toFixed(1))
      setBbState("stable")
    }, 1200)
    const t2 = setTimeout(() => {
      setTb((86.5 + Math.random() * 1.8).toFixed(1))
      setTbState("stable")
    }, 2800)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }

  useEffect(() => {
    if (open && tab === "alat") return runSimulation()
  }, [open, tab])

  useEffect(() => {
    if (!open) {
      setTab("alat")
      setBb("")
      setTb("")
    }
  }, [open])

  const sex = child.gender === "Laki-laki" ? "L" : "P"
  const bbNum = bb ? parseFloat(bb) : null
  const tbNum = tb ? parseFloat(tb) : null

  const ready = tab === "manual"
    ? bbNum != null && tbNum != null
    : bbState === "stable" && tbState === "stable"

  const zTBU = ready && tbNum != null ? calcHeightZScore(tbNum, child.ageMo, sex) : null

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
          {/* Header */}
          <div className="pt-5 px-[26px] pb-0 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-[17px] font-extrabold text-[#173753] leading-tight">
                Pemeriksaan Anak
              </DialogTitle>
              <DialogDescription className="text-[12px] text-muted-foreground mt-0.5">
                {child.name} · {sex} · {child.ageMo} bulan
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
              <div className="flex items-center justify-between rounded-xl bg-[#E6F4EA] px-4 py-[11px]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-[#1E8E3E] flex-shrink-0" />
                  <span className="text-[13px] font-medium text-[#173753] truncate">
                    Terhubung
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-[14px]">
              <MetricCard
                label="BERAT BADAN"
                value={bb}
                unit="kg"
                editable={tab === "manual"}
                onChange={setBb}
                stateLabel={tab === "alat" ? (bbState === "stable" ? "Stabil" : "Mengukur") : undefined}
                stable={bbState === "stable"}
              />
              <MetricCard
                label="TINGGI BADAN"
                value={tb}
                unit="cm"
                editable={tab === "manual"}
                onChange={setTb}
                stateLabel={tab === "alat" ? (tbState === "stable" ? "Stabil" : "Mengukur") : undefined}
                stable={tbState === "stable"}
              />
            </div>

            {ready && zTBU && (
              <div className="rounded-xl bg-[#F7FBFF] px-4 py-3">
                <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Hasil skrining otomatis:</p>
                <div className="flex items-center justify-between text-[12.5px] font-medium text-[#173753]">
                  <span>TB/U</span>
                  <span>{zTBU.zScore.toFixed(1).replace(".", ",")} · {stuntingLabel[zTBU.status]}</span>
                </div>
                <div className="flex items-center justify-between text-[12.5px] font-medium text-[#173753] mt-1">
                  <span>BB/U</span>
                  <span>Normal</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-[10px] px-[26px] py-[15px] border-t border-gray-100">
            {tab === "alat" && (
              <button
                type="button"
                onClick={runSimulation}
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
