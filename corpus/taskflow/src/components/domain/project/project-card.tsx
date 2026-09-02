/**
 * Project tile with open/closed counts.
 *
 * Must call (do not reimplement): can
 */
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCount } from "@/lib/format";
import { formatRelative } from "@/lib/date";
import { can } from "@/lib/permissions";
import { isArchived } from "@/lib/soft-delete";
import type { Actor } from "@/types/member";
import type { Project, ProjectStats } from "@/types/project";
import type { ReactElement } from "react";
import { projectResource } from "../permission/resources";

export type ProjectCardProps = {
  project: Project;
  stats: ProjectStats;
  href: string;
  actor: Actor;
};

export function ProjectCard(props: ProjectCardProps): ReactElement | null {
  const { project, stats, href, actor } = props;
  const resource = projectResource(project);

  // A project the actor cannot read must not even leak its name.
  if (!can(actor, "project:read", resource)) return null;

  const mayUpdate = can(actor, "project:update", resource);

  return (
    <Card padded>
      <CardHeader>
        <CardTitle>
          <Link href={href} className="hover:underline">
            {project.name}
          </Link>
        </CardTitle>
        <span className="ml-2 text-xs text-neutral-500">{project.key}</span>
        {isArchived(project) ? (
          <Badge tone="warning" size="sm">
            Archived
          </Badge>
        ) : null}
        {project.visibility === "public" ? (
          <Badge tone="brand" size="sm">
            Public
          </Badge>
        ) : null}
      </CardHeader>

      <CardContent>
        <p className="text-sm text-neutral-600">
          {project.description ?? "No description."}
        </p>

        <dl className="mt-2 flex gap-4 text-sm">
          <span>
            <dt className="inline text-neutral-500">Open </dt>
            <dd className="inline font-medium">
              {formatCount(stats.openIssues)}
            </dd>
          </span>
          <span>
            <dt className="inline text-neutral-500">Closed </dt>
            <dd className="inline font-medium">
              {formatCount(stats.closedIssues)}
            </dd>
          </span>
          {stats.overdueIssues > 0 ? (
            <span className="text-red-600">
              <dt className="inline">Overdue </dt>
              <dd className="inline font-medium">
                {formatCount(stats.overdueIssues)}
              </dd>
            </span>
          ) : null}
        </dl>

        {stats.lastActivityAt !== null ? (
          <p className="mt-1 text-xs text-neutral-500">
            Last activity {formatRelative(stats.lastActivityAt)}
          </p>
        ) : null}

        {mayUpdate ? (
          <Link
            href={`${href}/settings`}
            className="mt-2 inline-block text-xs text-indigo-600 hover:underline"
          >
            Project settings
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
