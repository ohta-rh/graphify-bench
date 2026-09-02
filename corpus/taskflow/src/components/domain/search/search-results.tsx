/**
 * Grouped search hits.
 */
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { SearchHit } from "@/server/services/search-service";
import type { ReactElement } from "react";

export type SearchResultsProps = {
  hits: readonly SearchHit[];
  query: string;
  onSelect: (hit: SearchHit) => void;
};

const KIND_HEADINGS: Readonly<Record<SearchHit["kind"], string>> = {
  issue: "Issues",
  comment: "Comments",
  project: "Projects",
};

/** Groups hits by kind while preserving the relevance order inside a kind. */
export function groupHits(
  hits: readonly SearchHit[],
): readonly { kind: SearchHit["kind"]; hits: readonly SearchHit[] }[] {
  const byKind = new Map<SearchHit["kind"], SearchHit[]>();
  for (const hit of hits) {
    const bucket = byKind.get(hit.kind) ?? [];
    bucket.push(hit);
    byKind.set(hit.kind, bucket);
  }
  return [...byKind.entries()].map(([kind, group]) => ({ kind, hits: group }));
}

export function SearchResults(props: SearchResultsProps): ReactElement | null {
  const { hits, query, onSelect } = props;

  if (query.length === 0) return null;

  if (hits.length === 0) {
    return (
      <EmptyState
        title={`No results for “${query}”`}
        description="Try a shorter term, or search a different kind."
      />
    );
  }

  return (
    <div className="search-results space-y-4">
      {groupHits(hits).map((group) => (
        <section key={group.kind}>
          <h3 className="mb-1 text-xs font-medium uppercase text-neutral-500">
            {KIND_HEADINGS[group.kind]}
          </h3>
          <ul className="divide-y">
            {group.hits.map((hit) => (
              <li key={`${hit.kind}:${hit.id}`}>
                <button
                  type="button"
                  className="w-full px-1 py-2 text-left hover:bg-neutral-50"
                  onClick={() => onSelect(hit)}
                >
                  <span className="flex items-center gap-2">
                    <Badge tone="neutral" size="sm">
                      {hit.kind}
                    </Badge>
                    <span className="font-medium">{hit.title}</span>
                  </span>
                  <span className="block text-sm text-neutral-600">
                    {hit.snippet}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
