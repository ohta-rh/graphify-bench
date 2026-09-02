"use server";

/**
 * Creates a project after the plan's project quota is checked.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): createProjectSchema, can, getPlanLimits, getActor, toActionResult
 */

import type { ActionResult } from "@/types/api";
import type { Project } from "@/types/project";

export async function createProjectAction(raw: unknown): Promise<ActionResult<Project>> {
  throw new Error("stub: src/actions/projects/create-project.ts");
}
