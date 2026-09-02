import path from "node:path";

/**
 * Declarative registry of measurement conditions (arms).
 *
 * An arm is not just "an overlay": Phase 6 adds arms that differ by model
 * (`haiku-*`), by CLI capability (`baseline-nosub` cannot spawn subagents) and
 * by hook aggressiveness (`graphify-strict`). Keeping those differences in one
 * table — rather than scattered across matrix/run/report — is what makes them
 * auditable: `run.meta.json` records the resolved spec, so a reader can tell
 * from a run directory alone exactly what was varied.
 *
 * `overlays` is an ORDERED list applied left to right, later files winning.
 * That is how `graphify-strict` reuses the 4.6 MB `overlays/graphify` payload
 * (graph.json, skill, CLAUDE.md) and contributes only the one-file settings
 * change on top of it, instead of duplicating the graph in git.
 */
export interface ConditionSpec {
  name: string;
  /** Overlay directory names under `overlays/`, applied in order. */
  overlays: string[];
  /** Model id override; unset means the harness default (`BENCH_MODEL`). */
  model?: string;
  /** Extra `claude -p` arguments appended after the harness's own. */
  extraClaudeArgs?: string[];
  /** Extra environment for the `claude` child process. */
  env?: Record<string, string>;
  /** One line explaining what this arm isolates — copied into the report. */
  note?: string;
}

/** The exact Haiku model id used for the weak-explorer arms. */
export const HAIKU_MODEL = "claude-haiku-4-5";

export const CONDITIONS: readonly ConditionSpec[] = [
  {
    name: "baseline",
    overlays: ["baseline"],
    note: "No graph, no hooks — the reference arm.",
  },
  {
    name: "graphify",
    overlays: ["graphify"],
    note: "graphify overlay as `graphify install --project` writes it (soft nudge hooks).",
  },
  {
    name: "graphify-strict",
    overlays: ["graphify", "graphify-strict"],
    note:
      "Same as `graphify`, but the Read|Glob hook runs `hook-guard read --strict`: the first raw " +
      "Read of an indexed in-project source file per session is DENIED and redirected to `graphify query`.",
  },
  {
    name: "baseline-nosub",
    overlays: ["baseline"],
    extraClaudeArgs: ["--disallowedTools", "Agent"],
    note:
      "Baseline with the Agent tool removed, so it cannot delegate exploration to a subagent — " +
      "isolates how much of baseline's efficiency is the subagent rather than the flat search.",
  },
  {
    name: "haiku-baseline",
    overlays: ["baseline"],
    model: HAIKU_MODEL,
    note: "Baseline run by a weaker explorer.",
  },
  {
    name: "haiku-graphify",
    overlays: ["graphify"],
    model: HAIKU_MODEL,
    note: "graphify run by a weaker explorer — the arm where a prebuilt index should help most.",
  },
] as const;

const BY_NAME = new Map(CONDITIONS.map((c) => [c.name, c]));

export function conditionNames(): string[] {
  return CONDITIONS.map((c) => c.name);
}

/**
 * Resolve a condition name to its spec.
 *
 * An unregistered name degrades to "an overlay of that name and nothing else",
 * which keeps ad-hoc arms (`--conditions my-experiment`) working; `matrix.ts`
 * still fails loudly if the overlay directory does not exist, so a typo cannot
 * silently produce a corpus-only run.
 */
export function resolveCondition(name: string): ConditionSpec {
  return BY_NAME.get(name) ?? { name, overlays: [name] };
}

/** Absolute overlay directories for a condition, in application order. */
export function overlayDirs(spec: ConditionSpec, overlaysRoot: string): string[] {
  return spec.overlays.map((o) => path.join(overlaysRoot, o));
}

/** The model this arm actually runs, given the harness default. */
export function effectiveModel(spec: ConditionSpec, defaultModel: string): string {
  return spec.model ?? defaultModel;
}
