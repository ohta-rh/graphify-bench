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
    thinking_tokens: null,
    model_tokens: {},
    model_cost: {},
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

describe("headline arm and corpus label", () => {
  /** Rows for three arms so a non-default treatment has something to pair against. */
  function threeArmRows(): RunRow[] {
    const out: RunRow[] = [];
    for (const t of ["T1", "T2", "T3"]) {
      out.push(row({ task_id: t, condition: "baseline", uncached_equivalent: 1000, num_turns: 4 }));
      out.push(row({ task_id: t, condition: "graphify-v2", uncached_equivalent: 1500, num_turns: 9 }));
      out.push(row({ task_id: t, condition: "haiku-baseline", uncached_equivalent: 2000, num_turns: 12 }));
    }
    return out;
  }

  it("pairs the headline sections against the requested arm, not a hardcoded `graphify`", () => {
    const rows = threeArmRows();
    const a = analyze(rows, "s", 20, { treatment: "graphify-v2" });
    expect(a.paired[0]!.treatment_condition).toBe("graphify-v2");
    // 1500 − 1000, over three tasks that all differ by the same amount.
    expect(a.paired.find((p) => p.metric === "uncached_equivalent")!.ci.point).toBeCloseTo(500, 5);
    expect(buildReport(a, rows)).toContain("Paired difference (graphify-v2 − baseline), all tasks");
  });

  it("defaults to `graphify`, which is what keeps the earlier reports reproducible", () => {
    const a = analyze(threeArmRows(), "s", 20, {});
    expect(a.paired[0]!.treatment_condition).toBe("graphify");
    // No `graphify` arm in these rows, so the pairing has nothing to difference.
    expect(a.paired[0]!.ci.point).toBeNull();
  });

  it("names the headline arm from the analysis, so a stored one cannot be mislabelled", () => {
    const rows = threeArmRows();
    const a = analyze(rows, "s", 20, { treatment: "haiku-baseline" });
    expect(buildReport(a, rows)).toContain("Paired difference (haiku-baseline − baseline), all tasks");
  });

  it("prints the stated corpus label, and the docs-layer hash only when it is not v1", () => {
    const rows = threeArmRows();
    const a = analyze(rows, "s", 20, { treatment: "graphify-v2" });
    const v1 = buildReport(a, rows);
    expect(v1).toContain("- Corpus: `corpus-v1`, tree hash (sha256)");
    expect(v1).not.toContain("its addition is the `docs/` layer");
    const v2 = buildReport(a, rows, { corpusLabel: "corpus-v2" });
    expect(v2).toContain("- Corpus: `corpus-v2`, tree hash (sha256)");
    expect(v2).toMatch(/its addition is the `docs\/` layer, hashed the same way: `[0-9a-f]{64}`/);
  });

  it("keeps the quality-by-category table and the cross-set block opt-in", () => {
    const rows = threeArmRows();
    const a = analyze(rows, "s", 20, { treatment: "graphify-v2" });
    expect(buildReport(a, rows)).not.toContain("Answer quality by category");
    expect(buildReport(a, rows)).not.toContain("This set beside the other one");

    const withQuality = buildReport(a, rows, { qualityByCategory: true });
    expect(withQuality).toContain("Answer quality by category");
    // successes/graded · mean score, for the one category these fixtures carry.
    expect(withQuality).toContain("| `graphify-v2` | 3/3 · 1.000 |");

    const withVs = buildReport(a, rows, { vs: { label: "code-45", ownLabel: "docs-20", analysis: a } });
    expect(withVs).toContain("This set beside the other one");
    expect(withVs).toContain("| metric | code-45 (n=3) | docs-20 (n=3) |");
  });

  it("names both arms in the cross-set heading when the two sets tested different ones", () => {
    const rows = threeArmRows();
    const own = analyze(rows, "s", 20, { treatment: "graphify-v2" });
    const other = analyze(rows, "s", 20, { treatment: "haiku-baseline" });
    const md = buildReport(own, rows, { vs: { label: "code-45", ownLabel: "docs-20", analysis: other } });
    expect(md).toContain("### haiku-baseline / graphify-v2 − baseline (headline)");
  });
});

describe("thinking tokens and model mix", () => {
  const rows = (): RunRow[] => [
    row({
      task_id: "T1",
      condition: "baseline",
      output_tokens: 1000,
      thinking_tokens: 400,
      model_tokens: { "claude-sonnet-5": 90_000, "claude-haiku-4-5": 1_000 },
      model_cost: { "claude-sonnet-5": 0.5, "claude-haiku-4-5": 0.001 },
    }),
    row({
      task_id: "T1",
      condition: "effort-low",
      output_tokens: 1000,
      thinking_tokens: 50,
      model_tokens: { "claude-sonnet-5": 40_000, "claude-haiku-4-5": 1_000 },
      model_cost: { "claude-sonnet-5": 0.2, "claude-haiku-4-5": 0.001 },
    }),
  ];

  // Rendered only behind the flag, so every report authored before these arms
  // existed regenerates byte for byte from the same analysis.
  it("stays out of the report unless asked for", () => {
    const rs = rows();
    const a = analyze(rs, "s", 20, { treatment: "effort-low" });
    expect(buildReport(a, rs)).not.toContain("Thinking tokens and model mix");
    expect(buildReport(a, rs, { modelMix: true })).toContain("Thinking tokens and model mix");
  });

  it("states thinking as a share of main-session output, per arm", () => {
    const rs = rows();
    const a = analyze(rs, "s", 20, { treatment: "effort-low" });
    const base = a.by_condition.find((s) => s.condition === "baseline")!;
    const low = a.by_condition.find((s) => s.condition === "effort-low")!;
    expect(base.thinking_tokens_total).toBe(400);
    expect(base.thinking_share).toBeCloseTo(0.4);
    expect(low.thinking_share).toBeCloseTo(0.05);
    const md = buildReport(a, rs, { modelMix: true });
    expect(md).toContain("| `baseline` | 1 | 400 | 1,000 | 40.0% |");
    expect(md).toContain("| `effort-low` | 1 | 50 | 1,000 | 5.0% |");
  });

  it("splits tokens and cost by model so a delegated-to-Haiku arm is auditable", () => {
    const rs = rows();
    const a = analyze(rs, "s", 20, { treatment: "effort-low" });
    expect(a.by_condition.find((s) => s.condition === "baseline")!.model_tokens).toEqual({
      "claude-sonnet-5": 90_000,
      "claude-haiku-4-5": 1_000,
    });
    const md = buildReport(a, rs, { modelMix: true });
    expect(md).toContain("| `baseline` | 1,000 | 90,000 | $0.00 | $0.50 |");
  });

  it("leaves the share null when no run reported a thinking count", () => {
    const rs = [row({ task_id: "T1", condition: "baseline", thinking_tokens: null })];
    const a = analyze(rs, "s", 20);
    expect(a.by_condition[0]!.thinking_share).toBeNull();
    expect(a.by_condition[0]!.thinking_output_tokens).toBe(0);
    expect(buildReport(a, rs, { modelMix: true })).toContain("| `baseline` | 1 | 0 | 0 | – |");
  });
});

describe("token decomposition", () => {
  // 6,000-token fixed prefix × 5 turns = 30,000 fixed; 100,000 total leaves
  // 70,000 moving and a 30% fixed share. Chosen so every cell is checkable by
  // hand — the section's whole value is that a reader can redo the arithmetic.
  const rs = (): RunRow[] => [
    row({
      task_id: "T1",
      condition: "lean",
      uncached_equivalent: 100_000,
      num_turns: 5,
      first_turn_cache_creation: 6_000,
    }),
    row({
      task_id: "T1",
      condition: "fat",
      uncached_equivalent: 100_000,
      num_turns: 10,
      first_turn_cache_creation: 6_000,
    }),
  ];

  it("stays out of the report unless asked for", () => {
    const rows = rs();
    const a = analyze(rows, "s", 20, { treatment: "lean" });
    expect(buildReport(a, rows)).not.toContain("Where the remaining tokens go");
    expect(buildReport(a, rows, { tokenDecomposition: true })).toContain("Where the remaining tokens go");
  });

  it("splits uncached_all into fixed = first-turn × turns and the rest", () => {
    const rows = rs();
    const a = analyze(rows, "s", 20, { treatment: "lean" });
    const md = buildReport(a, rows, { tokenDecomposition: true });
    expect(md).toContain("| `lean` | 1 | 100,000 | 5 | 6,000 | 30,000 | 70,000 | 30.0% |");
    // Same total, twice the turns: the fixed half doubles and the moving half
    // absorbs the difference. That is the whole point of the section — two arms
    // can land on one `uncached_all` for completely different reasons.
    expect(md).toContain("| `fat` | 1 | 100,000 | 10 | 6,000 | 60,000 | 40,000 | 60.0% |");
  });

  it("skips arms whose runs lack the inputs rather than printing a wrong split", () => {
    const rows = [
      row({ task_id: "T1", condition: "lean", uncached_equivalent: 100_000, num_turns: 5, first_turn_cache_creation: 6_000 }),
      row({ task_id: "T1", condition: "unknown", uncached_equivalent: 100_000, num_turns: null, first_turn_cache_creation: null }),
    ];
    const a = analyze(rows, "s", 20, { treatment: "lean" });
    const md = buildReport(a, rows, { tokenDecomposition: true });
    expect(md).toContain("| `lean` |");
    expect(md).not.toMatch(/\| `unknown` \| \d/);
  });
});
