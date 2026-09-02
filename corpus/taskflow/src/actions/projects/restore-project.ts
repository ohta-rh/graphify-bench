"use server";

/**
 * Restores an archived project.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): can, restorePatch, getActor, toActionResult
 */

import type { ActionResult } from "@/types/api";
import type { Project } from "@/types/project";

export async function restoreProjectAction(raw: unknown): Promise<ActionResult<Project>> {
  throw new Error("stub: src/actions/projects/restore-project.ts");
}
