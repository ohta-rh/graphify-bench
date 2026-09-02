import type { OrgId, TenantScoped } from "@/types/common";
import type { Actor } from "@/types/member";

/**
 * Multi-tenancy invariant helpers.
 *
 * Every repository query must be filtered by `org_id`, and every row that
 * crosses a service boundary must be re-checked against the actor's org. These
 * helpers are the only sanctioned way to express that — a hand-written
 * `if (row.orgId !== actor.orgId)` is a review failure.
 */

export class TenantScopeError extends Error {
  readonly code = "tenant_scope_violation" as const;

  constructor(
    readonly expectedOrgId: OrgId,
    readonly actualOrgId: OrgId,
  ) {
    super(
      `Tenant scope violation: expected org ${expectedOrgId}, got ${actualOrgId}`,
    );
    this.name = "TenantScopeError";
  }
}

/** Throws unless `orgId` belongs to the actor's organization. */
export function assertOrgScope(actor: Actor, orgId: OrgId): void {
  if (actor.orgId !== orgId) {
    throw new TenantScopeError(actor.orgId, orgId);
  }
}

/** Throws unless every supplied row belongs to the actor's organization. */
export function assertRowsInScope<T extends TenantScoped>(
  actor: Actor,
  rows: readonly T[],
): void {
  for (const row of rows) {
    assertOrgScope(actor, row.orgId);
  }
}

/** Non-throwing predicate, for filtering rather than failing. */
export function isInOrgScope(actor: Actor, row: TenantScoped): boolean {
  return row.orgId === actor.orgId;
}

/** Narrows a nullable row to one the actor may see; `null` otherwise. */
export function scopedOrNull<T extends TenantScoped>(
  actor: Actor,
  row: T | null | undefined,
): T | null {
  if (!row) return null;
  return row.orgId === actor.orgId ? row : null;
}

/**
 * Wraps an arbitrary filter object with the actor's `orgId`, so repositories
 * cannot forget it. Always spread the caller filter first.
 */
export function withOrgScope<T extends object>(
  actor: Actor,
  filter: T,
): T & { orgId: OrgId } {
  return { ...filter, orgId: actor.orgId };
}
