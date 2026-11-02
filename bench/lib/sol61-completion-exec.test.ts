import { describe, it, expect } from "vitest";
import { codexArgs, parseCodexEvents, SOL61_MODEL, SOL61_EFFORTS } from "./sol61-completion-exec.js";

describe("Sol completion routing and historical cost basis", () => {
  it("routes all four efforts to the exact Sol model with isolated configuration", () => {
    for (const effort of SOL61_EFFORTS) {
      const argv = codexArgs("/tmp/sol-test", effort);
      expect(argv[argv.indexOf("-m") + 1]).toBe("gpt-6.1-sol");
      expect(SOL61_MODEL).toBe("gpt-6.1-sol");
      expect(argv).toContain(`model_reasoning_effort="${effort}"`);
      expect(argv).toContain("--ignore-user-config");
    }
  });
  it("uses Sol historical rates instead of the shared transport's Terra rates", () => {
    const result = parseCodexEvents(JSON.stringify({ type: "turn.completed", usage:
      { input_tokens: 1000000, cached_input_tokens: 200000, output_tokens: 100000 } }), 100);
    expect(result.completed).toBe(true);
    expect(result.result.total_cost_usd).toBeCloseTo(2.62);
    expect(Object.keys(result.result.modelUsage!)).toEqual(["gpt-6.1-sol"]);
  });
});
