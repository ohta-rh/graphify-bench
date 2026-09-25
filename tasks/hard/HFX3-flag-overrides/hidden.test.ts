/**
 * HFX3 — per-workspace feature overrides.
 *
 * Switching an override off must stick (without disturbing the others), and a
 * feature that is tied to the plan alone can neither be switched on by an
 * admin nor be turned on by an override that is already stored.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);

import { isEnabled } from "@/lib/feature-flags";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as featureFlagService from "@/server/services/feature-flag-service";
import { createTenant, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { FeatureFlagKey } from "@/types/feature-flag";
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

async function snapshot(tenant: Tenant) {
  return featureFlagService.getSnapshot(tenant.actors.admin, await reload(tenant));
}

function toggle(tenant: Tenant, flag: FeatureFlagKey, enabled: boolean) {
  return featureFlagService.toggleFlag(tenant.actors.admin, {
    orgId: tenant.org.id,
    flag,
    enabled,
  });
}

describe("HFX3: switching an override off", () => {
  it("turns the feature back off for a plan that does not include it", async () => {
    const tenant = await createTenant("hfx3-off", "free");
    expect((await snapshot(tenant)).kanban_board).toBe(false);

    await toggle(tenant, "kanban_board", true);
    expect((await snapshot(tenant)).kanban_board).toBe(true);

    const updated = await toggle(tenant, "kanban_board", false);
    expect(updated.settings.enabledFlagOverrides).not.toContain("kanban_board");
    expect((await reload(tenant)).settings.enabledFlagOverrides).not.toContain("kanban_board");
    expect((await snapshot(tenant)).kanban_board).toBe(false);
  });

  it("leaves the workspace's other overrides alone", async () => {
    const tenant = await createTenant("hfx3-others", "starter");

    await toggle(tenant, "digest_email", true);
    await toggle(tenant, "activity_feed", true);
    await toggle(tenant, "digest_email", false);

    const org = await reload(tenant);
    expect([...org.settings.enabledFlagOverrides].sort()).toEqual(["activity_feed"]);

    const flags = await snapshot(tenant);
    expect(flags.digest_email).toBe(false);
    expect(flags.activity_feed).toBe(true);
    // Plan-included features are unaffected by the overrides.
    expect(flags.kanban_board).toBe(true);
  });

  it("can switch the same override on again after switching it off", async () => {
    const tenant = await createTenant("hfx3-again", "free");
    await toggle(tenant, "csv_export", true);
    await toggle(tenant, "csv_export", false);
    await toggle(tenant, "csv_export", true);

    expect((await reload(tenant)).settings.enabledFlagOverrides).toEqual(["csv_export"]);
    expect((await snapshot(tenant)).csv_export).toBe(true);
  });
});

describe("HFX3: plan-only features", () => {
  it("refuses to switch on a plan-only feature and stores nothing", async () => {
    const tenant = await createTenant("hfx3-refuse", "free");

    await expect(toggle(tenant, "webhooks", true)).rejects.toThrow();

    expect((await reload(tenant)).settings.enabledFlagOverrides).toEqual([]);
    expect((await snapshot(tenant)).webhooks).toBe(false);
  });

  it("ignores a plan-only override that is already stored", async () => {
    const tenant = await createTenant("hfx3-stored", "starter");
    await orgRepo.updateOrg(tenant.org.id, {
      orgId: tenant.org.id,
      settings: { enabledFlagOverrides: ["webhooks", "activity_feed"] },
    });

    const org = await reload(tenant);
    const flags = featureFlagService.getSnapshot(tenant.actors.owner, org);
    expect(flags.webhooks).toBe(false);
    expect(flags.activity_feed).toBe(true);
    expect(isEnabled("webhooks", featureFlagService.buildFlagContext(null, org))).toBe(false);
  });

  it("still honours the plan itself for plan-only features", async () => {
    const tenant = await createTenant("hfx3-growth", "growth");
    expect((await snapshot(tenant)).webhooks).toBe(true);
  });
});
