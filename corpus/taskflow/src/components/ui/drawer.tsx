"use client";

/**
 * Slide-over panel.
 *
 * Owner A — design system. Shares the dismissal and focus-trap plumbing with
 * `Dialog`; the difference is layout, not behaviour. The issue detail panel and
 * the notification centre both mount here.
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

export type DrawerProps = { open: boolean; side?: 'left' | 'right'; title?: string; onClose: () => void; children?: ReactNode };

const SIDES = {
  left: "left-0 border-r",
  right: "right-0 border-l",
} as const;

export function Drawer(props: DrawerProps): ReactElement | null {
  const { open, side = "right", title, onClose, children } = props;

  const titleId = useId();
  const panelRef = useDismissableLayer<HTMLElement>({ open, onDismiss: onClose });
  useFocusTrap(panelRef, open);
  useScrollLock(open);

  if (!open) return null;

  return (
    <div className={OVERLAY} data-testid="drawer-overlay">
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title !== undefined ? titleId : undefined}
        aria-label={title === undefined ? "Panel" : undefined}
        className={cn(
          SURFACE,
          "fixed inset-y-0 z-50 flex w-full max-w-md flex-col shadow-2xl",
          SIDES[side],
        )}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-black/8 px-4 py-3">
          <h2
            id={titleId}
            className="truncate text-sm font-semibold text-black/85 dark:text-white/85"
          >
            {title ?? ""}
          </h2>
          <IconButton label="Close panel" icon={<span>×</span>} onClick={onClose} />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 text-sm">
          {children}
        </div>
      </aside>
    </div>
  );
}
