import { pgTable, text, boolean, integer, doublePrecision, timestamp, jsonb, unique } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

export const posyandu = pgTable("Posyandu", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  nama: text("nama").notNull(),
  alamat: text("alamat").notNull(),
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
  kelurahan: text("kelurahan"),
  terakhirDiingatkanKehamilan: timestamp("terakhirDiingatkanKehamilan", { mode: "date" }),
  isHamil: boolean("isHamil").notNull().default(false),
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
  beratLahir: doublePrecision("beratLahir"),
  panjangLahir: doublePrecision("panjangLahir"),
  ibuId: text("ibuId").notNull().references(() => ibu.id),
  terakhirDiingatkan: timestamp("terakhirDiingatkan", { mode: "date" }),
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
  jumlahJanin: integer("jumlahJanin").notNull().default(1), // 1 = tunggal, >=2 = kehamilan ganda (target BB berbeda)
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
  catatanKader: text("catatanKader"),
  kirimKeIbu: boolean("kirimKeIbu").notNull().default(false),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
})

export const notifikasi = pgTable("Notifikasi", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  posyanduId: text("posyanduId").notNull().references(() => posyandu.id),
  ibuId: text("ibuId").references(() => ibu.id, { onDelete: "cascade" }), // set = targeted at one ibu (e.g. a kader reminder), null = posyandu-wide (kader dashboard)
  templateCode: text("templateCode").notNull(), // "T1" | "T2" | "T3" | "T5" | "R1" | "R2"
  level: text("level").notNull(), // "merah" | "kuning"
  judul: text("judul").notNull(),
  pesan: text("pesan").notNull(),
  actionLabel: text("actionLabel").notNull(),
  actionUrl: text("actionUrl").notNull(),
  groupKey: text("groupKey").notNull().unique(), // dedupe/merge key, e.g. "T1-{posyanduId}-{yyyy-mm-dd}"
  mergeCount: integer("mergeCount").notNull().default(1),
  isRead: boolean("isRead").notNull().default(false),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
})

export const device = pgTable("Device", {
  id: text("id").primaryKey(), // e.g. "esp32-01"
  nama: text("nama").notNull(),
  lastSeen: timestamp("lastSeen", { mode: "date" }).defaultNow(),
})

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

export const posyanduRelations = relations(posyandu, ({ many }) => ({
  kaders: many(kader),
  ibus: many(ibu),
  pengukurans: many(pengukuran),
  skrinings: many(skriningShamil),
  notifikasis: many(notifikasi),
}))

export const notifikasiRelations = relations(notifikasi, ({ one }) => ({
  posyandu: one(posyandu, { fields: [notifikasi.posyanduId], references: [posyandu.id] }),
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

export const deviceRelations = relations(device, ({ many }) => ({
  sesiPengukuran: many(sesiPengukuran),
}))

export const sesiPengukuranRelations = relations(sesiPengukuran, ({ one }) => ({
  device: one(device, { fields: [sesiPengukuran.deviceId], references: [device.id] }),
}))
