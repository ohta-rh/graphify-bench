/**
 * Small status pill.
 *
 * Owner A — design system. Server-renderable. Issue status, plan name and
 * member role all render through this one component.
 */
import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { TONE_SURFACE } from "./_lib/tokens";

export type BadgeProps = { tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger'; size?: 'sm' | 'md'; className?: string; children?: ReactNode };

const SIZES = {
  sm: "h-5 px-1.5 text-[11px]",
  md: "h-6 px-2 text-xs",
} as const;

export function Badge(props: BadgeProps): ReactElement | null {
  const { tone = "neutral", size = "sm", className, children } = props;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border font-medium",
        TONE_SURFACE[tone],
        SIZES[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
