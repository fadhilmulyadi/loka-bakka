import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Loka Bakka - Sistem Informasi Posyandu",
    short_name: "Loka Bakka",
    description: "Sistem Informasi Posyandu Terintegrasi untuk pemantauan kesehatan ibu dan anak",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#649E97",
    lang: "id",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
