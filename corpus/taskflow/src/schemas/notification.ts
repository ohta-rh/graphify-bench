import { z } from "zod";
import type { NotificationKind } from "@/types/notification";
import {
  notificationIdSchema,
  orgIdSchema,
  pageRequestSchema,
  userIdSchema,
} from "./common";

export const notificationKindSchema = z.enum([
  "issue_assigned",
  "issue_status_changed",
  "issue_due_soon",
  "issue_overdue",
  "comment_created",
  "comment_mention",
  "member_invited",
  "member_joined",
  "project_archived",
  "plan_limit_reached",
  "digest_ready",
]);

export const notificationChannelSchema = z.enum(["in_app", "email", "webhook"]);

export const markNotificationReadSchema = z.object({
  orgId: orgIdSchema,
  notificationId: notificationIdSchema,
});

export const markAllNotificationsReadSchema = z.object({
  orgId: orgIdSchema,
});

export const listNotificationsSchema = z
  .object({
    orgId: orgIdSchema,
    recipientId: userIdSchema,
    unreadOnly: z.boolean().default(false),
    kind: z.array(notificationKindSchema).optional(),
  })
  .extend(pageRequestSchema.shape);

export const updateNotificationPreferenceSchema = z.object({
  orgId: orgIdSchema,
  userId: userIdSchema,
  kind: notificationKindSchema,
  inApp: z.boolean(),
  email: z.boolean(),
  digestOnly: z.boolean(),
});

const _kindParity: NotificationKind = "comment_mention" satisfies z.infer<
  typeof notificationKindSchema
>;
void _kindParity;

export type MarkNotificationReadInput = z.infer<
  typeof markNotificationReadSchema
>;
export type ListNotificationsInput = z.infer<typeof listNotificationsSchema>;
export type UpdateNotificationPreferenceInput = z.infer<
  typeof updateNotificationPreferenceSchema
>;
