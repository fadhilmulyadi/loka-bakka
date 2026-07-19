"use client"

import { useState } from "react"
import { Upload, Download, Loader2, CircleCheck, CircleAlert } from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { parseCSV, toCSV, downloadCSV } from "@/lib/csv"
import { createChild, createIbu } from "@/lib/actions/kader"
import { KELURAHAN_NAMES } from "@/lib/constants/kelurahan"
import { cn } from "@/lib/utils"

type Kind = "anak" | "ibu"

const TEMPLATES: Record<Kind, { headers: string[]; example: string[] }> = {
  anak: {
    headers: ["nama", "jenis_kelamin", "tanggal_lahir", "nama_ibu", "username_ibu", "no_telp", "alamat", "nama_ayah", "anak_ke"],
    example: ["Contoh Anak", "L", "2024-01-15", "Contoh Ibu", "contoh.ibu", "081234567890", "RT 01/RW 02, Desa Contoh", "Contoh Ayah", "1"],
  },
  ibu: {
    headers: ["nama", "username", "password", "kelurahan", "no_telp", "tanggal_lahir", "alamat", "sedang_hamil", "hpht", "tinggi_badan_cm", "bb_sebelum_hamil_kg", "bb_saat_ini_kg"],
    example: ["Contoh Ibu", "contoh.ibu", "rahasia123", KELURAHAN_NAMES[0], "081234567890", "1995-05-10", "RT 01/RW 02, Desa Contoh", "ya", "2026-01-01", "158", "55", "60"],
  },
}

// Subset of TEMPLATES headers actually required to create a record — used to
// catch "wrong file" (e.g. an exported rekap CSV) before per-row validation,
// so the error names the real problem instead of failing every row silently.
const REQUIRED_HEADERS: Record<Kind, string[]> = {
  anak: ["nama", "jenis_kelamin", "tanggal_lahir", "nama_ibu", "username_ibu"],
  ibu: ["nama", "username", "password", "kelurahan"],
}

type ParsedRow = { no: number; data: Record<string, string>; errors: string[] }
type ResultRow = { no: number; nama: string; ok: boolean; message: string }

function validateRow(kind: Kind, data: Record<string, string>): string[] {
  const errors: string[] = []
  if (kind === "anak") {
    if (!data.nama) errors.push("Nama kosong")
    if (data.jenis_kelamin !== "L" && data.jenis_kelamin !== "P") errors.push("Jenis kelamin harus L atau P")
    if (!data.tanggal_lahir || isNaN(new Date(data.tanggal_lahir).getTime())) errors.push("Tanggal lahir tidak valid")
    if (!data.nama_ibu) errors.push("Nama ibu kosong")
    if (!data.username_ibu) errors.push("Username ibu kosong")
  } else {
    if (!data.nama) errors.push("Nama kosong")
    if (!data.username) errors.push("Username kosong")
    if (!data.password || data.password.length < 6) errors.push("Password minimal 6 karakter")
    if (!KELURAHAN_NAMES.includes(data.kelurahan)) errors.push("Kelurahan tidak valid")
    if (data.sedang_hamil?.toLowerCase() === "ya") {
      if (!data.hpht || isNaN(new Date(data.hpht).getTime())) errors.push("HPHT tidak valid")
      if (!data.tinggi_badan_cm) errors.push("Tinggi badan kosong")
      if (!data.bb_sebelum_hamil_kg) errors.push("BB sebelum hamil kosong")
    }
  }
  return errors
}

export function ImportPasienDialog({ kind, onImported }: { kind: Kind; onImported: () => void }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload")
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<ResultRow[]>([])

  const reset = () => {
    setStep("upload"); setRows([]); setFileError(null); setResults([])
  }

  const handleFile = async (file: File) => {
    setFileError(null)
    const table = parseCSV(await file.text())
    if (table.length < 2) {
      setFileError("File kosong atau tidak ada baris data")
      return
    }
    const headers = table[0].map((h) => h.trim().toLowerCase())
    const missing = REQUIRED_HEADERS[kind].filter((h) => !headers.includes(h))
    if (missing.length > 0) {
      setFileError(
        `File ini tidak cocok dengan template impor ${kind === "anak" ? "Anak" : "Ibu"}. ` +
        `Kolom wajib tidak ditemukan: ${missing.join(", ")}. ` +
        `Gunakan "Unduh template CSV" di atas, jangan file hasil Ekspor.`
      )
      return
    }
    setRows(table.slice(1).map((cells, i) => {
      const data: Record<string, string> = {}
      headers.forEach((h, idx) => { data[h] = (cells[idx] ?? "").trim() })
      return { no: i + 1, data, errors: validateRow(kind, data) }
    }))
    setStep("preview")
  }

  const handleDownloadTemplate = () => {
    const t = TEMPLATES[kind]
    downloadCSV(`template-${kind}.csv`, toCSV(t.headers, [t.example]))
  }

  const validRows = rows.filter((r) => r.errors.length === 0)

  const handleConfirmImport = async () => {
    setImporting(true)
    const out: ResultRow[] = []
    for (const r of validRows) {
      try {
        if (kind === "anak") {
          await createChild({
            nama: r.data.nama,
            sex: r.data.jenis_kelamin,
            birth: r.data.tanggal_lahir,
            ibu: r.data.nama_ibu,
            ibuUsername: r.data.username_ibu,
            telp: r.data.no_telp || undefined,
            alamat: r.data.alamat || undefined,
            namaAyah: r.data.nama_ayah || undefined,
            anakKe: r.data.anak_ke ? Number(r.data.anak_ke) : undefined,
          })
        } else {
          const isHamil = r.data.sedang_hamil?.toLowerCase() === "ya"
          await createIbu({
            nama: r.data.nama,
            username: r.data.username,
            password: r.data.password,
            kelurahan: r.data.kelurahan,
            noHp: r.data.no_telp || undefined,
            tanggalLahir: r.data.tanggal_lahir || undefined,
            alamat: r.data.alamat || undefined,
            isHamil,
            hpht: isHamil ? r.data.hpht : undefined,
            bbPrepregnancyKg: isHamil ? Number(r.data.bb_sebelum_hamil_kg) : undefined,
            heightCm: isHamil ? Number(r.data.tinggi_badan_cm) : undefined,
            currentWeightKg: isHamil && r.data.bb_saat_ini_kg ? Number(r.data.bb_saat_ini_kg) : undefined,
          })
        }
        out.push({ no: r.no, nama: r.data.nama, ok: true, message: "Berhasil ditambahkan" })
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Gagal menyimpan"
        out.push({ no: r.no, nama: r.data.nama, ok: false, message: msg === "USERNAME_TAKEN" ? "Username sudah digunakan" : msg })
      }
    }
    setResults(out)
    setImporting(false)
    setStep("result")
    if (out.some((r) => r.ok)) onImported()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger className="gap-1.5 text-xs h-8 px-4 inline-flex items-center bg-white rounded-[50px] text-[#173753] hover:bg-white/80 cursor-pointer">
        <Upload className="w-3.5 h-3.5" />
        Impor
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Impor Data {kind === "anak" ? "Anak" : "Ibu"}</DialogTitle>
          <DialogDescription>
            {step === "upload" && "Unggah file CSV untuk menambah banyak pasien sekaligus."}
            {step === "preview" && `${rows.length} baris ditemukan, ${validRows.length} valid.`}
            {step === "result" && "Impor selesai."}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col gap-3">
            <button type="button" onClick={handleDownloadTemplate} className="flex items-center gap-1.5 text-xs font-medium text-[#52A9E3] hover:underline w-fit">
              <Download className="w-3.5 h-3.5" />
              Unduh template CSV
            </button>
            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-8 text-sm text-muted-foreground cursor-pointer hover:border-[#52A9E3] hover:text-[#52A9E3] transition-colors">
              <Upload className="w-6 h-6" />
              Pilih file CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
            </label>
            {fileError && <p className="text-xs text-red-600">{fileError}</p>}
          </div>
        )}

        {step === "preview" && (
          <div className="flex flex-col gap-3">
            <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-100">
              <table className="w-full text-xs">
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.no} className={cn("border-b border-gray-50 last:border-0", r.errors.length > 0 && "bg-red-50/60")}>
                      <td className="px-2 py-1.5 text-muted-foreground w-8">{r.no}</td>
                      <td className="px-2 py-1.5 font-medium text-[#173753]">{r.data.nama || "-"}</td>
                      <td className="px-2 py-1.5">
                        {r.errors.length === 0 ? (
                          <span className="inline-flex items-center gap-1 text-green-700"><CircleCheck className="w-3 h-3" />Valid</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600" title={r.errors.join(", ")}>
                            <CircleAlert className="w-3 h-3" />{r.errors[0]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {validRows.length === 0 && <p className="text-xs text-red-600">Tidak ada baris valid untuk diimpor.</p>}
          </div>
        )}

        {step === "result" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5 font-medium text-green-700">
                <CircleCheck className="w-4 h-4" />{results.filter((r) => r.ok).length} berhasil
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-red-600">
                <CircleAlert className="w-4 h-4" />{results.filter((r) => !r.ok).length} gagal
              </span>
            </div>
            <div className="max-h-56 overflow-y-auto flex flex-col gap-1">
              {results.filter((r) => !r.ok).map((r) => (
                <p key={r.no} className="text-xs text-red-600">Baris {r.no} ({r.nama || "-"}): {r.message}</p>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={reset}>Ganti file</Button>
              <Button disabled={validRows.length === 0 || importing} onClick={handleConfirmImport}>
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : `Impor ${validRows.length} data`}
              </Button>
            </>
          )}
          {step === "result" && <Button onClick={() => setOpen(false)}>Selesai</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
