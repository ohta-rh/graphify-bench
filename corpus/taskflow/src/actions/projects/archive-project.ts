"use server";

/**
 * Archives a project and, optionally, its issues.
 *
 * Owner D. `archiveIssues` defaults to true: leaving live issues under an
 * archived project is the state that makes every "open issues" count wrong, so
 * opting out has to be deliberate.
 *
 * Must call (do not reimplement): archiveProjectSchema, can, assertNotArchived,
 * getActor, toActionResult
 */

import { ForbiddenActionError } from "@/actions/_lib/action-errors";
import { withAction } from "@/actions/_lib/with-action";
import { CACHE_PROFILES, orgTag, projectTag, revalidateTagged } from "@/lib/cache";
import { can } from "@/lib/permissions";
import { assertNotArchived } from "@/lib/soft-delete";
import { archiveProjectSchema, type ArchiveProjectInput } from "@/schemas/project";
import {
  archiveProject,
  listProjects,
} from "@/server/services/project-service";
import { ActionNotFoundError } from "@/actions/_lib/action-errors";
import type { ActionResult } from "@/types/api";
import type { Project } from "@/types/project";

const run = withAction<typeof archiveProjectSchema, Project>(
  archiveProjectSchema,
  async (raw, actor) => {
    const input = raw as ArchiveProjectInput;

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

    assertNotArchived("project", input.projectId, current.project);

    const project = await archiveProject(actor, input);
    revalidateTagged(
      [orgTag(input.orgId), projectTag(project.id)],
      CACHE_PROFILES.minutes,
    );
    return project;
  },
  { revalidate: ["projects", "issues"], cacheProfile: "minutes" },
);

export async function archiveProjectAction(raw: unknown): Promise<ActionResult<Project>> {
  return run(raw);
}
