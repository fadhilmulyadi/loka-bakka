import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { sesiPengukuran, device } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deviceId } = body;

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
      statusTinggi: "menunggu",
      statusBerat: "menunggu",
    }).returning({ id: sesiPengukuran.id });

    return NextResponse.json({ success: true, sessionId: newSession[0].id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
