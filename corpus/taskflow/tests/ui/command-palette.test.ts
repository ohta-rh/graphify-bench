import { describe, expect, it } from "vitest";
import { flattenGroups } from "@/components/ui/command-palette";
import { progressPercent } from "@/components/ui/progress";
import { initialsOf } from "@/components/ui/avatar";

const GROUPS = [
  {
    heading: "Issues",
    items: [
      { id: "issue.new", label: "New issue", shortcut: "C" },
      { id: "issue.assign", label: "Assign to me", hint: "current issue" },
    ],
  },
  {
    heading: "Navigation",
    items: [{ id: "nav.board", label: "Go to board" }],
  },
] as const;

describe("flattenGroups", () => {
  it("numbers items continuously across group boundaries", () => {
    const { rows } = flattenGroups(GROUPS, "");
    expect(rows.map((row) => row.index)).toEqual([0, 1, 2]);
    expect(rows[2]?.heading).toBe("Navigation");
  });

  it("drops groups whose items all filter out", () => {
    const { sections, rows } = flattenGroups(GROUPS, "board");
    expect(sections).toHaveLength(1);
    expect(sections[0]?.heading).toBe("Navigation");
    expect(rows).toHaveLength(1);
  });

  it("matches on the hint text as well as the label", () => {
    const { rows } = flattenGroups(GROUPS, "current issue");
    expect(rows.map((row) => row.item.id)).toEqual(["issue.assign"]);
  });

  it("matches on the group heading, so a heading name finds its whole group", () => {
    const { rows } = flattenGroups(GROUPS, "navigation");
    expect(rows.map((row) => row.item.id)).toEqual(["nav.board"]);
  });

  it("renumbers after filtering so the active index stays in range", () => {
    const { rows } = flattenGroups(GROUPS, "issue");
    expect(rows.map((row) => row.index)).toEqual([0, 1]);
  });
});

describe("progressPercent", () => {
  it("rounds to a whole percent", () => {
    expect(progressPercent(1, 3)).toBe(33);
  });

  it("clamps a count that has run past its limit", () => {
    expect(progressPercent(12, 10)).toBe(100);
    expect(progressPercent(-4, 10)).toBe(0);
  });

  it("returns 0 for an unusable maximum instead of NaN", () => {
    expect(progressPercent(5, 0)).toBe(0);
    expect(progressPercent(5, Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("initialsOf", () => {
  it("takes the first letter of the first two words", () => {
    expect(initialsOf("Ada Lovelace")).toBe("AL");
    expect(initialsOf("  grace   brewster  hopper ")).toBe("GB");
  });

  it("falls back for an empty name", () => {
    expect(initialsOf("   ")).toBe("?");
  });
});
