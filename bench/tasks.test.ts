/**
 * Static validation of the two real task sets: `tasks.json` (15) and
 * `tasks-ext.json` (30).
 *
 * These are cheap structural checks that run in CI on every change: they catch
 * a key file renamed out from under a task, a rubric that lost an element, a
 * patch whose target spec was not declared, and a prompt that forgot the
 * answer-format reminder the overlay contract depends on. They never invoke
 * `claude -p` and never touch the corpus's node_modules.
 *
 * The cross-file block at the bottom is what keeps the two sets combinable
 * into one 45-task analysis: ids must be unique across both files, and no
 * ext task may re-ask a question the first set already asked.
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

/** The five categories the code-only sets (`tasks.json`, `tasks-ext.json`) use. */
const CATEGORIES = ["locate", "reference", "explain", "impact", "fix"] as const;

/**
 * The doc<->code set replaces `fix` with `discrepancy`: patching a bug is a
 * code-only question, and the thing the documentation layer makes newly
 * askable is "where does the prose disagree with the implementation".
 */
const DOC_CATEGORIES = ["locate", "reference", "explain", "impact", "discrepancy"] as const;

/** Spec directories a `fix` task may target. */
const SPEC_PREFIXES = ["tests/server/", "tests/lib/", "tests/contract/", "tests/services/"];

function loadTasks(file: string): Task[] {
  return parseTaskFile(JSON.parse(fs.readFileSync(path.join(TASKS_DIR, file), "utf8"))).tasks;
}

function keyPath(task: Task): string {
  return path.resolve(TASKS_DIR, task.key!);
}

function readKey(task: Task): { files: string[]; notes?: string } {
  return SetKeySchema.parse(JSON.parse(fs.readFileSync(keyPath(task), "utf8")));
}

function patchedFiles(task: Task): string[] {
  const patch = fs.readFileSync(path.resolve(TASKS_DIR, task.patch!), "utf8");
  return [...patch.matchAll(/^\+\+\+ b\/(.+)$/gm)].map((m) => m[1]!);
}

const SETS = [
  { file: "tasks.json", label: "tasks.json", size: 15, perCategory: 3 },
  { file: "tasks-ext.json", label: "tasks-ext.json", size: 30, perCategory: 6 },
] as const;

for (const set of SETS) {
  const tasks = loadTasks(set.file);

  describe(`${set.label} shape`, () => {
    it(`has ${set.size} real tasks, none of them placeholders`, () => {
      expect(tasks).toHaveLength(set.size);
      expect(tasks.filter((t) => t.placeholder)).toEqual([]);
    });

    it(`has exactly ${set.perCategory} tasks per category`, () => {
      for (const category of CATEGORIES) {
        expect(tasks.filter((t) => t.category === category), category).toHaveLength(
          set.perCategory,
        );
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

  describe(`${set.label} prompts`, () => {
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

  describe(`${set.label} set-f1 keys`, () => {
    const setTasks = tasks.filter((t) => t.grader === "set-f1");

    it("resolves and parses every key file", () => {
      for (const task of setTasks) {
        expect(fs.existsSync(keyPath(task)), `${task.id}: ${task.key}`).toBe(true);
        const key = readKey(task);
        expect(key.files.length, task.id).toBeGreaterThan(0);
        expect(key.notes?.length ?? 0, `${task.id} must state its inclusion rule`).toBeGreaterThan(
          40,
        );
      }
    });

    it("lists only paths that exist in the corpus, are unique, sorted and repo-relative", () => {
      for (const task of setTasks) {
        const key = readKey(task);
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
        expect(readKey(task).files.length, task.id).toBeLessThanOrEqual(4);
      }
    });
  });

  describe(`${set.label} llm-judge rubrics`, () => {
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

  describe(`${set.label} fix tasks`, () => {
    it("names a spec that exists and a patch that exists", () => {
      for (const task of tasks.filter((t) => t.grader === "vitest")) {
        expect(task.spec, task.id).toBeTruthy();
        expect(
          SPEC_PREFIXES.some((prefix) => task.spec!.startsWith(prefix)),
          `${task.id}: ${task.spec}`,
        ).toBe(true);
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
        for (const file of patchedFiles(task)) {
          expect(fs.existsSync(path.join(CORPUS_ROOT, file)), `${task.id}: ${file}`).toBe(true);
        }
      }
    });
  });
}

// ---------------------------------------------------------------------------
// tasks-docs.json — the doc<->code set over the corpus-v2 documentation layer
// ---------------------------------------------------------------------------

describe("tasks-docs.json", () => {
  const tasks = loadTasks("tasks-docs.json");
  const setTasks = tasks.filter((t) => t.grader === "set-f1");

  it("has 20 real tasks, none of them placeholders", () => {
    expect(tasks).toHaveLength(20);
    expect(tasks.filter((t) => t.placeholder)).toEqual([]);
  });

  it("has exactly 4 tasks per category, over the doc category set", () => {
    for (const category of DOC_CATEGORIES) {
      expect(tasks.filter((t) => t.category === category), category).toHaveLength(4);
    }
    // No `fix` task: this set never patches the corpus.
    expect(tasks.filter((t) => t.category === "fix")).toEqual([]);
  });

  it("pairs each category with its intended grader", () => {
    const expected: Record<string, string> = {
      locate: "set-f1",
      reference: "set-f1",
      impact: "set-f1",
      discrepancy: "set-f1",
      explain: "llm-judge",
    };
    for (const task of tasks) {
      expect(task.grader, task.id).toBe(expected[task.category]);
    }
    // `discrepancy` reuses set-f1 unchanged; grade.ts knows nothing about it.
    expect(tasks.filter((t) => t.grader === "vitest")).toEqual([]);
  });

  it("carries a non-empty note on every task", () => {
    for (const task of tasks) {
      expect(task.notes?.length ?? 0, task.id).toBeGreaterThan(20);
    }
  });

  it("ends every prompt with the category's answer-format reminder", () => {
    for (const task of tasks) {
      const tail = task.prompt.trimEnd().split("\n").at(-1) ?? "";
      if (task.grader === "set-f1") {
        expect(tail, task.id).toContain("`ANSWER:` line");
        expect(tail, task.id).toContain(`\`${task.category}\` task`);
      } else {
        expect(tail, task.id).toContain("`explain` task");
        expect(tail, task.id).toContain("Do not emit an `ANSWER:` line");
      }
    }
  });

  it("makes the discrepancy contract self-contained", () => {
    // `discrepancy` is not one of the categories the overlay CLAUDE.md names, and
    // the baseline overlay must stay byte-identical across corpus generations, so
    // the prompt itself has to spell the format out by pointing at the categories
    // CLAUDE.md does describe.
    for (const task of tasks.filter((t) => t.category === "discrepancy")) {
      const tail = task.prompt.trimEnd().split("\n").at(-1) ?? "";
      expect(tail, task.id).toContain("comma-separated");
      expect(tail, task.id).toMatch(/`locate`, `reference` and `impact`/);
    }
  });

  it("leaks no path and no id in a locate or discrepancy prompt", () => {
    // These two categories must be answerable only by reading the corpus. A
    // document path, a source path, or a bare REQ/DES/ADR id in the prompt
    // would hand the answer over — `reference` and `impact` may name the thing
    // under study, which is the question itself.
    for (const task of tasks) {
      if (!["locate", "discrepancy", "explain"].includes(task.category)) continue;
      // The trailing answer-format reminder cites CLAUDE.md by name; only the
      // question body is checked.
      const body = task.prompt.trimEnd().split("\n").slice(0, -1).join("\n");
      expect(body, task.id).not.toMatch(/docs\/[\w.-]+\//);
      expect(body, task.id).not.toMatch(/src\/[\w[\]().-]+\//);
      expect(body, task.id).not.toMatch(/\.(md|tsx?)\b/);
      expect(body, task.id).not.toMatch(/\b(REQ|DES|ADR)-\d{3}\b/);
    }
  });

  it("resolves and parses every key file, and answers with documents", () => {
    for (const task of setTasks) {
      expect(fs.existsSync(keyPath(task)), `${task.id}: ${task.key}`).toBe(true);
      const key = readKey(task);
      expect(key.files.length, task.id).toBeGreaterThan(0);
      expect(key.notes?.length ?? 0, `${task.id} must state its inclusion rule`).toBeGreaterThan(40);
      expect(new Set(key.files).size, `${task.id} has duplicates`).toBe(key.files.length);
      expect(key.files, `${task.id} is not sorted`).toEqual([...key.files].sort());
      for (const file of key.files) {
        expect(file.startsWith("/"), `${task.id}: ${file} is absolute`).toBe(false);
        expect(file.startsWith("./"), `${task.id}: ${file} is ./-prefixed`).toBe(false);
        expect(file.startsWith("tests/"), `${task.id}: ${file} is a test`).toBe(false);
        expect(fs.existsSync(path.join(CORPUS_ROOT, file)), `${task.id}: ${file}`).toBe(true);
      }
      // Every category here except `impact` answers with documents only.
      if (task.category !== "impact") {
        for (const file of key.files) {
          expect(file.startsWith("docs/"), `${task.id}: ${file} is not a document`).toBe(true);
        }
      }
    }
  });

  it("never puts an aggregator document in a key", () => {
    // traceability.md is generated from the whole corpus and the index pages
    // and glossary cite it wholesale; including them would make every doc key
    // contain the same files regardless of the question.
    for (const task of setTasks) {
      for (const file of readKey(task).files) {
        expect(path.basename(file), `${task.id}: ${file}`).not.toBe("index.md");
        expect(file, task.id).not.toBe("docs/traceability.md");
        expect(file, task.id).not.toBe("docs/glossary.md");
      }
    }
  });

  it("keeps the locate keys small, per the category definition", () => {
    for (const task of tasks.filter((t) => t.category === "locate")) {
      expect(readKey(task).files.length, task.id).toBeLessThanOrEqual(4);
    }
  });

  it("spans documents AND code in every impact key but the declared control", () => {
    for (const task of tasks.filter((t) => t.category === "impact")) {
      const files = readKey(task).files;
      const docs = files.filter((f) => f.startsWith("docs/"));
      expect(docs.length, `${task.id} has no document side`).toBeGreaterThan(0);
      const code = files.filter((f) => !f.startsWith("docs/"));
      if ((task.notes ?? "").includes("Document-only by construction")) {
        expect(code, task.id).toEqual([]);
      } else {
        expect(code.length, `${task.id} has no code side`).toBeGreaterThan(0);
      }
    }
  });

  it("scores discrepancy tasks on a threshold that grants partial credit", () => {
    // Finding two of three planted contradictions is a genuinely useful result.
    // 0.9 would score it a failure; 0.6 does not.
    for (const task of tasks.filter((t) => t.category === "discrepancy")) {
      expect(task.success_threshold, task.id).toBe(0.6);
    }
  });

  it("covers all twelve planted discrepancies exactly once across the four domains", () => {
    const record = JSON.parse(
      fs.readFileSync(path.join(TASKS_DIR, "keys", "docs-discrepancies.json"), "utf8"),
    ) as { count: number; discrepancies: Array<{ doc_path: string }> };
    const planted = new Set(
      record.discrepancies.map((d) => d.doc_path.replace(/^corpus\/taskflow\//, "")),
    );
    const covered = tasks
      .filter((t) => t.category === "discrepancy")
      .flatMap((t) => readKey(t).files);
    // Two planted entries share a document, so the union is smaller than 12.
    expect(new Set(covered)).toEqual(planted);
    expect(covered.length, "a document is claimed by two domains").toBe(new Set(covered).size);
  });

  it("has a five-element numbered rubric for every explain task", () => {
    for (const task of tasks.filter((t) => t.grader === "llm-judge")) {
      const file = keyPath(task);
      expect(fs.existsSync(file), `${task.id}: ${task.key}`).toBe(true);
      const rubric = fs.readFileSync(file, "utf8");
      expect((rubric.match(/^\d+\. \*\*/gm) ?? []).length, task.id).toBe(5);
      expect(Math.ceil(task.judge_threshold * 5), task.id).toBe(3);
    }
  });

  it("marks exactly two grep-trivial controls", () => {
    const easy = tasks.filter((t) => (t.notes ?? "").includes("DELIBERATELY EASY"));
    expect(easy.map((t) => t.id).sort()).toEqual([
      "DIMP4-req157-renumber",
      "DREF4-adr017-references",
    ]);
  });
});

// ---------------------------------------------------------------------------
// cross-file: the two sets have to combine into one 45-task analysis
// ---------------------------------------------------------------------------

describe("tasks.json + tasks-ext.json combined", () => {
  const base = loadTasks("tasks.json");
  const ext = loadTasks("tasks-ext.json");
  const all = [...base, ...ext];

  it("has 45 tasks with globally unique ids", () => {
    expect(all).toHaveLength(45);
    expect(new Set(all.map((t) => t.id)).size).toBe(45);
  });

  it("has 9 tasks per category across both files", () => {
    for (const category of CATEGORIES) {
      expect(all.filter((t) => t.category === category), category).toHaveLength(9);
    }
  });

  it("gives every task its own key or spec file", () => {
    const keys = all.filter((t) => t.key).map((t) => t.key!);
    expect(new Set(keys).size, "two tasks share a key file").toBe(keys.length);
    const patches = all.filter((t) => t.patch).map((t) => t.patch!);
    expect(new Set(patches).size, "two tasks share a patch").toBe(patches.length);
  });

  it("never re-asks a first-set reference or impact question", () => {
    // Two tasks target the same thing when their derived file sets are the
    // same, or nearly so. Jaccard is the measure because these keys are
    // mechanically derived sets; 0.7 sits well above the worst legitimate
    // pair (0.667, the two event-rename controls, which are deliberate
    // replicates on different events) and well below an accidental duplicate.
    const derived = (t: Task) => ["reference", "impact"].includes(t.category);
    for (const newTask of ext.filter(derived)) {
      const a = new Set(readKey(newTask).files);
      for (const oldTask of base.filter(derived)) {
        const b = new Set(readKey(oldTask).files);
        const shared = [...a].filter((f) => b.has(f)).length;
        const jaccard = shared / new Set([...a, ...b]).size;
        expect(jaccard, `${newTask.id} vs ${oldTask.id}`).toBeLessThan(0.7);
      }
    }
  });

  it("never re-uses a first-set locate target", () => {
    for (const newTask of ext.filter((t) => t.category === "locate")) {
      const a = readKey(newTask).files.join("|");
      for (const oldTask of base.filter((t) => t.category === "locate")) {
        expect(a, `${newTask.id} vs ${oldTask.id}`).not.toBe(readKey(oldTask).files.join("|"));
      }
    }
  });

  it("never re-breaks a first-set spec or a first-set patched file", () => {
    const fixes = all.filter((t) => t.grader === "vitest");
    const specs = fixes.map((t) => t.spec!);
    expect(new Set(specs).size, "two fix tasks target the same spec").toBe(specs.length);

    const baseFiles = new Set(base.filter((t) => t.patch).flatMap(patchedFiles));
    for (const newTask of ext.filter((t) => t.patch)) {
      for (const file of patchedFiles(newTask)) {
        expect(baseFiles.has(file), `${newTask.id} re-patches ${file}`).toBe(false);
      }
    }
  });

  it("marks at least one grep-trivial control per category in the ext set", () => {
    // The report needs a per-category zero-advantage baseline; the note is
    // where that intent is recorded, so it has to survive an edit.
    for (const category of CATEGORIES) {
      const easy = ext.filter(
        (t) => t.category === category && (t.notes ?? "").includes("DELIBERATELY EASY"),
      );
      if (category === "explain" || category === "fix") continue;
      expect(easy.length, `${category} has no grep-trivial control`).toBeGreaterThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------
// cross-file: all three sets share one id space and one key directory
// ---------------------------------------------------------------------------

describe("tasks.json + tasks-ext.json + tasks-docs.json", () => {
  const all = [
    ...loadTasks("tasks.json"),
    ...loadTasks("tasks-ext.json"),
    ...loadTasks("tasks-docs.json"),
  ];

  it("has 65 tasks with globally unique ids", () => {
    expect(all).toHaveLength(65);
    expect(new Set(all.map((t) => t.id)).size).toBe(65);
  });

  it("gives every task its own key file", () => {
    const keys = all.filter((t) => t.key).map((t) => t.key!);
    expect(new Set(keys).size, "two tasks share a key file").toBe(keys.length);
  });

  it("resolves every key file that any set names", () => {
    for (const task of all) {
      if (!task.key) continue;
      expect(fs.existsSync(path.resolve(TASKS_DIR, task.key)), `${task.id}: ${task.key}`).toBe(true);
    }
  });

  it("never lets a run id collide across sets", () => {
    // run ids are `${task.id}__${condition}__r${rep}`, so a duplicated task id
    // would silently overwrite another set's run directory.
    const ids = all.map((t) => t.id);
    expect(ids.filter((id) => ids.indexOf(id) !== ids.lastIndexOf(id))).toEqual([]);
  });
});

describe("grader dry-run against the committed keys", () => {
  const tasks = [...loadTasks("tasks.json"), ...loadTasks("tasks-ext.json")];
  const byId = (id: string) => tasks.find((t) => t.id === id)!;

  const sample = byId("REF3-issue-created-subscribers");
  const key = readKey(sample);

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
    const loc = byId("LOC3-digest-window");
    const locKey = readKey(loc);
    // The cron route is the distractor the key deliberately excludes.
    const withDistractor = [...locKey.files, "src/app/api/cron/digest/route.ts"];
    const score = scoreSet(`ANSWER: ${withDistractor.join(", ")}`, locKey.files);
    expect(score.f1).toBeLessThan(loc.success_threshold);
  });

  it("scores the ext multi-hop reference task the same way", () => {
    const hop = byId("XREF6-member-joined-repositories");
    const hopKey = readKey(hop);
    expect(scoreSet(`ANSWER: ${hopKey.files.join(", ")}`, hopKey.files).f1).toBe(1);
    // Answering with the subscribers instead of what they reach scores 0.
    const wrongHop = [
      "src/server/services/notification-service.ts",
      "src/server/services/usage-service.ts",
    ];
    expect(scoreSet(`ANSWER: ${wrongHop.join(", ")}`, hopKey.files).f1).toBe(0);
  });

  it("scores a half answer and a no-answer on an ext impact task", () => {
    const imp = byId("XIMP3-issue-status-union");
    const impKey = readKey(imp);
    const half = impKey.files.slice(0, Math.ceil(impKey.files.length / 2));
    const halfScore = scoreSet(`ANSWER: ${half.join(", ")}`, impKey.files);
    expect(halfScore.f1).toBeGreaterThan(0);
    expect(halfScore.f1).toBeLessThan(imp.success_threshold);
    expect(scoreSet("No ANSWER line here.", impKey.files).f1).toBe(0);
  });

  it("scores a discrepancy task with the unchanged set grader", () => {
    // `discrepancy` is a new category but not a new grader: grade.ts is
    // untouched, so a document path scores exactly like a source path.
    const docTasks = loadTasks("tasks-docs.json");
    const dis = docTasks.find((t) => t.id === "DDIS1-permissions-and-role-gates")!;
    const disKey = readKey(dis);
    expect(disKey.files.length).toBe(3);

    const perfect = scoreSet(`ANSWER: ${disKey.files.join(", ")}`, disKey.files);
    expect(perfect.f1).toBe(1);
    expect(perfect.f1 >= dis.success_threshold).toBe(true);

    // Two of three found: 0.8 F1, which the 0.6 threshold counts a success —
    // the partial credit the category is designed to reward.
    const two = scoreSet(`ANSWER: ${disKey.files.slice(0, 2).join(", ")}`, disKey.files);
    expect(two.f1).toBeCloseTo(0.8, 10);
    expect(two.f1 >= dis.success_threshold).toBe(true);

    // One of three: 0.5, below the threshold.
    const one = scoreSet(`ANSWER: ${disKey.files[0]}`, disKey.files);
    expect(one.f1).toBeCloseTo(0.5, 10);
    expect(one.f1 >= dis.success_threshold).toBe(false);

    // Naming the code file the documents contradict instead of the documents
    // scores 0 — the answer is the prose, not the implementation.
    expect(scoreSet("ANSWER: src/lib/permissions.ts", disKey.files).f1).toBe(0);
    expect(scoreSet("I found some inconsistencies.", disKey.files).f1).toBe(0);
  });

  it("normalizes a document path the same way it normalizes a source path", () => {
    const docTasks = loadTasks("tasks-docs.json");
    const loc = docTasks.find((t) => t.id === "DLOC1-issue-number-scope")!;
    const locKey = readKey(loc);
    const decorated = `**ANSWER:** ${locKey.files.map((f) => `\`./${f}\``).join(", ")}`;
    expect(scoreSet(decorated, locKey.files).f1).toBe(1);
  });

  it("scores a perfect ext locate answer at 1.0", () => {
    const loc = byId("XLOC4-session-lifetime");
    const locKey = readKey(loc);
    const score = scoreSet(`ANSWER: ${locKey.files.join(", ")}`, locKey.files);
    expect(score.f1).toBe(1);
    expect(score.f1 >= loc.success_threshold).toBe(true);
  });
});
