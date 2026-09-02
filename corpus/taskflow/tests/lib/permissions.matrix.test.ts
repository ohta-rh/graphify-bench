/**
 * Exhaustive role×action sweep of `ROLE_MATRIX`, including ownership
 * escalations and the cross-tenant denial.
 */
import { describe, expect, it } from "vitest";
import { ROLE_MATRIX, can, canAll, explain } from "@/lib/permissions";
import type { IssueId, ProjectId } from "@/types/common";
import { ROLES, ROLE_RANK, type Role } from "@/types/member";
import type { PermissionAction, PermissionResource } from "@/types/permission";
import { ALICE, BOB, ORG_A, ORG_B, makeActor } from "../helpers/factories";

const ACTIONS = Object.keys(ROLE_MATRIX) as readonly PermissionAction[];

/**
 * A resource in ORG_A owned by nobody the actor is, so the sweep measures the
 * matrix alone and never trips an ownership escalation.
 */
const foreignOwned: PermissionResource = {
  kind: "issue",
  orgId: ORG_A,
  projectId: "01HZZZPPPPPPPPPPPPPPPPPPPP" as ProjectId,
  issueId: "01HZZZSSSSSSSSSSSSSSSSSSSS" as IssueId,
  authorId: BOB,
  assigneeId: BOB,
};

const orgResource: PermissionResource = { kind: "organization", orgId: ORG_A };

describe("permissions matrix", () => {
  it("covers every declared action", () => {
    expect(ACTIONS.length).toBeGreaterThan(20);
    for (const action of ACTIONS) {
      expect(ROLES).toContain(ROLE_MATRIX[action]);
    }
  });

  it("grants exactly the roles at or above the required rank", () => {
    for (const action of ACTIONS) {
      const required = ROLE_MATRIX[action];
      for (const role of ROLES) {
        const expected = ROLE_RANK[role] >= ROLE_RANK[required];
        expect(
          can(makeActor({ role, userId: ALICE }), action, foreignOwned),
          `${role} → ${action}`,
        ).toBe(expected);
      }
    }
  });

  it("reports `granted_by_role` and `denied_by_role` as the reason", () => {
    expect(explain(makeActor({ role: "owner" }), "org:delete", orgResource).reason).toBe(
      "granted_by_role",
    );
    expect(explain(makeActor({ role: "admin" }), "org:delete", orgResource).reason).toBe(
      "denied_by_role",
    );
  });

  it("denies every action across a tenant boundary, whatever the role", () => {
    for (const role of ROLES) {
      const foreign = makeActor({ role, orgId: ORG_B });
      for (const action of ACTIONS) {
        expect(can(foreign, action, orgResource), `${role} → ${action}`).toBe(false);
      }
    }
    expect(explain(makeActor({ orgId: ORG_B }), "org:read", orgResource).reason).toBe(
      "denied_cross_tenant",
    );
  });

  it("checks the tenant boundary before the staff bypass", () => {
    const staff = makeActor({ orgId: ORG_B, isPlatformStaff: true, role: "owner" });
    expect(can(staff, "org:read", orgResource)).toBe(false);
    expect(explain(staff, "org:read", orgResource).reason).toBe("denied_cross_tenant");
  });

  it("lets platform staff bypass the matrix inside their own tenant", () => {
    const staff = makeActor({ role: "viewer", isPlatformStaff: true });
    for (const action of ACTIONS) {
      expect(can(staff, action, orgResource), action).toBe(true);
    }
    expect(explain(staff, "org:delete", orgResource).reason).toBe("granted_by_staff");
  });

  it("puts billing and deletion behind the owner role alone", () => {
    for (const action of ["org:delete", "org:manage_billing", "project:delete"] as const) {
      expect(ROLE_MATRIX[action]).toBe("owner");
      expect(can(makeActor({ role: "admin" }), action, orgResource)).toBe(false);
      expect(can(makeActor({ role: "owner" }), action, orgResource)).toBe(true);
    }
  });

  it("keeps the everyday read actions available to a viewer", () => {
    for (const action of [
      "org:read",
      "member:read",
      "project:read",
      "issue:read",
      "comment:read",
      "notification:read",
    ] as const) {
      expect(ROLE_MATRIX[action], action).toBe("viewer");
      expect(can(makeActor({ role: "viewer" }), action, orgResource), action).toBe(true);
    }
  });

  it("holds the audit trail above viewer, unlike the other reads", () => {
    expect(ROLE_MATRIX["activity:read"]).toBe("member");
    expect(can(makeActor({ role: "viewer" }), "activity:read", orgResource)).toBe(false);
    expect(can(makeActor({ role: "member" }), "activity:read", orgResource)).toBe(true);
  });

  it("requires every listed action to pass in the bulk form", () => {
    const admin = makeActor({ role: "admin" });
    expect(canAll(admin, ["member:read", "member:invite"], orgResource)).toBe(true);
    expect(canAll(admin, ["member:invite", "org:delete"], orgResource)).toBe(false);
    expect(canAll(makeActor({ role: "viewer" }), [], orgResource)).toBe(true);
  });

  it("reports `denied_unknown_action` for an action outside the vocabulary", () => {
    const decision = explain(
      makeActor({ role: "owner" }),
      "issue:teleport" as PermissionAction,
      orgResource,
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("denied_unknown_action");
  });

  it("names the resource kind that was asked about", () => {
    const roles: readonly Role[] = ["owner", "viewer"];
    for (const role of roles) {
      expect(explain(makeActor({ role }), "org:read", orgResource).resourceKind).toBe(
        "organization",
      );
      expect(explain(makeActor({ role }), "issue:read", foreignOwned).resourceKind).toBe(
        "issue",
      );
    }
  });
});
