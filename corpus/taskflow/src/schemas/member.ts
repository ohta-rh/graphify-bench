import { z } from "zod";
import {
  emailSchema,
  memberIdSchema,
  orgIdSchema,
  pageRequestSchema,
  userIdSchema,
} from "./common";
import { invitableRoleSchema, memberStatusSchema, roleSchema } from "./role";

export const inviteMemberSchema = z.object({
  orgId: orgIdSchema,
  email: emailSchema,
  role: invitableRoleSchema.default("member"),
  message: z.string().max(500).optional(),
});

/** Bulk invite from the members settings page; the seat check runs once. */
export const inviteMembersSchema = z.object({
  orgId: orgIdSchema,
  invites: z
    .array(
      z.object({
        email: emailSchema,
        role: invitableRoleSchema.default("member"),
      }),
    )
    .min(1)
    .max(50),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(16),
});

export const revokeInvitationSchema = z.object({
  orgId: orgIdSchema,
  invitationId: z.string().min(1),
});

export const updateMemberRoleSchema = z.object({
  orgId: orgIdSchema,
  memberId: memberIdSchema,
  role: roleSchema,
});

export const removeMemberSchema = z.object({
  orgId: orgIdSchema,
  memberId: memberIdSchema,
});

export const listMembersSchema = z
  .object({
    orgId: orgIdSchema,
    role: roleSchema.optional(),
    status: memberStatusSchema.optional(),
    query: z.string().max(200).optional(),
  })
  .extend(pageRequestSchema.shape);

export const updateProfileSchema = z.object({
  userId: userIdSchema,
  name: z.string().min(1).max(80).optional(),
  avatarUrl: z.url().nullable().optional(),
  timezone: z.string().min(1).max(64).optional(),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type InviteMembersInput = z.infer<typeof inviteMembersSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
export type ListMembersInput = z.infer<typeof listMembersSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
