/**
 * Result envelope every job returns to the scheduler.
 */
import { toIsoTimestamp } from "@/types/common";
import type { IsoTimestamp } from "@/types/common";

export type JobResult = {
  kind: string;
  processed: number;
  failed: number;
  durationMs: number;
  startedAt: IsoTimestamp;
};

/** The zero value a job starts from and mutates as it works. */
export function emptyJobResult(
  kind: string,
  startedAt: IsoTimestamp,
): JobResult {
  return { kind, processed: 0, failed: 0, durationMs: 0, startedAt };
}

/**
 * Convenience for a job body: stamps the start, runs the work and fills in
 * `durationMs`. Kept here so every job reports the same shape.
 */
export async function runJob(
  kind: string,
  work: (result: JobResult) => Promise<void>,
): Promise<JobResult> {
  const startedAt = toIsoTimestamp(new Date());
  const began = Date.now();
  const result = emptyJobResult(kind, startedAt);

  await work(result);

  return { ...result, durationMs: Date.now() - began };
}
