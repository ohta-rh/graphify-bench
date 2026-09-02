"use client";

/**
 * Draggable card inside a column.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { Issue } from "@/types/issue";
import type { User } from "@/types/member";
import type { ReactElement } from "react";
export type KanbanCardProps = { issue: Issue; assignee: User | null; draggable: boolean };

export function KanbanCard(props: KanbanCardProps): ReactElement | null {
  return null;
}
