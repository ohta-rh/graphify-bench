import { z } from "zod";
import { emailSchema, invitationIdSchema, orgIdSchema } from "./common";
import { invitableRoleSchema } from "./role";

/** Invitation lifecycle, kept apart from `member.ts` because the accept flow
 *  runs unauthenticated (the token is the credential). */
export const invitationTokenSchema = z
  .string()
  .min(32)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/, "malformed invitation token");

export const createInvitationSchema = z.object({
  orgId: orgIdSchema,
  email: emailSchema,
  role: invitableRoleSchema,
  expiresInDays: z.number().int().min(1).max(30).default(14),
});

export const resendInvitationSchema = z.object({
  orgId: orgIdSchema,
  invitationId: invitationIdSchema,
});

export const acceptInvitationTokenSchema = z.object({
  token: invitationTokenSchema,
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type AcceptInvitationTokenInput = z.infer<
  typeof acceptInvitationTokenSchema
>;
