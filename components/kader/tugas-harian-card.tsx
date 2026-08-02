"use client"

import { useState } from "react"
import { Check, Bell, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { PREGNANCY_TASKS, CHILD_TASKS } from "@/lib/daily-tasks"
import { IngatkanIbuKehamilanModal } from "@/components/kader/ingatkan-ibu-kehamilan-modal"

// ponytail: DailyTask menyimpan taskId 0–4 tanpa penanda set, jadi satu ibu hanya
// punya satu set tugas aktif per hari — ikut isHamil, sama seperti getDailyTaskStats().
const DAY_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

export function TugasHarianCard({
  ibu,
  onSent,
}: {
  ibu: {
    id: string
    nama: string
    noHp: string | null
    isHamil: boolean
    dailyTasks: { taskId: number; completed: boolean; date: Date }[]
    notifikasis: { templateCode: string; createdAt: Date }[]
  }
  onSent: () => void
}) {
  const [modalOpen, setModalOpen] = useState(false)

  const pengingatTugas = ibu.notifikasis.find(n => n.templateCode === "R3")
  const tasks = ibu.isHamil ? PREGNANCY_TASKS : CHILD_TASKS
  const scoreOf = (ids: Iterable<number>) => {
    const set = new Set(ids)
    return tasks.reduce((acc, t) => acc + (set.has(t.id) ? t.pts : 0), 0)
  }

  const selesai = ibu.dailyTasks.filter(t => t.completed).map(t => ({ ...t, date: new Date(t.date) }))
  const today = new Date()
  const done = new Set(selesai.filter(t => dayKey(t.date) === dayKey(today)).map(t => t.taskId))
  const doneCount = tasks.filter(t => done.has(t.id)).length
  const score = scoreOf(done)
  const belum = tasks.filter(t => !done.has(t.id))

  // 7 hari terakhir, hari ini di paling kanan
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - i))
    const key = dayKey(d)
    return { d, score: scoreOf(selesai.filter(t => dayKey(t.date) === key).map(t => t.taskId)) }
  })

  return (
    <>
    <Card className="ring-0 shadow-none bg-white rounded-xl border-none overflow-hidden py-0 gap-0">
      <CardHeader className="px-5 pt-[18px] pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-[16px] font-semibold text-[#173753] leading-tight">
          Tugas Harian {ibu.isHamil ? "Ibu" : "Anak"}
        </CardTitle>
        <span className="text-[11px] font-bold text-[#52A9E3] bg-[#52A9E3]/10 rounded-full px-2.5 py-1 whitespace-nowrap">
          {score}%
        </span>
      </CardHeader>

      <CardContent className="pt-0 px-5 pb-[18px] space-y-3">
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <p className="text-[12px] text-slate-500 font-medium">
              <b className="text-[#173753] font-bold">{doneCount}</b> dari {tasks.length} tugas selesai
            </p>
            <p className="text-[10px] text-muted-foreground">Hari ini</p>
          </div>
          <div className="h-1.5 rounded-full bg-[#EBF2F8] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#52A9E3] to-[#93D1F7] transition-[width] duration-500"
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          {tasks.map((t) => {
            const isDone = done.has(t.id)
            return (
              <div key={t.id} className="flex items-start gap-2.5" title={t.note}>
                <span
                  className={cn(
                    "mt-[1px] h-[18px] w-[18px] rounded-full flex items-center justify-center flex-none border",
                    isDone ? "bg-[#15803D] border-[#15803D]" : "bg-white border-[#D8E2EC]"
                  )}
                >
                  {isDone && <Check className="w-3 h-3 text-white" strokeWidth={3.2} />}
                </span>
                <p className={cn("text-[12px] leading-[1.35] flex-1", isDone ? "text-slate-400 line-through" : "text-[#173753]")}>
                  {t.name}
                </p>
                <span className="text-[10px] font-bold text-slate-400 flex-none mt-[2px]">{t.pts}%</span>
              </div>
            )
          })}
        </div>

        <div className="pt-0.5">
          <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">7 Hari Terakhir</p>
          <div className="flex items-end gap-1.5">
            {week.map(({ d, score: s }) => (
              <div key={d.toISOString()} className="flex-1 flex flex-col items-center gap-1" title={`${d.getDate()}/${d.getMonth() + 1} · ${s}%`}>
                <div className="w-full h-[26px] rounded-[4px] bg-[#EBF2F8] flex flex-col justify-end overflow-hidden">
                  <div
                    className="w-full rounded-[4px] bg-[#52A9E3]"
                    style={{ height: `${s}%`, opacity: s === 0 ? 0 : 0.45 + (s / 100) * 0.55 }}
                  />
                </div>
                <span className="text-[9px] text-slate-400">{DAY_ID[d.getDay()]}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={belum.length === 0 || !!pengingatTugas}
          onClick={() => setModalOpen(true)}
          className={cn(
            "w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-[13px] font-medium transition-colors",
            belum.length === 0 || pengingatTugas
              ? "border-[#15803D]/20 bg-[#15803D]/5 text-[#15803D] cursor-default"
              : "border-gray-200 text-[#173753] hover:bg-gray-50"
          )}
        >
          {belum.length === 0 ? (
            <><CheckCircle2 className="w-3.5 h-3.5" /> Semua tugas selesai</>
          ) : pengingatTugas ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Sudah diingatkan {new Date(pengingatTugas.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </>
          ) : (
            <><Bell className="w-3.5 h-3.5" /> Ingatkan {belum.length} Tugas</>
          )}
        </button>
      </CardContent>
    </Card>

    <IngatkanIbuKehamilanModal
      open={modalOpen}
      onOpenChange={setModalOpen}
      onSent={onSent}
      ibu={{ id: ibu.id, nama: ibu.nama, noHp: ibu.noHp, isHamil: ibu.isHamil }}
      tugasBelum={belum.map(t => t.name)}
      initialAlasan="tugas"
      sudahDikirim={{ tugas: !!pengingatTugas }}
    />
    </>
  )
}
