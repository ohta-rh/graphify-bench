import { z } from "zod";
import type { FeatureFlagKey } from "@/types/feature-flag";
import { orgIdSchema, userIdSchema } from "./common";
import { planIdSchema } from "./billing";
import { roleSchema } from "./role";

export const featureFlagKeySchema = z.enum([
  "kanban_board",
  "ai_issue_summary",
  "command_palette",
  "activity_feed",
  "public_projects",
  "webhooks",
  "csv_export",
  "digest_email",
  "issue_templates",
  "advanced_search",
]);

export const toggleFeatureFlagSchema = z.object({
  orgId: orgIdSchema,
  flag: featureFlagKeySchema,
  enabled: z.boolean(),
});

export const flagContextSchema = z.object({
  orgId: orgIdSchema.nullable(),
  userId: userIdSchema.nullable(),
  plan: planIdSchema,
  role: roleSchema.nullable(),
  overrides: z.array(z.string()).optional(),
});

const _flagParity: FeatureFlagKey = "kanban_board" satisfies z.infer<
  typeof featureFlagKeySchema
>;
void _flagParity;

export type ToggleFeatureFlagInput = z.infer<typeof toggleFeatureFlagSchema>;
export type FlagContextInput = z.infer<typeof flagContextSchema>;
