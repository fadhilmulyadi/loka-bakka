export type StatusType = "Normal" | "Stunting" | "Risiko Stunting" | "Gizi Kurang" | "Buruk"

export interface StatusStyle {
  bg: string
  text: string
  dot: string
  border: string
}

export const statusMap: Record<string, StatusStyle> = {
  Normal:          { bg: "#E6F4EA", text: "#1E8E3E", dot: "#1E8E3E", border: "#DCFCE7" },
  Stunting:        { bg: "#FCE8E6", text: "#D93025", dot: "#D93025", border: "#FEE2E2" },
  "Stunting Berat": { bg: "#FCE8E6", text: "#D93025", dot: "#D93025", border: "#FEE2E2" },
  "Risiko Stunting": { bg: "#FFF4E5", text: "#B06000", dot: "#B06000", border: "#FEF3C7" },
  Berisiko:        { bg: "#FFF4E5", text: "#B06000", dot: "#B06000", border: "#FEF3C7" },
  "Gizi Kurang":   { bg: "#F3E8FD", text: "#8E24AA", dot: "#8E24AA", border: "#E9D5FF" },
  "Risiko KEK":    { bg: "#FFF4E5", text: "#B06000", dot: "#B06000", border: "#FEF3C7" },
  "Anemia":        { bg: "#FFF4E5", text: "#B06000", dot: "#B06000", border: "#FEF3C7" },
  "Risiko KEK · Anemia": { bg: "#FCE8E6", text: "#D93025", dot: "#D93025", border: "#FEE2E2" },
  "Kenaikan Kurang":   { bg: "#FFF4E5", text: "#B06000", dot: "#B06000", border: "#FEF3C7" },
  "Kenaikan Berlebih": { bg: "#FFF4E5", text: "#B06000", dot: "#B06000", border: "#FEF3C7" },
  Buruk:           { bg: "#FCE8E6", text: "#D93025", dot: "#D93025", border: "#FEE2E2" },
  Aman:            { bg: "#E6F4EA", text: "#1E8E3E", dot: "#1E8E3E", border: "#DCFCE7" },
  Waspada:         { bg: "#FFF4E5", text: "#B06000", dot: "#B06000", border: "#FEF3C7" },
  Bahaya:          { bg: "#FCE8E6", text: "#D93025", dot: "#D93025", border: "#FEE2E2" },
  Aktif:           { bg: "#E6F4EA", text: "#1E8E3E", dot: "#1E8E3E", border: "#DCFCE7" },
  "Non-aktif":     { bg: "#FCE8E6", text: "#D93025", dot: "#D93025", border: "#FEE2E2" },
  NORMAL:          { bg: "#E6F4EA", text: "#1E8E3E", dot: "#1E8E3E", border: "#DCFCE7" },
  PENDEK:          { bg: "#FFF4E5", text: "#B06000", dot: "#B06000", border: "#FEF3C7" },
  "SANGAT PENDEK": { bg: "#FCE8E6", text: "#D93025", dot: "#D93025", border: "#FEE2E2" },
  RENDAH:          { bg: "#E6F4EA", text: "#1E8E3E", dot: "#1E8E3E", border: "#DCFCE7" },
  SEDANG:          { bg: "#FFF4E5", text: "#B06000", dot: "#B06000", border: "#FEF3C7" },
  TINGGI:          { bg: "#FCE8E6", text: "#D93025", dot: "#D93025", border: "#FEE2E2" },
  Default:         { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF", border: "#E5E7EB" },
}

export function getStatusStyle(status: string): StatusStyle {
  return statusMap[status] || statusMap.Default
}
