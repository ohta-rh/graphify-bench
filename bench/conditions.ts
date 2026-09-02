/**
 * The registry of measurement conditions.
 *
 * A condition is an overlay directory under `overlays/`. Registering it here is
 * what turns a directory into a *declared* arm of the experiment: the registry
 * carries the one-line meaning of each arm, which corpus generation it was built
 * against, and whether it is a full overlay or a delta over another. `matrix.ts`
 * validates `--conditions` against it, so a typo (`grahpify-v2`) fails before the
 * first `claude -p` call instead of after a directory-not-found mid-matrix.
 *
 * Delta overlays are declared by a `.overlay-base` file inside the overlay
 * directory, not here — `bench/lib/copy.ts#resolveOverlayChain` is the authority
 * on layering, and `base` below is documentation that must agree with it
 * (`assertRegistryMatchesDisk` checks that it does).
 */
import fs from "node:fs";
import path from "node:path";
import { OVERLAY_BASE_FILE, resolveOverlayChain } from "./lib/copy.js";

export interface ConditionSpec {
  /** Overlay directory name under `overlays/`, and the id used in run ids. */
  id: string;
  /** Which corpus generation the overlay's artifacts were built against. */
  corpus: "v1" | "v2";
  /** The sibling condition this one is a delta over, or null for a full overlay. */
  base: string | null;
  description: string;
}

export const CONDITIONS: readonly ConditionSpec[] = [
  {
    id: "baseline",
    corpus: "v1",
    base: null,
    description:
      "No graphify. A neutral CLAUDE.md and nothing else; `--setting-sources project` keeps the " +
      "harness's own hooks and skills out of reach. Corpus-independent — it ships no graph, so it " +
      "reads whatever corpus generation it is run against, docs included.",
  },
  {
    id: "graphify",
    corpus: "v1",
    base: null,
    description:
      "graphify over the code-only corpus (corpus-v1): AST-built graph.json, the installed skill, " +
      "the install-written CLAUDE.md, and the two PreToolUse nudge hooks.",
  },
  {
    id: "graphify-v2",
    corpus: "v2",
    base: null,
    description:
      "graphify over code AND the 139-file documentation layer (corpus-v2). Same skill, CLAUDE.md " +
      "and hooks as `graphify`; the graph adds semantically extracted doc nodes and doc->code " +
      "traceability edges, which is what the doc-vs-code task set measures.",
  },
  {
    id: "graphify-strict-v2",
    corpus: "v2",
    base: "graphify-v2",
    description:
      "`graphify-v2` with the PreToolUse hooks switched from nudge to blocking " +
      "(GRAPHIFY_HOOK_STRICT=1), so a raw Read/Grep is denied until a `graphify query` has run. " +
      "A delta overlay: it ships only the settings file, and inherits the multi-megabyte graph " +
      "from its base rather than duplicating it.",
  },
] as const;

export const CONDITION_IDS: readonly string[] = CONDITIONS.map((c) => c.id);

export function getCondition(id: string): ConditionSpec {
  const spec = CONDITIONS.find((c) => c.id === id);
  if (!spec) {
    throw new Error(
      `unknown condition ${JSON.stringify(id)}. Registered: ${CONDITION_IDS.join(", ")}. ` +
        "Add it to bench/conditions.ts before measuring with it.",
    );
  }
  return spec;
}

/**
 * Check every registered condition against `overlays/` on disk: the directory
 * exists, and the declared `base` is exactly what `.overlay-base` says. A
 * registry that drifts from disk is worse than no registry — it would document
 * a layering the runner does not perform.
 */
export function assertRegistryMatchesDisk(overlaysDir: string): void {
  for (const spec of CONDITIONS) {
    const dir = path.join(overlaysDir, spec.id);
    if (!fs.existsSync(dir)) throw new Error(`condition "${spec.id}" has no overlay directory: ${dir}`);
    const marker = path.join(dir, OVERLAY_BASE_FILE);
    const onDisk = fs.existsSync(marker) ? fs.readFileSync(marker, "utf8").trim() : null;
    if (onDisk !== spec.base) {
      throw new Error(
        `condition "${spec.id}": bench/conditions.ts declares base ${JSON.stringify(spec.base)} ` +
          `but ${OVERLAY_BASE_FILE} says ${JSON.stringify(onDisk)}`,
      );
    }
    resolveOverlayChain(overlaysDir, spec.id); // cycles / missing bases
  }
}
