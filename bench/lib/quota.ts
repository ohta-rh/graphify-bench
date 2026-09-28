import fs from "node:fs";
import path from "node:path";

/**
 * Runs that never reached the model are not measurements.
 *
 * `claude -p` reports an account quota ("You've hit your session limit · resets
 * 5:40pm (Asia/Tokyo)") and other transport failures as `is_error: true` with
 * `terminal_reason: "api_error"` — and `subtype: "success"`, so a check on the
 * subtype alone counts them as finished runs. On 2026-09-28 that silently
 * turned 168 of 192 extreme-set runs into zero-cost "results". A run like that
 * must be retried, never graded. `error_max_turns` is different: the agent did
 * real work until the cap, and that outcome is kept.
 */
export interface ApiFailure {
  /** True when the account's usage window is exhausted (retrying before the reset is pointless). */
  quota: boolean;
  message: string;
}

export function apiFailure(result: unknown): ApiFailure | null {
  if (!result || typeof result !== "object") return null;
  const r = result as { is_error?: unknown; terminal_reason?: unknown; result?: unknown };
  if (r.is_error !== true || r.terminal_reason !== "api_error") return null;
  const message = typeof r.result === "string" ? r.result : "";
  return { quota: /hit your (session|usage|weekly|daily) limit|usage limit/i.test(message), message };
}

/** The `api_error` verdict for a finished run directory, read from its result.json. */
export function runApiFailure(dir: string): ApiFailure | null {
  try {
    return apiFailure(JSON.parse(fs.readFileSync(path.join(dir, "result.json"), "utf8")));
  } catch {
    return null;
  }
}

/** Milliseconds from `now` until `h:mm am/pm` next occurs on the wall clock of `timeZone`. */
function untilWallClock(hour12: number, minute: number, meridiem: string, timeZone: string, now: Date): number | null {
  let hour = hour12 % 12;
  if (meridiem.toLowerCase() === "pm") hour += 12;
  let parts: Record<string, string>;
  try {
    parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
        .formatToParts(now)
        .map((p) => [p.type, p.value]),
    );
  } catch {
    return null; // unknown time zone
  }
  const nowInZone = Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second);
  let delta = hour * 3600 + minute * 60 - nowInZone;
  if (delta <= 0) delta += 24 * 3600;
  return delta * 1000;
}

/**
 * How long to wait before retrying after an API failure.
 *
 * A quota message names its reset ("resets 5:40pm (Asia/Tokyo)"); wait until then
 * plus a minute. Anything unparseable, and non-quota API errors, wait `fallbackMs`.
 */
export function retryDelayMs(failure: ApiFailure, now = new Date(), fallbackMs = 10 * 60_000): number {
  if (!failure.quota) return fallbackMs;
  const m = failure.message.match(/resets\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*\(([^)]+)\)/i);
  if (!m) return fallbackMs;
  const until = untilWallClock(Number(m[1]), Number(m[2] ?? 0), m[3]!, m[4]!, now);
  return until === null ? fallbackMs : until + 60_000;
}
