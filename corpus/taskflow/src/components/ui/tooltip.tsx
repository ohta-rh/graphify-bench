"use client";

/**
 * Hover/focus tooltip.
 *
 * Owner A — design system. Opens on focus as well as hover, and the delay is
 * cancelled on unmount so a fast pointer sweep across a toolbar cannot leave a
 * timer behind.
 */
import { useEffect, useId, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type TooltipProps = { content: string; placement?: 'top' | 'bottom'; delayMs?: number; children?: ReactNode };

const PLACEMENTS = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
} as const;

export function Tooltip(props: TooltipProps): ReactElement | null {
  const { content, placement = "top", delayMs = 300, children } = props;

  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();

  const clear = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const show = (immediate: boolean) => {
    clear();
    if (immediate || delayMs <= 0) {
      setVisible(true);
      return;
    }
    timer.current = setTimeout(() => setVisible(true), delayMs);
  };

  const hide = () => {
    clear();
    setVisible(false);
  };

  useEffect(() => clear, []);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => show(false)}
      onMouseLeave={hide}
      // Keyboard users get no hover intent, so focus shows it right away.
      onFocus={() => show(true)}
      onBlur={hide}
    >
      <span aria-describedby={visible ? tooltipId : undefined}>{children}</span>
      {visible ? (
        <span
          id={tooltipId}
          role="tooltip"
          className={cn(
            "absolute z-40 whitespace-nowrap rounded bg-black/85 px-2 py-1 text-[11px] font-medium text-white shadow-md",
            PLACEMENTS[placement],
          )}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
