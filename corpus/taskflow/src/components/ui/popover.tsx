"use client";

/**
 * Anchored floating panel.
 *
 * Owner A — design system. Non-modal: it closes on Escape or an outside click
 * but never traps focus, because the anchor usually stays interactive (the
 * date picker and the filter menus rely on that).
 */
import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SURFACE } from "./_lib/tokens";
import { useDismissableLayer } from "./_lib/use-dismissable-layer";

export type PopoverProps = { open: boolean; anchor: ReactNode; placement?: 'top' | 'bottom' | 'left' | 'right'; onOpenChange: (open: boolean) => void; children?: ReactNode };

const PLACEMENTS = {
  top: "bottom-full left-0 mb-2",
  bottom: "top-full left-0 mt-2",
  left: "right-full top-0 mr-2",
  right: "left-full top-0 ml-2",
} as const;

export function Popover(props: PopoverProps): ReactElement | null {
  const { open, anchor, placement = "bottom", onOpenChange, children } = props;

  const rootRef = useDismissableLayer<HTMLDivElement>({
    open,
    onDismiss: () => onOpenChange(false),
  });

  return (
    <div ref={rootRef} className="relative inline-block">
      <div
        // The anchor is rendered by the caller; wrapping it here keeps the
        // outside-click detection honest without cloning elements.
        onClick={() => onOpenChange(!open)}
        className="contents"
      >
        {anchor}
      </div>
      {open ? (
        <div
          role="dialog"
          className={cn(
            SURFACE,
            "absolute z-30 min-w-56 rounded-md p-2 shadow-lg",
            PLACEMENTS[placement],
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
