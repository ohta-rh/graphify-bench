/**
 * Project tile with open/closed counts.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): can
 */
import type { Actor } from "@/types/member";
import type { Project, ProjectStats } from "@/types/project";
import type { ReactElement } from "react";
export type ProjectCardProps = { project: Project; stats: ProjectStats; href: string; actor: Actor };

export function ProjectCard(props: ProjectCardProps): ReactElement | null {
  return null;
}
