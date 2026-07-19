"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { X, Loader2, ArrowRight } from "lucide-react"
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { createChildForIbu } from "@/lib/actions/kader"
import { FieldLabel, StyledInput, SectionCard } from "@/components/kader/tambah-pasien-modal"

const ACCENT = "#52A9E3"

interface AnakForm {
  nama: string
  jenisKelamin: "L" | "P" | ""
  tanggalLahir: string
  beratLahirKg: string
  panjangLahirCm: string
}

const EMPTY_FORM: AnakForm = {
  nama: "", jenisKelamin: "", tanggalLahir: "", beratLahirKg: "", panjangLahirCm: "",
}

interface TambahAnakModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ibu: {
    id: string
    nama: string
    username: string
    posyandu: string
    anakCount: number
  }
  initialDate?: string
}

export function TambahAnakModal({ open, onOpenChange, ibu, initialDate }: TambahAnakModalProps) {
  const router = useRouter()
  const [form, setForm] = useState<AnakForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && initialDate) {
      setForm(prev => ({ ...prev, tanggalLahir: initialDate }))
    }
    if (!open) {
      setTimeout(() => {
        setForm(EMPTY_FORM)
        setError(null)
        setSaving(false)
      }, 300)
    }
  }, [open, initialDate])

  const set = (k: keyof AnakForm) => (v: string) => setForm({ ...form, [k]: v })

  const valid = form.nama.trim() !== "" && form.jenisKelamin !== "" && form.tanggalLahir !== ""

  const handleSubmit = async () => {
    if (!valid) return
    setSaving(true)
    setError(null)
    try {
      const anakRow = await createChildForIbu({
        ibuId: ibu.id,
        nama: form.nama,
        sex: form.jenisKelamin,
        birth: form.tanggalLahir,
        beratLahirKg: form.beratLahirKg || undefined,
        panjangLahirCm: form.panjangLahirCm || undefined,
      })
      onOpenChange(false)
      router.push(`/kader/anak/${anakRow.id}`)
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
                Tambah Data Anak
              </DialogTitle>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Anak baru didaftarkan di bawah akun ibu yang sudah ada.
              </p>
            </div>
            <DialogClose className="h-7 w-7 rounded-full flex items-center justify-center bg-[#EAF0F7] hover:bg-gray-200 text-[#5B7A96] transition-colors flex-shrink-0">
              <X className="w-3.5 h-3.5" strokeWidth={2.5} />
            </DialogClose>
          </div>

          {/* ── Body ── */}
          <div className="flex-1 min-h-0 overflow-y-auto px-[26px] py-3.5 flex flex-col gap-3.5">
            {/* ibu terkunci */}
            <div className="flex items-center gap-3 bg-[#F8FAFD] border border-[#ECF1F7] rounded-xl px-3.5 py-2.5">
              <div className="h-9 w-9 rounded-full flex items-center justify-center text-[12.5px] font-extrabold flex-shrink-0" style={{ background: "#F0EBFB", color: "#6A48C4" }}>
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

            <SectionCard title="Data Anak">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <FieldLabel label="Nama Lengkap Anak" required />
                  <StyledInput value={form.nama} onChange={set("nama")} placeholder="mis. Citra Ayu" />
                </div>

                <div>
                  <FieldLabel label="Tanggal Lahir" required />
                  <StyledInput value={form.tanggalLahir} onChange={set("tanggalLahir")} type="date" />
                </div>

                <div>
                  <FieldLabel label="Jenis Kelamin" required />
                  <div className="grid grid-cols-2 gap-2">
                    {(["L", "P"] as const).map((jk) => (
                      <button
                        key={jk}
                        type="button"
                        onClick={() => setForm({ ...form, jenisKelamin: jk })}
                        className={cn(
                          "flex items-center justify-center h-9 rounded-lg border text-[13px] font-semibold transition-colors",
                          form.jenisKelamin === jk
                            ? "border-[#52A9E3] bg-[#EBF2F8] text-[#52A9E3]"
                            : "border-gray-200 text-[#173753] hover:border-gray-300"
                        )}
                      >
                        {jk === "L" ? "Laki-laki" : "Perempuan"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <FieldLabel label="Berat Badan (kg)" />
                  <StyledInput value={form.beratLahirKg} onChange={set("beratLahirKg")} type="number" placeholder="0,0" />
                </div>
                <div>
                  <FieldLabel label="Tinggi Badan (cm)" />
                  <StyledInput value={form.panjangLahirCm} onChange={set("panjangLahirCm")} type="number" placeholder="0,0" />
                </div>
              </div>
            </SectionCard>

            {error && (
              <p className="text-[12px] text-red-600 font-medium text-center bg-red-50 rounded-xl py-2 px-3">
                {error}
              </p>
            )}
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
              style={{
                background: valid && !saving
                  ? `linear-gradient(to right, ${ACCENT}, #93D1F7)`
                  : "#9CA3AF",
              }}
            >
              {saving ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan…</>
              ) : (
                <>Simpan &amp; Buka Profil Anak <ArrowRight className="w-3.5 h-3.5" /></>
              )}
            </button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
