/**
 * RFC-4180 CSV writer used by both export routes (issues and the audit log).
 *
 * The rules that matter: fields containing a comma, a double quote or a line
 * break are wrapped in double quotes and every embedded quote is doubled;
 * rows are separated by CRLF; column order comes from the caller, never from
 * object key order.
 */

const NEEDS_QUOTING = /[",\r\n]/;

export function escapeCsvValue(value: string | number | boolean | null): string {
  if (value === null) return "";
  const text = String(value);
  if (!NEEDS_QUOTING.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Serialises `rows` using `columns` as both the header line and the field
 * order. A column missing from a row is written as an empty field.
 */
export function toCsv(
  rows: readonly Readonly<Record<string, string | number | boolean | null>>[],
  columns: readonly string[],
): string {
  const lines: string[] = [columns.map(escapeCsvValue).join(",")];

  for (const row of rows) {
    lines.push(
      columns
        .map((column) => escapeCsvValue(row[column] ?? null))
        .join(","),
    );
  }

  return lines.join("\r\n");
}

/** The headers an export Route Handler returns alongside the CSV body. */
export function csvResponseHeaders(
  filename: string,
): Readonly<Record<string, string>> {
  const safe = filename.replace(/[^A-Za-z0-9._-]/g, "-");
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${safe}"`,
    "Cache-Control": "no-store",
  };
}
