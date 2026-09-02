import { describe, expect, it } from "vitest";
import {
  STRICT_DENY_MARKER,
  graphifySubcommands,
  parseFeatureUsage,
  summarizeFeatureUsage,
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
  const usage = (subcommands: Record<string, number>, extra: Partial<{ invocations: number; graph_json_reads: number; strict_denials: number }> = {}) => ({
    subcommands,
    invocations: extra.invocations ?? Object.values(subcommands).reduce((a, b) => a + b, 0),
    graph_json_reads: extra.graph_json_reads ?? 0,
    strict_denials: extra.strict_denials ?? 0,
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
