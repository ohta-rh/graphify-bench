/**
 * Seat quota and invite rate limiting.
 *
 * Owner C implements `@/server/services/invitation-service`.
 */
import { describe, it } from "vitest";

describe("services/invitation-service", () => {
  // can(actor, "member:invite", …) — a member cannot invite, an admin can.
  it.todo("refuses an invite from an actor without member:invite");

  // wouldExceedLimit(plan, "seats", seatsUsed) blocks the fourth seat on free.
  it.todo("refuses an invite that would exceed the plan's seat quota");

  // A bulk invite checks the seat quota once, for the whole batch.
  it.todo("checks the seat quota once for a bulk invite");

  // consumeRateLimit(orgId, "member:invite") throttles invite bursts.
  it.todo("rate-limits invites per organization");

  // member.invited carries the email and the granted role.
  it.todo("emits member.invited with the email and role");

  // Accepting creates the membership and emits member.joined.
  it.todo("emits member.joined when an invitation is accepted");

  // An expired or revoked token is refused rather than silently accepted.
  it.todo("refuses an expired or revoked invitation token");
});
