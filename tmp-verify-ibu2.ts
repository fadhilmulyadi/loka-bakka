import { db } from "@/lib/db/client"
import { ibu, anak, pengukuran, skriningShamil } from "@/lib/db/schema"
import { eq, and, desc, asc } from "drizzle-orm"

const IBU_ID = "787ed932-734c-4f7b-969d-dfd6ab173d6a"
const ANAK_ID = "7608f4eb-b699-4cbf-9ef0-1dc7b4c723ff"

async function getIbuData() {
  const ibuRow = await db.query.ibu.findFirst({
    where: eq(ibu.id, IBU_ID),
    with: {
      anaks: {
        with: { pengukurans: { orderBy: desc(pengukuran.tanggal), limit: 10 } },
        orderBy: asc(anak.createdAt),
      },
      skrinings: { orderBy: desc(skriningShamil.tanggal), limit: 1 },
      pregnancyProfile: true,
      pregnancyVisits: { orderBy: (pv, { desc }) => desc(pv.visitDate), limit: 1 },
    },
  })
  return ibuRow
}

async function getIbuProfile() {
  return db.query.ibu.findFirst({
    where: eq(ibu.id, IBU_ID),
    with: {
      posyandu: true,
      pregnancyProfile: true,
      skrinings: { orderBy: desc(skriningShamil.tanggal), limit: 1 },
    },
  })
}

async function getIbuAnaks() {
  return db.query.ibu.findFirst({
    where: eq(ibu.id, IBU_ID),
    with: {
      anaks: {
        with: { pengukurans: { orderBy: desc(pengukuran.tanggal), limit: 1 } },
        orderBy: asc(anak.createdAt),
      },
    },
  })
}

async function getIbuAnakForDashboard(id: string) {
  return Promise.all([
    db.query.ibu.findFirst({ where: eq(ibu.id, IBU_ID), columns: { nama: true } }),
    db.query.anak.findFirst({
      where: and(eq(anak.id, id), eq(anak.ibuId, IBU_ID)),
      with: { pengukurans: { orderBy: desc(pengukuran.tanggal), limit: 10 } },
    }),
  ])
}

async function getIbuAnakDetail(id: string) {
  return db.query.anak.findFirst({
    where: and(eq(anak.id, id), eq(anak.ibuId, IBU_ID)),
    with: { pengukurans: { orderBy: desc(pengukuran.tanggal) } },
  })
}

async function main() {
  console.log("=== getIbuData ===")
  console.log(JSON.stringify(await getIbuData(), null, 2))

  console.log("=== getIbuProfile ===")
  console.log(JSON.stringify(await getIbuProfile(), null, 2))

  console.log("=== getIbuAnaks ===")
  console.log(JSON.stringify(await getIbuAnaks(), null, 2))

  console.log("=== getIbuAnakForDashboard ===")
  console.log(JSON.stringify(await getIbuAnakForDashboard(ANAK_ID), null, 2))

  console.log("=== getIbuAnakDetail ===")
  console.log(JSON.stringify(await getIbuAnakDetail(ANAK_ID), null, 2))
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e)
  process.exit(1)
})
