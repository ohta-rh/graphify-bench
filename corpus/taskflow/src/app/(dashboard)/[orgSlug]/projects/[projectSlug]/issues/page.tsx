/**
 * Project issue list; parses filters from `await searchParams`.
 *
 * Owner D. The filter is rebuilt from the URL on every render rather than kept
 * in component state, so a filtered list is a shareable link.
 *
 * Must call (do not reimplement): can
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PENDING_ISSUE_ID } from "@/actions/_lib/permission-resources";
import { IssueList } from "@/components/domain/issue/issue-list";
import { EmptyState } from "@/components/ui/empty-state";
import { can } from "@/lib/permissions";
import { issueFilterSchema } from "@/schemas/issue";
import { searchParamsPaginationSchema } from "@/schemas/pagination";
import { getIssue, listIssues } from "@/server/services/issue-service";
import { ISSUE_STATUSES, type IssueStatus, type IssueWithRelations } from "@/types/issue";
import { loadProjectContext } from "../../../_lib/project-context";

type PageParams = { orgSlug: string; projectSlug: string };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Issues",
};

export default async function Page(props: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js 16: params and searchParams are Promises and MUST be awaited.
  const { orgSlug, projectSlug } = await props.params;
  const search = await props.searchParams;

  const { org, actor, project } = await loadProjectContext(orgSlug, projectSlug);

  const mayRead = can(actor, "issue:read", {
    kind: "issue",
    orgId: org.id,
    projectId: project.id,
    issueId: PENDING_ISSUE_ID,
    authorId: actor.userId,
    assigneeId: actor.userId,
  });
  if (!mayRead) {
    notFound();
  }

  const mayCreate = can(actor, "issue:create", {
    kind: "issue",
    orgId: org.id,
    projectId: project.id,
    issueId: PENDING_ISSUE_ID,
    authorId: actor.userId,
    assigneeId: null,
  });

  const pagination = searchParamsPaginationSchema.parse(search);
  const statuses = parseStatuses(search.status);

  // The filter goes through the shared schema so an unparseable URL is a
  // rejected filter rather than a malformed repository query.
  const filter = issueFilterSchema.parse({
    orgId: org.id,
    projectId: project.id,
    ...(statuses.length > 0 ? { status: statuses } : {}),
    ...(typeof search.q === "string" ? { query: search.q } : {}),
    includeArchived: search.archived === "1",
    limit: pagination.perPage,
    cursor: pagination.cursor ?? null,
  });

  const page = await listIssues(actor, filter);
  const rows: IssueWithRelations[] = await Promise.all(
    page.items.map((issue) => getIssue(actor, org.id, issue.id)),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-slate-600">
          {page.total} issues in {project.name}
        </p>
        {mayCreate ? (
          <Link
            href={`/${orgSlug}/projects/${projectSlug}/issues/new`}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
          >
            New issue
          </Link>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No issues match this filter"
          description="Clear the filter, or file the first issue in this project."
        />
      ) : (
        <IssueList issues={rows} actor={actor} />
      )}
    </div>
  );
}

function parseStatuses(raw: string | string[] | undefined): IssueStatus[] {
  const values = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw];
  return values.filter((value): value is IssueStatus =>
    (ISSUE_STATUSES as readonly string[]).includes(value),
  );
}
