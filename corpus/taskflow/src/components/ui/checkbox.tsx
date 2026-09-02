"use client";

/**
 * Checkbox with an inline label.
 *
 * Owner A — design system. Controlled via `checked`, uncontrolled via
 * `defaultChecked`; bulk-selection UIs in the issue table use the former.
 */
import type { ChangeEvent, ReactElement, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { FOCUS_RING } from "./_lib/tokens";

export type CheckboxProps = { name: string; checked?: boolean; defaultChecked?: boolean; disabled?: boolean; onChange?: (checked: boolean) => void; children?: ReactNode };

export function Checkbox(props: CheckboxProps): ReactElement | null {
  const {
    name,
    checked,
    defaultChecked,
    disabled = false,
    onChange,
    children,
  } = props;

  const controlled = checked !== undefined;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event.target.checked);
  };

  return (
    <label
      htmlFor={name}
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 text-sm text-black/80 dark:text-white/80",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        id={name}
        name={name}
        type="checkbox"
        disabled={disabled}
        checked={controlled ? checked : undefined}
        defaultChecked={controlled ? undefined : defaultChecked}
        onChange={handleChange}
        className={cn(
          "h-4 w-4 shrink-0 rounded border-black/25 text-brand-500 accent-brand-500",
          FOCUS_RING,
        )}
      />
      {children !== undefined ? <span>{children}</span> : null}
    </label>
  );
}
