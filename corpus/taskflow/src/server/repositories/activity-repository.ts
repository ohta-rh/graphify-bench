/**
 * Append-only audit log. Never updated, never deleted before the plan's retention window.
 */
import { and, count, desc, eq, gte, inArray, lt, lte } from "drizzle-orm";
import { newId } from "@/lib/id";
import { activityEvents, getDb } from "@/server/db";
import { orgPredicate } from "./base-repository";
import { compact, keysetPredicate, probeLimit, toPage } from "./_paging";
import { toActivityEvent } from "./_mappers";
import type { ActivityFilterInput } from "@/schemas/activity";
import type { ActivityEvent, ActivitySubjectKind } from "@/types/activity";
import type { IsoTimestamp, OrgId, Page } from "@/types/common";

export async function insertActivity(
  event: Omit<ActivityEvent, "id">,
): Promise<ActivityEvent> {
  const row = getDb()
    .insert(activityEvents)
    .values({
      id: newId(),
      orgId: event.orgId,
      action: event.action,
      actorId: event.actorId,
      subjectKind: event.subjectKind,
      subjectId: event.subjectId,
      projectId: event.projectId,
      summary: event.summary,
      metadata: JSON.stringify(event.metadata),
      occurredAt: event.occurredAt,
    })
    .returning()
    .get();

  return toActivityEvent(row);
}

export async function listActivity(
  input: ActivityFilterInput,
): Promise<Page<ActivityEvent>> {
  const db = getDb();
  const sort = {
    sortColumn: activityEvents.occurredAt,
    idColumn: activityEvents.id,
  };

  const filters = compact(
    orgPredicate(activityEvents.orgId, input.orgId),
    input.action === undefined || input.action.length === 0
      ? undefined
      : inArray(activityEvents.action, [...input.action]),
    input.actorId === undefined
      ? undefined
      : eq(activityEvents.actorId, input.actorId),
    input.projectId === undefined
      ? undefined
      : eq(activityEvents.projectId, input.projectId),
    input.subjectKind === undefined
      ? undefined
      : eq(activityEvents.subjectKind, input.subjectKind),
    input.since === undefined
      ? undefined
      : gte(activityEvents.occurredAt, input.since),
    input.until === undefined
      ? undefined
      : lte(activityEvents.occurredAt, input.until),
  );

  const total = db
    .select({ value: count() })
    .from(activityEvents)
    .where(and(...filters))
    .get();

  const rows = db
    .select()
    .from(activityEvents)
    .where(and(...filters, ...compact(keysetPredicate(sort, input.cursor))))
    .orderBy(desc(activityEvents.occurredAt), desc(activityEvents.id))
    .limit(probeLimit(input.limit))
    .all();

  return toPage(
    rows,
    input.limit,
    total?.value ?? 0,
    toActivityEvent,
    (row) => ({ id: row.id, sortValue: row.occurredAt }),
  );
}

/** The "history" tab of one issue, project or member. */
export async function listActivityForSubject(
  orgId: OrgId,
  subjectKind: ActivitySubjectKind,
  subjectId: string,
): Promise<readonly ActivityEvent[]> {
  const rows = getDb()
    .select()
    .from(activityEvents)
    .where(
      and(
        orgPredicate(activityEvents.orgId, orgId),
        eq(activityEvents.subjectKind, subjectKind),
        eq(activityEvents.subjectId, subjectId),
      ),
    )
    .orderBy(desc(activityEvents.occurredAt))
    .all();

  return rows.map(toActivityEvent);
}

/**
 * The only sanctioned deletion path: the retention sweep. `before` comes from
 * the plan's `retentionDays`, never from a user-supplied date.
 */
export async function purgeActivityBefore(
  orgId: OrgId,
  before: IsoTimestamp,
): Promise<number> {
  const rows = getDb()
    .delete(activityEvents)
    .where(
      and(
        orgPredicate(activityEvents.orgId, orgId),
        lt(activityEvents.occurredAt, before),
      ),
    )
    .returning({ id: activityEvents.id })
    .all();

  return rows.length;
}
