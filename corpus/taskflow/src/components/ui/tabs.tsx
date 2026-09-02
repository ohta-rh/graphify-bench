"use client";

/**
 * Horizontal tab bar.
 *
 * Owner A — design system. Manual activation: arrows move focus, Enter/Space
 * commits. The issue views drive the selected tab from the URL, so committing
 * on every arrow press would push a history entry per keystroke.
 */
import { useRef } from "react";
import type { KeyboardEvent, ReactElement } from "react";
import { cn } from "@/lib/cn";
import { isNavKey, moveActiveIndex } from "./_lib/list-navigation";
import { FOCUS_RING } from "./_lib/tokens";

export type TabSpec = { value: string; label: string; count?: number };

export type TabsProps = { value: string; tabs: readonly TabSpec[]; onChange: (value: string) => void; className?: string };

export function Tabs(props: TabsProps): ReactElement | null {
  const { value, tabs, onChange, className } = props;

  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!isNavKey(event.key)) return;
    event.preventDefault();
    const next = moveActiveIndex(index, event.key, tabs.length);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center gap-1 border-b border-black/10 dark:border-white/15",
        className,
      )}
    >
      {tabs.map((tab, index) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`tab-${tab.value}`}
            aria-selected={selected}
            aria-controls={`panel-${tab.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors",
              selected
                ? "border-brand-500 font-medium text-brand-600"
                : "border-transparent text-black/55 hover:text-black/80 dark:text-white/55",
              FOCUS_RING,
            )}
          >
            {tab.label}
            {tab.count !== undefined ? (
              <span className="rounded-full bg-surface-muted px-1.5 text-[11px] tabular-nums text-black/55">
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
