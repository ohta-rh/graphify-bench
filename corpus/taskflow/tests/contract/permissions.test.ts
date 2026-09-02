import { describe, expect, it } from "vitest";
import { can, explain, assertCan, PermissionDeniedError, ROLE_MATRIX } from "@/lib/permissions";
import type { Actor, Role } from "@/types/member";
import type { OrgId, UserId, IssueId, ProjectId, CommentId } from "@/types/common";
import type { PermissionAction, PermissionResource } from "@/types/permission";
import {
  commentIdSchema,
  issueIdSchema,
  orgIdSchema,
  projectIdSchema,
  userIdSchema,
} from "@/schemas/common";

const ORG = "01HZZZGGGGGGGGGGGGGGGGGGGG" as OrgId;
const OTHER_ORG = "01HZZZHHHHHHHHHHHHHHHHHHHH" as OrgId;
const ALICE = "01HZZZAAAAAAAAAAAAAAAAAAAA" as UserId;
const BOB = "01HZZZBBBBBBBBBBBBBBBBBBBB" as UserId;

function actor(role: Role, overrides: Partial<Actor> = {}): Actor {
  return { userId: ALICE, orgId: ORG, role, ...overrides };
}

const orgResource: PermissionResource = { kind: "organization", orgId: ORG };

function issueBy(authorId: UserId, assigneeId: UserId | null = null): PermissionResource {
  return {
    kind: "issue",
    orgId: ORG,
    projectId: "01HZZZPPPPPPPPPPPPPPPPPPPP" as ProjectId,
    issueId: "01HZZZSSSSSSSSSSSSSSSSSSSS" as IssueId,
    authorId,
    assigneeId,
  };
}

function commentBy(authorId: UserId): PermissionResource {
  return {
    kind: "comment",
    orgId: ORG,
    commentId: "01HZZZCCCCCCCCCCCCCCCCCCCC" as CommentId,
    authorId,
  };
}

describe("can()", () => {
  it("grants an action when the actor's role meets the matrix requirement", () => {
    expect(can(actor("owner"), "org:delete", orgResource)).toBe(true);
    expect(can(actor("admin"), "member:invite", { kind: "organization", orgId: ORG })).toBe(true);
    expect(can(actor("viewer"), "issue:read", issueBy(BOB))).toBe(true);
  });

  it("denies an action below the actor's role rank", () => {
    expect(can(actor("admin"), "org:delete", orgResource)).toBe(false);
    expect(can(actor("member"), "member:invite", orgResource)).toBe(false);
    expect(can(actor("viewer"), "issue:create", issueBy(ALICE))).toBe(false);
  });

  it("denies every action across a tenant boundary, even for an owner", () => {
    const foreign = actor("owner", { orgId: OTHER_ORG });
    for (const action of Object.keys(ROLE_MATRIX) as PermissionAction[]) {
      expect(can(foreign, action, orgResource)).toBe(false);
    }
    expect(explain(foreign, "org:read", orgResource).reason).toBe("denied_cross_tenant");
  });

  it("escalates for ownership: an author may edit their own issue and comment", () => {
    const viewer = actor("viewer");
    expect(can(viewer, "issue:update", issueBy(ALICE))).toBe(true);
    expect(can(viewer, "issue:update", issueBy(BOB))).toBe(false);
    expect(can(viewer, "comment:update", commentBy(ALICE))).toBe(true);
    expect(can(viewer, "comment:delete", commentBy(BOB))).toBe(false);
    expect(explain(viewer, "issue:update", issueBy(ALICE)).reason).toBe(
      "granted_by_ownership",
    );
  });

  it("does not escalate ownership for actions outside the escalation list", () => {
    expect(can(actor("viewer"), "issue:delete", issueBy(ALICE))).toBe(false);
  });

  it("lets platform staff bypass the matrix inside the tenant", () => {
    const staff = actor("viewer", { isPlatformStaff: true });
    expect(can(staff, "org:delete", orgResource)).toBe(true);
    expect(explain(staff, "org:delete", orgResource).reason).toBe("granted_by_staff");
  });

  it("assertCan throws PermissionDeniedError on a denial", () => {
    expect(() => assertCan(actor("viewer"), "org:delete", orgResource)).toThrow(
      PermissionDeniedError,
    );
    expect(() => assertCan(actor("owner"), "org:delete", orgResource)).not.toThrow();
  });

  it("keeps the matrix monotonic: a higher role never loses an action", () => {
    const ranks: Role[] = ["viewer", "member", "admin", "owner"];
    for (const action of Object.keys(ROLE_MATRIX) as PermissionAction[]) {
      let seenAllowed = false;
      for (const role of ranks) {
        const allowed = can(actor(role), action, orgResource);
        if (seenAllowed) expect(allowed).toBe(true);
        if (allowed) seenAllowed = true;
      }
    }
  });
});

describe("fixture ids", () => {
  // The ids above are cast with `as`, which skips validation. If a fixture
  // drifts outside Crockford base32 (no I, L, O, U) the permission tests keep
  // passing while every schema in `src/schemas` would reject the same value —
  // so the contract fixtures are checked against the real schema here.
  it("are valid ULIDs under the shared branded-id schemas", () => {
    expect(orgIdSchema.parse(ORG)).toBe(ORG);
    expect(orgIdSchema.parse(OTHER_ORG)).toBe(OTHER_ORG);
    expect(userIdSchema.parse(ALICE)).toBe(ALICE);
    expect(userIdSchema.parse(BOB)).toBe(BOB);

    const issue = issueBy(ALICE);
    if (issue.kind !== "issue") throw new Error("expected an issue resource");
    expect(projectIdSchema.parse(issue.projectId)).toBe(issue.projectId);
    expect(issueIdSchema.parse(issue.issueId)).toBe(issue.issueId);

    const comment = commentBy(ALICE);
    if (comment.kind !== "comment") {
      throw new Error("expected a comment resource");
    }
    expect(commentIdSchema.parse(comment.commentId)).toBe(comment.commentId);
  });

  it("rejects the excluded letters, which is why the fixtures avoid them", () => {
    expect(() => orgIdSchema.parse("01ORGAAAAAAAAAAAAAAAAAAAAA")).toThrow();
    expect(() => userIdSchema.parse("01USRAAAAAAAAAAAAAAAAAAAAA")).toThrow();
  });
});
