/**
 * Sidebar + top bar composition for the tenant subtree.
 *
 * Owner D. A Server Component: it does the permission and flag work once, on
 * the server, and hands the results to `AppSidebar` and `TopBar` as props. The
 * domain components stay presentational — none of them may reach for `can()` or
 * a service on their own.
 *
 * Must call (do not reimplement): can, isEnabled
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { AppSidebar } from "@/components/domain/nav/app-sidebar";
import { TopBar } from "@/components/domain/nav/top-bar";
import { isEnabled } from "@/lib/feature-flags";
import { can } from "@/lib/permissions";
import { buildFlagContext } from "@/server/services/feature-flag-service";
import type { FeatureFlagSnapshot } from "@/types/feature-flag";
import type { Actor } from "@/types/member";
import type { Organization } from "@/types/organization";
import type { Project } from "@/types/project";

export type DashboardShellProps = {
  org: Organization;
  actor: Actor;
  flags: FeatureFlagSnapshot;
  projects: readonly Project[];
  unreadCount: number;
  /** Current path, so the sidebar can mark the active entry. */
  pathname: string;
  panel?: ReactNode;
  children?: ReactNode;
};

export function DashboardShell(props: DashboardShellProps) {
  const { org, actor, flags, projects, unreadCount, pathname, panel, children } =
    props;

  const flagContext = buildFlagContext(actor, org);

  const mayCreateProject = can(actor, "project:create", {
    kind: "project",
    orgId: org.id,
    projectId: "" as Project["id"],
    visibility: "org",
    leadId: actor.userId,
  });

  const searchEnabled = isEnabled("command_palette", flagContext);

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        org={org}
        actor={actor}
        flags={flags}
        projects={projects}
        pathname={pathname}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar org={org} actor={actor} unreadCount={unreadCount} flags={flags} />

        <div className="flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-2 text-sm">
          {searchEnabled ? (
            <Link href={`/${org.slug}/search`} className="text-slate-600">
              Search
            </Link>
          ) : null}
          {mayCreateProject ? (
            <Link
              href={`/${org.slug}/projects/new`}
              className="ml-auto rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white"
            >
              New project
            </Link>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 px-6 py-8">{children}</main>
          {panel !== undefined ? (
            <aside className="hidden w-80 shrink-0 border-l border-slate-200 bg-white xl:block">
              {panel}
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}
