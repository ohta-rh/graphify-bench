/**
 * Form label with a required marker.
 *
 * Owner A — design system. Server-renderable: no hooks, no handlers.
 */
import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type LabelProps = { htmlFor: string; required?: boolean; className?: string; children?: ReactNode };

export function Label(props: LabelProps): ReactElement | null {
  const { htmlFor, required = false, className, children } = props;

  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "inline-flex items-center gap-1 text-sm font-medium text-black/80 dark:text-white/80",
        className,
      )}
    >
      {children}
      {required ? (
        <>
          <span aria-hidden="true" className="text-red-600">
            *
          </span>
          <span className="sr-only">(required)</span>
        </>
      ) : null}
    </label>
  );
}
