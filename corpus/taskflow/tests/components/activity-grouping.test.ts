import { describe, expect, it } from "vitest";
import {
  activityDay,
  activityLabel,
  groupEventsByDay,
} from "@/components/domain/activity/activity-labels";
import { usageRatio, usageTone } from "@/components/domain/billing/usage-meter";
import { toIsoTimestamp } from "@/types/common";
import type { ActivityId, OrgId, UserId } from "@/types/common";
import type { ActivityEvent } from "@/types/activity";
import type { LimitCheck } from "@/types/billing";

function event(id: string, occurredAt: string): ActivityEvent {
  return {
    id: id as ActivityId,
    orgId: "org_1" as OrgId,
    action: "issue.created",
    actorId: "usr_1" as UserId,
    subjectKind: "issue",
    subjectId: "iss_1",
    projectId: null,
    summary: `event ${id}`,
    metadata: {},
    occurredAt: toIsoTimestamp(occurredAt),
  };
}

describe("activity-labels/groupEventsByDay", () => {
  it("buckets events by UTC calendar day, newest day first", () => {
    const groups = groupEventsByDay([
      event("a", "2026-03-01T09:00:00.000Z"),
      event("b", "2026-03-02T09:00:00.000Z"),
      event("c", "2026-03-01T18:00:00.000Z"),
    ]);
    expect(groups.map((group) => group.day)).toEqual(["2026-03-02", "2026-03-01"]);
    expect(groups[1]?.events.map((e) => e.id)).toEqual(["c", "a"]);
  });

  it("returns nothing for no events", () => {
    expect(groupEventsByDay([])).toEqual([]);
  });

  it("derives the day from the timestamp prefix", () => {
    expect(activityDay(event("a", "2026-12-31T23:59:59.000Z"))).toBe(
      "2026-12-31",
    );
  });

  it("has a label for every action it renders", () => {
    expect(activityLabel("member.role_changed")).toBe("changed a role");
  });
});

function check(used: number, limit: number, exceeded = used > limit): LimitCheck {
  return {
    resource: "seats",
    plan: "starter",
    limit,
    used,
    remaining: Math.max(0, limit - used),
    exceeded,
  };
}

describe("usage-meter", () => {
  it("reports the consumed fraction", () => {
    expect(usageRatio(check(5, 10))).toBe(0.5);
  });

  it("treats an unlimited quota as zero consumption", () => {
    expect(usageRatio(check(500, Number.POSITIVE_INFINITY))).toBe(0);
  });

  it("clamps overuse to a full bar", () => {
    expect(usageRatio(check(15, 10))).toBe(1);
  });

  it("warns before the wall and turns red at it", () => {
    expect(usageTone(check(5, 10))).toBe("brand");
    expect(usageTone(check(8, 10))).toBe("warning");
    expect(usageTone(check(11, 10))).toBe("danger");
  });
});
