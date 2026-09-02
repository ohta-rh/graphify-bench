/**
 * Minimal in-process job queue: enqueue, drain, retry with backoff. Jobs never run inside a request.
 */
import { createLogger } from "@/lib/logger";
import { toIsoTimestamp } from "@/types/common";
import type { IsoTimestamp } from "@/types/common";

export type QueuedJob = {
  id: string;
  kind: JobKind;
  runAt: IsoTimestamp;
  attempts: number;
  payload: Readonly<Record<string, unknown>>;
};

export type JobKind =
  | "digest-email"
  | "overdue-issues"
  | "webhook-delivery"
  | "usage-rollup"
  | "search-reindex"
  | "cleanup-archived"
  | "trial-expiry";

/** Attempts after which a job is dropped rather than retried again. */
const MAX_ATTEMPTS = 5;

/** How many jobs `drain()` takes in one pass when no limit is given. */
const DEFAULT_DRAIN = 25;

const logger = createLogger("job-queue");

/**
 * The queue lives in module scope: Taskflow runs one server process and the
 * scheduler is started from `instrumentation.ts`, so there is no second
 * consumer to coordinate with. Swapping this for a real broker means
 * reimplementing these four functions and nothing else.
 */
const pending: QueuedJob[] = [];

/** Idempotent on `id`: re-enqueuing a job keeps the earlier `runAt`. */
export function enqueue(job: QueuedJob): void {
  if (pending.some((queued) => queued.id === job.id)) return;
  pending.push(job);
}

/**
 * Runs everything that is due, oldest first. A handler that throws is put back
 * with an exponential delay until `MAX_ATTEMPTS`, then dropped with a log line
 * — an infinitely retrying job is worse than a lost one.
 */
export async function drain(limit: number = DEFAULT_DRAIN): Promise<number> {
  const now = new Date().toISOString();
  const due = pending
    .filter((job) => job.runAt <= now)
    .sort((a, b) => (a.runAt < b.runAt ? -1 : 1))
    .slice(0, Math.max(0, limit));

  let completed = 0;

  for (const job of due) {
    remove(job.id);

    try {
      await runHandler(job);
      completed += 1;
    } catch (error) {
      const attempts = job.attempts + 1;

      if (attempts >= MAX_ATTEMPTS) {
        logger.error("job dropped after max attempts", {
          id: job.id,
          kind: job.kind,
          attempts,
        });
        continue;
      }

      pending.push({
        ...job,
        attempts,
        runAt: toIsoTimestamp(new Date(Date.now() + backoffMs(attempts))),
      });

      logger.warn("job retry scheduled", {
        id: job.id,
        kind: job.kind,
        attempts,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return completed;
}

export function pendingCount(): number {
  return pending.length;
}

/** Test hook: empties the queue. Never call this from application code. */
export function resetQueue(): void {
  pending.length = 0;
}

/** 1s, 2s, 4s, 8s … capped at one minute. */
function backoffMs(attempts: number): number {
  return Math.min(60_000, 2 ** (attempts - 1) * 1_000);
}

function remove(id: string): void {
  const at = pending.findIndex((job) => job.id === id);
  if (at >= 0) pending.splice(at, 1);
}

/**
 * Dispatches one queued job to its runner. The imports are dynamic so the
 * queue module stays free of a cycle: every job module imports this one to
 * enqueue follow-up work.
 */
async function runHandler(job: QueuedJob): Promise<void> {
  const now = new Date();

  switch (job.kind) {
    case "digest-email": {
      const { runDigestEmailJob } = await import("./digest-email-job");
      await runDigestEmailJob(now);
      return;
    }
    case "overdue-issues": {
      const { runOverdueIssueJob } = await import("./overdue-issue-job");
      await runOverdueIssueJob(now);
      return;
    }
    case "webhook-delivery": {
      const { runWebhookDeliveryJob } = await import("./webhook-delivery-job");
      await runWebhookDeliveryJob(now);
      return;
    }
    case "usage-rollup": {
      const { runUsageRollupJob } = await import("./usage-rollup-job");
      await runUsageRollupJob(now);
      return;
    }
    case "search-reindex": {
      const { runSearchReindexJob } = await import("./search-reindex-job");
      const orgId = job.payload.orgId;
      if (typeof orgId !== "string") return;
      await runSearchReindexJob(orgId as Parameters<typeof runSearchReindexJob>[0]);
      return;
    }
    case "cleanup-archived": {
      const { runCleanupArchivedJob } = await import("./cleanup-archived-job");
      await runCleanupArchivedJob(now);
      return;
    }
    case "trial-expiry": {
      const { runTrialExpiryJob } = await import("./trial-expiry-job");
      await runTrialExpiryJob(now);
      return;
    }
  }
}
