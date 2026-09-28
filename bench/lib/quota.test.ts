import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { apiFailure, retryDelayMs, runApiFailure } from "./quota.js";

// The exact shape `claude -p` wrote for the 168 extreme-set runs lost on 2026-09-28.
const QUOTA = {
  type: "result",
  subtype: "success",
  is_error: true,
  terminal_reason: "api_error",
  result: "You've hit your session limit · resets 5:40pm (Asia/Tokyo)",
  total_cost_usd: 0,
};

describe("apiFailure", () => {
  it("flags a quota stop even though its subtype says success", () => {
    expect(apiFailure(QUOTA)).toEqual({ quota: true, message: QUOTA.result });
  });

  it("flags other api errors as transport failures", () => {
    expect(apiFailure({ ...QUOTA, result: "Overloaded" })).toEqual({ quota: false, message: "Overloaded" });
  });

  // Hitting the turn cap is a real outcome: the agent worked until the cap.
  it("leaves max-turns stops and ordinary results alone", () => {
    expect(apiFailure({ is_error: true, subtype: "error_max_turns", terminal_reason: "max_turns" })).toBeNull();
    expect(apiFailure({ is_error: false, subtype: "success", terminal_reason: "completed" })).toBeNull();
    expect(apiFailure(null)).toBeNull();
  });
});

describe("retryDelayMs", () => {
  // 2026-09-28 06:22:38 UTC is 15:22:38 in Tokyo; the reset at 17:40 is 2h17m22s away, plus a minute.
  it("waits until the named reset on that zone's clock, plus a minute", () => {
    const now = new Date("2026-09-28T06:22:38Z");
    expect(retryDelayMs(apiFailure(QUOTA)!, now)).toBe(((2 * 60 + 17) * 60 + 22) * 1000 + 60_000);
  });

  it("rolls a reset that already passed today over to tomorrow", () => {
    const now = new Date("2026-09-28T09:00:00Z"); // 18:00 in Tokyo
    expect(retryDelayMs(apiFailure(QUOTA)!, now)).toBe((23 * 60 + 40) * 60_000 + 60_000);
  });

  it("falls back when the message has no parseable reset, or is not a quota stop", () => {
    expect(retryDelayMs({ quota: true, message: "You've hit your session limit" })).toBe(600_000);
    expect(retryDelayMs({ quota: false, message: "Overloaded" }, new Date(), 5_000)).toBe(5_000);
  });
});

describe("runApiFailure", () => {
  it("reads the verdict from a run directory's result.json", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "quota-"));
    try {
      expect(runApiFailure(dir)).toBeNull();
      fs.writeFileSync(path.join(dir, "result.json"), JSON.stringify(QUOTA));
      expect(runApiFailure(dir)?.quota).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
