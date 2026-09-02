"use client";

/**
 * Filter chips writing back into the URL search params.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { IssueFilter } from "@/types/issue";
import type { MemberWithUser } from "@/types/member";
import type { Project } from "@/types/project";
import type { ReactElement } from "react";
export type IssueFilterBarProps = { filter: IssueFilter; projects: readonly Project[]; members: readonly MemberWithUser[]; onChange: (filter: IssueFilter) => void };

export function IssueFilterBar(props: IssueFilterBarProps): ReactElement | null {
  return null;
}
