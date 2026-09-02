"use server";

/**
 * Creates a project after the plan's project quota is checked.
 *
 * Owner D. Archived projects still occupy the quota, so the count deliberately
 * includes them — restoring a project must never be blocked by a limit the
 * restore itself would breach.
 *
 * Must call (do not reimplement): createProjectSchema, can, getPlanLimits,
 * getActor, toActionResult
 */

import { ForbiddenActionError, PlanLimitError } from "@/actions/_lib/action-errors";
import { PENDING_PROJECT_ID } from "@/actions/_lib/permission-resources";
import { withAction } from "@/actions/_lib/with-action";
import { getPlanLimits } from "@/config/plan-limits";
import { CACHE_PROFILES, orgTag, projectTag, revalidateTagged } from "@/lib/cache";
import { can } from "@/lib/permissions";
import { createProjectSchema, type CreateProjectInput } from "@/schemas/project";
import { getOrganizationSummary } from "@/server/services/organization-service";
import { createProject } from "@/server/services/project-service";
import type { ActionResult } from "@/types/api";
import type { Project } from "@/types/project";

const run = withAction<typeof createProjectSchema, Project>(
  createProjectSchema,
  async (raw, actor) => {
    const input = raw as CreateProjectInput;

    const allowed = can(actor, "project:create", {
      kind: "project",
      orgId: input.orgId,
      projectId: PENDING_PROJECT_ID,
      visibility: input.visibility,
      leadId: input.leadId,
    });
    if (!allowed) {
      throw new ForbiddenActionError("project:create");
    }

    const summary = await getOrganizationSummary(actor, input.orgId);
    const limits = getPlanLimits(summary.organization.plan);
    if (summary.usage.projectsUsed >= limits.projects) {
      throw new PlanLimitError("projects", limits.projects, summary.usage.projectsUsed);
    }

    const project = await createProject(actor, input);
    revalidateTagged(
      [orgTag(input.orgId), projectTag(project.id)],
      CACHE_PROFILES.minutes,
    );
    return project;
  },
  { revalidate: ["projects"], cacheProfile: "minutes" },
);

export async function createProjectAction(raw: unknown): Promise<ActionResult<Project>> {
  return run(raw);
}
