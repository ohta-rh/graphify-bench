/**
 * RFC-4180 CSV writer used by both export routes.
 *
 * STUB — owner E. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
export function toCsv(rows: readonly Readonly<Record<string, string | number | boolean | null>>[], columns: readonly string[]): string {
  throw new Error("stub: src/lib/csv.ts");
}

export function escapeCsvValue(value: string | number | boolean | null): string {
  throw new Error("stub: src/lib/csv.ts");
}

export function csvResponseHeaders(filename: string): Readonly<Record<string, string>> {
  throw new Error("stub: src/lib/csv.ts");
}
