"use client"

import { useState } from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { X, MessageCircle, CheckCircle2, Bell } from "lucide-react"
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { sendPengingatKehamilan, sendPengingatTugas } from "@/lib/actions/notifikasi"

const ACCENT = "#52A9E3"

interface IngatkanIbuKehamilanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ibu: {
    id: string
    nama: string
    noHp: string | null
    posyanduName?: string
    isHamil?: boolean
  }
  /** nama tugas yang belum dicentang hari ini — memunculkan alasan "tugas harian" */
  tugasBelum?: string[]
  initialAlasan?: string
  /** pengingat yang sudah terkirim hari ini, per jenis */
  sudahDikirim?: { kehamilan?: boolean, tugas?: boolean }
  onSent: () => void
}

const ALASAN_KEHAMILAN = [
  { id: "belum-diperiksa", label: "Belum periksa bulan ini" },
  { id: "jadwal-besok", label: "Jadwal posyandu besok" },
  { id: "lanjutan", label: "Pemeriksaan lanjutan" },
]
const ALASAN_TUGAS = { id: "tugas", label: "Tugas harian belum selesai" }

export function IngatkanIbuKehamilanModal({
  open, onOpenChange, ibu, onSent,
  tugasBelum = [], initialAlasan, sudahDikirim = {},
}: IngatkanIbuKehamilanModalProps) {
  const hamil = ibu.isHamil !== false
  const options = [
    ...(hamil ? ALASAN_KEHAMILAN : []),
    ...(tugasBelum.length > 0 ? [ALASAN_TUGAS] : []),
  ]
  const defaultAlasan = initialAlasan ?? options[0]?.id ?? "belum-diperiksa"
  const [alasan, setAlasan] = useState(defaultAlasan)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const bulanIni = new Date().toLocaleString("id-ID", { month: "long" })
  const isTugas = alasan === "tugas"
  const terkunci = isTugas ? !!sudahDikirim.tugas : !!sudahDikirim.kehamilan

  const getPreview = () => {
    if (isTugas) {
      return {
        judul: "Tugas Harian Belum Selesai",
        pesan: `Masih ada ${tugasBelum.length} tugas hari ini yang belum dicentang: ${tugasBelum.join(", ")}. Yuk diselesaikan, Bu.`,
      }
    } else if (alasan === "belum-diperiksa") {
      return { judul: "Pengingat Posyandu", pesan: `Kehamilan Ibu belum diperiksa bulan ${bulanIni}. Yuk kunjungi posyandu, Bu.` }
    } else if (alasan === "jadwal-besok") {
      return { judul: "Jadwal Posyandu Besok", pesan: `Jangan lupa periksa kehamilan besok di posyandu, ya Bu.` }
    } else {
      return { judul: "Pemeriksaan Lanjutan", pesan: `Ibu memiliki jadwal pemeriksaan kehamilan lanjutan bulan ini. Yuk ke posyandu, Bu.` }
    }
  }

  const handleSend = async () => {
    setSending(true)
    try {
      const { judul, pesan } = getPreview()
      const kirim = isTugas ? sendPengingatTugas : sendPengingatKehamilan
      const res = await kirim({ ibuId: ibu.id, judul, pesan })
      if (res.success) {
        setSent(true)
        setTimeout(() => {
          onSent()
          onOpenChange(false)
          setSent(false)
          setAlasan(defaultAlasan)
        }, 2000)
      } else if ("alreadySentToday" in res && res.alreadySentToday) {
        alert("Pengingat jenis ini sudah dikirim ke Ibu hari ini. Coba lagi besok, ya.")
        onSent()
      } else {
        alert("Gagal mengirim pengingat")
      }
    } catch (err) {
      console.error(err)
      alert("Gagal mengirim pengingat")
    } finally {
      setSending(false)
    }
  }

  const preview = getPreview()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-[rgba(20,48,74,0.45)]" />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[500px] max-w-[calc(100vw-40px)] rounded-[18px] bg-white shadow-[0_20px_60px_rgba(20,48,74,0.3)] outline-none overflow-hidden flex flex-col">
          {/* Header */}
          <div className="pt-5 px-6 pb-0 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-[17px] font-semibold text-[#173753] leading-tight">
                Kirim Pengingat
              </DialogTitle>
            </div>
            <DialogClose className="h-[30px] w-[30px] rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-[#173753] transition-colors flex-shrink-0">
              <X className="w-4 h-4" />
            </DialogClose>
          </div>

          <div className="px-6 py-4 flex flex-col gap-5 overflow-y-auto">
            {/* Recipient Info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">
                {ibu.nama.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#173753]">{ibu.nama}</p>
                <p className="text-[12px] text-muted-foreground">
                  {hamil ? "Ibu Hamil" : "Ibu"}
                </p>
              </div>
            </div>

            {/* Reason Selection — disembunyikan kalau cuma ada satu pilihan */}
            {options.length > 1 && (
              <div>
                <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
                  Pilih Alasan Pengingat
                </p>
                <div className={cn("grid gap-2", options.length > 3 ? "grid-cols-2" : "grid-cols-3")}>
                  {options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAlasan(opt.id)}
                      className={cn(
                        "px-1 py-2 rounded-full text-[10.5px] font-bold border cursor-pointer transition-all text-center whitespace-nowrap truncate",
                        alasan === opt.id
                          ? "border-[#52A9E3] text-[#52A9E3] bg-transparent"
                          : "border-gray-200 text-muted-foreground bg-transparent hover:border-gray-300 hover:text-gray-700"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notification preview — matches what appears in the ibu's own notification bell */}
            <div>
              <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
                Pratinjau Notifikasi
              </p>
              <div className="rounded-[12px] border border-gray-100 bg-slate-50 p-3.5 flex items-start gap-2.5">
                <div className="shrink-0 w-8 h-8 rounded-full bg-[#1178D4] flex items-center justify-center mt-0.5">
                  <MessageCircle className="w-4 h-4 text-white" strokeWidth={2.3} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#173753] leading-snug">{preview.judul}</p>
                  <p className="text-[12.5px] text-muted-foreground mt-0.5 leading-snug">{preview.pesan}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-[10px] px-6 py-[15px] border-t border-gray-100 bg-white">
            <p className="flex-1 text-[11.5px] text-muted-foreground leading-snug">
              {terkunci ? "Sudah dikirim hari ini — bisa diulang besok." : "Maksimal satu pengingat per jenis, per hari."}
            </p>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 px-4 rounded-full text-[13px] font-medium text-muted-foreground hover:text-[#173753] transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={sending || sent || terkunci}
              onClick={handleSend}
              className={cn(
                "h-9 px-5 rounded-full text-[13px] font-semibold text-white flex items-center gap-1.5 transition-all whitespace-nowrap",
                (sending || sent || terkunci) ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"
              )}
              style={{ background: (sent || terkunci) ? "#10B981" : `linear-gradient(to right, ${ACCENT}, #93D1F7)` }}
            >
              {sent ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Terkirim ke Notifikasi Ibu
                </>
              ) : terkunci ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Sudah Diingatkan
                </>
              ) : sending ? (
                "Mengirim..."
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5" />
                  Kirim Pengingat
                </>
              )}
            </button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
