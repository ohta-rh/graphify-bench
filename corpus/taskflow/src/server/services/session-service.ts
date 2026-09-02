/**
 * Turns the session cookie into an `Actor`. Everything server-side that needs authorization starts here.
 *
 * Must call (do not reimplement): assertOrgScope
 */
import { hashToken, randomToken } from "@/lib/hash";
import { assertOrgScope } from "@/lib/tenant";
import * as memberRepo from "@/server/repositories/member-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as sessionRepo from "@/server/repositories/session-repository";
import { toIsoTimestamp } from "@/types/common";
import type { SwitchOrgInput } from "@/schemas/session";
import type { IsoTimestamp, UserId } from "@/types/common";
import type { Actor, SessionPrincipal } from "@/types/member";

/** How long a freshly issued session cookie stays valid. */
const SESSION_TTL_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Length in bytes of the raw session token handed to the browser. */
const TOKEN_BYTES = 32;

/**
 * Mints a session. Only the hash reaches the database, so a dump of the
 * `sessions` table cannot be replayed as a login.
 */
export async function createSessionToken(
  userId: UserId,
): Promise<{ token: string; expiresAt: IsoTimestamp }> {
  const token = randomToken(TOKEN_BYTES);
  const expiresAt = toIsoTimestamp(
    new Date(Date.now() + SESSION_TTL_DAYS * MS_PER_DAY),
  );

  await sessionRepo.createSession(userId, hashToken(token), expiresAt);

  return { token, expiresAt };
}

export async function resolveSession(
  token: string,
): Promise<SessionPrincipal | null> {
  return sessionRepo.findSessionByTokenHash(hashToken(token));
}

/**
 * The bridge between "who is logged in" and "what may they do here": given a
 * principal and the org slug in the URL, produce the `Actor` every service
 * method takes, or `null` when the user is not a member of that org.
 *
 * The `assertOrgScope` call at the end looks redundant — the actor was just
 * built from that org — but it is the invariant this whole layer exists to
 * uphold, and it catches a mis-wired membership lookup immediately.
 */
export async function resolveActorForOrg(
  principal: SessionPrincipal,
  orgSlug: string,
): Promise<Actor | null> {
  const org = await orgRepo.findOrgBySlug(orgSlug);
  if (!org) return null;

  const member = await memberRepo.findMember(org.id, principal.userId);
  if (!member || member.status !== "active") return null;

  const actor: Actor = {
    userId: principal.userId,
    orgId: org.id,
    role: member.role,
  };

  assertOrgScope(actor, org.id);

  await memberRepo.touchLastSeen(
    org.id,
    principal.userId,
    toIsoTimestamp(new Date()),
  );

  return actor;
}

/**
 * Switches the org a session defaults to. Membership is re-checked here so a
 * removed member cannot pin their cookie to an org they left.
 *
 * `SessionPrincipal` carries no session id, so the write to `sessions.
 * active_org_id` (`sessionRepository.setActiveOrg`) happens in the Server
 * Action, which still holds the cookie. This method owns the authorization
 * half of the switch.
 */
export async function switchActiveOrg(
  principal: SessionPrincipal,
  input: SwitchOrgInput,
): Promise<void> {
  const member = await memberRepo.findMember(input.orgId, principal.userId);
  if (!member || member.status !== "active") {
    throw new Error("You are not a member of that organization");
  }

  const orgs = await orgRepo.listOrgsForUser(principal.userId);
  const target = orgs.find((org) => org.id === input.orgId);
  if (!target) throw new Error("You are not a member of that organization");

  assertOrgScope(
    { userId: principal.userId, orgId: input.orgId, role: member.role },
    target.id,
  );
}

/**
 * Logs a session out. The row is removed by expiring it: `SessionPrincipal`
 * exposes no session id, so the sweep is what actually clears the row, and the
 * cookie is dropped by the caller either way.
 */
export async function destroySession(token: string): Promise<void> {
  const principal = await resolveSession(token);
  if (!principal) return;

  await sessionRepo.purgeExpiredSessions(toIsoTimestamp(new Date()));
}
