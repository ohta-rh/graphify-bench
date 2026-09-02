/**
 * Error types raised by Server Actions that are *expected* failures rather
 * than bugs. Each one carries the `ErrorCode` that `toAppError()` maps into
 * the `AppErrorShape` the client form layer renders, mirroring the convention
 * already used by `PermissionDeniedError` and `TenantScopeError`.
 *
 * These live in `src/actions/_lib` because only the action layer produces
 * them — services throw their own domain errors, and repositories throw none.
 */

import type { LimitedResource } from "@/types/billing";
import type { IsoTimestamp } from "@/types/common";
import type { PermissionAction } from "@/types/permission";

/** No session at all, or a session whose active organization is gone. */
export class UnauthorizedActionError extends Error {
  readonly code = "unauthorized" as const;

  constructor(message = "Sign in to continue.") {
    super(message);
    this.name = "UnauthorizedActionError";
  }
}

/**
 * `can()` returned false. Distinct from `PermissionDeniedError` (thrown by
 * `assertCan()` inside services) only in that the action layer already knows
 * the action name and does not need the full `PermissionDecision`.
 */
export class ForbiddenActionError extends Error {
  readonly code = "forbidden" as const;

  constructor(readonly action: PermissionAction) {
    super(`Permission denied: ${action}`);
    this.name = "ForbiddenActionError";
  }
}

/** A plan quota from `@/config/plan-limits` would be breached. */
export class PlanLimitError extends Error {
  readonly code = "plan_limit_exceeded" as const;

  constructor(
    readonly resource: LimitedResource,
    readonly limit: number,
    readonly used: number,
  ) {
    super(`Plan limit reached for ${resource}: ${used}/${limit}`);
    this.name = "PlanLimitError";
  }
}

/** The token bucket in `@/lib/rate-limit` refused the request. */
export class RateLimitedError extends Error {
  readonly code = "rate_limited" as const;

  constructor(
    readonly bucketKey: string,
    readonly resetAt: IsoTimestamp,
  ) {
    super(`Rate limit exceeded for ${bucketKey}; retry after ${resetAt}`);
    this.name = "RateLimitedError";
  }
}

/** A feature flag that gates the whole action is off for this organization. */
export class FeatureUnavailableError extends Error {
  readonly code = "forbidden" as const;

  constructor(readonly flag: string) {
    super(`Feature not available: ${flag}`);
    this.name = "FeatureUnavailableError";
  }
}

/** The row the action addresses does not exist inside the actor's tenant. */
export class ActionNotFoundError extends Error {
  readonly code = "not_found" as const;

  constructor(readonly what: string) {
    super(`Not found: ${what}`);
    this.name = "ActionNotFoundError";
  }
}
