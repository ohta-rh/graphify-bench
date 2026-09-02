/**
 * Calendar grid arithmetic for `<DatePicker />`.
 *
 * Works entirely on `YYYY-MM-DD` strings and UTC dates so a user in UTC+9 sees
 * the same day the server stored — the corpus never persists a local-time date.
 * Private to `src/components/ui/**`.
 */

export type CalendarCell = {
  /** ISO `YYYY-MM-DD`. */
  iso: string;
  day: number;
  /** False for the leading/trailing days borrowed from adjacent months. */
  inMonth: boolean;
};

export const WEEKDAY_LABELS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string | null | undefined): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && toIso(parsed) === value;
}

export function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Parse an ISO date, falling back to `fallback` for anything malformed. */
export function parseIso(value: string | null | undefined, fallback: Date): Date {
  if (!isIsoDate(value)) return fallback;
  return new Date(`${value}T00:00:00.000Z`);
}

/** Human month heading, e.g. `"March 2026"`. */
export function monthLabel(date: Date): string {
  return `${MONTH_LABELS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** First day of the month `offset` months away from `date`. */
export function shiftMonth(date: Date, offset: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1),
  );
}

/**
 * Six weeks of cells (42) for the month containing `date`, Monday-first.
 * A fixed cell count keeps the popover from resizing as the user pages through
 * months, which is the whole reason for padding to six rows.
 */
export function buildMonthGrid(date: Date): CalendarCell[] {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1));
  // getUTCDay() is Sunday-based; rotate so Monday === 0.
  const leading = (first.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(year, month, 1 - leading));

  return Array.from({ length: 42 }, (_, index) => {
    const cursor = new Date(start.getTime() + index * 86_400_000);
    return {
      iso: toIso(cursor),
      day: cursor.getUTCDate(),
      inMonth: cursor.getUTCMonth() === month,
    };
  });
}

/** True when `iso` falls outside an optional `[min, max]` window. */
export function isOutOfRange(
  iso: string,
  min?: string,
  max?: string,
): boolean {
  if (isIsoDate(min) && iso < min) return true;
  if (isIsoDate(max) && iso > max) return true;
  return false;
}
