/**
 * One transient notification card.
 *
 * Owner A — design system. Dumb on purpose: the auto-dismiss timer and the
 * queue live in `Toaster` / `useToast`, so a toast that is re-rendered by its
 * parent does not restart its own countdown.
 */
import type { ReactElement } from "react";
import { cn } from "@/lib/cn";
import { SURFACE, TONE_TEXT } from "./_lib/tokens";

export type ToastProps = { id: string; title: string; description?: string; tone?: 'neutral' | 'success' | 'danger'; onDismiss: (id: string) => void };

export function Toast(props: ToastProps): ReactElement | null {
  const { id, title, description, tone = "neutral", onDismiss } = props;

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      data-toast-id={id}
      className={cn(
        SURFACE,
        "pointer-events-auto flex w-80 items-start gap-3 rounded-lg p-3 shadow-lg",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("mt-1 h-2 w-2 shrink-0 rounded-full bg-current", TONE_TEXT[tone])}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-black/85 dark:text-white/85">
          {title}
        </p>
        {description !== undefined ? (
          <p className="mt-0.5 text-xs leading-5 text-black/55 dark:text-white/55">
            {description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        aria-label={`Dismiss: ${title}`}
        onClick={() => onDismiss(id)}
        className="shrink-0 rounded p-1 text-black/40 hover:bg-surface-muted hover:text-black/70"
      >
        ×
      </button>
    </div>
  );
}
