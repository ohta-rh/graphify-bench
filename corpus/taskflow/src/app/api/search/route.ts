/**
 * JSON search endpoint used by the command palette.
 *
 * Owner D. The palette hits this route rather than the Server Action because it
 * fires on every keystroke and wants a plain cancellable fetch; the gating is
 * identical to `searchAction`, deliberately duplicated so neither entry point
 * can be the lenient one.
 *
 * Must call (do not reimplement): can, isEnabled
 */

import { errorResponse, failure } from "@/app/api/_lib/responses";
import { getActor } from "@/lib/actor";
import { isEnabled } from "@/lib/feature-flags";
import { can } from "@/lib/permissions";
import { searchQuerySchema } from "@/schemas/search";
import { buildFlagContext } from "@/server/services/feature-flag-service";
import { getOrganizationSummary } from "@/server/services/organization-service";
import { search } from "@/server/services/search-service";

export const dynamic = "force-dynamic";

const PALETTE_LIMIT = 10;

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const orgSlug = url.searchParams.get("orgSlug");
    const q = url.searchParams.get("q");

    if (orgSlug === null || q === null) {
      return failure("validation_failed", "orgSlug and q are required.");
    }

    const actor = await getActor(orgSlug);

    if (!can(actor, "org:read", { kind: "organization", orgId: actor.orgId })) {
      return failure("forbidden", "You cannot search this organization.");
    }

    const { organization } = await getOrganizationSummary(actor, actor.orgId);
    const context = buildFlagContext(actor, organization);

    if (!isEnabled("command_palette", context)) {
      return failure("forbidden", "The command palette is not enabled here.");
    }

    const parsed = searchQuerySchema.safeParse({
      orgId: actor.orgId,
      q,
      kinds: isEnabled("advanced_search", context)
        ? ["issue", "comment", "project"]
        : ["issue"],
      limit: PALETTE_LIMIT,
    });
    if (!parsed.success) {
      return failure("validation_failed", "Bad search query.");
    }

    const page = await search(actor, parsed.data);
    return Response.json({ items: page.items, total: page.total });
  } catch (error) {
    return errorResponse(error);
  }
}
