# graphify-bench

Does [graphify](https://github.com/Graphify-Labs/graphify) (a code and document knowledge graph with a `graphify query` CLI) reduce the tokens a Claude Code agent spends on a mid-size Next.js codebase? This repository measures it with real headless Claude Code sessions instead of graphify's own synthetic `graphify benchmark` estimate.

## Headline

370 runs, 65 tasks, 9 conditions, one repetition each, about $80 of API spend. Every run's `result.json` and full transcript is committed.

**For Sonnet 5 on a code-only corpus, graphify changes nothing measurable. It starts paying off when the explorer is weak (Haiku 4.5) or when the questions span documentation and code, and it is clearly counter-productive when a literal grep would do.**

| setting | tokens (graphify − baseline) | cost | accuracy (graphify / baseline) | report |
|---|---|---|---|---|
| Sonnet 5, 45 code tasks | +32k [−8k, +75k], crosses 0 | −$0.006, crosses 0 | 78% / 84% | [`results/combined`](results/combined/REPORT.md) |
| Sonnet 5, 45 code tasks, baseline without subagents | +107k [+38k, +180k], graphify higher | +$0.066 [+0.037, +0.101] | 78% / 84% | [`results/structural`](results/structural/REPORT.md) |
| Sonnet 5, strict hook (first raw read blocked) | no change vs plain graphify; the block never fired in 45 runs | | 78% | same |
| Haiku 4.5, 45 code tasks | **−119k [−245k, −12k]** | −$0.016, crosses 0 | 82% / 80% | same |
| Sonnet 5, 20 doc↔code tasks (corpus with 139 spec/design docs) | −129k [−325k, +33k], crosses 0 | **−$0.084 [−0.180, −0.005]** | **80% / 70%** | [`results/docs`](results/docs/REPORT.md) |
| Haiku 4.5, 20 doc↔code tasks | **−161k [−317k, −25k]** | **−$0.030 [−0.060, −0.004]** | 75% / 80% | same |

Paired mean differences over tasks with 95% bootstrap CIs. Tokens are `uncached_equivalent_all`: input + cache write + cache read summed over every model in `modelUsage`, so subagent traffic counts.

Three findings behind the table:

- **Baseline's efficiency on code comes from Claude Code itself, not from reading less.** Sonnet delegates exploration to an Explore subagent in about half its runs and never reads much. Taking the subagent away made baseline *cheaper* (−75k tokens, −$0.073), and against that fairer reference graphify is clearly worse. graphify never spawned a subagent in 255 runs.
- **The doc-vs-code contradiction hunt is where the graph earns its keep.** Twelve contradictions were planted in the documentation. With graphify, Sonnet found them in 4 of 4 domain tasks (mean F1 0.94) versus 2 of 4 (0.68) without, at −29% cost with a CI that excludes zero. This is the only category where Sonnet's accuracy moved.
- **Several graphify features never ran.** Across all graphify-arm runs the agent used `query`, `explain` and `path` only. `affected`, `god-nodes`, `save-result` and `reflect` were called zero times, so the cross-session memory loop was never under test. The strict hook is self-suppressing: the CLAUDE.md instruction makes the agent query first, and a recent query disables the block for 30 minutes.

A measurement lesson worth stating up front: the result JSON's `usage` block covers the main session only. On that metric graphify looks about +290% worse on code tasks, purely because baseline's subagent tokens go uncounted. Reports keep both rows so the distortion stays visible.

## What is compared

| Condition | What the agent gets |
|---|---|
| `baseline` | Plain Claude Code. `--setting-sources project` hides the user-level graphify skill; the project `CLAUDE.md` carries only the shared answer-format contract. |
| `graphify` / `graphify-v2` | Exactly what `graphify install --project` produces: the `## graphify` section in `CLAUDE.md`, the PreToolUse nudge hooks on `Bash|Grep` and `Read|Glob`, the project-local skill, plus a prebuilt frozen `graphify-out/`. v1 is the code-only graph; v2 adds semantic extraction of the docs. No `memory/` or `LESSONS.md` carry-over: every run starts from a fresh copy of the corpus. |
| `graphify-strict`, `-strict-v2` | Same plus `hook-guard read --strict`. |
| `baseline-nosub` | Baseline with `--disallowedTools Agent`. |
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

pnpm bench:collect && pnpm bench:grade && pnpm bench:analyze && pnpm bench:report   # per results dir
pnpm bench:report:combined && pnpm bench:report:structural && pnpm bench:report:docs
```

Requirements: Node 25, pnpm 10, Claude Code 2.1.x logged in, `graphifyy==0.9.53`. Conditions are declared in `bench/conditions.ts`. Environment variables: `BENCH_MODEL`, `BENCH_EFFORT`, `BENCH_REPS`, `BENCH_MAX_BUDGET_USD`, `BENCH_RESULTS_DIR`.

## Layout

```
bench/       harness: run / matrix / collect / grade / analyze / report / conditions (TypeScript, 196 tests)
corpus/      the frozen Taskflow app (code: corpus-v1) plus its docs/ layer (corpus-v2)
overlays/    per-condition files copied onto a fresh corpus clone before each run (v1, v2, strict deltas)
tasks/       three task files, keys/, rubrics, bugs/*.patch, docs-discrepancies.json
results/     runs/ ext/ (code sets), structural/, docs/, combined/ — raw result.json + transcript.jsonl per run
docs/plan/   design, implementation plan, research notes, corpus and graph build records (Japanese)
```

## Caveats

- One corpus, one repetition per task. Bootstrap CIs resample tasks, so within-task run noise is unmeasured. Treat direction, not magnitude, as the finding.
- The arms differ in more than the graph: the graphify arms carry the skill text and per-read nudges, and they never spawn subagents. That is what a real user gets, so nothing is subtracted.
- The strict-hook result is a null about a knob that never engaged, not evidence that forcing graph-first exploration does nothing.
- `graph.json` (4.6 MB v1, 6.2 MB v2) was opened directly in a handful of graphify runs; the nudge hooks do not guard `graphify-out/`.
- Doc extraction cost is estimated at chars/4, not metered.
- `graphify benchmark` numbers such as "70x fewer tokens" are synthetic estimates from node counts and fixed sample questions. They are not comparable to these measurements.
