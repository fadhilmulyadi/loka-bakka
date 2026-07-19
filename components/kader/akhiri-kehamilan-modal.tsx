"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { X, Loader2, Check, ChevronRight } from "lucide-react"
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { endPregnancy } from "@/lib/actions/pregnancy"
import { FieldLabel, StyledInput } from "@/components/kader/tambah-pasien-modal"

function OptionCard({
  title,
  desc,
  checked,
  onToggle,
  children
}: {
  title: string
  desc: string
  checked: boolean
  onToggle: () => void
  children?: React.ReactNode
}) {
  return (
    <div className={cn(
      "w-full rounded-xl border transition-all overflow-hidden",
      checked ? "border-[#6A48C4] bg-[#F0EBFB]" : "border-gray-200 bg-white hover:border-gray-300"
    )}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start gap-3 px-4 py-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <p className={cn("text-[13px] font-bold", checked ? "text-[#173753]" : "text-gray-500")}>{title}</p>
          <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-snug">{desc}</p>
        </div>
        <div
          className={cn(
            "h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border-2 transition-all",
            checked ? "bg-[#6A48C4] border-[#6A48C4]" : "border-gray-300"
          )}
        >
          {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </div>
      </button>
      {checked && children && (
        <div className="px-4 pb-4 pt-1 flex flex-col gap-3">
          {children}
        </div>
      )}
    </div>
  )
}

interface AkhiriKehamilanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
  onDaftarkanBayi?: (tglLahir: string) => void
  ibu: {
    id: string
    nama: string
    pregnancyInfo: string // e.g., "kehamilan ke-3 · 38 minggu"
  }
}

export function AkhiriKehamilanModal({ open, onOpenChange, onSaved, onDaftarkanBayi, ibu }: AkhiriKehamilanModalProps) {
  const router = useRouter()
  const [outcome, setOutcome] = useState<"melahirkan" | "gugur" | "">("melahirkan")
  const [tglLahir, setTglLahir] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setOutcome("melahirkan")
        setTglLahir("")
        setError(null)
        setSaving(false)
      }, 300)
    }
  }, [open])

  const valid = outcome === "gugur" || (outcome === "melahirkan" && tglLahir !== "")

  const handleSubmit = async () => {
    if (!valid) return
    setSaving(true)
    setError(null)
    try {
      await endPregnancy(ibu.id, outcome)
      onOpenChange(false)
      if (onSaved) onSaved()
      if (outcome === "melahirkan" && onDaftarkanBayi) {
        onDaftarkanBayi(tglLahir)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan")
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-[rgba(20,48,74,0.45)]" />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[540px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-48px)] flex flex-col rounded-[18px] bg-white shadow-[0_20px_60px_rgba(20,48,74,0.3)] outline-none">
          {/* ── Header ── */}
          <div className="pt-5 px-[26px] pb-1.5 flex items-start justify-between gap-3 flex-shrink-0">
            <div className="min-w-0">
              <DialogTitle className="text-[17px] font-semibold text-[#173753] leading-tight">
                Akhiri Kehamilan
              </DialogTitle>
              <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
                <span className="font-semibold text-[#173753]">{ibu.nama}</span> · {ibu.pregnancyInfo}
              </p>
            </div>
            <DialogClose className="h-7 w-7 rounded-full flex items-center justify-center bg-[#EAF0F7] hover:bg-gray-200 text-[#5B7A96] transition-colors flex-shrink-0">
              <X className="w-3.5 h-3.5" strokeWidth={2.5} />
            </DialogClose>
          </div>

          {/* ── Body ── */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="px-[26px] py-4 flex flex-col gap-3">
              <OptionCard
                title="Melahirkan"
                desc="Lanjut mendaftarkan bayi sebagai pasien baru."
                checked={outcome === "melahirkan"}
                onToggle={() => setOutcome("melahirkan")}
              >
                <div className="bg-white p-3.5 rounded-lg border border-[#E5DDF7] shadow-sm">
                  <FieldLabel label="Tanggal Lahir Bayi" required />
                  <StyledInput type="date" value={tglLahir} onChange={setTglLahir} />
                </div>
              </OptionCard>

              <OptionCard
                title="Kehamilan tidak berlanjut"
                desc="Keguguran atau kondisi medis lainnya. Hanya memperbarui riwayat ibu."
                checked={outcome === "gugur"}
                onToggle={() => setOutcome("gugur")}
              />

              {error && (
                <p className="text-[12px] text-red-600 font-medium text-center bg-red-50 rounded-xl py-2 px-3 mt-1">
                  {error}
                </p>
              )}
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex-shrink-0 flex items-center justify-between px-[26px] py-[15px] border-t border-gray-100">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 px-4 rounded-full text-[13px] font-medium text-muted-foreground hover:text-[#173753] transition-colors"
            >
              Batal
            </button>

            <button
              type="button"
              disabled={!valid || saving}
              onClick={handleSubmit}
              className={cn(
                "h-9 px-5 rounded-full text-[13px] font-semibold text-white flex items-center gap-1.5 transition-all",
                valid && !saving ? "hover:opacity-90" : "opacity-40 cursor-not-allowed"
              )}
              style={{ background: valid && !saving ? "#6A48C4" : "#9CA3AF" }}
            >
              {saving ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Memproses…</>
              ) : outcome === "melahirkan" ? (
                <>Lanjut Daftarkan Bayi <ChevronRight className="w-4 h-4" /></>
              ) : (
                <>Simpan Perubahan <Check className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
