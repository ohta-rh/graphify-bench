"use server";

/**
 * Board drag-and-drop target; reconciles the optimistic update.
 *
 * Owner D. The client has already moved the card via `useOptimisticIssues`, so
 * the only thing that matters here is returning the authoritative row — the
 * hook reconciles against it and snaps the card back if the move was refused.
 * Dragging is only reachable when `kanban_board` is on, and the flag is
 * re-checked server-side because the client copy is only a snapshot.
 *
 * Must call (do not reimplement): moveIssueSchema, can, isEnabled, getActor,
 * toActionResult
 */

import {
  FeatureUnavailableError,
  ForbiddenActionError,
} from "@/actions/_lib/action-errors";
import { PENDING_PROJECT_ID } from "@/actions/_lib/permission-resources";
import { withAction } from "@/actions/_lib/with-action";
import { CACHE_PROFILES, issueTag, projectTag, revalidateTagged } from "@/lib/cache";
import { isEnabled } from "@/lib/feature-flags";
import { can } from "@/lib/permissions";
import { moveIssueSchema, type MoveIssueInput } from "@/schemas/issue";
import { buildFlagContext } from "@/server/services/feature-flag-service";
import { moveIssue } from "@/server/services/issue-service";
import { getOrganizationSummary } from "@/server/services/organization-service";
import type { ActionResult } from "@/types/api";
import type { Issue } from "@/types/issue";

const run = withAction<typeof moveIssueSchema, Issue>(
  moveIssueSchema,
  async (raw, actor) => {
    const input = raw as MoveIssueInput;

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

    const { organization } = await getOrganizationSummary(actor, input.orgId);
    if (!isEnabled("kanban_board", buildFlagContext(actor, organization))) {
      throw new FeatureUnavailableError("kanban_board");
    }

    const issue = await moveIssue(actor, input);
    revalidateTagged(
      [issueTag(issue.id), projectTag(issue.projectId)],
      CACHE_PROFILES.seconds,
    );
    return issue;
  },
  { revalidate: ["board"], cacheProfile: "seconds" },
);

export async function moveIssueAction(raw: unknown): Promise<ActionResult<Issue>> {
  return run(raw);
}
