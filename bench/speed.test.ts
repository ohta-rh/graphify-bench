import { describe, expect, it } from "vitest";
import {
  mcpAnnounceDelayMs,
  parseToolLatencies,
  spread,
  summarizeSpeed,
  toolGroup,
  type RunSpeed,
} from "./speed.js";

const at = (ms: number): string => new Date(Date.UTC(2026, 8, 2, 0, 0, 0, 0) + ms).toISOString();

/** One transcript entry carrying a single content block. */
const entry = (ms: number, block: unknown, type = "assistant"): string =>
  JSON.stringify({ type, timestamp: at(ms), message: { content: [block] } });

const use = (id: string, name: string, input: unknown = {}): unknown => ({ type: "tool_use", id, name, input });
const res = (id: string): unknown => ({ type: "tool_result", tool_use_id: id, content: "ok" });

describe("toolGroup", () => {
  it("separates the mempalace search tool from the server's other 44 tools", () => {
    expect(toolGroup("mcp__mempalace__mempalace_search", {})).toBe("mempalace_search");
    expect(toolGroup("mcp__mempalace__mempalace_list_wings", {})).toBe("other MCP");
    expect(toolGroup("mcp__other__thing", {})).toBe("other MCP");
  });

  // Must match collect.ts's split, or a latency row and a call-count row with
  // the same label would describe different sets of calls.
  it("splits Bash on whether the command invoked graphify", () => {
    expect(toolGroup("Bash", { command: 'graphify query "x"' })).toBe("Bash(graphify)");
    expect(toolGroup("Bash", { command: 'cd d && graphify explain "y"' })).toBe("Bash(graphify)");
    expect(toolGroup("Bash", { command: "cat graphify-out/graph.json" })).toBe("Bash");
    expect(toolGroup("Bash", { command: "pnpm test" })).toBe("Bash");
    expect(toolGroup("Bash", {})).toBe("Bash");
  });

  it("keeps the search tools the arms actually compete on, and drops the rest", () => {
    for (const name of ["Read", "Grep", "Glob", "Agent"]) expect(toolGroup(name, {})).toBe(name);
    expect(toolGroup("Edit", {})).toBeNull();
    expect(toolGroup("ToolSearch", {})).toBeNull();
  });
});

describe("parseToolLatencies", () => {
  it("times a call from its tool_use entry to its tool_result entry", () => {
    const jsonl = [
      entry(0, use("a", "Read")),
      entry(12, res("a"), "user"),
      entry(20, use("b", "mcp__mempalace__mempalace_search")),
      entry(220, res("b"), "user"),
    ].join("\n");
    const out = parseToolLatencies(jsonl);
    expect(out.Read).toEqual([12]);
    expect(out.mempalace_search).toEqual([200]);
  });

  it("matches results to their own call when several are in flight", () => {
    const jsonl = [
      entry(0, use("a", "Read")),
      entry(5, use("b", "Grep")),
      entry(30, res("b"), "user"),
      entry(40, res("a"), "user"),
    ].join("\n");
    const out = parseToolLatencies(jsonl);
    expect(out.Read).toEqual([40]);
    expect(out.Grep).toEqual([25]);
  });

  // A run that hit its turn cap mid-call has a tool_use with no tool_result.
  // Counting it as zero would drag the arm's median toward zero.
  it("omits a call whose result never arrived rather than scoring it zero", () => {
    const out = parseToolLatencies([entry(0, use("a", "Read")), entry(1, use("b", "Grep"))].join("\n"));
    expect(out.Read).toBeUndefined();
    expect(out.Grep).toBeUndefined();
  });

  it("ignores a result with no matching call, and survives a malformed line", () => {
    const jsonl = ["{not json", entry(0, res("ghost"), "user"), entry(1, use("a", "Read")), entry(4, res("a"), "user")].join("\n");
    expect(parseToolLatencies(jsonl).Read).toEqual([3]);
  });

  it("drops a negative interval rather than letting it pull a median down", () => {
    const jsonl = [entry(50, use("a", "Read")), entry(10, res("a"), "user")].join("\n");
    expect(parseToolLatencies(jsonl).Read).toBeUndefined();
  });
});

describe("mcpAnnounceDelayMs", () => {
  it("measures from the first entry to the one advertising the server's tools", () => {
    const jsonl = [
      JSON.stringify({ type: "queue-operation", timestamp: at(0) }),
      JSON.stringify({ type: "attachment", timestamp: at(11), attachment: { addedNames: ["mcp__mempalace__x"] } }),
    ].join("\n");
    expect(mcpAnnounceDelayMs(jsonl, "mcp__mempalace__")).toBe(11);
  });

  it("is null when the server contributed no tool at all", () => {
    const jsonl = JSON.stringify({ type: "attachment", timestamp: at(0), attachment: { addedNames: ["WebFetch"] } });
    expect(mcpAnnounceDelayMs(jsonl, "mcp__mempalace__")).toBeNull();
  });
});

describe("spread", () => {
  it("reports median and quartiles with the count of observations", () => {
    expect(spread([1, 2, 3, 4])).toEqual({ n: 4, median: 2.5, q1: 1.75, q3: 3.25 });
  });

  it("is all-null for no observations rather than zero", () => {
    expect(spread([])).toEqual({ n: 0, median: null, q1: null, q3: null });
  });
});

describe("summarizeSpeed", () => {
  const run = (over: Partial<RunSpeed> = {}): RunSpeed => ({
    duration_ms: 1000,
    duration_api_ms: 900,
    ttft_ms: 100,
    time_to_request_ms: 50,
    latencies: {},
    mcp_announce_ms: null,
    ...over,
  });

  it("splits by condition and sorts by name", () => {
    const rows = summarizeSpeed([
      { condition: "mempalace", speed: run() },
      { condition: "baseline", speed: run() },
    ]);
    expect(rows.map((r) => r.condition)).toEqual(["baseline", "mempalace"]);
  });

  // Per-call, not per-run: a run that made twelve Reads says more about Read
  // latency than one that made a single call.
  it("pools tool latencies over calls rather than over run medians", () => {
    const [row] = summarizeSpeed([
      { condition: "a", speed: run({ latencies: { Read: [10, 10, 10] } }) },
      { condition: "a", speed: run({ latencies: { Read: [100] } }) },
    ]);
    expect(row!.tools.Read!.n).toBe(4);
    expect(row!.tools.Read!.median).toBe(10);
  });

  it("omits a tool group nobody in the arm ever called", () => {
    const [row] = summarizeSpeed([{ condition: "a", speed: run({ latencies: { Read: [5] } }) }]);
    expect(row!.tools.mempalace_search).toBeUndefined();
    expect(Object.keys(row!.tools)).toEqual(["Read"]);
  });

  it("skips runs missing a session timing instead of counting them as zero", () => {
    const [row] = summarizeSpeed([
      { condition: "a", speed: run({ ttft_ms: 200 }) },
      { condition: "a", speed: run({ ttft_ms: null }) },
    ]);
    expect(row!.runs).toBe(2);
    expect(row!.ttft_ms).toEqual({ n: 1, median: 200, q1: 200, q3: 200 });
  });
});
