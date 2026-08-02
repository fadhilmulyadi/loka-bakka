export type DailyTaskDef = {
  id: number
  icon: string
  name: string
  note: string
  pts: number
}

export const PREGNANCY_TASKS: DailyTaskDef[] = [
  {
    id: 0,
    icon: 'makan',
    name: 'Makan sesuai gizi seimbang',
    note: 'Semua unsur terpenuhi: makanan pokok, protein hewani, protein nabati, sayur, dan buah, termasuk makanan tambahan atau porsi ekstra sesuai kondisi Ibu.',
    pts: 40,
  },
  {
    id: 1,
    icon: 'fe',
    name: 'Minum Tablet Tambah Darah (TTD)',
    note: '1 tablet diminum sesuai jadwal hari itu. TTD umumnya sudah kombinasi zat besi + asam folat, jadi satu tablet memenuhi kebutuhan keduanya.',
    pts: 25,
  },
  {
    id: 2,
    icon: 'air',
    name: 'Minum air putih cukup',
    note: 'Tercapai 8–12 gelas (2–3 liter) dalam sehari.',
    pts: 15,
  },
  {
    id: 3,
    icon: 'aktivitas',
    name: 'Menjaga aktivitas & istirahat',
    note: 'Beraktivitas ringan dan istirahat yang cukup sama-sama terpenuhi.',
    pts: 15,
  },
  {
    id: 4,
    icon: 'kebersihan',
    name: 'Menjaga kebersihan diri',
    note: 'Cuci tangan pakai sabun sebelum makan, mandi dan gosok gigi minimal 2x sehari.',
    pts: 5,
  },
]

export const CHILD_TASKS: DailyTaskDef[] = [
  {
    id: 0,
    icon: 'gizi',
    name: 'Beri ASI, MPASI, atau makanan bergizi sesuai usia',
    note: 'ASI eksklusif untuk bayi 0–6 bulan, MPASI bertahap sesuai tekstur usia untuk 6–24 bulan, dan makanan keluarga bergizi seimbang untuk usia 2–5 tahun.',
    pts: 40,
  },
  {
    id: 1,
    icon: 'suplemen',
    name: 'Beri suplemen sesuai usia dan anjuran petugas',
    note: 'Vitamin A, multivitamin, atau suplemen lain sesuai jadwal dan dosis anjuran posyandu atau puskesmas. Bayi 0–5 bulan cukup ASI eksklusif tanpa suplemen tambahan.',
    pts: 20,
  },
  {
    id: 2,
    icon: 'kebersihan',
    name: 'Jaga kebersihan anak dan lingkungannya',
    note: 'Cuci tangan sebelum menyuapi, jaga kebersihan peralatan makan, dan rawat sanitasi lingkungan rumah.',
    pts: 20,
  },
  {
    id: 3,
    icon: 'stimulasi',
    name: 'Ajak anak bergerak aktif dan stimulasi sesuai usianya',
    note: 'Tummy time untuk bayi, bermain motorik untuk batita, dan aktivitas fisik ringan untuk anak.',
    pts: 10,
  },
  {
    id: 4,
    icon: 'tidur',
    name: 'Pastikan anak tidur cukup sesuai usianya',
    note: 'Bayi 0–12 bulan 12–16 jam, batita 1–2 tahun 11–14 jam, anak 3–5 tahun 10–13 jam.',
    pts: 10,
  },
]

export function sumTaskPoints(tasks: DailyTaskDef[], taskId: number) {
  return tasks.find(t => t.id === taskId)?.pts ?? 0
}

export function getTodayRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  return { start, end }
}
