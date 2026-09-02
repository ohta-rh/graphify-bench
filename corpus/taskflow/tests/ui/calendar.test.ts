import { describe, expect, it } from "vitest";
import {
  buildMonthGrid,
  isIsoDate,
  isOutOfRange,
  monthLabel,
  parseIso,
  shiftMonth,
  toIso,
} from "@/components/ui/_lib/calendar";

const MARCH_2026 = new Date(Date.UTC(2026, 2, 1));

describe("isIsoDate", () => {
  it("accepts a well-formed calendar date", () => {
    expect(isIsoDate("2026-03-01")).toBe(true);
  });

  it("rejects malformed and impossible dates", () => {
    expect(isIsoDate("2026-3-1")).toBe(false);
    expect(isIsoDate("2026-02-31")).toBe(false);
    expect(isIsoDate(null)).toBe(false);
    expect(isIsoDate(undefined)).toBe(false);
  });
});

describe("parseIso", () => {
  it("falls back for anything unparseable", () => {
    const fallback = new Date(Date.UTC(2020, 0, 1));
    expect(parseIso("nope", fallback)).toBe(fallback);
    expect(toIso(parseIso("2026-03-09", fallback))).toBe("2026-03-09");
  });
});

describe("shiftMonth", () => {
  it("crosses a year boundary", () => {
    expect(toIso(shiftMonth(new Date(Date.UTC(2026, 11, 15)), 1))).toBe("2027-01-01");
    expect(toIso(shiftMonth(new Date(Date.UTC(2026, 0, 15)), -1))).toBe("2025-12-01");
  });
});

describe("buildMonthGrid", () => {
  const cells = buildMonthGrid(MARCH_2026);

  it("always fills six Monday-first weeks", () => {
    expect(cells).toHaveLength(42);
    // 2026-03-01 is a Sunday, so the grid opens on Monday 2026-02-23.
    expect(cells[0]?.iso).toBe("2026-02-23");
    expect(cells[41]?.iso).toBe("2026-04-05");
  });

  it("marks the borrowed days from adjacent months", () => {
    expect(cells[0]?.inMonth).toBe(false);
    expect(cells.filter((cell) => cell.inMonth)).toHaveLength(31);
  });

  it("advances exactly one day per cell", () => {
    expect(cells[1]?.day).toBe(24);
    expect(cells[7]?.iso).toBe("2026-03-02");
  });

  it("handles a February that starts on a Monday", () => {
    const feb = buildMonthGrid(new Date(Date.UTC(2027, 1, 1)));
    expect(feb[0]?.iso).toBe("2027-02-01");
    expect(feb[0]?.inMonth).toBe(true);
  });
});

describe("monthLabel", () => {
  it("renders the heading", () => {
    expect(monthLabel(MARCH_2026)).toBe("March 2026");
  });
});

describe("isOutOfRange", () => {
  it("honours both bounds and ignores absent ones", () => {
    expect(isOutOfRange("2026-03-01", "2026-03-02")).toBe(true);
    expect(isOutOfRange("2026-03-03", undefined, "2026-03-02")).toBe(true);
    expect(isOutOfRange("2026-03-02", "2026-03-01", "2026-03-03")).toBe(false);
    expect(isOutOfRange("2026-03-02")).toBe(false);
  });

  it("ignores a malformed bound rather than blocking every date", () => {
    expect(isOutOfRange("2026-03-02", "not-a-date")).toBe(false);
  });
});
