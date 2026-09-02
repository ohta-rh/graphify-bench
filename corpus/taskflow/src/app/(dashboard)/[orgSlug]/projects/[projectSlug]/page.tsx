/**
 * Project overview.
 *
 * Owner D. Counters from `ProjectStats` plus the most recently updated issues.
 * The header itself is rendered by the layout, so this page is only the body.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { IssueCard } from "@/components/domain/issue/issue-card";
import { EmptyState } from "@/components/ui/empty-state";
import { listIssues } from "@/server/services/issue-service";
import { loadProjectContext } from "../../_lib/project-context";

type PageParams = { orgSlug: string; projectSlug: string };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Project overview",
};

const RECENT_LIMIT = 10;

export default async function Page(props: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js 16: params and searchParams are Promises and MUST be awaited.
  const { orgSlug, projectSlug } = await props.params;
  await props.searchParams;

  const { org, actor, project, stats } = await loadProjectContext(
    orgSlug,
    projectSlug,
  );

  const recent = await listIssues(actor, {
    orgId: org.id,
    projectId: project.id,
    limit: RECENT_LIMIT,
  });

  return (
    <div className="space-y-10">
      <dl className="grid grid-cols-3 gap-4">
        <Stat label="Open" value={stats.openIssues} />
        <Stat label="Closed" value={stats.closedIssues} />
        <Stat label="Overdue" value={stats.overdueIssues} />
      </dl>

      {project.description !== null ? (
        <p className="max-w-2xl text-sm text-slate-600">{project.description}</p>
      ) : null}

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Recently updated
          </h2>
          <Link
            href={`/${orgSlug}/projects/${projectSlug}/issues`}
            className="text-sm text-indigo-600"
          >
            All issues
          </Link>
        </div>

        {recent.items.length === 0 ? (
          <EmptyState
            title="No issues in this project yet"
            description="File the first one and it will show up here."
          />
        ) : (
          <ul className="space-y-2">
            {recent.items.map((issue) => (
              <li key={issue.id}>
                <IssueCard
                  issue={issue}
                  href={`/${orgSlug}/projects/${projectSlug}/issues/${issue.number}`}
                  compact
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat(props: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
      <dt className="text-xs uppercase tracking-wide text-slate-500">
        {props.label}
      </dt>
      <dd className="mt-1 text-2xl font-semibold">{props.value}</dd>
    </div>
  );
}
