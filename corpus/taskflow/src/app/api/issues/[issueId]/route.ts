/**
 * Fetch/patch one issue over JSON.
 *
 * Owner D. The tenant check is explicit here rather than implied: the route
 * takes an `issueId` straight off the URL, so `assertOrgScope()` against the
 * fetched row is what stops one organization reading another's issue by id.
 *
 * Must call (do not reimplement): can, assertOrgScope
 */

import { errorResponse, failure } from "@/app/api/_lib/responses";
import { getActor } from "@/lib/actor";
import { can } from "@/lib/permissions";
import { assertOrgScope } from "@/lib/tenant";
import { issueIdSchema } from "@/schemas/common";
import { updateIssueSchema } from "@/schemas/issue";
import { getIssue, updateIssue } from "@/server/services/issue-service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ issueId: string }> };

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const orgSlug = url.searchParams.get("orgSlug");
    if (orgSlug === null) {
      return failure("validation_failed", "orgSlug is required.");
    }

    // Next.js 16: route `params` is a Promise and MUST be awaited.
    const { issueId } = await context.params;
    const parsedId = issueIdSchema.safeParse(issueId);
    if (!parsedId.success) {
      return failure("validation_failed", "Malformed issue id.");
    }

    const actor = await getActor(orgSlug);
    const found = await getIssue(actor, actor.orgId, parsedId.data);
    assertOrgScope(actor, found.issue.orgId);

    const allowed = can(actor, "issue:read", {
      kind: "issue",
      orgId: found.issue.orgId,
      projectId: found.issue.projectId,
      issueId: found.issue.id,
      authorId: found.issue.authorId,
      assigneeId: found.issue.assigneeId,
    });
    if (!allowed) {
      return failure("forbidden", "You cannot read this issue.");
    }

    return Response.json(found);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const orgSlug = url.searchParams.get("orgSlug");
    if (orgSlug === null) {
      return failure("validation_failed", "orgSlug is required.");
    }

    // Next.js 16: route `params` is a Promise and MUST be awaited.
    const { issueId } = await context.params;
    const actor = await getActor(orgSlug);

    const body: unknown = await request.json();
    const parsed = updateIssueSchema.safeParse({
      ...(typeof body === "object" && body !== null ? body : {}),
      orgId: actor.orgId,
      issueId,
    });
    if (!parsed.success) {
      return failure("validation_failed", "Bad issue patch.");
    }

    const current = await getIssue(actor, actor.orgId, parsed.data.issueId);
    assertOrgScope(actor, current.issue.orgId);

    const allowed = can(actor, "issue:update", {
      kind: "issue",
      orgId: current.issue.orgId,
      projectId: current.issue.projectId,
      issueId: current.issue.id,
      authorId: current.issue.authorId,
      assigneeId: current.issue.assigneeId,
    });
    if (!allowed) {
      return failure("forbidden", "You cannot update this issue.");
    }

    const updated = await updateIssue(actor, parsed.data);
    return Response.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
