/** Author/assignee escalations for issues and comments. */
import { describe, expect, it } from "vitest";
import { PermissionDeniedError, assertCan, can, explain } from "@/lib/permissions";
import type { CommentId, IssueId, MemberId, ProjectId } from "@/types/common";
import type { PermissionResource } from "@/types/permission";
import { ALICE, BOB, ORG_A, makeActor } from "../helpers/factories";

const PROJECT = "01HZZZPPPPPPPPPPPPPPPPPPPP" as ProjectId;

function issue(
  authorId = BOB,
  assigneeId: typeof ALICE | typeof BOB | null = null,
): PermissionResource {
  return {
    kind: "issue",
    orgId: ORG_A,
    projectId: PROJECT,
    issueId: "01HZZZSSSSSSSSSSSSSSSSSSSS" as IssueId,
    authorId,
    assigneeId,
  };
}

function comment(authorId = BOB): PermissionResource {
  return {
    kind: "comment",
    orgId: ORG_A,
    commentId: "01HZZZCCCCCCCCCCCCCCCCCCCC" as CommentId,
    authorId,
  };
}

const viewer = makeActor({ role: "viewer", userId: ALICE });

describe("permissions ownership escalations", () => {
  it("lets an author update their own issue despite lacking the role", () => {
    expect(can(viewer, "issue:update", issue(BOB))).toBe(false);
    expect(can(viewer, "issue:update", issue(ALICE))).toBe(true);
    expect(explain(viewer, "issue:update", issue(ALICE)).reason).toBe(
      "granted_by_ownership",
    );
  });

  it("lets the assignee update and archive an issue they did not author", () => {
    expect(can(viewer, "issue:update", issue(BOB, ALICE))).toBe(true);
    expect(can(viewer, "issue:archive", issue(BOB, ALICE))).toBe(true);
  });

  it("does not escalate deletion, which stays an admin action", () => {
    expect(can(viewer, "issue:delete", issue(ALICE, ALICE))).toBe(false);
    expect(explain(viewer, "issue:delete", issue(ALICE)).reason).toBe("denied_by_role");
  });

  it("lets a comment author edit and delete their own comment", () => {
    expect(can(viewer, "comment:update", comment(ALICE))).toBe(true);
    expect(can(viewer, "comment:delete", comment(ALICE))).toBe(true);
    expect(can(viewer, "comment:update", comment(BOB))).toBe(false);
    expect(can(viewer, "comment:delete", comment(BOB))).toBe(false);
  });

  it("does not escalate comment creation, which needs the member role", () => {
    expect(can(viewer, "comment:create", comment(ALICE))).toBe(false);
  });

  it("lets a recipient manage their own notification", () => {
    const own: PermissionResource = {
      kind: "notification",
      orgId: ORG_A,
      recipientId: ALICE,
    };
    const other: PermissionResource = {
      kind: "notification",
      orgId: ORG_A,
      recipientId: BOB,
    };
    // `notification:manage` is a viewer action anyway, so both pass by role.
    expect(can(viewer, "notification:manage", own)).toBe(true);
    expect(can(viewer, "notification:manage", other)).toBe(true);
  });

  it("does not escalate a project action for the project lead", () => {
    const led: PermissionResource = {
      kind: "project",
      orgId: ORG_A,
      projectId: PROJECT,
      visibility: "org",
      leadId: ALICE,
    };
    // `project:archive` is not in the escalation list, so the lead still needs admin.
    expect(can(viewer, "project:archive", led)).toBe(false);
    expect(can(makeActor({ role: "admin" }), "project:archive", led)).toBe(true);
  });

  it("does not let a member escalate their own role", () => {
    const self: PermissionResource = {
      kind: "member",
      orgId: ORG_A,
      memberId: "01HZZZMMMMMMMMMMMMMMMMMMMM" as MemberId,
      targetUserId: ALICE,
      targetRole: "member",
    };
    expect(can(makeActor({ role: "member" }), "member:update_role", self)).toBe(false);
  });

  it("keeps ownership subordinate to the tenant boundary", () => {
    const foreignActor = makeActor({ role: "viewer", userId: ALICE, orgId: ORG_A });
    const foreignIssue: PermissionResource = {
      ...issue(ALICE, ALICE),
      orgId: "01HZZZBBBBBBBBBBBBBBBBBBBB" as PermissionResource["orgId"],
    };
    expect(can(foreignActor, "issue:update", foreignIssue)).toBe(false);
    expect(explain(foreignActor, "issue:update", foreignIssue).reason).toBe(
      "denied_cross_tenant",
    );
  });

  it("throws PermissionDeniedError carrying the decision from assertCan", () => {
    expect(() => assertCan(viewer, "issue:update", issue(ALICE))).not.toThrow();
    expect(() => assertCan(viewer, "issue:update", issue(BOB))).toThrow(
      PermissionDeniedError,
    );

    try {
      assertCan(viewer, "issue:update", issue(BOB));
      expect.unreachable("assertCan should have thrown");
    } catch (error) {
      const denied = error as PermissionDeniedError;
      expect(denied.code).toBe("forbidden");
      expect(denied.action).toBe("issue:update");
      expect(denied.decision.reason).toBe("denied_by_role");
    }
  });
});
