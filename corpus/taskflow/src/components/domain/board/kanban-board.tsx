"use client";

/**
 * Drag-and-drop board; renders nothing unless the `kanban_board` flag is on.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): isEnabled, can
 */
import type { MoveIssueInput } from "@/schemas/issue";
import type { ActionResult } from "@/types/api";
import type { FeatureFlagSnapshot } from "@/types/feature-flag";
import type { Issue, IssueBoardColumn } from "@/types/issue";
import type { Actor } from "@/types/member";
import type { ReactElement } from "react";
export type KanbanBoardProps = { columns: readonly IssueBoardColumn[]; actor: Actor; flags: FeatureFlagSnapshot; onMove: (input: MoveIssueInput) => Promise<ActionResult<Issue>> };

export function KanbanBoard(props: KanbanBoardProps): ReactElement | null {
  return null;
}
