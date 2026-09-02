"use client";

/**
 * Drag-and-drop board; renders nothing unless the `kanban_board` flag is on.
 *
 * Must call (do not reimplement): isEnabled, can
 */
import { useState, useTransition } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { isEnabled } from "@/lib/feature-flags";
import { can } from "@/lib/permissions";
import type { MoveIssueInput } from "@/schemas/issue";
import type { ActionResult } from "@/types/api";
import type { IssueId } from "@/types/common";
import type { FeatureFlagSnapshot } from "@/types/feature-flag";
import type { Issue, IssueBoardColumn, IssueStatus } from "@/types/issue";
import type { Actor, User } from "@/types/member";
import type { ReactElement } from "react";
import { organizationResource } from "../permission/resources";
import { moveIssueInColumns, orderColumns } from "./board-model";
import { KanbanColumn } from "./kanban-column";

export type KanbanBoardProps = {
  columns: readonly IssueBoardColumn[];
  actor: Actor;
  flags: FeatureFlagSnapshot;
  onMove: (input: MoveIssueInput) => Promise<ActionResult<Issue>>;
  /** Assignee lookup passed straight through to the cards. */
  users?: Readonly<Record<string, User>>;
};

export function KanbanBoard(props: KanbanBoardProps): ReactElement | null {
  const { columns, actor, flags, onMove, users } = props;

  // The snapshot the layout serialised is the fast path; `isEnabled()` is the
  // fallback for a snapshot that predates the flag.
  const boardEnabled =
    flags.kanban_board === true ||
    isEnabled("kanban_board", {
      orgId: actor.orgId,
      userId: actor.userId,
      plan: "free",
      role: actor.role,
    });

  const [local, setLocal] = useState<readonly IssueBoardColumn[] | null>(null);
  const [pending, startTransition] = useTransition();

  if (!boardEnabled) return null;

  const mayMove = can(actor, "issue:update", organizationResource(actor.orgId));
  const rendered = orderColumns(local ?? columns);

  if (rendered.every((column) => column.issues.length === 0)) {
    return (
      <EmptyState
        title="This board is empty"
        description="Create an issue to see it here."
      />
    );
  }

  function handleDrop(
    toStatus: IssueStatus,
    issueId: IssueId,
    toIndex: number,
  ): void {
    if (!mayMove) return;
    // Land the card immediately, then let the action reconcile; on failure the
    // local override is dropped and the server columns win again.
    const optimistic = moveIssueInColumns(rendered, issueId, toStatus, toIndex);
    setLocal(optimistic);

    startTransition(async () => {
      const result = await onMove({
        orgId: actor.orgId,
        issueId,
        toStatus,
        toIndex,
      });
      if (!result.ok) setLocal(null);
    });
  }

  return (
    <div
      className="kanban-board flex gap-3 overflow-x-auto"
      aria-busy={pending}
    >
      {rendered.map((column) => (
        <KanbanColumn
          key={column.status}
          column={column}
          actor={actor}
          onDrop={(issueId, toIndex) =>
            handleDrop(column.status, issueId, toIndex)
          }
          {...(users !== undefined ? { users } : {})}
        />
      ))}
    </div>
  );
}
