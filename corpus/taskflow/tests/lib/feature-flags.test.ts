/** Every rollout strategy plus the org override path. */
import { describe, expect, it } from "vitest";
import { FEATURE_FLAG_KEYS } from "@/config/feature-flags";
import {
  FeatureDisabledError,
  assertEnabled,
  isEnabled,
  snapshotFlags,
} from "@/lib/feature-flags";
import type { FlagContext } from "@/types/feature-flag";
import { ALICE, ORG_A } from "../helpers/factories";

function ctx(overrides: Partial<FlagContext> = {}): FlagContext {
  return { orgId: ORG_A, userId: ALICE, plan: "free", role: "member", ...overrides };
}

describe("lib/feature-flags", () => {
  it("always enables an `on` strategy and never an `off` one", () => {
    expect(isEnabled("command_palette", ctx())).toBe(true);
    expect(isEnabled("command_palette", ctx({ plan: "enterprise", role: "owner" }))).toBe(
      true,
    );
  });

  it("gates a `plan` strategy at the declared minimum plan", () => {
    expect(isEnabled("kanban_board", ctx({ plan: "free" }))).toBe(false);
    expect(isEnabled("kanban_board", ctx({ plan: "starter" }))).toBe(true);
    expect(isEnabled("kanban_board", ctx({ plan: "enterprise" }))).toBe(true);

    expect(isEnabled("activity_feed", ctx({ plan: "starter" }))).toBe(false);
    expect(isEnabled("activity_feed", ctx({ plan: "growth" }))).toBe(true);

    expect(isEnabled("public_projects", ctx({ plan: "growth" }))).toBe(false);
    expect(isEnabled("public_projects", ctx({ plan: "enterprise" }))).toBe(true);
  });

  it("gates a `role` strategy by role rank, not by role equality", () => {
    expect(isEnabled("issue_templates", ctx({ role: "member" }))).toBe(false);
    expect(isEnabled("issue_templates", ctx({ role: "admin" }))).toBe(true);
    expect(isEnabled("issue_templates", ctx({ role: "owner" }))).toBe(true);
    expect(isEnabled("issue_templates", ctx({ role: null }))).toBe(false);
  });

  it("keeps a percentage rollout stable for the same org and user", () => {
    const context = ctx({ plan: "free" });
    const first = isEnabled("ai_issue_summary", context);
    for (let i = 0; i < 20; i += 1) {
      expect(isEnabled("ai_issue_summary", context)).toBe(first);
    }
  });

  it("puts a percentage rollout on both sides of the bucket across users", () => {
    const decisions = new Set<boolean>();
    for (let i = 0; i < 60; i += 1) {
      decisions.add(
        isEnabled(
          "ai_issue_summary",
          ctx({ userId: `01USR${String(i).padStart(21, "0")}` as FlagContext["userId"] }),
        ),
      );
    }
    expect(decisions.size).toBe(2);
  });

  it("lets an org override turn on an overridable flag below its plan", () => {
    expect(isEnabled("kanban_board", ctx({ plan: "free" }))).toBe(false);
    expect(
      isEnabled("kanban_board", ctx({ plan: "free", overrides: ["kanban_board"] })),
    ).toBe(true);
  });

  it("ignores an override for a flag declared non-overridable", () => {
    expect(
      isEnabled("webhooks", ctx({ plan: "free", overrides: ["webhooks"] })),
    ).toBe(false);
  });

  it("snapshots every known flag as a boolean", () => {
    const snapshot = snapshotFlags(ctx({ plan: "growth", role: "admin" }));
    expect(Object.keys(snapshot).sort()).toEqual([...FEATURE_FLAG_KEYS].sort());
    for (const key of FEATURE_FLAG_KEYS) {
      expect(typeof snapshot[key], key).toBe("boolean");
    }
    expect(snapshot.activity_feed).toBe(true);
    expect(snapshot.public_projects).toBe(false);
  });

  it("agrees with `isEnabled` flag by flag", () => {
    const context = ctx({ plan: "starter", role: "viewer" });
    const snapshot = snapshotFlags(context);
    for (const key of FEATURE_FLAG_KEYS) {
      expect(snapshot[key], key).toBe(isEnabled(key, context));
    }
  });

  it("throws FeatureDisabledError from the guard, naming the flag", () => {
    expect(() => assertEnabled("webhooks", ctx({ plan: "free" }))).toThrow(
      FeatureDisabledError,
    );
    expect(() => assertEnabled("command_palette", ctx())).not.toThrow();

    try {
      assertEnabled("webhooks", ctx({ plan: "free" }));
    } catch (error) {
      expect((error as FeatureDisabledError).flag).toBe("webhooks");
      expect((error as FeatureDisabledError).code).toBe("forbidden");
    }
  });
});
