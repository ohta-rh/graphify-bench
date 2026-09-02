"use client";

/**
 * Chip-style multi-value entry.
 *
 * Owner A — design system. Enter and comma commit a chip, Backspace on an empty
 * field removes the last one, and duplicates are rejected case-insensitively.
 * Used for issue labels and for the invite-by-email field.
 */
import { useState } from "react";
import type { KeyboardEvent, ReactElement } from "react";
import { cn } from "@/lib/cn";
import { CONTROL_BORDER, FOCUS_RING } from "./_lib/tokens";

export type TagInputProps = { values: readonly string[]; placeholder?: string; max?: number; onChange: (values: readonly string[]) => void };

/** Normalised comparison key — chips are unique case- and space-insensitively. */
function keyOf(value: string): string {
  return value.trim().toLowerCase();
}

export function TagInput(props: TagInputProps): ReactElement | null {
  const { values, placeholder, max, onChange } = props;

  const [draft, setDraft] = useState("");

  const full = max !== undefined && values.length >= max;

  const add = (raw: string) => {
    const candidate = raw.trim();
    if (candidate === "" || full) return;
    if (values.some((value) => keyOf(value) === keyOf(candidate))) {
      setDraft("");
      return;
    }
    onChange([...values, candidate]);
    setDraft("");
  };

  const removeAt = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(draft);
      return;
    }
    if (event.key === "Backspace" && draft === "" && values.length > 0) {
      event.preventDefault();
      removeAt(values.length - 1);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-md border bg-surface px-2 py-1.5",
        CONTROL_BORDER,
        "focus-within:ring-2 focus-within:ring-brand-500",
      )}
    >
      {values.map((value, index) => (
        <span
          key={`${keyOf(value)}-${index}`}
          className="inline-flex items-center gap-1 rounded bg-surface-muted px-1.5 py-0.5 text-xs text-black/75"
        >
          {value}
          <button
            type="button"
            aria-label={`Remove ${value}`}
            onClick={() => removeAt(index)}
            className="text-black/40 hover:text-black/80"
          >
            ×
          </button>
        </span>
      ))}

      <input
        type="text"
        value={draft}
        disabled={full}
        placeholder={full ? `Limit of ${max} reached` : placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => add(draft)}
        className={cn(
          "min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-black/40 disabled:cursor-not-allowed",
          FOCUS_RING,
        )}
      />
    </div>
  );
}
