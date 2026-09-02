"use client";

/**
 * One status column with a drop target.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): can
 */
import type { IssueId } from "@/types/common";
import type { IssueBoardColumn } from "@/types/issue";
import type { Actor } from "@/types/member";
import type { ReactElement } from "react";
export type KanbanColumnProps = { column: IssueBoardColumn; actor: Actor; onDrop: (issueId: IssueId, toIndex: number) => void };

export function KanbanColumn(props: KanbanColumnProps): ReactElement | null {
  return null;
}
