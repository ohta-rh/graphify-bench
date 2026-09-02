"use client";

/**
 * Ctrl+K search overlay; advanced syntax requires `advanced_search`.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): isEnabled
 */
import type { SearchQueryInput } from "@/schemas/search";
import type { SearchHit } from "@/server/services/search-service";
import type { ActionResult } from "@/types/api";
import type { OrgId } from "@/types/common";
import type { FeatureFlagSnapshot } from "@/types/feature-flag";
import type { ReactElement } from "react";
export type SearchDialogProps = { open: boolean; orgId: OrgId; flags: FeatureFlagSnapshot; onClose: () => void; onSearch: (input: SearchQueryInput) => Promise<ActionResult<SearchHit[]>> };

export function SearchDialog(props: SearchDialogProps): ReactElement | null {
  return null;
}
