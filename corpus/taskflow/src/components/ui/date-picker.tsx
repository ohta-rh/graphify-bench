"use client";

/**
 * Calendar popover returning an ISO date string.
 *
 * Owner A — design system. Everything is UTC (`./_lib/calendar`): due dates are
 * stored as plain `YYYY-MM-DD`, so a local-time grid would show the wrong day
 * either side of midnight for half the world.
 */
import { useState } from "react";
import type { KeyboardEvent, ReactElement } from "react";
import { cn } from "@/lib/cn";
import {
  buildMonthGrid,
  isIsoDate,
  isOutOfRange,
  monthLabel,
  parseIso,
  shiftMonth,
  toIso,
  WEEKDAY_LABELS,
} from "./_lib/calendar";
import { CONTROL_BORDER, FOCUS_RING, SURFACE } from "./_lib/tokens";
import { useDismissableLayer } from "./_lib/use-dismissable-layer";
import { IconButton } from "./icon-button";

export type DatePickerProps = { value: string | null; min?: string; max?: string; onChange: (value: string | null) => void; placeholder?: string };

export function DatePicker(props: DatePickerProps): ReactElement | null {
  const { value, min, max, onChange, placeholder = "Pick a date" } = props;

  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() =>
    shiftMonth(parseIso(value, new Date()), 0),
  );

  // A value replaced from the outside (a form reset, a different issue) should
  // move the grid to that month. Adjusted during render rather than in an
  // effect so the calendar never paints the stale month first.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (isIsoDate(value)) setCursor(shiftMonth(parseIso(value, new Date()), 0));
  }

  const rootRef = useDismissableLayer<HTMLDivElement>({
    open,
    onDismiss: () => setOpen(false),
  });

  const cells = buildMonthGrid(cursor);
  const today = toIso(new Date());

  const pick = (iso: string) => {
    if (isOutOfRange(iso, min, max)) return;
    onChange(iso);
    setOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!open) return;
    if (event.key === "PageDown") {
      event.preventDefault();
      setCursor((date) => shiftMonth(date, 1));
    } else if (event.key === "PageUp") {
      event.preventDefault();
      setCursor((date) => shiftMonth(date, -1));
    }
  };

  return (
    <div ref={rootRef} onKeyDown={handleKeyDown} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((state) => !state)}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-md border bg-surface px-3 text-sm",
          CONTROL_BORDER,
          FOCUS_RING,
          value === null && "text-black/45",
        )}
      >
        <span aria-hidden="true">🗓</span>
        {value ?? placeholder}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Choose a date"
          className={cn(SURFACE, "absolute z-30 mt-1 w-64 rounded-md p-3 shadow-lg")}
        >
          <div className="mb-2 flex items-center justify-between">
            <IconButton
              label="Previous month"
              icon={<span>‹</span>}
              size="sm"
              onClick={() => setCursor((date) => shiftMonth(date, -1))}
            />
            <span className="text-xs font-medium text-black/75 dark:text-white/75">
              {monthLabel(cursor)}
            </span>
            <IconButton
              label="Next month"
              icon={<span>›</span>}
              size="sm"
              onClick={() => setCursor((date) => shiftMonth(date, 1))}
            />
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAY_LABELS.map((day) => (
              <abbr
                key={day}
                title={day}
                className="py-1 text-[10px] font-medium uppercase text-black/40 no-underline"
              >
                {day.charAt(0)}
              </abbr>
            ))}

            {cells.map((cell) => {
              const disabled = isOutOfRange(cell.iso, min, max);
              const selected = cell.iso === value;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  disabled={disabled}
                  aria-current={cell.iso === today ? "date" : undefined}
                  aria-pressed={selected}
                  onClick={() => pick(cell.iso)}
                  className={cn(
                    "h-7 rounded text-xs tabular-nums",
                    cell.inMonth ? "text-black/80 dark:text-white/80" : "text-black/30",
                    selected && "bg-brand-500 font-semibold text-white",
                    !selected && !disabled && "hover:bg-surface-muted",
                    disabled && "cursor-not-allowed opacity-35",
                    cell.iso === today && !selected && "ring-1 ring-brand-500/50",
                  )}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex justify-between border-t border-black/8 pt-2">
            <button
              type="button"
              onClick={() => pick(today)}
              className="text-[11px] text-brand-600 hover:underline"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="text-[11px] text-black/50 hover:underline"
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
