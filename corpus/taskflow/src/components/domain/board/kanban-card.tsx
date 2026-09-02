"use client";

/**
 * Draggable card inside a column.
 */
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { isOverdue } from "@/lib/date";
import { humanizePriority } from "@/lib/format";
import type { Issue } from "@/types/issue";
import type { User } from "@/types/member";
import type { ReactElement } from "react";
import { PRIORITY_TONE } from "../issue/issue-tone";

export type KanbanCardProps = {
  issue: Issue;
  assignee: User | null;
  draggable: boolean;
};

/** The drag payload the column's drop handler reads back. */
export const KANBAN_DRAG_TYPE = "application/x-taskflow-issue";

export function KanbanCard(props: KanbanCardProps): ReactElement | null {
  const { issue, assignee, draggable } = props;

  return (
    <article
      draggable={draggable}
      data-issue-id={issue.id}
      onDragStart={(event) => {
        event.dataTransfer.setData(KANBAN_DRAG_TYPE, issue.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "kanban-card rounded border bg-white p-2 text-sm shadow-sm",
        draggable ? "cursor-grab" : "cursor-default",
        isOverdue(issue.dueAt) && "border-red-400",
      )}
    >
      <p className="text-xs text-neutral-500">#{issue.number}</p>
      <p className="font-medium">{issue.title}</p>

      <div className="mt-2 flex items-center justify-between">
        <Badge tone={PRIORITY_TONE[issue.priority]} size="sm">
          {humanizePriority(issue.priority)}
        </Badge>
        {assignee !== null ? (
          <Avatar name={assignee.name} src={assignee.avatarUrl} size="xs" />
        ) : null}
      </div>
    </article>
  );
}
