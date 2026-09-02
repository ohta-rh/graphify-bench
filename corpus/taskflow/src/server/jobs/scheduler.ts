/**
 * Interval-based scheduler started from `src/instrumentation.ts`; decides which job kind is due.
 */
import { createLogger } from "@/lib/logger";
import { drain, enqueue, pendingCount } from "./queue";
import { toIsoTimestamp } from "@/types/common";
import type { JobKind } from "./queue";

/** How often `tick()` runs once the scheduler is started. */
const TICK_INTERVAL_MS = 60_000;

/** Minimum gap between two runs of the same job kind, in minutes. */
const CADENCE_MINUTES: Readonly<Record<JobKind, number>> = {
  "digest-email": 60,
  "overdue-issues": 60,
  "webhook-delivery": 1,
  "usage-rollup": 15,
  "search-reindex": 1_440,
  "cleanup-archived": 1_440,
  "trial-expiry": 360,
};

const logger = createLogger("job-scheduler");

let timer: ReturnType<typeof setInterval> | null = null;
const lastRunAt = new Map<JobKind, number>();

/**
 * Starts the interval. Idempotent, and `unref()`ed so a pending tick never
 * keeps a process alive — a scheduler that blocks shutdown is worse than one
 * that misses the last tick.
 */
export function startScheduler(): void {
  if (timer !== null) return;

  timer = setInterval(() => {
    void tick(new Date()).catch((error: unknown) => {
      logger.error("scheduler tick failed", {
        reason: error instanceof Error ? error.message : String(error),
      });
    });
  }, TICK_INTERVAL_MS);

  timer.unref?.();
  logger.info("scheduler started", { intervalMs: TICK_INTERVAL_MS });
}

export function stopScheduler(): void {
  if (timer === null) return;
  clearInterval(timer);
  timer = null;
  lastRunAt.clear();
}

export function isSchedulerRunning(): boolean {
  return timer !== null;
}

/**
 * One pass: enqueue whatever cadence says is due, then drain the queue. Split
 * out from the interval so tests can drive it with an explicit clock instead
 * of waiting a minute.
 */
export async function tick(now: Date): Promise<void> {
  for (const kind of Object.keys(CADENCE_MINUTES) as JobKind[]) {
    if (!isDue(kind, now)) continue;

    lastRunAt.set(kind, now.getTime());
    enqueue({
      id: `${kind}:${Math.floor(now.getTime() / 60_000)}`,
      kind,
      runAt: toIsoTimestamp(now),
      attempts: 0,
      payload: {},
    });
  }

  const completed = await drain();
  if (completed > 0 || pendingCount() > 0) {
    logger.debug("tick complete", { completed, pending: pendingCount() });
  }
}

function isDue(kind: JobKind, now: Date): boolean {
  const previous = lastRunAt.get(kind);
  if (previous === undefined) return true;
  return now.getTime() - previous >= CADENCE_MINUTES[kind] * 60_000;
}
