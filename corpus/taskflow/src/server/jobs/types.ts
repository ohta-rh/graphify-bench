/**
 * Result envelope every job returns to the scheduler.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { IsoTimestamp } from "@/types/common";
export type JobResult = { kind: string; processed: number; failed: number; durationMs: number; startedAt: IsoTimestamp };

export function emptyJobResult(kind: string, startedAt: IsoTimestamp): JobResult {
  throw new Error("stub: src/server/jobs/types.ts");
}
