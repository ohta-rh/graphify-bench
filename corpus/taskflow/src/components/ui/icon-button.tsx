"use client";

/**
 * Square icon-only button carrying an accessible label.
 *
 * Owner A — design system. The label is required: an icon-only control with no
 * accessible name is the most common a11y regression in this codebase.
 */
import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { FOCUS_RING } from "./_lib/tokens";

export type IconButtonProps = { label: string; icon: ReactNode; variant?: 'ghost' | 'solid'; size?: 'sm' | 'md'; onClick?: () => void; disabled?: boolean; className?: string };

const VARIANTS = {
  ghost:
    "bg-transparent text-black/60 dark:text-white/60 hover:bg-surface-muted hover:text-black/85",
  solid:
    "bg-surface-muted text-black/75 dark:text-white/75 border border-black/10 hover:bg-black/5",
} as const;

const SIZES = {
  sm: "h-7 w-7 [&_svg]:h-3.5 [&_svg]:w-3.5",
  md: "h-9 w-9 [&_svg]:h-4 [&_svg]:w-4",
} as const;

export function IconButton(props: IconButtonProps): ReactElement | null {
  const {
    label,
    icon,
    variant = "ghost",
    size = "md",
    onClick,
    disabled = false,
    className,
  } = props;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        FOCUS_RING,
        className,
      )}
    >
      <span aria-hidden="true" className="pointer-events-none">
        {icon}
      </span>
    </button>
  );
}
