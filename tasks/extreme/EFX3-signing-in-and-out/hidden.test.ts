/**
 * Hidden test for EFX3-signing-in-and-out: sign-out ends one session, a
 * password reset ends them all, reset links are fresh/single-use/an hour long,
 * "remember me" decides the session lifetime, and throttles are per account.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);
vi.mock("@/server/services/email-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/services/email-service")>();
  return { ...actual, sendEmail: vi.fn(async () => undefined) };
});

import { resetRateLimits } from "@/lib/rate-limit";
import * as authService from "@/server/services/auth-service";
import { sendEmail } from "@/server/services/email-service";
import * as sessionService from "@/server/services/session-service";
import { useTemporaryDatabase } from "../server/_support/fixtures";

const T0 = new Date("2026-06-01T08:00:00.000Z");
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const PASSWORD = "Correct-Horse-1";
const NEW_PASSWORD = "Battery-Staple-2";

let cleanup: () => void;
let seq = 0;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  vi.useFakeTimers({ toFake: ["Date"] });
});

beforeEach(() => {
  vi.setSystemTime(T0);
  resetRateLimits();
  vi.mocked(sendEmail).mockClear();
});

afterAll(() => {
  vi.useRealTimers();
  cleanup();
});

function at(offsetMs: number): void {
  vi.setSystemTime(new Date(T0.getTime() + offsetMs));
}

async function account(label: string): Promise<string> {
  seq += 1;
  const email = `${label}${seq}@example.test`;
  await authService.register({
    name: `${label} ${seq}`,
    email,
    password: PASSWORD,
    confirmPassword: PASSWORD,
    acceptTerms: true,
  });
  vi.mocked(sendEmail).mockClear();
  return email;
}

async function signIn(email: string, password = PASSWORD, rememberMe = false): Promise<string> {
  const { token } = await authService.login({ email, password, rememberMe });
  return token;
}

function alive(token: string): Promise<boolean> {
  return sessionService.resolveSession(token).then((principal) => principal !== null);
}

/** The raw reset token carried by the most recent mail sent to `email`. */
function latestResetToken(email: string): string {
  const calls = vi.mocked(sendEmail).mock.calls.filter(([message]) => message.to === email);
  const last = calls.at(-1)?.[0];
  if (!last) throw new Error(`no mail sent to ${email}`);
  const match = /<td>token<\/td><td>([^<]+)<\/td>/.exec(last.html);
  if (!match?.[1]) throw new Error("no token in mail");
  return match[1];
}

function mailsTo(email: string): number {
  return vi.mocked(sendEmail).mock.calls.filter(([message]) => message.to === email).length;
}

async function confirm(token: string, password = NEW_PASSWORD) {
  return authService.confirmPasswordReset({ token, password, confirmPassword: password });
}

describe("signing out", () => {
  it("ends that session only: the same account's other devices and other people stay signed in", async () => {
    const alice = await account("alice");
    const bob = await account("bob");
    const aliceLaptop = await signIn(alice);
    const alicePhone = await signIn(alice);
    const bobLaptop = await signIn(bob);

    await sessionService.destroySession(aliceLaptop);

    await expect(alive(aliceLaptop)).resolves.toBe(false);
    await expect(alive(alicePhone)).resolves.toBe(true);
    await expect(alive(bobLaptop)).resolves.toBe(true);
  });

  it("is harmless for an unknown or already-ended session", async () => {
    const alice = await account("alice");
    const first = await signIn(alice);
    const second = await signIn(alice);

    await sessionService.destroySession(first);
    await expect(sessionService.destroySession(first)).resolves.toBeUndefined();
    await expect(sessionService.destroySession("never-issued".padEnd(43, "x"))).resolves.toBeUndefined();
    await expect(alive(second)).resolves.toBe(true);
  });

  it("can be followed by a fresh sign-in, which is a new session", async () => {
    const alice = await account("alice");
    const old = await signIn(alice);
    await sessionService.destroySession(old);

    const fresh = await signIn(alice);
    expect(fresh).not.toBe(old);
    await expect(alive(fresh)).resolves.toBe(true);
    await expect(alive(old)).resolves.toBe(false);
  });
});

describe("session lifetime", () => {
  it("lasts a day without 'remember me' and thirty days with it", async () => {
    const alice = await account("alice");
    const short = await signIn(alice, PASSWORD, false);
    const long = await signIn(alice, PASSWORD, true);

    await expect(sessionService.resolveSession(short)).resolves.toMatchObject({
      expiresAt: new Date(T0.getTime() + DAY).toISOString(),
    });
    await expect(sessionService.resolveSession(long)).resolves.toMatchObject({
      expiresAt: new Date(T0.getTime() + 30 * DAY).toISOString(),
    });

    at(23 * HOUR);
    await expect(alive(short)).resolves.toBe(true);
    at(25 * HOUR);
    await expect(alive(short)).resolves.toBe(false);
    await expect(alive(long)).resolves.toBe(true);
    at(31 * DAY);
    await expect(alive(long)).resolves.toBe(false);
  });
});

describe("resetting a password", () => {
  it("ends every session of that account and none of anyone else's; the new password signs in, the old one does not", async () => {
    const alice = await account("alice");
    const bob = await account("bob");
    const aliceLaptop = await signIn(alice);
    const alicePhone = await signIn(alice, PASSWORD, true);
    const bobLaptop = await signIn(bob);

    await authService.requestPasswordReset({ email: alice });
    await confirm(latestResetToken(alice));

    await expect(alive(aliceLaptop)).resolves.toBe(false);
    await expect(alive(alicePhone)).resolves.toBe(false);
    await expect(alive(bobLaptop)).resolves.toBe(true);

    await expect(signIn(alice, PASSWORD)).rejects.toThrow();
    const again = await signIn(alice, NEW_PASSWORD);
    await expect(alive(again)).resolves.toBe(true);
  });

  it("issues links that work for an hour", async () => {
    const alice = await account("alice");

    await authService.requestPasswordReset({ email: alice });
    const early = latestResetToken(alice);
    at(59 * MINUTE);
    await expect(confirm(early)).resolves.toMatchObject({ email: alice });

    at(2 * HOUR);
    await authService.requestPasswordReset({ email: alice });
    const late = latestResetToken(alice);
    at(2 * HOUR + 61 * MINUTE);
    await expect(confirm(late, "Third-Password-3")).rejects.toThrow();
    await expect(signIn(alice, NEW_PASSWORD)).resolves.toBeDefined();
  });

  it("uses a link up: a second use is refused and changes nothing", async () => {
    const alice = await account("alice");
    await authService.requestPasswordReset({ email: alice });
    const token = latestResetToken(alice);

    await confirm(token);
    await expect(confirm(token, "Third-Password-3")).rejects.toThrow();
    await expect(signIn(alice, "Third-Password-3")).rejects.toThrow();
    await expect(signIn(alice, NEW_PASSWORD)).resolves.toBeDefined();
  });

  it("makes the newest link the only working one, without touching other accounts' links", async () => {
    const alice = await account("alice");
    const bob = await account("bob");

    await authService.requestPasswordReset({ email: bob });
    const bobToken = latestResetToken(bob);
    await authService.requestPasswordReset({ email: alice });
    const first = latestResetToken(alice);
    at(5 * MINUTE);
    await authService.requestPasswordReset({ email: alice });
    const second = latestResetToken(alice);
    expect(second).not.toBe(first);

    await expect(confirm(first)).rejects.toThrow();
    await expect(confirm(second)).resolves.toMatchObject({ email: alice });
    await expect(confirm(bobToken)).resolves.toMatchObject({ email: bob });
  });

  it("refuses a made-up link, and says nothing about an unknown address", async () => {
    await account("alice");
    await expect(authService.requestPasswordReset({ email: "nobody@example.test" })).resolves.toBeUndefined();
    expect(mailsTo("nobody@example.test")).toBe(0);
    await expect(confirm("not-a-real-token".padEnd(43, "x"))).rejects.toThrow();
  });

  it("treats the address case-insensitively", async () => {
    const alice = await account("alice");
    await authService.requestPasswordReset({ email: alice.toUpperCase() });
    expect(mailsTo(alice)).toBe(1);
    await expect(confirm(latestResetToken(alice))).resolves.toMatchObject({ email: alice });
    await expect(signIn(alice.toUpperCase(), NEW_PASSWORD)).resolves.toBeDefined();
  });
});

describe("throttling", () => {
  /** Hammers `email` with a wrong password until sign-in is refused for another reason than the password. */
  async function exhaustSignIn(email: string): Promise<void> {
    for (let i = 0; i < 200; i += 1) {
      await authService.login({ email, password: "Wrong-Password-9", rememberMe: false }).catch(() => undefined);
      const correct = await authService
        .login({ email, password: PASSWORD, rememberMe: false })
        .then(() => true)
        .catch(() => false);
      if (!correct) return;
    }
    throw new Error("sign-in was never throttled");
  }

  it("limits sign-in attempts per account: one hammered address does not lock the others out", async () => {
    const alice = await account("alice");
    const bob = await account("bob");

    await exhaustSignIn(alice);
    await expect(signIn(alice)).rejects.toThrow();
    await expect(signIn(bob)).resolves.toBeDefined();
  });

  it("counts attempts against the same account whatever the letter case", async () => {
    const alice = await account("alice");
    await exhaustSignIn(alice);
    await expect(signIn(alice.toUpperCase())).rejects.toThrow();
  });

  it("limits reset requests per address, separately from sign-in", async () => {
    const alice = await account("alice");
    const bob = await account("bob");

    let before = mailsTo(alice);
    let throttled = false;
    for (let i = 0; i < 200; i += 1) {
      await authService.requestPasswordReset({ email: alice });
      const after = mailsTo(alice);
      if (after === before) {
        throttled = true;
        break;
      }
      before = after;
    }
    expect(throttled).toBe(true);

    await authService.requestPasswordReset({ email: bob });
    expect(mailsTo(bob)).toBe(1);
    await expect(signIn(alice)).resolves.toBeDefined();
  });

  it("leaves the password reset available to an account whose sign-in is throttled", async () => {
    const alice = await account("alice");
    await exhaustSignIn(alice);

    await authService.requestPasswordReset({ email: alice });
    expect(mailsTo(alice)).toBe(1);
    await expect(confirm(latestResetToken(alice))).resolves.toMatchObject({ email: alice });
  });

  it("still signs in with the right password after a couple of typos", async () => {
    const alice = await account("alice");
    await expect(signIn(alice, "Typo-Password-1")).rejects.toThrow();
    await expect(signIn(alice, "Typo-Password-2")).rejects.toThrow();
    const token = await signIn(alice.toUpperCase());
    await expect(alive(token)).resolves.toBe(true);
  });
});
