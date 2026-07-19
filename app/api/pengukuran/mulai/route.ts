import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { sesiPengukuran, device } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deviceId, kategori, anakId, ibuId, lilaCm, hbGdl } = body;

    if (kategori !== "anak" && kategori !== "ibu") {
      return NextResponse.json({ success: false, error: "kategori harus 'anak' atau 'ibu'" }, { status: 400 });
    }

    const id = deviceId || "esp32-01";

    // Ensure device exists to prevent foreign key constraint violation
    const existingDevice = await db.query.device.findFirst({
      where: eq(device.id, id)
    });

    if (!existingDevice) {
      await db.insert(device).values({
        id: id,
        nama: "Alat ESP32",
      });
    }

    const newSession = await db.insert(sesiPengukuran).values({
      deviceId: id,
      kategori,
      anakId: kategori === "anak" ? anakId : null,
      ibuId: kategori === "ibu" ? ibuId : null,
      lilaCm: kategori === "ibu" ? lilaCm : null,
      hbGdl: kategori === "ibu" ? hbGdl : null,
    }).returning({ id: sesiPengukuran.id });

    return NextResponse.json({ success: true, sessionId: newSession[0].id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
