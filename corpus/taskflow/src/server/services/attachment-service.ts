/**
 * Attachment metadata plus the storage quota guard.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): assertCan, assertOrgScope, wouldExceedLimit
 */
import type { CreateAttachmentInput, DeleteAttachmentInput } from "@/schemas/attachment";
import type { IssueId, OrgId } from "@/types/common";
import type { IssueAttachment } from "@/types/issue";
import type { Actor } from "@/types/member";
export async function listAttachments(actor: Actor, orgId: OrgId, issueId: IssueId): Promise<readonly IssueAttachment[]> {
  throw new Error("stub: src/server/services/attachment-service.ts");
}

export async function addAttachment(actor: Actor, input: CreateAttachmentInput): Promise<IssueAttachment> {
  throw new Error("stub: src/server/services/attachment-service.ts");
}

export async function removeAttachment(actor: Actor, input: DeleteAttachmentInput): Promise<void> {
  throw new Error("stub: src/server/services/attachment-service.ts");
}
