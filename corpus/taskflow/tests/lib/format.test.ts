/** Money, byte and enum-label formatting, including the unlimited case. */
import { describe, expect, it } from "vitest";
import { UNLIMITED } from "@/config/plan-limits";
import {
  formatBytes,
  formatCents,
  formatCount,
  formatLimit,
  humanizePriority,
  humanizeRole,
  humanizeStatus,
  issueKey,
} from "@/lib/format";
import { ISSUE_PRIORITIES, ISSUE_STATUSES } from "@/types/issue";
import { ROLES } from "@/types/member";

describe("lib/format", () => {
  it("renders cents as currency", () => {
    expect(formatCents(1_900)).toBe("$19.00");
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(123_456, "EUR")).toBe("€1,234.56");
  });

  it("groups small counts and abbreviates large ones", () => {
    expect(formatCount(999)).toBe("999");
    expect(formatCount(9_999)).toBe("9,999");
    expect(formatCount(12_400)).toBe("12.4K");
    expect(formatCount(3_100_000)).toBe("3.1M");
  });

  it("scales byte sizes to the largest fitting unit", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1_024)).toBe("1 KB");
    expect(formatBytes(1_572_864)).toBe("1.5 MB");
  });

  it("renders the unlimited sentinel as a word, not Infinity", () => {
    expect(formatLimit(UNLIMITED)).toBe("Unlimited");
    expect(formatLimit(Number.POSITIVE_INFINITY)).toBe("Unlimited");
    expect(formatLimit(50)).toBe("50");
  });

  it("has a label for every status, priority and role in the domain", () => {
    for (const status of ISSUE_STATUSES) {
      expect(humanizeStatus(status)).not.toBe("");
      expect(humanizeStatus(status)).not.toContain("_");
    }
    for (const priority of ISSUE_PRIORITIES) {
      expect(humanizePriority(priority)).not.toBe("");
    }
    for (const role of ROLES) {
      expect(humanizeRole(role)).not.toBe("");
    }
    expect(humanizeStatus("in_review")).toBe("In review");
    expect(humanizePriority("none")).toBe("No priority");
    expect(humanizeRole("owner")).toBe("Owner");
  });

  it("upper-cases the project key in an issue reference", () => {
    expect(issueKey("web", 142)).toBe("WEB-142");
    expect(issueKey("TF", 1)).toBe("TF-1");
  });
});
