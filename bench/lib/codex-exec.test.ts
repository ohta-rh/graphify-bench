import { describe, expect, it } from "vitest";
import { codexArgs, parseCodexEvents, quotaResetAt } from "./codex-exec.js";

describe("Codex benchmark event adapter", () => {
  it("uses the new reset clock rather than a stale prior-window override", () => {
    const now = Date.parse("2026-10-01T14:45:00+09:00");
    const old = Date.parse("2026-10-01T14:03:16+09:00");
    expect(quotaResetAt("try again at 7:05 PM.", now, old)).toBe(Date.parse("2026-10-01T19:05:00+09:00"));
    expect(quotaResetAt("try again at 12:05 AM.", now)).toBe(Date.parse("2026-10-02T00:05:00+09:00"));
    expect(quotaResetAt("quota without reset clock", now, old)).toBe(now + 30 * 60_000);
  });
  it("splits cached input, counts reasoning within output once, and preserves audit inputs", () => {
    const jsonl = [
      { type: "thread.started", thread_id: "session" },
      { type: "item.completed", item: { id: "c", type: "command_execution", command: "rg foo src", aggregated_output: "src/foo.ts" } },
      { type: "item.completed", item: { type: "agent_message", text: "ANSWER: src/foo.ts" } },
      { type: "turn.completed", usage: { input_tokens: 10000, cached_input_tokens: 8000, cache_write_input_tokens: 1000, output_tokens: 500, reasoning_output_tokens: 300 } },
    ].map(e => JSON.stringify(e)).join("\n");
    const p = parseCodexEvents(jsonl, 100);
    expect(p.completed).toBe(true);
    expect(p.result.total_cost_usd).toBeCloseTo(0.0103);
    expect(p.result.usage?.input_tokens).toBe(1000);
    expect(p.result.usage?.output_tokens).toBe(500);
    expect(p.result.num_turns).toBeUndefined();
    expect(p.normalizedTranscript).toContain("rg foo src");
  });
  it("does not promote partial output or transport/quota failures to successful results", () => {
    for (const end of [{ type: "turn.failed", error: { message: "quota" } }, { type: "turn.completed" }]) {
      const p = parseCodexEvents(JSON.stringify(end), 100);
      expect(p.completed).toBe(false);
      expect(p.result.total_cost_usd).toBeUndefined();
      expect(p.result.is_error).toBe(true);
    }
  });
  it("pins the requested model/effort and isolates personal config and external tools", () => {
    const args = codexArgs("/tmp/private-run", "high");
    expect(args).toContain("gpt-6.1-sol");
    expect(args).toContain('model_reasoning_effort="high"');
    expect(args).toContain("--ignore-user-config");
    expect(args).toContain('web_search="disabled"');
    expect(args).toContain("features.multi_agent=false");
  });
});
