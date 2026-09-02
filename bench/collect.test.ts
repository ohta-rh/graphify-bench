import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { classifyToolCall, computeMetrics, parseTranscript } from "./collect.js";
import type { ClaudeResult } from "./lib/claude-p.js";

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const result = JSON.parse(fs.readFileSync(path.join(FIXTURES, "sample-result.json"), "utf8")) as ClaudeResult;
const transcript = fs.readFileSync(path.join(FIXTURES, "sample-transcript.jsonl"), "utf8");

describe("classifyToolCall", () => {
  it("splits graphify out of Bash", () => {
    expect(classifyToolCall("Bash", { command: 'graphify query "x"' })).toBe("Bash(graphify)");
    expect(classifyToolCall("Bash", { command: "  graphify update ." })).toBe("Bash(graphify)");
    expect(classifyToolCall("Bash", { command: "cd /x && graphify query y" })).toBe("Bash(graphify)");
    expect(classifyToolCall("Bash", { command: "rg graphify src/" })).toBe("Bash");
    expect(classifyToolCall("Bash", { command: "ls" })).toBe("Bash");
  });

  it("leaves non-Bash tools alone", () => {
    expect(classifyToolCall("Read", { file_path: "a.ts" })).toBe("Read");
    expect(classifyToolCall("Grep", {})).toBe("Grep");
  });
});

describe("parseTranscript", () => {
  const stats = parseTranscript(transcript);

  it("counts tool calls with Bash sub-classified", () => {
    expect(stats.tool_calls).toEqual({ "Bash(graphify)": 1, Read: 2, Grep: 1 });
  });

  it("attributes tool_result bytes to the calling tool", () => {
    expect(stats.tool_result_bytes["Bash(graphify)"]).toBe(
      Buffer.byteLength("node: src/invites.ts inviteMember\nnode: src/limits.ts limitsFor", "utf8"),
    );
    expect(stats.tool_result_bytes.Grep).toBe(Buffer.byteLength("src/limits.ts: maxSeats", "utf8"));
    // both Read results accumulate under the same key
    expect(stats.tool_result_bytes.Read).toBe(
      Buffer.byteLength("export function inviteMember(){}", "utf8") + Buffer.byteLength('{"nodes":[]}', "utf8"),
    );
  });

  it("flags a direct read of graph.json", () => {
    expect(stats.read_graph_json).toBe(true);
    expect(stats.read_graph_json_events).toBe(1);
  });

  it("counts skill attributions", () => {
    expect(stats.skill_attributions).toBe(1);
    expect(stats.skill_attribution_names).toEqual({ graphify: 1 });
  });

  it("takes cache_creation from the FIRST assistant message only", () => {
    expect(stats.first_turn_cache_creation).toBe(7294);
  });

  it("ignores unparseable lines instead of throwing", () => {
    const stats2 = parseTranscript(`${transcript}not json\n\n`);
    expect(stats2.tool_calls).toEqual(stats.tool_calls);
  });
});

describe("computeMetrics", () => {
  const m = computeMetrics("EX1__baseline__r1", result, transcript, { task_id: "EX1", condition: "baseline", rep: 1 });

  it("derives uncached_equivalent as input + cache_creation + cache_read", () => {
    expect(m.uncached_equivalent).toBe(10 + 7294 + 13782);
  });

  it("carries the result-JSON fields through", () => {
    expect(m.total_cost_usd).toBe(0.0172612);
    expect(m.num_turns).toBe(1);
    expect(m.duration_ms).toBe(1377);
    expect(m.duration_api_ms).toBe(2514);
    expect(m.thinking_tokens).toBe(59);
    expect(m.output_tokens).toBe(66);
    expect(m.is_error).toBe(false);
    expect(m.terminal_reason).toBe("completed");
    expect(m.permission_denials).toBe(0);
    expect(m.subagents_spawned).toBe(0);
    expect(m.modelUsage?.["claude-haiku-4-5"]?.costUSD).toBe(0.0172612);
  });

  it("nulls every usage field when the schema changes under us", () => {
    const m2 = computeMetrics("x", { num_turns: 3 } as ClaudeResult, null, null);
    expect(m2.uncached_equivalent).toBeNull();
    expect(m2.input_tokens).toBeNull();
    expect(m2.total_cost_usd).toBeNull();
    expect(m2.num_turns).toBe(3);
    expect(m2.tool_calls).toEqual({});
  });

  it("survives a missing result entirely", () => {
    const m3 = computeMetrics("x", null, transcript, null);
    expect(m3.uncached_equivalent).toBeNull();
    expect(m3.tool_calls.Read).toBe(2);
  });
});
