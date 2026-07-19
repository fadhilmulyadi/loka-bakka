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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { updateIbu } from "@/lib/actions/kader"
import { KELURAHAN_NAMES } from "@/lib/constants/kelurahan"
import { FieldLabel, StyledInput, StyledTextarea } from "@/components/kader/tambah-pasien-modal"

const ACCENT = "#52A9E3"

interface EditDataIbuModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ibu: {
    id: string
    nama: string
    noHp: string | null
    kelurahan: string | null
    alamat: string | null
  }
  onSaved: () => void
}

export function EditDataIbuModal({ open, onOpenChange, ibu, onSaved }: EditDataIbuModalProps) {
  const [form, setForm] = useState({ nama: "", noHp: "", kelurahan: "", alamat: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm({
        nama: ibu.nama,
        noHp: ibu.noHp ?? "",
        kelurahan: ibu.kelurahan ?? "",
        alamat: ibu.alamat ?? "",
      })
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ibu.id])

  const valid = form.nama.trim() !== "" && form.kelurahan !== ""

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await updateIbu({
        id: ibu.id,
        nama: form.nama,
        noHp: form.noHp || undefined,
        kelurahan: form.kelurahan,
        alamat: form.alamat || undefined,
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
              Edit Data Ibu
            </DialogTitle>
            <DialogClose className="h-[30px] w-[30px] rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-[#173753] transition-colors flex-shrink-0">
              <X className="w-4 h-4" />
            </DialogClose>
          </div>

          <div className="px-6 py-4 flex flex-col gap-3">
            <div>
              <FieldLabel label="Nama Lengkap Ibu" required />
              <StyledInput value={form.nama} onChange={(v) => setForm({ ...form, nama: v })} placeholder="mis. Siti Rahma" />
            </div>
            <div>
              <FieldLabel label="No. HP" />
              <StyledInput value={form.noHp} onChange={(v) => setForm({ ...form, noHp: v })} placeholder="0812 xxxx xxxx" />
            </div>
            <div>
              <FieldLabel label="Kelurahan" required />
              <Select value={form.kelurahan} onValueChange={(v) => setForm({ ...form, kelurahan: v as string })}>
                <SelectTrigger className="h-9 w-full text-[13px] border-gray-200 rounded-lg text-[#173753]">
                  <SelectValue placeholder="Pilih kelurahan" />
                </SelectTrigger>
                <SelectContent>
                  {KELURAHAN_NAMES.map((k) => (
                    <SelectItem key={k} value={k} className="text-[13px]">{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel label="Alamat" />
              <StyledTextarea value={form.alamat} onChange={(v) => setForm({ ...form, alamat: v })} placeholder="Nama jalan, nomor rumah, RT/RW" />
            </div>

            {error && (
              <p className="text-[12px] text-red-600 font-medium text-center bg-red-50 rounded-xl py-2 px-3">
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
