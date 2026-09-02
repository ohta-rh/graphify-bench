/**
 * Kanban board; falls back to the list view when `kanban_board` is off.
 *
 * Owner D. The fallback is a redirect rather than an error page: the board and
 * the list show the same issues, so there is nothing to apologise for — the
 * board is simply not part of every plan.
 *
 * Must call (do not reimplement): isEnabled, can
 */

import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { moveIssueAction } from "@/actions/issues/move-issue";
import { PENDING_ISSUE_ID } from "@/actions/_lib/permission-resources";
import { KanbanBoard } from "@/components/domain/board/kanban-board";
import { isEnabled } from "@/lib/feature-flags";
import { can } from "@/lib/permissions";
import { buildFlagContext } from "@/server/services/feature-flag-service";
import { getBoard } from "@/server/services/issue-service";
import { loadProjectContext } from "../../../_lib/project-context";

type PageParams = { orgSlug: string; projectSlug: string };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Board",
};

export default async function Page(props: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js 16: params and searchParams are Promises and MUST be awaited.
  const { orgSlug, projectSlug } = await props.params;
  await props.searchParams;

  const { org, actor, flags, project } = await loadProjectContext(
    orgSlug,
    projectSlug,
  );

  if (!isEnabled("kanban_board", buildFlagContext(actor, org))) {
    redirect(`/${orgSlug}/projects/${projectSlug}/issues`);
  }

  // Read access is enough to *see* the board; dragging additionally needs
  // `issue:update`, which the board component decides from the same actor.
  const mayRead = can(actor, "issue:read", {
    kind: "issue",
    orgId: org.id,
    projectId: project.id,
    issueId: PENDING_ISSUE_ID,
    authorId: actor.userId,
    assigneeId: actor.userId,
  });
  if (!mayRead) {
    redirect(`/${orgSlug}/projects/${projectSlug}`);
  }

  const columns = await getBoard(actor, org.id, project.id);

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Drag a card to change its status. The move is applied straight away and
        reconciled against the server.
      </p>

      <KanbanBoard
        columns={columns}
        actor={actor}
        flags={flags}
        onMove={moveIssueAction}
      />
    </div>
  );
}
