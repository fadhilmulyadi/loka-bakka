# Design: Daftarkan Ibu (Register Mother)

**Date:** 2026-06-05
**Scope:** Kader mendaftarkan ibu baru, ibu bisa login, dan dashboard ibu menangani state tidak hamil.

---

## Latar Belakang

Sistem sebelumnya hanya punya `/kader/tambah-anak` yang secara implisit membuat akun `Ibu` bersamaan dengan anak. Ini menimbulkan masalah:

1. `Anak` tidak bisa ada tanpa `Ibu` di database, tapi tidak ada alur resmi untuk daftarkan ibu lebih dulu.
2. Dashboard ibu mengasumsikan `PregnancyProfile` selalu ada — crash/kosong kalau ibu tidak hamil.
3. Tidak ada tempat yang jelas bagi kader untuk mendaftarkan ibu yang datang tanpa anak (misalnya ibu hamil pertama kali).

**Keputusan desain:**
- `Ibu` = semua ibu (hamil atau tidak), bukan hanya ibu hamil.
- Ibu selalu didaftarkan **lebih dulu** sebelum anak ditambahkan.
- Anak didaftarkan dari **profil ibu**, bukan dari entry point terpisah.
- Kader yang mendaftarkan semua pasien — tidak ada self-register.
- Akun ibu menggunakan **username + password** (bukan PIN).

---

## Alur Registrasi

```
[Rekap Pasien /kader/rekap]
  → tombol "Tambah Pasien"
      ↓
[/kader/tambah-pasien]
  Form daftarkan ibu baru
  → submit → Ibu dibuat di DB
      ↓
[/kader/ibu/[id]]
  Profil ibu — kader bisa lihat data ibu
  → tombol "Tambah Anak"
      ↓
[/kader/ibu/[id]/tambah-anak]
  Form tambah anak — ibuId sudah diketahui dari URL
  → submit → Anak dibuat, linked ke ibu
      ↓
[/kader/ibu/[id]]
  Kembali ke profil, anak sudah muncul di daftar
```

---

## Struktur Route Baru

| Route | Keterangan |
|---|---|
| `/kader/tambah-pasien` | Form daftarkan ibu baru |
| `/kader/ibu/[id]` | Profil ibu (data ibu + daftar anak) |
| `/kader/ibu/[id]/tambah-anak` | Form tambah anak, ibuId dari URL params |

Route `/kader/tambah-anak` yang lama **tidak diubah** — tetap berfungsi seperti sebelumnya.

---

## 1. Halaman `/kader/tambah-pasien`

### Form Fields

| Field | Status | Keterangan |
|---|---|---|
| Nama lengkap | Wajib | |
| Username | Wajib | Kader yang tentukan, harus unik di DB |
| Password | Wajib | Kader set, diberikan ke ibu, di-hash bcrypt |
| No. HP | Opsional | |
| Tanggal lahir | Opsional | |
| Alamat | Opsional | |

### Validasi
- Username: tidak boleh mengandung spasi, harus unik (cek real-time atau saat submit)
- Password: minimal 6 karakter
- Nama: tidak boleh kosong

### Setelah Submit
- Redirect ke `/kader/ibu/[id]` profil ibu yang baru dibuat
- Tampilkan notifikasi sukses: "Ibu berhasil didaftarkan"

### UI Style
- Mengikuti pola yang sama dengan `/kader/tambah-anak`: topbar, breadcrumb, form kiri + preview card kanan, sticky submit button

---

## 2. Server Action `createIbu()`

**File:** `lib/actions/kader.ts`

```
Input:
  nama: string
  username: string
  password: string
  noHp?: string
  tanggalLahir?: string
  alamat?: string

Proses:
  1. Auth check — hanya kader yang boleh
  2. Cek username unik di tabel Ibu
  3. Hash password dengan bcrypt (salt rounds: 10)
  4. Buat record Ibu dengan posyanduId dari session kader

Output:
  { id: string, nama: string, username: string }
```

---

## 3. Halaman `/kader/ibu/[id]` (Profil Ibu)

Halaman baru. Menampilkan:
- Header: nama ibu, username, posyandu
- Section "Informasi": no HP, tanggal lahir, alamat
- Section "Anak": daftar anak ibu ini (kosong jika belum ada), tombol "Tambah Anak"
- Section "Kehamilan": status aktif/tidak aktif (diimplementasikan di iterasi berikutnya)

---

## 4. Fix Dashboard Ibu (Non-Pregnant State)

**File:** `app/ibu/dashboard/page.tsx`

Sekarang dashboard crash/kosong kalau `PregnancyProfile` tidak ada. Perbaikan:

| Kondisi | Yang Ditampilkan |
|---|---|
| Tidak hamil (tidak ada PregnancyProfile) | Welcome card + "Anak Saya" (kosong jika belum ada anak) — tanpa section kehamilan |
| Hamil (ada PregnancyProfile) | Tampilan pregnancy dashboard yang ada sekarang |

Perubahan di `getIbuData()`: kembalikan field `isPregnant: boolean` berdasarkan ada/tidaknya `PregnancyProfile`.

---

## Skema Database

Tidak ada perubahan skema. Model `Ibu` yang ada sudah mendukung semua kebutuhan:
- `username` + `pin` (field `pin` dipakai untuk menyimpan password yang di-hash)
- `PregnancyProfile` bersifat opsional (`?`)
- Relasi `Anak[]` sudah ada

> **Catatan:** Field `pin` di model `Ibu` digunakan untuk menyimpan password yang di-hash. Nama field tidak diubah di iterasi ini untuk menghindari migrasi skema — bisa di-rename di iterasi berikutnya.

---

## Yang Tidak Termasuk Scope Ini

- Registrasi anak dari `/kader/ibu/[id]/tambah-anak` (route dibuat tapi koneksi form ke ibuId diimplementasikan di iterasi berikutnya)
- Aktivasi profil kehamilan untuk ibu
- Edit/hapus data ibu
- Self-register ibu

---

## Urutan Implementasi

1. Server action `createIbu()` + validasi username unik
2. Halaman `/kader/tambah-pasien` (form + submit)
3. Halaman `/kader/ibu/[id]` (profil ibu dasar — nama, info, daftar anak kosong, tombol "Tambah Anak" placeholder)
4. Fix `getIbuData()` + dashboard ibu untuk non-pregnant state
5. Tombol "Tambah Pasien" di `/kader/rekap`

> `/kader/ibu/[id]/tambah-anak` **tidak termasuk scope ini** — diimplementasikan di iterasi berikutnya.
