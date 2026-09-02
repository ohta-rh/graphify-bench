"use server";

/**
 * Updates project metadata.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): updateProjectSchema, can, getActor, toActionResult
 */

import type { ActionResult } from "@/types/api";
import type { Project } from "@/types/project";

export async function updateProjectAction(raw: unknown): Promise<ActionResult<Project>> {
  throw new Error("stub: src/actions/projects/update-project.ts");
}
