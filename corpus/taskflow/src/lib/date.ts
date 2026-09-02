/**
 * Timestamp helpers: ISO round-tripping, relative formatting, due-date and
 * digest-window arithmetic.
 *
 * Every timestamp in Taskflow is an `IsoTimestamp` (a UTC ISO-8601 string in
 * a SQLite text column). Nothing outside this module constructs a `Date` from
 * a stored value — going through `parseIso()` keeps the "what if it is
 * malformed" answer in one place.
 */
import type { IsoTimestamp } from "@/types/common";
import { toIsoTimestamp } from "@/types/common";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

export function now(): IsoTimestamp {
  return toIsoTimestamp(new Date());
}

/** Parses a stored timestamp; throws rather than yielding an Invalid Date. */
export function parseIso(value: IsoTimestamp): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`Malformed IsoTimestamp: "${value}"`);
  }
  return date;
}

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

/**
 * "just now" / "5 minutes ago" / "in 2 days" — the wording the activity feed,
 * issue cards and comment headers all use.
 */
export function formatRelative(
  value: IsoTimestamp,
  reference: Date = new Date(),
): string {
  const deltaMs = parseIso(value).getTime() - reference.getTime();
  const past = deltaMs < 0;
  const abs = Math.abs(deltaMs);

  const phrase = ((): string => {
    if (abs < MINUTE_MS) return "just now";
    if (abs < HOUR_MS) return plural(Math.floor(abs / MINUTE_MS), "minute");
    if (abs < DAY_MS) return plural(Math.floor(abs / HOUR_MS), "hour");
    if (abs < WEEK_MS) return plural(Math.floor(abs / DAY_MS), "day");
    if (abs < 30 * DAY_MS) return plural(Math.floor(abs / WEEK_MS), "week");
    if (abs < 365 * DAY_MS) return plural(Math.floor(abs / (30 * DAY_MS)), "month");
    return plural(Math.floor(abs / (365 * DAY_MS)), "year");
  })();

  if (phrase === "just now") return phrase;
  return past ? `${phrase} ago` : `in ${phrase}`;
}

/** Absolute calendar rendering, e.g. "12 Mar 2026", in the given timezone. */
export function formatDate(value: IsoTimestamp, timezone = "UTC"): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: timezone,
  }).format(parseIso(value));
}

/** True when a due date exists and has already passed. */
export function isOverdue(
  dueAt: IsoTimestamp | null,
  reference: Date = new Date(),
): boolean {
  if (dueAt === null) return false;
  return parseIso(dueAt).getTime() < reference.getTime();
}

export function addDays(value: IsoTimestamp, days: number): IsoTimestamp {
  return toIsoTimestamp(new Date(parseIso(value).getTime() + days * DAY_MS));
}

/**
 * The 24-hour window a digest covers, ending at today's `digestHourUtc`. If
 * that hour has not arrived yet on `reference`'s day, the window is the one
 * that ended yesterday — so a job run early never mails an empty digest and
 * then skips the real one.
 */
export function digestWindow(
  digestHourUtc: number,
  reference: Date,
): { start: IsoTimestamp; end: IsoTimestamp } {
  if (!Number.isInteger(digestHourUtc) || digestHourUtc < 0 || digestHourUtc > 23) {
    throw new RangeError(`digestHourUtc must be 0-23, got ${digestHourUtc}`);
  }

  const end = new Date(
    Date.UTC(
      reference.getUTCFullYear(),
      reference.getUTCMonth(),
      reference.getUTCDate(),
      digestHourUtc,
      0,
      0,
      0,
    ),
  );
  if (end.getTime() > reference.getTime()) {
    end.setUTCDate(end.getUTCDate() - 1);
  }

  return {
    start: toIsoTimestamp(new Date(end.getTime() - DAY_MS)),
    end: toIsoTimestamp(end),
  };
}
