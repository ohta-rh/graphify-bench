"use client";

/**
 * Trigger-anchored action menu.
 *
 * Owner A — design system. Roving focus follows the WAI-ARIA menu pattern:
 * arrows move the active item, Enter/Space activate it, Escape closes and
 * returns focus to the trigger. Callers pass already-filtered items — the menu
 * never asks whether an action is permitted.
 */
import { useRef, useState } from "react";
import type { KeyboardEvent, ReactElement, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { isNavKey, moveActiveIndex } from "./_lib/list-navigation";
import { FOCUS_RING, SURFACE } from "./_lib/tokens";
import { useDismissableLayer } from "./_lib/use-dismissable-layer";

export type DropdownItem = { id: string; label: string; icon?: ReactNode; destructive?: boolean; onSelect: () => void };

export type DropdownMenuProps = { trigger: ReactNode; items: readonly DropdownItem[]; align?: 'start' | 'end' };

export function DropdownMenu(props: DropdownMenuProps): ReactElement | null {
  const { trigger, items, align = "start" } = props;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const rootRef = useDismissableLayer<HTMLDivElement>({
    open,
    onDismiss: () => setOpen(false),
  });

  // Closing drops the highlight so the next open starts from the trigger.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) setActiveIndex(-1);
  }

  const close = (restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  const select = (item: DropdownItem) => {
    item.onSelect();
    close(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!open) {
      if (event.key === "ArrowDown" || event.key === "Enter") {
        event.preventDefault();
        setOpen(true);
        setActiveIndex(0);
      }
      return;
    }
    const key = event.key;
    if (isNavKey(key)) {
      event.preventDefault();
      setActiveIndex((index) => moveActiveIndex(index, key, items.length));
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      const item = items[activeIndex];
      if (item) {
        event.preventDefault();
        select(item);
      }
      return;
    }
    if (event.key === "Escape") close(true);
  };

  return (
    <div ref={rootRef} onKeyDown={handleKeyDown} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn("inline-flex items-center rounded-md", FOCUS_RING)}
      >
        {trigger}
      </button>

      {open ? (
        <div
          role="menu"
          className={cn(
            SURFACE,
            "absolute top-full z-30 mt-1 min-w-48 rounded-md py-1 shadow-lg",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {items.length === 0 ? (
            <p className="px-3 py-2 text-xs text-black/45">No actions available</p>
          ) : null}
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => select(item)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm",
                index === activeIndex && "bg-surface-muted",
                item.destructive
                  ? "text-red-600"
                  : "text-black/80 dark:text-white/80",
              )}
            >
              {item.icon !== undefined ? (
                <span aria-hidden="true" className="shrink-0 opacity-70">
                  {item.icon}
                </span>
              ) : null}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
