/**
 * Project settings including archive.
 *
 * Owner D. Editing needs `project:update`; archiving needs `project:archive`,
 * which sits higher in `ROLE_MATRIX` — so the archive block is gated
 * separately rather than assumed from the first check.
 *
 * Must call (do not reimplement): can
 */

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { archiveProjectAction } from "@/actions/projects/archive-project";
import { updateProjectAction } from "@/actions/projects/update-project";
import { can } from "@/lib/permissions";
import { listMembers } from "@/server/services/member-service";
import { loadProjectContext } from "../../../_lib/project-context";
import { ArchiveProjectPanel } from "./archive-project-panel";
import { ProjectSettingsForm } from "./project-settings-form";

type PageParams = { orgSlug: string; projectSlug: string };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Project settings",
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

  const resource = {
    kind: "project",
    orgId: org.id,
    projectId: project.id,
    visibility: project.visibility,
    leadId: project.leadId,
  } as const;

  if (!can(actor, "project:update", resource)) {
    notFound();
  }
  const mayArchive = can(actor, "project:archive", resource);

  const members = await listMembers(actor, {
    orgId: org.id,
    limit: MEMBER_PICKER_LIMIT,
  });

  return (
    <div className="max-w-xl space-y-10">
      <section className="space-y-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Project details
        </h2>
        <ProjectSettingsForm
          orgId={org.id}
          project={project}
          members={members.items}
          onSubmit={updateProjectAction}
        />
      </section>

      {mayArchive ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-sm font-semibold text-amber-900">
            Archive this project
          </h2>
          <p className="mt-2 text-sm text-amber-800">
            Archiving hides the project and, by default, its issues. Nothing is
            deleted — an owner can restore it from the project list.
          </p>

          <div className="mt-4">
            <ArchiveProjectPanel
              project={project}
              actor={actor}
              onConfirm={archiveProjectAction}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
