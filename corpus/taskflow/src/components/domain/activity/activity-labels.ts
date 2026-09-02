/**
 * Presentation helpers for the audit trail.
 *
 * `ActivityEvent.summary` is written by the service layer and is authoritative;
 * these helpers only supply the verb chip and the day grouping the feed and the
 * per-issue panel both render, so the two views never disagree about what a
 * day boundary is.
 */
import type { ActivityAction, ActivityEvent, ActivityGroup } from "@/types/activity";

export const ACTIVITY_LABELS: Readonly<Record<ActivityAction, string>> = {
  "organization.updated": "updated the organization",
  "project.created": "created a project",
  "project.updated": "updated a project",
  "project.archived": "archived a project",
  "project.restored": "restored a project",
  "issue.created": "created an issue",
  "issue.updated": "updated an issue",
  "issue.status_changed": "changed status",
  "issue.assigned": "assigned an issue",
  "issue.archived": "archived an issue",
  "issue.restored": "restored an issue",
  "comment.created": "commented",
  "comment.updated": "edited a comment",
  "comment.deleted": "deleted a comment",
  "member.invited": "invited a member",
  "member.joined": "joined the organization",
  "member.role_changed": "changed a role",
  "member.removed": "removed a member",
  "billing.plan_changed": "changed the plan",
  "flag.toggled": "toggled a feature flag",
};

export function activityLabel(action: ActivityAction): string {
  return ACTIVITY_LABELS[action] ?? action;
}

/** The calendar day an event belongs to, in UTC (`YYYY-MM-DD`). */
export function activityDay(event: ActivityEvent): string {
  return event.occurredAt.slice(0, 10);
}

/**
 * Groups a flat event list into the day buckets `ActivityFeed` consumes,
 * newest day first and newest event first within a day.
 */
export function groupEventsByDay(
  events: readonly ActivityEvent[],
): readonly ActivityGroup[] {
  const byDay = new Map<string, ActivityEvent[]>();

  for (const event of events) {
    const day = activityDay(event);
    const bucket = byDay.get(day) ?? [];
    bucket.push(event);
    byDay.set(day, bucket);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, bucket]) => ({
      day,
      events: [...bucket].sort((a, b) =>
        b.occurredAt.localeCompare(a.occurredAt),
      ),
    }));
}
