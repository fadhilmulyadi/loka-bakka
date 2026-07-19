// Working area: 9 kelurahan of Kecamatan Tamalanrea, matching public/tamalanrea.geojson `kel_desa`.
export const KELURAHAN_LIST = [
  { nama: "Bira", lat: -5.11, lng: 119.49 },
  { nama: "Buntusu", lat: -5.12, lng: 119.50 },
  { nama: "Kapasa", lat: -5.11, lng: 119.48 },
  { nama: "Kapasa Raya", lat: -5.12, lng: 119.48 },
  { nama: "Lakkang", lat: -5.10, lng: 119.47 },
  { nama: "Parang Loe", lat: -5.10, lng: 119.49 },
  { nama: "Tamalanrea", lat: -5.13, lng: 119.49 },
  { nama: "Tamalanrea Indah", lat: -5.14, lng: 119.49 },
  { nama: "Tamalanrea Jaya", lat: -5.14, lng: 119.50 },
] as const

export type KelurahanName = (typeof KELURAHAN_LIST)[number]["nama"]

export const KELURAHAN_NAMES: readonly string[] = KELURAHAN_LIST.map((k) => k.nama)
