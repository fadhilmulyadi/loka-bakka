/** Usia kandungan dalam minggu; `at` untuk menghitung pada tanggal kunjungan lampau. */
export function calculateGestationalAge(hpht: Date, at: Date = new Date()): number {
  const diffInMs = at.getTime() - hpht.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  return Math.floor(diffInDays / 7);
}

export function calculateHPL(hpht: Date): Date {
  const hpl = new Date(hpht);
  hpl.setDate(hpl.getDate() + 280);
  return hpl;
}

export const MONTHS_ID = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", 
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];
