"use server";

/**
 * Assigns or unassigns an issue.
 *
 * Owner D. `assigneeId: null` is the unassign case and is deliberately allowed
 * — the schema types it as nullable rather than optional so "clear it" and
 * "leave it alone" cannot be confused.
 *
 * Must call (do not reimplement): assignIssueSchema, can, getActor,
 * toActionResult
 */

import { ForbiddenActionError } from "@/actions/_lib/action-errors";
import { PENDING_PROJECT_ID } from "@/actions/_lib/permission-resources";
import { withAction } from "@/actions/_lib/with-action";
import { CACHE_PROFILES, issueTag, revalidateTagged } from "@/lib/cache";
import { can } from "@/lib/permissions";
import { assignIssueSchema, type AssignIssueInput } from "@/schemas/issue";
import { assignIssue } from "@/server/services/issue-service";
import type { ActionResult } from "@/types/api";
import type { Issue } from "@/types/issue";

const run = withAction<typeof assignIssueSchema, Issue>(
  assignIssueSchema,
  async (raw, actor) => {
    const input = raw as AssignIssueInput;

    const allowed = can(actor, "issue:assign", {
      kind: "issue",
      orgId: input.orgId,
      projectId: PENDING_PROJECT_ID,
      issueId: input.issueId,
      authorId: actor.userId,
      assigneeId: input.assigneeId,
    });
    if (!allowed) {
      throw new ForbiddenActionError("issue:assign");
    }

    const issue = await assignIssue(actor, input);
    revalidateTagged([issueTag(issue.id)], CACHE_PROFILES.seconds);
    return issue;
  },
  { revalidate: ["issues"], cacheProfile: "seconds" },
);

export async function assignIssueAction(raw: unknown): Promise<ActionResult<Issue>> {
  return run(raw);
}
