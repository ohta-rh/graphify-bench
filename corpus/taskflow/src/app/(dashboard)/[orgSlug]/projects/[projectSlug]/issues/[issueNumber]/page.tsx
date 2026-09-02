/**
 * Issue detail with the comment thread and activity panel.
 *
 * Owner D. The URL carries the human-facing issue *number*, not the ULID, so
 * the number is resolved to a row inside this project before anything else —
 * that lookup is also the tenant boundary.
 *
 * Must call (do not reimplement): can
 */

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createCommentAction } from "@/actions/comments/create-comment";
import { deleteCommentAction } from "@/actions/comments/delete-comment";
import { CommentComposer } from "@/components/domain/comment/comment-composer";
import { CommentThread } from "@/components/domain/comment/comment-thread";
import { IssueActivityPanel } from "@/components/domain/issue/issue-activity-panel";
import { IssueDetail } from "@/components/domain/issue/issue-detail";
import { can } from "@/lib/permissions";
import { findIssueByNumber } from "@/server/repositories/issue-repository";
import { listActivityForSubject } from "@/server/repositories/activity-repository";
import { findUserById } from "@/server/repositories/user-repository";
import { getThread } from "@/server/services/comment-service";
import { getIssue } from "@/server/services/issue-service";
import { listMembers } from "@/server/services/member-service";
import type { CommentId } from "@/types/common";
import type { User } from "@/types/member";
import { loadProjectContext } from "../../../../_lib/project-context";

type PageParams = {
  orgSlug: string;
  projectSlug: string;
  issueNumber: string;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Issue",
};

const MEMBER_PICKER_LIMIT = 100;

export default async function Page(props: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js 16: params and searchParams are Promises and MUST be awaited.
  const { orgSlug, projectSlug, issueNumber } = await props.params;
  await props.searchParams;

  const { org, actor, project } = await loadProjectContext(orgSlug, projectSlug);

  const number = Number.parseInt(issueNumber, 10);
  if (!Number.isInteger(number) || number < 1) {
    notFound();
  }

  // The number is only unique within a project, so the lookup is scoped to both
  // the org and the project — never to the number alone.
  const found = await findIssueByNumber(org.id, project.id, number);
  if (found === null) {
    notFound();
  }

  const allowed = can(actor, "issue:read", {
    kind: "issue",
    orgId: org.id,
    projectId: project.id,
    issueId: found.id,
    authorId: found.authorId,
    assigneeId: found.assigneeId,
  });
  if (!allowed) {
    notFound();
  }

  const [issue, thread, members, activity, author, assignee] = await Promise.all([
    getIssue(actor, org.id, found.id),
    getThread(actor, org.id, found.id),
    listMembers(actor, { orgId: org.id, limit: MEMBER_PICKER_LIMIT }),
    listActivityForSubject(org.id, "issue", found.id),
    findUserById(found.authorId),
    found.assigneeId === null
      ? Promise.resolve<User | null>(null)
      : findUserById(found.assigneeId),
  ]);

  if (author === null) {
    notFound();
  }

  const actors: Record<string, User> = {};
  for (const member of members.items) {
    actors[member.userId] = member.user;
  }

  async function deleteComment(commentId: CommentId): Promise<void> {
    "use server";
    await deleteCommentAction({ orgId: org.id, commentId });
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-10">
        <IssueDetail
          issue={issue}
          actor={actor}
          author={author}
          assignee={assignee}
        />

        <section className="space-y-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Comments
          </h2>

          <CommentThread nodes={thread} actor={actor} onDelete={deleteComment} />

          <CommentComposer
            orgId={org.id}
            issueId={found.id}
            members={members.items}
            onSubmit={createCommentAction}
          />
        </section>
      </div>

      <IssueActivityPanel events={activity} actors={actors} />
    </div>
  );
}
