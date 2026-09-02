import { z } from "zod";
import { orgIdSchema } from "./common";
import { slugSchema } from "./slug";
import { planIdSchema } from "./billing";

export const organizationSettingsSchema = z.object({
  defaultIssueStatus: z
    .enum(["backlog", "todo", "in_progress", "in_review", "done", "canceled"])
    .default("backlog"),
  allowPublicProjects: z.boolean().default(false),
  requireTwoFactor: z.boolean().default(false),
  digestHourUtc: z.number().int().min(0).max(23).default(7),
  enabledFlagOverrides: z.array(z.string()).default([]),
});

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(64),
  slug: slugSchema,
  plan: planIdSchema.default("free"),
});

export const updateOrganizationSchema = z.object({
  orgId: orgIdSchema,
  name: z.string().min(2).max(64).optional(),
  logoUrl: z.url().nullable().optional(),
  settings: organizationSettingsSchema.partial().optional(),
});

export const transferOwnershipSchema = z.object({
  orgId: orgIdSchema,
  newOwnerUserId: z.string().min(1),
});

export const deleteOrganizationSchema = z.object({
  orgId: orgIdSchema,
  confirmSlug: slugSchema,
});

export type OrganizationSettingsInput = z.infer<
  typeof organizationSettingsSchema
>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type DeleteOrganizationInput = z.infer<typeof deleteOrganizationSchema>;
export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;
