import type { Metadata, Viewport } from "next";
import { Inter_Tight } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { cn } from "@/lib/utils";

const interTight = Inter_Tight({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Loka Bakka - Sistem Informasi Posyandu",
  description: "Sistem Informasi Posyandu Terintegrasi untuk pemantauan kesehatan ibu dan anak",
  appleWebApp: { capable: true, title: "Loka Bakka", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#649E97",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", interTight.variable, "font-sans")}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        {/* installability + push; no bundle cost vs a client component */}
        <script
          dangerouslySetInnerHTML={{
            __html: `navigator.serviceWorker&&navigator.serviceWorker.register('/sw.js')`,
          }}
        />
      </body>
    </html>
  );
}
