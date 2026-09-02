/**
 * Tenant context plus the project named by `[projectSlug]`.
 *
 * Owner D. Private to the tenant subtree. Every page under
 * `projects/[projectSlug]` needs the same four values, and resolving the
 * project through `ProjectService` (rather than the repository) is what applies
 * the visibility rules — a `private` project the caller is not on must 404,
 * not merely render empty.
 */

import { notFound } from "next/navigation";
import { getProject } from "@/server/services/project-service";
import type { ProjectWithStats } from "@/types/project";
import { loadTenantContext, type TenantContext } from "./tenant-context";

export type ProjectContext = TenantContext & {
  readonly project: ProjectWithStats["project"];
  readonly stats: ProjectWithStats["stats"];
};

export async function loadProjectContext(
  orgSlug: string,
  projectSlug: string,
): Promise<ProjectContext> {
  const tenant = await loadTenantContext(orgSlug);

  const found = await findProject(tenant, projectSlug);
  if (found === null) {
    notFound();
  }

  return { ...tenant, project: found.project, stats: found.stats };
}

/**
 * "Does not exist" and "you may not see it" both come back as `null`, so the
 * two cases are indistinguishable from outside — the same reasoning as the
 * organization lookup in `tenant-context.ts`.
 */
async function findProject(
  tenant: TenantContext,
  projectSlug: string,
): Promise<ProjectWithStats | null> {
  try {
    return await getProject(tenant.actor, tenant.org.id, projectSlug);
  } catch {
    return null;
  }
}
