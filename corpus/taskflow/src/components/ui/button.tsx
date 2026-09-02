"use client";

/**
 * Primary action button with variant/size/loading states.
 *
 * Owner A — design system. Presentational only: no data access, no `can()`.
 * Callers gate on permission and pass `disabled` down.
 */
import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { FOCUS_RING } from "./_lib/tokens";
import { Spinner } from "./spinner";

export type ButtonProps = { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg'; loading?: boolean; disabled?: boolean; type?: 'button' | 'submit'; onClick?: () => void; className?: string; children?: ReactNode };

const VARIANTS = {
  primary:
    "bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-600 border border-transparent",
  secondary:
    "bg-surface text-black/80 dark:text-white/80 border border-black/15 dark:border-white/20 hover:bg-surface-muted",
  ghost:
    "bg-transparent text-black/70 dark:text-white/70 border border-transparent hover:bg-surface-muted",
  danger:
    "bg-red-600 text-white hover:bg-red-700 active:bg-red-700 border border-transparent",
} as const;

const SIZES = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-base gap-2.5",
} as const;

export function Button(props: ButtonProps): ReactElement | null {
  const {
    variant = "primary",
    size = "md",
    loading = false,
    disabled = false,
    type = "button",
    onClick,
    className,
    children,
  } = props;

  // A loading button stays in the tab order but rejects activation, so a
  // double-submit cannot slip through while the server action is in flight.
  const inert = disabled || loading;

  return (
    <button
      type={type}
      disabled={inert}
      aria-busy={loading || undefined}
      onClick={inert ? undefined : onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant],
        SIZES[size],
        FOCUS_RING,
        className,
      )}
    >
      {loading ? <Spinner size="sm" label="Working" /> : null}
      <span className={cn(loading && "opacity-80")}>{children}</span>
    </button>
  );
}
