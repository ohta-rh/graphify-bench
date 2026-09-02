/**
 * Shimmer placeholder used by every `loading.tsx`.
 *
 * Owner A — design system. Server-renderable, which matters: the App Router
 * streams `loading.tsx` before any client bundle has loaded.
 */
import type { ReactElement } from "react";
import { cn } from "@/lib/cn";

export type SkeletonProps = { width?: string; height?: string; rounded?: boolean; className?: string };

export function Skeleton(props: SkeletonProps): ReactElement | null {
  const { width = "100%", height = "1rem", rounded = false, className } = props;

  return (
    <span
      aria-hidden="true"
      style={{ width, height }}
      className={cn(
        "block animate-pulse bg-black/10 dark:bg-white/10",
        rounded ? "rounded-full" : "rounded-md",
        className,
      )}
    />
  );
}

/** Convenience stack of skeleton lines for list-shaped loading states. */
export function SkeletonLines(props: {
  count?: number;
  className?: string;
}): ReactElement | null {
  const { count = 3, className } = props;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: Math.max(1, count) }, (_, index) => (
        <Skeleton
          key={index}
          height="0.875rem"
          width={index === count - 1 ? "60%" : "100%"}
        />
      ))}
    </div>
  );
}
