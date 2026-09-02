/**
 * Append-only audit log. Never updated, never deleted before the plan's retention window.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { ActivityFilterInput } from "@/schemas/activity";
import type { ActivityEvent, ActivitySubjectKind } from "@/types/activity";
import type { IsoTimestamp, OrgId, Page } from "@/types/common";
export async function insertActivity(event: Omit<ActivityEvent, 'id'>): Promise<ActivityEvent> {
  throw new Error("stub: src/server/repositories/activity-repository.ts");
}

export async function listActivity(input: ActivityFilterInput): Promise<Page<ActivityEvent>> {
  throw new Error("stub: src/server/repositories/activity-repository.ts");
}

export async function listActivityForSubject(orgId: OrgId, subjectKind: ActivitySubjectKind, subjectId: string): Promise<readonly ActivityEvent[]> {
  throw new Error("stub: src/server/repositories/activity-repository.ts");
}

export async function purgeActivityBefore(orgId: OrgId, before: IsoTimestamp): Promise<number> {
  throw new Error("stub: src/server/repositories/activity-repository.ts");
}
