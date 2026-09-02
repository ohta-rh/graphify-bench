/** `assertOrgScope` / `scopedOrNull` / `withOrgScope` behaviour. */
import { describe, expect, it } from "vitest";
import {
  TenantScopeError,
  assertOrgScope,
  assertRowsInScope,
  isInOrgScope,
  scopedOrNull,
  withOrgScope,
} from "@/lib/tenant";
import { ORG_A, ORG_B, makeActor, makeIssue } from "../helpers/factories";

const actor = makeActor({ orgId: ORG_A });

describe("lib/tenant", () => {
  it("passes when the org matches and throws when it does not", () => {
    expect(() => assertOrgScope(actor, ORG_A)).not.toThrow();
    expect(() => assertOrgScope(actor, ORG_B)).toThrow(TenantScopeError);
  });

  it("reports both orgs on the thrown error", () => {
    try {
      assertOrgScope(actor, ORG_B);
      expect.unreachable("assertOrgScope should have thrown");
    } catch (error) {
      const scoped = error as TenantScopeError;
      expect(scoped.code).toBe("tenant_scope_violation");
      expect(scoped.expectedOrgId).toBe(ORG_A);
      expect(scoped.actualOrgId).toBe(ORG_B);
    }
  });

  it("ignores the actor's role — an owner is still confined to their tenant", () => {
    const owner = makeActor({ orgId: ORG_A, role: "owner" });
    expect(() => assertOrgScope(owner, ORG_B)).toThrow(TenantScopeError);
  });

  it("does not exempt platform staff from the scope check", () => {
    const staff = makeActor({ orgId: ORG_A, isPlatformStaff: true });
    expect(() => assertOrgScope(staff, ORG_B)).toThrow(TenantScopeError);
  });

  it("fails a row batch on the first foreign row", () => {
    const rows = [makeIssue(), makeIssue({ orgId: ORG_B }), makeIssue()];
    expect(() => assertRowsInScope(actor, rows)).toThrow(TenantScopeError);
    expect(() => assertRowsInScope(actor, [makeIssue(), makeIssue()])).not.toThrow();
    expect(() => assertRowsInScope(actor, [])).not.toThrow();
  });

  it("filters rather than fails with the predicate form", () => {
    expect(isInOrgScope(actor, makeIssue())).toBe(true);
    expect(isInOrgScope(actor, makeIssue({ orgId: ORG_B }))).toBe(false);
  });

  it("narrows a foreign or missing row to null", () => {
    const mine = makeIssue();
    expect(scopedOrNull(actor, mine)).toBe(mine);
    expect(scopedOrNull(actor, makeIssue({ orgId: ORG_B }))).toBeNull();
    expect(scopedOrNull(actor, null)).toBeNull();
    expect(scopedOrNull(actor, undefined)).toBeNull();
  });

  it("stamps the actor's orgId onto a filter, overriding any supplied one", () => {
    expect(withOrgScope(actor, { status: "todo" })).toEqual({
      status: "todo",
      orgId: ORG_A,
    });
    expect(withOrgScope(actor, { orgId: ORG_B }).orgId).toBe(ORG_A);
  });
});
