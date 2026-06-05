"use client"

import { useEffect, useRef, memo } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { KelurahanData } from "./page"

interface Props {
  kelurahan: KelurahanData[]
  onSelect: (k: KelurahanData) => void
}

function pct(val: number, total: number) {
  return total > 0 ? Math.round((val / total) * 100) : 0
}

type ColorInfo = { fill: string; stroke: string; risk: string }

function markerColor(rate: number): ColorInfo {
  if (rate < 10)  return { fill: "#378ADD", stroke: "#1d6db5", risk: "Rendah" }
  if (rate < 15)  return { fill: "#EF9F27", stroke: "#b87a1a", risk: "Sedang" }
  if (rate < 20)  return { fill: "#7F77DD", stroke: "#5a52c4", risk: "Tinggi" }
  return          { fill: "#E24B4A", stroke: "#bf2d2c", risk: "Sangat Tinggi" }
}

function MapInner({ kelurahan, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Keep callback fresh without re-initialising the map
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const map = L.map(el, { zoomControl: true }).setView([-5.155, 119.470], 13)

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        "© <a href='https://www.openstreetmap.org' target='_blank' rel='noreferrer'>OpenStreetMap</a>",
      maxZoom: 18,
    }).addTo(map)

    // ── Legend ──────────────────────────────────────────────
    const LegendControl = L.Control.extend({
      options: { position: "bottomleft" as L.ControlPosition },
      onAdd() {
        const div = L.DomUtil.create("div")
        div.style.cssText = [
          "background:rgba(255,255,255,0.97)",
          "border:1px solid #e8e8e8",
          "border-radius:10px",
          "padding:10px 14px",
          "box-shadow:2px 2px 8px rgba(0,0,0,0.08)",
          "pointer-events:none",
          "font-family:inherit",
        ].join(";")

        const items: { color: string; label: string }[] = [
          { color: "#378ADD", label: "Rendah (< 10%)" },
          { color: "#EF9F27", label: "Sedang (10–15%)" },
          { color: "#7F77DD", label: "Tinggi (15–20%)" },
          { color: "#E24B4A", label: "Sangat Tinggi (≥20%)" },
        ]

        div.innerHTML = `
          <p style="font-size:10px;font-weight:700;color:#173753;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 8px">Prevalensi Stunting</p>
          ${items
            .map(
              (it) => `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;font-size:11px;color:#5B5D6B">
              <div style="width:12px;height:12px;border-radius:50%;background:${it.color};flex-shrink:0;border:1.5px solid rgba(0,0,0,0.1)"></div>
              ${it.label}
            </div>`
            )
            .join("")}
        `
        return div
      },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new (LegendControl as any)().addTo(map)

    // ── Circle Markers ────────────────────────────────────────
    kelurahan.forEach((k) => {
      const rate   = pct(k.stunting, k.total)
      const col    = markerColor(rate)
      const radius = 18 + (k.total / 84) * 16

      const circle = L.circleMarker([k.lat, k.lng] as L.LatLngExpression, {
        radius,
        fillColor: col.fill,
        fillOpacity: 0.72,
        color: col.stroke,
        weight: 2,
        interactive: true,
      }).addTo(map)

      circle.bindTooltip(
        `<div style="font-family:inherit;line-height:1.5">
           <strong style="font-size:12px;color:#173753">${k.nama}</strong><br>
           <span style="font-size:11px;color:#5B5D6B">Stunting: ${k.stunting}/${k.total} (${rate}%)</span><br>
           <span style="font-size:11px;color:${col.fill};font-weight:600">${col.risk}</span>
         </div>`,
        { direction: "top", offset: [0, -8] }
      )

      circle.on("click", () => onSelectRef.current(k))
    })

    return () => {
      map.remove()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Peta Sebaran Stunting Kecamatan Manggala"
      style={{ width: "100%", height: "100%" }}
    />
  )
}

export default memo(MapInner)
