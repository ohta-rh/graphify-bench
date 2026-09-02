import { describe, expect, it } from "vitest";
import { assignableRoles } from "@/components/domain/member/role-select";
import { isActiveSegment } from "@/components/domain/nav/app-sidebar";
import { formatUnreadBadge } from "@/components/domain/notification/notification-bell";
import type { OrgId, UserId } from "@/types/common";
import type { Actor, Role } from "@/types/member";

function actor(role: Role, isPlatformStaff = false): Actor {
  return {
    userId: "usr_1" as UserId,
    orgId: "org_1" as OrgId,
    role,
    isPlatformStaff,
  };
}

describe("role-select/assignableRoles", () => {
  it("lets an owner grant every role", () => {
    expect(assignableRoles(actor("owner"))).toEqual([
      "owner",
      "admin",
      "member",
      "viewer",
    ]);
  });

  it("never lets an admin grant owner", () => {
    expect(assignableRoles(actor("admin"))).toEqual([
      "admin",
      "member",
      "viewer",
    ]);
  });

  it("caps a member at their own rank", () => {
    expect(assignableRoles(actor("member"))).toEqual(["member", "viewer"]);
  });

  it("gives platform staff the full list regardless of org role", () => {
    expect(assignableRoles(actor("viewer", true))).toHaveLength(4);
  });
});

describe("app-sidebar/isActiveSegment", () => {
  it("matches the exact path", () => {
    expect(isActiveSegment("/acme/issues", "/acme/issues")).toBe(true);
  });

  it("matches a descendant path", () => {
    expect(isActiveSegment("/acme/issues/12", "/acme/issues")).toBe(true);
  });

  it("does not match a sibling with a shared prefix", () => {
    expect(isActiveSegment("/acme/issues-archive", "/acme/issues")).toBe(false);
  });
});

describe("notification-bell/formatUnreadBadge", () => {
  it("shows the count up to the cap", () => {
    expect(formatUnreadBadge(7)).toBe("7");
    expect(formatUnreadBadge(99)).toBe("99");
  });

  it("caps very large counts", () => {
    expect(formatUnreadBadge(1200)).toBe("99+");
  });
});
