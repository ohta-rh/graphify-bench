import { describe, expect, it } from "vitest";
import {
  STRICT_DENY_MARKER,
  emptyUsage,
  graphifySubcommands,
  parseFeatureUsage,
  summarizeFeatureUsage,
  type FeatureUsage,
} from "./features.js";

describe("graphifySubcommands", () => {
  it("extracts the subcommand from a plain invocation", () => {
    expect(graphifySubcommands('graphify query "who calls X"')).toEqual(["query"]);
    expect(graphifySubcommands("graphify god-nodes --top 5")).toEqual(["god-nodes"]);
    expect(graphifySubcommands("graphify save-result --question q --answer a")).toEqual(["save-result"]);
  });

  it("sees through cd/&&, absolute paths and env prefixes", () => {
    expect(graphifySubcommands("cd /tmp/x && graphify explain Foo")).toEqual(["explain"]);
    expect(graphifySubcommands("/Users/me/.local/bin/graphify affected Bar")).toEqual(["affected"]);
    expect(graphifySubcommands("GRAPHIFY_HOOK_STRICT=1 graphify reflect")).toEqual(["reflect"]);
  });

  it("counts several invocations in one command", () => {
    expect(graphifySubcommands('graphify query "a" | head; graphify path "A" "B"')).toEqual(["query", "path"]);
  });

  it("does NOT count a raw read of the graph as a CLI invocation", () => {
    // This is the counter-productive case the report tracks separately; treating
    // it as a `graphify` call would hide exactly the behaviour we are measuring.
    expect(graphifySubcommands("cat graphify-out/graph.json | head -100")).toEqual([]);
    expect(graphifySubcommands("wc -l graphify-out/GRAPH_REPORT.md")).toEqual([]);
  });

  it("does not mistake a PATH probe for a feature invocation", () => {
    expect(graphifySubcommands('which graphify 2>/dev/null || echo "not in PATH"')).toEqual([]);
  });
});

const line = (content: unknown): string => JSON.stringify({ type: "assistant", message: { content } });

describe("parseFeatureUsage", () => {
  const jsonl = [
    line([{ type: "tool_use", name: "Bash", input: { command: 'graphify query "x"' } }]),
    line([{ type: "tool_use", name: "Bash", input: { command: "graphify explain Foo" } }]),
    line([{ type: "tool_use", name: "Read", input: { file_path: "/w/graphify-out/graph.json" } }]),
    line([{ type: "tool_result", tool_use_id: "t1", content: `${STRICT_DENY_MARKER} run a query first` }]),
  ].join("\n");

  it("counts subcommands, invocations, raw graph reads and strict denials", () => {
    const u = parseFeatureUsage(jsonl);
    expect(u.subcommands).toEqual({ query: 1, explain: 1 });
    expect(u.invocations).toBe(2);
    expect(u.graph_json_reads).toBe(1);
    expect(u.strict_denials).toBe(1);
  });

  it("survives malformed lines and non-tool messages", () => {
    const u = parseFeatureUsage(`not json\n\n${line("plain text")}\n${jsonl}`);
    expect(u.invocations).toBe(2);
  });
});

describe("summarizeFeatureUsage", () => {
  const usage = (
    subcommands: Record<string, number>,
    extra: Partial<{
      invocations: number;
      graph_json_reads: number;
      strict_denials: number;
      mcp_calls: Record<string, number>;
      mempalace_calls: number;
      mcp_result_bytes: number;
    }> = {},
  ) => ({
    ...emptyUsage(),
    subcommands,
    invocations: extra.invocations ?? Object.values(subcommands).reduce((a, b) => a + b, 0),
    graph_json_reads: extra.graph_json_reads ?? 0,
    strict_denials: extra.strict_denials ?? 0,
    mcp_calls: extra.mcp_calls ?? {},
    mempalace_calls: extra.mempalace_calls ?? Object.values(extra.mcp_calls ?? {}).reduce((a, b) => a + b, 0),
    mcp_result_bytes: extra.mcp_result_bytes ?? 0,
  });

  it("reports an explicit zero for every tracked subcommand nobody used", () => {
    const [row] = summarizeFeatureUsage([{ condition: "graphify", usage: usage({ query: 3 }) }]);
    expect(row!.subcommands["query"]).toBe(3);
    // The zeros are the finding, so they must be present rather than absent.
    expect(row!.subcommands["save-result"]).toBe(0);
    expect(row!.subcommands["reflect"]).toBe(0);
    expect(row!.subcommands["affected"]).toBe(0);
  });

  it("counts runs-using separately from total invocations", () => {
    const [row] = summarizeFeatureUsage([
      { condition: "g", usage: usage({ query: 5 }) },
      { condition: "g", usage: usage({ query: 1 }) },
      { condition: "g", usage: usage({}) },
    ]);
    expect(row!.runs).toBe(3);
    expect(row!.subcommands["query"]).toBe(6);
    expect(row!.runs_using["query"]).toBe(2);
    expect(row!.never_invoked_runs).toBe(1);
  });

  it("medians strict denials per run and splits by condition", () => {
    const rows = summarizeFeatureUsage([
      { condition: "graphify-strict", usage: usage({ query: 1 }, { strict_denials: 1 }) },
      { condition: "graphify-strict", usage: usage({ query: 1 }, { strict_denials: 1 }) },
      { condition: "graphify", usage: usage({ query: 1 }, { graph_json_reads: 2 }) },
    ]);
    expect(rows.map((r) => r.condition)).toEqual(["graphify", "graphify-strict"]);
    expect(rows[1]!.strict_denials_total).toBe(2);
    expect(rows[1]!.strict_denials_median).toBe(1);
    expect(rows[0]!.strict_denials_median).toBe(0);
    expect(rows[0]!.graph_json_read_runs).toBe(1);
  });
});

describe("MCP retrieval tracking", () => {
  // The mempalace arms have no CLI to invoke, so the subcommand counters are
  // structurally zero for them. If MCP calls were not counted separately the
  // report would say "the tool was never used" about the arm whose entire
  // treatment is that tool.
  const transcript = (blocks: unknown[]): string =>
    blocks.map((b) => JSON.stringify({ type: "assistant", message: { content: [b] } })).join("\n");

  const call = (id: string, name: string): unknown => ({
    type: "tool_use",
    id,
    name,
    input: { query: "webhook retry" },
  });
  const result = (id: string, text: string): unknown => ({ type: "tool_result", tool_use_id: id, content: text });

  const usageWithMcp = (mcp: Record<string, number>, bytes: number): FeatureUsage => ({
    ...emptyUsage(),
    mcp_calls: mcp,
    mempalace_calls: Object.values(mcp).reduce((a, b) => a + b, 0),
    mcp_result_bytes: bytes,
  });

  it("counts mempalace tool calls by name and totals them", () => {
    const u = parseFeatureUsage(
      transcript([
        call("t1", "mcp__mempalace__mempalace_search"),
        call("t2", "mcp__mempalace__mempalace_search"),
        call("t3", "mcp__mempalace__mempalace_list_wings"),
      ]),
    );
    expect(u.mcp_calls["mcp__mempalace__mempalace_search"]).toBe(2);
    expect(u.mcp_calls["mcp__mempalace__mempalace_list_wings"]).toBe(1);
    expect(u.mempalace_calls).toBe(3);
  });

  it("counts a non-mempalace MCP server without inflating mempalace_calls", () => {
    const u = parseFeatureUsage(transcript([call("t1", "mcp__other__search")]));
    expect(u.mcp_calls["mcp__other__search"]).toBe(1);
    expect(u.mempalace_calls).toBe(0);
  });

  it("attributes returned bytes to the MCP call that asked for them", () => {
    const u = parseFeatureUsage(
      transcript([
        call("t1", "mcp__mempalace__mempalace_search"),
        result("t1", "0123456789"),
        // A Read's result must not be charged to the MCP server.
        { type: "tool_use", id: "t2", name: "Read", input: { file_path: "src/a.ts" } },
        result("t2", "x".repeat(500)),
      ]),
    );
    expect(u.mcp_result_bytes).toBe(10);
  });

  it("leaves every MCP counter empty for a run that used no MCP tool", () => {
    const u = parseFeatureUsage(
      transcript([{ type: "tool_use", id: "t1", name: "Bash", input: { command: 'graphify query "x"' } }]),
    );
    expect(u.mcp_calls).toEqual({});
    expect(u.mempalace_calls).toBe(0);
    expect(u.mcp_result_bytes).toBe(0);
  });

  it("summarizes calls, median-per-run and runs that ignored the nudge", () => {
    const [row] = summarizeFeatureUsage([
      { condition: "mempalace", usage: usageWithMcp({ mcp__mempalace__mempalace_search: 4 }, 100) },
      { condition: "mempalace", usage: usageWithMcp({ mcp__mempalace__mempalace_search: 2 }, 50) },
      // The nudge was ignored: this run is a baseline in everything but name.
      { condition: "mempalace", usage: usageWithMcp({}, 0) },
    ]);
    expect(row!.mempalace_calls_total).toBe(6);
    expect(row!.mempalace_calls_median).toBe(2);
    expect(row!.mempalace_runs_using).toBe(2);
    expect(row!.mempalace_never_called_runs).toBe(1);
    expect(row!.mcp_result_bytes_total).toBe(150);
    expect(row!.mcp_calls["mcp__mempalace__mempalace_search"]).toBe(6);
  });

  it("counts cgr tool calls by name and totals them separately from mempalace_calls", () => {
    const u = parseFeatureUsage(
      transcript([
        call("t1", "mcp__code-graph-rag__semantic_search"),
        call("t2", "mcp__code-graph-rag__semantic_search"),
        call("t3", "mcp__code-graph-rag__structural_search"),
        call("t4", "mcp__mempalace__mempalace_search"),
      ]),
    );
    expect(u.mcp_calls["mcp__code-graph-rag__semantic_search"]).toBe(2);
    expect(u.mcp_calls["mcp__code-graph-rag__structural_search"]).toBe(1);
    expect(u.cgr_calls).toBe(3);
    // The two families are counted independently — a cgr call must not inflate
    // mempalace_calls, and vice versa.
    expect(u.mempalace_calls).toBe(1);
  });

  it("summarizes cgr calls, median-per-run and runs that ignored the nudge", () => {
    const usageWithCgr = (mcp: Record<string, number>, bytes: number): FeatureUsage => ({
      ...emptyUsage(),
      mcp_calls: mcp,
      cgr_calls: Object.values(mcp).reduce((a, b) => a + b, 0),
      mcp_result_bytes: bytes,
    });
    const [row] = summarizeFeatureUsage([
      { condition: "cgr", usage: usageWithCgr({ "mcp__code-graph-rag__semantic_search": 4 }, 100) },
      { condition: "cgr", usage: usageWithCgr({ "mcp__code-graph-rag__semantic_search": 2 }, 50) },
      // The nudge was ignored: this run is a baseline in everything but name.
      { condition: "cgr", usage: usageWithCgr({}, 0) },
    ]);
    expect(row!.cgr_calls_total).toBe(6);
    expect(row!.cgr_calls_median).toBe(2);
    expect(row!.cgr_runs_using).toBe(2);
    expect(row!.cgr_never_called_runs).toBe(1);
    // mempalace's counters stay at their structural zero for a cgr-only row.
    expect(row!.mempalace_calls_total).toBe(0);
  });

  // A pre-MemPalace measurement set has no MCP fields at all, and the report
  // keys its whole MCP section off these staying empty — an aggregate that
  // invented counts there would make every committed report grow a section.
  it("summarizes a graphify-era usage record with no MCP fields at all", () => {
    const legacy = { subcommands: { query: 2 }, invocations: 2, graph_json_reads: 0, strict_denials: 0 };
    const [row] = summarizeFeatureUsage([{ condition: "graphify", usage: legacy as unknown as FeatureUsage }]);
    expect(row!.mcp_calls).toEqual({});
    expect(row!.mempalace_calls_total).toBe(0);
    expect(row!.cgr_calls_total).toBe(0);
    expect(row!.mcp_result_bytes_total).toBe(0);
  });
});
