/**
 * Private design tokens for `src/components/ui`.
 *
 * Not part of the public design-system surface: nothing outside
 * `src/components/ui/**` may import from here. Keeping the Tailwind class
 * strings in one place is what makes the variant maps below auditable —
 * a tone rename is a single-file change instead of a 30-file sweep.
 */

export const FOCUS_RING =
  "outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

export const SURFACE = "bg-surface border border-black/10 dark:border-white/15";

export const OVERLAY = "fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]";

export const CONTROL_BASE =
  "w-full rounded-md border bg-surface px-3 text-sm text-black/85 dark:text-white/85 placeholder:text-black/40 disabled:cursor-not-allowed disabled:opacity-60";

export const CONTROL_BORDER = "border-black/15 dark:border-white/20";

export const CONTROL_INVALID = "border-red-500 focus-visible:ring-red-500";

/** Shared tone vocabulary. Badge, Alert and Toast all key off these names. */
export const TONE_TEXT = {
  neutral: "text-black/70 dark:text-white/70",
  brand: "text-brand-600",
  info: "text-brand-600",
  success: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-red-700",
} as const;

export const TONE_SURFACE = {
  neutral: "bg-surface-muted text-black/75 border-black/10",
  brand: "bg-brand-50 text-brand-600 border-brand-500/25",
  info: "bg-brand-50 text-brand-600 border-brand-500/25",
  success: "bg-emerald-50 text-emerald-800 border-emerald-500/25",
  warning: "bg-amber-50 text-amber-800 border-amber-500/25",
  danger: "bg-red-50 text-red-800 border-red-500/25",
} as const;

export const TONE_FILL = {
  brand: "bg-brand-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
} as const;

export type Tone = keyof typeof TONE_SURFACE;
