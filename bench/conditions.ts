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
/**
 * An MCP server this arm hands the agent, materialized fresh for every run.
 *
 * The `mempalace` family is the first arm whose treatment is not a file in the
 * corpus copy but a *process*: the index lives in a ChromaDB/sqlite directory
 * that a server reads on demand, so the overlay mechanism cannot carry it.
 * Three things follow, and this block exists to make all three declarative:
 *
 *  - **The index cannot be shared.** ChromaDB opens its sqlite file read-write
 *    even to answer a query, so three concurrent runs against one directory is
 *    a corruption risk, not merely a lock contention one. `resourceDir` is
 *    therefore a *template* that `run.ts` clones per run.
 *  - **The server needs the clone's path**, in two places that must agree: the
 *    `--palace` argument and `MEMPALACE_PALACE_PATH`. `${PALACE}` is expanded
 *    in `args` and in `envTemplate` alike so they cannot drift apart.
 *  - **The path is only known at run time**, so the config JSON is rendered
 *    into the run's own temp directory rather than committed.
 */
export interface McpSpec {
  /**
   * Server name as it appears in the config, and therefore the middle segment
   * of every tool name the transcript records (`mcp__<name>__<tool>`).
   */
  name: string;
  /**
   * Absolute path to the server executable. Host-specific — maintained by
   * `scripts/patch-overlay.ts`, exactly like graphify's hook command, and
   * verified to exist before a run rather than trusted.
   */
  command: string;
  /** Server arguments. `${PALACE}` expands to this run's private index copy. */
  args: string[];
  /** Extra environment for the server process; `${PALACE}` expands here too. */
  envTemplate?: Record<string, string>;
  /**
   * Directory holding the pre-built index, relative to the repository root.
   * Cloned into the run's temp directory before `claude -p` starts. It is
   * deliberately NOT under `overlays/`: `applyOverlay` copies an overlay
   * directory wholesale into the corpus copy, which would drop tens of
   * megabytes of index into the agent's own working directory and let it read
   * the answers off disk instead of querying for them.
   */
  resourceDir: string;
}

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
  /**
   * An MCP server to start for this arm. `run.ts` clones the index, renders a
   * config file and appends `--mcp-config <file> --strict-mcp-config` itself —
   * the arm does not spell those arguments out in `extraClaudeArgs`, because
   * the config path does not exist until the run begins.
   */
  mcp?: McpSpec;
  /** One line explaining what this arm isolates — copied into the report. */
  note?: string;
}

/** The exact Haiku model id used for the weak-explorer arms. */
export const HAIKU_MODEL = "claude-haiku-4-5";

/**
 * Absolute path to `mempalace-mcp` on this host.
 *
 * Host-specific in exactly the way graphify's hook command is, and maintained
 * by the same script (`scripts/patch-overlay.ts`). mempalace is a Python
 * package installed into a virtualenv rather than a global binary, so there is
 * no path that is right on every machine and none can be inferred; the literal
 * below is this host's, `MEMPALACE_MCP_EXE` overrides it, and `run.ts` refuses
 * to start an arm whose executable is missing rather than measuring an arm
 * whose MCP server silently failed to spawn — the failure mode that would turn
 * `mempalace` into an expensive re-run of `baseline`.
 *
 * To recreate it on a new host:
 *   uv venv <dir> && uv pip install --python <dir>/bin/python mempalace==3.9.0
 *   MEMPALACE_MCP_EXE=<dir>/bin/mempalace-mcp pnpm exec tsx scripts/patch-overlay.ts
 */
export const MEMPALACE_MCP_EXE_DEFAULT =
  "/private/tmp/claude-501/-Users-tetsuyaohta-projects-other-graphify-bench/a179592b-4abf-4d72-b7f7-8e1ec112b098/scratchpad/mp-venv/bin/mempalace-mcp";

export function mempalaceMcpExe(): string {
  return process.env.MEMPALACE_MCP_EXE?.trim() || MEMPALACE_MCP_EXE_DEFAULT;
}

/**
 * The MCP block shared by every `mempalace*` arm, differing only in which
 * corpus generation's index it points at.
 *
 * `MEMPALACE_PALACE_PATH` duplicates the `--palace` argument on purpose: the
 * CLI flag is what the server reads, and the environment variable is what the
 * library falls back to if a code path inside mempalace resolves the palace on
 * its own. Setting only one of them leaves a run one refactor away from
 * silently reading `~/.mempalace/palace` — the shared, cross-run index this
 * whole per-run-clone design exists to avoid.
 */
function mempalaceMcp(generation: "v1" | "v2"): McpSpec {
  return {
    name: "mempalace",
    command: mempalaceMcpExe(),
    args: ["--palace", "${PALACE}"],
    envTemplate: { MEMPALACE_PALACE_PATH: "${PALACE}" },
    resourceDir: `.palaces/palace-${generation}`,
  };
}

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
  {
    name: "mempalace",
    overlays: ["mempalace"],
    corpus: "v1",
    mcp: mempalaceMcp("v1"),
    note:
      "A semantic-retrieval index instead of a structural one: MemPalace 3.9.0 over the code-only " +
      "corpus, reached through the `mempalace_search` MCP tool. The CLAUDE.md nudge is the same " +
      "strength as graphify's; what differs is the retrieval model (embedding + BM25 over text " +
      "chunks, not an AST graph).",
  },
  {
    name: "haiku-mempalace",
    overlays: ["mempalace"],
    corpus: "v1",
    model: HAIKU_MODEL,
    mcp: mempalaceMcp("v1"),
    note: "`mempalace` run by a weaker explorer — its reference arm is `haiku-baseline`.",
  },
  {
    name: "mempalace-v2",
    overlays: ["mempalace-v2"],
    corpus: "v2",
    mcp: mempalaceMcp("v2"),
    note:
      "MemPalace over code AND the 139-file documentation layer (corpus-v2). Its index covers the " +
      "docs, so it is the semantic-retrieval counterpart to `graphify-v2` on the doc-vs-code set.",
  },
  {
    name: "haiku-mempalace-v2",
    overlays: ["mempalace-v2"],
    corpus: "v2",
    model: HAIKU_MODEL,
    mcp: mempalaceMcp("v2"),
    note: "`mempalace-v2` run by a weaker explorer — its reference arm is `haiku-baseline`.",
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

/** The token `run.ts` replaces with this run's private index directory. */
export const PALACE_PLACEHOLDER = "${PALACE}";

/** Expand `${PALACE}` in one string. Literal, not a shell or template engine. */
export function expandPalace(value: string, palaceDir: string): string {
  return value.split(PALACE_PLACEHOLDER).join(palaceDir);
}

/** The `mcpServers` object `claude --mcp-config` expects, with paths resolved. */
export function renderMcpConfig(spec: McpSpec, palaceDir: string): {
  mcpServers: Record<string, { command: string; args: string[]; env?: Record<string, string> }>;
} {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(spec.envTemplate ?? {})) env[k] = expandPalace(v, palaceDir);
  return {
    mcpServers: {
      [spec.name]: {
        command: spec.command,
        args: spec.args.map((a) => expandPalace(a, palaceDir)),
        ...(Object.keys(env).length > 0 ? { env } : {}),
      },
    },
  };
}

/**
 * Prefix every tool this server contributes carries in the transcript.
 *
 * Claude Code namespaces MCP tools as `mcp__<server>__<tool>`, which is the
 * only way `features.ts` can tell a mempalace call apart from a Read — the
 * server name in the config is therefore load-bearing, not cosmetic.
 */
export function mcpToolPrefix(serverName: string): string {
  return `mcp__${serverName}__`;
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
