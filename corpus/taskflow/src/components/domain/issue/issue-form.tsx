"use client";

/**
 * Create/edit form bound to `createIssueSchema` through `zodResolver`.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): createIssueSchema
 */
import type { CreateIssueInput } from "@/schemas/issue";
import type { ActionResult } from "@/types/api";
import type { OrgId, ProjectId } from "@/types/common";
import type { Issue, IssueLabel } from "@/types/issue";
import type { MemberWithUser } from "@/types/member";
import type { ReactElement } from "react";
export type IssueFormProps = { orgId: OrgId; projectId: ProjectId; defaultValues?: Partial<CreateIssueInput>; members: readonly MemberWithUser[]; labels: readonly IssueLabel[]; onSubmit: (input: CreateIssueInput) => Promise<ActionResult<Issue>> };

export function IssueForm(props: IssueFormProps): ReactElement | null {
  return null;
}
