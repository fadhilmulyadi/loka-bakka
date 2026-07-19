"use client"

import { useState, useEffect } from "react"
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
import { updateAnak } from "@/lib/actions/kader"
import { FieldLabel, StyledInput, SectionCard } from "@/components/kader/tambah-pasien-modal"

const ACCENT = "#52A9E3"

interface AnakForm {
  nama: string
  jenisKelamin: "L" | "P" | ""
  tanggalLahir: string
  beratLahirKg: string
  panjangLahirCm: string
}

interface EditDataAnakModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  anak: {
    id: string
    nama: string
    genderRaw: "L" | "P"
    birthDateRaw: string
    beratLahir: number | null
    panjangLahir: number | null
  }
  onSaved: () => void
}

export function EditDataAnakModal({ open, onOpenChange, anak, onSaved }: EditDataAnakModalProps) {
  const [form, setForm] = useState<AnakForm>({ nama: "", jenisKelamin: "", tanggalLahir: "", beratLahirKg: "", panjangLahirCm: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm({
        nama: anak.nama,
        jenisKelamin: anak.genderRaw,
        tanggalLahir: anak.birthDateRaw,
        beratLahirKg: anak.beratLahir != null ? String(anak.beratLahir) : "",
        panjangLahirCm: anak.panjangLahir != null ? String(anak.panjangLahir) : "",
      })
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, anak.id])

  const set = (k: keyof AnakForm) => (v: string) => setForm({ ...form, [k]: v })

  const valid = form.nama.trim() !== "" && form.jenisKelamin !== "" && form.tanggalLahir !== ""

  const handleSave = async () => {
    if (!valid || form.jenisKelamin === "") return
    setSaving(true)
    setError(null)
    try {
      await updateAnak({
        id: anak.id,
        nama: form.nama,
        sex: form.jenisKelamin,
        birth: form.tanggalLahir,
        beratLahirKg: form.beratLahirKg || undefined,
        panjangLahirCm: form.panjangLahirCm || undefined,
      })
      onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-[rgba(20,48,74,0.45)]" />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[460px] max-w-[calc(100vw-32px)] rounded-[18px] bg-white shadow-[0_20px_60px_rgba(20,48,74,0.3)] outline-none overflow-hidden flex flex-col">
          <div className="pt-5 px-6 pb-0 flex items-start justify-between gap-3">
            <DialogTitle className="text-[17px] font-semibold text-[#173753] leading-tight">
              Edit Data Anak
            </DialogTitle>
            <DialogClose className="h-[30px] w-[30px] rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-[#173753] transition-colors flex-shrink-0">
              <X className="w-4 h-4" />
            </DialogClose>
          </div>

          <div className="px-6 py-4">
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
                  <FieldLabel label="Berat Lahir (kg)" />
                  <StyledInput value={form.beratLahirKg} onChange={set("beratLahirKg")} type="number" placeholder="0,0" />
                </div>
                <div>
                  <FieldLabel label="Panjang Lahir (cm)" />
                  <StyledInput value={form.panjangLahirCm} onChange={set("panjangLahirCm")} type="number" placeholder="0,0" />
                </div>
              </div>
            </SectionCard>

            {error && (
              <p className="text-[12px] text-red-600 font-medium text-center bg-red-50 rounded-xl py-2 px-3 mt-3">
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-[10px] px-6 py-[15px] border-t border-gray-100 bg-white">
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
              onClick={handleSave}
              className={cn(
                "h-9 px-5 rounded-full text-[13px] font-semibold text-white flex items-center gap-1.5 transition-all",
                (!valid || saving) ? "opacity-40 cursor-not-allowed" : "hover:opacity-90"
              )}
              style={{ background: `linear-gradient(to right, ${ACCENT}, #93D1F7)` }}
            >
              {saving ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan…</>
              ) : (
                <><Check className="w-3.5 h-3.5" /> Simpan Perubahan</>
              )}
            </button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
