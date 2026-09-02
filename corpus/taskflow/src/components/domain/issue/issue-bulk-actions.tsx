"use client";

/**
 * Bulk toolbar shown when rows are selected; permission gated.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): can
 */
import type { IssueId, UserId } from "@/types/common";
import type { Actor } from "@/types/member";
import type { ReactElement } from "react";
export type IssueBulkActionsProps = { selected: readonly IssueId[]; actor: Actor; onArchive: () => void; onAssign: (userId: UserId) => void };

export function IssueBulkActions(props: IssueBulkActionsProps): ReactElement | null {
  return null;
}
