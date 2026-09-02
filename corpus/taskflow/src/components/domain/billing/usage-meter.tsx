/**
 * Progress bar for one `LimitCheck`.
 */
import { Progress, type ProgressProps } from "@/components/ui/progress";
import { UNLIMITED } from "@/config/plan-limits";
import { formatCount, formatLimit } from "@/lib/format";
import type { LimitCheck } from "@/types/billing";
import type { ReactElement } from "react";

export type UsageMeterProps = { check: LimitCheck; label?: string };

/** Warn before the wall, not at it. */
export const USAGE_WARNING_RATIO = 0.8;

export function usageRatio(check: LimitCheck): number {
  if (!Number.isFinite(check.limit) || check.limit <= 0) return 0;
  return Math.min(1, check.used / check.limit);
}

export function usageTone(check: LimitCheck): NonNullable<ProgressProps["tone"]> {
  if (check.exceeded) return "danger";
  return usageRatio(check) >= USAGE_WARNING_RATIO ? "warning" : "brand";
}

export function UsageMeter(props: UsageMeterProps): ReactElement | null {
  const { check, label } = props;
  const unlimited = check.limit === UNLIMITED || !Number.isFinite(check.limit);

  return (
    <div className="usage-meter space-y-1">
      <div className="flex items-baseline justify-between text-sm">
        <span>{label ?? check.resource}</span>
        <span className="text-neutral-500">
          {formatCount(check.used)} / {formatLimit(check.limit)}
        </span>
      </div>

      <Progress
        value={unlimited ? 0 : check.used}
        max={unlimited ? 1 : check.limit}
        tone={usageTone(check)}
        label={label ?? check.resource}
      />

      {check.exceeded ? (
        <p className="text-xs text-red-600">
          Over the {check.plan} plan allowance.
        </p>
      ) : null}
    </div>
  );
}
