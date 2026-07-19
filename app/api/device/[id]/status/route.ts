import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { device } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing device id" }, { status: 400 });
    }

    const dev = await db.query.device.findFirst({
      where: eq(device.id, id)
    });

    if (!dev) {
      return NextResponse.json({ success: true, status: "terputus" });
    }

    const lastSeenTime = dev.lastSeen ? new Date(dev.lastSeen).getTime() : 0;
    const now = Date.now();
    const diffSeconds = (now - lastSeenTime) / 1000;

    // if last heartbeat was less than 15 seconds ago
    if (diffSeconds < 15) {
      return NextResponse.json({ success: true, status: "terhubung" });
    } else {
      return NextResponse.json({ success: true, status: "terputus" });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
