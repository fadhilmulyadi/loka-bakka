import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { sesiPengukuran } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

// Dipanggil web saat kader menutup modal atau pindah ke tab Manual. Ini jalur
// kerapian; pengaman sebenarnya ada di batas umur sesi di /api/device/selesai,
// yang tetap jalan waktu pembatalan ini tidak pernah terkirim.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    await db.update(sesiPengukuran)
      .set({ statusHasil: "batal" })
      .where(and(
        eq(sesiPengukuran.id, sessionId),
        eq(sesiPengukuran.statusHasil, "menunggu"), // sesi yang sudah selesai jangan disentuh
      ));

    return NextResponse.json({ success: true });
  } catch (error) {
    const pesan = error instanceof Error ? error.message : "Gagal membatalkan sesi";
    return NextResponse.json({ success: false, error: pesan }, { status: 500 });
  }
}
