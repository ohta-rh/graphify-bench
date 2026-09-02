"use client";

/**
 * Page-number pagination control.
 *
 * Owner A — design system. The windowing arithmetic lives in
 * `./_lib/pagination-range` so it can be unit-tested without a DOM; this file
 * is the markup around it. `usePagination` in the hooks layer owns the state.
 */
import type { ReactElement } from "react";
import { cn } from "@/lib/cn";
import {
  buildPageRange,
  pageCount,
  rangeEnd,
  rangeStart,
} from "./_lib/pagination-range";
import { FOCUS_RING } from "./_lib/tokens";

export type PaginationProps = { page: number; perPage: number; total: number; onPageChange: (page: number) => void };

export function Pagination(props: PaginationProps): ReactElement | null {
  const { page, perPage, total, onPageChange } = props;

  const pages = pageCount(total, perPage);
  // One page of results needs no control at all — the summary line alone is
  // noise on a list that cannot be paged.
  if (pages <= 1) return null;

  const current = Math.min(Math.max(1, page), pages);
  const tokens = buildPageRange(current, pages);

  const go = (target: number) => {
    const next = Math.min(Math.max(1, target), pages);
    if (next !== current) onPageChange(next);
  };

  const stepClass = cn(
    "inline-flex h-8 items-center rounded-md border border-black/12 px-2.5 text-xs text-black/70",
    "hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-45",
    FOCUS_RING,
  );

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-xs text-black/55 dark:text-white/55">
        <span className="tabular-nums">{rangeStart(current, perPage, total)}</span>
        {"–"}
        <span className="tabular-nums">{rangeEnd(current, perPage, total)}</span>
        {" of "}
        <span className="tabular-nums">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => go(current - 1)}
          disabled={current === 1}
          className={stepClass}
        >
          Previous
        </button>

        {tokens.map((token, index) =>
          token === "gap" ? (
            <span
              key={`gap-${index}`}
              aria-hidden="true"
              className="px-1 text-xs text-black/40"
            >
              …
            </span>
          ) : (
            <button
              key={token}
              type="button"
              aria-label={`Page ${token}`}
              aria-current={token === current ? "page" : undefined}
              onClick={() => go(token)}
              className={cn(
                "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs tabular-nums",
                token === current
                  ? "bg-brand-500 font-medium text-white"
                  : "text-black/70 hover:bg-surface-muted dark:text-white/70",
                FOCUS_RING,
              )}
            >
              {token}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => go(current + 1)}
          disabled={current === pages}
          className={stepClass}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
