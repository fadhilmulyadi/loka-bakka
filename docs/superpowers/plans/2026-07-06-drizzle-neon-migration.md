# Drizzle + Neon Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Prisma ORM (currently pointed at Supabase Postgres) with Drizzle ORM pointed at a Neon Postgres database, with zero change to server action signatures or page behavior.

**Architecture:** New `lib/db/schema.ts` (Drizzle table + relation definitions, 1:1 with the current `prisma/schema.prisma` models) and `lib/db/client.ts` (Drizzle client over `pg.Pool`, reusing the already-installed `pg` driver — no new database driver dependency). Each of the 5 files that import `{ prisma } from "@/lib/db"` is rewritten in place to import `{ db }` from `@/lib/db/client` and the relevant tables from `@/lib/db/schema`, using Drizzle's relational query API (`db.query.<table>.findFirst/findMany`) wherever Prisma used `include`. Prisma and the old Supabase connection stay live and untouched until the final cutover task, so the app is buildable and runnable after every task.

**Tech Stack:** drizzle-orm (`drizzle-orm/node-postgres` driver), drizzle-kit (schema push, dev-only), existing `pg` package (already a dependency). No new database driver package.

## Global Constraints

- No new dependencies beyond `drizzle-orm` (runtime) and `drizzle-kit` (dev). Do NOT add `@neondatabase/serverless` — the Neon connection string is a standard Postgres URL and works over `pg`, which is already installed.
- Fresh start on data: the Neon database starts empty. Do not write any data-copy/export/import code — that was explicitly ruled out.
- Schema workflow matches the current Prisma habit: `drizzle-kit push` (schema.ts is the source of truth, no migration files), not `drizzle-kit generate`.
- Keep every server action's exported function name, parameters, and return shape byte-for-byte identical. Every page/component that calls these actions must require zero changes.
- This repo has no unit/integration test runner for the DB layer (Playwright here is browser e2e only). Verification per task is: (1) `npx tsc --noEmit` passes with zero errors, and (2) manually exercising the affected page(s) via `npm run dev` in the browser. Do not add a test framework to fill this gap — out of scope (YAGNI).
- Never commit the raw Neon connection string to a git-tracked file. It only ever goes into `.env` / `.env.local` (already gitignored via `.env*` in `.gitignore`).
- During the migration (Tasks 1–7), the new Drizzle client reads a separate env var, `NEON_DATABASE_URL`, so Prisma's `DATABASE_URL`/`DIRECT_URL` (still pointed at Supabase) are undisturbed. Task 8 folds `NEON_DATABASE_URL` into `DATABASE_URL` and deletes the Supabase values.

---

## File Structure

- Create `lib/db/schema.ts` — all 9 Drizzle table definitions + `relations()` (replaces `prisma/schema.prisma`).
- Create `lib/db/client.ts` — Drizzle client singleton over a `pg.Pool` (replaces `lib/db.ts`'s Prisma client).
- Create `drizzle.config.ts` — drizzle-kit config for `db:push`.
- Modify `auth.ts`, `lib/actions/tasks.ts`, `lib/actions/pregnancy.ts`, `lib/actions/ibu.ts`, `lib/actions/kader.ts` — swap Prisma calls for Drizzle calls, one file (or half-file) per task.
- Modify `package.json` — dependency swap, drop `postinstall`, add `db:push` script.
- Modify `.env`, `.env.local` — add `NEON_DATABASE_URL` (Task 1), then fold into `DATABASE_URL` and remove Supabase values + `DIRECT_URL` (Task 8).
- Delete (Task 8): `prisma/` directory, `prisma.config.ts`, `lib/db.ts`.
- Modify (Task 8): `.gitignore` (drop the `/prisma/generated/prisma` line), `eslint.config.mjs` (drop the stale `app/generated/prisma/**` ignore).

---

### Task 1: Drizzle schema, client, and Neon connectivity

**Files:**
- Create: `lib/db/schema.ts`
- Create: `lib/db/client.ts`
- Create: `drizzle.config.ts`
- Modify: `package.json`
- Modify: `.env`, `.env.local`

**Interfaces:**
- Produces: `db` (Drizzle client instance, exported from `lib/db/client.ts`) and the 9 named table exports (`posyandu`, `kader`, `ibu`, `dailyTask`, `anak`, `pengukuran`, `skriningShamil`, `pregnancyProfile`, `pregnancyVisit`) plus their `relations()` companions, all from `lib/db/schema.ts`. Every later task imports from these two files.

- [ ] **Step 1: Install Drizzle**

```bash
npm install drizzle-orm
npm install -D drizzle-kit
```

- [ ] **Step 2: Write the schema**

Create `lib/db/schema.ts`:

```ts
import { pgTable, text, boolean, integer, doublePrecision, timestamp, jsonb, unique } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

export const posyandu = pgTable("Posyandu", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  nama: text("nama").notNull(),
  alamat: text("alamat").notNull(),
  kelurahan: text("kelurahan").notNull(),
  kecamatan: text("kecamatan").notNull(),
  kota: text("kota").notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
})

export const kader = pgTable("Kader", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  nama: text("nama").notNull(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  posyanduId: text("posyanduId").notNull().references(() => posyandu.id),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
})

export const ibu = pgTable("Ibu", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  nama: text("nama").notNull(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  noHp: text("noHp"),
  tanggalLahir: timestamp("tanggalLahir", { mode: "date" }),
  alamat: text("alamat"),
  isHamil: boolean("isHamil").notNull().default(false),
  isActive: boolean("isActive").notNull().default(true),
  posyanduId: text("posyanduId").notNull().references(() => posyandu.id),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
})

export const dailyTask = pgTable("DailyTask", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  ibuId: text("ibuId").notNull().references(() => ibu.id, { onDelete: "cascade" }),
  taskId: integer("taskId").notNull(),
  completed: boolean("completed").notNull().default(false),
  date: timestamp("date", { mode: "date" }).notNull().defaultNow(),
}, (table) => [
  unique().on(table.ibuId, table.taskId, table.date),
])

export const anak = pgTable("Anak", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  nama: text("nama").notNull(),
  tanggalLahir: timestamp("tanggalLahir", { mode: "date" }).notNull(),
  jenisKelamin: text("jenisKelamin").notNull(),
  namaAyah: text("namaAyah"),
  anakKe: integer("anakKe"),
  ibuId: text("ibuId").notNull().references(() => ibu.id),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
})

export const pengukuran = pgTable("Pengukuran", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  anakId: text("anakId").notNull().references(() => anak.id),
  posyanduId: text("posyanduId").notNull().references(() => posyandu.id),
  kaderId: text("kaderId").notNull().references(() => kader.id),
  beratBadan: doublePrecision("beratBadan").notNull(),
  tinggiBadan: doublePrecision("tinggiBadan").notNull(),
  zScoreTBU: doublePrecision("zScoreTBU").notNull(),
  zScoreBBU: doublePrecision("zScoreBBU").notNull(),
  zScoreBBTB: doublePrecision("zScoreBBTB").notNull(),
  statusTBU: text("statusTBU").notNull(),
  statusBBU: text("statusBBU").notNull(),
  statusBBTB: text("statusBBTB").notNull(),
  tanggal: timestamp("tanggal", { mode: "date" }).notNull().defaultNow(),
})

export const skriningShamil = pgTable("SkriningShamil", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  ibuId: text("ibuId").notNull().references(() => ibu.id),
  posyanduId: text("posyanduId").notNull().references(() => posyandu.id),
  kaderId: text("kaderId").notNull().references(() => kader.id),
  skorRisiko: integer("skorRisiko").notNull(),
  kategori: text("kategori").notNull(),
  jawaban: jsonb("jawaban").notNull(),
  tanggal: timestamp("tanggal", { mode: "date" }).notNull().defaultNow(),
})

export const pregnancyProfile = pgTable("PregnancyProfile", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  ibuId: text("ibuId").notNull().unique().references(() => ibu.id, { onDelete: "cascade" }),
  hpht: timestamp("hpht", { mode: "date" }).notNull(),
  bbPrepregnancyKg: doublePrecision("bbPrepregnancyKg").notNull(),
  heightCm: doublePrecision("heightCm").notNull(),
  imtPrepregnancy: doublePrecision("imtPrepregnancy").notNull(),
  imtCategory: text("imtCategory").notNull(),
  targetGainMinKg: doublePrecision("targetGainMinKg").notNull(),
  targetGainMaxKg: doublePrecision("targetGainMaxKg").notNull(),
  weeklyGainMinKg: doublePrecision("weeklyGainMinKg").notNull(),
  weeklyGainMaxKg: doublePrecision("weeklyGainMaxKg").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
})

export const pregnancyVisit = pgTable("PregnancyVisit", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  ibuId: text("ibuId").notNull().references(() => ibu.id, { onDelete: "cascade" }),
  kaderId: text("kaderId").references(() => kader.id),
  visitDate: timestamp("visitDate", { mode: "date" }).notNull(),
  currentWeightKg: doublePrecision("currentWeightKg").notNull(),
  weightGainKg: doublePrecision("weightGainKg").notNull(),
  lilaCm: doublePrecision("lilaCm").notNull(),
  hbGdl: doublePrecision("hbGdl").notNull(),
  isOnTrack: boolean("isOnTrack").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
})

export const posyanduRelations = relations(posyandu, ({ many }) => ({
  kaders: many(kader),
  ibus: many(ibu),
  pengukurans: many(pengukuran),
  skrinings: many(skriningShamil),
}))

export const kaderRelations = relations(kader, ({ one, many }) => ({
  posyandu: one(posyandu, { fields: [kader.posyanduId], references: [posyandu.id] }),
  pengukurans: many(pengukuran),
  skrinings: many(skriningShamil),
  pregnancyVisits: many(pregnancyVisit),
}))

export const ibuRelations = relations(ibu, ({ one, many }) => ({
  posyandu: one(posyandu, { fields: [ibu.posyanduId], references: [posyandu.id] }),
  anaks: many(anak),
  skrinings: many(skriningShamil),
  pregnancyProfile: one(pregnancyProfile, { fields: [ibu.id], references: [pregnancyProfile.ibuId] }),
  pregnancyVisits: many(pregnancyVisit),
  dailyTasks: many(dailyTask),
}))

export const dailyTaskRelations = relations(dailyTask, ({ one }) => ({
  ibu: one(ibu, { fields: [dailyTask.ibuId], references: [ibu.id] }),
}))

export const anakRelations = relations(anak, ({ one, many }) => ({
  ibu: one(ibu, { fields: [anak.ibuId], references: [ibu.id] }),
  pengukurans: many(pengukuran),
}))

export const pengukuranRelations = relations(pengukuran, ({ one }) => ({
  anak: one(anak, { fields: [pengukuran.anakId], references: [anak.id] }),
  posyandu: one(posyandu, { fields: [pengukuran.posyanduId], references: [posyandu.id] }),
  kader: one(kader, { fields: [pengukuran.kaderId], references: [kader.id] }),
}))

export const skriningShamilRelations = relations(skriningShamil, ({ one }) => ({
  ibu: one(ibu, { fields: [skriningShamil.ibuId], references: [ibu.id] }),
  posyandu: one(posyandu, { fields: [skriningShamil.posyanduId], references: [posyandu.id] }),
  kader: one(kader, { fields: [skriningShamil.kaderId], references: [kader.id] }),
}))

export const pregnancyProfileRelations = relations(pregnancyProfile, ({ one }) => ({
  ibu: one(ibu, { fields: [pregnancyProfile.ibuId], references: [ibu.id] }),
}))

export const pregnancyVisitRelations = relations(pregnancyVisit, ({ one }) => ({
  ibu: one(ibu, { fields: [pregnancyVisit.ibuId], references: [ibu.id] }),
  kader: one(kader, { fields: [pregnancyVisit.kaderId], references: [kader.id] }),
}))
```

- [ ] **Step 3: Write the client**

Create `lib/db/client.ts`:

```ts
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

function getDb() {
  const g = global as unknown as { db?: ReturnType<typeof drizzle<typeof schema>> }
  if (!g.db) {
    const pool = new Pool({
      connectionString: process.env.NEON_DATABASE_URL!,
      max: 1, // one connection per serverless function instance
      ssl: { rejectUnauthorized: false },
    })
    g.db = drizzle(pool, { schema })
  }
  return g.db
}

export const db = getDb()
```

- [ ] **Step 4: Write the drizzle-kit config**

Create `drizzle.config.ts`:

```ts
import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.NEON_DATABASE_URL!,
  },
})
```

- [ ] **Step 5: Add the Neon connection string to the env files**

Add this line to both `.env` and `.env.local` (do not remove the existing `DATABASE_URL`/`DIRECT_URL` — Prisma still needs them until Task 8):

```
NEON_DATABASE_URL="<the Neon connection string>"
```

Add the `db:push` script to `package.json` (leave `postinstall` alone for now — Task 8 removes it):

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "postinstall": "prisma generate",
  "db:push": "drizzle-kit push"
}
```

- [ ] **Step 6: Push the schema to Neon**

Run: `npm run db:push`
Expected: drizzle-kit connects to Neon, prints the 9 tables it's about to create, prompts to confirm (accept), and reports success. No errors.

- [ ] **Step 7: Verify connectivity with a throwaway query**

Run this one-off script and delete it after (`node --experimental-strip-types` works on Node 24; alternatively use `npx tsx`):

```bash
npx tsx -e "
import { db } from './lib/db/client'
import { posyandu } from './lib/db/schema'
db.select().from(posyandu).then((rows) => {
  console.log('OK, rows:', rows.length)
  process.exit(0)
}).catch((e) => { console.error(e); process.exit(1) })
"
```

Expected: `OK, rows: 0` (table exists and is empty).

- [ ] **Step 8: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors (existing Prisma-based files are untouched and still compile against the still-installed Prisma client).

- [ ] **Step 9: Commit**

```bash
git add lib/db/schema.ts lib/db/client.ts drizzle.config.ts package.json package-lock.json
git commit -m "feat: add Drizzle schema and Neon client alongside Prisma"
```

(`.env`/`.env.local` are gitignored — nothing to add there.)

---

### Task 2: Migrate `auth.ts`

**Files:**
- Modify: `auth.ts`

**Interfaces:**
- Consumes: `db` from `lib/db/client.ts`, `kader`, `ibu` tables from `lib/db/schema.ts` (Task 1).
- Produces: no change to `handlers`, `signIn`, `signOut`, `auth` exports — same names, same behavior.

- [ ] **Step 1: Replace the Prisma import and both `authorize` lookups**

In `auth.ts`, replace:

```ts
import { prisma } from "@/lib/db"
```

with:

```ts
import { db } from "@/lib/db/client"
import { kader as kaderTable, ibu as ibuTable } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
```

Replace the kader `authorize`:

```ts
async authorize(credentials) {
  if (!credentials?.username || !credentials?.password) return null

  const kader = await db.query.kader.findFirst({
    where: eq(kaderTable.username, credentials.username as string),
    columns: { id: true, nama: true, password: true, posyanduId: true },
  })

  if (!kader) return null

  const valid = await bcrypt.compare(credentials.password as string, kader.password)
  if (!valid) return null

  return {
    id: kader.id,
    name: kader.nama,
    role: "kader" as const,
    posyanduId: kader.posyanduId,
  }
},
```

Replace the ibu `authorize`:

```ts
async authorize(credentials) {
  if (!credentials?.username || !credentials?.password) return null

  const ibu = await db.query.ibu.findFirst({
    where: eq(ibuTable.username, credentials.username as string),
    columns: { id: true, nama: true, password: true, posyanduId: true },
  })

  if (!ibu) return null

  const valid = await bcrypt.compare(credentials.password as string, ibu.password)
  if (!valid) return null

  return {
    id: ibu.id,
    name: ibu.nama,
    role: "ibu" as const,
    posyanduId: ibu.posyanduId,
  }
},
```

- [ ] **Step 2: Seed one test kader and one test ibu row for manual login testing**

```bash
npx tsx -e "
import { db } from './lib/db/client'
import { posyandu, kader, ibu } from './lib/db/schema'
import bcrypt from 'bcryptjs'

async function main() {
  const [p] = await db.insert(posyandu).values({
    nama: 'Posyandu Melati', alamat: 'Jl. Test', kelurahan: 'Test', kecamatan: 'Test', kota: 'Test',
  }).returning()
  const hash = await bcrypt.hash('test1234', 10)
  await db.insert(kader).values({ nama: 'Kader Test', username: 'kadertest', password: hash, posyanduId: p.id })
  await db.insert(ibu).values({ nama: 'Ibu Test', username: 'ibutest', password: hash, posyanduId: p.id })
  console.log('seeded', p.id)
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
"
```

Expected: prints `seeded <uuid>`.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit` — expected: no errors.

- [ ] **Step 4: Manual verify**

Run: `npm run dev`. Since every other server action still reads/writes the Supabase DB via Prisma, login through `auth.ts` now authenticates against Neon — expect the kader/ibu dashboards to fail loading data past login (that's expected until later tasks; this step only confirms login itself). Go to `/login`, sign in as kader with `kadertest` / `test1234` — expect a successful redirect (not a login error). Do the same for ibu with `ibutest` / `test1234`.

- [ ] **Step 5: Commit**

```bash
git add auth.ts
git commit -m "refactor: migrate auth.ts from Prisma to Drizzle"
```

---

### Task 3: Migrate `lib/actions/tasks.ts`

**Files:**
- Modify: `lib/actions/tasks.ts`

**Interfaces:**
- Consumes: `db`, `dailyTask`, `ibu` (Task 1).
- Produces: no change to `getDailyTasks()`, `toggleDailyTask(taskId: number)`, `getDailyTaskStats()` signatures or return shapes.

- [ ] **Step 1: Replace the import**

```ts
import { db } from "@/lib/db/client"
import { dailyTask, ibu } from "@/lib/db/schema"
import { and, eq, gte, lte } from "drizzle-orm"
```

- [ ] **Step 2: Rewrite `getDailyTasks`**

```ts
export async function getDailyTasks() {
  const session = await auth()
  if (!session || session.user.role !== "ibu") throw new Error("Unauthorized")

  const { start, end } = getTodayRange()

  const tasks = await db.query.dailyTask.findMany({
    where: and(
      eq(dailyTask.ibuId, session.user.id),
      gte(dailyTask.date, start),
      lte(dailyTask.date, end),
    ),
  })

  return tasks
}
```

- [ ] **Step 3: Rewrite `toggleDailyTask`**

```ts
export async function toggleDailyTask(taskId: number) {
  const session = await auth()
  if (!session || session.user.role !== "ibu") throw new Error("Unauthorized")

  const { start } = getTodayRange()

  const existing = await db.query.dailyTask.findFirst({
    where: and(
      eq(dailyTask.ibuId, session.user.id),
      eq(dailyTask.taskId, taskId),
      eq(dailyTask.date, start),
    ),
  })

  if (existing) {
    await db.update(dailyTask).set({ completed: !existing.completed }).where(eq(dailyTask.id, existing.id))
  } else {
    await db.insert(dailyTask).values({
      ibuId: session.user.id,
      taskId: taskId,
      completed: true,
      date: start,
    })
  }

  revalidatePath("/ibu/dashboard")
  revalidatePath("/ibu/tugas")
}
```

- [ ] **Step 4: Rewrite `getDailyTaskStats`**

```ts
export async function getDailyTaskStats() {
  const session = await auth()
  if (!session || session.user.role !== "ibu") return { score: 0, doneCount: 0 }

  const ibuRow = await db.query.ibu.findFirst({
    where: eq(ibu.id, session.user.id),
    columns: { isHamil: true },
  })

  const { start, end } = getTodayRange()

  const tasks = await db.query.dailyTask.findMany({
    where: and(
      eq(dailyTask.ibuId, session.user.id),
      gte(dailyTask.date, start),
      lte(dailyTask.date, end),
      eq(dailyTask.completed, true),
    ),
  })

  let score = 0
  let doneCount = 0

  if (ibuRow?.isHamil) {
    const PREGNANCY_PTS = [20, 20, 20, 20, 10, 10]
    tasks.forEach(t => {
      if (t.taskId >= 0 && t.taskId < PREGNANCY_PTS.length) {
        score += PREGNANCY_PTS[t.taskId]
        doneCount++
      }
    })
  } else {
    const CHILD_PTS = [20, 20, 20, 20, 20]
    tasks.forEach(t => {
      if (t.taskId >= 0 && t.taskId < CHILD_PTS.length) {
        score += CHILD_PTS[t.taskId]
        doneCount++
      }
    })
  }

  return { score, doneCount }
}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit` — expected: no errors.

- [ ] **Step 6: Manual verify**

`npm run dev`, sign in as `ibutest`, go to `/ibu/tugas`, toggle a task on and off — expect it to persist across a page refresh, and `/ibu/dashboard`'s task score widget to update.

- [ ] **Step 7: Commit**

```bash
git add lib/actions/tasks.ts
git commit -m "refactor: migrate lib/actions/tasks.ts from Prisma to Drizzle"
```

---

### Task 4: Migrate `lib/actions/pregnancy.ts`

**Files:**
- Modify: `lib/actions/pregnancy.ts`

**Interfaces:**
- Consumes: `db`, `pregnancyProfile`, `pregnancyVisit`, `ibu` (Task 1).
- Produces: no change to `getPregnancyProfile()`, `getPregnancyVisits()`, `savePregnancyVisit(data)` signatures or return shapes.

- [ ] **Step 1: Replace the import**

```ts
import { db } from "@/lib/db/client"
import { pregnancyProfile, pregnancyVisit, ibu } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
```

- [ ] **Step 2: Rewrite `getPregnancyProfile`**

```ts
export async function getPregnancyProfile(): Promise<PregnancyProfileData | null> {
  const session = await auth()
  if (!session || session.user.role !== "ibu") throw new Error("Unauthorized")

  const profile = await db.query.pregnancyProfile.findFirst({
    where: eq(pregnancyProfile.ibuId, session.user.id),
  })

  if (!profile) return null

  return {
    id: profile.id,
    bbPrepregnancyKg: profile.bbPrepregnancyKg,
    heightCm: profile.heightCm,
    imtPrepregnancy: profile.imtPrepregnancy,
    imtCategory: profile.imtCategory as PregnancyProfileData['imtCategory'],
    targetGainMinKg: profile.targetGainMinKg,
    targetGainMaxKg: profile.targetGainMaxKg,
    weeklyGainMinKg: profile.weeklyGainMinKg,
    weeklyGainMaxKg: profile.weeklyGainMaxKg,
  }
}
```

- [ ] **Step 3: Rewrite `getPregnancyVisits`**

```ts
export async function getPregnancyVisits(): Promise<PregnancyVisitData[]> {
  const session = await auth()
  if (!session || session.user.role !== "ibu") throw new Error("Unauthorized")

  const visits = await db.query.pregnancyVisit.findMany({
    where: eq(pregnancyVisit.ibuId, session.user.id),
    orderBy: desc(pregnancyVisit.visitDate),
  })

  return visits.map(v => ({
    id: v.id,
    visitDate: v.visitDate,
    currentWeightKg: v.currentWeightKg,
    weightGainKg: v.weightGainKg,
    lilaCm: v.lilaCm,
    hbGdl: v.hbGdl,
    isOnTrack: v.isOnTrack,
  }))
}
```

- [ ] **Step 4: Rewrite `savePregnancyVisit`**

```ts
export async function savePregnancyVisit(data: {
  ibuId: string
  currentWeightKg: number
  lilaCm: number
  hbGdl: number
  heightCm: number
  bbPrepregnancyKg: number
  hpht: Date
}) {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

  const ibuRow = await db.query.ibu.findFirst({
    where: eq(ibu.id, data.ibuId),
    with: { pregnancyProfile: true },
  })

  if (!ibuRow) throw new Error("Ibu not found")

  let profile = ibuRow.pregnancyProfile

  if (!profile) {
    const imt = calculateIMT(data.bbPrepregnancyKg, data.heightCm)
    const category = getIMTCategory(imt)
    const targets = getIOMTargets(category)

    const [created] = await db.insert(pregnancyProfile).values({
      ibuId: data.ibuId,
      hpht: data.hpht,
      bbPrepregnancyKg: data.bbPrepregnancyKg,
      heightCm: data.heightCm,
      imtPrepregnancy: imt,
      imtCategory: category,
      targetGainMinKg: targets.totalGainMinKg,
      targetGainMaxKg: targets.totalGainMaxKg,
      weeklyGainMinKg: targets.weeklyGainMinKg,
      weeklyGainMaxKg: targets.weeklyGainMaxKg,
    }).returning()

    profile = created
  }

  const weightGainKg = data.currentWeightKg - profile.bbPrepregnancyKg
  const isOnTrack = data.lilaCm >= 23.5 && data.hbGdl >= 11.0

  const [result] = await db.insert(pregnancyVisit).values({
    ibuId: data.ibuId,
    visitDate: new Date(),
    currentWeightKg: data.currentWeightKg,
    weightGainKg: weightGainKg,
    lilaCm: data.lilaCm,
    hbGdl: data.hbGdl,
    isOnTrack: isOnTrack,
  }).returning()

  if (!ibuRow.isHamil) {
    await db.update(ibu).set({ isHamil: true }).where(eq(ibu.id, data.ibuId))
  }

  const { revalidatePath } = await import("next/cache")
  revalidatePath(`/kader/ibu/${data.ibuId}`)
  revalidatePath("/kader/dashboard")

  return result
}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit` — expected: no errors.

- [ ] **Step 6: Manual verify**

`npm run dev`, sign in as kader, record a pregnancy visit for a pregnant ibu (or promote `ibutest` to `isHamil: true` first via a throwaway `db.update` script) — expect the visit to save and show up in the ibu's profile and the ibu's own dashboard.

- [ ] **Step 7: Commit**

```bash
git add lib/actions/pregnancy.ts
git commit -m "refactor: migrate lib/actions/pregnancy.ts from Prisma to Drizzle"
```

---

### Task 5: Migrate `lib/actions/ibu.ts`

**Files:**
- Modify: `lib/actions/ibu.ts`

**Interfaces:**
- Consumes: `db`, `ibu`, `anak`, `pengukuran`, `skriningShamil` (Task 1).
- Produces: no change to `getIbuData()`, `getIbuProfile()`, `getIbuAnaks()`, `getIbuAnakForDashboard(id)`, `getIbuAnakDetail(id)` signatures or return shapes.

- [ ] **Step 1: Replace the import**

```ts
import { db } from "@/lib/db/client"
import { ibu, anak, pengukuran, skriningShamil } from "@/lib/db/schema"
import { eq, and, desc, asc } from "drizzle-orm"
```

- [ ] **Step 2: Rewrite `getIbuData`**

Replace the query block (everything else in the function body is unchanged — only the `prisma.ibu.findUnique(...)` call and its result variable name change). Note `pregnancyVisits` uses the callback form of `orderBy` since it's ordered by its own `visitDate` column, not `pengukuran.tanggal`:

```ts
const ibuRow = await db.query.ibu.findFirst({
  where: eq(ibu.id, session.user.id),
  with: {
    anaks: {
      with: {
        pengukurans: { orderBy: desc(pengukuran.tanggal), limit: 10 },
      },
      orderBy: asc(anak.createdAt),
    },
    skrinings: { orderBy: desc(skriningShamil.tanggal), limit: 1 },
    pregnancyProfile: true,
    pregnancyVisits: { orderBy: (pv, { desc }) => desc(pv.visitDate), limit: 1 },
  },
})

if (!ibuRow) return null
```

Then replace every remaining `ibu.` reference in the rest of the function body with `ibuRow.` (the fields `isHamil`, `skrinings`, `pregnancyProfile`, `pregnancyVisits`, `anaks`, `nama` are all still present with identical shapes).

- [ ] **Step 3: Rewrite `getIbuProfile`**

```ts
export async function getIbuProfile() {
  const session = await auth()
  if (!session || session.user.role !== "ibu") {
    throw new Error("Unauthorized")
  }

  const ibuRow = await db.query.ibu.findFirst({
    where: eq(ibu.id, session.user.id),
    with: {
      posyandu: true,
      pregnancyProfile: true,
      skrinings: { orderBy: desc(skriningShamil.tanggal), limit: 1 },
    },
  })

  if (!ibuRow) return null

  return {
    nama: ibuRow.nama,
    noHp: ibuRow.noHp,
    tanggalLahir: ibuRow.tanggalLahir,
    alamat: ibuRow.alamat,
    posyandu: ibuRow.posyandu.nama,
    kelurahan: ibuRow.posyandu.kelurahan,
    kecamatan: ibuRow.posyandu.kecamatan,
    isPregnant: ibuRow.isHamil,
    lastSkrining: ibuRow.skrinings[0] ?? null,
    pregnancyProfile: ibuRow.pregnancyProfile,
  }
}
```

- [ ] **Step 4: Rewrite `getIbuAnaks`**

```ts
export async function getIbuAnaks() {
  const session = await auth()
  if (!session || session.user.role !== "ibu") throw new Error("Unauthorized")

  const ibuRow = await db.query.ibu.findFirst({
    where: eq(ibu.id, session.user.id),
    with: {
      anaks: {
        with: {
          pengukurans: { orderBy: desc(pengukuran.tanggal), limit: 1 },
        },
        orderBy: asc(anak.createdAt),
      },
    },
  })

  if (!ibuRow) return []

  return ibuRow.anaks.map((anakRow) => {
    const last = anakRow.pengukurans[0] ?? null
    const birth = new Date(anakRow.tanggalLahir)
    const now = new Date()
    const months =
      (now.getFullYear() - birth.getFullYear()) * 12 +
      (now.getMonth() - birth.getMonth())
    return {
      id: anakRow.id,
      nama: anakRow.nama,
      jenisKelamin: anakRow.jenisKelamin as "L" | "P",
      usia: months < 12 ? `${months} bln` : `${Math.floor(months / 12)} thn ${months % 12} bln`,
      status: last?.statusTBU ?? null,
      bb: last?.beratBadan ?? null,
      tanggalPengukuran: last?.tanggal ?? null,
    }
  })
}
```

- [ ] **Step 5: Rewrite `getIbuAnakForDashboard`**

```ts
export async function getIbuAnakForDashboard(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "ibu") throw new Error("Unauthorized")

  const [ibuRow, anakRow] = await Promise.all([
    db.query.ibu.findFirst({ where: eq(ibu.id, session.user.id), columns: { nama: true } }),
    db.query.anak.findFirst({
      where: and(eq(anak.id, id), eq(anak.ibuId, session.user.id)),
      with: { pengukurans: { orderBy: desc(pengukuran.tanggal), limit: 10 } },
    }),
  ])

  if (!ibuRow || !anakRow) return null

  const birth = new Date(anakRow.tanggalLahir)
  const now = new Date()
  const usiaBulan =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())

  return {
    nama: ibuRow.nama,
    childData: {
      id: anakRow.id,
      nama: anakRow.nama,
      jenisKelamin: anakRow.jenisKelamin as "L" | "P",
      tanggalLahir: anakRow.tanggalLahir,
      usiaBulan,
      lastPengukuran: anakRow.pengukurans[0]
        ? {
            beratBadan: anakRow.pengukurans[0].beratBadan,
            tinggiBadan: anakRow.pengukurans[0].tinggiBadan,
            statusTBU: anakRow.pengukurans[0].statusTBU,
            zScoreTBU: anakRow.pengukurans[0].zScoreTBU,
            tanggal: anakRow.pengukurans[0].tanggal,
          }
        : null,
      pengukurans: anakRow.pengukurans.map((p) => ({
        tanggal: p.tanggal,
        beratBadan: p.beratBadan,
        tinggiBadan: p.tinggiBadan,
        statusTBU: p.statusTBU,
        zScoreTBU: p.zScoreTBU,
      })),
    },
  }
}
```

- [ ] **Step 6: Rewrite `getIbuAnakDetail`**

```ts
export async function getIbuAnakDetail(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "ibu") throw new Error("Unauthorized")

  const anakRow = await db.query.anak.findFirst({
    where: and(eq(anak.id, id), eq(anak.ibuId, session.user.id)),
    with: {
      pengukurans: { orderBy: desc(pengukuran.tanggal) },
    },
  })

  if (!anakRow) return null

  const birthDate = new Date(anakRow.tanggalLahir)
  const now = new Date()
  const ageMonths =
    (now.getFullYear() - birthDate.getFullYear()) * 12 +
    (now.getMonth() - birthDate.getMonth())

  const last = anakRow.pengukurans[0] ?? null

  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d)

  return {
    id: anakRow.id,
    nama: anakRow.nama,
    jenisKelamin: anakRow.jenisKelamin as "L" | "P",
    tanggalLahir: fmt(birthDate),
    usia:
      ageMonths < 12
        ? `${ageMonths} bln`
        : `${Math.floor(ageMonths / 12)} thn ${ageMonths % 12} bln`,
    anakKe: anakRow.anakKe?.toString() ?? "—",
    latest: last
      ? {
          bb: last.beratBadan,
          tb: last.tinggiBadan,
          status: last.statusTBU,
          zScore: last.zScoreTBU.toFixed(1),
          tanggal: fmt(new Date(last.tanggal)),
        }
      : null,
    visits: anakRow.pengukurans.map((p) => {
      const pDate = new Date(p.tanggal)
      const visitMonths =
        (pDate.getFullYear() - birthDate.getFullYear()) * 12 +
        (pDate.getMonth() - birthDate.getMonth())
      return {
        tanggal: fmt(pDate),
        usiaBulan: visitMonths,
        bb: p.beratBadan,
        tb: p.tinggiBadan,
        status: p.statusTBU,
      }
    }),
  }
}
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit` — expected: no errors.

- [ ] **Step 8: Manual verify**

`npm run dev`, sign in as `ibutest` (needs at least one `anak` row — use a throwaway `db.insert(anak).values(...)` script, or wait until Task 7's `createChild` is migrated and create one from the kader side). Visit `/ibu/dashboard`, `/ibu/profil`, and a child detail page — expect all data to render.

- [ ] **Step 9: Commit**

```bash
git add lib/actions/ibu.ts
git commit -m "refactor: migrate lib/actions/ibu.ts from Prisma to Drizzle"
```

---

### Task 6: Migrate `lib/actions/kader.ts` — read paths

**Files:**
- Modify: `lib/actions/kader.ts`

**Interfaces:**
- Consumes: `db`, `posyandu`, `kader`, `ibu`, `anak`, `pengukuran` (Task 1).
- Produces: no change to `getChildren()`, `getDashboardStats()`, `getRecentMeasurements()`, `getWeeklyData()`, `getUncheckedChildren()`, `getChildDetail(id)`, `getKelurahanStats()`, `getIbuById(id)`, `getIbuHamil()`, `getIbuBiasa()` signatures or return shapes. `getValidatedPosyanduId`, `savePengukuran`, `createChild`, `createIbu` are left untouched (still using `prisma`) — Task 7 handles those.

- [ ] **Step 1: Add the Drizzle imports alongside the existing Prisma import**

At the top of `lib/actions/kader.ts`, add (do not remove `import { prisma } from "@/lib/db"` yet — Task 7's functions still need it):

```ts
import { db } from "@/lib/db/client"
import { posyandu, kader, ibu, anak, pengukuran } from "@/lib/db/schema"
import { eq, and, desc, asc, inArray, notInArray, gte, count } from "drizzle-orm"
```

- [ ] **Step 2: Rewrite `getChildren`**

```ts
export async function getChildren() {
  const session = await auth()
  if (!session || session.user.role !== "kader") {
    throw new Error("Unauthorized")
  }

  const ibuIds = db.select({ id: ibu.id }).from(ibu).where(eq(ibu.posyanduId, session.user.posyanduId))

  const children = await db.query.anak.findMany({
    where: inArray(anak.ibuId, ibuIds),
    with: {
      pengukurans: { orderBy: desc(pengukuran.tanggal), limit: 1 },
    },
  })

  return children.map((anakRow, index) => {
    const lastPengukuran = anakRow.pengukurans[0]

    const birthDate = new Date(anakRow.tanggalLahir)
    const now = new Date()
    const ageMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth())

    return {
      no: index + 1,
      id: anakRow.id,
      nama: anakRow.nama,
      sex: anakRow.jenisKelamin as "L" | "P",
      usia: `${ageMonths} bln`,
      bb: lastPengukuran ? lastPengukuran.beratBadan.toFixed(1).replace(".", ",") : "-",
      tb: lastPengukuran ? lastPengukuran.tinggiBadan.toFixed(1).replace(".", ",") : "-",
      status: (lastPengukuran?.statusTBU || "Normal") as "Normal" | "Berisiko" | "Stunting",
      sudah: lastPengukuran ? new Date(lastPengukuran.tanggal).getMonth() === now.getMonth() && new Date(lastPengukuran.tanggal).getFullYear() === now.getFullYear() : false,
      tgl: lastPengukuran ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(lastPengukuran.tanggal)) : "-",
    }
  })
}
```

- [ ] **Step 3: Rewrite `getDashboardStats`**

```ts
export async function getDashboardStats() {
  const session = await auth()
  if (!session || session.user.role !== "kader") {
    throw new Error("Unauthorized")
  }

  const posyanduId = session.user.posyanduId
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const posyanduRow = await db.query.posyandu.findFirst({
    where: eq(posyandu.id, posyanduId),
    columns: { nama: true },
  })

  const ibuIds = db.select({ id: ibu.id }).from(ibu).where(eq(ibu.posyanduId, posyanduId))

  const [{ value: totalChildren }] = await db
    .select({ value: count() })
    .from(anak)
    .where(inArray(anak.ibuId, ibuIds))

  const measuredThisMonth = await db.selectDistinct({ anakId: pengukuran.anakId })
    .from(pengukuran)
    .where(and(eq(pengukuran.posyanduId, posyanduId), gte(pengukuran.tanggal, firstDayOfMonth)))

  const measuredToday = await db.selectDistinct({ anakId: pengukuran.anakId })
    .from(pengukuran)
    .where(and(eq(pengukuran.posyanduId, posyanduId), gte(pengukuran.tanggal, today)))

  const allChildren = await db.query.anak.findMany({
    where: inArray(anak.ibuId, ibuIds),
    with: {
      pengukurans: { orderBy: desc(pengukuran.tanggal), limit: 2 },
    },
  })

  let normalCount = 0
  let giziKurangCount = 0
  let risikoStuntingCount = 0
  let stuntingBeratCount = 0

  const totalMeasured = allChildren.filter(c => c.pengukurans.length > 0).length

  allChildren.forEach(c => {
    const status = c.pengukurans[0]?.statusTBU
    if (status === "Normal") normalCount++
    if (status === "Gizi Kurang") giziKurangCount++
    if (status === "Berisiko" || status === "Risiko Stunting") risikoStuntingCount++
    if (status === "Stunting" || status === "Stunting Berat") stuntingBeratCount++
  })

  const getStatusScore = (status?: string) => {
    if (!status) return 0
    if (status === "Normal") return 5
    if (status === "Gizi Kurang") return 4
    if (status === "Risiko Stunting" || status === "Berisiko") return 3
    if (status === "Stunting") return 2
    if (status === "Stunting Berat") return 1
    return 0
  }

  let improvedCount = 0
  allChildren.forEach(c => {
    if (c.pengukurans.length >= 2) {
      const latestScore = getStatusScore(c.pengukurans[0].statusTBU)
      const prevScore = getStatusScore(c.pengukurans[1].statusTBU)
      if (latestScore > prevScore) {
        improvedCount++
      }
    }
  })

  const statusData = [
    { name: "Stunting Berat", value: totalMeasured ? Math.round((stuntingBeratCount / totalMeasured) * 100) : 0, fill: "#E24B4A" },
    { name: "Risiko Stunting", value: totalMeasured ? Math.round((risikoStuntingCount / totalMeasured) * 100) : 0, fill: "#EF9F27" },
    { name: "Gizi Kurang", value: totalMeasured ? Math.round((giziKurangCount / totalMeasured) * 100) : 0, fill: "#7F77DD" },
    { name: "Anak Normal", value: totalMeasured ? Math.round((normalCount / totalMeasured) * 100) : 0, fill: "#378ADD" },
  ]

  const stuntingCount = allChildren.filter(c =>
    c.pengukurans[0]?.statusTBU === "Stunting" ||
    c.pengukurans[0]?.statusTBU === "Stunting Berat"
  ).length

  return {
    totalChildren,
    measuredThisMonth: measuredThisMonth.length,
    measuredToday: measuredToday.length,
    stuntingCount,
    posyanduName: posyanduRow?.nama || "Posyandu",
    statusData,
    improvedCount,
  }
}
```

- [ ] **Step 4: Rewrite `getRecentMeasurements`**

```ts
export async function getRecentMeasurements() {
  const session = await auth()
  if (!session || session.user.role !== "kader") {
    throw new Error("Unauthorized")
  }

  const measurements = await db.query.pengukuran.findMany({
    where: eq(pengukuran.posyanduId, session.user.posyanduId),
    with: { anak: true, kader: true },
    orderBy: desc(pengukuran.tanggal),
    limit: 5,
  })

  return measurements.map((m) => ({
    id: m.anakId,
    waktu: new Date(m.tanggal).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    posyandu: session.user.posyanduId ? "Melati" : "Posyandu",
    nama: m.anak.nama,
    status: m.statusTBU,
    tindak: m.statusTBU === "Normal" ? "Selesai" : "Dipantau",
    kader: m.kader.nama,
  }))
}
```

- [ ] **Step 5: Rewrite `getWeeklyData`**

```ts
export async function getWeeklyData() {
  const session = await auth()
  if (!session || session.user.role !== "kader") {
    throw new Error("Unauthorized")
  }

  const now = new Date()
  const last7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)

  const measurements = await db.select({ tanggal: pengukuran.tanggal, statusTBU: pengukuran.statusTBU })
    .from(pengukuran)
    .where(and(eq(pengukuran.posyanduId, session.user.posyanduId), gte(pengukuran.tanggal, last7Days)))

  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
  const data = []

  for (let i = 0; i < 7; i++) {
    const d = new Date(last7Days.getFullYear(), last7Days.getMonth(), last7Days.getDate() + i)
    const dayName = days[d.getDay()]

    const dayMeasurements = measurements.filter(m =>
      new Date(m.tanggal).toDateString() === d.toDateString()
    )

    data.push({
      hari: dayName,
      stunting: dayMeasurements.filter(m => m.statusTBU === "Stunting" || m.statusTBU === "Stunting Berat").length,
      normal: dayMeasurements.filter(m => m.statusTBU === "Normal").length,
    })
  }

  return data
}
```

- [ ] **Step 6: Rewrite `getUncheckedChildren`**

```ts
export async function getUncheckedChildren() {
  const session = await auth()
  if (!session || session.user.role !== "kader") {
    throw new Error("Unauthorized")
  }

  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const ibuIds = db.select({ id: ibu.id }).from(ibu).where(eq(ibu.posyanduId, session.user.posyanduId))
  const measuredAnakIds = db.select({ id: pengukuran.anakId }).from(pengukuran).where(gte(pengukuran.tanggal, firstDayOfMonth))

  const unchecked = await db.query.anak.findMany({
    where: and(
      inArray(anak.ibuId, ibuIds),
      notInArray(anak.id, measuredAnakIds),
    ),
    limit: 5,
  })

  return unchecked.map((anakRow) => {
    const birthDate = new Date(anakRow.tanggalLahir)
    const ageMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth())
    const years = Math.floor(ageMonths / 12)
    const months = ageMonths % 12
    const ageStr = `${years > 0 ? years + " tahun " : ""}${months} bulan`

    return {
      id: anakRow.id,
      nama: anakRow.nama,
      usia: ageStr,
      posyandu: "Melati",
      warna: ["#378ADD", "#EF9F27", "#7F77DD", "#E24B4A", "#2DD4BF"][Math.floor(Math.random() * 5)],
    }
  })
}
```

- [ ] **Step 7: Rewrite `getChildDetail`**

```ts
export async function getChildDetail(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "kader") {
    throw new Error("Unauthorized")
  }

  const anakRow = await db.query.anak.findFirst({
    where: eq(anak.id, id),
    with: {
      ibu: {
        with: {
          posyandu: true,
          pregnancyProfile: true,
          anaks: {
            where: (a, { ne }) => ne(a.id, id),
            with: { pengukurans: { orderBy: desc(pengukuran.tanggal), limit: 1 } },
          },
        },
      },
      pengukurans: {
        orderBy: desc(pengukuran.tanggal),
        with: { kader: true },
      },
    },
  })

  if (!anakRow) return null

  const lastPengukuran = anakRow.pengukurans[0]
  const prevPengukuran = anakRow.pengukurans[1]
  const birthDate = new Date(anakRow.tanggalLahir)
  const now = new Date()
  const ageMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth())

  const gestationalWeek = anakRow.ibu.isHamil && anakRow.ibu.pregnancyProfile
    ? Math.max(0, Math.floor((now.getTime() - new Date(anakRow.ibu.pregnancyProfile.hpht).getTime()) / (7 * 24 * 60 * 60 * 1000)))
    : null

  const nextCheckDate = lastPengukuran ? new Date(lastPengukuran.tanggal) : null
  if (nextCheckDate) nextCheckDate.setMonth(nextCheckDate.getMonth() + 1)
  const daysUntilNextCheck = nextCheckDate ? Math.ceil((nextCheckDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) : null

  return {
    id: anakRow.id,
    name: anakRow.nama,
    gender: anakRow.jenisKelamin === "L" ? "Laki-laki" : "Perempuan",
    birthDate: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(birthDate),
    age: `${ageMonths} bulan`,
    ageMo: ageMonths,
    posyandu: anakRow.ibu.posyandu.nama,
    posyanduId: anakRow.ibu.posyandu.id,
    desa: anakRow.ibu.posyandu.kelurahan,
    address: anakRow.ibu.alamat || "-",
    childOrder: anakRow.anakKe?.toString() || "—",
    parent: {
      id: anakRow.ibu.id,
      mother: anakRow.ibu.nama,
      father: anakRow.namaAyah || "—",
      phone: anakRow.ibu.noHp || "-",
      username: anakRow.ibu.username,
      isHamil: anakRow.ibu.isHamil,
      gestationalWeek,
    },
    status: lastPengukuran?.statusTBU || "Normal",
    latestCheckDate: lastPengukuran ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(lastPengukuran.tanggal)) : "-",
    latestTB: lastPengukuran?.tinggiBadan || 0,
    latestBB: lastPengukuran?.beratBadan || 0,
    deltaBB: lastPengukuran && prevPengukuran ? +(lastPengukuran.beratBadan - prevPengukuran.beratBadan).toFixed(1) : null,
    deltaTB: lastPengukuran && prevPengukuran ? +(lastPengukuran.tinggiBadan - prevPengukuran.tinggiBadan).toFixed(1) : null,
    zScoreTBU: lastPengukuran ? `${lastPengukuran.zScoreTBU.toFixed(1)} SD` : "-",
    zScoreTBURaw: lastPengukuran?.zScoreTBU ?? null,
    bbTB: lastPengukuran?.statusBBTB || "-",
    examiner: lastPengukuran?.kader.nama || "-",
    nextCheckDate: nextCheckDate ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(nextCheckDate) : null,
    daysUntilNextCheck,
    siblings: anakRow.ibu.anaks.map((s) => {
      const sBirth = new Date(s.tanggalLahir)
      const sAgeMonths = (now.getFullYear() - sBirth.getFullYear()) * 12 + (now.getMonth() - sBirth.getMonth())
      return {
        id: s.id,
        name: s.nama,
        age: `${sAgeMonths} bulan`,
        status: s.pengukurans[0]?.statusTBU || "Normal",
      }
    }),
    visits: anakRow.pengukurans.map((p) => ({
      tgl: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(p.tanggal)),
      usia: `${(new Date(p.tanggal).getFullYear() - birthDate.getFullYear()) * 12 + (new Date(p.tanggal).getMonth() - birthDate.getMonth())} bln`,
      bb: p.beratBadan,
      tb: p.tinggiBadan,
      zTb: p.zScoreTBU.toFixed(1),
      status: p.statusTBU,
      examiner: p.kader.nama,
      latest: p.id === lastPengukuran?.id,
    })),
  }
}
```

- [ ] **Step 8: Rewrite `getKelurahanStats`**

```ts
export async function getKelurahanStats() {
  const session = await auth()
  if (!session || session.user.role !== "kader") {
    throw new Error("Unauthorized")
  }

  const posyandus = await db.query.posyandu.findMany({
    with: {
      ibus: {
        with: {
          anaks: {
            with: { pengukurans: { orderBy: desc(pengukuran.tanggal), limit: 1 } },
          },
        },
      },
      kaders: { limit: 1 },
    },
  })

  const kelurahanMap = new Map<string, {
    id: number
    nama: string
    lat: number
    lng: number
    total: number
    normal: number
    risiko: number
    stunting: number
    posyandu: string[]
    petugas: string
  }>()

  posyandus.forEach((p) => {
    const kel = p.kelurahan
    if (!kelurahanMap.has(kel)) {
      kelurahanMap.set(kel, {
        id: kelurahanMap.size + 1,
        nama: kel,
        lat: p.latitude || -5.1477,
        lng: p.longitude || 119.4327,
        total: 0,
        normal: 0,
        risiko: 0,
        stunting: 0,
        posyandu: [],
        petugas: p.kaders[0]?.nama || "Bidan",
      })
    }

    const data = kelurahanMap.get(kel)!
    data.posyandu.push(p.nama)

    p.ibus.forEach((ibuRow) => {
      ibuRow.anaks.forEach((anakRow) => {
        data.total++
        const lastP = anakRow.pengukurans[0]
        if (!lastP || lastP.statusTBU === "Normal") {
          data.normal++
        } else if (lastP.statusTBU === "Berisiko") {
          data.risiko++
        } else {
          data.stunting++
        }
      })
    })
  })

  return Array.from(kelurahanMap.values())
}
```

- [ ] **Step 9: Rewrite `getIbuById`**

```ts
export async function getIbuById(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

  const ibuRow = await db.query.ibu.findFirst({
    where: eq(ibu.id, id),
    with: {
      posyandu: { columns: { nama: true } },
      anaks: {
        with: { pengukurans: { orderBy: desc(pengukuran.tanggal), limit: 1 } },
        orderBy: asc(anak.createdAt),
      },
      pregnancyProfile: true,
      pregnancyVisits: { orderBy: (pv, { asc }) => asc(pv.visitDate) },
      skrinings: { orderBy: (s, { desc }) => desc(s.tanggal) },
    },
  })

  if (!ibuRow || ibuRow.posyanduId !== session.user.posyanduId) throw new Error("Not found")
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _password, ...rest } = ibuRow
  return { ...rest, posyandu: ibuRow.posyandu.nama }
}
```

- [ ] **Step 10: Rewrite `getIbuHamil`**

```ts
export async function getIbuHamil() {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

  const list = await db.query.ibu.findMany({
    where: and(eq(ibu.posyanduId, session.user.posyanduId), eq(ibu.isHamil, true)),
    with: {
      pregnancyProfile: { columns: { hpht: true } },
      pregnancyVisits: {
        orderBy: (pv, { desc }) => desc(pv.visitDate),
        limit: 1,
        columns: { visitDate: true, currentWeightKg: true },
      },
    },
    orderBy: asc(ibu.createdAt),
  })

  const now = new Date()

  return list.map((ibuRow, i) => {
    const hpht = ibuRow.pregnancyProfile?.hpht ? new Date(ibuRow.pregnancyProfile.hpht) : null
    const diffDays = hpht ? Math.floor((now.getTime() - hpht.getTime()) / 86_400_000) : null
    const weeks = diffDays !== null ? Math.floor(diffDays / 7) : null
    const trimester: 1 | 2 | 3 | null =
      weeks === null ? null : weeks < 14 ? 1 : weeks < 28 ? 2 : 3

    const hpl = hpht ? new Date(hpht.getTime() + 280 * 86_400_000) : null
    const hplStr = hpl
      ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(hpl)
      : "-"

    const visit = ibuRow.pregnancyVisits[0] ?? null
    const sudahKunjungan = visit
      ? new Date(visit.visitDate).getMonth() === now.getMonth() &&
        new Date(visit.visitDate).getFullYear() === now.getFullYear()
      : false

    const birth = ibuRow.tanggalLahir ? new Date(ibuRow.tanggalLahir) : null
    const usiaYears = birth
      ? Math.floor((now.getTime() - birth.getTime()) / (365.25 * 86_400_000))
      : null

    return {
      no: i + 1,
      id: ibuRow.id,
      nama: ibuRow.nama,
      usia: usiaYears !== null ? `${usiaYears} th` : "-",
      trimester,
      bbSaatIni: visit ? `${visit.currentWeightKg} kg` : "-",
      hpl: hplStr,
      sudahKunjungan,
      lastVisit: visit
        ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(visit.visitDate))
        : "-",
    }
  })
}
```

- [ ] **Step 11: Rewrite `getIbuBiasa`**

```ts
export async function getIbuBiasa() {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

  const list = await db.query.ibu.findMany({
    where: and(eq(ibu.posyanduId, session.user.posyanduId), eq(ibu.isHamil, false)),
    with: {
      skrinings: {
        orderBy: (s, { desc }) => desc(s.tanggal),
        limit: 1,
        columns: { tanggal: true, kategori: true, skorRisiko: true },
      },
      anaks: { columns: { id: true } },
    },
    orderBy: asc(ibu.createdAt),
  })

  const now = new Date()

  return list.map((ibuRow, i) => {
    const skrining = ibuRow.skrinings[0] ?? null
    const birth = ibuRow.tanggalLahir ? new Date(ibuRow.tanggalLahir) : null
    const usiaYears = birth
      ? Math.floor((now.getTime() - birth.getTime()) / (365.25 * 86_400_000))
      : null

    return {
      no: i + 1,
      id: ibuRow.id,
      nama: ibuRow.nama,
      usia: usiaYears !== null ? `${usiaYears} th` : "-",
      jumlahAnak: ibuRow.anaks.length,
      skriningTerakhir: skrining
        ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(skrining.tanggal))
        : "Belum",
      kategoriRisiko: skrining?.kategori ?? null,
    }
  })
}
```

- [ ] **Step 12: Type-check**

Run: `npx tsc --noEmit` — expected: no errors. `prisma` import in this file is still used by the not-yet-migrated write functions (Task 7), so no unused-import error.

- [ ] **Step 13: Manual verify**

`npm run dev`, sign in as kader, visit `/kader/dashboard`, `/kader/rekap`, `/kader/peta-sebaran`, and an existing child's detail page — expect all lists, charts, and detail views to render with the seeded data (they'll be mostly empty/zero until Task 7 lets you create children/ibus, which is fine — the point here is no runtime errors).

- [ ] **Step 14: Commit**

```bash
git add lib/actions/kader.ts
git commit -m "refactor: migrate kader.ts read actions from Prisma to Drizzle"
```

---

### Task 7: Migrate `lib/actions/kader.ts` — write paths

**Files:**
- Modify: `lib/actions/kader.ts`

**Interfaces:**
- Consumes: `db`, `posyandu`, `ibu`, `anak`, `pengukuran`, `pregnancyProfile`, `pregnancyVisit` (Task 1).
- Produces: no change to `savePengukuran(data)`, `createChild(data)`, `createIbu(data)` signatures or return shapes. Removes the `prisma` import entirely from this file.

- [ ] **Step 1: Add the remaining Drizzle table imports and drop the Prisma import**

Replace:

```ts
import { prisma } from "@/lib/db"
```

with nothing (delete the line). Extend the existing Drizzle import line from Task 6 to include the two remaining tables:

```ts
import { posyandu, kader, ibu, anak, pengukuran, pregnancyProfile, pregnancyVisit } from "@/lib/db/schema"
```

- [ ] **Step 2: Rewrite `getValidatedPosyanduId`**

```ts
async function getValidatedPosyanduId() {
  const session = await auth()
  if (!session || session.user.role !== "kader") {
    throw new Error("Unauthorized")
  }

  const posyanduId = session.user.posyanduId
  if (!posyanduId) {
    console.error("DEBUG: posyanduId is missing in session", session.user)
    throw new Error("POSYANDU_ID_MISSING")
  }

  try {
    const posyanduRow = await db.query.posyandu.findFirst({ where: eq(posyandu.id, posyanduId) })
    if (!posyanduRow) {
      console.error(`DEBUG: posyanduId ${posyanduId} from session not found in database. This might happen if the database was reset but the session is stale.`)
      throw new Error("POSYANDU_NOT_FOUND")
    }
    return posyanduId
  } catch (error) {
    if (error instanceof Error && error.message === "POSYANDU_NOT_FOUND") throw error
    console.error("Database error in getValidatedPosyanduId:", error)
    throw new Error("DATABASE_ERROR")
  }
}
```

- [ ] **Step 3: Rewrite `savePengukuran`**

```ts
export async function savePengukuran(data: {
  anakId: string
  beratBadan: number
  tinggiBadan: number
}) {
  const session = await auth()
  if (!session || session.user.role !== "kader") throw new Error("Unauthorized")

  const anakRow = await db.query.anak.findFirst({
    where: eq(anak.id, data.anakId),
    with: { ibu: true },
  })

  if (!anakRow) throw new Error("Anak not found")

  const birthDate = new Date(anakRow.tanggalLahir)
  const now = new Date()
  const ageMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth())

  const sex = anakRow.jenisKelamin as "L" | "P"
  const zTBU = calcHeightZScore(data.tinggiBadan, ageMonths, sex)

  const zBBU = 0.0
  const zBBTB = 0.0

  const [result] = await db.insert(pengukuran).values({
    anakId: data.anakId,
    posyanduId: session.user.posyanduId!,
    kaderId: session.user.id!,
    beratBadan: data.beratBadan,
    tinggiBadan: data.tinggiBadan,
    zScoreTBU: zTBU.zScore,
    zScoreBBU: zBBU,
    zScoreBBTB: zBBTB,
    statusTBU: stuntingLabel[zTBU.status],
    statusBBU: "Normal",
    statusBBTB: "Normal",
    tanggal: now,
  }).returning()

  revalidatePath(`/kader/anak/${data.anakId}`)
  revalidatePath("/kader/dashboard")
  revalidatePath("/kader/rekap")

  return result
}
```

- [ ] **Step 4: Rewrite `createChild`**

```ts
export async function createChild(data: {
  nama: string
  sex: string
  birth: string
  ibu: string
  ibuUsername: string
  telp?: string
  alamat?: string
  namaAyah?: string
  anakKe?: number
}) {
  const posyanduId = await getValidatedPosyanduId()

  const [ibuRow] = await db.insert(ibu).values({
    nama: data.ibu,
    username: data.ibuUsername,
    password: "$2a$10$7zV.k6uG9fH9xV5fB.Z3u.oYv9z5Y.yYv.Z3u.oYv9z5Y.yYv.y",
    noHp: data.telp,
    alamat: data.alamat,
    posyanduId,
  }).onConflictDoUpdate({
    target: ibu.username,
    set: {
      nama: data.ibu,
      noHp: data.telp,
      alamat: data.alamat,
      posyanduId,
    },
  }).returning()

  const [anakRow] = await db.insert(anak).values({
    nama: data.nama,
    tanggalLahir: new Date(data.birth),
    jenisKelamin: data.sex,
    namaAyah: data.namaAyah,
    anakKe: data.anakKe,
    ibuId: ibuRow.id,
  }).returning()

  revalidatePath("/kader/dashboard")
  revalidatePath("/kader/rekap")
  revalidatePath(`/kader/ibu/${ibuRow.id}`)

  return anakRow
}
```

- [ ] **Step 5: Rewrite `createIbu`**

```ts
export async function createIbu(data: {
  nama: string
  username: string
  password: string
  noHp?: string
  tanggalLahir?: string
  alamat?: string
  isHamil?: boolean
  hpht?: string
  bbPrepregnancyKg?: number
  heightCm?: number
  currentWeightKg?: number
}) {
  const posyanduId = await getValidatedPosyanduId()

  const existing = await db.query.ibu.findFirst({ where: eq(ibu.username, data.username) })
  if (existing) throw new Error("USERNAME_TAKEN")

  const hashed = await bcrypt.hash(data.password, 10)

  return await db.transaction(async (tx) => {
    const [ibuRow] = await tx.insert(ibu).values({
      nama: data.nama,
      username: data.username,
      password: hashed,
      noHp: data.noHp ?? null,
      tanggalLahir: data.tanggalLahir ? new Date(data.tanggalLahir) : null,
      alamat: data.alamat ?? null,
      isHamil: data.isHamil ?? false,
      posyanduId: posyanduId,
    }).returning({ id: ibu.id, nama: ibu.nama, username: ibu.username })

    if (data.isHamil && data.hpht && data.bbPrepregnancyKg && data.heightCm) {
      const imt = calculateIMT(data.bbPrepregnancyKg, data.heightCm)
      const category = getIMTCategory(imt)
      const targets = getIOMTargets(category)

      await tx.insert(pregnancyProfile).values({
        ibuId: ibuRow.id,
        hpht: new Date(data.hpht),
        bbPrepregnancyKg: data.bbPrepregnancyKg,
        heightCm: data.heightCm,
        imtPrepregnancy: imt,
        imtCategory: category,
        targetGainMinKg: targets.totalGainMinKg,
        targetGainMaxKg: targets.totalGainMaxKg,
        weeklyGainMinKg: targets.weeklyGainMinKg,
        weeklyGainMaxKg: targets.weeklyGainMaxKg,
      })

      if (data.currentWeightKg) {
        const weightGainKg = data.currentWeightKg - data.bbPrepregnancyKg
        await tx.insert(pregnancyVisit).values({
          ibuId: ibuRow.id,
          visitDate: new Date(),
          currentWeightKg: data.currentWeightKg,
          weightGainKg: weightGainKg,
          lilaCm: 0,
          hbGdl: 0,
          isOnTrack: true,
        })
      }
    }

    revalidatePath("/kader/rekap")
    revalidatePath("/kader/dashboard")

    return ibuRow
  })
}
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit` — expected: no errors, and no unused-import warning for `prisma` (it's fully removed from this file now).

- [ ] **Step 7: Manual verify**

`npm run dev`, sign in as kader:
- `/kader/tambah-pasien` → create a new ibu (both hamil and non-hamil cases) → expect it to appear in `/kader/rekap`.
- `/kader/tambah-anak` → create a new child under an existing or new ibu → expect it in `/kader/dashboard`'s child list.
- Open a child detail page → "Periksa Sekarang" → record a measurement → expect it to appear in the visit history and update the dashboard stunting stats.

- [ ] **Step 8: Commit**

```bash
git add lib/actions/kader.ts
git commit -m "refactor: migrate kader.ts write actions from Prisma to Drizzle"
```

---

### Task 8: Remove Prisma, finalize env and config

**Files:**
- Delete: `prisma/` (entire directory, including `schema.prisma` and `generated/`)
- Delete: `prisma.config.ts`
- Delete: `lib/db.ts`
- Modify: `package.json`
- Modify: `.env`, `.env.local`
- Modify: `.gitignore`
- Modify: `eslint.config.mjs`
- Modify: `lib/db/client.ts`, `drizzle.config.ts`

**Interfaces:**
- Produces: no more references to `prisma`, `@prisma/client`, `@prisma/adapter-pg`, or `pg`'s old adapter path anywhere in the repo.

- [ ] **Step 1: Confirm no Prisma references remain in source**

Run: `grep -rn "prisma" --include="*.ts" --include="*.tsx" app lib auth.ts` (PowerShell: `Select-String -Path app,lib,auth.ts -Pattern prisma -Include *.ts,*.tsx -Recurse`)
Expected: zero matches (Tasks 2–7 removed every call site).

- [ ] **Step 2: Delete Prisma files**

```bash
rm -rf prisma
rm prisma.config.ts
rm lib/db.ts
```

- [ ] **Step 3: Uninstall Prisma packages**

```bash
npm uninstall prisma @prisma/client @prisma/adapter-pg
```

- [ ] **Step 4: Fold the Neon URL into `DATABASE_URL` and drop the Supabase values**

In both `.env` and `.env.local`, replace:

```
DATABASE_URL="postgresql://postgres.cxcagpidlhkvwemqpscb:...supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.cxcagpidlhkvwemqpscb:...supabase.com:5432/postgres"
NEON_DATABASE_URL="<the Neon connection string>"
```

with just:

```
DATABASE_URL="<the Neon connection string>"
```

(Keep `NEXTAUTH_SECRET`/`AUTH_SECRET`/`AUTH_TRUST_HOST`/`NEXTAUTH_URL`/`AUTH_URL` untouched.)

- [ ] **Step 5: Point the client and drizzle-kit config at `DATABASE_URL`**

In `lib/db/client.ts`, change:

```ts
connectionString: process.env.NEON_DATABASE_URL!,
```

to:

```ts
connectionString: process.env.DATABASE_URL!,
```

In `drizzle.config.ts`, change:

```ts
url: process.env.NEON_DATABASE_URL!,
```

to:

```ts
url: process.env.DATABASE_URL!,
```

- [ ] **Step 6: Remove the Prisma `postinstall` script**

In `package.json`, delete the line:

```json
"postinstall": "prisma generate",
```

- [ ] **Step 7: Clean up stale Prisma ignores**

In `.gitignore`, delete the line:

```
/prisma/generated/prisma
```

In `eslint.config.mjs`, delete the line:

```js
"app/generated/prisma/**",
```

- [ ] **Step 8: Reinstall and type-check**

Run: `npm install`
Run: `npx tsc --noEmit`
Expected: clean install, zero type errors.

- [ ] **Step 9: Full regression pass**

Run: `npm run dev` and, in the browser:
- Log in as kader and as ibu.
- Kader: dashboard, rekap (both tabs), peta sebaran, tambah pasien, tambah anak, child detail (measurement + visit history), ibu detail (pregnancy visit recording).
- Ibu: dashboard, profil, tugas (toggle a task), child detail page.
- Confirm no console errors and no data operations silently fail.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: remove Prisma, Neon is now the sole database via DATABASE_URL"
```

---

## Self-Review Notes

- **Spec coverage:** every one of the 5 Prisma-consuming files (`auth.ts`, `lib/actions/tasks.ts`, `lib/actions/pregnancy.ts`, `lib/actions/ibu.ts`, `lib/actions/kader.ts`) has a task; schema/client setup and final Prisma removal are their own tasks. All 9 Prisma models are represented in `lib/db/schema.ts`. Fresh-start-on-Neon and drizzle-kit-push decisions are encoded as Global Constraints and reflected in Task 1/8.
- **Type consistency:** every rewritten function keeps its original exported name and return shape; internal result variables were renamed from `prisma`'s bare model names (`ibu`, `anak`, `kader`) to `ibuRow`/`anakRow`/`kaderRow`/`posyanduRow` throughout to avoid shadowing the imported Drizzle table objects of the same name — this rename is applied consistently in every task.
- **No placeholders:** every step above has complete, runnable code — no "similar to Task N" shortcuts.
