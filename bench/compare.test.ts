import { describe, expect, it } from "vitest";
import { analyze, compare, comparisonName, isoAccuracyTasks, parseComparisons, resolveCli, type RunRow } from "./analyze.js";

function row(over: Partial<RunRow> & Pick<RunRow, "task_id" | "condition">): RunRow {
  const merged: RunRow = {
    run_id: `${over.task_id}__${over.condition}__r1`,
    run_dir: `/tmp/runs/${over.task_id}__${over.condition}`,
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

/** Three arms: `treat` is 20% below `base`; `other` is 50% above it. */
function threeArmRows(): RunRow[] {
  const rows: RunRow[] = [];
  for (let i = 1; i <= 6; i++) {
    const base = 10_000 + i * 1000;
    rows.push(row({ task_id: `T${i}`, condition: "base", uncached_equivalent: base, num_turns: 20 }));
    rows.push(row({ task_id: `T${i}`, condition: "treat", uncached_equivalent: base * 0.8, num_turns: 16 }));
    rows.push(row({ task_id: `T${i}`, condition: "other", uncached_equivalent: base * 1.5, num_turns: 30 }));
  }
  return rows;
}

describe("compare", () => {
  it("signs the difference as treatment − baseline", () => {
    const c = compare(threeArmRows(), { treatment: "treat", baseline: "base" }, "s", 200);
    const primary = c.paired.find((p) => p.metric === "uncached_equivalent_all")!;
    expect(primary.ci.point).toBeLessThan(0);
    expect(primary.baseline_condition).toBe("base");
    expect(primary.treatment_condition).toBe("treat");
    const flipped = compare(threeArmRows(), { treatment: "base", baseline: "treat" }, "s", 200);
    expect(flipped.paired.find((p) => p.metric === "uncached_equivalent_all")!.ci.point).toBeGreaterThan(0);
  });

  it("ignores rows belonging to arms outside the pair", () => {
    // `other` sits 50% ABOVE base; if it leaked in, the difference would move.
    const withOther = compare(threeArmRows(), { treatment: "treat", baseline: "base" }, "s", 200);
    const withoutOther = compare(
      threeArmRows().filter((r) => r.condition !== "other"),
      { treatment: "treat", baseline: "base" },
      "s",
      200,
    );
    expect(withOther.paired.map((p) => p.ci.point)).toEqual(withoutOther.paired.map((p) => p.ci.point));
    expect(withOther.by_condition.map((s) => s.condition)).toEqual(["base", "treat"]);
    expect(withOther.n_tasks).toBe(6);
  });

  it("scopes the iso-accuracy subset to the two arms being compared", () => {
    const rows = threeArmRows().map((r) =>
      r.task_id === "T1" && r.condition === "other" ? { ...r, success: false } : r,
    );
    expect(compare(rows, { treatment: "treat", baseline: "base" }, "s", 200).iso_accuracy_tasks).toHaveLength(6);
    expect(compare(rows, { treatment: "other", baseline: "base" }, "s", 200).iso_accuracy_tasks).toHaveLength(5);
  });

  it("breaks down by category using only the paired arms", () => {
    const rows = threeArmRows().map((r) => (r.task_id === "T6" ? { ...r, category: "explain" } : r));
    const c = compare(rows, { treatment: "treat", baseline: "base" }, "s", 200);
    expect(c.by_category.map((x) => x.category)).toEqual(["explain", "locate"]);
    expect(c.by_category.find((x) => x.category === "explain")!.tasks).toEqual(["T6"]);
  });

  it("names the comparison after its two arms", () => {
    expect(comparisonName({ treatment: "haiku-graphify", baseline: "haiku-baseline" })).toBe(
      "haiku-graphify vs haiku-baseline",
    );
  });
});

describe("isoAccuracyTasks", () => {
  it("keeps only tasks graded and fully successful in both named arms", () => {
    const rows = [
      row({ task_id: "A", condition: "x" }),
      row({ task_id: "A", condition: "y" }),
      row({ task_id: "B", condition: "x", success: false }),
      row({ task_id: "B", condition: "y" }),
      row({ task_id: "C", condition: "x", success: null }),
      row({ task_id: "C", condition: "y" }),
      row({ task_id: "D", condition: "x" }), // no `y` run at all
    ];
    expect(isoAccuracyTasks(rows, "x", "y")).toEqual(["A"]);
  });
});

describe("analyze options", () => {
  it("omits comparisons and feature usage unless asked, keeping older analyses reproducible", () => {
    const plain = analyze(threeArmRows(), "s", 100);
    expect(plain.comparisons).toBeUndefined();
    expect(plain.feature_usage).toBeUndefined();
    expect(Object.keys(plain)).not.toContain("comparisons");
  });

  it("adds one comparison block per requested pair", () => {
    const a = analyze(threeArmRows(), "s", 100, {
      comparisons: [
        { treatment: "treat", baseline: "base" },
        { treatment: "other", baseline: "base" },
      ],
    });
    expect(a.comparisons!.map((c) => c.name)).toEqual(["treat vs base", "other vs base"]);
  });

  it("leaves the headline graphify−baseline pair untouched", () => {
    const rows = [
      ...threeArmRows(),
      row({ task_id: "T1", condition: "baseline", uncached_equivalent: 5000 }),
      row({ task_id: "T1", condition: "graphify", uncached_equivalent: 4000 }),
    ];
    const a = analyze(rows, "s", 100, { comparisons: [{ treatment: "treat", baseline: "base" }] });
    const headline = a.paired.find((p) => p.metric === "uncached_equivalent_all")!;
    expect(headline.baseline_condition).toBe("baseline");
    expect(headline.treatment_condition).toBe("graphify");
    expect(headline.ci.point).toBe(-1000);
  });
});

describe("parseComparisons", () => {
  it("parses treatment:baseline entries in order", () => {
    expect(parseComparisons("a:b,c:d")).toEqual([
      { treatment: "a", baseline: "b" },
      { treatment: "c", baseline: "d" },
    ]);
  });

  it("returns nothing for an absent or empty flag", () => {
    expect(parseComparisons(undefined)).toEqual([]);
    expect(parseComparisons("  ")).toEqual([]);
  });

  it("fails loudly on a malformed entry rather than silently dropping a comparison", () => {
    expect(() => parseComparisons("a")).toThrow(/treatment:baseline/);
    expect(() => parseComparisons("a:")).toThrow(/treatment:baseline/);
    expect(() => parseComparisons("a:b:c")).toThrow(/treatment:baseline/);
  });
});

describe("compare over arms with different task coverage", () => {
  /**
   * The MemPalace report pools measurement sets: `baseline` ran all 6 tasks,
   * `narrow` only the first 3. Before this was handled, `n_tasks` announced the
   * union while the paired CI was computed from the intersection, because
   * `pairByTask` drops a task one arm never ran.
   */
  function unevenRows(): RunRow[] {
    const rows: RunRow[] = [];
    for (let i = 1; i <= 6; i++) {
      const base = 10_000 + i * 1000;
      rows.push(row({ task_id: `T${i}`, condition: "base", uncached_equivalent: base }));
      if (i <= 3) rows.push(row({ task_id: `T${i}`, condition: "narrow", uncached_equivalent: base * 0.5 }));
    }
    return rows;
  }

  it("counts only the tasks both arms ran", () => {
    const c = compare(unevenRows(), { treatment: "narrow", baseline: "base" }, "s", 200);
    expect(c.n_tasks).toBe(3);
  });

  it("makes n_tasks agree with the paired interval's own n", () => {
    const c = compare(unevenRows(), { treatment: "narrow", baseline: "base" }, "s", 200);
    for (const p of c.paired) expect(p.ci.n).toBe(c.n_tasks);
  });

  it("summarizes each arm over the shared tasks only", () => {
    const c = compare(unevenRows(), { treatment: "narrow", baseline: "base" }, "s", 200);
    // Without the intersection, `base` would report 6 runs against `narrow`'s 3
    // and its median would be drawn from tasks the treatment never attempted.
    expect(c.by_condition.find((s) => s.condition === "base")!.runs).toBe(3);
    expect(c.by_condition.find((s) => s.condition === "narrow")!.runs).toBe(3);
  });

  it("leaves an evenly-covered pair exactly as it was", () => {
    // Every already-committed report is this case, so it must not move.
    const c = compare(threeArmRows(), { treatment: "treat", baseline: "base" }, "s", 200);
    expect(c.n_tasks).toBe(6);
    expect(c.by_condition.find((s) => s.condition === "base")!.runs).toBe(6);
  });

  it("yields an empty comparison when the arms share no task at all", () => {
    const rows = [
      row({ task_id: "A", condition: "base" }),
      row({ task_id: "B", condition: "narrow" }),
    ];
    const c = compare(rows, { treatment: "narrow", baseline: "base" }, "s", 200);
    expect(c.n_tasks).toBe(0);
    expect(c.paired[0]!.ci.n).toBe(0);
  });
});

describe("resolveCli", () => {
  it("threads --compare and --feature-usage through", () => {
    const cli = resolveCli(["--compare", "x:y", "--feature-usage"]);
    expect(cli.comparisons).toEqual([{ treatment: "x", baseline: "y" }]);
    expect(cli.featureUsage).toBe(true);
  });

  it("defaults to neither", () => {
    const cli = resolveCli([]);
    expect(cli.comparisons).toEqual([]);
    expect(cli.featureUsage).toBe(false);
  });
});
