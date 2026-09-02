/**
 * Static validation of the real 15-task set.
 *
 * These are cheap structural checks that run in CI on every change: they catch
 * a key file renamed out from under a task, a rubric that lost an element, a
 * patch whose target spec was not declared, and a prompt that forgot the
 * answer-format reminder the overlay contract depends on. They never invoke
 * `claude -p` and never touch the corpus's node_modules.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseTaskFile, SetKeySchema, type Task } from "../tasks/tasks.schema.js";
import { scoreSet } from "./grade.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TASKS_DIR = path.join(REPO_ROOT, "tasks");
const CORPUS_ROOT = path.join(REPO_ROOT, "corpus", "taskflow");

const parsed = parseTaskFile(
  JSON.parse(fs.readFileSync(path.join(TASKS_DIR, "tasks.json"), "utf8")),
);
const tasks = parsed.tasks;

const CATEGORIES = ["locate", "reference", "explain", "impact", "fix"] as const;

function keyPath(task: Task): string {
  return path.resolve(TASKS_DIR, task.key!);
}

describe("tasks.json shape", () => {
  it("parses against the schema", () => {
    expect(parsed.version).toBe(1);
  });

  it("has 15 real tasks, none of them placeholders", () => {
    expect(tasks).toHaveLength(15);
    expect(tasks.filter((t) => t.placeholder)).toEqual([]);
  });

  it("has exactly 3 tasks per category", () => {
    for (const category of CATEGORIES) {
      expect(tasks.filter((t) => t.category === category)).toHaveLength(3);
    }
  });

  it("pairs each category with its intended grader", () => {
    const expected: Record<string, string> = {
      locate: "set-f1",
      reference: "set-f1",
      impact: "set-f1",
      explain: "llm-judge",
      fix: "vitest",
    };
    for (const task of tasks) {
      expect(task.grader, task.id).toBe(expected[task.category]);
    }
  });

  it("carries a non-empty note on every task", () => {
    for (const task of tasks) {
      expect(task.notes?.length ?? 0, task.id).toBeGreaterThan(20);
    }
  });
});

describe("prompts", () => {
  it("ends every prompt with the category's answer-format reminder", () => {
    for (const task of tasks) {
      const tail = task.prompt.trimEnd().split("\n").at(-1) ?? "";
      if (task.grader === "set-f1") {
        expect(tail, task.id).toContain("`ANSWER:` line");
        expect(tail, task.id).toContain(`\`${task.category}\` task`);
      } else if (task.category === "explain") {
        expect(tail, task.id).toContain("`explain` task");
        expect(tail, task.id).toContain("Do not emit an `ANSWER:` line");
      } else {
        expect(tail, task.id).toContain("`fix` task");
        expect(tail, task.id).toContain("edit the code and stop");
      }
    }
  });

  it("never names a source file in a locate, explain or fix prompt", () => {
    // Those categories must be answerable only by reading the codebase; a path
    // in the prompt would hand the answer over. `reference` and `impact` may
    // name the symbol under study, which is the question itself.
    for (const task of tasks) {
      if (!["locate", "explain", "fix"].includes(task.category)) continue;
      expect(task.prompt, task.id).not.toMatch(/src\/[\w[\]().-]+\//);
      expect(task.prompt, task.id).not.toMatch(/\.tsx?\b/);
    }
  });
});

describe("set-f1 keys", () => {
  const setTasks = tasks.filter((t) => t.grader === "set-f1");

  it("resolves and parses every key file", () => {
    for (const task of setTasks) {
      expect(fs.existsSync(keyPath(task)), `${task.id}: ${task.key}`).toBe(true);
      const key = SetKeySchema.parse(JSON.parse(fs.readFileSync(keyPath(task), "utf8")));
      expect(key.files.length, task.id).toBeGreaterThan(0);
      expect(key.notes?.length ?? 0, `${task.id} must state its inclusion rule`).toBeGreaterThan(40);
    }
  });

  it("lists only paths that exist in the corpus, are unique, sorted and repo-relative", () => {
    for (const task of setTasks) {
      const key = SetKeySchema.parse(JSON.parse(fs.readFileSync(keyPath(task), "utf8")));
      expect(new Set(key.files).size, `${task.id} has duplicates`).toBe(key.files.length);
      expect(key.files, `${task.id} is not sorted`).toEqual([...key.files].sort());
      for (const file of key.files) {
        expect(file.startsWith("/"), `${task.id}: ${file} is absolute`).toBe(false);
        expect(file.startsWith("./"), `${task.id}: ${file} is ./-prefixed`).toBe(false);
        expect(file.startsWith("tests/"), `${task.id}: ${file} is a test`).toBe(false);
        expect(fs.existsSync(path.join(CORPUS_ROOT, file)), `${task.id}: ${file}`).toBe(true);
      }
    }
  });

  it("keeps the locate keys small, per the category definition", () => {
    for (const task of tasks.filter((t) => t.category === "locate")) {
      const key = SetKeySchema.parse(JSON.parse(fs.readFileSync(keyPath(task), "utf8")));
      expect(key.files.length, task.id).toBeLessThanOrEqual(4);
    }
  });
});

describe("llm-judge rubrics", () => {
  it("has a five-element numbered rubric for every explain task", () => {
    for (const task of tasks.filter((t) => t.grader === "llm-judge")) {
      const file = keyPath(task);
      expect(fs.existsSync(file), `${task.id}: ${task.key}`).toBe(true);
      const rubric = fs.readFileSync(file, "utf8");
      const elements = rubric.match(/^\d+\. \*\*/gm) ?? [];
      expect(elements.length, task.id).toBe(5);
      // 0.6 of 5 elements is 3 — the threshold has to be reachable on integers.
      expect(Math.ceil(task.judge_threshold * 5), task.id).toBe(3);
    }
  });
});

describe("fix tasks", () => {
  it("names a spec that exists and a patch that exists", () => {
    for (const task of tasks.filter((t) => t.grader === "vitest")) {
      expect(task.spec, task.id).toBeTruthy();
      expect(task.spec!.startsWith("tests/server/"), `${task.id}: ${task.spec}`).toBe(true);
      expect(fs.existsSync(path.join(CORPUS_ROOT, task.spec!)), task.id).toBe(true);

      expect(task.patch, task.id).toBeTruthy();
      const patchFile = path.resolve(TASKS_DIR, task.patch!);
      expect(fs.existsSync(patchFile), `${task.id}: ${task.patch}`).toBe(true);

      // `git apply -p1` / `patch -p1` need a/ and b/ prefixes and a real hunk.
      const patch = fs.readFileSync(patchFile, "utf8");
      expect(patch, task.id).toMatch(/^diff --git a\/src\/.+ b\/src\/.+$/m);
      expect(patch, task.id).toMatch(/^--- a\/src\//m);
      expect(patch, task.id).toMatch(/^\+\+\+ b\/src\//m);
      expect(patch, task.id).toMatch(/^@@ /m);

      // Every file the patch touches must exist in the pristine corpus.
      for (const m of patch.matchAll(/^\+\+\+ b\/(.+)$/gm)) {
        expect(fs.existsSync(path.join(CORPUS_ROOT, m[1]!)), `${task.id}: ${m[1]}`).toBe(true);
      }
    }
  });
});

describe("grader dry-run against the committed keys", () => {
  const sample = tasks.find((t) => t.id === "REF3-issue-created-subscribers")!;
  const key = SetKeySchema.parse(JSON.parse(fs.readFileSync(keyPath(sample), "utf8")));

  it("scores a perfect answer at 1.0 and counts it a success", () => {
    const answer = `Here is the reasoning.\n\nANSWER: ${key.files.join(", ")}`;
    const score = scoreSet(answer, key.files);
    expect(score.f1).toBe(1);
    expect(score.answerFound).toBe(true);
    expect(score.f1 >= sample.success_threshold).toBe(true);
  });

  it("scores a half answer well below the success threshold", () => {
    const half = key.files.slice(0, Math.ceil(key.files.length / 2));
    const score = scoreSet(`ANSWER: ${half.join(", ")}`, key.files);
    expect(score.f1).toBeLessThan(sample.success_threshold);
    expect(score.f1).toBeGreaterThan(0);
    expect(score.falseNegatives.length).toBe(key.files.length - half.length);
  });

  it("does not reward padding the answer with plausible extra files", () => {
    const padded = [...key.files, "src/lib/event-bus.ts", "src/types/event.ts"];
    const score = scoreSet(`ANSWER: ${padded.join(", ")}`, key.files);
    expect(score.recall).toBe(1);
    expect(score.f1).toBeLessThan(sample.success_threshold);
  });

  it("survives the decoration the overlay tells the agent not to use", () => {
    const decorated = `**ANSWER:** ${key.files.map((f) => `\`./${f}\``).join(", ")}`;
    expect(scoreSet(decorated, key.files).f1).toBe(1);
  });

  it("scores 0 when the agent never emits an ANSWER line", () => {
    const score = scoreSet("I looked at several files but could not decide.", key.files);
    expect(score.answerFound).toBe(false);
    expect(score.f1).toBe(0);
  });

  it("would fail a locate task that returns the whole plausible neighbourhood", () => {
    const loc = tasks.find((t) => t.id === "LOC3-digest-window")!;
    const locKey = SetKeySchema.parse(JSON.parse(fs.readFileSync(keyPath(loc), "utf8")));
    // The cron route is the distractor the key deliberately excludes.
    const withDistractor = [...locKey.files, "src/app/api/cron/digest/route.ts"];
    const score = scoreSet(`ANSWER: ${withDistractor.join(", ")}`, locKey.files);
    expect(score.f1).toBeLessThan(loc.success_threshold);
  });
});
