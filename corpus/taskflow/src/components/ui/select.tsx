"use client";

/**
 * Native-backed single select.
 *
 * Owner A — design system. A real `<select>` on purpose: it is the only control
 * that gets mobile pickers and form autofill for free. `Combobox` is the
 * filterable alternative when the option list is long.
 */
import type { ChangeEvent, ReactElement } from "react";
import { cn } from "@/lib/cn";
import {
  CONTROL_BASE,
  CONTROL_BORDER,
  FOCUS_RING,
} from "./_lib/tokens";

export type SelectOption = { value: string; label: string; disabled?: boolean };

export type SelectProps = { name: string; value?: string; options: readonly SelectOption[]; placeholder?: string; disabled?: boolean; onChange?: (value: string) => void; className?: string };

export function Select(props: SelectProps): ReactElement | null {
  const {
    name,
    value,
    options,
    placeholder,
    disabled = false,
    onChange,
    className,
  } = props;

  const controlled = value !== undefined;

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange?.(event.target.value);
  };

  return (
    <div className={cn("relative", className)}>
      <select
        id={name}
        name={name}
        disabled={disabled}
        value={controlled ? value : undefined}
        defaultValue={controlled ? undefined : ""}
        onChange={handleChange}
        className={cn(
          CONTROL_BASE,
          CONTROL_BORDER,
          FOCUS_RING,
          "h-9 appearance-none pr-8",
        )}
      >
        {placeholder !== undefined ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-black/45"
      >
        ▾
      </span>
    </div>
  );
}
