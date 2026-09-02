import { z } from "zod";
import { orgIdSchema, webhookIdSchema } from "./common";

export const webhookEventTypeSchema = z.enum([
  "issue.created",
  "issue.updated",
  "issue.status_changed",
  "issue.assigned",
  "comment.created",
  "member.joined",
  "project.created",
  "project.archived",
  "billing.plan_changed",
]);

export const createWebhookSchema = z.object({
  orgId: orgIdSchema,
  url: z.url().max(2_000),
  eventTypes: z.array(webhookEventTypeSchema).min(1).max(20),
});

export const updateWebhookSchema = z.object({
  orgId: orgIdSchema,
  webhookId: webhookIdSchema,
  url: z.url().max(2_000).optional(),
  eventTypes: z.array(webhookEventTypeSchema).min(1).max(20).optional(),
  enabled: z.boolean().optional(),
});

export const deleteWebhookSchema = z.object({
  orgId: orgIdSchema,
  webhookId: webhookIdSchema,
});

/** Body accepted by the inbound webhook receiver route handler. */
export const inboundWebhookSchema = z.object({
  source: z.enum(["billing", "email", "ci"]),
  eventId: z.string().min(1).max(128),
  occurredAt: z.iso.datetime(),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;
export type DeleteWebhookInput = z.infer<typeof deleteWebhookSchema>;
export type InboundWebhookInput = z.infer<typeof inboundWebhookSchema>;
