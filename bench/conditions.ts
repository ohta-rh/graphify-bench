import fs from "node:fs";
import path from "node:path";

/**
 * Declarative registry of measurement conditions (arms).
 *
 * An arm is not just "an overlay": Phase 6 adds arms that differ by model
 * (`haiku-*`), by CLI capability (`baseline-nosub` cannot spawn subagents), by
 * hook aggressiveness (`*-strict`) and by which corpus generation the overlay's
 * graph was built against (`*-v2`). Keeping those differences in one table —
 * rather than scattered across matrix/run/report — is what makes them
 * auditable: `run.meta.json` records the resolved spec, so a reader can tell
 * from a run directory alone exactly what was varied.
 *
 * `overlays` is an ORDERED list applied left to right, later files winning.
 * That is the delta-overlay mechanism, and the only one: `graphify-strict`
 * reuses the 4.6 MB `overlays/graphify` payload (graph.json, skill, CLAUDE.md)
 * and contributes only the one-file settings change on top of it, and
 * `graphify-strict-v2` does the same over the 6.4 MB `overlays/graphify-v2`,
 * instead of duplicating a graph in git. Layering is declared here and nowhere
 * else — there is no marker file inside the overlay directories, so the arm
 * definition is readable without walking `overlays/`.
 */
export interface ConditionSpec {
  name: string;
  /** Overlay directory names under `overlays/`, applied in order. */
  overlays: string[];
  /**
   * Which corpus generation the overlay's artifacts were built against. `v1` is
   * the code-only corpus; `v2` adds the 139-file documentation layer. Unset for
   * ad-hoc, unregistered arms.
   */
  corpus?: "v1" | "v2";
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
    corpus: "v1",
    note:
      "No graph, no hooks — the reference arm. Corpus-independent: it ships no graph, so it reads " +
      "whatever corpus generation it is run against, docs included.",
  },
  {
    name: "graphify",
    overlays: ["graphify"],
    corpus: "v1",
    note: "graphify overlay as `graphify install --project` writes it (soft nudge hooks), over the code-only corpus.",
  },
  {
    name: "graphify-strict",
    overlays: ["graphify", "graphify-strict"],
    corpus: "v1",
    note:
      "Same as `graphify`, but the Read|Glob hook runs `hook-guard read --strict`: the first raw " +
      "Read of an indexed in-project source file per session is DENIED and redirected to `graphify query`.",
  },
  {
    name: "baseline-nosub",
    overlays: ["baseline"],
    corpus: "v1",
    extraClaudeArgs: ["--disallowedTools", "Agent"],
    note:
      "Baseline with the Agent tool removed, so it cannot delegate exploration to a subagent — " +
      "isolates how much of baseline's efficiency is the subagent rather than the flat search.",
  },
  {
    name: "haiku-baseline",
    overlays: ["baseline"],
    corpus: "v1",
    model: HAIKU_MODEL,
    note: "Baseline run by a weaker explorer.",
  },
  {
    name: "haiku-graphify",
    overlays: ["graphify"],
    corpus: "v1",
    model: HAIKU_MODEL,
    note: "graphify run by a weaker explorer — the arm where a prebuilt index should help most.",
  },
  {
    name: "graphify-v2",
    overlays: ["graphify-v2"],
    corpus: "v2",
    note:
      "graphify over code AND the 139-file documentation layer (corpus-v2). Same skill, CLAUDE.md " +
      "and nudge hooks as `graphify`; the graph adds doc nodes and doc->code traceability edges, " +
      "which is what the doc-vs-code task set measures.",
  },
  {
    name: "graphify-strict-v2",
    overlays: ["graphify-v2", "graphify-strict-v2"],
    corpus: "v2",
    note:
      "`graphify-v2` with the Read|Glob hook switched to `hook-guard read --strict`, so the first " +
      "raw Read of an indexed file is DENIED and redirected to `graphify query`. A delta overlay: " +
      "it ships only the settings file and inherits the multi-megabyte graph from `graphify-v2`.",
  },
  {
    name: "haiku-graphify-v2",
    overlays: ["graphify-v2"],
    corpus: "v2",
    model: HAIKU_MODEL,
    note:
      "`graphify-v2` run by a weaker explorer. Its reference arm is `haiku-baseline`, which ships " +
      "no graph and therefore reads whatever corpus it is pointed at — on corpus-v2 that includes " +
      "the documentation layer, so the pair isolates the graph, not the presence of the docs.",
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

/**
 * Strict lookup, for callers that must not accept an ad-hoc arm.
 *
 * `resolveCondition` is deliberately lenient; this is the opposite door, used
 * where a typo should be named as one rather than degraded into a bare overlay.
 */
export function getCondition(name: string): ConditionSpec {
  const spec = BY_NAME.get(name);
  if (!spec) {
    throw new Error(
      `unknown condition ${JSON.stringify(name)}. Registered: ${conditionNames().join(", ")}. ` +
        "Add it to bench/conditions.ts before measuring with it.",
    );
  }
  return spec;
}

/** Absolute overlay directories for a condition, in application order. */
export function overlayDirs(spec: ConditionSpec, overlaysRoot: string): string[] {
  return spec.overlays.map((o) => path.join(overlaysRoot, o));
}

/** The model this arm actually runs, given the harness default. */
export function effectiveModel(spec: ConditionSpec, defaultModel: string): string {
  return spec.model ?? defaultModel;
}

/**
 * Check every registered condition against `overlays/` on disk: each overlay in
 * the chain exists. A registry that drifts from disk is worse than no registry —
 * it would document a layering the runner cannot perform, and the silent failure
 * mode (a strict variant quietly measured with its base's settings) is exactly
 * what the delta mechanism exists to prevent.
 */
export function assertRegistryMatchesDisk(overlaysDir: string): void {
  for (const spec of CONDITIONS) {
    for (const dir of overlayDirs(spec, overlaysDir)) {
      if (!fs.existsSync(dir)) {
        throw new Error(`condition "${spec.name}" references a missing overlay directory: ${dir}`);
      }
    }
  }
}
