import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { device } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
