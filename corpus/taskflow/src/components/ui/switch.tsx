"use client";

/**
 * Boolean toggle used across the settings pages.
 *
 * Owner A — design system. Always controlled: the settings pages persist
 * through a server action and re-render from the returned state, so a local
 * copy would fight the source of truth.
 */
import type { KeyboardEvent, ReactElement } from "react";
import { cn } from "@/lib/cn";
import { FOCUS_RING } from "./_lib/tokens";

export type SwitchProps = { name: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void; label?: string };

export function Switch(props: SwitchProps): ReactElement | null {
  const { name, checked, disabled = false, onChange, label } = props;

  const toggle = () => {
    if (disabled) return;
    onChange(!checked);
  };

  // Space activates a native button already; Enter is added so the control
  // behaves like a checkbox for keyboard users who expect either key.
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      toggle();
    }
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        id={name}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label === undefined ? name : undefined}
        disabled={disabled}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-brand-500" : "bg-black/20 dark:bg-white/25",
          disabled && "cursor-not-allowed opacity-60",
          FOCUS_RING,
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </button>
      {label !== undefined ? (
        <label
          htmlFor={name}
          className="text-sm text-black/80 dark:text-white/80"
        >
          {label}
        </label>
      ) : null}
    </span>
  );
}
