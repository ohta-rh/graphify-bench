/**
 * Minimal in-process job queue: enqueue, drain, retry with backoff. Jobs never run inside a request.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { IsoTimestamp } from "@/types/common";
export function enqueue(job: QueuedJob): void {
  throw new Error("stub: src/server/jobs/queue.ts");
}

export async function drain(limit?: number): Promise<number> {
  throw new Error("stub: src/server/jobs/queue.ts");
}

export function pendingCount(): number {
  throw new Error("stub: src/server/jobs/queue.ts");
}

export function resetQueue(): void {
  throw new Error("stub: src/server/jobs/queue.ts");
}

export type QueuedJob = { id: string; kind: JobKind; runAt: IsoTimestamp; attempts: number; payload: Readonly<Record<string, unknown>> };

export type JobKind = 'digest-email' | 'overdue-issues' | 'webhook-delivery' | 'usage-rollup' | 'search-reindex' | 'cleanup-archived' | 'trial-expiry';
