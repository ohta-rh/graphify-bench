"use client";

/**
 * Archive confirmation explaining the soft-delete semantics.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): can
 */
import type { ArchiveProjectInput } from "@/schemas/project";
import type { ActionResult } from "@/types/api";
import type { Actor } from "@/types/member";
import type { Project } from "@/types/project";
import type { ReactElement } from "react";
export type ProjectArchiveDialogProps = { open: boolean; project: Project; actor: Actor; onConfirm: (input: ArchiveProjectInput) => Promise<ActionResult<Project>>; onClose: () => void };

export function ProjectArchiveDialog(props: ProjectArchiveDialogProps): ReactElement | null {
  return null;
}
