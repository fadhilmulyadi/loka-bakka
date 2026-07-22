"use client"

import dynamic from "next/dynamic"
import { useState, useCallback, useEffect } from "react"
import { KaderUserPill } from "@/components/kader/kader-user-pill"
import { ChevronRight, X, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { StatusBadge } from "@/components/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getCached, setCached } from "@/lib/client-cache"
import { getKelurahanStats, getKelurahanPatients, getUncheckedChildren } from "@/lib/actions/kader"
import { Topbar } from "@/components/kader/topbar"
import { IngatkanSemuaModal } from "@/components/kader/ingatkan-semua-modal"

// ── Types ───────────────────────────────────────────────────────────────────
export type KelurahanData = {
  id: number
  nama: string
  lat: number
  lng: number
  total: number
  normal: number
  risiko: number
  stunting: number
  posyandu: string[]
  petugas: string
}

export type KelurahanPatient = {
  id: string
  type: "anak" | "bumil"
  name: string
  desc: string
  // "Pra Stunting" untuk anak, "Pra Stunting" untuk bumil.
  status: "Normal" | "Pra Stunting" | "Pra Stunting" | "Stunting"
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function pct(val: number, total: number) {
  return total > 0 ? Math.round((val / total) * 100) : 0
}

type StatusInfo = { fill: string; label: string; badgeClass: string }

function stuntingInfo(rate: number): StatusInfo {
  if (rate < 10) return { fill: "#A5D6A7", label: "Aman",      badgeClass: "bg-green-100 text-green-800" }
  if (rate < 20) return { fill: "#FFE082", label: "Ada Kasus", badgeClass: "bg-amber-100 text-amber-800" }
  return         { fill: "#EF9A9A", label: "Prioritas", badgeClass: "bg-red-100 text-red-800" }
}

function progressRateColor(rate: number): string {
  if (rate >= 20) return "#E57373"
  if (rate >= 10) return "#FFCA28"
  return "#81C784"
}

// ── Dynamic Map (no SSR) ─────────────────────────────────────────────────────
const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center bg-[#EBF2F8]">
      <div className="flex flex-col items-center gap-2">
        <div className="w-7 h-7 border-2 border-[#378ADD] border-t-transparent rounded-full motion-safe:animate-spin" />
        <p className="text-xs text-muted-foreground">Memuat peta...</p>
      </div>
    </div>
  ),
})

const PETA_KELURAHAN_KEY = "kader-peta-kelurahan"
const PETA_UNCHECKED_KEY = "kader-peta-unchecked"

export default function PetaSebaranPage() {
  const cachedKelurahan = getCached<KelurahanData[]>(PETA_KELURAHAN_KEY)
  const [kelurahanListData, setKelurahanListData] = useState<KelurahanData[]>(cachedKelurahan ?? [])
  const [uncheckedChildren, setUncheckedChildren] = useState<any[]>(getCached<any[]>(PETA_UNCHECKED_KEY) ?? [])
  const [loading, setLoading] = useState(!cachedKelurahan)
  const [selected, setSelected] = useState<KelurahanData | null>(null)
  const [selectedPatients, setSelectedPatients] = useState<KelurahanPatient[]>([])
  const [patientsLoading, setPatientsLoading] = useState(false)
  const [ingatkanSemuaOpen, setIngatkanSemuaOpen] = useState(false)

  useEffect(() => {
    getUncheckedChildren().then((data) => {
      setUncheckedChildren(data)
      setCached(PETA_UNCHECKED_KEY, data)
    })

    getKelurahanStats().then((data) => {
      setKelurahanListData(data)
      setLoading(false)
      setCached(PETA_KELURAHAN_KEY, data)
    })
  }, [])

  const handleSelect = useCallback((k: KelurahanData) => {
    setSelected(k)
    setPatientsLoading(true)
    getKelurahanPatients(k.nama).then((data) => {
      setSelectedPatients(data)
      setPatientsLoading(false)
    })
  }, [])
  const handleBack = useCallback(() => setSelected(null), [])

  // ── Totals ───────────────────────────────────────────────────────────────────
  const totals = kelurahanListData.reduce(
    (acc, k) => ({
      total:    acc.total    + k.total,
      normal:   acc.normal   + k.normal,
      risiko:   acc.risiko   + k.risiko,
      stunting: acc.stunting + k.stunting,
    }),
    { total: 0, normal: 0, risiko: 0, stunting: 0 }
  )

  const sorted = [...kelurahanListData].sort(
    (a, b) => b.stunting - a.stunting
  )

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-[#EBF2F8]">

      <Topbar
        alert={selected ? (
          <span className="text-xs text-[#173753] truncate font-medium">
            {`${selected.nama}: ${pct(selected.stunting, selected.total)}% prevalensi stunting`}
          </span>
        ) : undefined}
        alertStats={selected || loading ? undefined : {
          stuntingCount: totals.stunting,
          berisikoCount: totals.risiko,
          belumDiperiksa: uncheckedChildren.length,
        }}
      />

      <div className="p-6 space-y-5 flex-1 flex flex-col min-h-0">
        {/* ── Page Title + Profile ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium text-[#173753]">
              Peta Sebaran
            </h1>
          </div>
          <KaderUserPill />
        </div>

        {/* ── Map + Panel ── */}
        <div className="flex flex-1 min-h-0 gap-3">
          {/* Map */}
          {/* LeafletMap init sekali di mount (deps []), jadi jangan dirender sebelum data ada
              — kalau tidak polygonnya nyangkut abu-abu selamanya. */}
          <div className="flex-1 min-h-0 min-w-0 rounded-2xl overflow-hidden relative z-0">
            {loading
              ? <Skeleton className="w-full h-full rounded-2xl" />
              : <LeafletMap kelurahan={kelurahanListData} onSelect={handleSelect} />}
          </div>

          {/* Side Panel */}
          <aside
            aria-label="Panel informasi kelurahan"
            className="w-[340px] flex-none flex flex-col gap-3.5 overflow-y-auto"
          >
            {loading ? (
              <PanelSkeleton />
            ) : selected ? (
              <DetailPanel
                k={selected}
                onBack={handleBack}
                onSelect={handleSelect}
                sorted={sorted}
                onOpenIngatkan={() => setIngatkanSemuaOpen(true)}
                patients={selectedPatients}
                patientsLoading={patientsLoading}
              />
            ) : (
              <DefaultPanel onSelect={setSelected} sorted={sorted} totals={totals} />
            )}
          </aside>
        </div>
      </div>

      <IngatkanSemuaModal
        open={ingatkanSemuaOpen}
        onOpenChange={setIngatkanSemuaOpen}
        posyanduName={selected?.nama || "Posyandu"}
        childrenList={uncheckedChildren.filter(c => !c.sudah).map(c => ({
          id: c.id,
          name: c.nama,
          ibuName: c.ibuName,
          noHp: c.noHp,
          terakhirDiingatkan: c.terakhirDiingatkan,
          ageMo: c.ageMo,
        }))}
        onSent={() => {
          getUncheckedChildren().then((data) => {
            setUncheckedChildren(data)
            setCached(PETA_UNCHECKED_KEY, data)
          })
        }}
      />
    </div>
  )
}

// Mengikuti bentuk DefaultPanel: kartu ringkasan, kartu tengah, kartu ranking.
function PanelSkeleton() {
  return (
    <>
      <div className="flex-none bg-white rounded-2xl px-5 py-4.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-48 mt-2" />
        <div className="grid grid-cols-3 gap-2 mt-3.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="bg-[#F8FAFD] rounded-[10px] px-2.5 py-2.5">
              <Skeleton className="h-5 w-8" />
              <Skeleton className="h-2.5 w-14 mt-1.5" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-[180px] bg-white rounded-2xl p-5 flex flex-col items-center justify-center gap-2.5">
        <Skeleton className="w-[52px] h-[52px] rounded-full" />
        <Skeleton className="h-3.5 w-44" />
        <Skeleton className="h-2.5 w-52" />
        <Skeleton className="h-2.5 w-40" />
      </div>

      <div className="flex-none bg-white rounded-2xl px-4.5 py-4">
        <Skeleton className="h-4 w-52 mb-3" />
        <div className="flex flex-col gap-2.5">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-2 py-0.5">
              <Skeleton className="h-3 w-16 flex-none" />
              <Skeleton className="h-1.5 flex-1 rounded-full" />
              <Skeleton className="h-3 w-[32px] flex-none" />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// SHARED PANEL PIECES
// ════════════════════════════════════════════════════════════════════════════
function StatMiniGrid({ k }: { k: Pick<KelurahanData, "stunting" | "risiko" | "normal"> }) {
  const stats = [
    { label: "Stunting", value: k.stunting, color: "#B03230" },
    { label: "Pra Stunting", value: k.risiko, color: "#B87514" },
    { label: "Normal", value: k.normal, color: "#173753" },
  ]
  return (
    <div className="grid grid-cols-3 gap-2 mt-3.5">
      {stats.map((s) => (
        <div key={s.label} className="bg-[#F8FAFD] rounded-[10px] px-2.5 py-2.5">
          <p className="text-lg font-extrabold leading-none tabular-nums font-sans" style={{ color: s.color }}>
            {s.value}
          </p>
          <p className="text-[9.5px] text-muted-foreground mt-1 leading-tight">{s.label}</p>
        </div>
      ))}
    </div>
  )
}

function RankingCard({ sorted, onSelect, activeId, limit = 5 }: {
  sorted: KelurahanData[]
  onSelect: (k: KelurahanData) => void
  activeId?: number
  limit?: number
}) {
  const top = sorted.slice(0, limit)
  const maxStunting = top.length > 0 ? top[0].stunting : 0

  return (
    <div className="flex-none bg-white rounded-2xl px-4.5 py-4">
      <div className="flex items-baseline gap-2 mb-2.5">
        <p className="text-[16px] font-medium text-[#173753]">Kasus Stunting per Kelurahan</p>
      </div>
      <div className="flex flex-col gap-2.5">
        {top.map((k) => {
          const rate = pct(k.stunting, k.total)
          return (
            <button
              key={k.id}
              onClick={() => onSelect(k)}
              title={`${k.stunting} kasus stunting dari total ${k.total} pasien terdaftar`}
              className={cn(
                "w-full flex items-center gap-2 text-left group cursor-pointer rounded-md -mx-1 px-1 py-0.5 transition-colors",
                k.id === activeId ? "bg-[#EBF2F8]" : "hover:bg-[#F8FAFD]"
              )}
            >
              <span className="text-[11.5px] font-semibold text-[#3D5A75] w-16 flex-none truncate">{k.nama}</span>
              <div className="flex-1 h-1.5 bg-[#EBF2F8] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: maxStunting > 0 ? `${Math.round((k.stunting / maxStunting) * 100)}%` : "0%", background: progressRateColor(rate) }}
                />
              </div>
              <b className="text-[11.5px] text-[#173753] tabular-nums flex-none w-[32px] text-right">
                {k.stunting}
              </b>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// DEFAULT PANEL — state: belum ada kelurahan dipilih (design 15a)
// ════════════════════════════════════════════════════════════════════════════
function DefaultPanel({ onSelect, sorted, totals }: { onSelect: (k: KelurahanData) => void, sorted: KelurahanData[], totals: any }) {
  const kelurahanCount = sorted.length

  return (
    <>
      {/* Ringkasan Kecamatan */}
      <div className="flex-none bg-white rounded-2xl px-5 py-4.5">
        <p className="text-[16px] font-medium text-[#173753]">Ringkasan Kecamatan</p>
        <p className="text-[11.5px] text-muted-foreground mt-0.5">
          {kelurahanCount} kelurahan · {totals.total} pasien terdaftar
        </p>
        <StatMiniGrid k={totals} />
      </div>

      {/* Empty state */}
      <div className="flex-1 min-h-[180px] bg-white rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-2.5">
        <div className="w-[52px] h-[52px] rounded-full bg-[#EBF2F8] flex items-center justify-center">
          <User className="w-6 h-6 text-[#5B7A96]" aria-hidden="true" />
        </div>
        <p className="text-[13.5px] font-bold text-[#173753]">Belum ada kelurahan dipilih</p>
        <p className="text-[11.5px] text-muted-foreground leading-relaxed max-w-[220px]">
          Klik salah satu wilayah di peta untuk melihat rincian kasus dan daftar pasien di kelurahan tersebut.
        </p>
      </div>

      <RankingCard sorted={sorted} onSelect={onSelect} />
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// DETAIL PANEL — state: kelurahan terpilih (design 7a)
// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
function DetailPanel({ k, onBack, onSelect, sorted, onOpenIngatkan, patients, patientsLoading }: {
  k: KelurahanData
  onBack: () => void
  onSelect: (k: KelurahanData) => void
  sorted: KelurahanData[]
  onOpenIngatkan: () => void
  patients: KelurahanPatient[]
  patientsLoading: boolean
}) {
  const rate = pct(k.stunting, k.total)
  const info = stuntingInfo(rate)
  const followUp = k.risiko + k.stunting
  const visiblePatients = patients.slice(0, 6)

  return (
    <>
      {/* Selected zone summary */}
      <div className="flex-none bg-white rounded-2xl px-5 py-4.5">
        <div className="flex items-center gap-2">
          <p className="text-[16px] font-medium text-[#173753]">{k.nama}</p>
          <span className={cn("text-[10.5px] font-bold rounded-full px-2.5 py-0.5 uppercase", info.badgeClass)}>
            {info.label}
          </span>
          <button
            onClick={onBack}
            aria-label="Tutup detail kelurahan"
            className="ml-auto text-muted-foreground hover:text-[#173753] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <StatMiniGrid k={k} />
        {followUp > 0 ? (
          <div className="mt-4 pt-3.5 border-t border-[#EEF3F8]">
            <p className="text-[10.5px] font-semibold text-muted-foreground text-center mb-2.5">
              <strong className="text-[#173753] font-extrabold">{followUp}</strong> pasien belum diperiksa bulan ini.
            </p>
            <button
              onClick={onOpenIngatkan}
              className="w-full h-9 rounded-full text-xs font-bold text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              style={{ background: `linear-gradient(to right, #52A9E3, #93D1F7)` }}
            >
              Kirim Pengingat Sekarang
            </button>
          </div>
        ) : (
          <p className="text-center text-xs font-medium text-[#177A52] bg-[#DFF2E9] rounded-full mt-3.5 py-2.5">
            Semua pasien terpantau baik
          </p>
        )}
      </div>

      {/* Kasus list */}
      <div className="bg-white rounded-2xl p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[16px] font-medium text-[#173753]">Kasus di {k.nama}</p>
        </div>

        {patientsLoading ? (
          <p className="text-xs text-muted-foreground py-6 text-center">Memuat pasien...</p>
        ) : visiblePatients.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">Belum ada pasien terdaftar.</p>
        ) : (
          <div className="flex flex-col -mx-1 px-1">
            {visiblePatients.map((pasien, i) => (
              <div
                key={pasien.id}
                className={cn(
                  "flex items-center gap-2.5 py-3 group",
                  i < visiblePatients.length - 1 && "border-b border-[#EEF3F8]"
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-medium text-[#173753] group-hover:text-[#52A9E3] transition-colors truncate">
                    {pasien.name}
                  </p>
                  <p className="text-[11px] font-normal text-muted-foreground truncate mt-0.5">
                    {pasien.desc}
                  </p>
                </div>
                <StatusBadge status={pasien.status} className="text-[9px] px-2 py-0.5 flex-none" />
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#52A9E3] flex-none transition-colors" />
              </div>
            ))}
          </div>
        )}

        {patients.length > visiblePatients.length && (
          <div className="pt-3 mt-1 border-t border-[#EEF3F8] flex-none">
            <p className="w-full text-center text-[11.5px] font-medium text-muted-foreground">
              +{patients.length - visiblePatients.length} pasien lainnya di {k.nama}
            </p>
          </div>
        )}
      </div>

      <RankingCard sorted={sorted} onSelect={onSelect} activeId={k.id} />
    </>
  )
}
