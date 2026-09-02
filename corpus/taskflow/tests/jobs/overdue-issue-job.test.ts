/**
 * Emits `issue.overdue` exactly once per overdue issue.
 *
 * Owner C implements `@/server/jobs/overdue-issue-job`. `isOverdue()` itself is
 * covered by `tests/lib/date.test.ts`.
 */
import { describe, it } from "vitest";

describe("jobs/overdue-issue-job", () => {
  // isOverdue(dueAt, now) selects the issues; OVERDUE_LOOKAHEAD_HOURS bounds the scan.
  it.todo("selects only issues whose due date has passed");

  // A closed issue (done or canceled) is never reported overdue.
  it.todo("ignores issues in a closed status");

  // An issue with no due date is never overdue.
  it.todo("ignores issues without a due date");

  // Exactly one issue.overdue per issue, carrying dueAt and assigneeId.
  it.todo("emits issue.overdue once per overdue issue");

  // A second run over the same issues does not re-emit.
  it.todo("does not re-emit for an issue already reported");

  // Issues are gathered per org and never mixed across tenants.
  it.todo("keeps each organization's issues in its own batch");
});
