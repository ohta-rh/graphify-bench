/**
 * Turns the session cookie into an `Actor`. Everything server-side that needs authorization starts here.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): assertOrgScope
 */
import type { SwitchOrgInput } from "@/schemas/session";
import type { IsoTimestamp, UserId } from "@/types/common";
import type { Actor, SessionPrincipal } from "@/types/member";
export async function createSessionToken(userId: UserId): Promise<{ token: string; expiresAt: IsoTimestamp }> {
  throw new Error("stub: src/server/services/session-service.ts");
}

export async function resolveSession(token: string): Promise<SessionPrincipal | null> {
  throw new Error("stub: src/server/services/session-service.ts");
}

export async function resolveActorForOrg(principal: SessionPrincipal, orgSlug: string): Promise<Actor | null> {
  throw new Error("stub: src/server/services/session-service.ts");
}

export async function switchActiveOrg(principal: SessionPrincipal, input: SwitchOrgInput): Promise<void> {
  throw new Error("stub: src/server/services/session-service.ts");
}

export async function destroySession(token: string): Promise<void> {
  throw new Error("stub: src/server/services/session-service.ts");
}
