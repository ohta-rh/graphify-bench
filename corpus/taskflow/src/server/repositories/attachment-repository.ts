/**
 * Attachment metadata; the byte total feeds the `storageMb` quota check.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { CreateAttachmentInput } from "@/schemas/attachment";
import type { AttachmentId, IssueId, OrgId, UserId } from "@/types/common";
import type { IssueAttachment } from "@/types/issue";
export async function listAttachments(orgId: OrgId, issueId: IssueId): Promise<readonly IssueAttachment[]> {
  throw new Error("stub: src/server/repositories/attachment-repository.ts");
}

export async function insertAttachment(input: CreateAttachmentInput, uploadedBy: UserId): Promise<IssueAttachment> {
  throw new Error("stub: src/server/repositories/attachment-repository.ts");
}

export async function deleteAttachment(orgId: OrgId, attachmentId: AttachmentId): Promise<void> {
  throw new Error("stub: src/server/repositories/attachment-repository.ts");
}

export async function sumStorageBytes(orgId: OrgId): Promise<number> {
  throw new Error("stub: src/server/repositories/attachment-repository.ts");
}
