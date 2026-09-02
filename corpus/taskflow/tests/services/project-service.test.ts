/**
 * Project quota, slug suggestion and the archive cascade.
 *
 * Owner C implements `@/server/services/project-service`.
 */
import { describe, it } from "vitest";

describe("services/project-service", () => {
  // wouldExceedLimit(plan, "projects", used) blocks the third project on free.
  it.todo("refuses creation once the plan's project quota is reached");

  // uniqueSlug() suffixes when the requested slug is already taken in the org.
  it.todo("suggests a suffixed slug when the requested one is taken");

  // A slug free in org B is still available in org A — uniqueness is per tenant.
  it.todo("scopes slug uniqueness to the organization");

  // archiveProject({ archiveIssues: true }) applies archivePatch to child issues.
  it.todo("cascades the archive to the project's issues when asked");

  // project.archived carries issuesArchived, matching the cascade count.
  it.todo("emits project.archived with the number of issues archived");

  // restorePatch() clears archivedAt and project.restored is emitted.
  it.todo("restores an archived project and emits project.restored");
});
