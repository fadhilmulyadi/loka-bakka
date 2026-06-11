# Design: Child Context Navigation

**Date:** 2026-06-11  
**Status:** Approved

## Problem

Ketika ibu menekan card anak di `/ibu/anak`, tidak ada navigasi ke tampilan child-specific. User ingin tab bar otomatis berubah ke child context (Beranda/Edukasi/Status/Tugas/Profil sesuai anak yang dipilih), bukan membuka halaman terpisah.

## Approach

`IbuNavWrapper` — single client component di ibu layout yang switch antara `IbuBottomNav` ↔ `ChildBottomNav` berdasarkan `usePathname()`. Route structure: `/ibu/child/[id]/{dashboard,edukasi,status,tugas}`.

## Changes

### 1. Cleanup
- **Hapus**: `app/ibu/anak/[id]/page.tsx` (old detail page approach)
- **Update**: card di `app/ibu/anak/page.tsx` navigate ke `/ibu/child/${anak.id}/dashboard`

### 2. `components/ibu-nav-wrapper.tsx` (NEW, client)
Check `usePathname()`:
- Path includes `/ibu/child/` → render `<ChildBottomNav childId={params.id} />`
- Otherwise → render `<IbuBottomNav />`

### 3. `app/ibu/layout.tsx` (MODIFY)
Replace `<IbuBottomNav />` dengan `<IbuNavWrapper />`. Layout tetap server component.

### 4. `components/child-bottom-nav.tsx` (NEW, client)
Sama persis dengan `IbuBottomNav` (style, spacing), tapi routes ke:
- Beranda → `/ibu/child/${childId}/dashboard`
- Edukasi → `/ibu/child/${childId}/edukasi`
- Status → `/ibu/child/${childId}/status`
- Tugas → `/ibu/child/${childId}/tugas`
- Profil → `/ibu/akun` (exit child context — ibu nav otomatis kembali)

### 5. Child pages (NEW)

**`app/ibu/child/[id]/dashboard/page.tsx`**
- Fetch: `getIbuAnakDetail(id)`
- Show: avatar + nama + usia, badge status gizi, BB/TB/Z-Score terkini, tanggal ukur terakhir
- Empty state jika belum ada pengukuran

**`app/ibu/child/[id]/edukasi/page.tsx`**
- Render: `<ChildEducationView />` (no props, no child-specific logic)

**`app/ibu/child/[id]/status/page.tsx`**
- Fetch: `getIbuAnakDetail(id)`
- Show: AreaChart BB over time + riwayat pengukuran list cards
- Reuse visual pattern dari old `/ibu/anak/[id]` page (chart + history)

**`app/ibu/child/[id]/tugas/page.tsx`**
- Render: `<ChildTasksView />` (handles own data fetching)

## Security
`getIbuAnakDetail` sudah punya ownership check (`ibuId === session.user.id`). Jika ibu coba akses child milik orang lain via URL, server action return null dan page tampilkan "Data tidak ditemukan".

## Out of Scope
- Modifikasi `ChildDashboardView`, `ChildEducationView`, `ChildTasksView` existing
- Child profil page terpisah (Profil tab langsung ke `/ibu/akun`)
