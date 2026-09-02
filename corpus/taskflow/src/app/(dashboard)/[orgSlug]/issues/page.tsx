/**
 * Cross-project "my issues" view.
 *
 * Owner D. Unlike the per-project list this one spans the whole organization,
 * so the repository filter carries no `projectId` — only the org scope the
 * actor already implies.
 *
 * Must call (do not reimplement): can
 */

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { IssueList } from "@/components/domain/issue/issue-list";
import { EmptyState } from "@/components/ui/empty-state";
import { can } from "@/lib/permissions";
import { PENDING_ISSUE_ID, PENDING_PROJECT_ID } from "@/actions/_lib/permission-resources";
import { searchParamsPaginationSchema } from "@/schemas/pagination";
import { getIssue, listIssues } from "@/server/services/issue-service";
import { ISSUE_STATUSES, type IssueStatus, type IssueWithRelations } from "@/types/issue";
import { loadTenantContext } from "../_lib/tenant-context";

type PageParams = { orgSlug: string };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My issues",
};

const OPEN_STATUSES: readonly IssueStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
];

export default async function Page(props: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js 16: params and searchParams are Promises and MUST be awaited.
  const { orgSlug } = await props.params;
  const search = await props.searchParams;

  const { org, actor } = await loadTenantContext(orgSlug);

  const allowed = can(actor, "issue:read", {
    kind: "issue",
    orgId: org.id,
    projectId: PENDING_PROJECT_ID,
    issueId: PENDING_ISSUE_ID,
    authorId: actor.userId,
    assigneeId: actor.userId,
  });
  if (!allowed) {
    notFound();
  }

  const pagination = searchParamsPaginationSchema.parse(search);
  const status = parseStatuses(search.status);

  const page = await listIssues(actor, {
    orgId: org.id,
    assigneeId: actor.userId,
    status: [...status],
    limit: pagination.perPage,
    cursor: pagination.cursor ?? null,
  });

  // `IssueList` wants the relations bundle; fetching them one by one is fine at
  // page size, and keeps the list query itself cheap.
  const rows: IssueWithRelations[] = await Promise.all(
    page.items.map((issue) => getIssue(actor, org.id, issue.id)),
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">My issues</h1>
        <p className="mt-1 text-sm text-slate-600">
          Issues assigned to you across every project in {org.name}.
        </p>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          title="No issues assigned to you"
          description="When somebody assigns you an issue it lands here."
        />
      ) : (
        <IssueList issues={rows} actor={actor} />
      )}
    </div>
  );
}

/** `?status=todo&status=in_progress` narrows the list; anything else is open. */
function parseStatuses(
  raw: string | string[] | undefined,
): readonly IssueStatus[] {
  const values = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw];
  const known = values.filter((value): value is IssueStatus =>
    (ISSUE_STATUSES as readonly string[]).includes(value),
  );
  return known.length > 0 ? known : OPEN_STATUSES;
}
