/**
 * Organization overview: recent issues, project stats and usage.
 *
 * Owner D. Three panels, each behind its own permission — a viewer sees the
 * issues and the projects but not the usage meters, because usage is billing
 * information.
 *
 * Must call (do not reimplement): can
 */

import Link from "next/link";
import type { Metadata } from "next";
import { IssueCard } from "@/components/domain/issue/issue-card";
import { ProjectCard } from "@/components/domain/project/project-card";
import { UsagePanel } from "@/components/domain/billing/usage-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { can } from "@/lib/permissions";
import { getBillingSummary } from "@/server/services/billing-service";
import { listIssues } from "@/server/services/issue-service";
import { listProjects } from "@/server/services/project-service";
import type { BillingSummary } from "@/types/billing";
import { loadTenantContext } from "./_lib/tenant-context";

type PageParams = { orgSlug: string };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Overview",
};

const RECENT_ISSUE_LIMIT = 8;
const PROJECT_LIMIT = 6;

export default async function Page(props: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js 16: params and searchParams are Promises and MUST be awaited.
  const { orgSlug } = await props.params;
  await props.searchParams;

  const { org, actor } = await loadTenantContext(orgSlug);

  const mayReadBilling = can(actor, "org:manage_billing", {
    kind: "billing",
    orgId: org.id,
  });

  const [issues, projects, billing] = await Promise.all([
    listIssues(actor, {
      orgId: org.id,
      assigneeId: actor.userId,
      status: ["todo", "in_progress", "in_review"],
      limit: RECENT_ISSUE_LIMIT,
    }),
    listProjects(actor, { orgId: org.id, limit: PROJECT_LIMIT }),
    mayReadBilling
      ? getBillingSummary(actor, org.id)
      : Promise.resolve<BillingSummary | null>(null),
  ]);

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{org.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {projects.total} projects · {issues.total} issues assigned to you
        </p>
      </header>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Assigned to you
          </h2>
          <Link href={`/${orgSlug}/issues`} className="text-sm text-indigo-600">
            All issues
          </Link>
        </div>

        {issues.items.length === 0 ? (
          <EmptyState
            title="Nothing on your plate"
            description="Issues assigned to you show up here as soon as somebody picks you."
          />
        ) : (
          <ul className="space-y-2">
            {issues.items.map((issue) => (
              <li key={issue.id}>
                <IssueCard
                  issue={issue}
                  href={`/${orgSlug}/issues?issue=${issue.id}`}
                  compact
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Projects
          </h2>
          <Link href={`/${orgSlug}/projects`} className="text-sm text-indigo-600">
            All projects
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.items.map((row) => (
            <ProjectCard
              key={row.project.id}
              project={row.project}
              stats={row.stats}
              href={`/${orgSlug}/projects/${row.project.slug}`}
              actor={actor}
            />
          ))}
        </div>
      </section>

      {billing !== null ? (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Usage
          </h2>
          <UsagePanel summary={billing} />
        </section>
      ) : null}
    </div>
  );
}
