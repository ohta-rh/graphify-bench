/**
 * BFX3 — sign-up and the first workspace.
 *
 * Derivation of the first workspace's slug never refuses a name; addresses
 * are case-insensitive; a duplicate address is a conflict; sign-up and
 * sign-in are throttled and report `rate_limited`; the first workspace is
 * Free and active; one welcome email and one member.joined.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { subscribe } from "@/lib/event-bus";
import { toAppError } from "@/lib/errors";
import { getBucketConfig, resetRateLimits } from "@/lib/rate-limit";
import { isReservedSlug, isValidSlug } from "@/lib/slug";
import { runMigrations } from "@/server/db/migrate";
import * as memberRepo from "@/server/repositories/member-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as subscriptionRepo from "@/server/repositories/subscription-repository";
import * as userRepo from "@/server/repositories/user-repository";
import { login, register } from "@/server/services/auth-service";
import * as emailService from "@/server/services/email-service";
import { resolveSession } from "@/server/services/session-service";
import type { RegisterInput } from "@/schemas/auth";
import type { TaskflowEventMap, Unsubscribe } from "@/types/event";

const PASSWORD = "Correct-Horse-Battery-9";
const NOW = new Date("2026-06-01T09:00:00.000Z");

let dir: string;
const detachers: Unsubscribe[] = [];

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "taskflow-bfx3-"));
  const path = join(dir, "taskflow.db");
  process.env.TASKFLOW_DB_PATH = path;
  await runMigrations(path);
});

beforeEach(() => {
  resetRateLimits();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  while (detachers.length > 0) detachers.pop()?.();
  vi.restoreAllMocks();
  vi.useRealTimers();
  resetRateLimits();
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

function signUp(name: string, email: string): RegisterInput {
  return {
    name,
    email,
    password: PASSWORD,
    confirmPassword: PASSWORD,
    acceptTerms: true,
  };
}

function usable(slug: string): void {
  expect(isValidSlug(slug), slug).toBe(true);
  expect(isReservedSlug(slug), slug).toBe(false);
}

async function errorOf(work: Promise<unknown>): Promise<unknown> {
  return work.then(
    () => null,
    (error: unknown) => error,
  );
}

describe("BFX3 sign-up — the first workspace's slug", () => {
  it("never uses a reserved word, suffixing it like any taken slug", async () => {
    const admin = await register(signUp("Admin", "admin.person@bfx3.test"));
    expect(admin.org.slug).toBe("admin-2");
    usable(admin.org.slug);

    const taskflow = await register(signUp("Taskflow", "taskflow.person@bfx3.test"));
    expect(taskflow.org.slug).toBe("taskflow-2");
    usable(taskflow.org.slug);
  });

  it("accepts a name at the minimum slug length", async () => {
    const { org } = await register(signUp("Al", "al@bfx3.test"));
    expect(org.slug).toBe("al");
    usable(org.slug);
  });

  it("falls back to workspace for a name too short to be a slug", async () => {
    const { org } = await register(signUp("J", "j@bfx3.test"));
    expect(org.slug.startsWith("workspace")).toBe(true);
    usable(org.slug);
  });

  it("falls back to workspace for a name with nothing sluggable, suffixed when taken", async () => {
    const first = await register(signUp("山田 太郎", "yamada@bfx3.test"));
    const second = await register(signUp("鈴木 花子", "suzuki@bfx3.test"));
    expect(first.org.slug.startsWith("workspace")).toBe(true);
    expect(second.org.slug.startsWith("workspace")).toBe(true);
    expect(second.org.slug).not.toBe(first.org.slug);
    usable(first.org.slug);
    usable(second.org.slug);
  });

  it("suffixes the second person with the same name", async () => {
    const first = await register(signUp("Jane Doe", "jane.one@bfx3.test"));
    const second = await register(signUp("Jane Doe", "jane.two@bfx3.test"));
    expect(first.org.slug).toBe("jane-doe");
    expect(second.org.slug).toBe("jane-doe-2");
  });

  it("slugifies diacritics and punctuation by the shared rules", async () => {
    const { org } = await register(signUp("  Zoë  Ünal!  ", "zoe@bfx3.test"));
    expect(org.slug).toBe("zoe-unal");
  });
});

describe("BFX3 sign-up — the account", () => {
  it("names the workspace after the person and keeps the name within the limit", async () => {
    const short = await register(signUp("Ada Lovelace", "ada@bfx3.test"));
    expect(short.org.name).toBe("Ada Lovelace's workspace");

    const longName = "Maximilian Alexander Bartholomew Fitzgerald-Montgomery Wolfeschlegelstein";
    expect(longName.length).toBeGreaterThan(64);
    const long = await register(signUp(longName, "max@bfx3.test"));
    expect(long.org.name.length).toBeLessThanOrEqual(64);
    expect(long.org.name.endsWith("'s workspace")).toBe(true);
    expect(long.org.name.startsWith("Maximilian")).toBe(true);
  });

  it("treats the email address case-insensitively at sign-up and sign-in", async () => {
    const { user } = await register(signUp("Casey Case", "Casey.Case@BFX3.Test"));
    expect(user.email).toBe("casey.case@bfx3.test");

    const stored = await userRepo.findUserById(user.id);
    expect(stored?.email).toBe("casey.case@bfx3.test");

    const signedIn = await login({ email: "CASEY.CASE@bfx3.test", password: PASSWORD, rememberMe: false });
    expect(signedIn.user.id).toBe(user.id);
    const principal = await resolveSession(signedIn.token);
    expect(principal?.userId).toBe(user.id);
    expect(principal?.email).toBe("casey.case@bfx3.test");
  });

  it("refuses an address that already has an account as a conflict and creates nothing", async () => {
    const { user, org } = await register(signUp("Dana First", "dana@bfx3.test"));
    const slugsBefore = await orgRepo.listTakenOrgSlugs("dana");

    const error = await errorOf(register(signUp("Dana Second", "DANA@bfx3.test")));
    expect(error).toBeInstanceOf(Error);
    expect(toAppError(error).code).toBe("conflict");

    const slugsAfter = await orgRepo.listTakenOrgSlugs("dana");
    expect(slugsAfter).toEqual(slugsBefore);
    expect(slugsAfter).toEqual([org.slug]);
    const found = await userRepo.findUserByEmail("dana@bfx3.test");
    expect(found?.id).toBe(user.id);
    expect(found?.name).toBe("Dana First");
  });

  it("starts the first workspace on Free with an active subscription and the person as owner", async () => {
    const { user, org } = await register(signUp("Owen Owner", "owen@bfx3.test"));
    expect(org.plan).toBe("free");
    expect(org.ownerId).toBe(user.id);

    const subscription = await subscriptionRepo.findSubscription(org.id);
    expect(subscription?.plan).toBe("free");
    expect(subscription?.status).toBe("active");

    const membership = await memberRepo.findMember(org.id, user.id);
    expect(membership?.role).toBe("owner");
    expect(membership?.status).toBe("active");
  });

  it("publishes member.joined for the owner exactly once", async () => {
    const seen: TaskflowEventMap["member.joined"][] = [];
    detachers.push(subscribe("member.joined", (payload) => { seen.push(payload); }));

    const { user, org } = await register(signUp("Jo Joiner", "jo@bfx3.test"));

    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ orgId: org.id, userId: user.id, role: "owner" });
  });

  it("sends one welcome email to the stored address, naming the workspace", async () => {
    const sendSpy = vi.spyOn(emailService, "sendEmail").mockResolvedValue(undefined);

    const { org } = await register(signUp("Wendy Welcome", "Wendy@BFX3.test"));

    const mails = sendSpy.mock.calls.map((call) => call[0]);
    expect(mails).toHaveLength(1);
    expect(mails[0]?.to).toBe("wendy@bfx3.test");
    expect(mails[0]?.subject).toContain(org.name);
  });
});

describe("BFX3 sign-up — throttling", () => {
  it("throttles sign-up on the auth:register bucket and reports rate_limited, creating nothing", async () => {
    const { capacity } = getBucketConfig("auth:register");
    for (let i = 0; i < capacity; i += 1) {
      await register(signUp(`Burst ${i}`, `burst-${i}@bfx3.test`));
    }

    const error = await errorOf(register(signUp("One Too Many", "toomany@bfx3.test")));
    expect(error).toBeInstanceOf(Error);
    const shape = toAppError(error);
    expect(shape.code).toBe("rate_limited");
    expect(shape.message).not.toContain("Something went wrong");

    expect(await userRepo.findUserByEmail("toomany@bfx3.test")).toBeNull();
    expect(await orgRepo.listTakenOrgSlugs("one-too-many")).toEqual([]);
  });

  it("lets sign-up through again once the bucket has refilled", async () => {
    const { capacity } = getBucketConfig("auth:register");
    for (let i = 0; i < capacity; i += 1) {
      await register(signUp(`Refill ${i}`, `refill-${i}@bfx3.test`));
    }
    expect(toAppError(await errorOf(register(signUp("Still Waiting", "waiting@bfx3.test")))).code).toBe(
      "rate_limited",
    );

    vi.setSystemTime(new Date(NOW.getTime() + 60 * 60_000));
    const { user } = await register(signUp("Patient Person", "patient@bfx3.test"));
    expect(user.email).toBe("patient@bfx3.test");
  });

  it("reports a throttled sign-in as rate_limited, not as an internal error", async () => {
    await register(signUp("Lee Login", "lee@bfx3.test"));
    const { capacity } = getBucketConfig("auth:login");
    for (let i = 0; i < capacity; i += 1) {
      await errorOf(login({ email: `nobody-${i}@bfx3.test`, password: PASSWORD, rememberMe: false }));
    }

    const error = await errorOf(login({ email: "lee@bfx3.test", password: PASSWORD, rememberMe: false }));
    expect(error).toBeInstanceOf(Error);
    expect(toAppError(error).code).toBe("rate_limited");
  });
});
