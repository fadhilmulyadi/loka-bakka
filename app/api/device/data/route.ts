import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { sesiPengukuran } from "@/lib/db/schema";
import { eq, and, or, desc } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== process.env.ESP32_API_KEY) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { device_id, jenis, nilai } = body;

    if (!device_id || !jenis || nilai === undefined) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const session = await db.query.sesiPengukuran.findFirst({
      where: and(
        eq(sesiPengukuran.deviceId, device_id),
        or(eq(sesiPengukuran.statusTinggi, "menunggu"), eq(sesiPengukuran.statusBerat, "menunggu"))
      ),
      orderBy: [desc(sesiPengukuran.createdAt)],
    });

    if (!session) {
      return NextResponse.json({ success: false, error: "Tidak ada sesi aktif" }, { status: 404 });
    }

    // Update session based on type
    const updateData: any = {};
    if (jenis === "tinggi") {
      updateData.statusTinggi = "selesai";
      updateData.nilaiTinggi = parseFloat(nilai);
    } else if (jenis === "berat") {
      updateData.statusBerat = "selesai";
      updateData.nilaiBerat = parseFloat(nilai);
    } else {
      return NextResponse.json({ success: false, error: "Invalid jenis, must be 'tinggi' or 'berat'" }, { status: 400 });
    }

    await db.update(sesiPengukuran)
      .set(updateData)
      .where(eq(sesiPengukuran.id, session.id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
