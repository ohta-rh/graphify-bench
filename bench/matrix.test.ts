import path from "node:path";
import { describe, expect, it } from "vitest";
import { enumerateCells, parseCli } from "./matrix.js";
import { REPO_ROOT } from "./lib/env.js";
import type { Task } from "../tasks/tasks.schema.js";

const task = (id: string): Task => ({ id, category: "LOC", prompt: "p", grader: "set-f1" }) as unknown as Task;

describe("parseCli --tasks", () => {
  it("defaults to the single set-1 task file", () => {
    expect(parseCli([]).tasksFiles).toEqual([path.join(REPO_ROOT, "tasks/tasks.json")]);
  });

  it("accepts a comma-separated list so both sets run in one matrix", () => {
    expect(parseCli(["--tasks", "tasks/tasks.json,tasks/tasks-ext.json"]).tasksFiles).toEqual([
      path.join(REPO_ROOT, "tasks/tasks.json"),
      path.join(REPO_ROOT, "tasks/tasks-ext.json"),
    ]);
  });

  it("tolerates whitespace and empty entries in the list", () => {
    expect(parseCli(["--tasks", " tasks/tasks.json , ,tasks/tasks-ext.json "]).tasksFiles).toHaveLength(2);
  });
});

describe("parseCli --conditions", () => {
  it("still defaults to the original two arms", () => {
    expect(parseCli([]).conditions).toEqual(["baseline", "graphify"]);
  });

  it("carries the structural arms through verbatim", () => {
    expect(
      parseCli(["--conditions", "graphify-strict,baseline-nosub,haiku-baseline,haiku-graphify"]).conditions,
    ).toEqual(["graphify-strict", "baseline-nosub", "haiku-baseline", "haiku-graphify"]);
  });
});

describe("enumerateCells", () => {
  it("produces task × condition × rep and nothing else", () => {
    const cells = enumerateCells([task("A"), task("B")], ["baseline", "haiku-graphify"], 1, "seed");
    expect(cells).toHaveLength(4);
    expect(new Set(cells.map((c) => c.id))).toEqual(
      new Set(["A__baseline__r1", "A__haiku-graphify__r1", "B__baseline__r1", "B__haiku-graphify__r1"]),
    );
  });

  it("is deterministic for a given seed", () => {
    const a = enumerateCells([task("A"), task("B"), task("C")], ["x", "y"], 1, "s");
    const b = enumerateCells([task("A"), task("B"), task("C")], ["x", "y"], 1, "s");
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
  });
});
