import { describe, expect, it } from "vitest";
import {
  filterByQuery,
  isNavKey,
  matchesQuery,
  moveActiveIndex,
} from "@/components/ui/_lib/list-navigation";

describe("moveActiveIndex", () => {
  it("wraps around both ends", () => {
    expect(moveActiveIndex(2, "ArrowDown", 3)).toBe(0);
    expect(moveActiveIndex(0, "ArrowUp", 3)).toBe(2);
  });

  it("enters the list from either end when nothing is active", () => {
    expect(moveActiveIndex(-1, "ArrowDown", 4)).toBe(0);
    expect(moveActiveIndex(-1, "ArrowUp", 4)).toBe(3);
  });

  it("jumps to the edges for Home and End", () => {
    expect(moveActiveIndex(3, "Home", 8)).toBe(0);
    expect(moveActiveIndex(3, "End", 8)).toBe(7);
  });

  it("clamps paging at the edges instead of wrapping", () => {
    expect(moveActiveIndex(1, "PageUp", 20)).toBe(0);
    expect(moveActiveIndex(18, "PageDown", 20)).toBe(19);
  });

  it("reports -1 for an empty list", () => {
    expect(moveActiveIndex(0, "ArrowDown", 0)).toBe(-1);
  });

  it("recovers from an index left over from a longer list", () => {
    expect(moveActiveIndex(12, "ArrowDown", 3)).toBe(0);
  });
});

describe("isNavKey", () => {
  it("accepts only the navigation keys", () => {
    expect(isNavKey("ArrowDown")).toBe(true);
    expect(isNavKey("Enter")).toBe(false);
    expect(isNavKey("a")).toBe(false);
  });
});

describe("matchesQuery / filterByQuery", () => {
  it("matches case-insensitively on any substring", () => {
    expect(matchesQuery("Assign to Ada", "ada")).toBe(true);
    expect(matchesQuery("Assign to Ada", "bob")).toBe(false);
  });

  it("treats a blank query as matching everything", () => {
    expect(matchesQuery("anything", "   ")).toBe(true);
  });

  it("filters using the projected search text", () => {
    const options = [
      { value: "1", label: "Bug", description: "defect report" },
      { value: "2", label: "Chore", description: "maintenance" },
    ];
    const found = filterByQuery(options, "defect", (o) => `${o.label} ${o.description}`);
    expect(found.map((o) => o.value)).toEqual(["1"]);
  });

  it("returns a copy of the list when the query is empty", () => {
    const options = [{ value: "1", label: "Bug" }];
    const result = filterByQuery(options, "", (o) => o.label);
    expect(result).toEqual(options);
    expect(result).not.toBe(options);
  });
});
