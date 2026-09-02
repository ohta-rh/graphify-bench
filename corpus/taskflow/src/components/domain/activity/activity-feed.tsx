/**
 * Grouped audit trail; the export button needs `activity:export`.
 *
 * Must call (do not reimplement): can, isEnabled
 */
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelative } from "@/lib/date";
import { isEnabled } from "@/lib/feature-flags";
import { can } from "@/lib/permissions";
import type { ActivityGroup } from "@/types/activity";
import type { PlanId } from "@/types/billing";
import type { Actor, User } from "@/types/member";
import type { ReactElement } from "react";
import { activityResource } from "../permission/resources";
import { activityLabel } from "./activity-labels";

export type ActivityFeedProps = {
  groups: readonly ActivityGroup[];
  actors: Readonly<Record<string, User>>;
  actor: Actor;
  /** The org's plan, so the CSV flag can be evaluated for this tenant. */
  plan?: PlanId;
};

export function ActivityFeed(props: ActivityFeedProps): ReactElement | null {
  const { groups, actors, actor, plan = "free" } = props;
  const resource = activityResource(actor.orgId);

  if (!can(actor, "activity:read", resource)) {
    return (
      <EmptyState
        title="Activity is not visible to your role"
        description="Ask an administrator if you need the audit trail."
      />
    );
  }

  // Two independent gates: the plan must include CSV export, and the actor
  // must hold `activity:export` (admin and above).
  const exportEnabled =
    isEnabled("csv_export", {
      orgId: actor.orgId,
      userId: actor.userId,
      plan,
      role: actor.role,
    }) && can(actor, "activity:export", resource);

  if (groups.length === 0) {
    return <EmptyState title="No activity recorded in this window" />;
  }

  return (
    <section className="activity-feed space-y-6">
      {exportEnabled ? (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm">
            Export CSV
          </Button>
        </div>
      ) : null}

      {groups.map((group) => (
        <div key={group.day}>
          <h2 className="mb-2 text-sm font-medium text-neutral-500">
            {group.day}
          </h2>
          <ol className="space-y-2 border-l pl-4">
            {group.events.map((event) => {
              const author =
                event.actorId === null ? undefined : actors[event.actorId];
              return (
                <li key={event.id} className="flex items-start gap-2 text-sm">
                  {author !== undefined ? (
                    <Avatar
                      name={author.name}
                      src={author.avatarUrl}
                      size="xs"
                    />
                  ) : null}
                  <span>
                    <strong>{author?.name ?? "Taskflow"}</strong>{" "}
                    {activityLabel(event.action)} — {event.summary}
                    <span className="ml-2 text-neutral-500">
                      {formatRelative(event.occurredAt)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </section>
  );
}
