"use client";

/**
 * Filterable single-select with keyboard navigation.
 *
 * Owner A — design system. Implements the ARIA 1.2 combobox pattern:
 * `aria-activedescendant` on the input, options in a sibling listbox, and the
 * query cleared on commit so reopening shows the full list. Assignee and label
 * pickers in the domain layer are thin wrappers over this.
 */
import { useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactElement } from "react";
import { cn } from "@/lib/cn";
import { filterByQuery, isNavKey, moveActiveIndex } from "./_lib/list-navigation";
import {
  CONTROL_BASE,
  CONTROL_BORDER,
  FOCUS_RING,
  SURFACE,
} from "./_lib/tokens";
import { useDismissableLayer } from "./_lib/use-dismissable-layer";

export type ComboboxOption = { value: string; label: string; description?: string };

export type ComboboxProps = { value: string | null; options: readonly ComboboxOption[]; placeholder?: string; emptyLabel?: string; onChange: (value: string | null) => void; className?: string };

export function Combobox(props: ComboboxProps): ReactElement | null {
  const {
    value,
    options,
    placeholder,
    emptyLabel = "No matches",
    onChange,
    className,
  } = props;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listId = "combobox-listbox";

  const rootRef = useDismissableLayer<HTMLDivElement>({
    open,
    onDismiss: () => {
      setOpen(false);
      setQuery("");
    },
  });

  const selected = options.find((option) => option.value === value) ?? null;

  const matches = useMemo(
    () =>
      filterByQuery(options, query, (option) =>
        `${option.label} ${option.description ?? ""}`,
      ),
    [options, query],
  );

  const commit = (next: ComboboxOption | null) => {
    onChange(next === null ? null : next.value);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const key = event.key;
    if (isNavKey(key)) {
      event.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex((index) => moveActiveIndex(index, key, matches.length));
      return;
    }
    if (key === "Enter") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      commit(matches[activeIndex] ?? null);
      return;
    }
    if (key === "Escape") {
      setOpen(false);
      setQuery("");
      return;
    }
    // Backspace on an empty query clears the selection — the fastest way back
    // to "unassigned" without reaching for the mouse.
    if (key === "Backspace" && query === "" && selected !== null) {
      commit(null);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && matches[activeIndex] ? `option-${matches[activeIndex].value}` : undefined
        }
        value={open ? query : (selected?.label ?? "")}
        placeholder={placeholder}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className={cn(CONTROL_BASE, CONTROL_BORDER, FOCUS_RING, "h-9")}
      />

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className={cn(
            SURFACE,
            "absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-md py-1 shadow-lg",
          )}
        >
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-xs text-black/45">{emptyLabel}</li>
          ) : null}
          {matches.map((option, index) => (
            <li key={option.value} id={`option-${option.value}`} role="option" aria-selected={option.value === value}>
              <button
                type="button"
                tabIndex={-1}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => commit(option)}
                className={cn(
                  "flex w-full flex-col items-start px-3 py-1.5 text-left",
                  index === activeIndex && "bg-surface-muted",
                )}
              >
                <span className="text-sm text-black/85 dark:text-white/85">
                  {option.label}
                </span>
                {option.description !== undefined ? (
                  <span className="text-[11px] text-black/50">{option.description}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
