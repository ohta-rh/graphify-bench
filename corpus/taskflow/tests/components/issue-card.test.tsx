/**
 * Renders title, status and assignee.
 *
 * Owner B implements `@/components/domain/issue/issue-card`.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { IssueCard } from "@/components/domain/issue/issue-card";
import { humanizePriority, humanizeStatus } from "@/lib/format";
import type { IsoTimestamp } from "@/types/common";
import { makeIssue } from "../helpers/factories";

const PAST_DUE = "2020-01-01T00:00:00.000Z" as IsoTimestamp;

afterEach(cleanup);

const HREF = "/acme/projects/website-relaunch/issues/1";

describe("components/issue-card", () => {
  // The card shows the issue key (issueKey()) and title.
  it("renders the issue key and title", () => {
    const issue = makeIssue({ number: 142, title: "Fix the broken sign-up link" });

    render(<IssueCard issue={issue} href={HREF} />);

    expect(screen.getByText("#142")).toBeInTheDocument();
    expect(screen.getByText("Fix the broken sign-up link")).toBeInTheDocument();
  });

  // Status and priority render through humanizeStatus/humanizePriority, not raw enums.
  it("renders humanized status and priority labels", () => {
    const issue = makeIssue({ status: "in_review", priority: "high" });

    render(<IssueCard issue={issue} href={HREF} />);

    expect(screen.getByText(humanizeStatus("in_review"))).toBeInTheDocument();
    expect(screen.getByText(humanizePriority("high"))).toBeInTheDocument();
    expect(screen.queryByText("in_review")).not.toBeInTheDocument();
    expect(screen.queryByText("high")).not.toBeInTheDocument();
  });

  // An unassigned issue shows an explicit unassigned state, not an empty slot.
  it("renders an unassigned state when there is no assignee", () => {
    const issue = makeIssue();

    render(<IssueCard issue={issue} href={HREF} assignee={null} />);

    expect(screen.getByText(/unassigned/i)).toBeInTheDocument();
  });

  // An overdue due date is visually marked; isOverdue() decides.
  it("marks an overdue due date", () => {
    const issue = makeIssue({ dueAt: PAST_DUE });

    render(<IssueCard issue={issue} href={HREF} />);

    const overdueText = screen.getByText(/overdue/i);
    expect(overdueText).toBeInTheDocument();
    expect(overdueText.className).toContain("text-red-600");
  });

  // formatRelative() supplies the updated-at wording.
  it("renders the last-updated time relatively", () => {
    const issue = makeIssue({ dueAt: PAST_DUE });

    render(<IssueCard issue={issue} href={HREF} />);

    // formatRelative() renders "N <unit>(s) ago" for a date far in the past.
    expect(screen.getByText(/ago$/)).toBeInTheDocument();
  });

  // The card is presentational: no can() call and no @/server import.
  it("performs no authorization or data fetching of its own", () => {
    const sourcePath = resolve(
      process.cwd(),
      "src/components/domain/issue/issue-card.tsx",
    );
    const source = readFileSync(sourcePath, "utf8");

    expect(source).not.toMatch(/\bcan\(/);
    expect(source).not.toMatch(/from\s+["']@\/server/);
  });
});
