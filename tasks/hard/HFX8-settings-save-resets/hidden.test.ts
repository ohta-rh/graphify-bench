/**
 * Hidden test for HFX8: saving some workspace settings must change exactly
 * the settings that were sent. Everything else — the flag switches an admin
 * turned on, the digest hour, the other toggles — must survive, while values
 * that *are* sent (including 0, false and an empty list) still apply.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);

import { shouldRunForOrg } from "@/server/jobs/digest-email-job";
import * as notificationRepo from "@/server/repositories/notification-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import { buildDigest } from "@/server/services/digest-service";
import * as featureFlagService from "@/server/services/feature-flag-service";
import * as organizationService from "@/server/services/organization-service";
import { createTenant, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { IsoTimestamp } from "@/types/common";
import type { Organization } from "@/types/organization";

let cleanup: () => void;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
});

afterAll(() => {
  cleanup();
});

async function reload(tenant: Tenant): Promise<Organization> {
  const org = await orgRepo.findOrgById(tenant.org.id);
  if (!org) throw new Error("org vanished");
  return org;
}

async function unreadAt(tenant: Tenant, at: Date): Promise<void> {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at);
  try {
    await notificationRepo.insertNotification(tenant.org.id, {
      orgId: tenant.org.id,
      recipientId: tenant.userIds.member,
      kind: "comment_created",
      title: "Something happened",
      body: "Something happened",
      href: "/issues/1",
      actorId: null,
      channels: ["in_app"],
    });
  } finally {
    vi.useRealTimers();
  }
}

describe("saving workspace settings", () => {
  it("keeps admin-enabled flags and the digest hour when another setting is saved", async () => {
    const tenant = await createTenant("settings-starter", "starter");
    const admin = tenant.actors.admin;
    const orgId = tenant.org.id;

    await featureFlagService.toggleFlag(admin, { orgId, flag: "digest_email", enabled: true });
    await featureFlagService.toggleFlag(admin, { orgId, flag: "activity_feed", enabled: true });
    await organizationService.updateOrganization(admin, {
      orgId,
      settings: { digestHourUtc: 18, requireTwoFactor: true },
    });

    // The edit that used to wipe everything else.
    const saved = await organizationService.updateOrganization(admin, {
      orgId,
      settings: { defaultIssueStatus: "todo" },
    });
    expect(saved.settings.defaultIssueStatus).toBe("todo");

    const org = await reload(tenant);
    expect(org.settings.defaultIssueStatus).toBe("todo");
    expect(org.settings.digestHourUtc).toBe(18);
    expect(org.settings.requireTwoFactor).toBe(true);
    expect(org.settings.allowPublicProjects).toBe(false);
    expect([...org.settings.enabledFlagOverrides].sort()).toEqual([
      "activity_feed",
      "digest_email",
    ]);

    // What the admins actually noticed.
    const snapshot = featureFlagService.getSnapshot(admin, org);
    expect(snapshot.digest_email).toBe(true);
    expect(snapshot.activity_feed).toBe(true);

    expect(shouldRunForOrg(org, new Date("2026-06-01T18:00:00.000Z"))).toBe(true);
    expect(shouldRunForOrg(org, new Date("2026-06-01T07:00:00.000Z"))).toBe(false);

    await unreadAt(tenant, new Date("2026-06-01T12:00:00.000Z"));
    const bundle = await buildDigest(
      orgId,
      tenant.userIds.member,
      "2026-05-31T18:00:00.000Z" as IsoTimestamp,
      "2026-06-01T18:00:00.000Z" as IsoTimestamp,
    );
    expect(bundle).not.toBeNull();
    expect(bundle?.entries).toHaveLength(1);
  });

  it("keeps every setting when only the name changes", async () => {
    const tenant = await createTenant("settings-rename", "growth");
    const admin = tenant.actors.admin;
    const orgId = tenant.org.id;

    await organizationService.updateOrganization(admin, {
      orgId,
      settings: { digestHourUtc: 21, allowPublicProjects: true },
    });
    await organizationService.updateOrganization(admin, { orgId, name: "Renamed Inc" });

    const org = await reload(tenant);
    expect(org.name).toBe("Renamed Inc");
    expect(org.settings.digestHourUtc).toBe(21);
    expect(org.settings.allowPublicProjects).toBe(true);
  });

  it("still applies values that are sent on purpose, including 0, false and []", async () => {
    const tenant = await createTenant("settings-explicit", "starter");
    const admin = tenant.actors.admin;
    const orgId = tenant.org.id;

    await featureFlagService.toggleFlag(admin, { orgId, flag: "digest_email", enabled: true });
    await organizationService.updateOrganization(admin, {
      orgId,
      settings: {
        digestHourUtc: 18,
        requireTwoFactor: true,
        allowPublicProjects: true,
        defaultIssueStatus: "in_progress",
      },
    });

    await organizationService.updateOrganization(admin, {
      orgId,
      settings: { digestHourUtc: 0 },
    });
    await organizationService.updateOrganization(admin, {
      orgId,
      settings: { requireTwoFactor: false },
    });

    let org = await reload(tenant);
    expect(org.settings.digestHourUtc).toBe(0);
    expect(org.settings.requireTwoFactor).toBe(false);
    expect(org.settings.allowPublicProjects).toBe(true);
    expect(org.settings.defaultIssueStatus).toBe("in_progress");
    expect(org.settings.enabledFlagOverrides).toEqual(["digest_email"]);

    await organizationService.updateOrganization(admin, {
      orgId,
      settings: { enabledFlagOverrides: [] },
    });

    org = await reload(tenant);
    expect(org.settings.enabledFlagOverrides).toEqual([]);
    expect(org.settings.digestHourUtc).toBe(0);
    expect(org.settings.allowPublicProjects).toBe(true);
    expect(featureFlagService.getSnapshot(admin, org).digest_email).toBe(false);
  });

  it("never touches another workspace's settings", async () => {
    const mine = await createTenant("settings-mine", "starter");
    const theirs = await createTenant("settings-theirs", "starter");

    await featureFlagService.toggleFlag(theirs.actors.admin, {
      orgId: theirs.org.id,
      flag: "digest_email",
      enabled: true,
    });
    await organizationService.updateOrganization(theirs.actors.admin, {
      orgId: theirs.org.id,
      settings: { digestHourUtc: 5 },
    });

    await organizationService.updateOrganization(mine.actors.admin, {
      orgId: mine.org.id,
      settings: { defaultIssueStatus: "todo", digestHourUtc: 9 },
    });

    const other = await reload(theirs);
    expect(other.settings.digestHourUtc).toBe(5);
    expect(other.settings.defaultIssueStatus).toBe("backlog");
    expect(other.settings.enabledFlagOverrides).toEqual(["digest_email"]);
  });
});
