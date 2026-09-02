"use server";

/**
 * Moves an issue between statuses and emits `issue.status_changed`.
 *
 * Owner D. The event is emitted by `IssueService`, not here — the notification
 * fan-out, the search reindex and the activity log all hang off that one event
 * rather than off this action.
 *
 * Must call (do not reimplement): changeIssueStatusSchema, can, getActor,
 * toActionResult
 */

import { ForbiddenActionError } from "@/actions/_lib/action-errors";
import { PENDING_PROJECT_ID } from "@/actions/_lib/permission-resources";
import { withAction } from "@/actions/_lib/with-action";
import { CACHE_PROFILES, issueTag, projectTag, revalidateTagged } from "@/lib/cache";
import { can } from "@/lib/permissions";
import {
  changeIssueStatusSchema,
  type ChangeIssueStatusInput,
} from "@/schemas/issue";
import { changeIssueStatus } from "@/server/services/issue-service";
import type { ActionResult } from "@/types/api";
import type { Issue } from "@/types/issue";

const run = withAction<typeof changeIssueStatusSchema, Issue>(
  changeIssueStatusSchema,
  async (raw, actor) => {
    const input = raw as ChangeIssueStatusInput;

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

    const issue = await changeIssueStatus(actor, input);
    revalidateTagged(
      [issueTag(issue.id), projectTag(issue.projectId)],
      CACHE_PROFILES.seconds,
    );
    return issue;
  },
  { revalidate: ["issues", "board"], cacheProfile: "seconds" },
);

export async function changeIssueStatusAction(
  raw: unknown,
): Promise<ActionResult<Issue>> {
  return run(raw);
}
