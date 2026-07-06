import { db } from "@/lib/db/client"
import { ibu, anak, pengukuran, posyandu, kader } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

async function main() {
  const ibuRow = await db.query.ibu.findFirst({ where: eq(ibu.username, "ibutest") })
  if (!ibuRow) throw new Error("ibutest not found")
  console.log("ibutest id:", ibuRow.id)

  let anakRow = await db.query.anak.findFirst({ where: eq(anak.ibuId, ibuRow.id) })
  if (!anakRow) {
    console.log("inserting throwaway anak + pengukuran...")
    const posyanduRow = await db.query.posyandu.findFirst()
    const kaderRow = await db.query.kader.findFirst()
    if (!posyanduRow || !kaderRow) throw new Error("need at least one posyandu and kader row")

    const [newAnak] = await db
      .insert(anak)
      .values({
        nama: "Anak Test Verify",
        tanggalLahir: new Date("2024-01-15"),
        jenisKelamin: "L",
        anakKe: 1,
        ibuId: ibuRow.id,
      })
      .returning()
    anakRow = newAnak

    await db.insert(pengukuran).values({
      anakId: newAnak.id,
      posyanduId: posyanduRow.id,
      kaderId: kaderRow.id,
      beratBadan: 10.5,
      tinggiBadan: 78.2,
      zScoreTBU: -1.2,
      zScoreBBU: -0.8,
      zScoreBBTB: -0.5,
      statusTBU: "Normal",
      statusBBU: "Normal",
      statusBBTB: "Normal",
      tanggal: new Date(),
    })
    console.log("inserted anak id:", newAnak.id)
  } else {
    console.log("anak already exists:", anakRow.id)
  }

  console.log("ANAK_ID=" + anakRow.id)
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e)
  process.exit(1)
})
