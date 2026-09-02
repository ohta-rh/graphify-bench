import { z } from "zod";
import type { Role } from "@/types/member";

export const roleSchema = z.enum(["owner", "admin", "member", "viewer"]);

/** Roles an invitation may grant — an owner is transferred, never invited. */
export const invitableRoleSchema = z.enum(["admin", "member", "viewer"]);

export const memberStatusSchema = z.enum(["active", "invited", "suspended"]);

// Compile-time proof that the enum and the `Role` union stay in step.
const _roleParity: Role = "member" satisfies z.infer<typeof roleSchema>;
void _roleParity;

export type RoleInput = z.infer<typeof roleSchema>;
export type MemberStatusInput = z.infer<typeof memberStatusSchema>;
