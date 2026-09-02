import { z } from "zod";
import type {
  ActivityId,
  AttachmentId,
  CommentId,
  InvitationId,
  IsoTimestamp,
  IssueId,
  LabelId,
  MemberId,
  NotificationId,
  OrgId,
  ProjectId,
  SubscriptionId,
  UserId,
  WebhookId,
} from "@/types/common";

/**
 * Shared Zod primitives.
 *
 * Every schema in `src/schemas` is used twice: by `react-hook-form` through
 * `@hookform/resolvers/zod` on the client, and by the matching Server Action
 * on the server. Keep them free of server-only imports.
 */

const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

/** Builds a branded-id schema whose output type is the branded alias. */
function brandedId<T extends string>(label: string) {
  return z
    .string()
    .regex(ULID, `${label} must be a ULID`)
    .transform((value) => value as T);
}

export const userIdSchema = brandedId<UserId>("userId");
export const orgIdSchema = brandedId<OrgId>("orgId");
export const projectIdSchema = brandedId<ProjectId>("projectId");
export const issueIdSchema = brandedId<IssueId>("issueId");
export const commentIdSchema = brandedId<CommentId>("commentId");
export const memberIdSchema = brandedId<MemberId>("memberId");
export const notificationIdSchema = brandedId<NotificationId>("notificationId");
export const activityIdSchema = brandedId<ActivityId>("activityId");
export const invitationIdSchema = brandedId<InvitationId>("invitationId");
export const labelIdSchema = brandedId<LabelId>("labelId");
export const attachmentIdSchema = brandedId<AttachmentId>("attachmentId");
export const subscriptionIdSchema = brandedId<SubscriptionId>("subscriptionId");
export const webhookIdSchema = brandedId<WebhookId>("webhookId");

export const isoTimestampSchema = z
  .iso
  .datetime()
  .transform((value) => value as IsoTimestamp);

export const emailSchema = z.email().max(254).toLowerCase();

export const sortDirectionSchema = z.enum(["asc", "desc"]);

export const pageRequestSchema = z.object({
  limit: z.number().int().min(1).max(100).default(25),
  cursor: z.string().nullable().optional(),
});

export const archiveScopeSchema = z.object({
  includeArchived: z.boolean().optional(),
});

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "must be a #rrggbb color");

export type PageRequestInput = z.infer<typeof pageRequestSchema>;
export type ArchiveScopeInput = z.infer<typeof archiveScopeSchema>;
