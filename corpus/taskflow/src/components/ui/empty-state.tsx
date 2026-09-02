/**
 * Zero-data placeholder.
 *
 * Owner A — design system. Server-renderable. The `action` slot takes an
 * already-permission-gated node: this component never decides whether the
 * viewer may create anything.
 */
import type { ReactElement, ReactNode } from "react";
import { SURFACE } from "./_lib/tokens";
import { cn } from "@/lib/cn";

export type EmptyStateProps = { title: string; description?: string; icon?: ReactNode; action?: ReactNode };

export function EmptyState(props: EmptyStateProps): ReactElement | null {
  const { title, description, icon, action } = props;

  return (
    <div
      className={cn(
        SURFACE,
        "flex flex-col items-center gap-2 rounded-lg border-dashed px-6 py-10 text-center",
      )}
    >
      {icon !== undefined ? (
        <span aria-hidden="true" className="text-black/30 dark:text-white/30">
          {icon}
        </span>
      ) : null}
      <p className="text-sm font-semibold text-black/80 dark:text-white/80">
        {title}
      </p>
      {description !== undefined ? (
        <p className="max-w-sm text-xs leading-5 text-black/55 dark:text-white/55">
          {description}
        </p>
      ) : null}
      {action !== undefined ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
