"use client";

/**
 * Priority dropdown driven by `ISSUE_PRIORITIES`.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { IssuePriority } from "@/types/issue";
import type { ReactElement } from "react";
export type IssuePrioritySelectProps = { value: IssuePriority; disabled?: boolean; onChange: (priority: IssuePriority) => void };

export function IssuePrioritySelect(props: IssuePrioritySelectProps): ReactElement | null {
  return null;
}
