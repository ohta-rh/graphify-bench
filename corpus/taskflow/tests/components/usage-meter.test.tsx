/**
 * Shows the exceeded state at and above the quota.
 *
 * Owner B implements `@/components/domain/billing/usage-meter`. Build props
 * with `makeLimitCheck()` from `tests/helpers/factories.ts`.
 */
import { describe, it } from "vitest";

describe("components/usage-meter", () => {
  // Used and limit render through formatCount/formatLimit.
  it.todo("renders the used and limit values through the formatters");

  // Below the quota the meter is in its normal state.
  it.todo("renders the normal state below the quota");

  // At exactly the quota the meter already reads exceeded.
  it.todo("renders the exceeded state at the quota, not only past it");

  // An unlimited quota renders "Unlimited" rather than Infinity or a full bar.
  it.todo("renders an unlimited quota without a progress bar");

  // The bar width is clamped to 100% when usage overshoots the quota.
  it.todo("clamps the bar at 100% when usage overshoots");
});
