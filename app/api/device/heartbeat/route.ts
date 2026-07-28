import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { device, sesiPengukuran } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== process.env.ESP32_API_KEY) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const id = body.device_id || body.deviceId;
    
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing device_id" }, { status: 400 });
    }

    // Upsert the device (update lastSeen, or create if not exists)
    const existing = await db.query.device.findFirst({
      where: eq(device.id, id)
    });

    if (existing) {
      await db.update(device)
        .set({ lastSeen: new Date() })
        .where(eq(device.id, id));
    } else {
      await db.insert(device).values({
        id: id,
        nama: "Alat ESP32", // Default name
        lastSeen: new Date(),
      });
    }

    // Struk hasil input manual dititipkan di sini oleh savePengukuran. Job baru
    // dilepas kalau alat mengaku sedang diam di menu (siap_cetak), karena
    // mencetak butuh mematikan WiFi dan tidak boleh memotong pengukuran yang
    // sedang jalan. Dilepas sekali: statusnya langsung ditutup supaya heartbeat
    // berikutnya tidak mencetak struk yang sama dua kali.
    if (body.siap_cetak === true) {
      const job = await db.query.sesiPengukuran.findFirst({
        where: and(eq(sesiPengukuran.deviceId, id), eq(sesiPengukuran.statusHasil, "cetak")),
        orderBy: [asc(sesiPengukuran.createdAt)],
      });
      if (job) {
        await db.update(sesiPengukuran)
          .set({ statusHasil: "selesai" })
          .where(eq(sesiPengukuran.id, job.id));

        return NextResponse.json({
          success: true,
          cetak: {
            namaPasien: job.namaPasien,
            tanggal: job.createdAt.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
            bb: job.nilaiBerat,
            tb: job.nilaiTinggi,
            kategoriHasil: job.kategoriHasil,
            teksEdukasi: job.teksEdukasi,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
