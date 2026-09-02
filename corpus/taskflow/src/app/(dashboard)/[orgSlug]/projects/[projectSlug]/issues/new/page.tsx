/**
 * New issue page; blocked at the per-project issue quota.
 *
 * Owner D. `issuesPerProject` counts archived issues too, so an org that has
 * filled a project cannot make room by archiving — that is deliberate, and the
 * copy below says so rather than leaving people to guess.
 *
 * Must call (do not reimplement): can, getPlanLimits
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createIssueAction } from "@/actions/issues/create-issue";
import { PENDING_ISSUE_ID } from "@/actions/_lib/permission-resources";
import { IssueForm } from "@/components/domain/issue/issue-form";
import { getPlanLimits } from "@/config/plan-limits";
import { can } from "@/lib/permissions";
import { issueStatusSchema } from "@/schemas/issue";
import { listIssues } from "@/server/services/issue-service";
import { listLabels } from "@/server/services/label-service";
import { listMembers } from "@/server/services/member-service";
import type { IssueStatus } from "@/types/issue";
import { loadProjectContext } from "../../../../_lib/project-context";

type PageParams = { orgSlug: string; projectSlug: string };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New issue",
};

const MEMBER_PICKER_LIMIT = 100;

export default async function Page(props: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js 16: params and searchParams are Promises and MUST be awaited.
  const { orgSlug, projectSlug } = await props.params;
  await props.searchParams;

  const { org, actor, project } = await loadProjectContext(orgSlug, projectSlug);

  const allowed = can(actor, "issue:create", {
    kind: "issue",
    orgId: org.id,
    projectId: project.id,
    issueId: PENDING_ISSUE_ID,
    authorId: actor.userId,
    assigneeId: null,
  });
  if (!allowed) {
    notFound();
  }

  const limits = getPlanLimits(org.plan);
  const existing = await listIssues(actor, {
    orgId: org.id,
    projectId: project.id,
    limit: 1,
    includeArchived: true,
  });

  if (existing.total >= limits.issuesPerProject) {
    return (
      <div className="max-w-lg space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">
          This project is full
        </h1>
        <p className="text-sm text-slate-600">
          The {org.plan} plan allows {limits.issuesPerProject} issues per
          project, archived ones included, and {existing.total} exist. Upgrading
          raises the ceiling; a new project starts with a fresh one.
        </p>
        <div className="flex gap-4 text-sm">
          <Link
            href={`/${orgSlug}/projects/${projectSlug}/issues`}
            className="text-slate-600"
          >
            Back to issues
          </Link>
          <Link href={`/${orgSlug}/settings/billing`} className="text-indigo-600">
            See plans
          </Link>
        </div>
      </div>
    );
  }

  const [members, labels] = await Promise.all([
    listMembers(actor, { orgId: org.id, limit: MEMBER_PICKER_LIMIT }),
    listLabels(actor, org.id),
  ]);

  return (
    <div className="max-w-2xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">New issue</h1>
        <p className="mt-1 text-sm text-slate-600">
          In {project.name} · {existing.total} of {limits.issuesPerProject} used
        </p>
      </header>

      <IssueForm
        orgId={org.id}
        projectId={project.id}
        members={members.items}
        labels={labels}
        defaultValues={{
          orgId: org.id,
          projectId: project.id,
          status: defaultStatusFor(org.settings.defaultIssueStatus),
        }}
        onSubmit={createIssueAction}
      />
    </div>
  );
}

/**
 * `OrganizationSettings.defaultIssueStatus` is stored as a plain string, so it
 * is re-validated against the enum before it seeds the form.
 */
function defaultStatusFor(stored: string): IssueStatus {
  const parsed = issueStatusSchema.safeParse(stored);
  return parsed.success ? parsed.data : "backlog";
}
