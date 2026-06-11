# Design: Halaman Detail Anak untuk Ibu

**Date:** 2026-06-11  
**Status:** Approved

## Problem

Halaman `/ibu/anak` menampilkan daftar anak tapi card tidak bisa ditekan. Ibu tidak bisa melihat detail pertumbuhan anak secara individual.

## Approach

Route baru `/ibu/anak/[id]` dengan server action baru yang scoped ke ibu yang login.

## Changes

### 1. Navigation — `app/ibu/anak/page.tsx`
- Wrap card `<div>` dengan `<Link href="/ibu/anak/[id]">`
- Tambah `<ChevronRight>` icon di card sebagai visual affordance

### 2. Server Action — `lib/actions/ibu.ts`
Fungsi `getIbuAnakDetail(id: string)`:
- Auth check: role harus `ibu`
- Security: query dengan filter `ibuId === session.user.id` — mencegah akses ke anak orang lain
- Returns: nama, tanggalLahir, jenisKelamin, anakKe, latest measurement (BB, TB, statusTBU, zScoreTBU, tanggal), semua riwayat pengukuran
- Returns `null` jika tidak ditemukan

### 3. New Page — `app/ibu/anak/[id]/page.tsx`
Layout mobile-first, mengikuti design language ibu portal:

- **Header**: back button ke `/ibu/anak`, judul "Profil Anak"
- **Identity mini**: avatar, nama, usia, jenis kelamin
- **Status gizi card**: badge status, BB, TB, Z-Score, tanggal ukur terakhir
- **Kurva BB**: AreaChart sederhana (titik BB aktual over time, tanpa WHO reference)
- **Riwayat pengukuran**: list cards (tanggal, usia, BB, TB, status badge)
- **States**: loading spinner, empty state jika belum ada pengukuran, redirect `/ibu/anak` jika anak tidak ditemukan / bukan milik ibu

## Security
Child ownership divalidasi di server — `prisma.anak.findFirst({ where: { id, ibuId: session.user.id } })` — tidak bisa dibypass dari client.
