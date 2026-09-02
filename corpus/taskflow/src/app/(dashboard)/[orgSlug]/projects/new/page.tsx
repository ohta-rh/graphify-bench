/**
 * New project page; blocked when the project quota is reached.
 *
 * Owner D. The quota is checked here so the form is never shown when it cannot
 * succeed, and again inside `createProjectAction` because a second tab may have
 * used the last slot in the meantime.
 *
 * Must call (do not reimplement): can, getPlanLimits
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createProjectAction } from "@/actions/projects/create-project";
import { PENDING_PROJECT_ID } from "@/actions/_lib/permission-resources";
import { ProjectForm } from "@/components/domain/project/project-form";
import { getPlanLimits } from "@/config/plan-limits";
import { can } from "@/lib/permissions";
import { listMembers } from "@/server/services/member-service";
import { getOrganizationSummary } from "@/server/services/organization-service";
import { suggestProjectSlug } from "@/server/services/project-service";
import { loadTenantContext } from "../../_lib/tenant-context";

type PageParams = { orgSlug: string };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New project",
};

const MEMBER_PICKER_LIMIT = 100;

export default async function Page(props: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js 16: params and searchParams are Promises and MUST be awaited.
  const { orgSlug } = await props.params;
  const search = await props.searchParams;

  const { org, actor } = await loadTenantContext(orgSlug);

  const allowed = can(actor, "project:create", {
    kind: "project",
    orgId: org.id,
    projectId: PENDING_PROJECT_ID,
    visibility: "org",
    leadId: actor.userId,
  });
  if (!allowed) {
    notFound();
  }

  const summary = await getOrganizationSummary(actor, org.id);
  const limits = getPlanLimits(summary.organization.plan);

  if (summary.usage.projectsUsed >= limits.projects) {
    return (
      <div className="max-w-lg space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">
          Project limit reached
        </h1>
        <p className="text-sm text-slate-600">
          The {org.plan} plan allows {limits.projects} projects and{" "}
          {summary.usage.projectsUsed} are in use. Archive one you have finished
          with, or upgrade the plan.
        </p>
        <div className="flex gap-4 text-sm">
          <Link href={`/${orgSlug}/projects`} className="text-slate-600">
            Back to projects
          </Link>
          <Link href={`/${orgSlug}/settings/billing`} className="text-indigo-600">
            See plans
          </Link>
        </div>
      </div>
    );
  }

  const suggestedName = typeof search.name === "string" ? search.name : "";
  const [members, suggestedSlug] = await Promise.all([
    listMembers(actor, { orgId: org.id, limit: MEMBER_PICKER_LIMIT }),
    suggestedName.length > 0
      ? suggestProjectSlug(org.id, suggestedName)
      : Promise.resolve(""),
  ]);

  return (
    <div className="max-w-lg space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">New project</h1>
        <p className="mt-1 text-sm text-slate-600">
          {summary.usage.projectsUsed} of {limits.projects} projects used.
        </p>
      </header>

      <ProjectForm
        orgId={org.id}
        members={members.items}
        defaultValues={{
          orgId: org.id,
          name: suggestedName,
          slug: suggestedSlug,
          leadId: actor.userId,
        }}
        onSubmit={createProjectAction}
      />
    </div>
  );
}
