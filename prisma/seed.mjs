import "dotenv/config"

import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"
import { PrismaClient } from "../app/generated/prisma/index.js"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const posyandu =
    (await prisma.posyandu.findFirst({
      where: {
        nama: "Posyandu Melati",
        alamat: "Jl. Melati No. 1",
      },
    })) ??
    (await prisma.posyandu.create({
      data: {
        nama: "Posyandu Melati",
        alamat: "Jl. Melati No. 1",
        kelurahan: "Melati",
        kecamatan: "Kecamatan Sehat",
        kota: "Kota Sehat",
        latitude: -5.1477,
        longitude: 119.4327,
      },
    }))

  await prisma.kader.upsert({
    where: { username: "zee.asadel" },
    update: {
      nama: "Zee Asadel",
      password: await bcrypt.hash("password123", 10),
      posyanduId: posyandu.id,
    },
    create: {
      nama: "Zee Asadel",
      username: "zee.asadel",
      password: await bcrypt.hash("password123", 10),
      posyanduId: posyandu.id,
    },
  })

  await prisma.ibu.upsert({
    where: { username: "andi.pratama" },
    update: {
      nama: "Andi Pratama",
      pin: await bcrypt.hash("1234", 10),
      noHp: "081234567890",
      alamat: "Jl. Sehat No. 1",
      posyanduId: posyandu.id,
    },
    create: {
      nama: "Andi Pratama",
      username: "andi.pratama",
      pin: await bcrypt.hash("1234", 10),
      noHp: "081234567890",
      alamat: "Jl. Sehat No. 1",
      posyanduId: posyandu.id,
    },
  })

  const ibu = await prisma.ibu.findUnique({ where: { username: "andi.pratama" } })

  // Pregnancy profile (IMT Normal: 52kg / 1.58² = 20.83)
  await prisma.pregnancyProfile.upsert({
    where: { ibuId: ibu.id },
    update: {},
    create: {
      ibuId: ibu.id,
      bbPrepregnancyKg: 52,
      heightCm: 158,
      imtPrepregnancy: 20.83,
      imtCategory: "normal",
      targetGainMinKg: 11.3,
      targetGainMaxKg: 15.9,
      weeklyGainMinKg: 0.36,
      weeklyGainMaxKg: 0.45,
    },
  })

  // Hapus kunjungan lama agar seed idempoten
  await prisma.pregnancyVisit.deleteMany({ where: { ibuId: ibu.id } })

  // 4 kunjungan sample (urutan lama ke baru)
  const visits = [
    { visitDate: new Date("2026-04-01"), currentWeightKg: 53.5, weightGainKg: 1.5,  lilaCm: 25.2, hbGdl: 12.0, isOnTrack: true  },
    { visitDate: new Date("2026-04-30"), currentWeightKg: 55.5, weightGainKg: 3.5,  lilaCm: 25.0, hbGdl: 11.8, isOnTrack: true  },
    { visitDate: new Date("2026-05-05"), currentWeightKg: 57.0, weightGainKg: 5.0,  lilaCm: 24.8, hbGdl: 10.9, isOnTrack: false },
    { visitDate: new Date("2026-06-02"), currentWeightKg: 60.5, weightGainKg: 8.5,  lilaCm: 25.1, hbGdl: 11.8, isOnTrack: true  },
  ]

  for (const v of visits) {
    await prisma.pregnancyVisit.create({ data: { ibuId: ibu.id, ...v } })
  }

  console.log("Seed berhasil")
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
