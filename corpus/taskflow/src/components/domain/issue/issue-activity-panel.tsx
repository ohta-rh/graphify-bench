/**
 * Per-issue slice of the audit trail.
 */
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelative } from "@/lib/date";
import type { ActivityEvent } from "@/types/activity";
import type { User } from "@/types/member";
import type { ReactElement } from "react";
import { activityLabel, groupEventsByDay } from "../activity/activity-labels";

export type IssueActivityPanelProps = {
  events: readonly ActivityEvent[];
  actors: Readonly<Record<string, User>>;
};

export function IssueActivityPanel(
  props: IssueActivityPanelProps,
): ReactElement | null {
  const { events, actors } = props;

  if (events.length === 0) {
    return <EmptyState title="Nothing has happened here yet" />;
  }

  const groups = groupEventsByDay(events);

  return (
    <section className="issue-activity space-y-4">
      {groups.map((group) => (
        <div key={group.day}>
          <h3 className="mb-2 text-xs font-medium uppercase text-neutral-500">
            {group.day}
          </h3>
          <ol className="space-y-2">
            {group.events.map((event) => {
              const actor = event.actorId === null ? null : actors[event.actorId];
              return (
                <li key={event.id} className="flex items-start gap-2 text-sm">
                  {actor !== null && actor !== undefined ? (
                    <Avatar name={actor.name} src={actor.avatarUrl} size="xs" />
                  ) : null}
                  <span>
                    <strong>{actor?.name ?? "Taskflow"}</strong>{" "}
                    {activityLabel(event.action)}
                    {" · "}
                    <span className="text-neutral-500">
                      {formatRelative(event.occurredAt)}
                    </span>
                    <span className="block text-neutral-600">
                      {event.summary}
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
