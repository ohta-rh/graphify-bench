/**
 * Indeterminate progress indicator.
 *
 * Owner A — design system. Server-renderable; `Button` embeds it for its
 * loading state, so it must stay dependency-free.
 */
import type { ReactElement } from "react";
import { cn } from "@/lib/cn";

export type SpinnerProps = { size?: 'sm' | 'md' | 'lg'; label?: string };

const SIZES = {
  sm: "h-3.5 w-3.5 border-2",
  md: "h-5 w-5 border-2",
  lg: "h-8 w-8 border-[3px]",
} as const;

export function Spinner(props: SpinnerProps): ReactElement | null {
  const { size = "md", label } = props;

  return (
    <span role="status" className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={cn(
          "inline-block shrink-0 animate-spin rounded-full border-current border-r-transparent opacity-70",
          SIZES[size],
        )}
      />
      <span className="sr-only">{label ?? "Loading"}</span>
    </span>
  );
}
