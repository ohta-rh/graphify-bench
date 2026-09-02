/** Subscribe/emit/unsubscribe, handler isolation and `subscriberCount`. */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  emit,
  emitAndForget,
  onHandlerError,
  resetEventBus,
  subscribe,
  subscribeOnce,
  subscriberCount,
} from "@/lib/event-bus";
import type { IssueId, IsoTimestamp, ProjectId } from "@/types/common";
import type { TaskflowEventMap } from "@/types/event";
import { ALICE, ORG_A } from "../helpers/factories";

function issueCreated(
  title = "Fix the sign-up link",
): TaskflowEventMap["issue.created"] {
  return {
    orgId: ORG_A,
    actorId: ALICE,
    occurredAt: "2026-03-15T12:00:00.000Z" as IsoTimestamp,
    issueId: "01HZZZSSSSSSSSSSSSSSSSSSSS" as IssueId,
    projectId: "01HZZZPPPPPPPPPPPPPPPPPPPP" as ProjectId,
    title,
    assigneeId: null,
    priority: "medium",
  };
}

afterEach(() => {
  resetEventBus();
});

describe("lib/event-bus", () => {
  it("delivers a payload to every subscriber of that type only", async () => {
    const onCreated = vi.fn();
    const onArchived = vi.fn();
    subscribe("issue.created", onCreated);
    subscribe("issue.archived", onArchived);

    await emit("issue.created", issueCreated());

    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(onCreated.mock.calls[0]?.[0]).toMatchObject({ title: "Fix the sign-up link" });
    expect(onArchived).not.toHaveBeenCalled();
  });

  it("is a no-op when nothing subscribes", async () => {
    await expect(emit("issue.created", issueCreated())).resolves.toBeUndefined();
    expect(subscriberCount("issue.created")).toBe(0);
  });

  it("stops delivering after the returned unsubscribe is called", async () => {
    const handler = vi.fn();
    const off = subscribe("issue.created", handler);
    expect(subscriberCount("issue.created")).toBe(1);

    off();
    expect(subscriberCount("issue.created")).toBe(0);
    await emit("issue.created", issueCreated());
    expect(handler).not.toHaveBeenCalled();
  });

  it("delivers a `subscribeOnce` handler exactly once", async () => {
    const handler = vi.fn();
    subscribeOnce("issue.created", handler);

    await emit("issue.created", issueCreated("first"));
    await emit("issue.created", issueCreated("second"));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(subscriberCount("issue.created")).toBe(0);
  });

  it("isolates a throwing handler: siblings still run and emit resolves", async () => {
    const sink = vi.fn();
    onHandlerError(sink);
    subscribe("issue.created", () => {
      throw new Error("handler exploded");
    });
    const survivor = vi.fn();
    subscribe("issue.created", survivor);

    await expect(emit("issue.created", issueCreated())).resolves.toBeUndefined();
    expect(survivor).toHaveBeenCalledTimes(1);
    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink.mock.calls[0]?.[0]).toBe("issue.created");
  });

  it("reports a rejected async handler to the error sinks", async () => {
    const sink = vi.fn();
    onHandlerError(sink);
    subscribe("issue.created", async () => {
      await Promise.reject(new Error("async boom"));
    });

    await emit("issue.created", issueCreated());
    expect(sink).toHaveBeenCalledTimes(1);
  });

  it("awaits async handlers before resolving", async () => {
    const order: string[] = [];
    subscribe("issue.created", async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      order.push("handler");
    });

    await emit("issue.created", issueCreated());
    order.push("after-emit");
    expect(order).toEqual(["handler", "after-emit"]);
  });

  it("emitAndForget returns synchronously but still delivers", async () => {
    const handler = vi.fn();
    subscribe("issue.created", handler);

    expect(emitAndForget("issue.created", issueCreated())).toBeUndefined();
    await Promise.resolve();
    await Promise.resolve();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("counts each distinct handler once", () => {
    const handler = vi.fn();
    subscribe("issue.created", handler);
    subscribe("issue.created", handler);
    expect(subscriberCount("issue.created")).toBe(1);

    subscribe("issue.created", vi.fn());
    expect(subscriberCount("issue.created")).toBe(2);
  });
});
