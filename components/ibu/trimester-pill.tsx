import { cn } from '@/lib/utils'

// Warna per-trimester dipusatkan di sini supaya profil ibu & rekap selalu seragam.
const TRIMESTER_COLOR: Record<1 | 2 | 3, string> = {
  1: 'bg-fuchsia-100 text-fuchsia-700',
  2: 'bg-rose-100 text-rose-700',
  3: 'bg-orange-100 text-orange-700',
}

export function TrimesterPill({
  trimester,
  long = false,
  className,
}: {
  trimester: 1 | 2 | 3 | null
  /** `false` -> "T2" (tabel), `true` -> "Trimester 2" (header). */
  long?: boolean
  className?: string
}) {
  if (trimester == null) return null
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full',
        TRIMESTER_COLOR[trimester],
        className,
      )}
    >
      {long ? `Trimester ${trimester}` : `T${trimester}`}
    </span>
  )
}
