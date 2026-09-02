"use client";

/**
 * Status dropdown driven by `ISSUE_STATUSES`.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { IssueStatus } from "@/types/issue";
import type { ReactElement } from "react";
export type IssueStatusSelectProps = { value: IssueStatus; disabled?: boolean; onChange: (status: IssueStatus) => void };

export function IssueStatusSelect(props: IssueStatusSelectProps): ReactElement | null {
  return null;
}
