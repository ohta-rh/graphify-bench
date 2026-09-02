"use client";

/**
 * Ctrl+K overlay shell; the domain layer supplies the groups.
 *
 * Owner A — design system. Knows nothing about commands: it filters the groups
 * it is handed, keeps a single flat active index across group boundaries (so
 * ArrowDown walks from the last item of one group into the first of the next),
 * and reports the chosen id. Registering shortcuts is `useCommandPalette`'s job.
 */
import { useMemo, useState } from "react";
import type { KeyboardEvent, ReactElement } from "react";
import { cn } from "@/lib/cn";
import { isNavKey, matchesQuery, moveActiveIndex } from "./_lib/list-navigation";
import { CONTROL_BORDER, OVERLAY, SURFACE } from "./_lib/tokens";
import { useDismissableLayer, useScrollLock } from "./_lib/use-dismissable-layer";

export type CommandGroup = { heading: string; items: readonly CommandItemSpec[] };

export type CommandItemSpec = { id: string; label: string; hint?: string; shortcut?: string };

export type CommandPaletteProps = { open: boolean; groups: readonly CommandGroup[]; placeholder?: string; onClose: () => void; onSelect: (id: string) => void };

type FlatRow = { item: CommandItemSpec; heading: string; index: number };

/**
 * Filter the groups and number the surviving items in render order. The flat
 * index is what makes arrow navigation continuous across headings.
 */
export function flattenGroups(
  groups: readonly CommandGroup[],
  query: string,
): { rows: FlatRow[]; sections: { heading: string; rows: FlatRow[] }[] } {
  const rows: FlatRow[] = [];
  const sections: { heading: string; rows: FlatRow[] }[] = [];

  for (const group of groups) {
    const kept: FlatRow[] = [];
    for (const item of group.items) {
      const haystack = `${item.label} ${item.hint ?? ""} ${group.heading}`;
      if (!matchesQuery(haystack, query)) continue;
      const row = { item, heading: group.heading, index: rows.length };
      rows.push(row);
      kept.push(row);
    }
    if (kept.length > 0) sections.push({ heading: group.heading, rows: kept });
  }

  return { rows, sections };
}

export function CommandPalette(props: CommandPaletteProps): ReactElement | null {
  const { open, groups, placeholder = "Search commands…", onClose, onSelect } = props;

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const panelRef = useDismissableLayer<HTMLDivElement>({ open, onDismiss: onClose });
  useScrollLock(open);

  const { rows, sections } = useMemo(
    () => flattenGroups(groups, query),
    [groups, query],
  );

  // A fresh open starts from a clean query. Adjusting state during render on an
  // open/closed transition is the documented alternative to an effect here: the
  // reset lands in the same commit as the open, with no extra paint.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuery("");
      setActiveIndex(0);
    }
  }

  const choose = (id: string) => {
    onSelect(id);
    onClose();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const key = event.key;
    if (isNavKey(key)) {
      event.preventDefault();
      setActiveIndex((index) => moveActiveIndex(index, key, rows.length));
      return;
    }
    if (key === "Enter") {
      event.preventDefault();
      const row = rows[activeIndex];
      if (row) choose(row.item.id);
    }
  };

  if (!open) return null;

  return (
    <div className={cn(OVERLAY, "flex items-start justify-center p-4 pt-24")}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={handleKeyDown}
        className={cn(SURFACE, "w-full max-w-xl overflow-hidden rounded-lg shadow-2xl")}
      >
        <input
          autoFocus
          type="text"
          role="combobox"
          aria-expanded
          aria-controls="command-palette-list"
          aria-autocomplete="list"
          value={query}
          placeholder={placeholder}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          className={cn(
            "w-full border-b bg-transparent px-4 py-3 text-sm outline-none placeholder:text-black/40",
            CONTROL_BORDER,
          )}
        />

        <div id="command-palette-list" role="listbox" className="max-h-80 overflow-y-auto py-1">
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-black/45">
              No commands match “{query}”
            </p>
          ) : null}

          {sections.map((section) => (
            <div key={section.heading} className="py-1">
              <p className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-wide text-black/40">
                {section.heading}
              </p>
              {section.rows.map((row) => (
                <button
                  key={row.item.id}
                  type="button"
                  role="option"
                  aria-selected={row.index === activeIndex}
                  tabIndex={-1}
                  onMouseEnter={() => setActiveIndex(row.index)}
                  onClick={() => choose(row.item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2 text-left text-sm",
                    row.index === activeIndex && "bg-surface-muted",
                  )}
                >
                  <span className="flex-1 truncate text-black/85 dark:text-white/85">
                    {row.item.label}
                  </span>
                  {row.item.hint !== undefined ? (
                    <span className="truncate text-[11px] text-black/45">
                      {row.item.hint}
                    </span>
                  ) : null}
                  {row.item.shortcut !== undefined ? (
                    <kbd className="rounded border border-black/15 px-1 text-[10px] text-black/55">
                      {row.item.shortcut}
                    </kbd>
                  ) : null}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
