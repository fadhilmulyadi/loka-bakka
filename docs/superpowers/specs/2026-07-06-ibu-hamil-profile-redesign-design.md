# Ibu Hamil Profile Page Redesign

## Context

`app/kader/ibu/[id]/page.tsx` currently uses an older card layout (identity card + status summary card side by side, then a weight chart, then a 2-column children/history grid). The child profile page (`app/kader/anak/[id]/page.tsx`) was recently rebuilt with a hero header + stat tiles + nested table pattern. This spec redesigns the pregnant-mother (`isHamil === true`) view of the ibu profile page to follow that same visual pattern. The non-pregnant (`isHamil === false`) view is unchanged — out of scope.

## Layout

### 1. Hero header card

Full-width card, same shape as the child page's hero card:

- Circular avatar, `bg-[#F0EBFB]`, text `#6A48C4`, initials from `ibu.nama` (same sizing as child hero avatar, 52px).
- Name (`ibu.nama`) with two inline badges:
  - "Ibu Hamil" badge: pill, `bg-[#F0EBFB]` / text `#6A48C4`.
  - Status badge via existing `<StatusBadge status={...} />` (`components/status-badge.tsx`), value = `"Normal"` if latest pregnancy visit `isOnTrack` else `"Waspada"` (defaults to `"Normal"` when no visits yet).
- Subtext line: `No. Hp: {ibu.noHp || "—"} · Akun: {ibu.username}`
- Actions (right-aligned), same order/style as child hero:
  - **Periksa Kehamilan** — gradient primary button, `<Link href="/kader/ibu/[id]/catat-kunjungan">` (existing route, unchanged).
  - **Edit Data** — outline button, UI stub (no `onClick`/route yet).
  - **⋮** dot menu button — icon-only circular button, UI stub (no menu wired yet), same SVG dot icon as child hero's dot button.

Only rendered when `ibu.isHamil` is true. When false, keep today's existing identity-card branch as-is (no changes).

### 2. Kehamilan Aktif card

`lg:col-span-2` card (left column of a 2-col grid, mirrored from child page's left/right split).

**Header row:** title "Kehamilan Aktif" + purple trimester badge (`bg-[#F0EBFB]`/text `#6A48C4`, e.g. "Trimester 2", computed via existing `calculateGestationalAge` — trimester = age ≤ 13 ? 1 : age ≤ 27 ? 2 : 3) + right-aligned **Akhiri Kehamilan** button (red outline, transparent background, red text — UI stub, no `onClick`).

**Inside the same `CardContent` (not separate top-level cards):**

a. Grid of 4 stat tiles, same tile styling as child page (`bg-white rounded-2xl shadow-[2px_2px_8px_rgba(0,0,0,0.08)] py-3.5 px-4`):
   - **USIA KANDUNGAN** — `{gestationalAge} mgg`, sub: `HPL {formatted HPL date}` (via `calculateHPL`)
   - **BB TERAKHIR** — latest visit `currentWeightKg`, delta vs previous visit (▲/▼ + kg, green/red) — same delta pattern as child's BB/TB tiles
   - **LILA** — latest visit `lilaCm`, sub: "Normal (≥ 23,5)" in green if `lilaCm >= 23.5` else "Perlu Perhatian" in red/amber
   - **HEMOGLOBIN** — latest visit `hbGdl`, sub: "Normal (≥ 11)" in green if `hbGdl >= 11` else "Perlu Perhatian"
   - All 4 show `"—"` placeholders gracefully when there are no visits yet.

b. History table directly below the tiles, inside the same card (matches child page's "Riwayat Pengukuran" table styling):
   - Columns: **Tanggal, BB, LILA, Hb, Status, Kader**
   - Status column uses `<StatusBadge status={visit.isOnTrack ? "Normal" : "Waspada"} />`
   - Kader column shows `visit.kader?.nama ?? "—"` (see schema change below)
   - Empty state row when no visits recorded yet.

### 3. Anak Terdaftar card

`lg:col-span-2` (left column, below Kehamilan Aktif), reusing the exact list-item styling from the child page's "Saudara Terdaftar" card:

- Header: title "Anak Terdaftar" + **+ Tambah Anak** link (→ existing `/kader/ibu/[id]/tambah-anak` route) in the header, right-aligned.
- List rows: colored avatar square (blue/pink by `jenisKelamin`, same as old page's children list), name (links to `/kader/anak/[id]`), subtext `{jenisKelamin === 'L' ? 'L' : 'P'} · {ageMonths} bln · {latest statusTBU}`, "Lihat →" link on the right.
- Empty state (no children) reuses existing icon/message pattern from the old page.

### 4. Akun Aplikasi Ibu card

Right column card:

- Header: "Akun Aplikasi Ibu"
- Rows: **Username** (`ibu.username`), **Status** (`<StatusBadge>`-style Aktif/Non-aktif badge driven by new `ibu.isActive` field — green "Aktif" / gray-red "Non-aktif")
- **Reset Password** button below, full-width, same stub style as the child page's "Reset Password Akun" button (no `onClick`).

## Data / Schema Changes

1. `prisma/schema.prisma`:
   - `Ibu`: add `isActive Boolean @default(true)`
   - `PregnancyVisit`: add `kaderId String?` + relation `kader Kader? @relation(fields: [kaderId], references: [id])`
   - `Kader`: add back-relation `pregnancyVisits PregnancyVisit[]`
2. Run `prisma migrate dev` to generate the migration and regenerate the client.
3. `lib/actions/pregnancy.ts` (`savePregnancyVisit`): pass `kaderId: session.user.id` when creating the `PregnancyVisit` row.
4. `lib/actions/kader.ts` (`getIbuById`): include `kader: { select: { nama: true } }` on the `pregnancyVisits` include so the table can render the recorder's name.
5. The pre-existing `pregnancyVisit.create` inside `createIbu` (first-visit-at-registration path, `lib/actions/kader.ts` ~line 667) is left with `kaderId` unset (nullable) — not in scope to backfill.

## Explicitly Out of Scope

- Making **Akhiri Kehamilan**, **Edit Data**, **⋮** menu, and **Reset Password** functional — all remain UI stubs, consistent with the child page's current "Reset Password Akun" stub.
- Any change to the non-pregnant (`isHamil === false`) branch of the ibu profile page.
- Any change to the existing `catat-kunjungan` page/flow.
- Backfilling `kaderId` for historical `PregnancyVisit` rows.
