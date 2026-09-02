/**
 * Label CRUD and the issue↔label assignment used by the picker.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): assertCan, assertOrgScope
 */
import type { CreateLabelInput, UpdateLabelInput } from "@/schemas/label";
import type { LabelId, OrgId } from "@/types/common";
import type { IssueLabel } from "@/types/issue";
import type { Actor } from "@/types/member";
export async function listLabels(actor: Actor, orgId: OrgId): Promise<readonly IssueLabel[]> {
  throw new Error("stub: src/server/services/label-service.ts");
}

export async function createLabel(actor: Actor, input: CreateLabelInput): Promise<IssueLabel> {
  throw new Error("stub: src/server/services/label-service.ts");
}

export async function updateLabel(actor: Actor, input: UpdateLabelInput): Promise<IssueLabel> {
  throw new Error("stub: src/server/services/label-service.ts");
}

export async function deleteLabel(actor: Actor, orgId: OrgId, labelId: LabelId): Promise<void> {
  throw new Error("stub: src/server/services/label-service.ts");
}
