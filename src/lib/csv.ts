/** Convert an array of flat objects to a CSV string with a UTF-8 BOM (Excel + Thai). */
export function toCsv(rows: Record<string, unknown>[], headers?: string[]): string {
  if (rows.length === 0) return "﻿";
  const cols = headers ?? Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = v instanceof Date ? v.toISOString() : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const head = cols.join(",");
  const body = rows.map((r) => cols.map((c) => escape(r[c])).join(",")).join("\n");
  return `﻿${head}\n${body}`;
}
