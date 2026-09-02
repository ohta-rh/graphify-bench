import { describe, expect, it } from "vitest";
import {
  buildPageRange,
  pageCount,
  rangeEnd,
  rangeStart,
} from "@/components/ui/_lib/pagination-range";

describe("pageCount", () => {
  it("rounds partial pages up", () => {
    expect(pageCount(41, 20)).toBe(3);
    expect(pageCount(40, 20)).toBe(2);
  });

  it("always reports at least one page, even with no rows", () => {
    expect(pageCount(0, 20)).toBe(1);
  });

  it("returns zero for a nonsensical page size instead of dividing by zero", () => {
    expect(pageCount(10, 0)).toBe(0);
  });
});

describe("rangeStart / rangeEnd", () => {
  it("describes the rows on the current page", () => {
    expect(rangeStart(3, 20, 55)).toBe(41);
    expect(rangeEnd(3, 20, 55)).toBe(55);
  });

  it("collapses to 0–0 for an empty result set", () => {
    expect(rangeStart(1, 20, 0)).toBe(0);
    expect(rangeEnd(1, 20, 0)).toBe(0);
  });
});

describe("buildPageRange", () => {
  it("lists every page while the range is short", () => {
    expect(buildPageRange(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("elides the far side when the cursor sits at the start", () => {
    expect(buildPageRange(2, 20)).toEqual([1, 2, 3, "gap", 20]);
  });

  it("elides both sides in the middle of a long range", () => {
    expect(buildPageRange(10, 20)).toEqual([1, "gap", 9, 10, 11, "gap", 20]);
  });

  it("elides the near side at the end", () => {
    expect(buildPageRange(20, 20)).toEqual([1, "gap", 19, 20]);
    expect(buildPageRange(19, 20)).toEqual([1, "gap", 18, 19, 20]);
  });

  it("never emits a gap that hides a single page", () => {
    const tokens = buildPageRange(4, 9);
    expect(tokens).toContain(2);
    expect(tokens.filter((token) => token === "gap")).toHaveLength(1);
  });

  it("clamps an out-of-bounds current page", () => {
    expect(buildPageRange(99, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(buildPageRange(0, 3)).toEqual([1, 2, 3]);
  });

  it("returns nothing when there are no pages", () => {
    expect(buildPageRange(1, 0)).toEqual([]);
  });
});
