/**
 * Streams the issue CSV; requires the `csv_export` flag.
 *
 * Owner D. Query parameters are parsed with `exportIssuesSchema` — the same
 * schema the export UI submits — so `?includeArchived=true` cannot mean one
 * thing in the form and another here.
 *
 * Must call (do not reimplement): can, isEnabled, toCsv
 */

import { PENDING_ISSUE_ID, PENDING_PROJECT_ID } from "@/actions/_lib/permission-resources";
import { errorResponse, failure } from "@/app/api/_lib/responses";
import { getActor } from "@/lib/actor";
import { csvResponseHeaders, toCsv } from "@/lib/csv";
import { isEnabled } from "@/lib/feature-flags";
import { can } from "@/lib/permissions";
import { exportIssuesSchema } from "@/schemas/export";
import { buildFlagContext } from "@/server/services/feature-flag-service";
import { listIssues } from "@/server/services/issue-service";
import { getOrganizationSummary } from "@/server/services/organization-service";
import type { Issue } from "@/types/issue";

export const dynamic = "force-dynamic";

const EXPORT_PAGE_LIMIT = 100;

const COLUMNS: readonly string[] = [
  "number",
  "title",
  "status",
  "priority",
  "assigneeId",
  "authorId",
  "dueAt",
  "createdAt",
  "updatedAt",
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

    if (!isEnabled("csv_export", buildFlagContext(actor, organization))) {
      return failure("forbidden", "CSV export is not included in this plan.");
    }

    const allowed = can(actor, "issue:read", {
      kind: "issue",
      orgId: actor.orgId,
      projectId: PENDING_PROJECT_ID,
      issueId: PENDING_ISSUE_ID,
      authorId: actor.userId,
      assigneeId: actor.userId,
    });
    if (!allowed) {
      return failure("forbidden", "You cannot export issues in this organization.");
    }

    const parsed = exportIssuesSchema.safeParse({
      orgId: actor.orgId,
      projectId: url.searchParams.get("projectId") ?? undefined,
      includeArchived: url.searchParams.get("includeArchived") ?? false,
      format: url.searchParams.get("format") ?? "csv",
    });
    if (!parsed.success) {
      return failure("validation_failed", "Bad export parameters.");
    }

    const page = await listIssues(actor, {
      orgId: parsed.data.orgId,
      projectId: parsed.data.projectId,
      includeArchived: parsed.data.includeArchived,
      limit: EXPORT_PAGE_LIMIT,
    });

    if (parsed.data.format === "json") {
      return Response.json({ items: page.items, total: page.total });
    }

    const csv = toCsv(page.items.map(toRow), COLUMNS);
    return new Response(csv, {
      headers: csvResponseHeaders(`taskflow-issues-${organization.slug}.csv`),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Flattens an `Issue` into the scalar row shape `toCsv` accepts. */
function toRow(issue: Issue): Record<string, string | number | boolean | null> {
  return {
    number: issue.number,
    title: issue.title,
    status: issue.status,
    priority: issue.priority,
    assigneeId: issue.assigneeId,
    authorId: issue.authorId,
    dueAt: issue.dueAt,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
  };
}
