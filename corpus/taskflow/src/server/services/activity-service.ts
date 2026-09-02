/**
 * Audit-log writer and reader. Subscribes to the whole event bus and records one row per domain event.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): assertCan, assertOrgScope, subscribe, isEnabled, toCsv
 */
import type { ActivityFilterInput, ExportActivityInput } from "@/schemas/activity";
import type { ActivityAction, ActivityEvent, ActivityGroup, ActivitySubjectKind } from "@/types/activity";
import type { OrgId, Page, ProjectId, UserId } from "@/types/common";
import type { Unsubscribe } from "@/types/event";
import type { Actor } from "@/types/member";
export async function record(orgId: OrgId, action: ActivityAction, input: ActivityRecordInput): Promise<ActivityEvent> {
  throw new Error("stub: src/server/services/activity-service.ts");
}

export async function listActivity(actor: Actor, input: ActivityFilterInput): Promise<Page<ActivityEvent>> {
  throw new Error("stub: src/server/services/activity-service.ts");
}

export function groupByDay(events: readonly ActivityEvent[]): readonly ActivityGroup[] {
  throw new Error("stub: src/server/services/activity-service.ts");
}

export async function exportActivity(actor: Actor, input: ExportActivityInput): Promise<string> {
  throw new Error("stub: src/server/services/activity-service.ts");
}

export function registerActivityListeners(): Unsubscribe {
  throw new Error("stub: src/server/services/activity-service.ts");
}

export type ActivityRecordInput = { actorId: UserId | null; subjectKind: ActivitySubjectKind; subjectId: string; projectId: ProjectId | null; summary: string; metadata?: Readonly<Record<string, string | number | boolean | null>> };
