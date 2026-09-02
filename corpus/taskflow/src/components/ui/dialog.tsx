"use client";

/**
 * Modal dialog with focus trap.
 *
 * Owner A — design system. Open/closed state is owned by the caller so a route
 * can drive it from `searchParams`; this component only renders and traps.
 */
import { useId } from "react";
import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { OVERLAY, SURFACE } from "./_lib/tokens";
import {
  useDismissableLayer,
  useFocusTrap,
  useScrollLock,
} from "./_lib/use-dismissable-layer";
import { IconButton } from "./icon-button";

export type DialogProps = { open: boolean; title: string; description?: string; onClose: () => void; footer?: ReactNode; children?: ReactNode };

type PartProps = { className?: string; children?: ReactNode };

export function Dialog(props: DialogProps): ReactElement | null {
  const { open, title, description, onClose, footer, children } = props;

  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useDismissableLayer<HTMLDivElement>({ open, onDismiss: onClose });
  useFocusTrap(panelRef, open);
  useScrollLock(open);

  if (!open) return null;

  return (
    <div className={OVERLAY} data-testid="dialog-overlay">
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description !== undefined ? descriptionId : undefined}
          className={cn(
            SURFACE,
            "w-full max-w-lg rounded-lg shadow-xl outline-none",
          )}
        >
          <DialogHeader>
            <div className="min-w-0">
              <h2
                id={titleId}
                className="text-sm font-semibold text-black/85 dark:text-white/85"
              >
                {title}
              </h2>
              {description !== undefined ? (
                <p
                  id={descriptionId}
                  className="mt-1 text-xs text-black/55 dark:text-white/55"
                >
                  {description}
                </p>
              ) : null}
            </div>
            <IconButton label="Close dialog" icon={<span>×</span>} onClick={onClose} />
          </DialogHeader>

          <div className="px-4 py-4 text-sm text-black/80 dark:text-white/80">
            {children}
          </div>

          {footer !== undefined ? <DialogFooter>{footer}</DialogFooter> : null}
        </div>
      </div>
    </div>
  );
}

export function DialogHeader(props: PartProps): ReactElement | null {
  const { className, children } = props;
  return (
    <header
      className={cn(
        "flex items-start justify-between gap-3 border-b border-black/8 px-4 py-3",
        className,
      )}
    >
      {children}
    </header>
  );
}

export function DialogFooter(props: PartProps): ReactElement | null {
  const { className, children } = props;
  return (
    <footer
      className={cn(
        "flex items-center justify-end gap-2 border-t border-black/8 px-4 py-3",
        className,
      )}
    >
      {children}
    </footer>
  );
}
