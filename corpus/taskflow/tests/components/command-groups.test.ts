import { describe, expect, it } from "vitest";
import { buildCommandGroups } from "@/hooks/command-groups";
import { snapshotFlags } from "@/lib/feature-flags";
import { toIsoTimestamp } from "@/types/common";
import type { OrgId, UserId } from "@/types/common";
import type { PlanId } from "@/types/billing";
import type { Actor, Role } from "@/types/member";
import type { Organization } from "@/types/organization";

const ORG_ID = "org_1" as OrgId;

function org(plan: PlanId): Organization {
  const at = toIsoTimestamp("2026-01-01T00:00:00.000Z");
  return {
    id: ORG_ID,
    name: "Acme",
    slug: "acme",
    ownerId: "usr_owner" as UserId,
    plan,
    logoUrl: null,
    trialEndsAt: null,
    archivedAt: null,
    createdAt: at,
    updatedAt: at,
    settings: {
      defaultIssueStatus: "backlog",
      allowPublicProjects: false,
      requireTwoFactor: false,
      digestHourUtc: 8,
      enabledFlagOverrides: [],
    },
  };
}

function actor(role: Role): Actor {
  return { userId: "usr_1" as UserId, orgId: ORG_ID, role };
}

function idsFor(plan: PlanId, role: Role): readonly string[] {
  const organization = org(plan);
  const principal = actor(role);
  const flags = snapshotFlags({
    orgId: ORG_ID,
    userId: principal.userId,
    plan,
    role,
  });
  return buildCommandGroups(organization, principal, flags).flatMap((group) =>
    group.items.map((item) => item.id),
  );
}

describe("command-groups", () => {
  it("offers creation commands to a member", () => {
    const ids = idsFor("growth", "member");
    expect(ids).toContain("create:issue");
    expect(ids).toContain("create:project");
  });

  it("withholds invite and billing from a member", () => {
    const ids = idsFor("growth", "member");
    expect(ids).not.toContain("create:invite");
    expect(ids).not.toContain("nav:billing");
  });

  it("gives billing to the owner only", () => {
    expect(idsFor("growth", "owner")).toContain("nav:billing");
    expect(idsFor("growth", "admin")).not.toContain("nav:billing");
  });

  it("hides the board until the plan includes the kanban flag", () => {
    expect(idsFor("free", "admin")).not.toContain("nav:board");
    expect(idsFor("starter", "admin")).toContain("nav:board");
  });

  it("hides the activity feed below the growth plan", () => {
    expect(idsFor("starter", "admin")).not.toContain("nav:activity");
    expect(idsFor("growth", "admin")).toContain("nav:activity");
  });

  it("requires both the CSV flag and activity:export for the audit export", () => {
    // starter has csv_export but a member lacks activity:export
    expect(idsFor("starter", "member")).not.toContain("export:activity");
    expect(idsFor("starter", "admin")).toContain("export:activity");
    // free has no csv_export at all
    expect(idsFor("free", "owner")).not.toContain("export:activity");
  });

  it("gives a viewer navigation but no creation commands", () => {
    const ids = idsFor("enterprise", "viewer");
    expect(ids).toContain("nav:issues");
    expect(ids).not.toContain("create:issue");
  });

  it("groups items under their headings", () => {
    const groups = buildCommandGroups(
      org("enterprise"),
      actor("owner"),
      snapshotFlags({
        orgId: ORG_ID,
        userId: "usr_1" as UserId,
        plan: "enterprise",
        role: "owner",
      }),
    );
    expect(groups.map((group) => group.heading)).toEqual([
      "Create",
      "Go to",
      "Export",
    ]);
  });
});
