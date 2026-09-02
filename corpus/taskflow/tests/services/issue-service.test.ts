/**
 * Issue creation authorization, quota refusal and emitted events.
 *
 * Owner C implements `@/server/services/issue-service`; the integration pass
 * fills these in once it exists. Fixtures: `tests/helpers/factories.ts`.
 */
import { describe, it } from "vitest";

describe("services/issue-service", () => {
  // assertCan(actor, "issue:create", …) rejects a viewer with PermissionDeniedError.
  it.todo("refuses issue creation to an actor without issue:create");

  // wouldExceedLimit(plan, "issuesPerProject", used) refuses at the plan ceiling.
  it.todo("refuses creation when the project is at its plan issue quota");

  // emit("issue.created", …) fires exactly once with the new issue's id and priority.
  it.todo("emits issue.created with the persisted issue's fields");

  // A status change emits issue.status_changed carrying both from and to.
  it.todo("emits issue.status_changed with the previous and new status");

  // Assigning emits issue.assigned with previousAssigneeId and assigneeId.
  it.todo("emits issue.assigned with the previous and new assignee");

  // archivePatch() is applied rather than a DELETE, and issue.archived is emitted.
  it.todo("archives rather than deletes, emitting issue.archived");
});
