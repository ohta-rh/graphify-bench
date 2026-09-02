/** Level thresholds, JSON shape and the scope binding. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLogger } from "@/lib/logger";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("lib/logger", () => {
  it("writes one JSON object per line, carrying the scope", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    createLogger("issue-service").warn("quota nearly reached");

    expect(spy).toHaveBeenCalledTimes(1);
    const line: unknown = JSON.parse(String(spy.mock.calls[0]?.[0]));
    expect(line).toMatchObject({
      level: "warn",
      scope: "issue-service",
      message: "quota nearly reached",
    });
  });

  it("merges structured fields into the line", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    createLogger("jobs").error("delivery failed", { attempt: 3, parked: true });

    const line = JSON.parse(String(spy.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(line.attempt).toBe(3);
    expect(line.parked).toBe(true);
    expect(typeof line.time).toBe("string");
  });

  it("routes errors to console.error and warnings to console.warn", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const log = createLogger("scope");
    log.error("bad");
    log.warn("iffy");

    expect(error).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("suppresses debug and info under the test threshold", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const log = createLogger("scope");
    log.debug("noisy");
    log.info("chatty");

    expect(spy).not.toHaveBeenCalled();
  });
});
