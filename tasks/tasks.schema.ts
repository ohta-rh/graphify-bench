import { z } from "zod";

/** Grading strategy for a task. */
export const GraderSchema = z.enum(["set-f1", "vitest", "llm-judge"]);
export type Grader = z.infer<typeof GraderSchema>;

/** Task category, per architecture.md §6. */
export const CategorySchema = z.enum([
  "locate", // 1: symbol location (RepoQA style)
  "reference", // 2: exhaustive reference / dataflow
  "explain", // 3: architecture explanation
  "impact", // 4: impact analysis
  "fix", // 5: small bug fix
]);
export type Category = z.infer<typeof CategorySchema>;

export const TaskSchema = z
  .object({
    /** Stable id. Used in run-ids, so keep it filesystem-safe. */
    id: z
      .string()
      .min(1)
      .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, "task id must be filesystem-safe"),
    category: CategorySchema,
    /** The full prompt handed to `claude -p`, including the answer-format reminder. */
    prompt: z.string().min(1),
    grader: GraderSchema,
    /**
     * Path to the ground-truth key, relative to `tasks/`.
     * - `set-f1`   → a JSON file: `{ "files": string[] }`
     * - `llm-judge`→ a Markdown rubric
     * - `vitest`   → omitted (see `spec`)
     */
    key: z.string().optional(),
    /** Vitest spec path (repo-relative inside the corpus) for `grader: "vitest"`. */
    spec: z.string().optional(),
    /** Patch applied to the run dir before the agent starts, relative to `tasks/`. */
    patch: z.string().optional(),
    /** F1 threshold counted as success for `set-f1`. */
    success_threshold: z.number().min(0).max(1).default(0.9),
    /** Score (0..1) counted as success for `llm-judge`. */
    judge_threshold: z.number().min(0).max(1).default(0.6),
    /** Free-form note; never shown to the agent. */
    notes: z.string().optional(),
    /** Marks scaffolding entries that are not part of the real benchmark set. */
    placeholder: z.boolean().default(false),
  })
  .superRefine((task, ctx) => {
    if (task.grader === "set-f1" && !task.key) {
      ctx.addIssue({ code: "custom", message: `task ${task.id}: grader "set-f1" requires "key"` });
    }
    if (task.grader === "llm-judge" && !task.key) {
      ctx.addIssue({ code: "custom", message: `task ${task.id}: grader "llm-judge" requires "key"` });
    }
    if (task.grader === "vitest" && !task.spec) {
      ctx.addIssue({ code: "custom", message: `task ${task.id}: grader "vitest" requires "spec"` });
    }
  });

export type Task = z.infer<typeof TaskSchema>;

export const TaskFileSchema = z.object({
  version: z.literal(1),
  tasks: z.array(TaskSchema).min(1),
});
export type TaskFile = z.infer<typeof TaskFileSchema>;

/** Ground-truth key for `set-f1`. */
export const SetKeySchema = z.object({
  files: z.array(z.string()),
  notes: z.string().optional(),
});
export type SetKey = z.infer<typeof SetKeySchema>;

export function parseTaskFile(raw: unknown): TaskFile {
  const parsed = TaskFileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`tasks file is invalid:\n${z.prettifyError(parsed.error)}`);
  }
  const ids = new Set<string>();
  for (const task of parsed.data.tasks) {
    if (ids.has(task.id)) throw new Error(`duplicate task id: ${task.id}`);
    ids.add(task.id);
  }
  return parsed.data;
}
