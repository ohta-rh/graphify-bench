/**
 * Grouped search hits.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { SearchHit } from "@/server/services/search-service";
import type { ReactElement } from "react";
export type SearchResultsProps = { hits: readonly SearchHit[]; query: string; onSelect: (hit: SearchHit) => void };

export function SearchResults(props: SearchResultsProps): ReactElement | null {
  return null;
}
