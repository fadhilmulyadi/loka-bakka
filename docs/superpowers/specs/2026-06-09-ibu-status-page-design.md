# Design Spec: Ibu Status Page (CekRisiko)

**Date:** 2026-06-09  
**Source design:** CekRisiko.html (from design archive)  
**Route:** `/ibu/status`

---

## Overview

A read-only status page for pregnant mothers showing their health condition based on posyandu measurements. Data is entered by kaders, not by the mother herself. The page displays the IMT baseline profile, the most recent visit measurements, and a detailed risk status section with full educational content.

---

## Files

| File | Role |
|------|------|
| `app/ibu/status/page.tsx` | Page shell: loads data, routing guard, spinner/error states |
| `components/ibu/pregnancy-status-view.tsx` | Full UI component |

---

## Page Shell (`app/ibu/status/page.tsx`)

- `"use client"` — same pattern as `app/ibu/edukasi/page.tsx` and `app/ibu/dashboard/page.tsx`
- Loads in `useEffect`:
  ```
  Promise.all([getIbuData(), getPregnancyProfile(), getPregnancyVisits()])
  ```
- `latestVisit = visits[0] ?? null` (visits already sorted descending by date)
- Loading state: full-height spinner (same blue spinner as other pages)
- Error / no data: same "Data tidak tersedia" card pattern as dashboard
- If `ibuData?.isPregnant`: renders `<PregnancyStatusView profile={profile} latestVisit={latestVisit} />`
- If not pregnant: renders a "tidak tersedia" placeholder (not a pregnant mother)

---

## View Component (`components/ibu/pregnancy-status-view.tsx`)

### Props

```ts
interface Props {
  profile: PregnancyProfileData | null
  latestVisit: PregnancyVisitData | null
}
```

### Risk computation

Reuses the same logic already in `pregnancy-dashboard-view.tsx`:

```ts
function computeRiskLevel(lila: number, hb: number, isOnTrack: boolean | null): RiskLevel {
  if (lila < 23.5 || hb < 11) return 'tinggi'
  if (isOnTrack === false) return 'sedang'
  return 'rendah'
}
```

`activeTab` is `useState<RiskLevel>` initialized to the computed risk level on mount. If no `latestVisit`, the entire status section (Section 2) is hidden — no default tab shown.

---

## UI Sections

### Header

- Background: `linear-gradient(180deg, #FFFFFF 0%, #F1F7FE 100%)` with bottom shadow
- Eyebrow pill: heart-activity icon + "Pemantauan Kesehatan Bunda" — blue tint background (`#E7F2FB`), blue text (`#1178D4`)
- `h1`: "Status" — 24px, semibold
- Subtitle: "Ringkasan kondisi terkini Bunda dari hasil pengukuran di posyandu. Data diperbarui setiap kunjungan rutin — Bunda tidak perlu mengisi sendiri."

---

### Section i — IMT Awal Kehamilan

Label: numbered badge "i" + "Profil IMT Awal Kehamilan"

**If `profile` is null:** placeholder card — "Profil IMT belum tersedia. Kunjungi posyandu untuk pengukuran awal."

**If `profile` exists:**

3-column grid:
| BB Pra-hamil | Tinggi | IMT |
|---|---|---|
| `{bbPrepregnancyKg} kg` | `{heightCm} cm` | `{imtPrepregnancy}` |

Below grid:
- Category badge using `imtCategory`:
  - `normal` → green tint (`#E7F7EF` bg, `#0E6B3E` text): "Normal"
  - `underweight` → amber tint: "Kurang"
  - `overweight` → amber tint: "Lebih"
  - `obese` → red tint: "Obesitas"
- Target text: "Target kenaikan total **{targetGainMinKg}–{targetGainMaxKg} kg** · sekitar {weeklyGainMinKg}–{weeklyGainMaxKg} kg/minggu"

---

### Section 1 — Hasil Pengukuran Terakhir

Label: numbered badge "1" + "Hasil Pengukuran Terakhir"

**If `latestVisit` is null:** placeholder card — "Belum ada data pengukuran dari posyandu."

**If `latestVisit` exists:**

Header row:
- Left: calendar icon + date formatted as `dd MMM yyyy` in `id-ID` locale
- Right: pin icon + "Kunjungan Posyandu" badge (posyandu name not in schema → generic label)

3-column grid:
| BB Sekarang | LILA | Hb |
|---|---|---|
| `{currentWeightKg} kg` | `{lilaCm} cm` | `{hbGdl} g/dL` |
| `+{weightGainKg} kg dari awal` | badge: lila ≥ 23.5 → "Normal" (green), lila < 23.5 → "Kurang" (red) | badge: hb ≥ 11 → "Normal" (green), hb 10–10.9 → "Rendah" (amber), hb < 10 → "Sangat Rendah" (red) |

Footer note: checkmark icon + "Data diukur oleh kader saat kunjungan. Lihat tren lengkap berat badan di halaman Beranda."

---

### Section 2 — Status Kondisi Anda

Only rendered if `latestVisit` exists.

Label: numbered badge "2" + "Status Kondisi Anda"

#### Preview toggle (Option B — keep for educational browsing)

3-tab segmented control:
- Rendah (green dot when active)
- Sedang (amber dot when active)
- Tinggi (red dot when active)

On mount: active tab = computed risk level. User can tap any tab to preview that state.

#### Zone bar card

Gradient track: `linear-gradient(90deg, #1E9E62 0 33%, #F2B705 33% 66%, #E0524E 66% 100%)`

Animated white circle marker positioned at:
- `rendah` → 16%
- `sedang` → 50%
- `tinggi` → 83%

Marker border color: green / amber / red per zone. Transition: CSS `transition: left 0.55s cubic-bezier(0.22, 0.61, 0.36, 1)` via inline style.

Zone labels below bar: "Aman" / "Perlu Perhatian" / "Risiko Tinggi" — inactive zones dim to 40% opacity.

#### Verdict block

Icon (40×40 rounded) + text:
- `rendah`: green bg, checkmark icon; label "Risiko Rendah · Status Aman"
- `sedang`: amber bg, warning triangle icon; label "Risiko Sedang · Status Perlu Perhatian"
- `tinggi`: red bg, flame icon; label "Risiko Tinggi · Status Risiko Tinggi"

---

### Education card (per risk level)

Rendered below verdict, inside a card with gradient background and colored border.

Colors:
- `rendah`: white → `#E7F7EF` gradient, `#C3E9D4` border
- `sedang`: white → `#FFF7E6` gradient, `#F4E2BC` border
- `tinggi`: white → `#FEF1F1` gradient, `#F6D2D2` border

Content structure per level (text verbatim from CekRisiko.html):

**rendah:**
- Lead paragraph: "Hasil pemeriksaan hari ini menunjukkan kehamilanmu dalam kondisi baik..."
- h3 + paragraph: Apa itu risiko rendah
- h3 + bullet list: Hal yang perlu terus kamu jaga (4 items)
- h3 + paragraph: Hal yang perlu diwaspadai
- Callout "Ingat ya": lightbulb icon, green colors
- Action: "Lihat Tugas Harian" (ghost button → `/ibu/tugas`)

**sedang:**
- Lead paragraph: "Hasil pemeriksaan hari ini menunjukkan kehamilanmu masuk kategori risiko sedang..."
- h3 + paragraph: Apa itu risiko sedang
- h3 + bullet list (with bold lead per item): 3 risk factors with explanations
- h3 + bullet list: 3 action items
- Callout "Ingat ya": lightbulb icon, amber colors
- Actions: "Lihat Tugas Harian" (primary blue) + "Cari Faskes Terdekat" (ghost)

**tinggi:**
- Lead paragraph: "Hasil pemeriksaan menunjukkan kehamilanmu masuk kategori risiko tinggi stunting..."
- h3 + paragraph: Apa itu risiko tinggi
- h3 + paragraph: Kenapa ini perlu ditangani cepat
- h3 + bullet list (with bold lead per item): 3 actions in 3 days
- **Danger box**: red tinted card, siren icon, "Tanda bahaya yang harus langsung ke IGD", 6 items in 2-column grid
- Callout "Ingat ya": heart icon, red colors
- Actions: "Cari Faskes Terdekat" (red gradient) + "Lihat Tugas Harian" (ghost)

---

## Color tokens (from design)

```
--green-700: #1178D4
--green-tint: #E7F2FB
--green-mint: #F1F7FE
--ok: #1E9E62 / --ok-tint: #E7F7EF / --ok-line: #C3E9D4 / --ok-deep: #0E6B3E
--amber: #D99100 / --amber-tint: #FFF7E6 / --amber-line: #F4E2BC / --amber-deep: #8A6100
--red: #DC2626 / --red-tint: #FEF1F1 / --red-line: #F6D2D2 / --red-deep: #9F1C1C
--ink: #1F2937 / --muted: #697079 / --faint: #989DA3
--page: #E7ECF1 / --card: #FFFFFF
```

---

## Constraints

- "Cari Faskes Terdekat" button links to `#` (no faskes feature yet)
- Posyandu name not in schema → generic "Kunjungan Posyandu" label
- The preview toggle is for educational browsing; the initial state always reflects actual computed risk
- No input fields — this page is fully read-only for the ibu
