/**
 * An actor from another org cannot read or mutate an issue.
 *
 * Owner C implements `@/server/services/issue-service`; the integration pass
 * fills these in. Seed both tenants with `seedTwoTenants()`.
 */
import { describe, it } from "vitest";

describe("services/issue-service — tenant scope", () => {
  // assertOrgScope throws TenantScopeError before any repository call is made.
  it.todo("refuses a read for an actor whose orgId differs from the issue's");

  // The same denial applies to an owner of the other org, not just low roles.
  it.todo("refuses a cross-tenant read even for the other org's owner");

  // Listing from org A never returns a row seeded into org B.
  it.todo("never returns another tenant's issues from a list query");

  // A cross-tenant update is a tenant_scope_violation, not a not_found.
  it.todo("maps a cross-tenant mutation to tenant_scope_violation");
});
