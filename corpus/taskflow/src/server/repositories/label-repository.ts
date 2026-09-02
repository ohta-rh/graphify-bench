/**
 * Label rows and the issue↔label join table.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { CreateLabelInput, UpdateLabelInput } from "@/schemas/label";
import type { IssueId, LabelId, OrgId } from "@/types/common";
import type { IssueLabel } from "@/types/issue";
export async function listLabels(orgId: OrgId): Promise<readonly IssueLabel[]> {
  throw new Error("stub: src/server/repositories/label-repository.ts");
}

export async function insertLabel(input: CreateLabelInput): Promise<IssueLabel> {
  throw new Error("stub: src/server/repositories/label-repository.ts");
}

export async function updateLabel(input: UpdateLabelInput): Promise<IssueLabel> {
  throw new Error("stub: src/server/repositories/label-repository.ts");
}

export async function deleteLabel(orgId: OrgId, labelId: LabelId): Promise<void> {
  throw new Error("stub: src/server/repositories/label-repository.ts");
}

export async function setIssueLabels(orgId: OrgId, issueId: IssueId, labelIds: readonly LabelId[]): Promise<void> {
  throw new Error("stub: src/server/repositories/label-repository.ts");
}

export async function listLabelsForIssues(orgId: OrgId, issueIds: readonly IssueId[]): Promise<Readonly<Record<string, readonly IssueLabel[]>>> {
  throw new Error("stub: src/server/repositories/label-repository.ts");
}
