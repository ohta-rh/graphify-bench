"use server";

/**
 * Archives a project and, optionally, its issues.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): archiveProjectSchema, can, assertNotArchived, getActor, toActionResult
 */

import type { ActionResult } from "@/types/api";
import type { Project } from "@/types/project";

export async function archiveProjectAction(raw: unknown): Promise<ActionResult<Project>> {
  throw new Error("stub: src/actions/projects/archive-project.ts");
}
