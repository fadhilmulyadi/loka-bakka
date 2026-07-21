"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { X, Loader2, Check } from "lucide-react"
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { startPregnancy } from "@/lib/actions/pregnancy"
import { calculateIMT, getIMTCategory } from "@/lib/growth-standards/imt-calc"
import { calculateHPL, MONTHS_ID } from "@/lib/pregnancy-utils"
import { FieldLabel, StyledInput, SectionCard } from "@/components/kader/tambah-pasien-modal"

const ACCENT = "#52A9E3"

const IMT_LABEL: Record<string, string> = {
  underweight: "Kurang",
  normal: "Normal",
  overweight: "Lebih",
  obese: "Obesitas",
}

interface CatatKehamilanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  onLangsungPeriksa: () => void
  /** True kalau ibu sudah berstatus Ibu Hamil tapi data awal kehamilannya belum pernah dicatat. */
  alreadyHamil?: boolean
  ibu: {
    id: string
    nama: string
    username: string
    posyandu: string
    anakCount: number
  }
}

export function CatatKehamilanModal({ open, onOpenChange, onSaved, onLangsungPeriksa, alreadyHamil, ibu }: CatatKehamilanModalProps) {
  const [hpht, setHpht] = useState("")
  const [bbPrepregnancyKg, setBbPrepregnancyKg] = useState("")
  const [heightCm, setHeightCm] = useState("")
  const [jumlahJanin, setJumlahJanin] = useState(1)
  const [langsungPeriksa, setLangsungPeriksa] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setHpht("")
        setBbPrepregnancyKg("")
        setHeightCm("")
        setJumlahJanin(1)
        setLangsungPeriksa(true)
        setError(null)
        setSaving(false)
      }, 300)
    }
  }, [open])

  const hphtDate = hpht ? new Date(hpht) : null
  const diffDays = hphtDate ? Math.floor((new Date().getTime() - hphtDate.getTime()) / 86_400_000) : null
  const weeks = diffDays != null && diffDays >= 0 ? Math.floor(diffDays / 7) : null
  const days = diffDays != null && diffDays >= 0 ? diffDays % 7 : null
  const trimester = weeks != null ? (weeks <= 13 ? 1 : weeks <= 27 ? 2 : 3) : null
  const hpl = hphtDate && diffDays != null && diffDays >= 0 ? calculateHPL(hphtDate) : null
  const hplStr = hpl ? `${hpl.getDate()} ${MONTHS_ID[hpl.getMonth()]} ${hpl.getFullYear()}` : null

  const bbNum = parseFloat(bbPrepregnancyKg.replace(",", "."))
  const tbNum = parseFloat(heightCm.replace(",", "."))
  const imt = !isNaN(bbNum) && !isNaN(tbNum) && tbNum > 0 ? calculateIMT(bbNum, tbNum) : null
  const imtCategory = imt != null ? getIMTCategory(imt) : null

  const valid = weeks != null && imt != null

  const handleSubmit = async () => {
    if (!valid || !hphtDate) return
    setSaving(true)
    setError(null)
    try {
      await startPregnancy({
        ibuId: ibu.id,
        hpht: hphtDate,
        bbPrepregnancyKg: bbNum,
        heightCm: tbNum,
        jumlahJanin,
      })
      onOpenChange(false)
      if (langsungPeriksa) {
        onLangsungPeriksa()
      } else {
        onSaved()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan")
      setSaving(false)
    }
  }

  const initial = ibu.nama.trim()[0]?.toUpperCase() ?? "?"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-[rgba(20,48,74,0.45)]" />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[600px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-48px)] flex flex-col rounded-[18px] bg-white shadow-[0_20px_60px_rgba(20,48,74,0.3)] outline-none">
          {/* ── Header ── */}
          <div className="pt-5 px-[26px] pb-1.5 flex items-start justify-between gap-3 flex-shrink-0">
            <div className="min-w-0">
              <DialogTitle className="text-[17px] font-semibold text-[#173753] leading-tight">
                {alreadyHamil ? "Lengkapi Data Kehamilan" : "Catat Kehamilan"}
              </DialogTitle>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {alreadyHamil
                  ? "Data awal ini diperlukan sebelum pemeriksaan bisa dicatat."
                  : "Status ibu akan otomatis diperbarui menjadi Ibu Hamil."}
              </p>
            </div>
            <DialogClose className="h-7 w-7 rounded-full flex items-center justify-center bg-[#EAF0F7] hover:bg-gray-200 text-[#5B7A96] transition-colors flex-shrink-0">
              <X className="w-3.5 h-3.5" strokeWidth={2.5} />
            </DialogClose>
          </div>

          {/* ── Body ── */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="px-[26px] py-3.5 flex flex-col gap-3.5">
            {/* ibu terkunci */}
            <div className="flex items-center gap-3 bg-[#F8FAFD] border border-[#ECF1F7] rounded-xl px-3.5 py-2.5">
              <div className="h-9 w-9 rounded-full bg-[#EAF0F7] flex items-center justify-center text-[12.5px] font-extrabold text-[#5B7A96] flex-shrink-0">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-[#173753] truncate">{ibu.nama}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  Akun <span className="font-mono text-[#3D5A75]">{ibu.username}</span> · {ibu.posyandu} · {ibu.anakCount} anak terdaftar
                </p>
              </div>
              <span className="ml-auto flex-shrink-0 inline-flex items-center gap-1.5 bg-[#F1F5F9] text-[#5B7A96] rounded-full px-2.5 py-1 text-[11px] font-bold">
                Ibu
              </span>
            </div>

            <div>
              <FieldLabel label="HPHT (Hari Pertama Haid Terakhir)" required />
              <StyledInput value={hpht} onChange={setHpht} type="date" />
            </div>

            <SectionCard title="Kondisi Awal Kehamilan">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel label="Berat Badan Sebelum Hamil (kg)" required />
                  <StyledInput value={bbPrepregnancyKg} onChange={setBbPrepregnancyKg} type="number" placeholder="mis. 54" />
                </div>
                <div>
                  <FieldLabel label="Tinggi Badan (cm)" required />
                  <StyledInput value={heightCm} onChange={setHeightCm} type="number" placeholder="mis. 156" />
                </div>
              </div>
              <div>
                <FieldLabel label="Jumlah Janin" />
                <div className="flex gap-2">
                  {[1, 2].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setJumlahJanin(n)}
                      className={`flex-1 rounded-[12px] border px-3 py-2 text-[12px] font-semibold transition-colors ${
                        jumlahJanin === n
                          ? "border-[#1178D4] bg-[#EAF3FC] text-[#1178D4]"
                          : "border-[#DCE6EF] bg-white text-[#697079]"
                      }`}
                    >
                      {n === 1 ? "Tunggal" : "Ganda (kembar)"}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Digunakan untuk memantau IMT dan kenaikan berat badan. Tinggi badan cukup diisi satu kali.
              </p>
            </SectionCard>

            {/* hasil hitung otomatis */}
            <div className="rounded-[14px] border border-[#E5DDF7] bg-[#F8F6FD] px-4 py-3.5">
              <p className="text-[10.5px] font-bold uppercase tracking-wider mb-2" style={{ color: "#8A76C9" }}>
                Dihitung Otomatis dari HPHT
              </p>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground">Usia kandungan</p>
                  <p className="text-[15px] font-extrabold text-[#173753] mt-0.5">
                    {weeks != null ? `${weeks} mgg ${days} hr` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground">Trimester</p>
                  <p className="text-[15px] font-extrabold text-[#173753] mt-0.5">{trimester ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground">HPL</p>
                  <p className="text-[15px] font-extrabold text-[#173753] mt-0.5">{hplStr ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground">IMT awal</p>
                  <p className="text-[15px] font-extrabold text-[#173753] mt-0.5">
                    {imt != null ? (
                      <>
                        {imt.toFixed(1).replace(".", ",")}
                        <span className={cn(
                          "inline-flex items-center text-[9.5px] font-bold rounded-full px-2 py-0.5 ml-1.5 align-middle",
                          {
                            underweight: "bg-[#FFF8ED] text-[#EF9F27]",
                            normal: "bg-[#EBF5FF] text-[#378ADD]",
                            overweight: "bg-[#FFF8ED] text-[#EF9F27]",
                            obese: "bg-[#FEF2F2] text-[#E24B4A]",
                          }[imtCategory!] || "bg-gray-100 text-gray-700"
                        )}>
                          {IMT_LABEL[imtCategory!]}
                        </span>
                      </>
                    ) : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* langsung periksa */}
            <button
              type="button"
              onClick={() => setLangsungPeriksa(!langsungPeriksa)}
              className="flex items-center gap-2.5 bg-[#F4F8FD] rounded-[10px] px-3 py-2.5 text-left"
            >
              <span
                className={cn(
                  "h-[18px] w-[18px] rounded-[5px] flex items-center justify-center flex-shrink-0 transition-colors",
                  langsungPeriksa ? "bg-[#2E7CE4]" : "bg-white border border-gray-300"
                )}
              >
                {langsungPeriksa && <Check className="w-3 h-3 text-white" strokeWidth={3.5} />}
              </span>
              <span className="text-[12px] font-semibold text-[#2B4A66] leading-snug">
                Lanjutkan ke pengisian data pemeriksaan (BB, LILA, Hb) setelah data ini disimpan.
              </span>
            </button>

            {error && (
              <p className="text-[12px] text-red-600 font-medium text-center bg-red-50 rounded-xl py-2 px-3">
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
              style={{ background: valid && !saving ? `linear-gradient(to right, ${ACCENT}, #93D1F7)` : "#9CA3AF" }}
            >
              {saving ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan…</>
              ) : langsungPeriksa ? (
                <>Simpan &amp; Lanjutkan</>
              ) : (
                <>Simpan</>
              )}
            </button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
