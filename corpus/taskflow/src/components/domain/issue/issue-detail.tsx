/**
 * Issue header, description and metadata rail.
 *
 * Must call (do not reimplement): can
 */
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatRelative, isOverdue } from "@/lib/date";
import { humanizePriority, humanizeStatus } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";
import { can } from "@/lib/permissions";
import { isArchived } from "@/lib/soft-delete";
import type { IssueWithRelations } from "@/types/issue";
import type { Actor, User } from "@/types/member";
import type { ReactElement } from "react";
import { issueResource } from "../permission/resources";
import { PRIORITY_TONE, STATUS_TONE } from "./issue-tone";

export type IssueDetailProps = {
  issue: IssueWithRelations;
  actor: Actor;
  author: User;
  assignee: User | null;
};

export function IssueDetail(props: IssueDetailProps): ReactElement | null {
  const { issue: relations, actor, author, assignee } = props;
  const { issue, labels, commentCount, attachmentCount } = relations;
  const resource = issueResource(issue);

  const mayUpdate = can(actor, "issue:update", resource);
  const mayArchive = can(actor, "issue:archive", resource);
  const archived = isArchived(issue);

  return (
    <article className="issue-detail grid gap-6 md:grid-cols-[1fr_16rem]">
      <div className="min-w-0">
        <header className="mb-4">
          <p className="text-sm text-neutral-500">#{issue.number}</p>
          <h1 className="text-2xl font-semibold">{issue.title}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {author.name} opened this {formatRelative(issue.createdAt)}
            {" · "}
            {commentCount} comments
            {attachmentCount > 0 ? ` · ${attachmentCount} attachments` : ""}
          </p>
        </header>

        {issue.description === null || issue.description.length === 0 ? (
          <p className="text-neutral-500">No description provided.</p>
        ) : (
          <div
            className="prose max-w-none"
            // The service layer sanitises on write; `renderMarkdown` escapes
            // anything it does not itself emit.
            dangerouslySetInnerHTML={{ __html: renderMarkdown(issue.description) }}
          />
        )}
      </div>

      <aside className="space-y-4 text-sm">
        <section>
          <h2 className="mb-1 font-medium text-neutral-500">Status</h2>
          <Badge tone={STATUS_TONE[issue.status]}>
            {humanizeStatus(issue.status)}
          </Badge>
          {archived ? (
            <Badge tone="warning" size="sm">
              Archived
            </Badge>
          ) : null}
        </section>

        <section>
          <h2 className="mb-1 font-medium text-neutral-500">Priority</h2>
          <Badge tone={PRIORITY_TONE[issue.priority]}>
            {humanizePriority(issue.priority)}
          </Badge>
        </section>

        <section>
          <h2 className="mb-1 font-medium text-neutral-500">Assignee</h2>
          {assignee === null ? (
            <span className="text-neutral-500">Unassigned</span>
          ) : (
            <span className="flex items-center gap-2">
              <Avatar name={assignee.name} src={assignee.avatarUrl} size="xs" />
              {assignee.name}
            </span>
          )}
        </section>

        {labels.length > 0 ? (
          <section>
            <h2 className="mb-1 font-medium text-neutral-500">Labels</h2>
            <div className="flex flex-wrap gap-1">
              {labels.map((label) => (
                <Badge key={label.id} tone="neutral" size="sm">
                  {label.name}
                </Badge>
              ))}
            </div>
          </section>
        ) : null}

        {issue.dueAt !== null ? (
          <section>
            <h2 className="mb-1 font-medium text-neutral-500">Due</h2>
            <span className={isOverdue(issue.dueAt) ? "text-red-600" : ""}>
              {formatDate(issue.dueAt)}
            </span>
          </section>
        ) : null}

        {mayUpdate || mayArchive ? (
          <section className="flex gap-2 pt-2">
            {mayUpdate ? (
              <Button variant="secondary" size="sm">
                Edit
              </Button>
            ) : null}
            {mayArchive && !archived ? (
              <Button variant="ghost" size="sm">
                Archive
              </Button>
            ) : null}
          </section>
        ) : null}
      </aside>
    </article>
  );
}
