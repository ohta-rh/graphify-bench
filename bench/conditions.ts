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
  /**
   * Name of the env var an operator sets to override `command` on a host where
   * the default path is wrong — `MEMPALACE_MCP_EXE` for the mempalace family,
   * `CGR_MCP_EXE` for the cgr family. `run.ts` names it in the "executable not
   * found" error instead of hardcoding one family's variable, so the message
   * stays correct as more MCP-backed families are added.
   */
  exeEnvHint?: string;
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
  /**
   * Reasoning-effort override for `claude -p --effort`; unset means the harness
   * default (`BENCH_EFFORT`, `high`).
   *
   * This is a *runtime lever* rather than a treatment installed into the corpus:
   * nothing about the agent's working directory changes, only how much thinking
   * it is authorised to spend. It lives beside `model` because it is the same
   * kind of knob — a property of the invocation, not of the files — and because
   * `run.meta.json` must record the effort that actually ran, exactly as it
   * records the model that actually ran. Reading `env.effort` out of a run
   * directory is the only way a reader can tell an `effort-low` run from a
   * `baseline` one after the fact, since the two ship an identical overlay.
   */
  effort?: string;
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
 * The built-in tools the `lean-tools` family leaves in the request.
 *
 * `--tools` is an *allowlist that replaces the built-in set*, and it is the only
 * flag in Claude Code 2.1.258 that removes a tool's schema from the API request
 * rather than refusing the call after the model has already been told the tool
 * exists. `--allowedTools` is a permission filter and changes nothing about the
 * request; `--disallowedTools` removes a bare tool name but cannot express "keep
 * only these five". Measured on this host with a one-word prompt in an empty
 * directory (whole cached prefix = cache_creation + cache_read, because a warm
 * cache moves tokens between the two columns):
 *
 *   default (no flag)                  21,138
 *   --disallowedTools Agent            18,235
 *   --tools Read,Grep,Glob,Bash,Edit   18,854   (reproduced: 18,858)
 *   --tools Read                       14,143
 *   --tools ""                         13,457   <- system prompt, no tools
 *
 * The floor at `--tools ""` is the proof that the flag really strips schemas.
 * The number that matters for this experiment is the third line: restricting to
 * five tools makes the fixed prefix **larger**, not smaller, than simply removing
 * `Agent`. So `lean-tools` is not a fixed-overhead lever on this host; whatever
 * it buys has to come from the agent having fewer ways to spend a turn.
 *
 * `Edit` is in the list because the `fix` category is graded by running the test
 * suite, and an arm that cannot edit cannot pass it.
 */
export const LEAN_TOOLS = ["Read", "Grep", "Glob", "Bash", "Edit"] as const;

/** `LEAN_TOOLS` as the CLI argument pair, so no arm spells the list out twice. */
export const LEAN_TOOLS_ARGS: readonly string[] = ["--tools", LEAN_TOOLS.join(",")];

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
    exeEnvHint: "MEMPALACE_MCP_EXE",
  };
}

/**
 * Absolute path to `code-graph-rag` on this host, verified by the Director
 * 2026-09-03 (`code-graph-rag 0.0.845`, installed with
 * `uv tool install --python 3.12 --with "mcp<2"
 * "code-graph-rag[treesitter-full,semantic,ast-grep]"`). The `mcp<2` pin is
 * load-bearing, not cosmetic: code-graph-rag 0.0.845 declares `mcp>=1.28.1`
 * with no upper bound, and the `mcp` 2.x package removed `Server.list_tools`,
 * so an unpinned install crashes the MCP server at startup ("'Server' object
 * has no attribute 'list_tools'"). `CGR_MCP_EXE` overrides this path, exactly
 * as `MEMPALACE_MCP_EXE` overrides the mempalace path above — a `uv tool
 * install` places the executable under `~/.local/bin`, which is right on this
 * host and inferrable on no other.
 */
export const CGR_MCP_EXE_DEFAULT = "/Users/tetsuyaohta/.local/bin/code-graph-rag";

export function cgrMcpExe(): string {
  return process.env.CGR_MCP_EXE?.trim() || CGR_MCP_EXE_DEFAULT;
}

/**
 * The MCP block shared by every `cgr*` arm, differing only in which staged
 * corpus generation's shared graph it points at.
 *
 * Unlike mempalace's palace, there is no per-run clone: `TARGET_REPO_PATH`
 * names the STAGING directory the shared Memgraph + Qdrant index was built
 * from (`scripts/build-cgr-index.sh`), and the server derives the project it
 * queries from that path (dirname + sha256 prefix) rather than from a file it
 * opens read-write. `resourceDir` therefore points at the tiny, committed
 * `.cgr/index-<gen>/manifest.json` — record-keeping for which build this arm
 * measured, not a payload `run.ts` clones — while `provisionMcp`'s existing
 * clone-and-hash machinery runs unchanged over that manifest directory.
 *
 * The orchestrator/cypher env vars point at a local Ollama model the arm never
 * actually reaches (`ask_agent` and `query_code_graph`, the tools that would
 * call it, are disallowed below) — they exist only because code-graph-rag's
 * startup validation requires *some* provider config even when every LLM-backed
 * tool is off, and Ollama is the one that needs no API key.
 */
function cgrMcp(generation: "v1" | "v2"): McpSpec {
  return {
    name: "code-graph-rag",
    command: cgrMcpExe(),
    args: ["mcp-server"],
    envTemplate: {
      TARGET_REPO_PATH: `/tmp/cgr-index/${generation}/taskflow`,
      ORCHESTRATOR_PROVIDER: "ollama",
      ORCHESTRATOR_MODEL: "qwen3.5:4b",
      CYPHER_PROVIDER: "ollama",
      CYPHER_MODEL: "qwen3.5:4b",
      // Without this cgr writes embeddings to a cwd-relative local Qdrant
      // (./.qdrant_code_embeddings, single-process lock) instead of the
      // daemon's shared container, and `semantic_search` answers "No
      // embeddings have been generated yet" from any other cwd — verified by
      // the Director's live smoke test 2026-09-03. The daemon's Qdrant
      // container listens on 127.0.0.1:6333.
      QDRANT_URL: "http://127.0.0.1:6333",
    },
    resourceDir: `.cgr/index-${generation}`,
    exeEnvHint: "CGR_MCP_EXE",
  };
}

/**
 * The `code-graph-rag` MCP tools this benchmark measures, fully namespaced.
 *
 * `ask_agent` and `query_code_graph` are the tool's headline NL->Cypher path,
 * and both require an external LLM — disallowing them is a deliberate scope
 * cut (docs/plan/CGR.md), not an oversight. `index_repository`, `update_repository`,
 * `reingest`, `wipe_database` and `delete_project` mutate the shared Memgraph
 * graph that every concurrent run reads, so allowing them would let one run's
 * agent corrupt or rebuild the index underneath every other run — the graph
 * equivalent of mempalace's per-run clone requirement, solved here by removing
 * the write path instead of cloning a database. `surgical_replace_code`,
 * `write_file` and `structural_replace` mutate the STAGING tree the graph was
 * built from, which every future run of this arm also reads. `read_file` and
 * `list_directory` read that same staging copy rather than the agent's own
 * working directory, so allowing them would let the agent open a file through
 * a path Claude Code's own `Read`/`Glob` never touch and therefore
 * `collect.ts` never counts — the MCP equivalent of the `read_graph_json`
 * counter-productive case this benchmark already watches for graphify.
 */
export const CGR_DISALLOWED_TOOLS = [
  "mcp__code-graph-rag__ask_agent",
  "mcp__code-graph-rag__query_code_graph",
  "mcp__code-graph-rag__index_repository",
  "mcp__code-graph-rag__update_repository",
  "mcp__code-graph-rag__reingest",
  "mcp__code-graph-rag__wipe_database",
  "mcp__code-graph-rag__delete_project",
  "mcp__code-graph-rag__surgical_replace_code",
  "mcp__code-graph-rag__write_file",
  "mcp__code-graph-rag__structural_replace",
  "mcp__code-graph-rag__read_file",
  "mcp__code-graph-rag__list_directory",
] as const;

/** `CGR_DISALLOWED_TOOLS` as the CLI argument pair every `cgr*` arm appends. */
export const CGR_DISALLOWED_ARGS: readonly string[] = ["--disallowedTools", CGR_DISALLOWED_TOOLS.join(",")];

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
  {
    name: "cgr",
    overlays: ["cgr"],
    corpus: "v1",
    mcp: cgrMcp("v1"),
    extraClaudeArgs: [...CGR_DISALLOWED_ARGS],
    note:
      "A third index shape: a Tree-sitter AST graph in a Memgraph database instead of a JSON file (graphify) " +
      "or embedded text chunks (mempalace), reached through nine LLM-free, read-only MCP tools over the " +
      "code-only corpus. `ask_agent` / `query_code_graph` (the tool's NL->Cypher path) and every write/mutate " +
      "tool are disallowed — reference arms for both `graphify` and `mempalace`.",
  },
  {
    name: "haiku-cgr",
    overlays: ["cgr"],
    corpus: "v1",
    model: HAIKU_MODEL,
    mcp: cgrMcp("v1"),
    extraClaudeArgs: [...CGR_DISALLOWED_ARGS],
    note: "`cgr` run by a weaker explorer — its reference arm is `haiku-baseline`.",
  },
  {
    name: "cgr-v2",
    overlays: ["cgr-v2"],
    corpus: "v2",
    mcp: cgrMcp("v2"),
    extraClaudeArgs: [...CGR_DISALLOWED_ARGS],
    note:
      "`cgr` over code AND the 139-file documentation layer (corpus-v2): code-graph-rag indexes Markdown as " +
      "`Section` nodes per heading, so the doc-vs-code task set is meaningful here too. Reference arms are " +
      "`graphify-v2` and `mempalace-v2`.",
  },
  {
    name: "haiku-cgr-v2",
    overlays: ["cgr-v2"],
    corpus: "v2",
    model: HAIKU_MODEL,
    mcp: cgrMcp("v2"),
    extraClaudeArgs: [...CGR_DISALLOWED_ARGS],
    note: "`cgr-v2` run by a weaker explorer — its reference arm is `haiku-baseline`.",
  },
  {
    name: "effort-medium",
    overlays: ["baseline"],
    corpus: "v1",
    effort: "medium",
    note:
      "A RUNTIME LEVER, not a tool: the baseline overlay byte for byte, invoked with " +
      "`--effort medium` instead of the harness default `high`. Thinking tokens bill as output, so the " +
      "reduction is arithmetically certain and the open question is entirely about accuracy.",
  },
  {
    name: "effort-low",
    overlays: ["baseline"],
    corpus: "v1",
    effort: "low",
    note: "As `effort-medium`, one notch further down: baseline with `--effort low`.",
  },
  {
    name: "effort-low-nosub",
    overlays: ["baseline"],
    corpus: "v1",
    effort: "low",
    extraClaudeArgs: ["--disallowedTools", "Agent"],
    note:
      "The two strongest runtime levers at once: baseline's overlay byte for byte, invoked with " +
      "`--effort low` AND `--disallowedTools Agent`. Both levers cut the same resource — total " +
      "exploration and thinking — so the arm exists to answer whether their savings add up or " +
      "overlap. Its treatment lives entirely in `claude.argv`; nothing in the corpus copy differs " +
      "from a `baseline` run.",
  },
  {
    name: "haiku-explore",
    overlays: ["haiku-explore"],
    corpus: "v1",
    note:
      "Baseline plus one file: `.claude/agents/Explore.md` declaring `model: haiku`, which overrides " +
      "Claude Code's built-in `Explore` subagent (project agents outrank built-ins) so delegated " +
      "exploration runs on Haiku while the main session stays on Sonnet. Its `CLAUDE.md` is byte-identical " +
      "to baseline's — the arm changes who explores, not what the agent is told.",
  },
  {
    name: "lean-tools",
    overlays: ["baseline"],
    corpus: "v1",
    effort: "low",
    extraClaudeArgs: [...LEAN_TOOLS_ARGS, "--disallowedTools", "Agent"],
    note:
      "`effort-low-nosub` plus `--tools Read,Grep,Glob,Bash,Edit`, which REMOVES every other built-in " +
      "tool's schema from the request rather than merely denying it at permission time (proved in " +
      "docs/plan/LEAN.md §3). `Edit` is kept so `fix` tasks stay solvable. `--disallowedTools Agent` is " +
      "redundant — `Agent` is already outside the allowlist — and is retained only so the arm's lineage " +
      "from `effort-low-nosub` is legible in `claude.argv`.",
  },
  {
    name: "few-turns",
    overlays: ["few-turns"],
    corpus: "v1",
    effort: "low",
    extraClaudeArgs: ["--disallowedTools", "Agent"],
    note:
      "`effort-low-nosub` with one instruction change: `overlays/few-turns/CLAUDE.md` is baseline's file " +
      "byte for byte plus a `## Working economy` section (locate with `Grep -n`, read line ranges, batch " +
      "independent calls into one turn, never re-read, stop when the evidence suffices). The answer-format " +
      "contract is untouched, so the arm varies how many turns are spent, not what is answered.",
  },
  {
    name: "haiku-nosub",
    overlays: ["baseline"],
    corpus: "v1",
    model: HAIKU_MODEL,
    extraClaudeArgs: ["--disallowedTools", "Agent"],
    note:
      "`baseline-nosub` on the cheap model: Haiku 4.5 with the Agent tool removed. It carries NO " +
      "`--effort` override — Haiku 4.5 does not honour `--effort` (measured: thinking tokens 202 at " +
      "`low`, 172 at `max`, 690 with the flag absent; Sonnet 5 on the same prompt goes 0 -> 192), so " +
      "declaring one here would record a treatment that never ran. It therefore takes the harness " +
      "default exactly as `haiku-baseline` does, which is what makes that pair a single-variable " +
      "comparison.",
  },
  {
    name: "all-in",
    overlays: ["few-turns"],
    corpus: "v1",
    model: HAIKU_MODEL,
    extraClaudeArgs: [...LEAN_TOOLS_ARGS, "--disallowedTools", "Agent"],
    note:
      "Every lever this repository has found at once: the cheap model, no subagents, the lean tool " +
      "allowlist and the turn-economy CLAUDE.md. Like `haiku-nosub` it declares no `--effort`, because " +
      "Haiku ignores it. The arm answers whether the levers still compose once the model itself is the " +
      "variable being cut.",
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
 * The reasoning effort this arm actually runs, given the harness default.
 *
 * The twin of `effectiveModel`, and load-bearing for the same reason: the
 * `effort-*` arms ship the *baseline overlay*, so a run directory in which
 * `env.effort` still read `high` would be indistinguishable from a `baseline`
 * run, and an arm that silently failed to apply its only treatment would be an
 * expensive re-measurement of baseline wearing another name.
 */
export function effectiveEffort(spec: ConditionSpec, defaultEffort: string): string {
  return spec.effort ?? defaultEffort;
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
