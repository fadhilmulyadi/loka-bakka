// ponytail: hand-rolled instead of a csv library — RFC4180 quoting is ~20 lines, not worth a dependency
export function toCSV(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v ?? "")
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers, ...rows].map((row) => row.map(escape).join(",")).join("\r\n")
}

export function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  const pushField = () => { row.push(field); field = "" }
  const pushRow = () => { pushField(); rows.push(row); row = [] }

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += c
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ",") {
      pushField()
    } else if (c === "\n") {
      if (field.endsWith("\r")) field = field.slice(0, -1)
      pushRow()
    } else {
      field += c
    }
  }
  if (field || row.length) pushRow()

  return rows.filter((r) => r.length > 1 || r[0] !== "")
}

export function downloadCSV(filename: string, content: string) {
  // BOM so Excel opens UTF-8 (accented names/addresses) correctly
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
