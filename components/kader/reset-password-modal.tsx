"use client"

import { useState, useEffect } from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { X, Loader2, Check, Copy, KeyRound } from "lucide-react"
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { resetIbuPassword } from "@/lib/actions/kader"

const ACCENT = "#52A9E3"

interface ResetPasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ibu: {
    id: string
    nama: string
    username: string
  }
}

export function ResetPasswordModal({ open, onOpenChange, ibu }: ResetPasswordModalProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open) {
      setNewPassword(null)
      setError(null)
      setCopied(false)
    }
  }, [open])

  const handleReset = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await resetIbuPassword(ibu.id)
      setNewPassword(res.password)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal reset password")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-[rgba(20,48,74,0.45)]" />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[420px] max-w-[calc(100vw-32px)] rounded-[18px] bg-white shadow-[0_20px_60px_rgba(20,48,74,0.3)] outline-none overflow-hidden flex flex-col">
          <div className="pt-5 px-6 pb-0 flex items-start justify-between gap-3">
            <DialogTitle className="text-[17px] font-semibold text-[#173753] leading-tight">
              Reset Password
            </DialogTitle>
            <DialogClose className="h-[30px] w-[30px] rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-[#173753] transition-colors flex-shrink-0">
              <X className="w-4 h-4" />
            </DialogClose>
          </div>

          <div className="px-6 py-4 flex flex-col gap-4">
            {!newPassword ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#F1F5F9] flex items-center justify-center flex-shrink-0">
                    <KeyRound className="w-4.5 h-4.5 text-[#5B7A96]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-[#173753]">{ibu.nama}</p>
                    <p className="text-[12px] text-muted-foreground">@{ibu.username}</p>
                  </div>
                </div>
                <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                  Password lama akan langsung tidak berlaku. Kata sandi baru akan dibuat otomatis dan hanya ditampilkan satu kali.
                </p>
                {error && (
                  <p className="text-[12px] text-red-600 font-medium text-center bg-red-50 rounded-xl py-2 px-3">
                    {error}
                  </p>
                )}
              </>
            ) : (
              <div className="flex flex-col gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3.5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[12.5px] font-bold text-amber-900">Kata Sandi Baru</p>
                    <p className="text-[11px] text-amber-700 leading-snug mt-0.5">
                      Salin kata sandi sekarang. Info ini hanya ditampilkan satu kali.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`Username: ${ibu.username}\nKata Sandi: ${newPassword}`)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10.5px] font-bold border shadow-sm transition-all flex-shrink-0",
                      copied
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-white/60 hover:bg-white text-amber-800 border-amber-200/60"
                    )}
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Tersalin" : "Salin"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-1.5">
                  <div>
                    <p className="text-[10px] font-semibold text-amber-700/70 uppercase">Username</p>
                    <p className="text-[13px] font-bold text-amber-950">{ibu.username}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-amber-700/70 uppercase">Kata Sandi</p>
                    <p className="text-[13px] font-bold text-amber-950">{newPassword}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-[10px] px-6 py-[15px] border-t border-gray-100 bg-white">
            {!newPassword ? (
              <>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="h-9 px-4 rounded-full text-[13px] font-medium text-muted-foreground hover:text-[#173753] transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleReset}
                  className={cn(
                    "h-9 px-5 rounded-full text-[13px] font-semibold text-white flex items-center gap-1.5 transition-all",
                    saving ? "opacity-40 cursor-not-allowed" : "hover:opacity-90"
                  )}
                  style={{ background: `linear-gradient(to right, ${ACCENT}, #93D1F7)` }}
                >
                  {saving ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Mereset…</>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="h-9 px-5 rounded-full text-[13px] font-semibold text-white flex items-center gap-1.5 hover:opacity-90 transition-all"
                style={{ background: `linear-gradient(to right, ${ACCENT}, #93D1F7)` }}
              >
                Selesai
              </button>
            )}
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
