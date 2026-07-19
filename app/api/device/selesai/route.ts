import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { sesiPengukuran, anak, ibu } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { calcHeightZScore, stuntingLabel, stuntingEdukasi } from "@/lib/growth-standards/stunting-calc";
import {
  hitungSkorKuesioner,
  hitungSkorGabungan,
  edukasiIbu,
  type JawabanKuesioner,
  type ImtCategory,
} from "@/lib/growth-standards/risiko-kehamilan-calc";

const LABEL_ANAK: Record<string, string> = {
  Normal: "NORMAL",
  "Risiko Stunting": "PENDEK",
  Stunting: "SANGAT PENDEK",
}

export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== process.env.ESP32_API_KEY) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { device_id, kategori, bb, tb, jawaban } = body;

    if (!device_id || (kategori !== "anak" && kategori !== "ibu") || bb === undefined || tb === undefined) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const sesi = await db.query.sesiPengukuran.findFirst({
      where: and(eq(sesiPengukuran.deviceId, device_id), eq(sesiPengukuran.statusHasil, "menunggu")),
      orderBy: [desc(sesiPengukuran.createdAt)],
    });

    if (!sesi) {
      return NextResponse.json({ success: false, error: "Tidak ada sesi aktif" }, { status: 404 });
    }

    if (sesi.kategori !== kategori) {
      return NextResponse.json({ success: false, error: "Kategori tidak cocok dengan sesi aktif" }, { status: 409 });
    }

    const tanggal = new Date();
    const tanggalStr = tanggal.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

    let namaPasien = "";
    let kategoriHasil = "";
    let teksEdukasi = "";
    let skorAkhir: number | null = null;
    let skorKuesioner: number | null = null;

    if (kategori === "anak") {
      if (!sesi.anakId) {
        return NextResponse.json({ success: false, error: "Sesi tidak memiliki data anak" }, { status: 400 });
      }
      const anakRow = await db.query.anak.findFirst({ where: eq(anak.id, sesi.anakId) });
      if (!anakRow) {
        return NextResponse.json({ success: false, error: "Anak tidak ditemukan" }, { status: 404 });
      }
      const birthDate = new Date(anakRow.tanggalLahir);
      const ageMonths = (tanggal.getFullYear() - birthDate.getFullYear()) * 12 + (tanggal.getMonth() - birthDate.getMonth());
      const sex = anakRow.jenisKelamin as "L" | "P";
      const z = calcHeightZScore(Number(tb), ageMonths, sex);
      namaPasien = anakRow.nama;
      kategoriHasil = LABEL_ANAK[stuntingLabel[z.status]];
      teksEdukasi = stuntingEdukasi[z.status];
    } else {
      if (!sesi.ibuId || sesi.lilaCm == null || sesi.hbGdl == null) {
        return NextResponse.json({ success: false, error: "Sesi tidak memiliki data LILA/Hb" }, { status: 400 });
      }
      if (!jawaban) {
        return NextResponse.json({ success: false, error: "Jawaban kuesioner tidak ada" }, { status: 400 });
      }
      const ibuRow = await db.query.ibu.findFirst({
        where: eq(ibu.id, sesi.ibuId),
        with: { pregnancyProfile: true },
      });
      if (!ibuRow || !ibuRow.pregnancyProfile) {
        return NextResponse.json({ success: false, error: "Profil kehamilan tidak ditemukan" }, { status: 404 });
      }

      const kuesioner = hitungSkorKuesioner(jawaban as JawabanKuesioner);
      const gabungan = hitungSkorGabungan({
        imtCategory: ibuRow.pregnancyProfile.imtCategory as ImtCategory,
        lilaCm: sesi.lilaCm,
        hbGdl: sesi.hbGdl,
        kuesionerBand: kuesioner.band,
      });

      namaPasien = ibuRow.nama;
      kategoriHasil = gabungan.kategori;
      teksEdukasi = edukasiIbu[gabungan.kategori];
      skorAkhir = gabungan.skor;
      skorKuesioner = kuesioner.skor;
    }

    await db.update(sesiPengukuran).set({
      nilaiBerat: Number(bb),
      nilaiTinggi: Number(tb),
      jawaban: kategori === "ibu" ? (jawaban as JawabanKuesioner) : null,
      statusHasil: "selesai",
      kategoriHasil,
      teksEdukasi,
      namaPasien,
      skorAkhir,
      skorKuesioner,
    }).where(eq(sesiPengukuran.id, sesi.id));

    return NextResponse.json({
      success: true,
      namaPasien,
      bb: Number(bb),
      tb: Number(tb),
      kategoriHasil,
      teksEdukasi,
      tanggal: tanggalStr,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
