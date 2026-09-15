/**
 * RFC 4180 CSV serialization. Pure / framework‑free (no runtime AI/LLM, no deps).
 *
 * Used by the admin export route (`GET /api/admin/exports/:resource?format=csv`)
 * and unit‑tested directly. Field escaping follows the spec's data rule:
 * nothing sensitive (full bank / card numbers) is ever written — sensitive
 * columns are masked at the row‑mapper level before reaching this serializer.
 */

export type CsvCell = string | number | boolean | null | undefined;

/** A single export column: a header label + a row accessor. */
export interface CsvColumn<T> {
  header: string;
  cell: (row: T) => CsvCell;
}

/** A complete, self‑describing export: name, filename, columns. */
export interface CsvExport<T> {
  /** Machine name used in the URL, e.g. `/api/admin/exports/orders`. */
  resource: string;
  filename: (now: Date) => string;
  columns: CsvColumn<T>[];
}

/**
 * Serialize an export definition + its rows to a CSV string.
 * - Each field containing a comma, double‑quote, or newline is RFC 4180 quoted
 *   (internal quotes doubled).
 * - Header row first, then data rows, terminated by a trailing newline.
 */
export function toCsv<T>(def: CsvExport<T>, rows: T[]): string {
  const headerLine = def.columns.map((c) => escapeCsvField(c.header)).join(",");
  const bodyLines = rows.map((row) =>
    def.columns.map((c) => escapeCsvField(c.cell(row))).join(","),
  );
  if (bodyLines.length === 0) return `${headerLine}\n`;
  return `${headerLine}\n${bodyLines.join("\n")}\n`;
}

/** UTF-8 BOM so Microsoft Excel treats the download as UTF-8 (not ANSI). */
export const CSV_UTF8_BOM = "\uFEFF";

/**
 * CSV payload that Excel opens correctly (UTF-8 BOM + RFC 4180 body).
 * Spec B-9 delivers CSV; Excel is the expected desktop viewer.
 */
export function toExcelCsv<T>(def: CsvExport<T>, rows: T[]): string {
  return `${CSV_UTF8_BOM}${toCsv(def, rows)}`;
}

/** RFC 4180 field escaping. */
export function escapeCsvField(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "string" ? value : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}
