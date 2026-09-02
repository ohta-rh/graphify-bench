/**
 * Project title bar with settings/archive entry points.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): can
 */
import type { Actor } from "@/types/member";
import type { Project, ProjectStats } from "@/types/project";
import type { ReactElement } from "react";
export type ProjectHeaderProps = { project: Project; actor: Actor; stats: ProjectStats };

export function ProjectHeader(props: ProjectHeaderProps): ReactElement | null {
  return null;
}
