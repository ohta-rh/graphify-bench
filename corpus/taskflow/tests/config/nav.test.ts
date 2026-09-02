/** `visibleNav` filters by permission and by flag. */
import { describe, expect, it } from "vitest";
import { SETTINGS_NAV, SIDEBAR_NAV, visibleNav } from "@/config/nav";
import { snapshotFlags } from "@/lib/feature-flags";
import type { FeatureFlagSnapshot } from "@/types/feature-flag";
import type { PlanId } from "@/types/billing";
import type { Role } from "@/types/member";
import { ALICE, ORG_A, makeActor } from "../helpers/factories";

function flagsFor(plan: PlanId, role: Role): FeatureFlagSnapshot {
  return snapshotFlags({ orgId: ORG_A, userId: ALICE, plan, role });
}

function keysOf(items: readonly { key: string }[]): readonly string[] {
  return items.map((item) => item.key);
}

describe("config/nav", () => {
  it("declares a permission for every nav entry", () => {
    for (const item of [...SIDEBAR_NAV, ...SETTINGS_NAV]) {
      expect(item.action, item.key).toBeDefined();
      expect(item.key).not.toBe("");
    }
  });

  it("shows an owner on an enterprise plan the full sidebar", () => {
    const visible = visibleNav(
      SIDEBAR_NAV,
      makeActor({ role: "owner" }),
      flagsFor("enterprise", "owner"),
    );
    expect(keysOf(visible)).toEqual(keysOf(SIDEBAR_NAV));
  });

  it("hides the activity feed from a viewer, who lacks activity:read", () => {
    const visible = visibleNav(
      SIDEBAR_NAV,
      makeActor({ role: "viewer" }),
      flagsFor("enterprise", "viewer"),
    );
    expect(keysOf(visible)).not.toContain("activity");
    expect(keysOf(visible)).toContain("overview");
  });

  it("hides a flagged entry when the plan does not include the flag", () => {
    const free = visibleNav(
      SIDEBAR_NAV,
      makeActor({ role: "owner" }),
      flagsFor("free", "owner"),
    );
    expect(keysOf(free)).not.toContain("activity");

    const growth = visibleNav(
      SIDEBAR_NAV,
      makeActor({ role: "owner" }),
      flagsFor("growth", "owner"),
    );
    expect(keysOf(growth)).toContain("activity");
  });

  it("filters children independently of the parent", () => {
    const issues = visibleNav(
      SIDEBAR_NAV,
      makeActor({ role: "owner" }),
      flagsFor("free", "owner"),
    ).find((item) => item.key === "issues");

    expect(issues).toBeDefined();
    expect(keysOf(issues?.children ?? [])).toEqual(["issues.assigned"]);
  });

  it("keeps the board and advanced search once the plan includes them", () => {
    const issues = visibleNav(
      SIDEBAR_NAV,
      makeActor({ role: "owner" }),
      flagsFor("enterprise", "owner"),
    ).find((item) => item.key === "issues");

    expect(keysOf(issues?.children ?? [])).toEqual([
      "issues.assigned",
      "issues.board",
      "issues.search",
    ]);
  });

  it("shows an admin every settings page except billing", () => {
    const visible = visibleNav(
      SETTINGS_NAV,
      makeActor({ role: "admin" }),
      flagsFor("enterprise", "admin"),
    );
    expect(keysOf(visible)).toContain("settings.flags");
    expect(keysOf(visible)).not.toContain("settings.billing");
  });

  it("shows billing to an owner", () => {
    const visible = visibleNav(
      SETTINGS_NAV,
      makeActor({ role: "owner" }),
      flagsFor("enterprise", "owner"),
    );
    expect(keysOf(visible)).toContain("settings.billing");
  });

  it("hides webhooks and export on a plan without those flags", () => {
    const visible = visibleNav(
      SETTINGS_NAV,
      makeActor({ role: "owner" }),
      flagsFor("free", "owner"),
    );
    expect(keysOf(visible)).not.toContain("settings.webhooks");
    expect(keysOf(visible)).not.toContain("settings.export");
  });

  it("never mutates the source tree", () => {
    const before = JSON.stringify(SIDEBAR_NAV);
    visibleNav(SIDEBAR_NAV, makeActor({ role: "viewer" }), flagsFor("free", "viewer"));
    expect(JSON.stringify(SIDEBAR_NAV)).toBe(before);
  });

  it("returns nothing for an empty input tree", () => {
    expect(
      visibleNav([], makeActor({ role: "owner" }), flagsFor("enterprise", "owner")),
    ).toEqual([]);
  });
});
