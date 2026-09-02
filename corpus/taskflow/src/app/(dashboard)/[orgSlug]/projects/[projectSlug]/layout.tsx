/**
 * Project shell with the project header and sub-navigation.
 *
 * Owner D. The board tab only appears when `kanban_board` is on, and the
 * settings tab only when the caller may update the project — the same two
 * checks the pages themselves repeat, because a layout cannot be trusted as an
 * authorization boundary.
 *
 * Must call (do not reimplement): can
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { ProjectHeader } from "@/components/domain/project/project-header";
import { can } from "@/lib/permissions";
import { loadProjectContext } from "../../_lib/project-context";

type LayoutParams = { orgSlug: string; projectSlug: string };

export const dynamic = "force-dynamic";

export default async function Layout(props: {
  children: ReactNode;
  params: Promise<LayoutParams>;
}) {
  // Next.js 16: params is a Promise and MUST be awaited.
  const { orgSlug, projectSlug } = await props.params;

  const { org, actor, flags, project, stats } = await loadProjectContext(
    orgSlug,
    projectSlug,
  );

  const maySettings = can(actor, "project:update", {
    kind: "project",
    orgId: org.id,
    projectId: project.id,
    visibility: project.visibility,
    leadId: project.leadId,
  });

  const base = `/${orgSlug}/projects/${projectSlug}`;

  return (
    <div className="space-y-8">
      <ProjectHeader project={project} actor={actor} stats={stats} />

      <nav className="flex gap-6 border-b border-slate-200 pb-2 text-sm">
        <Link href={base} className="text-slate-600">
          Overview
        </Link>
        <Link href={`${base}/issues`} className="text-slate-600">
          Issues
        </Link>
        {flags.kanban_board ? (
          <Link href={`${base}/board`} className="text-slate-600">
            Board
          </Link>
        ) : null}
        {maySettings ? (
          <Link href={`${base}/settings`} className="ml-auto text-slate-600">
            Settings
          </Link>
        ) : null}
      </nav>

      <div>{props.children}</div>
    </div>
  );
}
