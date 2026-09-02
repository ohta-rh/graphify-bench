/**
 * Resolves the request's `Actor` for a given org slug, or throws `unauthorized`/`forbidden`. Every Server Action starts here.
 *
 * STUB — owner E. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): getSessionPrincipal, assertOrgScope, resolveActorForOrg
 */
import type { OrgId } from "@/types/common";
import type { Actor } from "@/types/member";
export async function getActor(orgSlug: string): Promise<Actor> {
  throw new Error("stub: src/lib/actor.ts");
}

export async function tryGetActor(orgSlug: string): Promise<Actor | null> {
  throw new Error("stub: src/lib/actor.ts");
}

export async function requireActorFor(orgId: OrgId): Promise<Actor> {
  throw new Error("stub: src/lib/actor.ts");
}
