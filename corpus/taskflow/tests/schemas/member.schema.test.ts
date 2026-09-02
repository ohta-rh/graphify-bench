/** Invitable roles and the bulk-invite cap. */
import { describe, expect, it } from "vitest";
import {
  acceptInvitationSchema,
  inviteMemberSchema,
  inviteMembersSchema,
  listMembersSchema,
  removeMemberSchema,
  updateMemberRoleSchema,
  updateProfileSchema,
} from "@/schemas/member";
import { invitableRoleSchema, roleSchema } from "@/schemas/role";
import { ROLES } from "@/types/member";
import { ALICE, ORG_A } from "../helpers/factories";

const MEMBER = "01HZZZMMMMMMMMMMMMMMMMMMMM";

describe("schemas/member", () => {
  it("accepts every role in the role schema", () => {
    for (const role of ROLES) {
      expect(roleSchema.safeParse(role).success, role).toBe(true);
    }
    expect(roleSchema.safeParse("superadmin").success).toBe(false);
  });

  it("refuses to invite an owner — ownership is transferred, not granted", () => {
    expect(invitableRoleSchema.safeParse("owner").success).toBe(false);
    for (const role of ["admin", "member", "viewer"]) {
      expect(invitableRoleSchema.safeParse(role).success, role).toBe(true);
    }
    expect(
      inviteMemberSchema.safeParse({ orgId: ORG_A, email: "a@b.co", role: "owner" })
        .success,
    ).toBe(false);
  });

  it("defaults an invite to the member role and lowercases the email", () => {
    expect(inviteMemberSchema.parse({ orgId: ORG_A, email: "New@Example.com" })).toEqual({
      orgId: ORG_A,
      email: "new@example.com",
      role: "member",
    });
  });

  it("caps the optional invite message", () => {
    expect(
      inviteMemberSchema.safeParse({
        orgId: ORG_A,
        email: "a@b.co",
        message: "x".repeat(501),
      }).success,
    ).toBe(false);
  });

  it("requires at least one and at most fifty bulk invites", () => {
    const invite = { email: "a@b.co" };
    expect(inviteMembersSchema.safeParse({ orgId: ORG_A, invites: [] }).success).toBe(
      false,
    );
    expect(
      inviteMembersSchema.safeParse({ orgId: ORG_A, invites: Array(50).fill(invite) })
        .success,
    ).toBe(true);
    expect(
      inviteMembersSchema.safeParse({ orgId: ORG_A, invites: Array(51).fill(invite) })
        .success,
    ).toBe(false);
  });

  it("defaults each bulk invite's role individually", () => {
    const parsed = inviteMembersSchema.parse({
      orgId: ORG_A,
      invites: [{ email: "a@b.co" }, { email: "c@d.co", role: "viewer" }],
    });
    expect(parsed.invites[0]?.role).toBe("member");
    expect(parsed.invites[1]?.role).toBe("viewer");
  });

  it("allows a role change to owner, unlike an invite", () => {
    expect(
      updateMemberRoleSchema.safeParse({
        orgId: ORG_A,
        memberId: MEMBER,
        role: "owner",
      }).success,
    ).toBe(true);
  });

  it("requires a long enough invitation token", () => {
    expect(acceptInvitationSchema.safeParse({ token: "t".repeat(16) }).success).toBe(true);
    expect(acceptInvitationSchema.safeParse({ token: "short" }).success).toBe(false);
  });

  it("needs a ULID member id to remove someone", () => {
    expect(removeMemberSchema.safeParse({ orgId: ORG_A, memberId: MEMBER }).success).toBe(
      true,
    );
    expect(removeMemberSchema.safeParse({ orgId: ORG_A, memberId: "1" }).success).toBe(
      false,
    );
  });

  it("defaults pagination when listing members and keeps filters optional", () => {
    const parsed = listMembersSchema.parse({ orgId: ORG_A });
    expect(parsed.limit).toBe(25);
    expect(parsed.role).toBeUndefined();
    expect(
      listMembersSchema.parse({ orgId: ORG_A, role: "admin", status: "invited" }),
    ).toMatchObject({ role: "admin", status: "invited" });
  });

  it("makes every profile field optional but still validated", () => {
    expect(updateProfileSchema.parse({ userId: ALICE })).toEqual({ userId: ALICE });
    expect(
      updateProfileSchema.safeParse({ userId: ALICE, avatarUrl: "not-a-url" }).success,
    ).toBe(false);
    expect(
      updateProfileSchema.safeParse({ userId: ALICE, avatarUrl: null }).success,
    ).toBe(true);
    expect(updateProfileSchema.safeParse({ userId: ALICE, name: "" }).success).toBe(false);
  });
});
