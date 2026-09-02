/**
 * Builds and 'sends' the daily digest for every subscriber of every org whose digest hour has arrived.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): isEnabled, buildDigest, sendEmail
 */
import type { JobResult } from "@/server/jobs/types";
import type { Organization } from "@/types/organization";
export async function runDigestEmailJob(now: Date): Promise<JobResult> {
  throw new Error("stub: src/server/jobs/digest-email-job.ts");
}

export function shouldRunForOrg(org: Organization, now: Date): boolean {
  throw new Error("stub: src/server/jobs/digest-email-job.ts");
}
