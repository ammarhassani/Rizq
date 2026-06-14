/**
 * Minimal, dependency-free CSV helpers for the catalog import/export.
 *
 * PURE module: no React, no Supabase. RFC 4180-style — fields are quoted only
 * when they contain a comma, double-quote, or newline; embedded quotes are
 * escaped by doubling. The parser handles quoted fields, escaped quotes, and
 * CRLF/LF line breaks inside or between rows. Tests live in csv.test.ts.
 */

export type CsvColumn<T> = { key: keyof T; header: string };

/** Quote a single field if it contains a comma, quote, or newline. */
function quoteField(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Serialise rows to a CSV string with a header row. Uses CRLF line endings. */
export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: CsvColumn<T>[]
): string {
  const header = columns.map((c) => quoteField(c.header)).join(",");
  const body = rows.map((row) =>
    columns.map((c) => quoteField(row[c.key])).join(",")
  );
  return [header, ...body].join("\r\n");
}

/**
 * Parse a CSV string into rows of string cells. Tolerant of CRLF/LF, quoted
 * fields with embedded commas/newlines, and "" escapes. Trailing blank lines
 * are ignored. Does NOT infer types — callers coerce.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  // Strip a UTF-8 BOM if present.
  if (text.charCodeAt(0) === 0xfeff) i = 1;

  function endField() {
    row.push(field);
    field = "";
  }
  function endRow() {
    endField();
    // Skip rows that are entirely empty (e.g. a trailing newline).
    if (!(row.length === 1 && row[0] === "")) rows.push(row);
    row = [];
  }

  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      endField();
      i += 1;
      continue;
    }
    if (ch === "\r") {
      // Treat CRLF and lone CR as a single line break.
      if (text[i + 1] === "\n") i += 1;
      endRow();
      i += 1;
      continue;
    }
    if (ch === "\n") {
      endRow();
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }

  // Flush the final field/row if the file didn't end with a newline.
  if (field !== "" || row.length > 0) endRow();

  return rows;
}

/**
 * Map parsed CSV rows to objects keyed by a normalised header. Header matching
 * is case-insensitive and ignores surrounding whitespace + underscores/spaces,
 * so "Unit Price", "unit_price_sar", and "unitprice" all map to the same field.
 * Returns { headers, records } where records are header→cell maps.
 */
export function csvToRecords(text: string): { headers: string[]; records: Record<string, string>[] } {
  const rows = parseCsv(text);
  if (rows.length === 0) return { headers: [], records: [] };
  const headers = rows[0].map((h) => h.trim());
  const records = rows.slice(1).map((cells) => {
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rec[normalizeHeader(h)] = (cells[idx] ?? "").trim();
    });
    return rec;
  });
  return { headers, records };
}

/** Normalise a header for tolerant matching: lowercase, strip spaces/underscores. */
export function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[\s_]+/g, "");
}

/**
 * Coerce a CSV cell to a non-negative number; blank/invalid → null.
 * Strips thousands separators and any currency text (incl. "ر.س", whose dot
 * would otherwise corrupt the value), then takes the first numeric run.
 */
export function parseMoneyCell(value: string | undefined): number | null {
  if (value == null) return null;
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const n = parseFloat(match[0]);
  if (!isFinite(n) || n < 0) return null;
  return n;
}
