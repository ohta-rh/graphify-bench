import { describe, expect, it } from "vitest";
import { grokArgs, grokChildEnv, parseGrokStream, unexpectedSkills } from "./grok-exec.js";

const resultLine = (extra: Record<string, unknown>) =>
  JSON.stringify({
    type: "result",
    subtype: "success",
    is_error: false,
    num_turns: 2,
    result: "ANSWER: src/a.ts",
    session_id: "s",
    duration_ms: 10,
    total_cost_usd: 0.2,
    usage: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 5, cache_creation_input_tokens: 0 },
    modelUsage: { "grok-4.7-build": { inputTokens: 100, outputTokens: 20, costUSD: 0.2 } },
    ...extra,
  });

describe("grok headless adapter", () => {
  it("pins model and effort and does not invent a budget flag grok lacks", () => {
    const args = grokArgs({
      prompt: "p",
      sessionId: "00000000-0000-4000-8000-000000000001",
      model: "grok-4.7",
      effort: "medium",
      maxTurns: 60,
      leaderSocket: "/tmp/leader.sock",
    });
    expect(args).toContain("grok-4.7");
    expect(args.slice(args.indexOf("--effort"), args.indexOf("--effort") + 2)).toEqual(["--effort", "medium"]);
    expect(args).toContain("streaming-messages-json");
    expect(args).toContain("--trust");
    expect(args).not.toContain("--max-budget-usd");
    expect(args).not.toContain("xhigh");
  });

  it("drops the parent session and turns Claude compatibility off", () => {
    const env = grokChildEnv({ GROK_SESSION_ID: "parent", PATH: "/usr/bin", GROK_AGENT: "1" }, "/tmp/grok-home");
    expect(env.GROK_HOME).toBe("/tmp/grok-home");
    expect(env.GROK_SESSION_ID).toBeUndefined();
    expect(env.GROK_AGENT).toBeUndefined();
    expect(env.GROK_CLAUDE_SKILLS_ENABLED).toBe("false");
    expect(env.GROK_CLAUDE_RULES_ENABLED).toBe("false");
    expect(env.PATH).toBe("/usr/bin");
  });

  it("keeps a reported cost and counts subagent spawns", () => {
    const stdout = [
      JSON.stringify({ type: "system", subtype: "init", skills: ["pdf"], model: "grok-4.7" }),
      JSON.stringify({
        type: "assistant",
        message: { content: [{ type: "tool_use", name: "spawn_subagent", id: "1", input: {} }] },
      }),
      resultLine({}),
    ].join("\n");
    const parsed = parseGrokStream(stdout, 50, false);
    expect(parsed.leakedSkills).toEqual([]);
    expect(parsed.result?.is_error).toBe(false);
    expect(parsed.result?.terminal_reason).toBe("completed");
    expect(parsed.result?.total_cost_usd).toBe(0.2);
    expect(parsed.result?.subagent_stats?.spawned).toBe(1);
    expect(parsed.result?.result).toBe("ANSWER: src/a.ts");
  });

  it("omits a zero cost when tokens were used", () => {
    const parsed = parseGrokStream(resultLine({ total_cost_usd: 0 }), 50, false);
    expect(parsed.result?.total_cost_usd).toBeUndefined();
    expect(parsed.result?.modelUsage?.["grok-4.7-build"]?.costUSD).toBeUndefined();
  });

  it("keeps an error_max_turns run and retries only quota or transport failures", () => {
    const capped = parseGrokStream(
      resultLine({ subtype: "error_max_turns", is_error: true, num_turns: 60 }),
      50,
      false,
    );
    expect(capped.result?.terminal_reason).toBe("error_max_turns");
    expect(capped.result?.is_error).toBe(true);
    const quota = parseGrokStream(
      resultLine({
        subtype: "error_during_execution",
        is_error: true,
        result: "You've hit your session limit · resets 5:40pm (Asia/Tokyo)",
        total_cost_usd: 0,
        usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
      }),
      50,
      false,
    );
    expect(quota.result?.terminal_reason).toBe("api_error");
    const prose = parseGrokStream(
      resultLine({ result: "createComment charges the comment:create rate limit, then writes the row." }),
      50,
      false,
    );
    expect(prose.result?.terminal_reason).toBe("completed");
    expect(prose.result?.is_error).toBe(false);
  });

  it("names a user skill as a leak and refuses the run", () => {
    expect(unexpectedSkills(["pdf", "graphify", "bundled:imagine"])).toEqual(["graphify"]);
    const parsed = parseGrokStream(
      [
        JSON.stringify({ type: "system", subtype: "init", skills: ["using-superpowers"] }),
        resultLine({}),
      ].join("\n"),
      50,
      false,
    );
    expect(parsed.leakedSkills).toEqual(["using-superpowers"]);
    expect(parsed.result?.terminal_reason).toBe("config_error");
    expect(parsed.result?.is_error).toBe(true);
  });
});
