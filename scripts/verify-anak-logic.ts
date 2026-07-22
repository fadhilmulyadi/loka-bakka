/**
 * Self-check band status gizi anak terhadap ambang WHO TB/U.
 * Jalankan: npx tsx scripts/verify-anak-logic.ts
 */
import assert from "node:assert/strict"
import { getStuntingStatus, statusAnak } from "../lib/growth-standards/stunting-calc"

// --- Ambang band: < -3 stunting, -3..-2 risiko, >= -2 normal ---
assert.equal(getStuntingStatus(-3.01), "stunting")
assert.equal(getStuntingStatus(-3), "risiko_stunting")
assert.equal(getStuntingStatus(-2.01), "risiko_stunting")
assert.equal(getStuntingStatus(-2), "normal")
assert.equal(getStuntingStatus(0), "normal")
assert.equal(getStuntingStatus(2.5), "normal") // tidak ada band "Tinggi"

// --- statusAnak: label diturunkan dari z-score, bukan kolom statusTBU ---
assert.equal(statusAnak({ zScoreTBU: -3.5 }), "Stunting")
assert.equal(statusAnak({ zScoreTBU: -2.4 }), "Pra Stunting")
assert.equal(statusAnak({ zScoreTBU: -1 }), "Normal")

// Anak belum pernah diukur dianggap Normal (dashboard menghitungnya terpisah
// lewat totalMeasured, jadi ini tidak masuk bucket manapun).
assert.equal(statusAnak(undefined), "Normal")
assert.equal(statusAnak(null), "Normal")

// Baris lama dengan label pensiun tetap terklasifikasi benar dari z-score-nya:
// dulu "Berisiko" jatuh ke cabang else dan salah dihitung sebagai stunting.
assert.equal(statusAnak({ zScoreTBU: -2.2 }), "Pra Stunting")

console.log("OK: band status anak konsisten dengan ambang WHO")
