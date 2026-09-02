import type { Actor, Role } from "@/types/member";
import { ROLE_RANK } from "@/types/member";
import type {
  PermissionAction,
  PermissionDecision,
  PermissionResource,
} from "@/types/permission";

/**
 * The single authorization entry point for Taskflow.
 *
 * Every Server Action, service method, Route Handler and permission-sensitive
 * UI component funnels through `can()`. Nothing else may branch on
 * `actor.role` directly — if you find yourself writing `role === "admin"`,
 * add an action to `PermissionAction` and a row to `ROLE_MATRIX` instead.
 *
 * Decision order:
 *   1. cross-tenant guard (`actor.orgId` must equal `resource.orgId`)
 *   2. platform staff bypass
 *   3. role matrix lookup
 *   4. ownership escalations (authors edit their own issues/comments)
 */

/** Minimum role required for each action, before ownership escalations. */
export const ROLE_MATRIX: Readonly<Record<PermissionAction, Role>> = {
  "org:read": "viewer",
  "org:update": "admin",
  "org:delete": "owner",
  "org:manage_billing": "owner",
  "org:manage_flags": "admin",
  "member:read": "viewer",
  "member:invite": "admin",
  "member:update_role": "admin",
  "member:remove": "admin",
  "project:create": "member",
  "project:read": "viewer",
  "project:update": "member",
  "project:archive": "admin",
  "project:delete": "owner",
  "issue:create": "member",
  "issue:read": "viewer",
  "issue:update": "member",
  "issue:assign": "member",
  "issue:archive": "member",
  "issue:delete": "admin",
  "comment:create": "member",
  "comment:read": "viewer",
  "comment:update": "member",
  "comment:delete": "admin",
  "activity:read": "member",
  "activity:export": "admin",
  "notification:read": "viewer",
  "notification:manage": "viewer",
  "webhook:manage": "admin",
};

/** Actions an actor may perform on their own content regardless of role rank. */
const OWNERSHIP_ESCALATIONS: Readonly<Partial<Record<PermissionAction, true>>> = {
  "issue:update": true,
  "issue:archive": true,
  "comment:update": true,
  "comment:delete": true,
  "notification:manage": true,
};

function isOwnedByActor(
  actor: Actor,
  resource: PermissionResource,
): boolean {
  switch (resource.kind) {
    case "issue":
      return (
        resource.authorId === actor.userId ||
        resource.assigneeId === actor.userId
      );
    case "comment":
      return resource.authorId === actor.userId;
    case "project":
      return resource.leadId === actor.userId;
    case "notification":
      return resource.recipientId === actor.userId;
    case "member":
      return resource.targetUserId === actor.userId;
    default:
      return false;
  }
}

/**
 * Answers "may this actor perform this action on this resource?".
 *
 * @param actor    the authenticated principal, always scoped to one org
 * @param action   a member of the closed `PermissionAction` vocabulary
 * @param resource the object being acted on, discriminated on `kind`
 */
export function can(
  actor: Actor,
  action: PermissionAction,
  resource: PermissionResource,
): boolean {
  return explain(actor, action, resource).allowed;
}

/** Same decision as `can()`, but reports why — used by the settings UI. */
export function explain(
  actor: Actor,
  action: PermissionAction,
  resource: PermissionResource,
): PermissionDecision {
  const base = { action, resourceKind: resource.kind } as const;

  if (actor.orgId !== resource.orgId) {
    return { ...base, allowed: false, reason: "denied_cross_tenant" };
  }

  if (actor.isPlatformStaff === true) {
    return { ...base, allowed: true, reason: "granted_by_staff" };
  }

  const required = ROLE_MATRIX[action];
  if (required === undefined) {
    return { ...base, allowed: false, reason: "denied_unknown_action" };
  }

  if (ROLE_RANK[actor.role] >= ROLE_RANK[required]) {
    return { ...base, allowed: true, reason: "granted_by_role" };
  }

  if (OWNERSHIP_ESCALATIONS[action] === true && isOwnedByActor(actor, resource)) {
    return { ...base, allowed: true, reason: "granted_by_ownership" };
  }

  return { ...base, allowed: false, reason: "denied_by_role" };
}

/** Thrown by `assertCan()`; mapped to a `forbidden` `ActionResult` by callers. */
export class PermissionDeniedError extends Error {
  readonly code = "forbidden" as const;

  constructor(
    readonly action: PermissionAction,
    readonly decision: PermissionDecision,
  ) {
    super(`Permission denied: ${action} on ${decision.resourceKind}`);
    this.name = "PermissionDeniedError";
  }
}

/** Throwing variant of `can()` for service-layer guard clauses. */
export function assertCan(
  actor: Actor,
  action: PermissionAction,
  resource: PermissionResource,
): void {
  const decision = explain(actor, action, resource);
  if (!decision.allowed) {
    throw new PermissionDeniedError(action, decision);
  }
}

/** Bulk evaluation used by navigation and toolbar components. */
export function canAll(
  actor: Actor,
  actions: readonly PermissionAction[],
  resource: PermissionResource,
): boolean {
  return actions.every((action) => can(actor, action, resource));
}
