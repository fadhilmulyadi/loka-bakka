CREATE TABLE "Anak" (
	"id" text PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"tanggalLahir" timestamp NOT NULL,
	"jenisKelamin" text NOT NULL,
	"namaAyah" text,
	"anakKe" integer,
	"beratLahir" double precision,
	"panjangLahir" double precision,
	"ibuId" text NOT NULL,
	"terakhirDiingatkan" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "DailyTask" (
	"id" text PRIMARY KEY NOT NULL,
	"ibuId" text NOT NULL,
	"taskId" integer NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "DailyTask_ibuId_taskId_date_unique" UNIQUE("ibuId","taskId","date")
);
--> statement-breakpoint
CREATE TABLE "Device" (
	"id" text PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"lastSeen" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "Ibu" (
	"id" text PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"noHp" text,
	"tanggalLahir" timestamp,
	"alamat" text,
	"kelurahan" text,
	"terakhirDiingatkanKehamilan" timestamp,
	"isHamil" boolean DEFAULT false NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"posyanduId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Ibu_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "Kader" (
	"id" text PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"posyanduId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Kader_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "Notifikasi" (
	"id" text PRIMARY KEY NOT NULL,
	"posyanduId" text NOT NULL,
	"ibuId" text,
	"templateCode" text NOT NULL,
	"level" text NOT NULL,
	"judul" text NOT NULL,
	"pesan" text NOT NULL,
	"actionLabel" text NOT NULL,
	"actionUrl" text NOT NULL,
	"groupKey" text NOT NULL,
	"mergeCount" integer DEFAULT 1 NOT NULL,
	"isRead" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Notifikasi_groupKey_unique" UNIQUE("groupKey")
);
--> statement-breakpoint
CREATE TABLE "Pengukuran" (
	"id" text PRIMARY KEY NOT NULL,
	"anakId" text NOT NULL,
	"posyanduId" text NOT NULL,
	"kaderId" text NOT NULL,
	"beratBadan" double precision NOT NULL,
	"tinggiBadan" double precision NOT NULL,
	"zScoreTBU" double precision NOT NULL,
	"zScoreBBU" double precision NOT NULL,
	"zScoreBBTB" double precision NOT NULL,
	"statusTBU" text NOT NULL,
	"statusBBU" text NOT NULL,
	"statusBBTB" text NOT NULL,
	"tanggal" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Posyandu" (
	"id" text PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"alamat" text NOT NULL,
	"kecamatan" text NOT NULL,
	"kota" text NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PregnancyProfile" (
	"id" text PRIMARY KEY NOT NULL,
	"ibuId" text NOT NULL,
	"hpht" timestamp NOT NULL,
	"bbPrepregnancyKg" double precision NOT NULL,
	"heightCm" double precision NOT NULL,
	"imtPrepregnancy" double precision NOT NULL,
	"imtCategory" text NOT NULL,
	"targetGainMinKg" double precision NOT NULL,
	"targetGainMaxKg" double precision NOT NULL,
	"weeklyGainMinKg" double precision NOT NULL,
	"weeklyGainMaxKg" double precision NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "PregnancyProfile_ibuId_unique" UNIQUE("ibuId")
);
--> statement-breakpoint
CREATE TABLE "PregnancyVisit" (
	"id" text PRIMARY KEY NOT NULL,
	"ibuId" text NOT NULL,
	"kaderId" text,
	"visitDate" timestamp NOT NULL,
	"currentWeightKg" double precision NOT NULL,
	"weightGainKg" double precision NOT NULL,
	"lilaCm" double precision NOT NULL,
	"hbGdl" double precision NOT NULL,
	"isOnTrack" boolean NOT NULL,
	"catatanKader" text,
	"kirimKeIbu" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SesiPengukuran" (
	"id" text PRIMARY KEY NOT NULL,
	"deviceId" text,
	"kategori" text DEFAULT 'anak' NOT NULL,
	"anakId" text,
	"ibuId" text,
	"lilaCm" double precision,
	"hbGdl" double precision,
	"jawaban" jsonb,
	"nilaiTinggi" double precision,
	"nilaiBerat" double precision,
	"statusHasil" text DEFAULT 'menunggu' NOT NULL,
	"kategoriHasil" text,
	"skorAkhir" integer,
	"skorKuesioner" double precision,
	"teksEdukasi" text,
	"namaPasien" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SkriningShamil" (
	"id" text PRIMARY KEY NOT NULL,
	"ibuId" text NOT NULL,
	"posyanduId" text NOT NULL,
	"kaderId" text NOT NULL,
	"skorRisiko" integer NOT NULL,
	"kategori" text NOT NULL,
	"jawaban" jsonb NOT NULL,
	"tanggal" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Anak" ADD CONSTRAINT "Anak_ibuId_Ibu_id_fk" FOREIGN KEY ("ibuId") REFERENCES "public"."Ibu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DailyTask" ADD CONSTRAINT "DailyTask_ibuId_Ibu_id_fk" FOREIGN KEY ("ibuId") REFERENCES "public"."Ibu"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Ibu" ADD CONSTRAINT "Ibu_posyanduId_Posyandu_id_fk" FOREIGN KEY ("posyanduId") REFERENCES "public"."Posyandu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Kader" ADD CONSTRAINT "Kader_posyanduId_Posyandu_id_fk" FOREIGN KEY ("posyanduId") REFERENCES "public"."Posyandu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Notifikasi" ADD CONSTRAINT "Notifikasi_posyanduId_Posyandu_id_fk" FOREIGN KEY ("posyanduId") REFERENCES "public"."Posyandu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Notifikasi" ADD CONSTRAINT "Notifikasi_ibuId_Ibu_id_fk" FOREIGN KEY ("ibuId") REFERENCES "public"."Ibu"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Pengukuran" ADD CONSTRAINT "Pengukuran_anakId_Anak_id_fk" FOREIGN KEY ("anakId") REFERENCES "public"."Anak"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Pengukuran" ADD CONSTRAINT "Pengukuran_posyanduId_Posyandu_id_fk" FOREIGN KEY ("posyanduId") REFERENCES "public"."Posyandu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Pengukuran" ADD CONSTRAINT "Pengukuran_kaderId_Kader_id_fk" FOREIGN KEY ("kaderId") REFERENCES "public"."Kader"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PregnancyProfile" ADD CONSTRAINT "PregnancyProfile_ibuId_Ibu_id_fk" FOREIGN KEY ("ibuId") REFERENCES "public"."Ibu"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PregnancyVisit" ADD CONSTRAINT "PregnancyVisit_ibuId_Ibu_id_fk" FOREIGN KEY ("ibuId") REFERENCES "public"."Ibu"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PregnancyVisit" ADD CONSTRAINT "PregnancyVisit_kaderId_Kader_id_fk" FOREIGN KEY ("kaderId") REFERENCES "public"."Kader"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SesiPengukuran" ADD CONSTRAINT "SesiPengukuran_deviceId_Device_id_fk" FOREIGN KEY ("deviceId") REFERENCES "public"."Device"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SesiPengukuran" ADD CONSTRAINT "SesiPengukuran_anakId_Anak_id_fk" FOREIGN KEY ("anakId") REFERENCES "public"."Anak"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SesiPengukuran" ADD CONSTRAINT "SesiPengukuran_ibuId_Ibu_id_fk" FOREIGN KEY ("ibuId") REFERENCES "public"."Ibu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SkriningShamil" ADD CONSTRAINT "SkriningShamil_ibuId_Ibu_id_fk" FOREIGN KEY ("ibuId") REFERENCES "public"."Ibu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SkriningShamil" ADD CONSTRAINT "SkriningShamil_posyanduId_Posyandu_id_fk" FOREIGN KEY ("posyanduId") REFERENCES "public"."Posyandu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SkriningShamil" ADD CONSTRAINT "SkriningShamil_kaderId_Kader_id_fk" FOREIGN KEY ("kaderId") REFERENCES "public"."Kader"("id") ON DELETE no action ON UPDATE no action;