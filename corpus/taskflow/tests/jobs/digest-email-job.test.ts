/**
 * Runs only for orgs whose digest hour has arrived and whose plan includes it.
 *
 * Owner C implements `@/server/jobs/digest-email-job`. The window arithmetic
 * itself is covered by `tests/lib/date.test.ts`.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);

import { runDigestEmailJob } from "@/server/jobs/digest-email-job";
import * as notificationRepo from "@/server/repositories/notification-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as preferenceRepo from "@/server/repositories/notification-preference-repository";
import * as usageRepo from "@/server/repositories/usage-repository";
import * as emailService from "@/server/services/email-service";
import * as featureFlagService from "@/server/services/feature-flag-service";
import { DIGEST_MAX_ENTRIES } from "@/config/constants";
import { createTenant, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { PlanId } from "@/types/billing";

let cleanup: () => void;

/** `2026-06-01T0{hour}:00:00.000Z` — every test gets its own hour so a scan
 * driven by one test's `now` never also matches another test's org. */
function nowAtHour(hour: number): Date {
  return new Date(Date.UTC(2026, 5, 1, hour, 0, 0, 0));
}

/** Creates a tenant on `plan` whose digest fires only at `digestHourUtc`, and
 * registers it with the usage rollup so `listOrgIdsForRollup` finds it. */
async function makeTenant(
  slug: string,
  digestHourUtc: number,
  plan: PlanId = "growth",
): Promise<Tenant> {
  const tenant = await createTenant(slug, plan);
  await orgRepo.updateOrg(tenant.org.id, {
    orgId: tenant.org.id,
    settings: { digestHourUtc },
  });
  await usageRepo.recomputeUsage(tenant.org.id);
  return tenant;
}

/** Subscribes a member to the digest by setting one `digestOnly` preference. */
async function subscribeToDigest(tenant: Tenant): Promise<void> {
  await preferenceRepo.upsertPreference({
    orgId: tenant.org.id,
    userId: tenant.userIds.member,
    kind: "comment_created",
    inApp: false,
    email: false,
    digestOnly: true,
  });
}

async function insertNotificationAt(
  tenant: Tenant,
  at: Date,
  title: string,
): Promise<void> {
  vi.useFakeTimers();
  vi.setSystemTime(at);
  try {
    await notificationRepo.insertNotification(tenant.org.id, {
      orgId: tenant.org.id,
      recipientId: tenant.userIds.member,
      kind: "comment_created",
      title,
      body: title,
      href: "/issues/1",
      actorId: null,
      channels: ["email"],
    });
  } finally {
    vi.useRealTimers();
  }
}

/** Pulls a `<td>key</td><td>value</td>` cell out of the generic email table. */
function cell(html: string, key: string): string | null {
  const match = html.match(new RegExp(`<td>${key}</td><td>([^<]*)</td>`));
  return match?.[1] ?? null;
}

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

afterAll(() => {
  cleanup();
});

describe("jobs/digest-email-job", () => {
  it("uses the org's configured digest hour to pick the window", async () => {
    const now = nowAtHour(1);
    const tenant = await makeTenant("digest-window", 1);
    await subscribeToDigest(tenant);

    await insertNotificationAt(tenant, new Date(now.getTime() - 12 * 3_600_000), "Recent update");
    await insertNotificationAt(tenant, new Date(now.getTime() - 30 * 3_600_000), "Stale update");

    const sendSpy = vi.spyOn(emailService, "sendEmail").mockResolvedValue(undefined);

    await runDigestEmailJob(now);

    expect(sendSpy).toHaveBeenCalledTimes(1);
    const html = sendSpy.mock.calls[0]?.[0].html ?? "";
    expect(cell(html, "entryCount")).toBe("1");
    expect(cell(html, "headline")).toBe("Recent update");
  });

  it("skips an org whose digest hour has not arrived", async () => {
    const tenant = await makeTenant("digest-hour-not-yet", 2);
    await subscribeToDigest(tenant);
    await insertNotificationAt(tenant, new Date(nowAtHour(2).getTime() - 3_600_000), "Fresh");

    const sendSpy = vi.spyOn(emailService, "sendEmail").mockResolvedValue(undefined);

    // A run at an hour that does not match the org's configured hour.
    await runDigestEmailJob(nowAtHour(3));

    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("skips an org whose plan does not include digest_email", async () => {
    const now = nowAtHour(4);
    const tenant = await makeTenant("digest-free-plan", 4, "free");
    await subscribeToDigest(tenant);
    await insertNotificationAt(tenant, new Date(now.getTime() - 3_600_000), "Fresh");

    const sendSpy = vi.spyOn(emailService, "sendEmail").mockResolvedValue(undefined);

    await runDigestEmailJob(now);

    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("sends nothing to a recipient with an empty window", async () => {
    const now = nowAtHour(5);
    const tenant = await makeTenant("digest-empty-window", 5);
    await subscribeToDigest(tenant);
    // Nothing unread inside the window at all.

    const sendSpy = vi.spyOn(emailService, "sendEmail").mockResolvedValue(undefined);

    const result = await runDigestEmailJob(now);

    expect(sendSpy).not.toHaveBeenCalled();
    expect(result.processed).toBe(0);
  });

  it("caps the entries at DIGEST_MAX_ENTRIES", async () => {
    const now = nowAtHour(6);
    const tenant = await makeTenant("digest-cap", 6);
    await subscribeToDigest(tenant);

    for (let i = 0; i < DIGEST_MAX_ENTRIES + 5; i += 1) {
      await insertNotificationAt(
        tenant,
        new Date(now.getTime() - (i + 1) * 1_000),
        `Update ${i}`,
      );
    }

    const sendSpy = vi.spyOn(emailService, "sendEmail").mockResolvedValue(undefined);

    await runDigestEmailJob(now);

    expect(sendSpy).toHaveBeenCalledTimes(1);
    const html = sendSpy.mock.calls[0]?.[0].html ?? "";
    expect(cell(html, "entryCount")).toBe(String(DIGEST_MAX_ENTRIES));
  });

  it("does not resend a digest for an already-covered window", async () => {
    const now = nowAtHour(7);
    const tenant = await makeTenant("digest-no-resend", 7);
    await subscribeToDigest(tenant);
    await insertNotificationAt(tenant, new Date(now.getTime() - 3_600_000), "Once");

    const sendSpy = vi.spyOn(emailService, "sendEmail").mockResolvedValue(undefined);

    await runDigestEmailJob(now);
    expect(sendSpy).toHaveBeenCalledTimes(1);

    await runDigestEmailJob(now);
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it("constructs its own actor rather than reading cookies", async () => {
    const now = nowAtHour(8);
    const tenant = await makeTenant("digest-own-actor", 8);
    await subscribeToDigest(tenant);
    await insertNotificationAt(tenant, new Date(now.getTime() - 3_600_000), "Owns its actor");

    vi.spyOn(emailService, "sendEmail").mockResolvedValue(undefined);
    const contextSpy = vi.spyOn(featureFlagService, "buildFlagContext");

    await runDigestEmailJob(now);

    expect(contextSpy).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ id: tenant.org.id }),
    );
  });
});
