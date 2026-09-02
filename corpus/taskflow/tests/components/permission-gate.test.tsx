/**
 * Renders children only when `can()` allows the action.
 *
 * Owner B implements `@/components/domain/permission/permission-gate`.
 */
import { describe, it } from "vitest";

describe("components/permission-gate", () => {
  // Children render when can(actor, action, resource) is true.
  it.todo("renders its children when the action is allowed");

  // Nothing renders when the action is denied and no fallback was given.
  it.todo("renders nothing when the action is denied");

  // A supplied fallback renders in place of the children on denial.
  it.todo("renders the fallback when the action is denied");

  // The gate calls can() rather than comparing actor.role itself.
  it.todo("delegates the decision to can(), not to a role comparison");

  // A cross-tenant resource is denied, matching the library's own rule.
  it.todo("denies a resource from another organization");
});
