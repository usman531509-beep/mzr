// Tiny CSV writer with proper escaping. Used by every report's export
// route — kept here so we have one canonical place that handles commas,
// quotes, newlines, BOM, and date formatting.

export type CsvCol<T> = {
  header: string;
  /** Pull a string/number/date value out of the row. */
  value: (row: T) => string | number | Date | null | undefined;
};

const escapeCell = (v: string | number | Date | null | undefined): string => {
  if (v === null || v === undefined) return "";
  let s: string;
  if (v instanceof Date) {
    s = v.toISOString();
  } else if (typeof v === "number") {
    // Avoid scientific-notation surprises in spreadsheets.
    s = Number.isFinite(v) ? String(v) : "";
  } else {
    s = String(v);
  }
  // Quote anything containing comma / quote / newline.
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

export function toCsv<T>(rows: T[], cols: CsvCol<T>[]): string {
  const header = cols.map((c) => escapeCell(c.header)).join(",");
  const body = rows
    .map((r) => cols.map((c) => escapeCell(c.value(r))).join(","))
    .join("\n");
  // UTF-8 BOM so Excel opens it as UTF-8 instead of guessing Windows-1252.
  return "﻿" + header + "\n" + body + "\n";
}

/** Build a Response that streams the CSV with the right headers. */
export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      // Reports are private — never let an intermediary cache them.
      "cache-control": "private, no-store",
    },
  });
}
