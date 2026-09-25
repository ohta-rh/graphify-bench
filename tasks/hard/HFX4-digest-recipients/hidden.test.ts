/**
 * HFX4 — the daily digest email.
 *
 * Only people who opted into the digest receive one; a busy day's digest
 * keeps the most recent updates, newest first; an archived workspace sends
 * no digest at all.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);

import { DIGEST_MAX_ENTRIES } from "@/config/constants";
import { runDigestEmailJob } from "@/server/jobs/digest-email-job";
import * as notificationRepo from "@/server/repositories/notification-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as preferenceRepo from "@/server/repositories/notification-preference-repository";
import * as usageRepo from "@/server/repositories/usage-repository";
import { buildDigest } from "@/server/services/digest-service";
import * as emailService from "@/server/services/email-service";
import * as organizationService from "@/server/services/organization-service";
import { toIsoTimestamp } from "@/types/common";
import { createTenant, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { UserId } from "@/types/common";

let cleanup: () => void;

const HOUR_MS = 3_600_000;

/** Every case uses its own digest hour so one case's run never picks up another's org. */
function nowAtHour(hour: number): Date {
  return new Date(Date.UTC(2026, 6, 15, hour, 0, 0, 0));
}

async function makeTenant(slug: string, digestHourUtc: number): Promise<Tenant> {
  const tenant = await createTenant(slug, "growth");
  await orgRepo.updateOrg(tenant.org.id, {
    orgId: tenant.org.id,
    settings: { digestHourUtc },
  });
  await usageRepo.recomputeUsage(tenant.org.id);
  return tenant;
}

async function optIntoDigest(tenant: Tenant, userId: UserId): Promise<void> {
  await preferenceRepo.upsertPreference({
    orgId: tenant.org.id,
    userId,
    kind: "comment_created",
    inApp: true,
    email: false,
    digestOnly: true,
  });
}

async function notifyAt(tenant: Tenant, recipientId: UserId, at: Date, title: string) {
  vi.useFakeTimers();
  vi.setSystemTime(at);
  try {
    return await notificationRepo.insertNotification(tenant.org.id, {
      orgId: tenant.org.id,
      recipientId,
      kind: "comment_created",
      title,
      body: title,
      href: "/issues/1",
      actorId: null,
      channels: ["in_app"],
    });
  } finally {
    vi.useRealTimers();
  }
}

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

describe("HFX4: who receives a digest", () => {
  it("mails only people who opted into the digest", async () => {
    const now = nowAtHour(10);
    const tenant = await makeTenant("hfx4-optin", 10);

    await optIntoDigest(tenant, tenant.userIds.member);
    // The admin tuned a notification setting but never asked for the digest.
    await preferenceRepo.upsertPreference({
      orgId: tenant.org.id,
      userId: tenant.userIds.admin,
      kind: "comment_created",
      inApp: false,
      email: true,
      digestOnly: false,
    });

    await notifyAt(tenant, tenant.userIds.member, new Date(now.getTime() - 2 * HOUR_MS), "For member");
    await notifyAt(tenant, tenant.userIds.admin, new Date(now.getTime() - 2 * HOUR_MS), "For admin");

    const sendSpy = vi.spyOn(emailService, "sendEmail").mockResolvedValue(undefined);
    await runDigestEmailJob(now);

    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy.mock.calls[0]?.[0].to).toBe("member@hfx4-optin.test");
  });
});

describe("HFX4: a busy day's digest", () => {
  it("keeps the most recent updates, newest first", async () => {
    const now = nowAtHour(11);
    const tenant = await makeTenant("hfx4-busy", 11);
    await optIntoDigest(tenant, tenant.userIds.member);

    const total = DIGEST_MAX_ENTRIES + 7;
    // Update 0 is the most recent, update total-1 the oldest; all inside the window.
    for (let i = total - 1; i >= 0; i -= 1) {
      await notifyAt(
        tenant,
        tenant.userIds.member,
        new Date(now.getTime() - (i + 1) * 60_000),
        `Update ${i}`,
      );
    }

    const bundle = await buildDigest(
      tenant.org.id,
      tenant.userIds.member,
      toIsoTimestamp(new Date(now.getTime() - 24 * HOUR_MS)),
      toIsoTimestamp(now),
    );

    expect(bundle).not.toBeNull();
    const titles = bundle!.entries.map((entry) => entry.title);
    expect(titles).toHaveLength(DIGEST_MAX_ENTRIES);
    expect(titles).toEqual(
      Array.from({ length: DIGEST_MAX_ENTRIES }, (_, i) => `Update ${i}`),
    );
  });

  it("leads the digest email with the most recent update", async () => {
    const now = nowAtHour(12);
    const tenant = await makeTenant("hfx4-headline", 12);
    await optIntoDigest(tenant, tenant.userIds.member);

    for (let i = DIGEST_MAX_ENTRIES + 2; i >= 0; i -= 1) {
      await notifyAt(
        tenant,
        tenant.userIds.member,
        new Date(now.getTime() - (i + 1) * 60_000),
        `Headline ${i}`,
      );
    }

    const sendSpy = vi.spyOn(emailService, "sendEmail").mockResolvedValue(undefined);
    await runDigestEmailJob(now);

    expect(sendSpy).toHaveBeenCalledTimes(1);
    const html = sendSpy.mock.calls[0]?.[0].html ?? "";
    expect(cell(html, "entryCount")).toBe(String(DIGEST_MAX_ENTRIES));
    expect(cell(html, "headline")).toBe("Headline 0");
  });
});

describe("HFX4: archived workspaces", () => {
  it("sends no digest for an archived workspace", async () => {
    const now = nowAtHour(13);
    const tenant = await makeTenant("hfx4-archived", 13);
    await optIntoDigest(tenant, tenant.userIds.member);
    await notifyAt(tenant, tenant.userIds.member, new Date(now.getTime() - HOUR_MS), "Too late");

    await organizationService.deleteOrganization(tenant.actors.owner, {
      orgId: tenant.org.id,
      confirmSlug: tenant.org.slug,
    });
    expect((await orgRepo.findOrgById(tenant.org.id))?.archivedAt).not.toBeNull();

    const sendSpy = vi.spyOn(emailService, "sendEmail").mockResolvedValue(undefined);
    await runDigestEmailJob(now);

    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("keeps mailing a live workspace at its digest hour", async () => {
    const now = nowAtHour(14);
    const tenant = await makeTenant("hfx4-live", 14);
    await optIntoDigest(tenant, tenant.userIds.member);
    await notifyAt(tenant, tenant.userIds.member, new Date(now.getTime() - HOUR_MS), "Still here");

    const sendSpy = vi.spyOn(emailService, "sendEmail").mockResolvedValue(undefined);
    await runDigestEmailJob(now);

    expect(sendSpy).toHaveBeenCalledTimes(1);
  });
});
