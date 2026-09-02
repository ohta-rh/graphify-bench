/**
 * Determinate progress bar; the usage meter builds on it.
 *
 * Owner A — design system. Presentational: the plan-limit maths lives in
 * `@/config/plan-limits` and reaches this component as a plain ratio, so no
 * limit number is ever hardcoded here.
 */
import type { ReactElement } from "react";
import { cn } from "@/lib/cn";
import { TONE_FILL } from "./_lib/tokens";

export type ProgressProps = { value: number; max?: number; tone?: 'brand' | 'warning' | 'danger'; label?: string };

/** Clamp to 0–100 so a stale count above the limit cannot overflow the track. */
export function progressPercent(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / max) * 100)));
}

export function Progress(props: ProgressProps): ReactElement | null {
  const { value, max = 100, tone = "brand", label } = props;

  const percent = progressPercent(value, max);

  return (
    <div className="flex flex-col gap-1">
      {label !== undefined ? (
        <div className="flex items-baseline justify-between text-xs text-black/60 dark:text-white/60">
          <span>{label}</span>
          <span className="tabular-nums">{percent}%</span>
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
        className="h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/15"
      >
        <div
          style={{ width: `${percent}%` }}
          className={cn("h-full rounded-full transition-all", TONE_FILL[tone])}
        />
      </div>
    </div>
  );
}
