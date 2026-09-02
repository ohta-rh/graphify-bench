"use server";

/**
 * Updates project metadata.
 *
 * Owner D. Visibility is part of this payload, which is why the permission
 * resource carries the *incoming* visibility: raising a project to `public`
 * must be judged against what it is becoming, not what it was.
 *
 * Must call (do not reimplement): updateProjectSchema, can, getActor,
 * toActionResult
 */

import { ForbiddenActionError } from "@/actions/_lib/action-errors";
import { withAction } from "@/actions/_lib/with-action";
import { CACHE_PROFILES, projectTag, revalidateTagged } from "@/lib/cache";
import { can } from "@/lib/permissions";
import { updateProjectSchema, type UpdateProjectInput } from "@/schemas/project";
import { updateProject } from "@/server/services/project-service";
import type { ActionResult } from "@/types/api";
import type { Project } from "@/types/project";

const run = withAction<typeof updateProjectSchema, Project>(
  updateProjectSchema,
  async (raw, actor) => {
    const input = raw as UpdateProjectInput;

    const allowed = can(actor, "project:update", {
      kind: "project",
      orgId: input.orgId,
      projectId: input.projectId,
      visibility: input.visibility ?? "org",
      leadId: input.leadId ?? actor.userId,
    });
    if (!allowed) {
      throw new ForbiddenActionError("project:update");
    }

    const project = await updateProject(actor, input);
    revalidateTagged([projectTag(project.id)], CACHE_PROFILES.minutes);
    return project;
  },
  { revalidate: ["projects"], cacheProfile: "minutes" },
);

export async function updateProjectAction(raw: unknown): Promise<ActionResult<Project>> {
  return run(raw);
}
