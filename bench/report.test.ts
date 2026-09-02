import { describe, expect, it } from "vitest";
import { analyze, subgroup, type RunRow } from "./analyze.js";
import { buildReport, comparisonVerdict } from "./report.js";

function row(over: Partial<RunRow> & Pick<RunRow, "task_id" | "condition">): RunRow {
  const merged: RunRow = {
    run_id: `${over.task_id}__${over.condition}__r1`,
    run_dir: `/tmp/does-not-exist/${over.task_id}__${over.condition}`,
    set: "set1",
    easy: false,
    category: "locate",
    rep: 1,
    uncached_equivalent_all: null,
    uncached_equivalent: 1000,
    total_cost_usd: 1,
    num_turns: 10,
    output_tokens_all: null,
    output_tokens: 100,
    subagents_spawned: 0,
    duration_ms: 1000,
    first_turn_cache_creation: 7000,
    tool_calls: {},
    tool_result_bytes: {},
    read_graph_json: false,
    skill_attributions: 0,
    is_error: false,
    terminal_reason: "completed",
    score: 1,
    success: true,
    ...over,
  };
  if (over.uncached_equivalent_all === undefined) merged.uncached_equivalent_all = merged.uncached_equivalent;
  if (over.output_tokens_all === undefined) merged.output_tokens_all = merged.output_tokens;
  return merged;
}

/** `treat` is reliably 3000 tokens below `base` on every task. */
function rows(): RunRow[] {
  const out: RunRow[] = [];
  for (let i = 1; i <= 8; i++) {
    out.push(row({ task_id: `T${i}`, condition: "base", uncached_equivalent: 10_000 + i * 100, num_turns: 20 }));
    out.push(row({ task_id: `T${i}`, condition: "treat", uncached_equivalent: 7_000 + i * 100, num_turns: 20 }));
  }
  return out;
}

describe("comparisonVerdict", () => {
  it("states the direction and interval when the CI excludes zero", () => {
    const a = analyze(rows(), "s", 400, { comparisons: [{ treatment: "treat", baseline: "base" }] });
    const verdict = comparisonVerdict(a.comparisons![0]!);
    expect(verdict).toContain("`treat` vs `base`");
    expect(verdict).toContain("tokens lower by 3,000");
    expect(verdict).toContain("8 paired tasks");
  });

  it("says 'no detectable difference' rather than naming a direction when the CI crosses zero", () => {
    const a = analyze(rows(), "s", 400, { comparisons: [{ treatment: "treat", baseline: "base" }] });
    const verdict = comparisonVerdict(a.comparisons![0]!);
    // num_turns is identical in both arms here, so its CI must contain zero.
    expect(verdict).toContain("turns no detectable difference");
  });

  it("reports accuracy for both arms side by side", () => {
    const withFailure = rows().map((r) => (r.task_id === "T1" && r.condition === "treat" ? { ...r, success: false } : r));
    const a = analyze(withFailure, "s", 400, { comparisons: [{ treatment: "treat", baseline: "base" }] });
    expect(comparisonVerdict(a.comparisons![0]!)).toContain("accuracy 87.5% vs 100.0% (7/8 vs 8/8)");
  });
});

describe("subgroup", () => {
  it("lists only the arms present in the subset", () => {
    const g = subgroup("structural", rows().filter((r) => r.condition === "treat"), ["base", "treat"], "s", 100);
    expect(g.by_condition.map((c) => c.condition)).toEqual(["treat"]);
  });
});

describe("buildReport", () => {
  it("omits the Phase 6 sections when the analysis carries neither", () => {
    const md = buildReport(analyze(rows(), "s", 100), rows());
    expect(md).not.toContain("Structural comparisons");
    expect(md).not.toContain("Features never exercised");
  });

  it("renders one block per comparison plus the features table when asked", () => {
    const a = analyze(rows(), "s", 100, {
      comparisons: [{ treatment: "treat", baseline: "base" }],
      featureUsage: true,
    });
    const md = buildReport(a, rows());
    expect(md).toContain("Structural comparisons");
    expect(md).toContain("### `treat` vs `base`");
    expect(md).toContain("Features never exercised");
    // The zero columns are the finding, so they must be rendered, not elided.
    expect(md).toContain("`save-result`");
    expect(md).toContain("Cross-session memory was never measured");
  });
});
