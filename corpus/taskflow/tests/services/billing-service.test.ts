/**
 * `checkLimit` arithmetic and downgrade refusal.
 *
 * Owner C implements `@/server/services/billing-service`.
 */
import { describe, it } from "vitest";

describe("services/billing-service", () => {
  // checkLimit reads the ceiling from getPlanLimits(), never a hard-coded number.
  it.todo("computes remaining and exceeded from the plan's quota");

  // At exactly the quota the resource is exceeded and remaining is zero.
  it.todo("marks a resource exceeded at, not past, the quota");

  // An unlimited enterprise quota is never exceeded and reports Infinity remaining.
  it.todo("never marks an unlimited quota exceeded");

  // A downgrade whose current usage breaches the target plan is refused.
  it.todo("refuses a downgrade that current usage would breach");

  // billing.plan_changed carries the previous and new plan.
  it.todo("emits billing.plan_changed on a successful plan change");

  // Crossing a ceiling emits billing.limit_exceeded with resource, limit and used.
  it.todo("emits billing.limit_exceeded when a ceiling is crossed");

  // can(actor, "org:manage_billing", …) — only an owner may change the plan.
  it.todo("refuses a plan change to anyone but an owner");
});
