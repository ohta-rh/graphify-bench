"use server";

/**
 * Creates an issue after the per-project quota check.
 *
 * Owner D. The quota is read from `@/config/plan-limits` rather than hard-coded
 * here — the plan of the owning organization decides `issuesPerProject`.
 *
 * Must call (do not reimplement): createIssueSchema, can, getPlanLimits,
 * getActor, toActionResult
 */

import { withAction } from "@/actions/_lib/with-action";
import { ForbiddenActionError, PlanLimitError } from "@/actions/_lib/action-errors";
import { getPlanLimits } from "@/config/plan-limits";
import { issueTag, orgTag, projectTag, revalidateTagged, CACHE_PROFILES } from "@/lib/cache";
import { can } from "@/lib/permissions";
import { createIssueSchema, type CreateIssueInput } from "@/schemas/issue";
import { createIssue, listIssues } from "@/server/services/issue-service";
import { getOrganizationSummary } from "@/server/services/organization-service";
import type { ActionResult } from "@/types/api";
import type { Issue } from "@/types/issue";
import type { Actor } from "@/types/member";

const run = withAction<typeof createIssueSchema, Issue>(
  createIssueSchema,
  async (raw, actor) => {
    const input = raw as CreateIssueInput;

    const allowed = can(actor, "issue:create", {
      kind: "issue",
      orgId: input.orgId,
      projectId: input.projectId,
      issueId: "" as Issue["id"],
      authorId: actor.userId,
      assigneeId: input.assigneeId,
    });
    if (!allowed) {
      throw new ForbiddenActionError("issue:create");
    }

    await assertProjectHasRoom(actor, input);

    const issue = await createIssue(actor, input);

    revalidateTagged(
      [orgTag(input.orgId), projectTag(input.projectId), issueTag(issue.id)],
      CACHE_PROFILES.minutes,
    );
    return issue;
  },
  { revalidate: ["issues"], cacheProfile: "minutes" },
);

/**
 * Counts the issues already living in the project and compares them with the
 * plan's `issuesPerProject` ceiling. Archived issues still occupy the quota,
 * which is why the count deliberately includes them.
 */
async function assertProjectHasRoom(
  actor: Actor,
  input: CreateIssueInput,
): Promise<void> {
  const summary = await getOrganizationSummary(actor, input.orgId);
  const limits = getPlanLimits(summary.organization.plan);

  const existing = await listIssues(actor, {
    orgId: input.orgId,
    projectId: input.projectId,
    limit: 1,
    includeArchived: true,
  });

  if (existing.total >= limits.issuesPerProject) {
    throw new PlanLimitError("issuesPerProject", limits.issuesPerProject, existing.total);
  }
}

export async function createIssueAction(raw: unknown): Promise<ActionResult<Issue>> {
  return run(raw);
}
