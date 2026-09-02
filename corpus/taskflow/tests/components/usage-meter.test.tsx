/**
 * Shows the exceeded state at and above the quota.
 *
 * Owner B implements `@/components/domain/billing/usage-meter`. Build props
 * with `makeLimitCheck()` from `tests/helpers/factories.ts`.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { UNLIMITED } from "@/config/plan-limits";
import { UsageMeter } from "@/components/domain/billing/usage-meter";
import { formatCount, formatLimit } from "@/lib/format";
import { makeLimitCheck } from "../helpers/factories";

afterEach(cleanup);

describe("components/usage-meter", () => {
  // Used and limit render through formatCount/formatLimit.
  it("renders the used and limit values through the formatters", () => {
    const check = makeLimitCheck({ used: 12_400, limit: 20_000 });

    render(<UsageMeter check={check} />);

    expect(
      screen.getByText(`${formatCount(check.used)} / ${formatLimit(check.limit)}`),
    ).toBeInTheDocument();
  });

  // Below the quota the meter is in its normal state.
  it("renders the normal state below the quota", () => {
    const check = makeLimitCheck({ used: 1, limit: 10, exceeded: false });

    render(<UsageMeter check={check} />);

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByText(/over the .* plan allowance/i)).not.toBeInTheDocument();
  });

  // At exactly the quota the meter already reads exceeded.
  it("renders the exceeded state at the quota, not only past it", () => {
    const check = makeLimitCheck({ used: 10, limit: 10, exceeded: true });

    render(<UsageMeter check={check} />);

    expect(screen.getByText(`Over the ${check.plan} plan allowance.`)).toBeInTheDocument();
  });

  // An unlimited quota renders "Unlimited" rather than Infinity or a full bar.
  it("renders an unlimited quota without a progress bar", () => {
    const check = makeLimitCheck({ used: 5, limit: UNLIMITED, exceeded: false });

    render(<UsageMeter check={check} />);

    expect(screen.getByText(/unlimited/i)).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  // The bar width is clamped to 100% when usage overshoots the quota.
  it("clamps the bar at 100% when usage overshoots", () => {
    const check = makeLimitCheck({ used: 15, limit: 10, exceeded: true });

    render(<UsageMeter check={check} />);

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "15");
    expect(bar).toHaveAttribute("aria-valuemax", "10");
    const fill = bar.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("100%");
  });
});
