import { z } from "zod";
import { attachmentIdSchema, issueIdSchema, orgIdSchema } from "./common";

/** 25 MiB, also enforced against the plan's `storageMb` quota. */
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export const createAttachmentSchema = z.object({
  orgId: orgIdSchema,
  issueId: issueIdSchema,
  filename: z.string().min(1).max(255),
  contentType: z.string().min(3).max(128),
  sizeBytes: z.number().int().min(1).max(MAX_ATTACHMENT_BYTES),
});

export const deleteAttachmentSchema = z.object({
  orgId: orgIdSchema,
  attachmentId: attachmentIdSchema,
});

export type CreateAttachmentInput = z.infer<typeof createAttachmentSchema>;
export type DeleteAttachmentInput = z.infer<typeof deleteAttachmentSchema>;
