import { getStatusStyle } from "@/lib/status-styles"
import { cn } from "@/lib/utils"

export function StatusBadge({ status, label, className }: { status: string; label?: string; className?: string }) {
  const s = getStatusStyle(status)
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full text-xs font-semibold px-2.5 py-0.5",
        className
      )}
      style={{ background: s.bg, color: s.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      {label ?? status}
    </span>
  )
}
