/**
 * User avatar falling back to initials.
 *
 * Owner A — design system. Server-renderable. The colour is derived from the
 * name so the same person keeps the same swatch across every list without the
 * server having to store one.
 */
import type { ReactElement } from "react";
import { cn } from "@/lib/cn";

export type AvatarProps = { name: string; src?: string | null; size?: 'xs' | 'sm' | 'md' | 'lg'; className?: string };

const SIZES = {
  xs: "h-5 w-5 text-[10px]",
  sm: "h-6 w-6 text-[11px]",
  md: "h-8 w-8 text-xs",
  lg: "h-12 w-12 text-base",
} as const;

const SWATCHES = [
  "bg-brand-500",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-violet-600",
  "bg-cyan-700",
] as const;

/** First letter of the first two words, e.g. `"Ada Lovelace"` → `"AL"`. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (words.length === 0) return "?";
  return words.map((word) => word.charAt(0).toUpperCase()).join("");
}

function swatchFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 1_000_003;
  }
  return SWATCHES[hash % SWATCHES.length] ?? SWATCHES[0];
}

export function Avatar(props: AvatarProps): ReactElement | null {
  const { name, src, size = "md", className } = props;

  const shared = cn(
    "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
    SIZES[size],
    className,
  );

  if (src) {
    // Avatars come from arbitrary user-supplied URLs; next/image would need
    // every one of those hosts configured up front, so a plain img wins here.
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img src={src} alt={name} title={name} className={cn(shared, "object-cover")} />
    );
  }

  return (
    <span
      role="img"
      aria-label={name}
      title={name}
      className={cn(shared, swatchFor(name), "font-semibold text-white")}
    >
      {initialsOf(name)}
    </span>
  );
}
