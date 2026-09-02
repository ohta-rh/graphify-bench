"use server";

/**
 * Restores an archived project.
 *
 * Owner D. There is no `restoreProjectSchema` in `src/schemas` because the
 * payload is nothing but the two ids, so the shape is composed here from the
 * shared branded-id primitives rather than added to the frozen schema layer.
 *
 * Must call (do not reimplement): can, restorePatch, getActor, toActionResult
 */

import { ActionNotFoundError, ForbiddenActionError } from "@/actions/_lib/action-errors";
import { withAction } from "@/actions/_lib/with-action";
import { CACHE_PROFILES, orgTag, projectTag, revalidateTagged } from "@/lib/cache";
import { can } from "@/lib/permissions";
import { restorePatch } from "@/lib/soft-delete";
import { orgIdSchema, projectIdSchema } from "@/schemas/common";
import { listProjects, restoreProject } from "@/server/services/project-service";
import type { ActionResult } from "@/types/api";
import type { Project } from "@/types/project";
import { z } from "zod";

const restoreProjectSchema = z.object({
  orgId: orgIdSchema,
  projectId: projectIdSchema,
});

type RestoreProjectInput = z.infer<typeof restoreProjectSchema>;

const run = withAction<typeof restoreProjectSchema, Project>(
  restoreProjectSchema,
  async (raw, actor) => {
    const input = raw as RestoreProjectInput;

    const page = await listProjects(actor, {
      orgId: input.orgId,
      limit: 100,
      includeArchived: true,
    });
    const current = page.items.find((row) => row.project.id === input.projectId);
    if (current === undefined) {
      throw new ActionNotFoundError(`project ${input.projectId}`);
    }

    const allowed = can(actor, "project:archive", {
      kind: "project",
      orgId: input.orgId,
      projectId: input.projectId,
      visibility: current.project.visibility,
      leadId: current.project.leadId,
    });
    if (!allowed) {
      throw new ForbiddenActionError("project:archive");
    }

    const project = await restoreProject(actor, input.orgId, input.projectId);

    // `restorePatch()` is the single definition of what "restored" looks like;
    // comparing against it catches a service that forgot to clear the column.
    const expected = restorePatch();
    if (project.archivedAt !== expected.archivedAt) {
      throw new ActionNotFoundError(`live project ${input.projectId}`);
    }

    revalidateTagged(
      [orgTag(input.orgId), projectTag(project.id)],
      CACHE_PROFILES.minutes,
    );
    return project;
  },
  { revalidate: ["projects"], cacheProfile: "minutes" },
);

export async function restoreProjectAction(raw: unknown): Promise<ActionResult<Project>> {
  return run(raw);
}
