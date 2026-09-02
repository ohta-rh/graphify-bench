/** Relative formatting, overdue detection and the digest window. */
import { describe, expect, it } from "vitest";
import {
  addDays,
  digestWindow,
  formatDate,
  formatRelative,
  isOverdue,
  now,
  parseIso,
} from "@/lib/date";
import type { IsoTimestamp } from "@/types/common";

const REFERENCE = new Date("2026-03-15T12:00:00.000Z");
const iso = (value: string): IsoTimestamp => value as IsoTimestamp;

describe("lib/date", () => {
  it("round-trips now() through parseIso()", () => {
    const stamp = now();
    expect(parseIso(stamp).toISOString()).toBe(stamp);
  });

  it("throws on a malformed timestamp rather than yielding Invalid Date", () => {
    expect(() => parseIso(iso("not-a-date"))).toThrow(RangeError);
  });

  it("formats past distances with an 'ago' suffix", () => {
    expect(formatRelative(iso("2026-03-15T11:59:30.000Z"), REFERENCE)).toBe("just now");
    expect(formatRelative(iso("2026-03-15T11:55:00.000Z"), REFERENCE)).toBe("5 minutes ago");
    expect(formatRelative(iso("2026-03-15T11:00:00.000Z"), REFERENCE)).toBe("1 hour ago");
    expect(formatRelative(iso("2026-03-13T12:00:00.000Z"), REFERENCE)).toBe("2 days ago");
    expect(formatRelative(iso("2026-03-01T12:00:00.000Z"), REFERENCE)).toBe("2 weeks ago");
  });

  it("formats future distances with an 'in' prefix", () => {
    expect(formatRelative(iso("2026-03-15T12:30:00.000Z"), REFERENCE)).toBe("in 30 minutes");
    expect(formatRelative(iso("2026-03-18T12:00:00.000Z"), REFERENCE)).toBe("in 3 days");
  });

  it("renders an absolute date in the requested timezone", () => {
    expect(formatDate(iso("2026-03-15T23:30:00.000Z"))).toBe("15 Mar 2026");
    expect(formatDate(iso("2026-03-15T23:30:00.000Z"), "Asia/Tokyo")).toBe("16 Mar 2026");
  });

  it("treats a null due date as never overdue", () => {
    expect(isOverdue(null, REFERENCE)).toBe(false);
    expect(isOverdue(iso("2026-03-15T11:59:59.000Z"), REFERENCE)).toBe(true);
    expect(isOverdue(iso("2026-03-15T12:00:01.000Z"), REFERENCE)).toBe(false);
  });

  it("adds and subtracts whole days", () => {
    expect(addDays(iso("2026-03-15T12:00:00.000Z"), 3)).toBe("2026-03-18T12:00:00.000Z");
    expect(addDays(iso("2026-03-01T12:00:00.000Z"), -1)).toBe("2026-02-28T12:00:00.000Z");
  });

  it("ends the digest window at today's digest hour once it has passed", () => {
    const window = digestWindow(8, REFERENCE);
    expect(window.end).toBe("2026-03-15T08:00:00.000Z");
    expect(window.start).toBe("2026-03-14T08:00:00.000Z");
  });

  it("falls back to yesterday's window when the digest hour has not arrived", () => {
    const window = digestWindow(20, REFERENCE);
    expect(window.end).toBe("2026-03-14T20:00:00.000Z");
    expect(window.start).toBe("2026-03-13T20:00:00.000Z");
  });

  it("rejects a digest hour outside 0-23", () => {
    expect(() => digestWindow(24, REFERENCE)).toThrow(RangeError);
    expect(() => digestWindow(-1, REFERENCE)).toThrow(RangeError);
  });
});
