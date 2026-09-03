# graphify-bench

Does [graphify](https://github.com/Graphify-Labs/graphify) (a code and document knowledge graph with a `graphify query` CLI) reduce the tokens a Claude Code agent spends on a mid-size Next.js codebase? This repository measures it with real headless Claude Code sessions instead of graphify's own synthetic `graphify benchmark` estimate.

It now also measures a second, structurally different prebuilt index — [MemPalace](https://github.com/MemPalace/mempalace) 3.9.0, embedding + BM25 over text chunks rather than an AST graph — so that a null result on graphify can be attributed to *this index* or to *the whole idea*.

## Headline

635 runs, 65 tasks, 16 conditions, one repetition each, about $145 of API spend. Every run's `result.json` and full transcript is committed.

**For Sonnet 5 on a code-only corpus, graphify changes nothing measurable. It starts paying off when the explorer is weak (Haiku 4.5) or when the questions span documentation and code, and it is clearly counter-productive when a literal grep would do.**

**Swapping the AST graph for a semantic index does not rescue the idea: MemPalace is worse than baseline on every code-task comparison and loses accuracy on doc↔code tasks.** Across nine paired comparisons it wins none.

| setting | tokens (graphify − baseline) | cost | accuracy (graphify / baseline) | report |
|---|---|---|---|---|
| Sonnet 5, 45 code tasks | +32k [−8k, +75k], crosses 0 | −$0.006, crosses 0 | 78% / 84% | [`results/combined`](results/combined/REPORT.md) |
| Sonnet 5, 45 code tasks, baseline without subagents | +107k [+38k, +180k], graphify higher | +$0.066 [+0.037, +0.101] | 78% / 84% | [`results/structural`](results/structural/REPORT.md) |
| Sonnet 5, strict hook (first raw read blocked) | no change vs plain graphify; the block never fired in 45 runs | | 78% | same |
| Haiku 4.5, 45 code tasks | **−119k [−245k, −12k]** | −$0.016, crosses 0 | 82% / 80% | same |
| Sonnet 5, 20 doc↔code tasks (corpus with 139 spec/design docs) | −129k [−325k, +33k], crosses 0 | **−$0.084 [−0.180, −0.005]** | **80% / 70%** | [`results/docs`](results/docs/REPORT.md) |
| Haiku 4.5, 20 doc↔code tasks | **−161k [−317k, −25k]** | **−$0.030 [−0.060, −0.004]** | 75% / 80% | same |

MemPalace, measured on the same tasks and graded the same way (differences are `mempalace − reference`):

| setting | tokens | cost | accuracy (mempalace / reference) | report |
|---|---|---|---|---|
| Sonnet 5, 45 code tasks, vs `baseline` | **+170k [+66k, +288k]** | **+$0.137 [+0.078, +0.205]** | 80% / 84% | [`results/mempalace`](results/mempalace/REPORT.md) |
| Sonnet 5, 45 code tasks, vs `graphify` | **+138k [+31k, +255k]** | **+$0.143 [+0.084, +0.212]** | 80% / 78% | same |
| Sonnet 5, 45 code tasks, vs `baseline-nosub` | **+246k [+157k, +355k]** | **+$0.209 [+0.152, +0.270]** | 80% / 84% | same |
| Haiku 4.5, 45 code tasks, vs `haiku-baseline` | crosses 0 | **+$0.035 [+0.010, +0.062]** | 76% / 80% | same |
| Sonnet 5, 20 doc↔code tasks, vs `graphify-v2` | crosses 0 | **+$0.086 [+0.009, +0.164]** | **60% / 80%** | same |
| Haiku 4.5, 20 doc↔code tasks, vs `haiku-graphify-v2` | crosses 0 | crosses 0 | **55% / 75%** | same |

**Runtime levers**, measured on the same 45 code tasks with Sonnet 5. These arms add no index and no tool — they change only how `claude -p` is invoked, which is the one thing that has actually moved the numbers in this repository.

| setting | tokens | cost | accuracy (arm / reference) | wall median | report |
|---|---|---|---|---|---|
| `--effort medium`, vs `baseline` | **−81k [−138k, −31k]** | **−$0.049 [−0.082, −0.022]** | 80% / 84% | 16 s vs 29 s | [`results/levers`](results/levers/REPORT.md) |
| `--effort low`, vs `baseline` | **−133k [−192k, −80k]** | **−$0.087 [−0.119, −0.059]** | 80% / 84% | 16 s vs 29 s | same |
| `--effort medium`, vs `baseline-nosub` | crosses 0 | **+$0.023 [+0.002, +0.044]** | 80% / 84% | 16 s vs 33 s | same |
| `--effort low`, vs `baseline-nosub` | **−58k [−118k, −0.004k]** | crosses 0 | 80% / 84% | 16 s vs 33 s | same |
| Explore subagent pinned to Haiku, vs `baseline` | **+270k [+104k, +466k]** | crosses 0 | 80% / 84% | 20 s vs 29 s | same |
| Explore subagent pinned to Haiku, vs `baseline-nosub` | **+345k [+179k, +526k]** | **+$0.091 [+0.056, +0.132]** | 80% / 84% | 20 s vs 33 s | same |
| **both levers** (`--effort low` + no subagents), vs `baseline` | **−159k [−217k, −110k]** | **−$0.124 [−0.162, −0.092]** | 84% / 84% | 16 s vs 29 s | same |
| both levers, vs `baseline-nosub` | **−84k [−136k, −34k]** | **−$0.052 [−0.076, −0.030]** | 84% / 84% | 16 s vs 33 s | same |
| both levers, vs `--effort low` alone | **−26k [−53k, −2.6k]** | **−$0.037 [−0.050, −0.026]** | 84% / 80% | 16 s vs 16 s | same |
| lean tool allowlist, vs both levers | crosses 0 | crosses 0 | 82% / 84% | 18 s vs 16 s | [`results/lean`](results/lean/REPORT.md) |
| turn-economy `CLAUDE.md`, vs both levers | crosses 0 | crosses 0 | 84% / 84% | 17 s vs 16 s | same |
| Haiku 4.5 + no subagents, vs both levers | **+366k [+224k, +534k]** | crosses 0 | 82% / 84% | 55 s vs 16 s | same |
| Haiku + no subagents, vs `haiku-baseline` | crosses 0 | crosses 0 | 82% / 80% | 55 s vs 52 s | same |
| **all four levers at once**, vs both levers | **+253k [+126k, +400k]** | crosses 0 (−14%) | 76% / 84% | 44 s vs 16 s | same |
| all four, vs Haiku + no subagents | **−114k [−210k, −25k]** | **−$0.018 [−0.036, −0.003]** | 76% / 82% | 44 s vs 55 s | same |
| all four, vs `baseline` | crosses 0 | **−$0.140 [−0.180, −0.102]** | 76% / 84% | 44 s vs 29 s | same |

**Lowering reasoning effort is the only lever here that is cheaper *and* faster, but it cannot beat simply banning subagents.** Read the two levers on separate axes: at a fixed effort, banning subagents cuts tokens and cost but never wall time (+4 s at high, −0.5 s at low); at a fixed subagent setting, `--effort low` halves wall time whether or not subagents are allowed. The speed belongs to effort, the savings mostly to the ban, and the combination keeps both while recovering the two tasks low effort alone loses (see [`docs/report-levers-ja.html`](docs/report-levers-ja.html)). Against plain `baseline`, `--effort low` cuts tokens 25% and cost 26% with CIs clear of zero and roughly halves wall time; the thinking-token share falls monotonically (37% → 20% → 16%), which is what confirms the flag actually took effect rather than the arm merely writing less. Against the fairer `baseline-nosub` reference, `--effort medium` is *more* expensive and `--effort low` wins only on tokens — so `--disallowedTools Agent`, found in Phase 8, remains the strongest single lever measured here. The accuracy cost is two tasks (84% → 80%), both `locate`, and both effort arms lost the same two; at n=45 with one repetition that gap is not separable from noise.

**The two levers stack, but they overlap: together they save about three quarters of what their separate savings would suggest.** Applied at once, `--effort low` plus `--disallowedTools Agent` is the cheapest condition measured anywhere in this repository — 37% fewer tokens and 42% less cost than `baseline`, at the *same* 84% accuracy — yet that −159k is only 76% of the −209k the two arms' individual savings add up to, because both levers cut the same resource and the second one cannot re-cut what the first already removed. Each still earns its place: the combination beats `--effort low` alone by −26k/−$0.037 and `baseline-nosub` alone by −84k/−$0.052, both with CIs clear of zero. The accuracy cost of low effort also disappears here — with no subagent to delegate to, the main session searches for itself and recovers one of the two `locate` tasks `--effort low` alone was losing.

**Nothing beats those two levers, and the decomposition says why.** Restricting the tool set, telling the agent to spend fewer turns, and swapping in Haiku 4.5 were measured on the same 45 tasks: all three land with every CI crossing zero against `--effort low` + no subagents. `--tools Read,Grep,Glob,Bash,Edit` really does strip tool schemas from the request (`--tools ""` floors the prefix at 13.5k tokens versus 21.1k by default), but that particular allowlist measures ~620 tokens *larger* than just removing `Agent`, so there was never a fixed cost there to win — what it changes is behaviour, moving search from shell `grep` to the `Grep` tool. The turn-economy `CLAUDE.md` cost exactly zero accuracy (38/45, category for category) and still moved turns only −0.53, because the two existing levers had already pulled the median to 6. And Haiku is a third of the price but spends 2.8× the tokens, 2.2× the turns and 3.5× the wall time, which cancels out to the same bill at lower accuracy. Splitting `uncached_all` into fixed context (`first_turn_cache_creation` × turns) and the rest explains the dead end: **35% of what `effort-low-nosub` spends is the cost of merely holding a 6-turn session open**, versus 17% for `baseline` — the levers cut the moving half by 58% and cannot touch the fixed half from a prompt or a tool allowlist. Note that `first_turn_cache_creation` alone is *not* request size; a warm cache shifts tokens from creation to read, which is why the lean-tools row looks smaller there while its actual prefix is larger.

**The levers do compose once the model itself is weak.** `all-in` (Haiku + no subagents + lean tools + turn economy) posts the lowest median cost measured anywhere in this repository, $0.081, and beats `baseline` by 52% with a CI clear of zero — but not `effort-low-nosub`, against which its −14% cost crosses zero while accuracy falls 84% → 76% and wall time nearly triples. What is real is `all-in` versus Haiku-plus-no-subagents: −9.6% tokens and −7.3% cost, both CIs clear of zero. The same two levers that did nothing on Sonnet 5 do something on Haiku, which is consistent with the rest of this table: a cutting lever is worth exactly as much as the waste it has left to cut.

**Pinning exploration to Haiku works mechanically and still loses.** The project-local `.claude/agents/Explore.md` override fired on all 15 runs that delegated to `Explore` (Haiku carried 150k–3.35M tokens each, 54% of the arm's tokens and 28% of its cost, while the main session stayed on Sonnet), but a weak explorer searches inefficiently enough to erase its own price advantage: +59% tokens against `baseline` and +101% against `baseline-nosub`. The 8 runs that chose the `general-purpose` agent instead stayed on Sonnet entirely — the override covers `Explore` only.

Paired mean differences over tasks with 95% bootstrap CIs. Tokens are `uncached_equivalent_all`: input + cache write + cache read summed over every model in `modelUsage`, so subagent traffic counts.

Three findings behind the table:

- **Baseline's efficiency on code comes from Claude Code itself, not from reading less.** Sonnet delegates exploration to an Explore subagent in about half its runs and never reads much. Taking the subagent away made baseline *cheaper* (−75k tokens, −$0.073), and against that fairer reference graphify is clearly worse. graphify never spawned a subagent in 255 runs.
- **The doc-vs-code contradiction hunt is where the graph earns its keep.** Twelve contradictions were planted in the documentation. With graphify, Sonnet found them in 4 of 4 domain tasks (mean F1 0.94) versus 2 of 4 (0.68) without, at −29% cost with a CI that excludes zero. This is the only category where Sonnet's accuracy moved.
- **The problem is the shape, not the graph.** MemPalace indexes the same corpus by embedding + BM25 instead of by AST structure, and does worse than graphify: +138k tokens and +$0.14 against it on the code set, +246k against the fairer subagent-free baseline. Two reasons. Like graphify it stops the agent delegating (1 subagent in 45 runs, versus baseline's 31 in 65), and its hits are 16 KB chunks that the agent then re-opens with `Read` — so retrieval is *added to* file reading rather than replacing it. On doc↔code work it is also less accurate (60% vs graphify-v2's 80%), and the damage is concentrated in `reference` and `impact`: "top-k most similar" cannot answer "every file that references this symbol", which is exactly what an edge-walking graph is for.
- **Several graphify features never ran.** Across all graphify-arm runs the agent used `query`, `explain` and `path` only. `affected`, `god-nodes`, `save-result` and `reflect` were called zero times, so the cross-session memory loop was never under test. The strict hook is self-suppressing: the CLAUDE.md instruction makes the agent query first, and a recent query disables the block for 30 minutes.

A measurement lesson worth stating up front: the result JSON's `usage` block covers the main session only. On that metric graphify looks about +290% worse on code tasks, purely because baseline's subagent tokens go uncounted. Reports keep both rows so the distortion stays visible.

## What is compared

| Condition | What the agent gets |
|---|---|
| `baseline` | Plain Claude Code. `--setting-sources project` hides the user-level graphify skill; the project `CLAUDE.md` carries only the shared answer-format contract. |
| `graphify` / `graphify-v2` | Exactly what `graphify install --project` produces: the `## graphify` section in `CLAUDE.md`, the PreToolUse nudge hooks on `Bash|Grep` and `Read|Glob`, the project-local skill, plus a prebuilt frozen `graphify-out/`. v1 is the code-only graph; v2 adds semantic extraction of the docs. No `memory/` or `LESSONS.md` carry-over: every run starts from a fresh copy of the corpus. |
| `graphify-strict`, `-strict-v2` | Same plus `hook-guard read --strict`. |
| `baseline-nosub` | Baseline with `--disallowedTools Agent`. |
| `effort-medium`, `effort-low` | Baseline's overlay byte for byte, invoked with `--effort medium` / `low` instead of the default `high`. Nothing in the corpus copy differs, so `run.meta.json` records the effort that actually ran. |
| `haiku-explore` | Baseline's `CLAUDE.md` byte for byte plus one `.claude/agents/Explore.md` declaring `model: haiku`. A project agent named `Explore` overrides Claude Code's built-in, so delegated exploration runs on Haiku while the main session stays on Sonnet. No instruction text changes — the arm varies *who explores*, not what the agent is told. |
| `lean-tools` | `effort-low-nosub` plus `--tools Read,Grep,Glob,Bash,Edit`. `--tools` is an allowlist that *replaces* the built-in set and removes the other tools' schemas from the request, unlike `--allowedTools`, which only filters permissions. `Edit` stays because `fix` tasks are graded by running the test suite. |
| `few-turns` | `effort-low-nosub` with one overlay change: `CLAUDE.md` is baseline's file byte for byte plus a `## Working economy` section (locate with `Grep -n`, read line ranges, batch independent calls into one turn, never re-read, stop when the evidence suffices). The answer-format contract is untouched. |
| `haiku-nosub` | `baseline-nosub` on `claude-haiku-4-5`. No `--effort` override: Haiku 4.5 does not honour the flag (measured), so declaring one would record a treatment that never ran. |
| `all-in` | The union of the three above: Haiku, no subagents, the lean tool allowlist and the turn-economy `CLAUDE.md`. |
| `mempalace` / `mempalace-v2` | MemPalace 3.9.0: a `## mempalace` section in `CLAUDE.md` (baseline's text byte-for-byte plus that section) and the `mempalace-mcp` server reached via `--mcp-config --strict-mcp-config`, exposing `mempalace_search` over a prebuilt ChromaDB index. The index is built once per corpus generation and **cloned into a private temp directory per run**, never into the corpus copy. v1 indexes the code, v2 the code and `docs/`. |
| `haiku-*` | The same overlays with `claude-haiku-4-5`. |

All arms run `claude -p --output-format json` with effort `high`, the same turn and budget caps, and a shuffled task order. Metrics come from the result JSON (`usage`, `modelUsage`, `total_cost_usd`, `num_turns`) and the JSONL transcript (tool calls by name, tool-result bytes, `graph.json` direct reads, hook denials, graphify subcommands used).

## The corpus: Taskflow

An original, LLM-generated multi-tenant project/issue-management SaaS, built for this benchmark so the model cannot know it from training data.

| | |
|---|---|
| Code (`corpus-v1`) | Next.js 16.3.4 App Router with Server Actions and `proxy.ts`, React 19.2.8, TypeScript 5.9.3, Tailwind 4, Drizzle ORM + better-sqlite3, Zod 4, Vitest 4. 477 source and test files, 40,944 lines. Contract-first: types, schemas, Drizzle schema and the cross-cutting hubs (`can()`, event bus, feature flags, plan limits, tenant scoping, soft delete) were written first, then five workers filled disjoint directories. `tsc`, `eslint`, 617 tests, `next build` and a runtime smoke over all 34 routes pass. |
| Docs (`corpus-v2`) | 139 Markdown files, 261k words: requirements (168 `REQ-###`), basic and detailed design (228 `DES-###`), 22 ADRs, API catalogue, data dictionary, screen specs, test plan, runbooks, postmortems, decision log. 5,840 cross-references, every cited code path verified to exist (`pnpm docs:check`). 12 deliberate doc-vs-code contradictions, recorded outside the corpus in `tasks/keys/docs-discrepancies.json`. |
| Graph v1 | 2,545 nodes, 10,202 edges, 120 labeled communities, 4.6 s, no LLM. |
| Graph v2 | 3,245 nodes, 13,014 edges, 139 communities, 1,429 doc↔code edges. Docs extracted by Sonnet subagents per graphify's extraction spec, about $7. |

## Tasks

65 tasks in three files, all with mechanical or rubric keys (`pnpm keys:derive --check` reproduces all 34 derived keys).

| File | Tasks | Categories |
|---|---|---|
| [`tasks/tasks.json`](tasks/tasks.json) | 15 | locate, reference, explain, impact, fix (3 each) |
| [`tasks/tasks-ext.json`](tasks/tasks-ext.json) | 30 | same, 6 each |
| [`tasks/tasks-docs.json`](tasks/tasks-docs.json) | 20 | locate, reference, explain, impact, **discrepancy** (4 each) |

Graders: set F1 against key paths (locate, reference, impact, discrepancy), a blind Haiku judge with a 5-element rubric (explain), and an injected bug whose Vitest spec must go red → green (fix). Seven tasks are deliberately grep-trivial controls. Token savings are only claimed on the iso-accuracy subset, following [arXiv:2608.13568](https://arxiv.org/html/2608.13568).

## Running it

```bash
pnpm install
(cd corpus/taskflow && pnpm install --frozen-lockfile)
pnpm exec tsx scripts/patch-overlay.ts        # point the hooks at this machine's graphify

pnpm bench:pilot -- --only REF1-assertcan-callers,FIX1-issue-tenant-leak
nohup pnpm bench:full > results/full.log 2>&1 &                                   # code set 1
nohup env BENCH_RESULTS_DIR=results/ext pnpm bench:full -- --tasks tasks/tasks-ext.json > results/ext/full.log 2>&1 &
nohup env BENCH_RESULTS_DIR=results/structural pnpm bench:full -- --tasks tasks/tasks.json,tasks/tasks-ext.json \
  --conditions graphify-strict,baseline-nosub,haiku-baseline,haiku-graphify > results/structural/full.log 2>&1 &
nohup env BENCH_RESULTS_DIR=results/docs pnpm bench:full -- --tasks tasks/tasks-docs.json \
  --conditions baseline,graphify-v2,graphify-strict-v2,haiku-baseline,haiku-graphify-v2 > results/docs/full.log 2>&1 &

# MemPalace arms. Build the index once per corpus generation first; the code
# arms need a corpus WITHOUT docs/, which is what corpus-v1 was.
pnpm palace:build v1 && pnpm palace:build v2
nohup env BENCH_RESULTS_DIR=results/mempalace pnpm bench:full -- --tasks tasks/tasks.json,tasks/tasks-ext.json \
  --conditions mempalace,haiku-mempalace --reps 1 --concurrency 3 --corpus <corpus-v1-snapshot> > results/mempalace/full.log 2>&1 &
nohup env BENCH_RESULTS_DIR=results/mempalace pnpm bench:full -- --tasks tasks/tasks-docs.json \
  --conditions mempalace-v2,haiku-mempalace-v2 --reps 1 --concurrency 3 >> results/mempalace/full.log 2>&1 &

# Runtime levers. No index and no MCP server; the code arms need the same
# docs-free corpus-v1 snapshot the mempalace code arms used.
nohup env BENCH_RESULTS_DIR=results/levers pnpm bench:full -- --tasks tasks/tasks.json,tasks/tasks-ext.json \
  --conditions effort-medium,effort-low,haiku-explore,effort-low-nosub --reps 1 --concurrency 3 --corpus <corpus-v1-snapshot> > results/levers/full.log 2>&1 &

# Leaner still: tool allowlist, turn economy, the cheap model, and all of them
# at once. `scripts/run-lean.sh` is exactly this invocation.
nohup env BENCH_RESULTS_DIR=results/lean pnpm bench:full -- --tasks tasks/tasks.json,tasks/tasks-ext.json \
  --conditions lean-tools,few-turns,haiku-nosub,all-in --reps 1 --concurrency 3 --corpus <corpus-v1-snapshot> > results/lean/full.log 2>&1 &

pnpm bench:collect && pnpm bench:grade && pnpm bench:analyze && pnpm bench:report   # per results dir
pnpm bench:report:combined && pnpm bench:report:structural && pnpm bench:report:docs
pnpm bench:analyze:levers && pnpm bench:report:levers
pnpm bench:analyze:lean && pnpm bench:report:lean && python3 scripts/sanity-lean.py
```

Requirements: Node 25, pnpm 10, Claude Code 2.1.x logged in, `graphifyy==0.9.53`. Conditions are declared in `bench/conditions.ts`. Environment variables: `BENCH_MODEL`, `BENCH_EFFORT`, `BENCH_REPS`, `BENCH_MAX_BUDGET_USD`, `BENCH_RESULTS_DIR`.

## Layout

```
bench/       harness: run / matrix / collect / grade / analyze / report / conditions / features / speed (TypeScript, 274 tests)
corpus/      the frozen Taskflow app (code: corpus-v1) plus its docs/ layer (corpus-v2)
overlays/    per-condition files copied onto a fresh corpus clone before each run (v1, v2, strict deltas, mempalace)
tasks/       three task files, keys/, rubrics, bugs/*.patch, docs-discrepancies.json
results/     runs/ ext/ (code sets), structural/, docs/, combined/, mempalace/, levers/ — raw result.json + transcript.jsonl per run
.palaces/    gitignored MemPalace indexes; rebuild with `pnpm palace:build v1|v2` (stats in docs/plan/MEMPALACE.md)
docs/plan/   design, implementation plan, research notes, corpus and graph build records (Japanese)
```

## Caveats

- One corpus, one repetition per task. Bootstrap CIs resample tasks, so within-task run noise is unmeasured. Treat direction, not magnitude, as the finding.
- The arms differ in more than the graph: the graphify arms carry the skill text and per-read nudges, and they never spawn subagents. That is what a real user gets, so nothing is subtracted.
- The strict-hook result is a null about a knob that never engaged, not evidence that forcing graph-first exploration does nothing.
- `graph.json` (4.6 MB v1, 6.2 MB v2) was opened directly in a handful of graphify runs; the nudge hooks do not guard `graphify-out/`.
- Doc extraction cost is estimated at chars/4, not metered.
- MemPalace is a **conversation-memory** system; this benchmark repurposes its secondary project-file indexing for code search. Its published 96.6% R@5 is a LongMemEval conversation-recall figure and has nothing to do with what is measured here. Only 1 of its 45 MCP tools (`mempalace_search`) was ever called, so its cross-session memory loop is as untested as graphify's `save-result`/`reflect`.
- The `mempalace` arms run with `--strict-mcp-config` and so are the only arms that do not also carry the measuring host's own MCP servers (present elsewhere as deferred names only). Fixed-overhead comparisons include that asymmetry.
- Wall-clock numbers in the `--speed` section were measured at concurrency 3 on one machine and are secondary. Per-tool-call latency is the sturdier half: it shows `mempalace_search` at ~43 ms against `graphify query` at ~294 ms, and graphify's PreToolUse hook adding ~55 ms to every `Read`.
- `graphify benchmark` numbers such as "70x fewer tokens" are synthetic estimates from node counts and fixed sample questions. They are not comparable to these measurements.
- The `--effort` arms are compared against a `baseline` measured at effort `high`, which is this harness's default and not Claude Code's. They say what lowering effort does here, not what a default-configured session would spend.
- `--effort` and `--disallowedTools Agent` both reduce the same thing — how much exploring and thinking the agent does — so their savings are not independent, and this benchmark has not measured the two applied together.
- The Haiku-explore override covers the `Explore` agent only. In 8 of 23 delegating runs the model chose the `general-purpose` agent, which inherits the main model, so the arm is a partial treatment by construction.
