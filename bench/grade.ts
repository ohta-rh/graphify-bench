import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runClaudeP } from "./lib/claude-p.js";
import { REPO_ROOT, runDir } from "./lib/env.js";
import { listRunIds } from "./collect.js";
import { parseTaskFile, SetKeySchema, type Task } from "../tasks/tasks.schema.js";

export interface Grade {
  run_id: string;
  task_id: string | null;
  condition: string | null;
  grader: string;
  score: number | null;
  success: boolean | null;
  details: Record<string, unknown>;
  error?: string;
}

// ---------------------------------------------------------------------------
// set-f1
// ---------------------------------------------------------------------------

/** Normalize an agent-supplied path to the repo-relative form used in keys. */
export function normalizePath(raw: string): string {
  let p = raw.trim();
  // strip markdown/backtick/quote decoration and trailing punctuation
  p = p.replace(/^[`'"*\s]+/, "").replace(/[`'"*\s,;.]+$/, "");
  p = p.replace(/\\/g, "/");
  p = p.replace(/^\.\//, "");
  p = p.replace(/^\/+/, "");
  // an absolute path leaked from the run dir: keep the tail from a known root
  const anchored = p.match(/(?:^|\/)((?:src|tests|test|app|lib|scripts|drizzle|public)\/.*)$/);
  if (anchored?.[1]) p = anchored[1];
  return p.replace(/\/+$/, "");
}

/**
 * Extract the answer set from the agent's final message.
 * The contract says the LAST `ANSWER:` line wins, so a mid-message rehearsal of
 * the format cannot poison the real answer.
 */
export function parseAnswerLine(text: string): { found: boolean; raw: string | null; paths: string[] } {
  const lines = text.split(/\r?\n/);
  let raw: string | null = null;
  for (const line of lines) {
    const m = line.match(/^\s*(?:[-*>]\s*)?(?:\*\*)?ANSWER(?:\*\*)?\s*:(.*)$/i);
    if (m) raw = m[1] ?? "";
  }
  if (raw === null) return { found: false, raw: null, paths: [] };
  const paths = raw
    .split(/[,\n]/)
    .map(normalizePath)
    .filter((p) => p.length > 0);
  return { found: true, raw, paths: [...new Set(paths)] };
}

export interface SetScore {
  precision: number;
  recall: number;
  f1: number;
  expected: string[];
  predicted: string[];
  truePositives: string[];
  falsePositives: string[];
  falseNegatives: string[];
  answerFound: boolean;
}

export function scoreSet(answerText: string, expectedFiles: string[]): SetScore {
  const parsed = parseAnswerLine(answerText);
  const expected = new Set(expectedFiles.map(normalizePath));
  const predicted = new Set(parsed.paths);
  const tp = [...predicted].filter((p) => expected.has(p));
  const fp = [...predicted].filter((p) => !expected.has(p));
  const fn = [...expected].filter((p) => !predicted.has(p));
  const precision = predicted.size === 0 ? (expected.size === 0 ? 1 : 0) : tp.length / predicted.size;
  const recall = expected.size === 0 ? 1 : tp.length / expected.size;
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return {
    precision,
    recall,
    f1,
    expected: [...expected].sort(),
    predicted: [...predicted].sort(),
    truePositives: tp.sort(),
    falsePositives: fp.sort(),
    falseNegatives: fn.sort(),
    answerFound: parsed.found,
  };
}

// ---------------------------------------------------------------------------
// llm-judge (blind)
// ---------------------------------------------------------------------------

export const JUDGE_MODEL = "claude-haiku-4-5";

/** Strip strings that would reveal the experimental condition to the judge. */
export function sanitizeForJudge(text: string): string {
  return text
    .replace(/graphify-out/gi, "the index")
    .replace(/\bgraphify\b/gi, "the tool")
    .replace(/\bbaseline\b/gi, "the condition");
}

/**
 * Build the judge prompt. It carries the rubric and the answer only — never the
 * condition name, the tool names, or anything else that reveals which arm the
 * answer came from. Blinding happens HERE rather than at the call site, so the
 * prompt cannot be built unblinded by forgetting a step.
 */
export function buildJudgePrompt(rubric: string, answer: string): string {
  answer = sanitizeForJudge(answer);
  return [
    "You are grading one answer to a question about a TypeScript codebase.",
    "You have not seen the codebase. Grade only against the rubric below.",
    "",
    "# Rubric",
    "Award 1 point for each numbered element the answer covers correctly and 0 otherwise.",
    "",
    rubric.trim(),
    "",
    "# Answer under evaluation",
    "<answer>",
    answer.trim(),
    "</answer>",
    "",
    "# Output",
    "Reply with a single JSON object and nothing else:",
    '{"points": [0 or 1 per rubric element, in order], "earned": <int>, "possible": <int>, "notes": "<= 40 words"}',
  ].join("\n");
}

function extractJudgeJson(text: string): { points?: number[]; earned?: number; possible?: number; notes?: string } | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as Record<string, never>;
  } catch {
    return null;
  }
}

export async function judge(rubric: string, answer: string): Promise<{ score: number | null; details: Record<string, unknown> }> {
  const prompt = buildJudgePrompt(rubric, answer);
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "graphify-bench-judge-"));
  try {
    const inv = await runClaudeP({
      prompt,
      cwd,
      sessionId: crypto.randomUUID(),
      model: JUDGE_MODEL,
      maxTurns: 1,
      maxBudgetUsd: 0.5,
      extraArgs: ["--no-session-persistence"],
      timeoutMs: 5 * 60_000,
    });
    const text = inv.result?.result ?? "";
    const parsed = extractJudgeJson(text);
    if (!parsed) return { score: null, details: { judge_model: JUDGE_MODEL, raw: text.slice(0, 2000), parse_failed: true } };
    const possible = typeof parsed.possible === "number" && parsed.possible > 0
      ? parsed.possible
      : Array.isArray(parsed.points)
        ? parsed.points.length
        : 0;
    const earned = typeof parsed.earned === "number"
      ? parsed.earned
      : Array.isArray(parsed.points)
        ? parsed.points.reduce((a, b) => a + (b ? 1 : 0), 0)
        : 0;
    return {
      score: possible > 0 ? earned / possible : null,
      details: { judge_model: JUDGE_MODEL, earned, possible, points: parsed.points ?? null, notes: parsed.notes ?? null, judge_cost_usd: inv.result?.total_cost_usd ?? null },
    };
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// driver
// ---------------------------------------------------------------------------

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

export async function gradeRun(id: string, tasks: Map<string, Task>, tasksDir: string): Promise<Grade> {
  const dir = runDir(id);
  const meta = readJson<{ task_id?: string; condition?: string; vitest?: { passed?: boolean | null; ran?: boolean; spec?: string | null; exitCode?: number | null; outputTail?: string | null } }>(
    path.join(dir, "run.meta.json"),
  );
  const result = readJson<{ result?: string }>(path.join(dir, "result.json"));
  const taskId = meta?.task_id ?? id.split("__")[0] ?? id;
  const task = tasks.get(taskId);
  const base: Grade = {
    run_id: id,
    task_id: taskId,
    condition: meta?.condition ?? null,
    grader: task?.grader ?? "unknown",
    score: null,
    success: null,
    details: {},
  };
  if (!task) return { ...base, error: `no task definition for ${taskId}` };

  if (task.grader === "vitest") {
    const v = meta?.vitest;
    if (!v || !v.ran) return { ...base, error: "vitest did not run for this run", details: { vitest: v ?? null } };
    return {
      ...base,
      score: v.passed ? 1 : 0,
      success: v.passed === true,
      details: { spec: v.spec ?? task.spec, exitCode: v.exitCode ?? null, outputTail: v.outputTail ?? null },
    };
  }

  const answer = result?.result ?? "";
  if (!answer) return { ...base, error: "result.json has no final message text" };

  if (task.grader === "set-f1") {
    const keyRaw = readJson<unknown>(path.resolve(tasksDir, task.key!));
    if (!keyRaw) return { ...base, error: `key not readable: ${task.key}` };
    const key = SetKeySchema.parse(keyRaw);
    const s = scoreSet(answer, key.files);
    return { ...base, score: s.f1, success: s.f1 >= task.success_threshold, details: { ...s, threshold: task.success_threshold } };
  }

  if (task.grader === "llm-judge") {
    const rubricPath = path.resolve(tasksDir, task.key!);
    if (!fs.existsSync(rubricPath)) return { ...base, error: `rubric not found: ${task.key}` };
    const { score, details } = await judge(fs.readFileSync(rubricPath, "utf8"), answer);
    return { ...base, score, success: score === null ? null : score >= task.judge_threshold, details: { ...details, threshold: task.judge_threshold } };
  }

  return { ...base, error: `unknown grader ${task.grader}` };
}

function flag(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

async function main(): Promise<void> {
  const tasksFile = path.resolve(REPO_ROOT, flag("tasks", "tasks/tasks.json")!);
  const parsed = parseTaskFile(JSON.parse(fs.readFileSync(tasksFile, "utf8")));
  const tasks = new Map(parsed.tasks.map((t) => [t.id, t]));
  const only = process.argv.slice(2).filter((a) => !a.startsWith("--") && !a.endsWith(".json"));
  const ids = only.length > 0 ? only : listRunIds();
  for (const id of ids) {
    const grade = await gradeRun(id, tasks, path.dirname(tasksFile));
    fs.writeFileSync(path.join(runDir(id), "grade.json"), `${JSON.stringify(grade, null, 2)}\n`);
    console.log(
      `${id}  grader=${grade.grader}  score=${grade.score === null ? "-" : grade.score.toFixed(3)}  success=${grade.success ?? "-"}${grade.error ? `  ERROR: ${grade.error}` : ""}`,
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
