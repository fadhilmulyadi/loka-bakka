"use client"

import { useState, useMemo, useEffect } from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { X, Check, Send } from "lucide-react"
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { sendPengingatBulk } from "@/lib/actions/notifikasi"

const ACCENT = "#52A9E3"

interface IngatkanSemuaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  posyanduName: string
  childrenList: {
    id: string
    name: string
    ibuName: string
    noHp: string | null
    terakhirDiingatkan?: Date | null
    ageMo?: number
  }[]
  onSent: () => void
}

export function IngatkanSemuaModal({ open, onOpenChange, posyanduName, childrenList, onSent }: IngatkanSemuaModalProps) {
  const bulanIni = new Date().toLocaleString("id-ID", { month: "long" })
  const tahunIni = new Date().getFullYear()

  // Group by ibu (so we don't spam the same ibu if she has multiple children)
  const groupedTargets = useMemo(() => {
    const map = new Map<string, any>()
    childrenList.forEach(child => {
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      const recentlyReminded = child.terakhirDiingatkan && new Date(child.terakhirDiingatkan) > threeDaysAgo

      if (map.has(child.ibuName)) {
        const existing = map.get(child.ibuName)
        existing.anakList.push(child)
        existing.anakNames.push(child.name)
        if (!existing.recentlyReminded && recentlyReminded) {
          existing.recentlyReminded = true
        }
      } else {
        map.set(child.ibuName, {
          ibuName: child.ibuName,
          anakList: [child],
          anakNames: [child.name],
          recentlyReminded: recentlyReminded,
          lastReminded: child.terakhirDiingatkan
        })
      }
    })
    return Array.from(map.values())
  }, [childrenList])

  const [selectedIbu, setSelectedIbu] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (open) {
      // Auto select those who are not recently reminded
      const toSelect = groupedTargets.filter(t => !t.recentlyReminded).map(t => t.ibuName)
      setSelectedIbu(toSelect)
      setSent(false)
    }
  }, [open, groupedTargets])

  const eligibleCount = groupedTargets.filter(t => !t.recentlyReminded).length
  const allSelected = selectedIbu.length > 0 && selectedIbu.length === eligibleCount

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIbu([])
    } else {
      setSelectedIbu(groupedTargets.filter(t => !t.recentlyReminded).map(t => t.ibuName))
    }
  }

  const toggleIbu = (ibuName: string) => {
    if (selectedIbu.includes(ibuName)) {
      setSelectedIbu(selectedIbu.filter(n => n !== ibuName))
    } else {
      setSelectedIbu([...selectedIbu, ibuName])
    }
  }

  const handleSend = async () => {
    if (selectedIbu.length === 0) return
    setSending(true)

    // One notification per ibu, logged against her first child (matches the grouping above)
    const targets = groupedTargets
      .filter(t => selectedIbu.includes(t.ibuName))
      .map(t => ({
        anakId: t.anakList[0].id,
        judul: "Pengingat Posyandu",
        pesan: `Adik ${t.anakNames.join(" & ")} belum ditimbang bulan ${bulanIni}. Yuk kunjungi posyandu, Bu.`,
      }))

    try {
      const res = await sendPengingatBulk({ targets })

      if (res.success) {
        if (res.skipped > 0) alert(`${res.count} pengingat terkirim. ${res.skipped} dilewati karena sudah diingatkan hari ini.`)
        setSent(true)
        setTimeout(() => {
          onSent()
          onOpenChange(false)
        }, 2000)
      } else {
        alert("Gagal mengirim pengingat massal")
      }
    } catch (err) {
      console.error(err)
      alert("Gagal mengirim pengingat massal")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-[rgba(20,48,74,0.45)]" />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[550px] max-w-[calc(100vw-40px)] rounded-[18px] bg-white shadow-[0_20px_60px_rgba(20,48,74,0.3)] outline-none overflow-hidden flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="pt-5 px-6 pb-4 border-b border-gray-100 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-[17px] font-semibold text-[#173753] leading-tight">
                Kirim Pengingat
              </DialogTitle>
              <DialogDescription className="text-[13px] text-muted-foreground mt-1">
                {posyanduName} · Periode {bulanIni} {tahunIni}
              </DialogDescription>
            </div>
            <DialogClose className="h-[30px] w-[30px] rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-[#173753] transition-colors flex-shrink-0">
              <X className="w-4 h-4" />
            </DialogClose>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50">
            <div className="px-6 py-3 border-b border-gray-100 bg-white flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#8CA3B8] uppercase tracking-wider">
                Penerima · {groupedTargets.length} ibu
              </span>
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 text-[13px] font-medium text-[#173753] hover:text-[#52A9E3] transition-colors"
              >
                <div className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                  allSelected ? "bg-[#52A9E3] border-[#52A9E3]" : "border-gray-300"
                )}>
                  {allSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                Pilih semua
              </button>
            </div>

            <div className="flex flex-col">
              {groupedTargets.map((target, idx) => {
                const isSelected = selectedIbu.includes(target.ibuName)
                const disabled = target.recentlyReminded

                return (
                  <div
                    key={idx}
                    className={cn(
                      "px-6 py-3 border-b border-gray-100 bg-white flex items-center justify-between transition-colors",
                      !disabled && "cursor-pointer hover:bg-gray-50",
                      disabled && "opacity-75 bg-slate-50"
                    )}
                    onClick={() => !disabled && toggleIbu(target.ibuName)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
                        isSelected && !disabled ? "bg-[#52A9E3] border-[#52A9E3]" :
                        disabled ? "bg-gray-200 border-gray-200" : "border-gray-300"
                      )}>
                        {isSelected && !disabled && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="min-w-0 flex flex-col">
                        <span className={cn("text-[14px] font-medium truncate", disabled ? "text-muted-foreground line-through" : "text-[#173753]")}>
                          {target.ibuName}
                        </span>
                        <span className="text-[12px] text-muted-foreground truncate">
                          ({target.anakList.map((a: any) => `${a.name}${a.ageMo ? ` ${a.ageMo} bln` : ''}`).join(", ")})
                        </span>
                      </div>
                    </div>
                    {disabled && (
                      <span className="shrink-0 text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                        Sudah diingatkan {target.lastReminded ? `(${new Date(target.lastReminded).toLocaleDateString("id-ID", { day: "numeric", month: "short" })})` : ''}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-[10px] px-6 py-[15px] border-t border-gray-100 bg-white">
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
              disabled={sending || sent || selectedIbu.length === 0}
              onClick={handleSend}
              className={cn(
                "h-9 px-5 rounded-full text-[13px] font-semibold text-white flex items-center gap-1.5 transition-all",
                (sending || sent || selectedIbu.length === 0) ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"
              )}
              style={{ background: sent ? "#10B981" : `linear-gradient(to right, ${ACCENT}, #93D1F7)` }}
            >
              {sent ? (
                <>
                  <Check className="w-4 h-4" />
                  Terkirim ({selectedIbu.length})
                </>
              ) : sending ? (
                "Mengirim..."
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Kirim ke {selectedIbu.length} Ibu
                </>
              )}
            </button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
