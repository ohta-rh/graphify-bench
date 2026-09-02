import { z } from "zod";
import { isoTimestampSchema, orgIdSchema, userIdSchema } from "./common";

/** Name of the session cookie checked by `src/proxy.ts`. */
export const SESSION_COOKIE_NAME = "taskflow_session";

export const sessionTokenSchema = z
  .string()
  .min(32)
  .max(256)
  .regex(/^[A-Za-z0-9_.-]+$/, "malformed session token");

export const sessionPrincipalSchema = z.object({
  userId: userIdSchema,
  email: z.email(),
  activeOrgId: orgIdSchema.nullable(),
  expiresAt: isoTimestampSchema,
});

export const switchOrgSchema = z.object({
  orgId: orgIdSchema,
});

export type SessionPrincipalInput = z.infer<typeof sessionPrincipalSchema>;
export type SwitchOrgInput = z.infer<typeof switchOrgSchema>;
