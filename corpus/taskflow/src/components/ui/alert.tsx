/**
 * Inline banner for page-level messages.
 *
 * Owner A — design system. Server-renderable: `error.tsx` boundaries and plan
 * limit warnings both render through it. Danger and warning tones announce
 * themselves assertively; the quieter tones do not steal focus.
 */
import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { TONE_SURFACE } from "./_lib/tokens";

export type AlertProps = { tone?: 'info' | 'success' | 'warning' | 'danger'; title: string; className?: string; children?: ReactNode };

const ICONS = {
  info: "i",
  success: "✓",
  warning: "!",
  danger: "!",
} as const;

export function Alert(props: AlertProps): ReactElement | null {
  const { tone = "info", title, className, children } = props;

  const assertive = tone === "danger" || tone === "warning";

  return (
    <div
      role={assertive ? "alert" : "status"}
      aria-live={assertive ? "assertive" : "polite"}
      className={cn(
        "flex gap-3 rounded-md border px-3 py-2.5 text-sm",
        TONE_SURFACE[tone],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-current text-[10px] font-bold"
      >
        {ICONS[tone]}
      </span>
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        {children !== undefined ? (
          <div className="mt-0.5 text-[13px] opacity-90">{children}</div>
        ) : null}
      </div>
    </div>
  );
}
