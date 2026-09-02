/**
 * Timestamp helpers: ISO round-tripping, relative formatting, due-date and digest-window arithmetic.
 *
 * STUB — owner E. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { IsoTimestamp } from "@/types/common";
export function now(): IsoTimestamp {
  throw new Error("stub: src/lib/date.ts");
}

export function parseIso(value: IsoTimestamp): Date {
  throw new Error("stub: src/lib/date.ts");
}

export function formatRelative(value: IsoTimestamp, reference?: Date): string {
  throw new Error("stub: src/lib/date.ts");
}

export function formatDate(value: IsoTimestamp, timezone?: string): string {
  throw new Error("stub: src/lib/date.ts");
}

export function isOverdue(dueAt: IsoTimestamp | null, reference?: Date): boolean {
  throw new Error("stub: src/lib/date.ts");
}

export function addDays(value: IsoTimestamp, days: number): IsoTimestamp {
  throw new Error("stub: src/lib/date.ts");
}

export function digestWindow(digestHourUtc: number, reference: Date): { start: IsoTimestamp; end: IsoTimestamp } {
  throw new Error("stub: src/lib/date.ts");
}
