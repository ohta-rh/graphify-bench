/**
 * Renders title, status and assignee.
 *
 * Owner B implements `@/components/domain/issue/issue-card`.
 */
import { describe, it } from "vitest";

describe("components/issue-card", () => {
  // The card shows the issue key (issueKey()) and title.
  it.todo("renders the issue key and title");

  // Status and priority render through humanizeStatus/humanizePriority, not raw enums.
  it.todo("renders humanized status and priority labels");

  // An unassigned issue shows an explicit unassigned state, not an empty slot.
  it.todo("renders an unassigned state when there is no assignee");

  // An overdue due date is visually marked; isOverdue() decides.
  it.todo("marks an overdue due date");

  // formatRelative() supplies the updated-at wording.
  it.todo("renders the last-updated time relatively");

  // The card is presentational: no can() call and no @/server import.
  it.todo("performs no authorization or data fetching of its own");
});
