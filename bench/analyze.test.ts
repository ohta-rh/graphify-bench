import { describe, expect, it } from "vitest";
import { analyze, bootstrapMeanCI, median, quantile, summarizeCondition, type RunRow } from "./analyze.js";
import { enumerateCells } from "./matrix.js";
import { shuffle } from "./lib/rng.js";
import type { Task } from "../tasks/tasks.schema.js";

function row(over: Partial<RunRow> & Pick<RunRow, "task_id" | "condition">): RunRow {
  return {
    run_id: `${over.task_id}__${over.condition}__r${over.rep ?? 1}`,
    category: "locate",
    rep: 1,
    uncached_equivalent: 1000,
    total_cost_usd: 1,
    num_turns: 10,
    output_tokens: 100,
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
}

/** Synthetic: graphify uses 20% fewer tokens on every task. */
function syntheticRows(): RunRow[] {
  const rows: RunRow[] = [];
  for (let i = 1; i <= 6; i++) {
    const base = 10_000 + i * 1000;
    rows.push(row({ task_id: `T${i}`, condition: "baseline", uncached_equivalent: base, total_cost_usd: base / 10_000, num_turns: 20 }));
    rows.push(row({ task_id: `T${i}`, condition: "graphify", uncached_equivalent: base * 0.8, total_cost_usd: (base * 0.8) / 10_000, num_turns: 16 }));
  }
  return rows;
}

describe("descriptive statistics", () => {
  it("computes median for odd and even lengths", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBeNull();
  });

  it("computes quantiles by linear interpolation", () => {
    expect(quantile([1, 2, 3, 4, 5], 0.25)).toBe(2);
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
  });
});

describe("bootstrapMeanCI", () => {
  it("is reproducible for a fixed seed", () => {
    const xs = [-3, -1, -4, -1, -5, -9, -2, -6];
    const a = bootstrapMeanCI(xs, 2000, "seed-A");
    const b = bootstrapMeanCI(xs, 2000, "seed-A");
    expect(a).toEqual(b);
  });

  it("changes with the seed but stays near the point estimate", () => {
    const xs = [-3, -1, -4, -1, -5, -9, -2, -6];
    const a = bootstrapMeanCI(xs, 2000, "seed-A");
    const b = bootstrapMeanCI(xs, 2000, "seed-B");
    expect(a.lo).not.toBe(b.lo);
    expect(a.point).toBe(b.point);
    expect(a.lo!).toBeLessThanOrEqual(a.point!);
    expect(a.hi!).toBeGreaterThanOrEqual(a.point!);
  });

  it("flags an interval that straddles zero", () => {
    const noise = bootstrapMeanCI([-5, 5, -4, 4, -3, 3, -2, 2], 2000, "seed-zero");
    expect(noise.crossesZero).toBe(true);
    const clear = bootstrapMeanCI([-10, -11, -9, -12, -10, -11], 2000, "seed-clear");
    expect(clear.crossesZero).toBe(false);
    expect(clear.hi!).toBeLessThan(0);
  });

  it("refuses to invent an interval from fewer than two points", () => {
    const one = bootstrapMeanCI([5], 2000, "s");
    expect(one.point).toBe(5);
    expect(one.lo).toBeNull();
    expect(one.crossesZero).toBeNull();
  });
});

describe("analyze", () => {
  const a = analyze(syntheticRows(), "fixed-seed", 2000);

  it("recovers the injected 20% reduction with a CI clear of zero", () => {
    const tokens = a.paired.find((p) => p.metric === "uncached_equivalent")!;
    expect(tokens.perTask).toHaveLength(6);
    expect(tokens.ci.point).toBeLessThan(0);
    expect(tokens.ci.crossesZero).toBe(false);
    expect(tokens.relativeCi.point).toBeCloseTo(-0.2, 6);
  });

  it("is deterministic for a fixed seed", () => {
    const b = analyze(syntheticRows(), "fixed-seed", 2000);
    expect(a.paired).toEqual(b.paired);
  });

  it("summarizes per condition with median/IQR, accuracy and T2S", () => {
    const baseline = a.by_condition.find((c) => c.condition === "baseline")!;
    expect(baseline.runs).toBe(6);
    expect(baseline.accuracy).toBe(1);
    // every run succeeded, so T2S is the mean of all runs' tokens
    expect(baseline.t2s).toBeCloseTo((11000 + 12000 + 13000 + 14000 + 15000 + 16000) / 6, 6);
    expect(baseline.metrics.uncached_equivalent!.median).toBe(13500);
    expect(baseline.metrics.uncached_equivalent!.q1).toBe(12250);
  });

  it("puts every fully-successful task in the iso-accuracy subset", () => {
    expect(a.iso_accuracy_tasks).toHaveLength(6);
  });

  it("drops a task from iso-accuracy when one arm failed it", () => {
    const rows = syntheticRows();
    const target = rows.find((r) => r.task_id === "T3" && r.condition === "graphify")!;
    target.success = false;
    const b = analyze(rows, "fixed-seed", 2000);
    expect(b.iso_accuracy_tasks).not.toContain("T3");
    expect(b.iso_accuracy_tasks).toHaveLength(5);
    expect(b.by_condition.find((c) => c.condition === "graphify")!.accuracy).toBeCloseTo(5 / 6, 6);
  });

  it("counts counter-productive behaviour", () => {
    const rows = syntheticRows();
    rows.find((r) => r.task_id === "T1" && r.condition === "graphify")!.read_graph_json = true;
    rows.find((r) => r.task_id === "T2" && r.condition === "graphify")!.tool_calls = { "Bash(graphify)": 2 };
    const b = analyze(rows, "fixed-seed", 2000);
    expect(b.counter_productive.read_graph_json).toEqual(["T1__graphify__r1"]);
    // every graphify run except T2 never invoked the CLI
    expect(b.counter_productive.graphify_never_invoked).toHaveLength(5);
  });

  it("reports accuracy as null when nothing was graded", () => {
    const rows = syntheticRows().map((r) => ({ ...r, success: null, score: null }));
    const s = summarizeCondition("baseline", rows);
    expect(s.accuracy).toBeNull();
    expect(s.t2s).toBeNull();
  });
});

describe("matrix enumeration", () => {
  const tasks = ["A", "B", "C"].map(
    (id) => ({ id, category: "locate", prompt: "p", grader: "set-f1", key: `keys/${id}.json`, success_threshold: 0.9, judge_threshold: 0.6, placeholder: false }) as Task,
  );

  it("enumerates task x condition x rep", () => {
    const cells = enumerateCells(tasks, ["baseline", "graphify"], 2, "s");
    expect(cells).toHaveLength(12);
    expect(new Set(cells.map((c) => c.id)).size).toBe(12);
    expect(cells.some((c) => c.id === "A__graphify__r2")).toBe(true);
  });

  it("shuffles deterministically for a seed, and differently for another", () => {
    const a = enumerateCells(tasks, ["baseline", "graphify"], 2, "seed-1").map((c) => c.id);
    const b = enumerateCells(tasks, ["baseline", "graphify"], 2, "seed-1").map((c) => c.id);
    const c = enumerateCells(tasks, ["baseline", "graphify"], 2, "seed-2").map((c) => c.id);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect([...a].sort()).toEqual([...c].sort());
  });

  it("shuffle preserves the multiset", () => {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8];
    expect([...shuffle(xs, "k")].sort((p, q) => p - q)).toEqual(xs);
  });
});
