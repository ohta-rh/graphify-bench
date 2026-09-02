/**
 * Credential login, registration and password reset. No third-party provider.
 *
 * Must call (do not reimplement): hashPassword, verifyPassword, consumeRateLimit, emit
 *
 * Note: `TaskflowEventMap` has no authentication event and the type is part of
 * the frozen contract, so the declared `emit` is not reachable from here.
 * Registration still publishes `member.joined` — through
 * `OrganizationService.createOrganization`, which owns that membership row.
 */
import {
  hashPassword,
  hashToken,
  randomToken,
  verifyPassword,
} from "@/lib/hash";
import { consumeRateLimit } from "@/lib/rate-limit";
import { slugify } from "@/lib/slug";
import * as resetTokenRepo from "@/server/repositories/_password-reset-repository";
import * as sessionRepo from "@/server/repositories/session-repository";
import * as userRepo from "@/server/repositories/user-repository";
import { toIsoTimestamp } from "@/types/common";
import { createOrganization } from "./organization-service";
import { renderEmail, sendEmail } from "./email-service";
import { createSessionToken } from "./session-service";
import type {
  LoginInput,
  PasswordResetConfirmInput,
  PasswordResetRequestInput,
  RegisterInput,
} from "@/schemas/auth";
import type { OrgId, SessionId } from "@/types/common";
import type { User } from "@/types/member";
import type { Organization } from "@/types/organization";

/** Buckets guarding the unauthenticated endpoints. */
const LOGIN_BUCKET = "auth:login";
const RESET_BUCKET = "auth:password-reset";

/**
 * Rate limiting before a session exists has no tenant to charge against, so
 * every unauthenticated attempt is billed to this sentinel bucket.
 */
const ANONYMOUS_ORG = "00000000000000000000000000" as OrgId;

/** How long a password-reset link stays usable. */
const RESET_TTL_MS = 60 * 60 * 1000;

/**
 * Registration creates the user and their first workspace in one step — a
 * Taskflow account with no organization cannot do anything, so there is no
 * intermediate state where one exists without the other.
 */
export async function register(
  input: RegisterInput,
): Promise<{ user: User; org: Organization }> {
  const existing = await userRepo.findUserByEmail(input.email);
  if (existing) {
    throw new Error("An account with that email already exists");
  }

  const user = await userRepo.insertUser({
    email: input.email,
    name: input.name,
    passwordHash: await hashPassword(input.password),
  });

  const org = await createOrganization(user.id, {
    name: `${input.name}'s workspace`,
    slug: slugify(input.name) || "workspace",
    plan: "free",
  });

  const welcome = await renderEmail("welcome", {
    orgName: org.name,
    recipientName: user.name,
  });
  await sendEmail({ to: user.email, ...welcome });

  return { user, org };
}

/**
 * Credential login. The rate limit is charged before the password is checked,
 * so a brute-force run is throttled whether or not it guesses correctly, and
 * both failure modes return the same message.
 */
export async function login(
  input: LoginInput,
): Promise<{ user: User; token: string }> {
  const verdict = await consumeRateLimit(ANONYMOUS_ORG, LOGIN_BUCKET);
  if (!verdict.allowed) {
    throw new Error("Too many sign-in attempts; try again shortly");
  }

  const user = await userRepo.findUserByEmail(input.email);
  if (!user) throw new Error("Those credentials did not match");

  const storedHash = await userRepo.findPasswordHash(user.id);
  if (!storedHash || !(await verifyPassword(input.password, storedHash))) {
    throw new Error("Those credentials did not match");
  }

  const { token } = await createSessionToken(user.id);

  return { user, token };
}

export async function logout(sessionId: SessionId): Promise<void> {
  await sessionRepo.revokeSession(sessionId);
}

/**
 * Always resolves, whether or not the address is known — telling an anonymous
 * caller which emails have accounts is an enumeration oracle. Only the token's
 * hash is stored; the raw value exists solely inside the email that carries it.
 */
export async function requestPasswordReset(
  input: PasswordResetRequestInput,
): Promise<void> {
  const verdict = await consumeRateLimit(ANONYMOUS_ORG, RESET_BUCKET);
  if (!verdict.allowed) return;

  const user = await userRepo.findUserByEmail(input.email);
  if (!user) return;

  const token = randomToken(32);
  await resetTokenRepo.issueResetToken(
    user.id,
    hashToken(token),
    toIsoTimestamp(new Date(Date.now() + RESET_TTL_MS)),
  );

  const message = await renderEmail("password-reset", {
    recipientName: user.name,
    token,
    expiresInMinutes: RESET_TTL_MS / 60_000,
  });

  await sendEmail({ to: user.email, ...message });
}

/**
 * Consumes a reset token and rewrites the password hash. The token is marked
 * used before the new hash is written, so a replay of the same link cannot
 * overwrite a password the user has since changed again.
 */
export async function confirmPasswordReset(
  input: PasswordResetConfirmInput,
): Promise<User> {
  const verdict = await consumeRateLimit(ANONYMOUS_ORG, RESET_BUCKET);
  if (!verdict.allowed) {
    throw new Error("Too many reset attempts; try again shortly");
  }

  const stored = await resetTokenRepo.findLiveResetToken(
    hashToken(input.token),
  );
  if (!stored) throw new Error("That reset link is no longer valid");

  await resetTokenRepo.consumeResetToken(stored.id);
  await userRepo.updatePasswordHash(
    stored.userId,
    await hashPassword(input.password),
  );

  const user = await userRepo.findUserById(stored.userId);
  if (!user) throw new Error("That reset link is no longer valid");

  return user;
}
