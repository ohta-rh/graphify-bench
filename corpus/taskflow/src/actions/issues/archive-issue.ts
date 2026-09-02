"use server";

/**
 * Archives an issue (soft delete).
 *
 * Owner D. `assertNotArchived()` makes the operation fail loudly rather than
 * silently re-stamping `archived_at`, which would otherwise reset the retention
 * clock the cleanup job reads.
 *
 * Must call (do not reimplement): archiveIssueSchema, can, assertNotArchived,
 * getActor, toActionResult
 */

import { ForbiddenActionError } from "@/actions/_lib/action-errors";
import { withAction } from "@/actions/_lib/with-action";
import { CACHE_PROFILES, issueTag, projectTag, revalidateTagged } from "@/lib/cache";
import { can } from "@/lib/permissions";
import { assertNotArchived } from "@/lib/soft-delete";
import { archiveIssueSchema } from "@/schemas/issue";
import { archiveIssue, getIssue } from "@/server/services/issue-service";
import type { ActionResult } from "@/types/api";
import type { IssueId, OrgId } from "@/types/common";
import type { Issue } from "@/types/issue";

type ArchiveIssueInput = { orgId: OrgId; issueId: IssueId };

const run = withAction<typeof archiveIssueSchema, Issue>(
  archiveIssueSchema,
  async (raw, actor) => {
    const input = raw as ArchiveIssueInput;

    const current = await getIssue(actor, input.orgId, input.issueId);

    const allowed = can(actor, "issue:archive", {
      kind: "issue",
      orgId: input.orgId,
      projectId: current.issue.projectId,
      issueId: input.issueId,
      authorId: current.issue.authorId,
      assigneeId: current.issue.assigneeId,
    });
    if (!allowed) {
      throw new ForbiddenActionError("issue:archive");
    }

    assertNotArchived("issue", input.issueId, current.issue);

    const issue = await archiveIssue(actor, input.orgId, input.issueId);
    revalidateTagged(
      [issueTag(issue.id), projectTag(issue.projectId)],
      CACHE_PROFILES.minutes,
    );
    return issue;
  },
  { revalidate: ["issues", "board"], cacheProfile: "minutes" },
);

export async function archiveIssueAction(raw: unknown): Promise<ActionResult<Issue>> {
  return run(raw);
}
