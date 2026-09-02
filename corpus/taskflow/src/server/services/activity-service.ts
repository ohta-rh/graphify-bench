/**
 * Audit-log writer and reader. Subscribes to the whole event bus and records one row per domain event.
 *
 * Must call (do not reimplement): assertCan, assertOrgScope, subscribe, isEnabled, toCsv
 */
import { toCsv } from "@/lib/csv";
import { subscribe } from "@/lib/event-bus";
import { isEnabled } from "@/lib/feature-flags";
import { assertCan } from "@/lib/permissions";
import { assertOrgScope } from "@/lib/tenant";
import * as activityRepo from "@/server/repositories/activity-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import { toIsoTimestamp } from "@/types/common";
import { activityResource } from "./_support";
import type { ActivityFilterInput, ExportActivityInput } from "@/schemas/activity";
import type {
  ActivityAction,
  ActivityEvent,
  ActivityGroup,
  ActivitySubjectKind,
} from "@/types/activity";
import type { OrgId, Page, ProjectId, UserId } from "@/types/common";
import type { Unsubscribe } from "@/types/event";
import type { Actor } from "@/types/member";

export type ActivityRecordInput = {
  actorId: UserId | null;
  subjectKind: ActivitySubjectKind;
  subjectId: string;
  projectId: ProjectId | null;
  summary: string;
  metadata?: Readonly<Record<string, string | number | boolean | null>>;
};

/** Columns of the audit-log CSV export, in the order the file lists them. */
const EXPORT_COLUMNS = [
  "occurredAt",
  "action",
  "actorId",
  "subjectKind",
  "subjectId",
  "summary",
] as const;

/**
 * Appends one audit row. Deliberately takes no `Actor`: the writer is usually
 * an event handler running outside a request, and the row's `actorId` comes
 * from the event payload rather than from an authenticated principal.
 */
export async function record(
  orgId: OrgId,
  action: ActivityAction,
  input: ActivityRecordInput,
): Promise<ActivityEvent> {
  return activityRepo.insertActivity({
    orgId,
    action,
    actorId: input.actorId,
    subjectKind: input.subjectKind,
    subjectId: input.subjectId,
    projectId: input.projectId,
    summary: input.summary,
    metadata: input.metadata ?? {},
    occurredAt: toIsoTimestamp(new Date()),
  });
}

export async function listActivity(
  actor: Actor,
  input: ActivityFilterInput,
): Promise<Page<ActivityEvent>> {
  assertOrgScope(actor, input.orgId);
  assertCan(actor, "activity:read", activityResource(input.orgId));
  return activityRepo.listActivity(input);
}

/** Groups a feed page by calendar day, newest day first. */
export function groupByDay(
  events: readonly ActivityEvent[],
): readonly ActivityGroup[] {
  const byDay = new Map<string, ActivityEvent[]>();

  for (const event of events) {
    const day = event.occurredAt.slice(0, 10);
    const bucket = byDay.get(day) ?? [];
    bucket.push(event);
    byDay.set(day, bucket);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([day, dayEvents]) => ({ day, events: dayEvents }));
}

/**
 * CSV (or JSON) export of the audit log. Gated twice: on `activity:export`
 * for the role, and on the `csv_export` flag for the plan.
 */
export async function exportActivity(
  actor: Actor,
  input: ExportActivityInput,
): Promise<string> {
  assertOrgScope(actor, input.orgId);
  assertCan(actor, "activity:export", activityResource(input.orgId));

  const org = await orgRepo.findOrgById(input.orgId);
  const flagEnabled = isEnabled("csv_export", {
    orgId: input.orgId,
    userId: actor.userId,
    plan: org?.plan ?? "free",
    role: actor.role,
    overrides: org?.settings.enabledFlagOverrides,
  });

  if (input.format === "csv" && !flagEnabled) {
    throw new Error("CSV export is not included in this plan");
  }

  const page = await activityRepo.listActivity({
    orgId: input.orgId,
    since: input.since,
    until: input.until,
    limit: 100,
    cursor: null,
  });

  if (input.format === "json") {
    return JSON.stringify(page.items, null, 2);
  }

  return toCsv(
    page.items.map((event) => ({
      occurredAt: event.occurredAt,
      action: event.action,
      actorId: event.actorId,
      subjectKind: event.subjectKind,
      subjectId: event.subjectId,
      summary: event.summary,
    })),
    [...EXPORT_COLUMNS],
  );
}

/**
 * Attaches one handler per audited event type. Called once from
 * `event-registry`; the returned function detaches all of them, which is what
 * the test suite uses to keep the bus clean between cases.
 */
export function registerActivityListeners(): Unsubscribe {
  const offs: Unsubscribe[] = [
    subscribe("project.created", (payload) =>
      record(payload.orgId, "project.created", {
        actorId: payload.actorId,
        subjectKind: "project",
        subjectId: payload.projectId,
        projectId: payload.projectId,
        summary: `Created project ${payload.name}`,
      }).then(() => undefined),
    ),
    subscribe("project.archived", (payload) =>
      record(payload.orgId, "project.archived", {
        actorId: payload.actorId,
        subjectKind: "project",
        subjectId: payload.projectId,
        projectId: payload.projectId,
        summary: `Archived project with ${payload.issuesArchived} issues`,
      }).then(() => undefined),
    ),
    subscribe("issue.created", (payload) =>
      record(payload.orgId, "issue.created", {
        actorId: payload.actorId,
        subjectKind: "issue",
        subjectId: payload.issueId,
        projectId: payload.projectId,
        summary: `Created issue "${payload.title}"`,
        metadata: { priority: payload.priority },
      }).then(() => undefined),
    ),
    subscribe("issue.status_changed", (payload) =>
      record(payload.orgId, "issue.status_changed", {
        actorId: payload.actorId,
        subjectKind: "issue",
        subjectId: payload.issueId,
        projectId: payload.projectId,
        summary: `Status ${payload.from} → ${payload.to}`,
        metadata: { from: payload.from, to: payload.to },
      }).then(() => undefined),
    ),
    subscribe("issue.assigned", (payload) =>
      record(payload.orgId, "issue.assigned", {
        actorId: payload.actorId,
        subjectKind: "issue",
        subjectId: payload.issueId,
        projectId: payload.projectId,
        summary: `Assigned to ${payload.assigneeId}`,
      }).then(() => undefined),
    ),
    subscribe("comment.created", (payload) =>
      record(payload.orgId, "comment.created", {
        actorId: payload.actorId,
        subjectKind: "comment",
        subjectId: payload.commentId,
        projectId: null,
        summary: `Commented on issue ${payload.issueId}`,
      }).then(() => undefined),
    ),
    subscribe("member.invited", (payload) =>
      record(payload.orgId, "member.invited", {
        actorId: payload.actorId,
        subjectKind: "member",
        subjectId: payload.email,
        projectId: null,
        summary: `Invited ${payload.email} as ${payload.role}`,
      }).then(() => undefined),
    ),
    subscribe("member.role_changed", (payload) =>
      record(payload.orgId, "member.role_changed", {
        actorId: payload.actorId,
        subjectKind: "member",
        subjectId: payload.memberId,
        projectId: null,
        summary: `Role ${payload.from} → ${payload.to}`,
      }).then(() => undefined),
    ),
    subscribe("billing.plan_changed", (payload) =>
      record(payload.orgId, "billing.plan_changed", {
        actorId: payload.actorId,
        subjectKind: "subscription",
        subjectId: payload.orgId,
        projectId: null,
        summary: `Plan ${payload.from} → ${payload.to}`,
      }).then(() => undefined),
    ),
  ];

  return () => {
    for (const off of offs) off();
  };
}
