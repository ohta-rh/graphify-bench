import { z } from "zod";
import type { PlanId } from "@/types/billing";
import { orgIdSchema } from "./common";

export const planIdSchema = z.enum(["free", "starter", "growth", "enterprise"]);

export const billingIntervalSchema = z.enum(["monthly", "annual"]);

export const subscriptionStatusSchema = z.enum([
  "trialing",
  "active",
  "past_due",
  "canceled",
]);

export const limitedResourceSchema = z.enum([
  "seats",
  "projects",
  "issuesPerProject",
  "storageMb",
  "apiRequestsPerHour",
  "webhooks",
]);

export const changePlanSchema = z.object({
  orgId: orgIdSchema,
  plan: planIdSchema,
  interval: billingIntervalSchema.default("monthly"),
});

export const updateSeatsSchema = z.object({
  orgId: orgIdSchema,
  seats: z.number().int().min(1).max(10_000),
});

export const cancelSubscriptionSchema = z.object({
  orgId: orgIdSchema,
  reason: z.string().max(500).optional(),
  cancelImmediately: z.boolean().default(false),
});

const _planParity: PlanId = "growth" satisfies z.infer<typeof planIdSchema>;
void _planParity;

export type ChangePlanInput = z.infer<typeof changePlanSchema>;
export type UpdateSeatsInput = z.infer<typeof updateSeatsSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
