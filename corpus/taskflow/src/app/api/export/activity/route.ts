/**
 * Streams the audit-log CSV; requires `activity:export`.
 *
 * Owner D. `activity:export` sits above `activity:read` in `ROLE_MATRIX` —
 * reading the feed in the UI and walking off with the whole audit trail are
 * different privileges.
 *
 * Must call (do not reimplement): can, isEnabled, toCsv
 */

import { errorResponse, failure } from "@/app/api/_lib/responses";
import { getActor } from "@/lib/actor";
import { csvResponseHeaders, toCsv } from "@/lib/csv";
import { isEnabled } from "@/lib/feature-flags";
import { can } from "@/lib/permissions";
import { exportActivitySchema } from "@/schemas/activity";
import { listActivity } from "@/server/services/activity-service";
import { buildFlagContext } from "@/server/services/feature-flag-service";
import { getOrganizationSummary } from "@/server/services/organization-service";
import type { ActivityEvent } from "@/types/activity";

export const dynamic = "force-dynamic";

const EXPORT_PAGE_LIMIT = 100;

const COLUMNS: readonly string[] = [
  "occurredAt",
  "action",
  "actorId",
  "subjectKind",
  "subjectId",
  "projectId",
  "summary",
];

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const orgSlug = url.searchParams.get("orgSlug");
    if (orgSlug === null) {
      return failure("validation_failed", "orgSlug is required.");
    }

    const actor = await getActor(orgSlug);
    const { organization } = await getOrganizationSummary(actor, actor.orgId);

    if (!can(actor, "activity:export", { kind: "activity", orgId: actor.orgId })) {
      return failure("forbidden", "Exporting the audit log requires an admin.");
    }

    if (!isEnabled("csv_export", buildFlagContext(actor, organization))) {
      return failure("forbidden", "CSV export is not included in this plan.");
    }

    const parsed = exportActivitySchema.safeParse({
      orgId: actor.orgId,
      since: url.searchParams.get("since"),
      until: url.searchParams.get("until"),
      format: url.searchParams.get("format") ?? "csv",
    });
    if (!parsed.success) {
      return failure(
        "validation_failed",
        "since and until must be ISO-8601 timestamps.",
      );
    }

    const page = await listActivity(actor, {
      orgId: parsed.data.orgId,
      since: parsed.data.since,
      until: parsed.data.until,
      limit: EXPORT_PAGE_LIMIT,
    });

    if (parsed.data.format === "json") {
      return Response.json({ items: page.items, total: page.total });
    }

    const csv = toCsv(page.items.map(toRow), COLUMNS);
    return new Response(csv, {
      headers: csvResponseHeaders(`taskflow-activity-${organization.slug}.csv`),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function toRow(
  event: ActivityEvent,
): Record<string, string | number | boolean | null> {
  return {
    occurredAt: event.occurredAt,
    action: event.action,
    actorId: event.actorId,
    subjectKind: event.subjectKind,
    subjectId: event.subjectId,
    projectId: event.projectId,
    summary: event.summary,
  };
}
