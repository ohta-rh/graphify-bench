"use server";

/**
 * Updates issue fields.
 *
 * Owner D. Only the fields present in the payload are touched; the service
 * diffs them and emits `issue.updated` with `changedFields` so the activity log
 * can describe the edit without re-reading the row.
 *
 * Must call (do not reimplement): updateIssueSchema, can, getActor,
 * toActionResult
 */

import { ForbiddenActionError } from "@/actions/_lib/action-errors";
import { PENDING_PROJECT_ID } from "@/actions/_lib/permission-resources";
import { withAction } from "@/actions/_lib/with-action";
import { CACHE_PROFILES, issueTag, revalidateTagged } from "@/lib/cache";
import { can } from "@/lib/permissions";
import { updateIssueSchema, type UpdateIssueInput } from "@/schemas/issue";
import { updateIssue } from "@/server/services/issue-service";
import type { ActionResult } from "@/types/api";
import type { Issue } from "@/types/issue";

const run = withAction<typeof updateIssueSchema, Issue>(
  updateIssueSchema,
  async (raw, actor) => {
    const input = raw as UpdateIssueInput;

    const allowed = can(actor, "issue:update", {
      kind: "issue",
      orgId: input.orgId,
      projectId: PENDING_PROJECT_ID,
      issueId: input.issueId,
      authorId: actor.userId,
      assigneeId: actor.userId,
    });
    if (!allowed) {
      throw new ForbiddenActionError("issue:update");
    }

    const issue = await updateIssue(actor, input);
    revalidateTagged([issueTag(issue.id)], CACHE_PROFILES.seconds);
    return issue;
  },
  { revalidate: ["issues"], cacheProfile: "seconds" },
);

export async function updateIssueAction(raw: unknown): Promise<ActionResult<Issue>> {
  return run(raw);
}
