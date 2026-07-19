# ESP32 Alat Ukur Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the ESP32 firmware (TFT screens, printer, WiFi) and the minimal backend/web changes needed so a kader can run a full anak/ibu-hamil measurement on the physical device and see the computed result on the web.

**Architecture:** ESP32 is a stateless, patient-agnostic kiosk (category chosen on-device). The web already creates a `sesiPengukuran` row when a kader opens a specific patient's modal; the device posts raw readings once (after values are stable) to a new finalize endpoint, which computes the result server-side and returns it for on-device display + printing. The web modal polls the same session and shows a confirm/Ulangi step before persisting.

**Tech Stack:** Next.js App Router route handlers, Drizzle ORM (Neon Postgres), React modals (existing), Arduino/ESP32 (TFT_eSPI, ArduinoJson, HTTPClient), raw ESC/POS over `Serial2`.

## Global Constraints

- Design source of truth: `docs/superpowers/specs/2026-07-19-esp32-alat-ukur-design.md` — every task below implements one part of it.
- No em dashes in any user-facing education text (device screen, receipt, web).
- Single device deployment: `device_id` is always the literal string `"esp32-01"`.
- Sensors (HX711 weight, HC-SR04 height) are stubbed behind `readWeightKg()`/`readHeightCm()` — do not wire real sensor code in this plan.
- No new npm test framework — verify TS changes with `npx tsc --noEmit` and manual `curl`/browser checks; verify firmware by opening the sketch in Arduino IDE (board **ESP32 Dev Module**; libraries **TFT_eSPI**, **ArduinoJson** v7) and confirming it compiles — there is no compiler available in this environment to run automatically.
- Printer is 58mm / 32-column, full ESC/POS (including `GS ( k` QR).
- Font on TFT is a placeholder using TFT_eSPI's bundled fonts — do not attempt to convert real Inter Tight font files.

---

## Task 1: Extend `sesiPengukuran` schema

**Files:**
- Modify: `lib/db/schema.ts:143-151` (the `sesiPengukuran` table) and `lib/db/schema.ts:215-217` (its relations, unchanged but re-check after edit)

**Interfaces:**
- Produces: new/changed columns on `sesiPengukuran` used by every later backend task: `kategori` (`"anak"|"ibu"`), `anakId`, `ibuId`, `lilaCm`, `hbGdl`, `jawaban` (typed jsonb), `statusHasil` (`"menunggu"|"selesai"`), `kategoriHasil`, `skorAkhir`, `skorKuesioner`, `teksEdukasi`, `namaPasien`. Drops `statusTinggi`/`statusBerat` (no longer needed — the device sends one final POST, not incremental fields).

- [ ] **Step 1: Replace the `sesiPengukuran` table definition**

Replace the existing block (currently `lib/db/schema.ts:143-151`) with:

```ts
export const sesiPengukuran = pgTable("SesiPengukuran", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  deviceId: text("deviceId").references(() => device.id),
  kategori: text("kategori").notNull().default("anak"), // 'anak' | 'ibu'
  anakId: text("anakId").references(() => anak.id),
  ibuId: text("ibuId").references(() => ibu.id),
  lilaCm: doublePrecision("lilaCm"),
  hbGdl: doublePrecision("hbGdl"),
  jawaban: jsonb("jawaban").$type<{
    protein: boolean
    fe: boolean
    pengetahuan: boolean
    sanitasi: boolean
    rokok: boolean
  }>(),
  nilaiTinggi: doublePrecision("nilaiTinggi"),
  nilaiBerat: doublePrecision("nilaiBerat"),
  statusHasil: text("statusHasil").notNull().default("menunggu"), // 'menunggu' | 'selesai'
  kategoriHasil: text("kategoriHasil"),
  skorAkhir: integer("skorAkhir"),
  skorKuesioner: doublePrecision("skorKuesioner"),
  teksEdukasi: text("teksEdukasi"),
  namaPasien: text("namaPasien"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
})
```

- [ ] **Step 2: Push the schema change to the database**

Run: `npm run db:push`
Expected: drizzle-kit reports the `SesiPengukuran` table altered (columns added/dropped) with no errors. If it asks about data loss on the dropped `statusTinggi`/`statusBerat` columns, accept — no production data depends on them yet.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors from `lib/db/schema.ts`. (Existing routes that reference `statusTinggi`/`statusBerat` will now error — that's expected; they get fixed in Task 3/4.)

- [ ] **Step 4: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat: extend sesiPengukuran schema for full ESP32 measurement flow"
```

---

## Task 2: Scoring library + status wording

**Files:**
- Create: `lib/growth-standards/risiko-kehamilan-calc.ts`
- Modify: `lib/growth-standards/stunting-calc.ts` (add an education-text export)
- Modify: `lib/status-styles.ts` (add badge colors for the device's result wording)
- Test: manual script run via `npx tsx` (no framework — see Step 2)

**Interfaces:**
- Produces: `hitungSkorKuesioner(jawaban): { skor: number, band: 'RENDAH'|'SEDANG'|'TINGGI' }`, `bandToPoin(band): number`, `hitungSkorGabungan(input): { skor: number, kategori: 'RENDAH'|'SEDANG'|'TINGGI' }`, `edukasiIbu: Record<'RENDAH'|'SEDANG'|'TINGGI', string>`, `JawabanKuesioner` type — all consumed by Task 4's finalize route.
- Produces: `stuntingEdukasi: Record<StuntingStatus, string>` on `stunting-calc.ts`, consumed by Task 4.

- [ ] **Step 1: Add education text to `stunting-calc.ts`**

Append to `lib/growth-standards/stunting-calc.ts` (after the existing `stuntingColor` export):

```ts
export const stuntingEdukasi: Record<StuntingStatus, string> = {
  normal: "Tinggi badan sesuai usia. Pertahankan gizi seimbang dan rutin timbang di posyandu tiap bulan.",
  risiko_stunting: "Terindikasi stunting. Konsultasikan dengan bidan/petugas gizi dan pantau ketat tiap bulan.",
  stunting: "Stunting berat. Segera rujuk ke puskesmas untuk pemeriksaan dan penanganan lanjutan.",
}
```

- [ ] **Step 2: Create `risiko-kehamilan-calc.ts`**

```ts
export type ImtCategory = "underweight" | "normal" | "overweight" | "obese"
export type KategoriRisiko = "RENDAH" | "SEDANG" | "TINGGI"

export interface JawabanKuesioner {
  protein: boolean     // true = "Ya" (makan gizi seimbang & protein hewani) -> TIDAK berisiko
  fe: boolean          // true = "Ya" (rutin minum tablet Fe) -> TIDAK berisiko
  pengetahuan: boolean // true = "Ya" (paham info kehamilan sesuai usia) -> TIDAK berisiko
  sanitasi: boolean    // true = "Ya" (TIDAK ada akses air bersih layak) -> berisiko
  rokok: boolean       // true = "Ya" (merokok/terpapar asap rokok) -> berisiko
}

export interface SkorKuesionerResult {
  skor: number // 0-16
  band: KategoriRisiko
}

export function hitungSkorKuesioner(jawaban: JawabanKuesioner): SkorKuesionerResult {
  const rokok = (jawaban.rokok ? 2 : 0) * 2
  const protein = (jawaban.protein ? 0 : 2) * 2
  const fe = (jawaban.fe ? 0 : 2) * 1.5
  const sanitasi = (jawaban.sanitasi ? 2 : 0) * 1.5
  const pengetahuan = (jawaban.pengetahuan ? 0 : 2) * 1

  const skor = rokok + protein + fe + sanitasi + pengetahuan
  const band: KategoriRisiko = skor <= 4 ? "RENDAH" : skor <= 10 ? "SEDANG" : "TINGGI"
  return { skor, band }
}

export function bandToPoin(band: KategoriRisiko): number {
  return band === "RENDAH" ? 0 : band === "SEDANG" ? 1 : 2
}

export interface SkorGabunganInput {
  imtCategory: ImtCategory
  lilaCm: number
  hbGdl: number
  kuesionerBand: KategoriRisiko
}

export interface SkorGabunganResult {
  skor: number // 0-8
  kategori: KategoriRisiko
}

export function hitungSkorGabungan(input: SkorGabunganInput): SkorGabunganResult {
  const imtPoin = input.imtCategory === "underweight" ? 2 : 0
  const lilaPoin = input.lilaCm < 23.5 ? 2 : 0
  const hbPoin = input.hbGdl < 10 ? 2 : 0
  const kuesionerPoin = bandToPoin(input.kuesionerBand)

  const skor = imtPoin + lilaPoin + hbPoin + kuesionerPoin
  const kategori: KategoriRisiko = skor <= 1 ? "RENDAH" : skor <= 5 ? "SEDANG" : "TINGGI"
  return { skor, kategori }
}

export const edukasiIbu: Record<KategoriRisiko, string> = {
  RENDAH: "Kondisi kehamilan Bunda baik. BB, Hb, dan LILA normal. Tetap minum tablet Fe, makan protein 3 kali sehari, dan rutin ke posyandu.",
  SEDANG: "Ada kondisi (Hb, BB, atau LILA) yang belum ideal. Segera hubungi kader/bidan minggu ini, rutin minum tablet Fe, dan penuhi target kenaikan BB.",
  TINGGI: "Beberapa faktor risiko muncul bersamaan. Bukan berarti janin pasti stunting, tapi perlu segera ditangani. Segera periksa ke puskesmas terdekat!",
}
```

- [ ] **Step 3: Manual verification script (no test framework in this repo)**

Create a throwaway file `scratch-verify-skoring.ts` at the repo root:

```ts
import { hitungSkorKuesioner, hitungSkorGabungan } from "./lib/growth-standards/risiko-kehamilan-calc"

// Semua jawaban baik -> skor 0 -> RENDAH
console.assert(hitungSkorKuesioner({ protein: true, fe: true, pengetahuan: true, sanitasi: false, rokok: false }).skor === 0)
console.assert(hitungSkorKuesioner({ protein: true, fe: true, pengetahuan: true, sanitasi: false, rokok: false }).band === "RENDAH")

// Semua jawaban buruk -> skor 16 -> TINGGI
const burukSemua = hitungSkorKuesioner({ protein: false, fe: false, pengetahuan: false, sanitasi: true, rokok: true })
console.assert(burukSemua.skor === 16, `expected 16, got ${burukSemua.skor}`)
console.assert(burukSemua.band === "TINGGI")

// Gabungan: underweight + LILA rendah + Hb rendah + kuesioner tinggi -> skor 8 -> TINGGI
const gabungan = hitungSkorGabungan({ imtCategory: "underweight", lilaCm: 20, hbGdl: 9, kuesionerBand: "TINGGI" })
console.assert(gabungan.skor === 8, `expected 8, got ${gabungan.skor}`)
console.assert(gabungan.kategori === "TINGGI")

// Gabungan: semua normal -> skor 0 -> RENDAH
const gabunganBaik = hitungSkorGabungan({ imtCategory: "normal", lilaCm: 25, hbGdl: 12, kuesionerBand: "RENDAH" })
console.assert(gabunganBaik.skor === 0)
console.assert(gabunganBaik.kategori === "RENDAH")

console.log("Semua asersi skoring lolos")
```

Run: `npx tsx scratch-verify-skoring.ts`
Expected output: `Semua asersi skoring lolos` with no assertion errors printed above it.

Then delete the scratch file: it is not part of the codebase.

- [ ] **Step 4: Add device-wording colors to `status-styles.ts`**

In `lib/status-styles.ts`, add these entries to `statusMap` (reusing the same colors as their existing synonyms):

```ts
  NORMAL:          { bg: "#E6F4EA", text: "#1E8E3E", dot: "#1E8E3E", border: "#DCFCE7" },
  PENDEK:          { bg: "#FFF4E5", text: "#B06000", dot: "#B06000", border: "#FEF3C7" },
  "SANGAT PENDEK": { bg: "#FCE8E6", text: "#D93025", dot: "#D93025", border: "#FEE2E2" },
  RENDAH:          { bg: "#E6F4EA", text: "#1E8E3E", dot: "#1E8E3E", border: "#DCFCE7" },
  SEDANG:          { bg: "#FFF4E5", text: "#B06000", dot: "#B06000", border: "#FEF3C7" },
  TINGGI:          { bg: "#FCE8E6", text: "#D93025", dot: "#D93025", border: "#FEE2E2" },
```

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit` — expect no errors from these three files.

```bash
git add lib/growth-standards/risiko-kehamilan-calc.ts lib/growth-standards/stunting-calc.ts lib/status-styles.ts
git commit -m "feat: add pregnancy risk scoring and device-result status colors"
```

---

## Task 3: Extend `POST /api/pengukuran/mulai`

**Files:**
- Modify: `app/api/pengukuran/mulai/route.ts` (entire file, currently 36 lines)

**Interfaces:**
- Consumes: `sesiPengukuran` columns from Task 1.
- Produces: request body contract `{ deviceId?, kategori: "anak"|"ibu", anakId?, ibuId?, lilaCm?, hbGdl? }` → `{ success: true, sessionId }`, consumed by Task 6/7 (web modals).

- [ ] **Step 1: Replace the route with the extended version**

```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` — expect no errors from this file.

- [ ] **Step 3: Manual verification against a running dev server**

Run: `npm run dev` (leave running), then in another terminal:

```bash
curl -X POST http://localhost:3000/api/pengukuran/mulai \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"esp32-01","kategori":"anak","anakId":"<an-existing-anak-id>"}'
```

Expected: `{"success":true,"sessionId":"<uuid>"}`. Also try omitting `kategori` — expect `{"success":false,"error":"kategori harus 'anak' atau 'ibu'"}` with HTTP 400.

- [ ] **Step 4: Commit**

```bash
git add app/api/pengukuran/mulai/route.ts
git commit -m "feat: accept kategori/patient/lila/hb when starting a measurement session"
```

---

## Task 4: Finalize endpoint (`POST /api/device/selesai`), remove old `/api/device/data`

**Files:**
- Create: `app/api/device/selesai/route.ts`
- Delete: `app/api/device/data/route.ts` (superseded — the device now sends one final POST instead of per-field updates)

**Interfaces:**
- Consumes: `hitungSkorKuesioner`, `hitungSkorGabungan`, `edukasiIbu`, `JawabanKuesioner` from Task 2's `risiko-kehamilan-calc.ts`; `stuntingEdukasi` from `stunting-calc.ts`; `calcHeightZScore`, `stuntingLabel` (already existing in `stunting-calc.ts`); `sesiPengukuran` schema from Task 1.
- Produces: request contract consumed by the firmware's `api.h` (Task 10):
  - Request: `POST /api/device/selesai`, header `x-api-key: <ESP32_API_KEY>`, body `{ device_id, kategori: "anak"|"ibu", bb, tb, jawaban? }` where `jawaban` is `{ protein, fe, pengetahuan, sanitasi, rokok }` (booleans), required only when `kategori === "ibu"`.
  - Response success: `{ success: true, namaPasien, bb, tb, kategoriHasil, teksEdukasi, tanggal }`.
  - Response failure: `{ success: false, error }` with status 400/401/404/409.

- [ ] **Step 1: Delete the old granular endpoint**

```bash
rm "app/api/device/data/route.ts"
```

- [ ] **Step 2: Create the finalize route**

```ts
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
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit` — expect no errors from `app/api/device/selesai/route.ts`, and confirm `app/api/device/data/route.ts` no longer exists so it can't error either.

- [ ] **Step 4: Manual verification against a running dev server**

With `npm run dev` running and `ESP32_API_KEY` set in `.env`, first create a session (anak) via Task 3's curl command, then:

```bash
curl -X POST http://localhost:3000/api/device/selesai \
  -H "Content-Type: application/json" \
  -H "x-api-key: <value of ESP32_API_KEY>" \
  -d '{"device_id":"esp32-01","kategori":"anak","bb":12.4,"tb":87.5}'
```

Expected: `{"success":true,"namaPasien":"...","bb":12.4,"tb":87.5,"kategoriHasil":"NORMAL"|"PENDEK"|"SANGAT PENDEK","teksEdukasi":"...","tanggal":"..."}` depending on the test child's age/height. Repeat immediately — expect `{"success":false,"error":"Tidak ada sesi aktif"}` (404) since the session is now `selesai`.

For ibu: create a session with `kategori:"ibu"`, a real `ibuId` that has a `pregnancyProfile`, and `lilaCm`/`hbGdl`, then POST with `jawaban: {"protein":true,"fe":true,"pengetahuan":true,"sanitasi":false,"rokok":false}` — expect a `kategoriHasil` of `RENDAH`/`SEDANG`/`TINGGI`.

- [ ] **Step 5: Commit**

```bash
git add app/api/device/selesai/route.ts
git rm app/api/device/data/route.ts
git commit -m "feat: add finalize endpoint that computes stunting/risk category server-side"
```

---

## Task 5: `saveSkriningDariSesi` server action (ibu confirm-save)

**Files:**
- Modify: `lib/actions/pregnancy.ts` (add one new export; imports and existing functions unchanged)

**Interfaces:**
- Consumes: `sesiPengukuran`, `skriningShamil` (need to add to the existing import from `@/lib/db/schema`), the existing `savePregnancyVisit` function (already in this file), and reads `sesi.nilaiBerat/lilaCm/hbGdl/skorAkhir/kategoriHasil/jawaban` populated by Task 4.
- Produces: `saveSkriningDariSesi({ sessionId: string, catatanKader?: string })` — consumed by Task 7 (`PeriksaKehamilanModal`'s Simpan button).

- [ ] **Step 1: Update the schema import and add the new action**

Change the import line (currently `lib/actions/pregnancy.ts:4`):

```ts
import { pregnancyProfile, pregnancyVisit, ibu, sesiPengukuran, skriningShamil } from "@/lib/db/schema"
```

Append this function at the end of `lib/actions/pregnancy.ts`:

```ts
export async function saveSkriningDariSesi(data: {
  sessionId: string
  catatanKader?: string
}) {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

  const sesi = await db.query.sesiPengukuran.findFirst({
    where: eq(sesiPengukuran.id, data.sessionId),
  })

  if (!sesi) throw new Error("Sesi tidak ditemukan")
  if (sesi.kategori !== "ibu" || !sesi.ibuId) throw new Error("Sesi bukan untuk ibu hamil")
  if (sesi.statusHasil !== "selesai") throw new Error("Sesi belum selesai diproses alat")
  if (sesi.nilaiBerat == null || sesi.lilaCm == null || sesi.hbGdl == null || sesi.skorAkhir == null || !sesi.kategoriHasil) {
    throw new Error("Data hasil sesi tidak lengkap")
  }

  const visit = await savePregnancyVisit({
    ibuId: sesi.ibuId,
    currentWeightKg: sesi.nilaiBerat,
    lilaCm: sesi.lilaCm,
    hbGdl: sesi.hbGdl,
    catatanKader: data.catatanKader,
  })

  await db.insert(skriningShamil).values({
    ibuId: sesi.ibuId,
    posyanduId: session.user.posyanduId!,
    kaderId: session.user.id!,
    skorRisiko: sesi.skorAkhir,
    kategori: sesi.kategoriHasil,
    jawaban: sesi.jawaban ?? {},
  })

  const { revalidatePath } = await import("next/cache")
  revalidatePath(`/kader/ibu/${sesi.ibuId}`)
  revalidatePath("/kader/dashboard")

  return visit
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` — expect no errors from `lib/actions/pregnancy.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/pregnancy.ts
git commit -m "feat: persist already-computed pregnancy risk result on kader confirm"
```

---

## Task 6: Update `CatatKunjunganModal` (anak)

**Files:**
- Modify: `components/kader/catat-kunjungan-modal.tsx` (full file replacement — the polling contract, gating, and result display all change together)

**Interfaces:**
- Consumes: `/api/pengukuran/mulai` (Task 3) with `kategori: "anak"`, `/api/pengukuran/[sessionId]/status` (unchanged route, now returns Task 1's new columns), the existing `savePengukuran` action (unchanged).

- [ ] **Step 1: Replace the file**

```tsx
"use client"

import { useEffect, useState } from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { savePengukuran } from "@/lib/actions/kader"
import { calcHeightZScore, stuntingLabel } from "@/lib/growth-standards/stunting-calc"
import { StatusBadge } from "@/components/status-badge"

const ACCENT = "#52A9E3"

function MetricCard({
  label,
  value,
  unit,
  editable,
  onChange,
}: {
  label: string
  value: string
  unit: string
  editable: boolean
  onChange: (v: string) => void
}) {
  return (
    <div className="rounded-[14px] border border-gray-200 py-4 px-[18px]">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
      {editable ? (
        <div className="flex items-baseline gap-1 mt-1.5">
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0.0"
            className="w-full text-[20px] font-bold text-[#173753] outline-none bg-transparent tabular-nums"
          />
          <span className="text-[12px] text-muted-foreground flex-shrink-0">{unit}</span>
        </div>
      ) : (
        <p className={cn("text-[20px] font-bold mt-1.5 tabular-nums", value ? "text-[#173753]" : "text-gray-300")}>
          {value ? `${value.replace(".", ",")} ${unit}` : `0,0 ${unit}`}
        </p>
      )}
    </div>
  )
}

interface CatatKunjunganModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  child: {
    id: string
    name: string
    gender: string
    ageMo: number
  }
  onSaved: () => void
}

export function CatatKunjunganModal({ open, onOpenChange, child, onSaved }: CatatKunjunganModalProps) {
  const [tab, setTab] = useState<"alat" | "manual">("alat")
  const [bb, setBb] = useState("")
  const [tb, setTb] = useState("")
  const [saving, setSaving] = useState(false)

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [deviceStatus, setDeviceStatus] = useState<"terhubung" | "terputus">("terputus")
  const [hasilSelesai, setHasilSelesai] = useState(false)
  const [kategoriHasil, setKategoriHasil] = useState("")
  const [teksEdukasi, setTeksEdukasi] = useState("")

  const startSession = async () => {
    setBb("")
    setTb("")
    setHasilSelesai(false)
    setKategoriHasil("")
    setTeksEdukasi("")
    setSessionId(null)

    try {
      const res = await fetch("/api/pengukuran/mulai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: "esp32-01", kategori: "anak", anakId: child.id })
      })
      const data = await res.json()
      if (data.success) {
        setSessionId(data.sessionId)
      }
    } catch (err) {
      console.error("Failed to start session:", err)
    }
  }

  // Poll device connection status
  useEffect(() => {
    if (!open) return
    const pollDevice = async () => {
      try {
        const res = await fetch("/api/device/esp32-01/status")
        const data = await res.json()
        if (data.success) {
          setDeviceStatus(data.status)
        }
      } catch (err) {}
    }
    pollDevice()
    const intv = setInterval(pollDevice, 5000)
    return () => clearInterval(intv)
  }, [open])

  // Poll session data
  useEffect(() => {
    if (!open || tab !== "alat" || !sessionId) return

    const pollSession = async () => {
      try {
        const res = await fetch(`/api/pengukuran/${sessionId}/status`)
        const data = await res.json()
        if (data.success && data.data) {
          const s = data.data
          if (s.statusHasil === "selesai") {
            setBb(s.nilaiBerat?.toString() || "")
            setTb(s.nilaiTinggi?.toString() || "")
            setKategoriHasil(s.kategoriHasil || "")
            setTeksEdukasi(s.teksEdukasi || "")
            setHasilSelesai(true)
          }
        }
      } catch (err) {}
    }

    const intv = setInterval(pollSession, 1500)
    return () => clearInterval(intv)
  }, [open, tab, sessionId])

  useEffect(() => {
    if (!open) {
      setTab("alat")
      setBb("")
      setTb("")
      setSessionId(null)
      setHasilSelesai(false)
      setKategoriHasil("")
      setTeksEdukasi("")
    }
  }, [open])

  const sex = child.gender === "Laki-laki" ? "L" : "P"
  const bbNum = bb ? parseFloat(bb) : null
  const tbNum = tb ? parseFloat(tb) : null

  const ready = tab === "manual"
    ? bbNum != null && tbNum != null
    : hasilSelesai

  const zTBU = tab === "manual" && ready && tbNum != null ? calcHeightZScore(tbNum, child.ageMo, sex) : null

  const handleSubmit = async () => {
    if (!ready || bbNum == null || tbNum == null) return
    setSaving(true)
    try {
      await savePengukuran({ anakId: child.id, beratBadan: bbNum, tinggiBadan: tbNum })
      onSaved()
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      alert("Gagal menyimpan data")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-[rgba(20,48,74,0.45)]" />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[600px] max-w-[calc(100vw-80px)] max-h-[calc(100vh-80px)] overflow-y-auto rounded-[18px] bg-white shadow-[0_20px_60px_rgba(20,48,74,0.3)] outline-none">
          <div className="pt-5 px-[26px] pb-0 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-[17px] font-semibold text-[#173753] leading-tight">
                Catat Kunjungan
              </DialogTitle>
              <DialogDescription className="text-[12px] text-muted-foreground mt-0.5">
                {child.name} · {sex} · {child.ageMo} bulan
              </DialogDescription>
            </div>
            <DialogClose className="h-[30px] w-[30px] rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-[#173753] transition-colors flex-shrink-0">
              <X className="w-4 h-4" />
            </DialogClose>
          </div>

          <div className="mx-[26px] my-4 flex p-1 gap-1 rounded-xl bg-[#F1F5F9]">
            {(["alat", "manual"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 py-[9px] rounded-[9px] text-[12px] font-semibold transition-colors",
                  tab === t ? "bg-white text-[#173753] shadow-sm" : "text-muted-foreground hover:text-[#173753]"
                )}
              >
                {t === "alat" ? "Otomatis" : "Manual"}
              </button>
            ))}
          </div>

          <div className="px-[26px] pb-[22px] flex flex-col gap-[14px]">
            {tab === "alat" && (
              <div className={cn("flex items-center justify-between rounded-xl px-4 py-[11px]", deviceStatus === "terhubung" ? "bg-[#E6F4EA]" : "bg-gray-100")}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn("h-2 w-2 rounded-full flex-shrink-0", deviceStatus === "terhubung" ? "bg-[#1E8E3E]" : "bg-gray-400")} />
                  <span className={cn("text-[13px] font-medium truncate", deviceStatus === "terhubung" ? "text-[#173753]" : "text-gray-500")}>
                    {deviceStatus === "terhubung" ? "Terhubung" : "Alat terputus"}
                  </span>
                </div>
              </div>
            )}

            {tab === "alat" && !sessionId && (
              <button
                type="button"
                onClick={startSession}
                className="h-11 rounded-xl text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: `linear-gradient(to right, ${ACCENT}, #93D1F7)` }}
              >
                Mulai Pengukuran dengan Alat
              </button>
            )}

            {tab === "alat" && sessionId && !hasilSelesai && (
              <div className="rounded-xl bg-[#F7FBFF] px-4 py-3 text-[13px] text-muted-foreground text-center">
                Menunggu alat menyelesaikan pengukuran…
              </div>
            )}

            {(tab === "manual" || hasilSelesai) && (
              <div className="grid grid-cols-2 gap-[14px]">
                <MetricCard label="BERAT BADAN" value={bb} unit="kg" editable={tab === "manual"} onChange={setBb} />
                <MetricCard label="TINGGI BADAN" value={tb} unit="cm" editable={tab === "manual"} onChange={setTb} />
              </div>
            )}

            {tab === "manual" && ready && zTBU && (
              <div className="rounded-xl bg-[#F7FBFF] px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-medium text-muted-foreground">Hasil skrining otomatis</p>
                  <span className="text-[11px] font-semibold text-[#173753] bg-white px-2 py-0.5 rounded-full flex-shrink-0">TB/U</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[15px] font-bold text-[#173753] tabular-nums">
                    {zTBU.zScore.toFixed(1).replace(".", ",")} SD
                  </span>
                  <StatusBadge status={stuntingLabel[zTBU.status]} />
                </div>
              </div>
            )}

            {tab === "alat" && hasilSelesai && (
              <div className="rounded-xl bg-[#F7FBFF] px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-medium text-muted-foreground">Hasil dari alat</p>
                  <span className="text-[11px] font-semibold text-[#173753] bg-white px-2 py-0.5 rounded-full flex-shrink-0">TB/U</span>
                </div>
                <div className="mt-2">
                  <StatusBadge status={kategoriHasil} />
                </div>
                <p className="text-[12px] text-muted-foreground mt-2 leading-relaxed">{teksEdukasi}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-[10px] px-[26px] py-[15px] border-t border-gray-100">
            {tab === "alat" && sessionId && (
              <button
                type="button"
                onClick={startSession}
                className="text-[13px] font-medium text-[#173753] hover:text-[#52A9E3] transition-colors"
              >
                Ulangi
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 px-4 rounded-full text-[13px] font-medium text-muted-foreground hover:text-[#173753] transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!ready || saving}
              onClick={handleSubmit}
              className={cn(
                "h-9 px-5 rounded-full text-[13px] font-semibold text-white flex items-center gap-1.5 transition-opacity",
                (!ready || saving) ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"
              )}
              style={{ background: `linear-gradient(to right, ${ACCENT}, #93D1F7)` }}
            >
              {saving ? "Menyimpan…" : "Simpan Pemeriksaan"}
            </button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` — expect no errors from this file.

- [ ] **Step 3: Manual browser verification**

Run `npm run dev`, open a child's profile page, click "Catat Kunjungan": confirm the "Otomatis" tab now shows a **Mulai Pengukuran dengan Alat** button instead of auto-starting; clicking it creates a session (Network tab shows a `POST /api/pengukuran/mulai` with `kategori:"anak"` and the child's id). Manually POST to `/api/device/selesai` (Task 4's curl, matching that `device_id`/`kategori`) and confirm the modal updates within ~1.5s to show BB/TB and the "Hasil dari alat" box with a colored badge, and that "Simpan Pemeriksaan" becomes enabled.

- [ ] **Step 4: Commit**

```bash
git add components/kader/catat-kunjungan-modal.tsx
git commit -m "feat: gate device session behind explicit start, show server-computed result"
```

---

## Task 7: Update `PeriksaKehamilanModal` (ibu)

**Files:**
- Modify: `components/kader/periksa-kehamilan-modal.tsx` (full file replacement)

**Interfaces:**
- Consumes: `/api/pengukuran/mulai` (Task 3) with `kategori: "ibu"`, `ibuId`, `lilaCm`, `hbGdl`; `/api/pengukuran/[sessionId]/status`; `saveSkriningDariSesi` (Task 5) for the device-driven confirm path; the existing `savePregnancyVisit` (unchanged) for the manual-tab path.

- [ ] **Step 1: Replace the file**

```tsx
"use client"

import { useEffect, useState } from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { X, TriangleAlert } from "lucide-react"
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { savePregnancyVisit, saveSkriningDariSesi } from "@/lib/actions/pregnancy"
import { getWeightGainStatus, weightGainLabel } from "@/lib/growth-standards/imt-calc"
import { StatusBadge } from "@/components/status-badge"
import { FieldLabel, StyledTextarea } from "@/components/kader/tambah-pasien-modal"

const ACCENT = "#52A9E3"

function MetricCard({
  label,
  value,
  unit,
  editable,
  onChange,
  stateLabel,
  stable,
  alert,
}: {
  label: string
  value: string
  unit: string
  editable: boolean
  onChange: (v: string) => void
  stateLabel?: string
  stable?: boolean
  alert?: boolean
}) {
  return (
    <div className={cn("rounded-[14px] border py-4 px-[18px]", alert ? "border-[#F4E2BC] bg-[#FFFBF2]" : "border-gray-200")}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
        {stateLabel && (
          <span
            className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap",
              stable ? "bg-[#E6F4EA] text-[#1E8E3E]" : "bg-[#FFF4E5] text-[#B06000]"
            )}
          >
            {stateLabel}
          </span>
        )}
      </div>
      {editable ? (
        <div className="flex items-baseline gap-1 mt-1.5">
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0.0"
            className={cn("w-full text-[20px] font-bold outline-none bg-transparent tabular-nums", alert ? "text-[#8A6100]" : "text-[#173753]")}
          />
          <span className="text-[12px] text-muted-foreground flex-shrink-0">{unit}</span>
        </div>
      ) : (
        <p className={cn("text-[20px] font-bold mt-1.5 tabular-nums", value ? "text-[#173753]" : "text-gray-300")}>
          {value ? `${value.replace(".", ",")} ${unit}` : `0,0 ${unit}`}
        </p>
      )}
    </div>
  )
}

interface PeriksaKehamilanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ibu: {
    id: string
    nama: string
    gestationalWeeks: number
    trimester: number
    bbPrepregnancyKg: number
    weeklyGainMinKg: number
    weeklyGainMaxKg: number
  }
  onSaved: () => void
}

export function PeriksaKehamilanModal({ open, onOpenChange, ibu, onSaved }: PeriksaKehamilanModalProps) {
  const [tab, setTab] = useState<"alat" | "manual">("alat")
  const [bb, setBb] = useState("")
  const [lila, setLila] = useState("")
  const [hb, setHb] = useState("")
  const [catatan, setCatatan] = useState("")
  const [saving, setSaving] = useState(false)

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [deviceStatus, setDeviceStatus] = useState<"terhubung" | "terputus">("terputus")
  const [hasilSelesai, setHasilSelesai] = useState(false)
  const [kategoriHasil, setKategoriHasil] = useState("")
  const [teksEdukasi, setTeksEdukasi] = useState("")

  const lilaNum = lila ? parseFloat(lila.replace(",", ".")) : null
  const hbNum = hb ? parseFloat(hb.replace(",", ".")) : null
  const lilaHbSiap = lilaNum != null && hbNum != null

  const startSession = async () => {
    if (!lilaHbSiap) return
    setBb("")
    setHasilSelesai(false)
    setKategoriHasil("")
    setTeksEdukasi("")
    setSessionId(null)

    try {
      const res = await fetch("/api/pengukuran/mulai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: "esp32-01",
          kategori: "ibu",
          ibuId: ibu.id,
          lilaCm: lilaNum,
          hbGdl: hbNum,
        })
      })
      const data = await res.json()
      if (data.success) {
        setSessionId(data.sessionId)
      }
    } catch (err) {
      console.error("Failed to start session:", err)
    }
  }

  // Poll device connection status
  useEffect(() => {
    if (!open) return
    const pollDevice = async () => {
      try {
        const res = await fetch("/api/device/esp32-01/status")
        const data = await res.json()
        if (data.success) {
          setDeviceStatus(data.status)
        }
      } catch (err) {}
    }
    pollDevice()
    const intv = setInterval(pollDevice, 5000)
    return () => clearInterval(intv)
  }, [open])

  // Poll session data
  useEffect(() => {
    if (!open || tab !== "alat" || !sessionId) return

    const pollSession = async () => {
      try {
        const res = await fetch(`/api/pengukuran/${sessionId}/status`)
        const data = await res.json()
        if (data.success && data.data) {
          const s = data.data
          if (s.statusHasil === "selesai") {
            setBb(s.nilaiBerat?.toString() || "")
            setKategoriHasil(s.kategoriHasil || "")
            setTeksEdukasi(s.teksEdukasi || "")
            setHasilSelesai(true)
          }
        }
      } catch (err) {}
    }

    const intv = setInterval(pollSession, 1500)
    return () => clearInterval(intv)
  }, [open, tab, sessionId])

  useEffect(() => {
    if (!open) {
      setTab("alat")
      setBb("")
      setLila("")
      setHb("")
      setCatatan("")
      setSessionId(null)
      setHasilSelesai(false)
      setKategoriHasil("")
      setTeksEdukasi("")
    }
  }, [open])

  const bbNum = bb ? parseFloat(bb) : null

  const bbReady = tab === "manual" ? bbNum != null : hasilSelesai
  const ready = bbReady && lilaNum != null && hbNum != null

  const weightGainKg = bbNum != null ? bbNum - ibu.bbPrepregnancyKg : null
  const gainStatus = weightGainKg != null
    ? getWeightGainStatus(weightGainKg, ibu.gestationalWeeks, ibu)
    : null

  const lilaLow = lilaNum != null && lilaNum < 23.5
  const hbLow = hbNum != null && hbNum < 11
  const showRiskAlert = lilaLow || hbLow

  const handleSubmit = async () => {
    if (!ready || bbNum == null || lilaNum == null || hbNum == null) return
    setSaving(true)
    try {
      if (tab === "alat" && sessionId && hasilSelesai) {
        await saveSkriningDariSesi({
          sessionId,
          catatanKader: catatan.trim() || undefined,
        })
      } else {
        await savePregnancyVisit({
          ibuId: ibu.id,
          currentWeightKg: bbNum,
          lilaCm: lilaNum,
          hbGdl: hbNum,
          catatanKader: catatan.trim() || undefined,
        })
      }
      onSaved()
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      alert("Gagal menyimpan data")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-[rgba(20,48,74,0.45)]" />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[600px] max-w-[calc(100vw-80px)] max-h-[calc(100vh-80px)] overflow-y-auto rounded-[18px] bg-white shadow-[0_20px_60px_rgba(20,48,74,0.3)] outline-none">
          <div className="pt-5 px-[26px] pb-0 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-[17px] font-semibold text-[#173753] leading-tight">
                Pemeriksaan Kehamilan
              </DialogTitle>
              <DialogDescription className="text-[12px] text-muted-foreground mt-0.5">
                {ibu.nama} · {ibu.gestationalWeeks} minggu · Trimester {ibu.trimester}
              </DialogDescription>
            </div>
            <DialogClose className="h-[30px] w-[30px] rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-[#173753] transition-colors flex-shrink-0">
              <X className="w-4 h-4" />
            </DialogClose>
          </div>

          <div className="mx-[26px] my-4 flex p-1 gap-1 rounded-xl bg-[#F1F5F9]">
            {(["alat", "manual"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 py-[9px] rounded-[9px] text-[12px] font-semibold transition-colors",
                  tab === t ? "bg-white text-[#173753] shadow-sm" : "text-muted-foreground hover:text-[#173753]"
                )}
              >
                {t === "alat" ? "Otomatis" : "Manual"}
              </button>
            ))}
          </div>

          <div className="px-[26px] pb-[22px] flex flex-col gap-[14px]">
            {tab === "alat" && (
              <div className={cn("flex items-center justify-between rounded-xl px-4 py-[11px]", deviceStatus === "terhubung" ? "bg-[#E6F4EA]" : "bg-gray-100")}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn("h-2 w-2 rounded-full flex-shrink-0", deviceStatus === "terhubung" ? "bg-[#1E8E3E]" : "bg-gray-400")} />
                  <span className={cn("text-[13px] font-medium truncate", deviceStatus === "terhubung" ? "text-[#173753]" : "text-gray-500")}>
                    {deviceStatus === "terhubung" ? "Terhubung" : "Alat terputus"}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-[14px]">
              <MetricCard label="LILA" value={lila} unit="cm" editable onChange={setLila} alert={lilaLow} />
              <MetricCard label="HEMOGLOBIN" value={hb} unit="g/dL" editable onChange={setHb} alert={hbLow} />
            </div>

            {tab === "alat" && !lilaHbSiap && (
              <p className="text-[12px] text-muted-foreground text-center">
                Isi LILA & Hb dahulu untuk mengaktifkan pengukuran alat.
              </p>
            )}

            {tab === "alat" && lilaHbSiap && !sessionId && (
              <button
                type="button"
                onClick={startSession}
                className="h-11 rounded-xl text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: `linear-gradient(to right, ${ACCENT}, #93D1F7)` }}
              >
                Mulai Pengukuran dengan Alat
              </button>
            )}

            {tab === "alat" && sessionId && !hasilSelesai && (
              <div className="rounded-xl bg-[#F7FBFF] px-4 py-3 text-[13px] text-muted-foreground text-center">
                Menunggu alat menyelesaikan pengukuran…
              </div>
            )}

            {(tab === "manual" || hasilSelesai) && (
              <MetricCard
                label="BERAT BADAN"
                value={bb}
                unit="kg"
                editable={tab === "manual"}
                onChange={setBb}
              />
            )}

            {weightGainKg != null && gainStatus && (
              <div className="rounded-xl bg-[#F7FBFF] px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-medium text-muted-foreground">Skrining kenaikan berat badan</p>
                  <span className="text-[11px] font-semibold text-[#173753] bg-white px-2 py-0.5 rounded-full flex-shrink-0">BB</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[15px] font-bold text-[#173753] tabular-nums">
                    {weightGainKg >= 0 ? "+" : ""}{weightGainKg.toFixed(1).replace(".", ",")} kg
                  </span>
                  <StatusBadge status={weightGainLabel[gainStatus]} />
                </div>
              </div>
            )}

            {tab === "alat" && hasilSelesai && (
              <div className="rounded-xl bg-[#F7FBFF] px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-medium text-muted-foreground">Kategori risiko kehamilan (alat)</p>
                </div>
                <div className="mt-2">
                  <StatusBadge status={kategoriHasil} />
                </div>
                <p className="text-[12px] text-muted-foreground mt-2 leading-relaxed">{teksEdukasi}</p>
              </div>
            )}

            {showRiskAlert && (
              <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5 bg-[#FFF7E6] border border-[#F4E2BC]">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#D99100] text-white flex-shrink-0">
                  <TriangleAlert className="w-4 h-4" />
                </div>
                <p className="text-[12px] text-[#8A6100] leading-relaxed">
                  Skrining: Risiko {lilaLow && hbLow ? "KEK + Anemia" : lilaLow ? "KEK" : "Anemia"}. Sistem akan menandai untuk tindak lanjut dan menyarankan rujukan ke Puskesmas. Catatan rujukan bisa ditambahkan sebelum menyimpan.
                </p>
              </div>
            )}

            <div>
              <FieldLabel label="Catatan Kader (opsional)" />
              <StyledTextarea value={catatan} onChange={setCatatan} placeholder="mis. Disarankan rujukan ke Puskesmas, diberikan PMT ibu hamil." rows={2} />
            </div>
          </div>

          <div className="flex items-center gap-[10px] px-[26px] py-[15px] border-t border-gray-100">
            {tab === "alat" && sessionId && (
              <button
                type="button"
                onClick={startSession}
                className="text-[13px] font-medium text-[#173753] hover:text-[#52A9E3] transition-colors"
              >
                Ulangi
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 px-4 rounded-full text-[13px] font-medium text-muted-foreground hover:text-[#173753] transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!ready || saving}
              onClick={handleSubmit}
              className={cn(
                "h-9 px-5 rounded-full text-[13px] font-semibold text-white flex items-center gap-1.5 transition-opacity",
                (!ready || saving) ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"
              )}
              style={{ background: `linear-gradient(to right, ${ACCENT}, #93D1F7)` }}
            >
              {saving ? "Menyimpan…" : "Simpan Pemeriksaan"}
            </button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` — expect no errors from this file.

- [ ] **Step 3: Manual browser verification**

Run `npm run dev`, open an ibu hamil profile (one with a `pregnancyProfile` already started), click "Periksa Kehamilan". Confirm: with LILA/Hb empty, the "Mulai Pengukuran dengan Alat" button is not shown (only the "Isi LILA & Hb dahulu" message); after typing both, the button appears; clicking it POSTs to `/mulai` with `kategori:"ibu"`, the ibu's id, and the typed lila/hb. Manually POST to `/api/device/selesai` with matching `device_id`/`kategori:"ibu"` and a `jawaban` object (Task 4's curl) and confirm the modal shows the BB, a colored RENDAH/SEDANG/TINGGI badge, and the education text within ~1.5s. Click "Simpan Pemeriksaan" and confirm no error is thrown (check the server console/network tab for the `saveSkriningDariSesi` call succeeding).

- [ ] **Step 4: Commit**

```bash
git add components/kader/periksa-kehamilan-modal.tsx
git commit -m "feat: require LILA/Hb before device session, show combined risk result"
```

---

## Task 8: Firmware `config.h` (pins, WiFi, palette)

**Files:**
- Create: `config.h` (same folder as `lokabakka.ino`, so Arduino IDE compiles it as part of the sketch)

**Interfaces:**
- Produces: every `#define` below, consumed by Tasks 9-13 (`sensors.h`, `api.h`, `printer.h`, `screens.h`, `lokabakka.ino`) — do not rename any of these once other tasks depend on them.

- [ ] **Step 1: Create the file**

```cpp
#pragma once

// ==== WiFi ====
// ponytail: ganti dengan kredensial WiFi posyandu sebelum flashing.
#define WIFI_SSID     "GANTI_SSID"
#define WIFI_PASSWORD "GANTI_PASSWORD"

// ==== Backend API ====
// ponytail: ganti dengan domain deployment web (mis. Vercel) dan API key
// yang sama dengan env ESP32_API_KEY di server.
#define API_BASE_URL  "https://ganti-domain-anda.example/api"
#define ESP32_API_KEY "GANTI_API_KEY"
#define DEVICE_ID     "esp32-01"

// ==== Pin TFT (ILI9488 480x320) ====
// MOSI/SCLK/MISO diatur di User_Setup.h milik library TFT_eSPI, bukan di sini.
#define PIN_TFT_CS   5
#define PIN_TFT_DC   27
#define PIN_TFT_RST  33

// ==== Pin Printer thermal (Serial2, 58mm, ESC/POS) ====
#define PIN_PRN_TX   17
#define PIN_PRN_RX   16

// ==== Pin Tombol ====
#define PIN_BTN_SATU 13   // tombol (1) - merah - tidak / ulangi / ganti pilihan
#define PIN_BTN_DUA  14   // tombol (2) - hijau - ya / lanjut / pilih

// ==== Ukuran layar ====
#define SCR_W 480
#define SCR_H 320

// ==== Palet warna (RGB565), dari spec 1t ====
#define COL_BG        0x1147  // #10283F latar
#define COL_PANEL     0x19CB  // #1A3A5A panel
#define COL_PANEL_ON  0x1A6F  // #1C4E7E panel aktif
#define COL_LINE      0x222D  // #24466A garis
#define COL_FOOTER    0x0906  // #0C2036 bar footer
#define COL_TEXT      0xFFFF  // #FFFFFF teks utama
#define COL_TEXT_2    0xCEDD  // #C9D9E8 teks isi
#define COL_TEXT_DIM  0x9DB9  // #9FB6CD teks redup
#define COL_INACTIVE  0x5391  // #51708F nonaktif
#define COL_ACCENT    0x4CFD  // #4D9FE8 aksen biru
#define COL_GREEN     0x3E51  // #38C98A hijau
#define COL_YELLOW    0xF5C9  // #F6B94B kuning
#define COL_RED       0xF32C  // #F26461 merah
```

- [ ] **Step 2: Verify (no compiler available in this environment)**

This file has no logic to run; it is verified implicitly when Task 13's sketch compiles. No standalone check needed.

- [ ] **Step 3: Commit**

```bash
git add config.h
git commit -m "feat: add ESP32 firmware config (pins, wifi, api, palette)"
```

---

## Task 9: Firmware `sensors.h` (stubbed weight/height reads)

**Files:**
- Create: `sensors.h`

**Interfaces:**
- Produces: `readWeightKg(const char* kategori)`, `readHeightCm(const char* kategori)` — consumed by `lokabakka.ino` (Task 13) in the `UKUR` state.

- [ ] **Step 1: Create the file**

```cpp
#pragma once

// ponytail: HX711 (berat) & HC-SR04 (tinggi) belum disambungkan — kembalikan
// nilai uji tetap dulu, berbeda untuk anak vs ibu supaya alur terlihat masuk
// akal saat didemokan. Ganti isi kedua fungsi ini saat sensor asli siap;
// tidak ada bagian firmware lain yang bergantung pada detail sensor.

float readWeightKg(const char* kategori) {
  if (strcmp(kategori, "ibu") == 0) return 58.2f;
  return 12.4f;
}

float readHeightCm(const char* kategori) {
  if (strcmp(kategori, "ibu") == 0) return 155.0f;
  return 87.5f;
}
```

- [ ] **Step 2: Verify**

No standalone check available; verified when Task 13's sketch compiles.

- [ ] **Step 3: Commit**

```bash
git add sensors.h
git commit -m "feat: add stubbed weight/height sensor reads for ESP32 firmware"
```

---

## Task 10: Firmware `api.h` (WiFi, heartbeat, finalize POST)

**Files:**
- Create: `api.h`

**Interfaces:**
- Consumes: `WIFI_SSID`, `WIFI_PASSWORD`, `API_BASE_URL`, `ESP32_API_KEY`, `DEVICE_ID` from `config.h` (Task 8). Matches the `POST /api/device/selesai` contract from Task 4 exactly (field names `device_id`, `kategori`, `bb`, `tb`, `jawaban`; response fields `success`, `namaPasien`, `kategoriHasil`, `teksEdukasi`, `tanggal`, `bb`, `tb`, `error`).
- Produces: `wifiConnect()`, `sendHeartbeat()`, `struct HasilPemeriksaan`, `kirimHasilPengukuran(kategori, bb, tb, jawabanJson)` — consumed by `lokabakka.ino` (Task 13).
- Required Arduino libraries (install via Library Manager before compiling): **ArduinoJson** (v7.x).

- [ ] **Step 1: Create the file**

```cpp
#pragma once

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include "config.h"

bool wifiConnect() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(250);
  }
  return WiFi.status() == WL_CONNECTED;
}

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure(); // ponytail: lewati verifikasi sertifikat TLS; tambahkan root CA jika perlu

  HTTPClient http;
  http.begin(client, String(API_BASE_URL) + "/device/heartbeat");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", ESP32_API_KEY);
  http.setTimeout(8000);

  JsonDocument doc;
  doc["device_id"] = DEVICE_ID;
  String body;
  serializeJson(doc, body);

  http.POST(body);
  http.end();
}

struct HasilPemeriksaan {
  bool ok = false;
  String error;
  String namaPasien;
  String kategoriHasil;
  String teksEdukasi;
  String tanggal;
  float bb = 0;
  float tb = 0;
};

// jawabanDoc boleh nullptr (dipakai untuk kategori "anak"); untuk "ibu" harus
// berisi objek dengan key: protein, fe, pengetahuan, sanitasi, rokok (bool).
HasilPemeriksaan kirimHasilPengukuran(const char* kategori, float bb, float tb, JsonDocument* jawabanDoc) {
  HasilPemeriksaan hasil;

  if (WiFi.status() != WL_CONNECTED) {
    hasil.error = "WiFi tidak terhubung";
    return hasil;
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.begin(client, String(API_BASE_URL) + "/device/selesai");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", ESP32_API_KEY);
  http.setTimeout(8000);

  JsonDocument doc;
  doc["device_id"] = DEVICE_ID;
  doc["kategori"] = kategori;
  doc["bb"] = bb;
  doc["tb"] = tb;
  if (jawabanDoc != nullptr) {
    doc["jawaban"] = *jawabanDoc;
  }
  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  if (code <= 0) {
    hasil.error = "Timeout / tidak terhubung ke server";
    http.end();
    return hasil;
  }

  String response = http.getString();
  http.end();

  JsonDocument respDoc;
  DeserializationError err = deserializeJson(respDoc, response);
  if (err) {
    hasil.error = "Respons server tidak valid";
    return hasil;
  }
  if (!respDoc["success"].as<bool>()) {
    hasil.error = respDoc["error"] | "Gagal memproses di server";
    return hasil;
  }

  hasil.ok = true;
  hasil.namaPasien = respDoc["namaPasien"].as<String>();
  hasil.kategoriHasil = respDoc["kategoriHasil"].as<String>();
  hasil.teksEdukasi = respDoc["teksEdukasi"].as<String>();
  hasil.tanggal = respDoc["tanggal"].as<String>();
  hasil.bb = respDoc["bb"].as<float>();
  hasil.tb = respDoc["tb"].as<float>();
  return hasil;
}
```

- [ ] **Step 2: Verify**

No standalone check available; verified when Task 13's sketch compiles. Once flashed, watch the Serial Monitor (115200 baud) during boot — `wifiConnect()` should return within 15s on a valid network, and `sendHeartbeat()` calls should make `/api/device/esp32-01/status` (from the web) report `"terhubung"` within 15s (per the existing heartbeat route's 15-second freshness window).

- [ ] **Step 3: Commit**

```bash
git add api.h
git commit -m "feat: add ESP32 WiFi/HTTP client for heartbeat and finalize POST"
```

---

## Task 11: Firmware `printer.h` (raw ESC/POS + receipt)

**Files:**
- Create: `printer.h`

**Interfaces:**
- Consumes: `PIN_PRN_TX`, `PIN_PRN_RX` from `config.h` (Task 8).
- Produces: `prnInit()`, `cetakStruk(namaPasien, tanggal, bb, tb, kategoriHasil, teksEdukasi)` — consumed by `lokabakka.ino` (Task 13) in the `CETAK` state.

- [ ] **Step 1: Create the file**

```cpp
#pragma once

#include <Arduino.h>
#include "config.h"

void prnInit() {
  Serial2.begin(9600, SERIAL_8N1, PIN_PRN_RX, PIN_PRN_TX);
  delay(50);
  Serial2.write(0x1B); Serial2.write(0x40); // ESC @ - reset printer
}

void prnAlign(uint8_t n) { // 0 = kiri, 1 = tengah, 2 = kanan
  Serial2.write(0x1B); Serial2.write(0x61); Serial2.write(n);
}

void prnBold(bool on) {
  Serial2.write(0x1B); Serial2.write(0x45); Serial2.write(on ? 1 : 0);
}

void prnSize(uint8_t w, uint8_t h) { // 1-8x ukuran normal
  uint8_t n = ((w - 1) << 4) | (h - 1);
  Serial2.write(0x1D); Serial2.write(0x21); Serial2.write(n);
}

void prnLine(const String& s) {
  Serial2.println(s); // printer auto-wrap di lebar kertas (32 kolom / 58mm)
}

void prnFeed(uint8_t n) {
  Serial2.write(0x1B); Serial2.write(0x64); Serial2.write(n);
}

void prnCut() {
  Serial2.write(0x1D); Serial2.write(0x56); Serial2.write(0x01); // partial cut
}

void prnGaris() {
  prnLine("--------------------------------");
}

// GS ( k - urutan standar ESC/POS 5 langkah untuk mencetak QR code model 2.
void prnQR(const String& data) {
  int len = data.length() + 3;
  uint8_t pL = len & 0xFF;
  uint8_t pH = (len >> 8) & 0xFF;

  // 1) Pilih model QR (model 2)
  Serial2.write(0x1D); Serial2.write(0x28); Serial2.write(0x6B);
  Serial2.write(0x04); Serial2.write(0x00); Serial2.write(0x31); Serial2.write(0x41);
  Serial2.write(0x32); Serial2.write(0x00);

  // 2) Ukuran modul (1-16) - pakai 6 agar cukup besar dipindai HP
  Serial2.write(0x1D); Serial2.write(0x28); Serial2.write(0x6B);
  Serial2.write(0x03); Serial2.write(0x00); Serial2.write(0x31); Serial2.write(0x43);
  Serial2.write(6);

  // 3) Tingkat koreksi error - M (49)
  Serial2.write(0x1D); Serial2.write(0x28); Serial2.write(0x6B);
  Serial2.write(0x03); Serial2.write(0x00); Serial2.write(0x31); Serial2.write(0x45);
  Serial2.write(49);

  // 4) Simpan data QR ke buffer printer
  Serial2.write(0x1D); Serial2.write(0x28); Serial2.write(0x6B);
  Serial2.write(pL); Serial2.write(pH); Serial2.write(0x31); Serial2.write(0x50);
  Serial2.write(0x30);
  Serial2.print(data);

  // 5) Cetak QR dari buffer
  Serial2.write(0x1D); Serial2.write(0x28); Serial2.write(0x6B);
  Serial2.write(0x03); Serial2.write(0x00); Serial2.write(0x31); Serial2.write(0x51);
  Serial2.write(0x30);
}

void cetakStruk(const String& namaPasien, const String& tanggal, float bb, float tb,
                const String& kategoriHasil, const String& teksEdukasi) {
  prnAlign(1);
  prnBold(true);
  prnSize(2, 2);
  prnLine("LOKA BAKKA");
  prnSize(1, 1);
  prnLine("Hasil Pemeriksaan");
  prnBold(false);
  prnGaris();

  prnAlign(0);
  prnLine("Nama    : " + namaPasien);
  prnLine("Tanggal : " + tanggal);
  prnGaris();
  prnLine("Berat Badan  : " + String(bb, 1) + " kg");
  prnLine("Tinggi Badan : " + String(tb, 1) + " cm");
  prnGaris();

  prnAlign(1);
  prnBold(true);
  prnSize(2, 2);
  prnLine(kategoriHasil);
  prnSize(1, 1);
  prnBold(false);
  prnGaris();

  prnAlign(0);
  prnLine(teksEdukasi);
  prnGaris();

  prnAlign(1);
  prnQR("https://www.lokabakka.my.id");
  prnFeed(1);
  prnLine("www.lokabakka.my.id");
  prnLine("================================");
  prnFeed(3);
  prnCut();
}
```

- [ ] **Step 2: Verify**

No standalone check available; verified when Task 13's sketch compiles. Once flashed with the printer wired to `Serial2` (TX 17 -> printer RX, RX 16 -> printer TX), calling `cetakStruk(...)` with sample values should print a receipt matching the layout in the design spec, cut at the end, with a scannable QR code linking to `www.lokabakka.my.id`.

- [ ] **Step 3: Commit**

```bash
git add printer.h
git commit -m "feat: add raw ESC/POS printer helpers and receipt layout"
```

---

## Task 12: Firmware `screens.h` (TFT drawing)

**Files:**
- Create: `screens.h`

**Interfaces:**
- Consumes: `SCR_W`, `SCR_H`, `COL_*` from `config.h` (Task 8); expects a global `TFT_eSPI tft` object declared in `lokabakka.ino` (Task 13) and pulled in here via `extern`.
- Produces: `drawHeader`, `drawFooter`, `clearContent`, `layarBoot`, `layarPilihKategori`, `layarUkur`, `layarKuesioner`, `layarKirim`, `layarGagal`, `layarHasil`, `layarCetak`, `layarSelesai` — consumed by the state machine in `lokabakka.ino` (Task 13). Fonts use TFT_eSPI's bundled sizes as a placeholder for Inter Tight (per Global Constraints) and icons are simple vector approximations (circles/checkmarks), not the mockup's exact SVGs/bitmaps — swap in real `drawXBitmap` icon arrays later if needed.

- [ ] **Step 1: Create the file**

```cpp
#pragma once

#include <TFT_eSPI.h>
#include "config.h"

extern TFT_eSPI tft;

// ---- Primitif bersama ----

void drawHeader(const String& title, bool wifiOk) {
  tft.fillRect(0, 0, SCR_W, 38, COL_BG);
  tft.drawFastHLine(0, 37, SCR_W, COL_LINE);
  tft.setTextColor(COL_TEXT, COL_BG);
  tft.setTextSize(2);
  tft.setTextDatum(TL_DATUM);
  tft.drawString(title, 16, 11);

  uint16_t wc = wifiOk ? COL_ACCENT : COL_INACTIVE;
  tft.drawCircle(SCR_W - 24, 20, 3, wc);
  tft.drawCircle(SCR_W - 24, 20, 8, wc);
  tft.drawCircle(SCR_W - 24, 20, 13, wc);
}

void drawFooter(const String& kiri, uint16_t kiriColor, const String& kanan, uint16_t kananColor) {
  tft.fillRect(0, 274, SCR_W, 46, COL_FOOTER);
  tft.drawFastHLine(0, 274, SCR_W, COL_LINE);
  tft.setTextSize(1);
  tft.setTextDatum(TL_DATUM);

  if (kiri.length() > 0) {
    tft.fillCircle(27, 297, 11, kiriColor);
    tft.setTextColor(COL_TEXT_2, COL_FOOTER);
    tft.drawString(kiri, 46, 293);
  }
  if (kanan.length() > 0) {
    tft.setTextDatum(TR_DATUM);
    tft.setTextColor(COL_TEXT, COL_FOOTER);
    tft.drawString(kanan, SCR_W - 46, 293);
    tft.fillCircle(SCR_W - 27, 297, 11, kananColor);
  }
  tft.setTextDatum(TL_DATUM);
}

void clearContent() {
  tft.fillRect(0, 38, SCR_W, 236, COL_BG);
}

// ---- Layar 1a: Boot ----
void layarBoot() {
  tft.fillScreen(COL_BG);
  tft.setTextColor(COL_TEXT, COL_BG);
  tft.setTextDatum(MC_DATUM);
  tft.setTextSize(3);
  tft.drawString("Loka Bakka", SCR_W / 2, 140);
  tft.setTextSize(1);
  tft.setTextColor(COL_TEXT_DIM, COL_BG);
  tft.drawString("Menghubungkan ke WiFi...", SCR_W / 2, 175);
  tft.setTextDatum(TL_DATUM);
}

// ---- Layar 1b/1c: Pilih Kategori (sorotan: 0 = Anak, 1 = Ibu Hamil) ----
void layarPilihKategori(int sorotan, bool wifiOk) {
  drawHeader("Pilih Kategori", wifiOk);
  clearContent();

  int cardW = 210, cardH = 170;
  int gap = 16;
  int totalW = cardW * 2 + gap;
  int startX = (SCR_W - totalW) / 2;
  int y = 38 + (236 - cardH) / 2;

  const char* labels[2] = { "ANAK", "IBU HAMIL" };
  for (int i = 0; i < 2; i++) {
    int x = startX + i * (cardW + gap);
    bool aktif = (i == sorotan);
    tft.fillRoundRect(x, y, cardW, cardH, 14, aktif ? COL_PANEL_ON : COL_PANEL);
    if (aktif) tft.drawRoundRect(x, y, cardW, cardH, 14, COL_ACCENT);
    tft.fillCircle(x + cardW / 2, y + 60, 27, COL_BG);
    tft.drawCircle(x + cardW / 2, y + 60, 27, aktif ? COL_ACCENT : COL_TEXT_DIM);
    tft.setTextDatum(MC_DATUM);
    tft.setTextColor(aktif ? COL_TEXT : COL_TEXT_DIM, aktif ? COL_PANEL_ON : COL_PANEL);
    tft.setTextSize(2);
    tft.drawString(labels[i], x + cardW / 2, y + 118);
  }
  tft.setTextDatum(TL_DATUM);

  drawFooter("GANTI PILIHAN", COL_RED, "PILIH", COL_GREEN);
}

// ---- Layar 1d: Ukur Berat & Tinggi ----
void layarUkur(float bb, float tb) {
  drawHeader("Ukur Berat & Tinggi Badan", true);
  clearContent();

  int midX = SCR_W / 2;
  tft.drawFastVLine(midX, 58, 200, COL_LINE);

  tft.setTextDatum(MC_DATUM);

  tft.setTextSize(1);
  tft.setTextColor(COL_TEXT_DIM, COL_BG);
  tft.drawString("BERAT BADAN", midX / 2, 90);
  tft.setTextSize(4);
  tft.setTextColor(COL_TEXT, COL_BG);
  tft.drawString(String(bb, 1) + " kg", midX / 2, 140);

  tft.setTextSize(1);
  tft.setTextColor(COL_TEXT_DIM, COL_BG);
  tft.drawString("TINGGI BADAN", midX + midX / 2, 90);
  tft.setTextSize(4);
  tft.setTextColor(COL_TEXT, COL_BG);
  tft.drawString(String(tb, 1) + " cm", midX + midX / 2, 140);

  tft.setTextSize(1);
  tft.setTextColor(COL_GREEN, COL_BG);
  tft.drawString("SELESAI", midX / 2, 190);
  tft.drawString("SELESAI", midX + midX / 2, 190);

  tft.setTextDatum(TL_DATUM);
  drawFooter("ULANGI", COL_RED, "LANJUT", COL_GREEN);
}

// ---- Layar 1l/1m: Kuesioner (nomor 1-5 dari 5) ----
void layarKuesioner(int nomor, int total, const String& pertanyaan) {
  drawHeader("Kuesioner Ibu Hamil", true);
  clearContent();

  tft.setTextDatum(TR_DATUM);
  tft.setTextSize(1);
  tft.setTextColor(COL_TEXT_DIM, COL_BG);
  tft.drawString(String(nomor) + " / " + String(total), SCR_W - 20, 50);

  for (int i = 0; i < total; i++) {
    int cx = 24 + i * 18;
    if (i == nomor - 1) {
      tft.drawCircle(cx, 60, 6, COL_ACCENT);
    } else {
      tft.fillCircle(cx, 60, 4, i < nomor - 1 ? COL_ACCENT : COL_LINE);
    }
  }

  tft.setTextDatum(TL_DATUM);
  tft.setTextSize(2);
  tft.setTextColor(COL_TEXT, COL_BG);
  tft.setTextWrap(true);
  tft.drawString(pertanyaan, 22, 90);

  int btnY = 220, btnH = 40, gap = 12;
  int btnW = (SCR_W - 44 - gap) / 2;
  tft.fillRoundRect(22, btnY, btnW, btnH, 10, 0x1B5A);
  tft.drawRoundRect(22, btnY, btnW, btnH, 10, COL_GREEN);
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(COL_TEXT, 0x1B5A);
  tft.drawString("YA", 22 + btnW / 2, btnY + btnH / 2);

  int btn2X = 22 + btnW + gap;
  tft.fillRoundRect(btn2X, btnY, btnW, btnH, 10, 0x5943);
  tft.drawRoundRect(btn2X, btnY, btnW, btnH, 10, COL_RED);
  tft.drawString("TIDAK", btn2X + btnW / 2, btnY + btnH / 2);

  tft.setTextDatum(TL_DATUM);
  drawFooter("TIDAK", COL_RED, "YA", COL_GREEN);
}

// ---- Layar 1g: Mengirim Data ----
void layarKirim(float bb, float tb) {
  drawHeader("Mengirim Hasil", true);
  clearContent();

  tft.setTextDatum(MC_DATUM);
  tft.setTextSize(2);
  tft.setTextColor(COL_TEXT, COL_BG);
  tft.drawString("Mengirim data ke server...", SCR_W / 2, 140);
  tft.setTextSize(1);
  tft.setTextColor(COL_TEXT_DIM, COL_BG);
  tft.drawString("BB " + String(bb, 1) + " kg   TB " + String(tb, 1) + " cm", SCR_W / 2, 175);
  tft.setTextDatum(TL_DATUM);

  drawFooter("", COL_INACTIVE, "", COL_INACTIVE);
}

// ---- Layar 1h: Gagal Terhubung ----
void layarGagal(const String& pesan) {
  drawHeader("Mengirim Hasil", false);
  clearContent();

  tft.setTextDatum(MC_DATUM);
  tft.setTextSize(2);
  tft.setTextColor(COL_RED, COL_BG);
  tft.drawString("Gagal Terhubung", SCR_W / 2, 130);
  tft.setTextSize(1);
  tft.setTextColor(COL_TEXT_2, COL_BG);
  tft.drawString(pesan, SCR_W / 2, 160);
  tft.setTextDatum(TL_DATUM);

  drawFooter("GANTI PILIHAN", COL_RED, "COBA LAGI", COL_GREEN);
}

// ---- Layar 1i/1j/1k (anak) & 1n/1o/1p (ibu): Hasil ----
void layarHasil(bool isIbu, float bb, float tb, const String& kategoriHasil, uint16_t warna, const String& teksEdukasi) {
  drawHeader(isIbu ? "Hasil Pemeriksaan - Ibu Hamil" : "Hasil Pemeriksaan - Anak", true);
  clearContent();

  tft.setTextDatum(TL_DATUM);
  tft.setTextSize(1);
  tft.setTextColor(COL_TEXT_DIM, COL_BG);
  tft.drawString("BB " + String(bb, 1) + " kg   TB " + String(tb, 1) + " cm", 22, 48);

  tft.setTextColor(COL_TEXT_DIM, COL_BG);
  tft.drawString(isIbu ? "KATEGORI RISIKO KEHAMILAN" : "STATUS STUNTING (TB/U)", 22, 78);

  tft.setTextSize(3);
  tft.setTextColor(warna, COL_BG);
  tft.drawString(kategoriHasil, 22, 96);

  tft.fillRect(22, 132, 56, 5, warna);

  tft.setTextSize(1);
  tft.setTextColor(COL_TEXT_2, COL_BG);
  tft.setTextWrap(true);
  tft.drawString(teksEdukasi, 22, 148);

  drawFooter("SELANJUTNYA", COL_RED, "CETAK STRUK", COL_GREEN);
}

// ---- Layar 1q: Mencetak Struk ----
void layarCetak() {
  drawHeader("Mencetak Struk", true);
  clearContent();

  tft.setTextDatum(MC_DATUM);
  tft.setTextSize(2);
  tft.setTextColor(COL_TEXT, COL_BG);
  tft.drawString("Mencetak struk...", SCR_W / 2, 130);
  tft.setTextSize(1);
  tft.setTextColor(COL_TEXT_DIM, COL_BG);
  tft.drawString("Jangan tarik kertas sebelum selesai", SCR_W / 2, 165);
  tft.setTextDatum(TL_DATUM);

  drawFooter("", COL_INACTIVE, "", COL_INACTIVE);
}

// ---- Layar 1r: Selesai ----
void layarSelesai() {
  tft.fillScreen(COL_BG);
  tft.setTextDatum(MC_DATUM);

  tft.fillCircle(SCR_W / 2, 110, 36, COL_GREEN);
  tft.setTextSize(1);
  tft.setTextColor(COL_TEXT, COL_GREEN);
  tft.drawString("OK", SCR_W / 2, 110);

  tft.setTextSize(2);
  tft.setTextColor(COL_TEXT, COL_BG);
  tft.drawString("Pemeriksaan Selesai", SCR_W / 2, 165);
  tft.setTextSize(1);
  tft.setTextColor(COL_TEXT_2, COL_BG);
  tft.drawString("Terima kasih! Hasil terkirim & struk tercetak.", SCR_W / 2, 190);
  tft.setTextColor(COL_INACTIVE, COL_BG);
  tft.drawString("Kembali ke menu dalam 5 detik...", SCR_W / 2, 210);

  tft.setTextDatum(TL_DATUM);
  drawFooter("", COL_INACTIVE, "KE MENU", COL_GREEN);
}
```

- [ ] **Step 2: Verify**

No standalone check available; verified when Task 13's sketch compiles. Once flashed, each state transition in `lokabakka.ino` should render the matching screen above without visual glitching (use partial redraws already scoped to `clearContent()`/`drawHeader`/`drawFooter` regions — avoid adding a full `tft.fillScreen()` inside any screen function above except `layarBoot`/`layarSelesai`, which intentionally redraw the whole screen).

- [ ] **Step 3: Commit**

```bash
git add screens.h
git commit -m "feat: add TFT screen drawing functions for ESP32 firmware"
```

---

## Task 13: `lokabakka.ino` (state machine, setup/loop)

**Files:**
- Modify: `lokabakka.ino` (currently empty — this is the file the user opened; it becomes the sketch's main file, alongside `config.h`/`sensors.h`/`api.h`/`printer.h`/`screens.h` from Tasks 8-12 in the same folder)

**Interfaces:**
- Consumes everything produced by Tasks 8-12: `config.h`'s pins/palette, `sensors.h`'s `readWeightKg`/`readHeightCm`, `api.h`'s `wifiConnect`/`sendHeartbeat`/`kirimHasilPengukuran`/`HasilPemeriksaan`, `printer.h`'s `prnInit`/`cetakStruk`, `screens.h`'s `layarBoot`/`layarPilihKategori`/`layarUkur`/`layarKuesioner`/`layarKirim`/`layarGagal`/`layarHasil`/`layarCetak`/`layarSelesai`.
- Declares the global `TFT_eSPI tft` object that `screens.h` references via `extern`.

This is the final integration task — after this, the sketch is complete and ready to open in Arduino IDE.

- [ ] **Step 1: Write the full sketch**

```cpp
#include <TFT_eSPI.h>
#include <ArduinoJson.h>
#include "config.h"
#include "sensors.h"
#include "api.h"
#include "printer.h"
#include "screens.h"

TFT_eSPI tft = TFT_eSPI();

enum Layar {
  LAYAR_PILIH_KATEGORI,
  LAYAR_UKUR,
  LAYAR_KUESIONER,
  LAYAR_GAGAL,
  LAYAR_HASIL,
  LAYAR_SELESAI,
};

const char* PERTANYAAN[5] = {
  "Apakah Ibu makan gizi seimbang dan protein hewani (telur, ikan, daging, susu) setiap hari?",
  "Apakah Ibu rutin minum tablet tambah darah atau makan sumber zat besi (hati, bayam, dll)?",
  "Apakah Ibu sudah memahami info kehamilan sesuai usia kandungan saat ini?",
  "Apakah Ibu tinggal di lingkungan tanpa akses air bersih yang layak?",
  "Apakah Ibu merokok atau sering terpapar asap rokok selama kehamilan?",
};
// Urutan tetap: 0=protein 1=fe 2=pengetahuan 3=sanitasi 4=rokok - harus sama
// dengan key JSON yang dibaca lib/growth-standards/risiko-kehamilan-calc.ts
// di server (Task 2/4 pada plan backend).

Layar layarAktif = LAYAR_PILIH_KATEGORI;
int sorotanKategori = 0; // 0 = Anak, 1 = Ibu Hamil
const char* kategoriDipilih = "anak";
float bbUkur = 0, tbUkur = 0;
int kuesionerIndex = 0;
bool jawabanIbu[5];
HasilPemeriksaan hasilTerakhir;
bool wifiOk = false;

unsigned long lastBtnSatu = 0;
unsigned long lastBtnDua = 0;
unsigned long lastHeartbeat = 0;
unsigned long selesaiSejak = 0;

bool tombolDitekan(int pin, unsigned long &lastPress) {
  if (digitalRead(pin) == LOW && millis() - lastPress > 250) {
    lastPress = millis();
    return true;
  }
  return false;
}

void mulaiKirim() {
  layarAktif = LAYAR_UKUR; // dipakai sesaat sebelum digambar ulang di bawah
  layarKirim(bbUkur, tbUkur);

  if (strcmp(kategoriDipilih, "ibu") == 0) {
    JsonDocument jawabanDoc;
    jawabanDoc["protein"] = jawabanIbu[0];
    jawabanDoc["fe"] = jawabanIbu[1];
    jawabanDoc["pengetahuan"] = jawabanIbu[2];
    jawabanDoc["sanitasi"] = jawabanIbu[3];
    jawabanDoc["rokok"] = jawabanIbu[4];
    hasilTerakhir = kirimHasilPengukuran(kategoriDipilih, bbUkur, tbUkur, &jawabanDoc);
  } else {
    hasilTerakhir = kirimHasilPengukuran(kategoriDipilih, bbUkur, tbUkur, nullptr);
  }

  if (hasilTerakhir.ok) {
    layarAktif = LAYAR_HASIL;
    uint16_t warna = hasilTerakhir.kategoriHasil == "NORMAL" || hasilTerakhir.kategoriHasil == "RENDAH"
      ? COL_GREEN
      : hasilTerakhir.kategoriHasil == "PENDEK" || hasilTerakhir.kategoriHasil == "SEDANG"
        ? COL_YELLOW
        : COL_RED;
    layarHasil(strcmp(kategoriDipilih, "ibu") == 0, hasilTerakhir.bb, hasilTerakhir.tb,
               hasilTerakhir.kategoriHasil, warna, hasilTerakhir.teksEdukasi);
  } else {
    layarAktif = LAYAR_GAGAL;
    layarGagal(hasilTerakhir.error);
  }
}

void kembaliKeMenu() {
  sorotanKategori = 0;
  layarAktif = LAYAR_PILIH_KATEGORI;
  layarPilihKategori(sorotanKategori, wifiOk);
}

void setup() {
  Serial.begin(115200);

  pinMode(PIN_BTN_SATU, INPUT_PULLUP);
  pinMode(PIN_BTN_DUA, INPUT_PULLUP);

  tft.init();
  tft.setRotation(1);
  layarBoot();

  prnInit();

  wifiOk = wifiConnect();
  if (wifiOk) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }
  Serial.println(wifiOk ? "WiFi terhubung" : "WiFi gagal terhubung, lanjut ke kategori");

  kembaliKeMenu();
}

void loop() {
  if (millis() - lastHeartbeat > 8000) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }

  bool satu = tombolDitekan(PIN_BTN_SATU, lastBtnSatu);
  bool dua = tombolDitekan(PIN_BTN_DUA, lastBtnDua);
  if (!satu && !dua) return;

  switch (layarAktif) {
    case LAYAR_PILIH_KATEGORI:
      if (satu) {
        sorotanKategori = 1 - sorotanKategori;
        layarPilihKategori(sorotanKategori, wifiOk);
      } else if (dua) {
        kategoriDipilih = sorotanKategori == 0 ? "anak" : "ibu";
        bbUkur = readWeightKg(kategoriDipilih);
        tbUkur = readHeightCm(kategoriDipilih);
        layarAktif = LAYAR_UKUR;
        layarUkur(bbUkur, tbUkur);
      }
      break;

    case LAYAR_UKUR:
      if (satu) {
        bbUkur = readWeightKg(kategoriDipilih);
        tbUkur = readHeightCm(kategoriDipilih);
        layarUkur(bbUkur, tbUkur);
      } else if (dua) {
        if (strcmp(kategoriDipilih, "ibu") == 0) {
          kuesionerIndex = 0;
          layarAktif = LAYAR_KUESIONER;
          layarKuesioner(1, 5, PERTANYAAN[0]);
        } else {
          mulaiKirim();
        }
      }
      break;

    case LAYAR_KUESIONER:
      if (satu || dua) {
        jawabanIbu[kuesionerIndex] = dua; // dua = YA (true), satu = TIDAK (false)
        kuesionerIndex++;
        if (kuesionerIndex < 5) {
          layarKuesioner(kuesionerIndex + 1, 5, PERTANYAAN[kuesionerIndex]);
        } else {
          mulaiKirim();
        }
      }
      break;

    case LAYAR_GAGAL:
      if (satu) {
        kembaliKeMenu();
      } else if (dua) {
        mulaiKirim();
      }
      break;

    case LAYAR_HASIL:
      if (satu) {
        layarAktif = LAYAR_SELESAI;
        selesaiSejak = millis();
        layarSelesai();
      } else if (dua) {
        layarCetak();
        cetakStruk(hasilTerakhir.namaPasien, hasilTerakhir.tanggal, hasilTerakhir.bb, hasilTerakhir.tb,
                   hasilTerakhir.kategoriHasil, hasilTerakhir.teksEdukasi);
        layarAktif = LAYAR_SELESAI;
        selesaiSejak = millis();
        layarSelesai();
      }
      break;

    case LAYAR_SELESAI:
      if (dua) {
        kembaliKeMenu();
      }
      break;
  }
}
```

- [ ] **Step 2: Add the auto-return timeout for the Selesai screen**

The 5-second auto-return (from the mockup's "Selesai — kembali otomatis 5 dtk, atau tekan (2)") needs a check outside the button-press branch. Add this right after the heartbeat check at the top of `loop()`:

```cpp
  if (layarAktif == LAYAR_SELESAI && millis() - selesaiSejak > 5000) {
    kembaliKeMenu();
  }
```

- [ ] **Step 3: Verify — open in Arduino IDE**

1. Install libraries via Library Manager: **TFT_eSPI**, **ArduinoJson** (v7.x).
2. Configure `TFT_eSPI`'s `User_Setup.h` (in the library folder) for an ILI9488 480x320 driver with `TFT_CS`/`TFT_DC`/`TFT_RST` matching `PIN_TFT_CS`/`PIN_TFT_DC`/`PIN_TFT_RST` from `config.h`, and SPI pins matching your wiring.
3. Fill in real `WIFI_SSID`, `WIFI_PASSWORD`, `API_BASE_URL`, `ESP32_API_KEY` in `config.h`.
4. Board: **ESP32 Dev Module**. Open `lokabakka.ino` — Arduino IDE will show all 5 companion files (`config.h`, `sensors.h`, `api.h`, `printer.h`, `screens.h`) as tabs since they live in the same folder.
5. Verify/Compile (checkmark button). Expected: compiles with no errors.
6. If hardware is connected: flash it, open Serial Monitor at 115200 baud, confirm `"WiFi terhubung"` prints, and manually walk through Pilih Kategori -> Ukur -> (Kuesioner if Ibu) -> Kirim -> Hasil -> Cetak -> Selesai using the two buttons, confirming each screen from Task 12 renders and the receipt (Task 11) prints.

- [ ] **Step 4: Commit**

```bash
git add lokabakka.ino
git commit -m "feat: implement ESP32 state machine wiring screens, sensors, api, and printer"
```

---

## Self-Review Notes

- **Spec coverage:** architecture/data-flow (Tasks 3-4, 10, 13), scoring formulas (Task 2), schema/API changes (Tasks 1, 3, 4), web modal gating + confirm/Ulangi (Tasks 6-7), firmware state machine + screens (Tasks 8-13), receipt design (Task 11) — all covered.
- **Placeholder scan:** no TBD/TODO left; `config.h`'s WiFi/API placeholders are legitimate user-supplied deployment values (same pattern as the original example sketch), not vague instructions.
- **Type consistency:** `JawabanKuesioner` field names (`protein`, `fe`, `pengetahuan`, `sanitasi`, `rokok`) are identical across Task 2 (TS type), Task 4 (route consuming it), and Task 13 (firmware JSON keys) — verified matching in each task's code.
- **Out of scope (per design spec):** real HX711/HC-SR04 sensor code, lamp indicators, real Inter Tight font conversion, multi-device support.

