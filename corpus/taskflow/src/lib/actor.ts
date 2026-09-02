/**
 * Resolves the request's `Actor` for a given org slug, or throws
 * `unauthorized` / `forbidden`. Every Server Action starts here.
 *
 * The `Actor` is the only thing `can()` and `assertOrgScope()` accept, so
 * this module is the seam between "there is an HTTP request with a cookie"
 * and the rest of the app, which knows nothing about requests.
 */
import { getSessionPrincipal } from "@/lib/session";
import { assertOrgScope } from "@/lib/tenant";
import { resolveActorForOrg } from "@/server/services/session-service";
import type { OrgId } from "@/types/common";
import type { Actor } from "@/types/member";

/** Thrown when there is no usable session; mapped to a 401 by `toAppError`. */
export class UnauthorizedError extends Error {
  readonly code = "unauthorized" as const;

  constructor(message = "Sign in to continue.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** Thrown when the session is valid but has no membership in the target org. */
export class NoMembershipError extends Error {
  readonly code = "forbidden" as const;

  constructor(readonly orgSlug: string) {
    super(`You are not a member of "${orgSlug}".`);
    this.name = "NoMembershipError";
  }
}

/** The `Actor` for `orgSlug`, or a throw. Use this in Server Actions. */
export async function getActor(orgSlug: string): Promise<Actor> {
  const principal = await getSessionPrincipal();
  if (principal === null) throw new UnauthorizedError();

  const actor = await resolveActorForOrg(principal, orgSlug);
  if (actor === null) throw new NoMembershipError(orgSlug);

  return actor;
}

/** Non-throwing variant, for layouts that render a signed-out state. */
export async function tryGetActor(orgSlug: string): Promise<Actor | null> {
  try {
    return await getActor(orgSlug);
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof NoMembershipError) {
      return null;
    }
    throw error;
  }
}

/**
 * The `Actor` for an org already identified by id — used by Route Handlers
 * that receive an `orgId` in the payload rather than a slug in the path. The
 * session's active org must match, which `assertOrgScope()` enforces.
 *
 * `resolveActorForOrg` accepts either an org slug or an org id as its second
 * argument — both are opaque lookup keys to it.
 */
export async function requireActorFor(orgId: OrgId): Promise<Actor> {
  const principal = await getSessionPrincipal();
  if (principal === null) throw new UnauthorizedError();
  if (principal.activeOrgId === null) throw new NoMembershipError(orgId);

  const actor = await resolveActorForOrg(principal, orgId);
  if (actor === null) throw new NoMembershipError(orgId);

  assertOrgScope(actor, orgId);
  return actor;
}
