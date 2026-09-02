/**
 * Project list with archive filter.
 *
 * Owner D. `?archived=1` flips `includeArchived`, which is the only way an
 * archived project becomes visible again — nothing else in the UI surfaces
 * soft-deleted rows.
 *
 * Must call (do not reimplement): can
 */

import Link from "next/link";
import type { Metadata } from "next";
import { PENDING_PROJECT_ID } from "@/actions/_lib/permission-resources";
import { ProjectCard } from "@/components/domain/project/project-card";
import { EmptyState } from "@/components/ui/empty-state";
import { can } from "@/lib/permissions";
import { searchParamsPaginationSchema } from "@/schemas/pagination";
import { listProjects } from "@/server/services/project-service";
import { loadTenantContext } from "../_lib/tenant-context";

type PageParams = { orgSlug: string };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Projects",
};

export default async function Page(props: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js 16: params and searchParams are Promises and MUST be awaited.
  const { orgSlug } = await props.params;
  const search = await props.searchParams;

  const { org, actor } = await loadTenantContext(orgSlug);

  const mayCreate = can(actor, "project:create", {
    kind: "project",
    orgId: org.id,
    projectId: PENDING_PROJECT_ID,
    visibility: "org",
    leadId: actor.userId,
  });

  const pagination = searchParamsPaginationSchema.parse(search);
  const includeArchived = search.archived === "1";

  const page = await listProjects(actor, {
    orgId: org.id,
    query: typeof search.q === "string" ? search.q : undefined,
    includeArchived,
    limit: pagination.perPage,
    cursor: pagination.cursor ?? null,
  });

  return (
    <div className="space-y-8">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-slate-600">
            {page.total} projects{includeArchived ? ", archived included" : ""}
          </p>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <Link
            href={`/${orgSlug}/projects${includeArchived ? "" : "?archived=1"}`}
            className="text-slate-600"
          >
            {includeArchived ? "Hide archived" : "Show archived"}
          </Link>
          {mayCreate ? (
            <Link
              href={`/${orgSlug}/projects/new`}
              className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white"
            >
              New project
            </Link>
          ) : null}
        </div>
      </header>

      {page.items.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description={
            mayCreate
              ? "Create the first one — a project is just a name, a key and a colour."
              : "Ask an admin to create one, or to add you to an existing project."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {page.items.map((row) => (
            <ProjectCard
              key={row.project.id}
              project={row.project}
              stats={row.stats}
              href={`/${orgSlug}/projects/${row.project.slug}`}
              actor={actor}
            />
          ))}
        </div>
      )}
    </div>
  );
}
