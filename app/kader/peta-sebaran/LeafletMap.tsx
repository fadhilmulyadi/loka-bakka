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

type ColorInfo = { fill: string; stroke: string; text: string; risk: string }

function markerColor(rate: number): ColorInfo {
  if (rate < 10) return { fill: "#A5D6A7", stroke: "#81C784", text: "#2E7D32", risk: "Aman" }
  if (rate < 20) return { fill: "#FFE082", stroke: "#FFCA28", text: "#F57F17", risk: "Ada Kasus" }
  return         { fill: "#EF9A9A", stroke: "#E57373", text: "#C62828", risk: "Prioritas" }
}

function MapInner({ kelurahan, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Keep callback fresh without re-initialising the map
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let cancelled = false
    const map = L.map(el, { zoomControl: true }).setView([-5.130, 119.495], 13)

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '© <a href="https://carto.com/">CARTO</a>',
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
          { color: "#A5D6A7", label: "Aman" },
          { color: "#FFE082", label: "Ada Kasus" },
          { color: "#EF9A9A", label: "Prioritas" },
        ]

        div.innerHTML = `
          <div style="margin-bottom:6px;font-weight:600;font-size:12px;color:#173753">Tingkat Stunting</div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${items
              .map(
                (item) => `
              <div style="display:flex;align-items:center;gap:8px;">
                <div style="width:14px;height:14px;border-radius:3px;background:${item.color};"></div>
                <span style="font-size:11px;color:#5B5D6B">${item.label}</span>
              </div>
            `
              )
              .join("")}
          </div>
        `
        return div
      },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new (LegendControl as any)().addTo(map)

    // ── Load GeoJSON ──────────────────────────────────────────────
    fetch('/tamalanrea.geojson')
      .then(res => res.json())
      .then(geojsonData => {
        if (cancelled) return
        L.geoJSON(geojsonData, {
          style: (feature) => {
            // Cocokkan nama kelurahan dari GeoJSON dengan data dummy
            const kelName = feature?.properties?.kel_desa
            const kData = kelurahan.find(k => k.nama === kelName)
            
            let fillColor = "#e2e8f0" // Abu-abu default jika data tidak ada
            let strokeColor = "#cbd5e1"
            
            if (kData) {
              const rate = pct(kData.stunting, kData.total)
              const col = markerColor(rate)
              fillColor = col.fill
              strokeColor = col.stroke
            }
            
            return {
              fillColor,
              fillOpacity: 0.75,
              color: 'white', // Garis batas antar kelurahan warna putih
              weight: 2,
            }
          },
          onEachFeature: (feature, layer) => {
            const kelName = feature?.properties?.kel_desa
            const kData = kelurahan.find(k => k.nama === kelName)

            if (kData) {
              const rate = pct(kData.stunting, kData.total)
              const col = markerColor(rate)
              
              // Tooltip detail saat di-hover (sticky)
              layer.bindTooltip(
                `<div style="font-family:inherit;line-height:1.5">
                   <strong style="font-size:12px;color:#173753">${kData.nama}</strong><br>
                   <span style="font-size:11px;color:#5B5D6B">Stunting: ${kData.stunting}/${kData.total} (${rate}%)</span><br>
                   <span style="font-size:11px;color:${col.text};font-weight:600">${col.risk}</span>
                 </div>`,
                { direction: "top", sticky: true }
              )
              
              // Marker permanen di tengah polygon (Nama + Kapsul Kasus)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const center = (layer as any).getBounds().getCenter();
              const iconHtml = `
                <div class="flex flex-col items-center justify-center w-full h-full pointer-events-none" style="font-family: inherit;">
                  <div style="font-size:10px; font-weight:700; color:#173753; white-space:nowrap;">
                    ${kData.nama}
                  </div>
                  <div id="capsule-${kData.id}" style="
                    margin-top:2px;
                    background:white;
                    border: 1.5px solid #cbd5e1;
                    border-radius:999px;
                    padding: 2px 8px;
                    font-size:9px;
                    font-weight:700;
                    color: ${col.text};
                    transition: border-color 0.2s;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                    white-space:nowrap;
                  ">
                    ${kData.stunting} Kasus
                  </div>
                </div>
              `;
              
              L.marker(center, {
                icon: L.divIcon({
                  className: 'clear-div-icon',
                  html: iconHtml,
                  iconSize: [100, 40],
                  iconAnchor: [50, 20]
                }),
                interactive: false // Agar tidak menghalangi event klik polygon
              }).addTo(map);

              layer.on({
                mouseover: (e) => {
                  const target = e.target;
                  target.setStyle({
                    fillOpacity: 0.9,
                    weight: 3,
                    color: col.stroke
                  });
                  target.bringToFront(); 
                  
                  // Ubah warna border kapsul
                  const capsule = document.getElementById(`capsule-${kData.id}`);
                  if (capsule) capsule.style.borderColor = col.stroke;
                },
                mouseout: (e) => {
                  const target = e.target;
                  target.setStyle({
                    fillOpacity: 0.75,
                    weight: 2,
                    color: 'white'
                  });
                  
                  // Kembalikan warna border kapsul ke abu-abu
                  const capsule = document.getElementById(`capsule-${kData.id}`);
                  if (capsule) capsule.style.borderColor = '#cbd5e1';
                },
                click: () => onSelectRef.current(kData)
              })
            } else {
               layer.bindTooltip(
                 `<div style="font-family:inherit;line-height:1.5">
                   <strong style="font-size:12px;color:#173753">${kelName || 'Tidak diketahui'}</strong><br>
                   <span style="font-size:11px;color:#5B5D6B">Data tidak tersedia</span>
                 </div>`,
                 { direction: "top", sticky: true }
               )
            }
          }
        }).addTo(map)
      })
      .catch(err => console.error("Error memuat geojson:", err))

    return () => {
      cancelled = true
      map.remove()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <style>{`
        .leaflet-container {
          background: #EBF2F8 !important;
          font-family: inherit !important;
        }
        .leaflet-tile-pane {
          filter: brightness(1.05) contrast(0.95) saturate(0.8);
        }
      `}</style>
      <div
        ref={containerRef}
        role="application"
        aria-label="Peta Sebaran Kecamatan Tamalanrea"
        style={{ width: "100%", height: "100%" }}
      />
    </>
  )
}

export default memo(MapInner)
