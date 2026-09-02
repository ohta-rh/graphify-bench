"use client";

/**
 * Ctrl+K search overlay; advanced syntax requires `advanced_search`.
 *
 * Must call (do not reimplement): isEnabled
 */
import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ANONYMOUS_FLAG_CONTEXT } from "@/hooks/flag-context";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { isEnabled } from "@/lib/feature-flags";
import type { SearchQueryInput } from "@/schemas/search";
import type { SearchHit } from "@/server/services/search-service";
import type { ActionResult } from "@/types/api";
import type { OrgId } from "@/types/common";
import type { FeatureFlagSnapshot } from "@/types/feature-flag";
import type { ReactElement } from "react";
import { describeQuery, parseSearchQuery } from "./query-syntax";
import { SearchResults } from "./search-results";

export type SearchDialogProps = {
  open: boolean;
  orgId: OrgId;
  flags: FeatureFlagSnapshot;
  onClose: () => void;
  onSearch: (input: SearchQueryInput) => Promise<ActionResult<SearchHit[]>>;
};

const SEARCH_PAGE_SIZE = 20;

export function SearchDialog(props: SearchDialogProps): ReactElement | null {
  const { open, orgId, flags, onClose, onSearch } = props;

  const [raw, setRaw] = useState("");
  // Results are stored together with the query that produced them, so
  // "still searching" is derived rather than a second piece of state that
  // could disagree with the first.
  const [results, setResults] = useState<{
    query: string;
    hits: readonly SearchHit[];
  }>({ query: "", hits: [] });

  const debounced = useDebouncedValue(raw);
  const advanced =
    flags.advanced_search === true ||
    isEnabled("advanced_search", { ...ANONYMOUS_FLAG_CONTEXT, orgId });
  const parsed = parseSearchQuery(debounced, advanced);

  const query = parsed.text;
  const pending = query.length > 0 && results.query !== query;

  useEffect(() => {
    if (!open || query.length === 0) return;

    let cancelled = false;

    void onSearch({
      orgId,
      q: query,
      kinds: [...parsed.kinds],
      ...(parsed.projectId !== null ? { projectId: parsed.projectId } : {}),
      limit: SEARCH_PAGE_SIZE,
    }).then((result) => {
      if (cancelled) return;
      setResults({ query, hits: result.ok ? result.data : [] });
    });

    return () => {
      cancelled = true;
    };
    // `parsed` is derived from the debounced string; depending on its parts
    // keeps the effect from re-firing on every keystroke.
  }, [open, orgId, onSearch, query, parsed.kinds, parsed.projectId]);

  if (!open) return null;

  return (
    <Dialog
      open={open}
      title="Search"
      description={
        advanced
          ? "Use kind:issue or project:<id> to narrow the search."
          : undefined
      }
      onClose={onClose}
    >
      <Input
        name="q"
        type="search"
        value={raw}
        placeholder={advanced ? "kind:comment deploy failed" : "Search…"}
        onChange={setRaw}
      />

      {advanced && debounced.length > 0 ? (
        <p className="mt-1 text-xs text-neutral-500">{describeQuery(parsed)}</p>
      ) : null}

      <div className="mt-3">
        {pending ? (
          <Spinner size="sm" label="Searching" />
        ) : (
          <SearchResults
            hits={results.query === query ? results.hits : []}
            query={query}
            onSelect={() => onClose()}
          />
        )}
      </div>
    </Dialog>
  );
}
