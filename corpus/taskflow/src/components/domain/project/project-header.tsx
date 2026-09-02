/**
 * Project title bar with settings/archive entry points.
 *
 * Must call (do not reimplement): can
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/lib/format";
import { can } from "@/lib/permissions";
import { isArchived } from "@/lib/soft-delete";
import type { Actor } from "@/types/member";
import type { Project, ProjectStats } from "@/types/project";
import type { ReactElement } from "react";
import { projectResource } from "../permission/resources";

export type ProjectHeaderProps = {
  project: Project;
  actor: Actor;
  stats: ProjectStats;
};

export function ProjectHeader(props: ProjectHeaderProps): ReactElement | null {
  const { project, actor, stats } = props;
  const resource = projectResource(project);

  // The project lead gets `project:update` through the ownership escalation in
  // `can()` even when their org role would not reach it.
  const mayUpdate = can(actor, "project:update", resource);
  const mayArchive = can(actor, "project:archive", resource);
  const archived = isArchived(project);

  return (
    <header className="project-header flex items-start justify-between gap-4 border-b pb-3">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          {project.name}
          <span className="text-sm font-normal text-neutral-500">
            {project.key}
          </span>
          {archived ? (
            <Badge tone="warning" size="sm">
              Archived
            </Badge>
          ) : null}
        </h1>

        <p className="mt-1 text-sm text-neutral-600">
          {formatCount(stats.openIssues)} open ·{" "}
          {formatCount(stats.closedIssues)} closed
          {stats.overdueIssues > 0
            ? ` · ${formatCount(stats.overdueIssues)} overdue`
            : ""}
        </p>
      </div>

      <div className="flex gap-2">
        {mayUpdate ? (
          <Button variant="secondary" size="sm">
            Settings
          </Button>
        ) : null}
        {mayArchive && !archived ? (
          <Button variant="ghost" size="sm">
            Archive
          </Button>
        ) : null}
      </div>
    </header>
  );
}
