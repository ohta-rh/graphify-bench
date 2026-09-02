"use client";

/**
 * Single-line text field.
 *
 * Owner A — design system. Controlled when `value` is supplied, uncontrolled
 * when only `defaultValue` is: react-hook-form drives it either way and
 * `onChange` hands back the string rather than the event, so domain forms never
 * touch `event.target`.
 */
import type { ChangeEvent, ReactElement } from "react";
import { cn } from "@/lib/cn";
import {
  CONTROL_BASE,
  CONTROL_BORDER,
  CONTROL_INVALID,
  FOCUS_RING,
} from "./_lib/tokens";

export type InputProps = { name: string; value?: string; defaultValue?: string; placeholder?: string; type?: 'text' | 'email' | 'password' | 'search' | 'url'; invalid?: boolean; disabled?: boolean; onChange?: (value: string) => void; className?: string };

export function Input(props: InputProps): ReactElement | null {
  const {
    name,
    value,
    defaultValue,
    placeholder,
    type = "text",
    invalid = false,
    disabled = false,
    onChange,
    className,
  } = props;

  const controlled = value !== undefined;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event.target.value);
  };

  return (
    <input
      id={name}
      name={name}
      type={type}
      placeholder={placeholder}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      aria-errormessage={invalid ? `${name}-error` : undefined}
      // React warns when a field flips between controlled and uncontrolled, so
      // exactly one of the two props reaches the DOM node.
      value={controlled ? value : undefined}
      defaultValue={controlled ? undefined : defaultValue}
      onChange={handleChange}
      className={cn(
        CONTROL_BASE,
        "h-9",
        invalid ? CONTROL_INVALID : CONTROL_BORDER,
        FOCUS_RING,
        className,
      )}
    />
  );
}
