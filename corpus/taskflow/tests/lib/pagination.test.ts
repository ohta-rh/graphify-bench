/** Page-count arithmetic, clamping and cursor slicing. */
import { describe, expect, it } from "vitest";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/config/constants";
import { clampPageSize, emptyPage, pageCount, sliceToPage } from "@/lib/pagination";

const rows = ["a", "b", "c", "d", "e"];

describe("lib/pagination", () => {
  it("counts pages, rounding up", () => {
    expect(pageCount(0, 25)).toBe(1);
    expect(pageCount(25, 25)).toBe(1);
    expect(pageCount(26, 25)).toBe(2);
    expect(pageCount(51, 25)).toBe(3);
  });

  it("clamps an out-of-range page size into the schema's bounds", () => {
    expect(clampPageSize(10)).toBe(10);
    expect(clampPageSize(0)).toBe(DEFAULT_PAGE_SIZE);
    expect(clampPageSize(-5)).toBe(DEFAULT_PAGE_SIZE);
    expect(clampPageSize(Number.NaN)).toBe(DEFAULT_PAGE_SIZE);
    expect(clampPageSize(10_000)).toBe(MAX_PAGE_SIZE);
  });

  it("builds an empty page with no cursor", () => {
    expect(emptyPage<string>()).toEqual({ items: [], nextCursor: null, total: 0 });
  });

  it("returns no cursor when the row set fits the page", () => {
    const page = sliceToPage(rows.slice(0, 3), 3, 3, (item) => item);
    expect(page.items).toEqual(["a", "b", "c"]);
    expect(page.nextCursor).toBeNull();
    expect(page.total).toBe(3);
  });

  it("trims the over-fetched row and returns the last kept cursor", () => {
    const page = sliceToPage(rows, 4, 42, (item) => item);
    expect(page.items).toEqual(["a", "b", "c", "d"]);
    expect(page.nextCursor).toBe("d");
    expect(page.total).toBe(42);
  });

  it("handles an empty row set", () => {
    const page = sliceToPage<string>([], 10, 0, (item) => item);
    expect(page.items).toEqual([]);
    expect(page.nextCursor).toBeNull();
  });
});
