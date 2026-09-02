import type {
  IsoTimestamp,
  MemberId,
  OrgId,
  SoftDeletable,
  TenantScoped,
  Timestamps,
  UserId,
  InvitationId,
} from "./common";

/**
 * Taskflow RBAC roles, ordered from most to least privileged. `ROLE_RANK`
 * below is the single source of truth for "at least this role" comparisons —
 * never compare role strings directly.
 */
export type Role = "owner" | "admin" | "member" | "viewer";

export const ROLES: readonly Role[] = ["owner", "admin", "member", "viewer"];

export const ROLE_RANK: Readonly<Record<Role, number>> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

export type MemberStatus = "active" | "invited" | "suspended";

export interface User extends Timestamps {
  readonly id: UserId;
  readonly email: string;
  readonly name: string;
  readonly avatarUrl: string | null;
  readonly timezone: string;
  readonly emailVerifiedAt: IsoTimestamp | null;
}

export interface Member extends Timestamps, TenantScoped, SoftDeletable {
  readonly id: MemberId;
  readonly userId: UserId;
  readonly role: Role;
  readonly status: MemberStatus;
  readonly invitedBy: UserId | null;
  readonly joinedAt: IsoTimestamp | null;
  readonly lastSeenAt: IsoTimestamp | null;
}

/** A member joined with the user record it points at, for list UIs. */
export interface MemberWithUser extends Member {
  readonly user: User;
}

export interface Invitation extends Timestamps, TenantScoped {
  readonly id: InvitationId;
  readonly email: string;
  readonly role: Role;
  readonly invitedBy: UserId;
  readonly token: string;
  readonly expiresAt: IsoTimestamp;
  readonly acceptedAt: IsoTimestamp | null;
  readonly revokedAt: IsoTimestamp | null;
}

/**
 * The authenticated principal for one request, always resolved for exactly one
 * organization. Everything that authorizes a mutation takes an `Actor` — see
 * `can()` in `src/lib/permissions.ts` and `assertOrgScope()` in
 * `src/lib/tenant.ts`.
 */
export interface Actor {
  readonly userId: UserId;
  readonly orgId: OrgId;
  readonly role: Role;
  /** Staff impersonation / internal tooling escape hatch. Defaults to false. */
  readonly isPlatformStaff?: boolean;
}

export interface SessionPrincipal {
  readonly userId: UserId;
  readonly email: string;
  readonly activeOrgId: OrgId | null;
  readonly expiresAt: IsoTimestamp;
}

/** True when `role` is at least as privileged as `atLeast`. */
export function hasRoleAtLeast(role: Role, atLeast: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[atLeast];
}
