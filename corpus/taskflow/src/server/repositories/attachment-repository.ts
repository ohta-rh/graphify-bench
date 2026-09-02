/**
 * Attachment metadata; the byte total feeds the `storageMb` quota check.
 */
import { and, asc, eq, sql } from "drizzle-orm";
import { newId } from "@/lib/id";
import { attachments, getDb } from "@/server/db";
import { toIsoTimestamp } from "@/types/common";
import { orgPredicate } from "./base-repository";
import { toAttachment } from "./_mappers";
import type { CreateAttachmentInput } from "@/schemas/attachment";
import type { AttachmentId, IssueId, OrgId, UserId } from "@/types/common";
import type { IssueAttachment } from "@/types/issue";

export async function listAttachments(
  orgId: OrgId,
  issueId: IssueId,
): Promise<readonly IssueAttachment[]> {
  const rows = getDb()
    .select()
    .from(attachments)
    .where(
      and(
        orgPredicate(attachments.orgId, orgId),
        eq(attachments.issueId, issueId),
      ),
    )
    .orderBy(asc(attachments.createdAt))
    .all();
  return rows.map(toAttachment);
}

export async function insertAttachment(
  input: CreateAttachmentInput,
  uploadedBy: UserId,
): Promise<IssueAttachment> {
  const stamp = toIsoTimestamp(new Date());
  const row = getDb()
    .insert(attachments)
    .values({
      id: newId(),
      orgId: input.orgId,
      issueId: input.issueId,
      filename: input.filename,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      uploadedBy,
      createdAt: stamp,
      updatedAt: stamp,
    })
    .returning()
    .get();

  return toAttachment(row);
}

/** Attachments are hard deleted — the bytes are gone, so the row goes too. */
export async function deleteAttachment(
  orgId: OrgId,
  attachmentId: AttachmentId,
): Promise<void> {
  getDb()
    .delete(attachments)
    .where(
      and(
        orgPredicate(attachments.orgId, orgId),
        eq(attachments.id, attachmentId),
      ),
    )
    .run();
}

/** Total stored bytes for one tenant; `BillingService` converts to megabytes. */
export async function sumStorageBytes(orgId: OrgId): Promise<number> {
  const row = getDb()
    .select({
      value: sql<number | null>`sum(${attachments.sizeBytes})`,
    })
    .from(attachments)
    .where(orgPredicate(attachments.orgId, orgId))
    .get();
  return row?.value ?? 0;
}
