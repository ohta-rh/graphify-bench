"use server";

/**
 * Search Server Action used by the command palette and the search page.
 *
 * Owner D. Searching across comments as well as issues is an `advanced_search`
 * capability; when the flag is off the requested kinds are narrowed rather than
 * rejected, so the palette degrades instead of erroring.
 *
 * Must call (do not reimplement): searchQuerySchema, can, isEnabled, getActor,
 * toActionResult
 */

import { ForbiddenActionError } from "@/actions/_lib/action-errors";
import { withAction } from "@/actions/_lib/with-action";
import { isEnabled } from "@/lib/feature-flags";
import { can } from "@/lib/permissions";
import { searchQuerySchema, type SearchQueryInput } from "@/schemas/search";
import { buildFlagContext } from "@/server/services/feature-flag-service";
import { getOrganizationSummary } from "@/server/services/organization-service";
import { search, type SearchHit } from "@/server/services/search-service";
import type { ActionResult } from "@/types/api";

const run = withAction<typeof searchQuerySchema, SearchHit[]>(
  searchQuerySchema,
  async (raw, actor) => {
    const input = raw as SearchQueryInput;

    if (!can(actor, "org:read", { kind: "organization", orgId: input.orgId })) {
      throw new ForbiddenActionError("org:read");
    }

    const { organization } = await getOrganizationSummary(actor, input.orgId);
    const context = buildFlagContext(actor, organization);

    const kinds = isEnabled("advanced_search", context)
      ? input.kinds
      : input.kinds.filter((kind) => kind === "issue");

    const page = await search(actor, { ...input, kinds });
    return [...page.items];
  },
  { requireOrg: true },
);

export async function searchAction(raw: unknown): Promise<ActionResult<SearchHit[]>> {
  return run(raw);
}
