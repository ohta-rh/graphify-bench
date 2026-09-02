"use client";

/**
 * Multi-line text field with auto-grow.
 *
 * Owner A — design system. Grows with its content up to a ceiling so the
 * comment composer never traps a long reply in a three-line box.
 */
import { useEffect, useRef } from "react";
import type { ChangeEvent, ReactElement } from "react";
import { cn } from "@/lib/cn";
import {
  CONTROL_BASE,
  CONTROL_BORDER,
  CONTROL_INVALID,
  FOCUS_RING,
} from "./_lib/tokens";

export type TextareaProps = { name: string; value?: string; defaultValue?: string; rows?: number; placeholder?: string; invalid?: boolean; onChange?: (value: string) => void; className?: string };

const MAX_AUTO_GROW_PX = 320;

export function Textarea(props: TextareaProps): ReactElement | null {
  const {
    name,
    value,
    defaultValue,
    rows = 3,
    placeholder,
    invalid = false,
    onChange,
    className,
  } = props;

  const ref = useRef<HTMLTextAreaElement | null>(null);
  const controlled = value !== undefined;

  const grow = (node: HTMLTextAreaElement | null) => {
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, MAX_AUTO_GROW_PX)}px`;
  };

  // Re-measure when a controlled value is replaced from the outside (e.g. a
  // form reset after a successful server action).
  useEffect(() => {
    grow(ref.current);
  }, [value]);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    grow(event.currentTarget);
    onChange?.(event.target.value);
  };

  return (
    <textarea
      id={name}
      name={name}
      ref={ref}
      rows={rows}
      placeholder={placeholder}
      aria-invalid={invalid || undefined}
      aria-errormessage={invalid ? `${name}-error` : undefined}
      value={controlled ? value : undefined}
      defaultValue={controlled ? undefined : defaultValue}
      onChange={handleChange}
      className={cn(
        CONTROL_BASE,
        "resize-none py-2 leading-6",
        invalid ? CONTROL_INVALID : CONTROL_BORDER,
        FOCUS_RING,
        className,
      )}
    />
  );
}
