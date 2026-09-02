import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyze, bootstrapMeanCI, easyTaskIds, median, parseRunSources, quantile, summarizeCondition, type RunRow } from "./analyze.js";
import { enumerateCells } from "./matrix.js";
import { shuffle } from "./lib/rng.js";
import type { Task } from "../tasks/tasks.schema.js";

function row(over: Partial<RunRow> & Pick<RunRow, "task_id" | "condition">): RunRow {
  const merged: RunRow = {
    run_id: `${over.task_id}__${over.condition}__r${over.rep ?? 1}`,
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
  // Default the all-model figures to the main-session ones: a run with no
  // subagent has identical values, which is the common case in these fixtures.
  if (over.uncached_equivalent_all === undefined) merged.uncached_equivalent_all = merged.uncached_equivalent;
  if (over.output_tokens_all === undefined) merged.output_tokens_all = merged.output_tokens;
  return merged;
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

  it("makes uncached_equivalent_all the primary paired metric and keeps main-only as secondary", () => {
    expect(a.paired[0]!.metric).toBe("uncached_equivalent_all");
    expect(a.paired.map((p) => p.metric)).toContain("uncached_equivalent");
  });

  it("separates all-model from main-only when a subagent ran", () => {
    const rows = syntheticRows();
    // one baseline run spawned a subagent: its all-model volume exceeds main-only
    const target = rows.find((r) => r.task_id === "T1" && r.condition === "baseline")!;
    target.subagents_spawned = 1;
    target.uncached_equivalent_all = target.uncached_equivalent! * 3;
    const b = analyze(rows, "fixed-seed", 2000);
    const base = b.by_condition.find((c) => c.condition === "baseline")!;
    expect(base.subagent_runs).toBe(1);
    expect(base.subagents_spawned_total).toBe(1);
    expect(base.t2s!).toBeGreaterThan(base.t2s_main!);
    const allDiff = b.paired.find((p) => p.metric === "uncached_equivalent_all")!;
    const mainDiff = b.paired.find((p) => p.metric === "uncached_equivalent")!;
    // graphify looks relatively cheaper once the baseline's subagent is counted
    expect(allDiff.ci.point!).toBeLessThan(mainDiff.ci.point!);
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

describe("multi-set analysis", () => {
  /** Two sets: `a` where graphify halves tokens, `b` where it does not move. */
  function twoSetRows(): RunRow[] {
    const rows: RunRow[] = [];
    for (const [set, gTokens] of [["a", 500], ["b", 1000]] as const) {
      for (let i = 1; i <= 3; i++) {
        const task_id = `${set}${i}`;
        rows.push(row({ task_id, condition: "baseline", set, uncached_equivalent: 1000 }));
        rows.push(row({ task_id, condition: "graphify", set, uncached_equivalent: gTokens }));
      }
    }
    return rows;
  }

  it("splits by set and keeps each set's own effect", () => {
    const a = analyze(twoSetRows());
    expect(a.by_set.map((g) => g.group)).toEqual(["a", "b"]);
    expect(a.by_set[0]!.n_tasks).toBe(3);
    const aDiff = a.by_set[0]!.paired.find((p) => p.metric === "uncached_equivalent_all")!;
    const bDiff = a.by_set[1]!.paired.find((p) => p.metric === "uncached_equivalent_all")!;
    expect(aDiff.ci.point).toBeCloseTo(-500, 6);
    expect(bDiff.ci.point).toBeCloseTo(0, 6);
  });

  it("omits the per-set breakdown when there is only one set", () => {
    expect(analyze(syntheticRows()).by_set).toEqual([]);
  });

  it("splits easy controls from the rest, and omits the split when nothing is flagged", () => {
    const rows = twoSetRows().map((r) => (r.task_id === "a1" ? { ...r, easy: true } : r));
    const a = analyze(rows);
    expect(a.by_easy.map((g) => g.group)).toEqual(["easy", "rest"]);
    expect(a.by_easy[0]!.tasks).toEqual(["a1"]);
    expect(a.by_easy[1]!.n_tasks).toBe(5);
    expect(analyze(twoSetRows()).by_easy).toEqual([]);
  });
});

describe("run sources and easy flags", () => {
  it("labels an unlabelled runs dir by its parent, with results/runs reading as set1", () => {
    const s = parseRunSources("results/runs,results/ext/runs", "/repo");
    expect(s.map((x) => x.label)).toEqual(["set1", "ext"]);
    expect(s[1]!.dir).toBe("/repo/results/ext/runs");
  });

  it("honours an explicit label=dir and defaults to the results dir when unset", () => {
    expect(parseRunSources("mine=/x/runs", "/repo")[0]).toEqual({ label: "mine", dir: "/x/runs" });
    expect(parseRunSources(undefined, "/repo")).toHaveLength(1);
  });

  it("reads the easy flag from the task notes marker only", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bench-tasks-"));
    const file = path.join(dir, "t.json");
    fs.writeFileSync(
      file,
      JSON.stringify({
        tasks: [
          { id: "E1", notes: "DELIBERATELY EASY (1 of 2). grep finds it." },
          { id: "H1", notes: "Genuinely hard; no single grep reproduces the answer." },
          { id: "N1" },
        ],
      }),
    );
    expect([...easyTaskIds([file], "/repo")]).toEqual(["E1"]);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
