"use client";

/**
 * One status column with a drop target.
 *
 * Must call (do not reimplement): can
 */
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { humanizeStatus } from "@/lib/format";
import { can } from "@/lib/permissions";
import type { IssueId } from "@/types/common";
import type { IssueBoardColumn } from "@/types/issue";
import type { Actor, User } from "@/types/member";
import type { ReactElement } from "react";
import { issueResource } from "../permission/resources";
import { STATUS_TONE } from "../issue/issue-tone";
import { KANBAN_DRAG_TYPE, KanbanCard } from "./kanban-card";

export type KanbanColumnProps = {
  column: IssueBoardColumn;
  actor: Actor;
  onDrop: (issueId: IssueId, toIndex: number) => void;
  /** Assignee lookup so cards do not each re-join the member list. */
  users?: Readonly<Record<string, User>>;
};

export function KanbanColumn(props: KanbanColumnProps): ReactElement | null {
  const { column, actor, onDrop, users = {} } = props;

  return (
    <section
      className={cn(
        "kanban-column flex w-64 shrink-0 flex-col gap-2 rounded bg-neutral-50 p-2",
      )}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const issueId = event.dataTransfer.getData(KANBAN_DRAG_TYPE);
        if (issueId.length === 0) return;
        onDrop(issueId as IssueId, column.issues.length);
      }}
    >
      <header className="flex items-center justify-between">
        <Badge tone={STATUS_TONE[column.status]} size="sm">
          {humanizeStatus(column.status)}
        </Badge>
        <span className="text-xs text-neutral-500">{column.total}</span>
      </header>

      {column.issues.map((issue) => (
        <KanbanCard
          key={issue.id}
          issue={issue}
          assignee={
            issue.assigneeId === null ? null : users[issue.assigneeId] ?? null
          }
          // Dragging is a status change: only actors who may update this
          // particular issue get a grab cursor.
          draggable={can(actor, "issue:update", issueResource(issue))}
        />
      ))}

      {column.issues.length === 0 ? (
        <p className="px-1 py-4 text-center text-xs text-neutral-400">
          Nothing here
        </p>
      ) : null}
    </section>
  );
}
