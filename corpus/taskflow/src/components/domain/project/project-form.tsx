"use client";

/**
 * Create/edit project form; previews the slug with `slugify`.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): createProjectSchema, slugify
 */
import type { CreateProjectInput } from "@/schemas/project";
import type { ActionResult } from "@/types/api";
import type { OrgId } from "@/types/common";
import type { MemberWithUser } from "@/types/member";
import type { Project } from "@/types/project";
import type { ReactElement } from "react";
export type ProjectFormProps = { orgId: OrgId; members: readonly MemberWithUser[]; defaultValues?: Partial<CreateProjectInput>; onSubmit: (input: CreateProjectInput) => Promise<ActionResult<Project>> };

export function ProjectForm(props: ProjectFormProps): ReactElement | null {
  return null;
}
