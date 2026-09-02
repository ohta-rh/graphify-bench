# graphify-bench

Does [graphify](https://github.com/Graphify-Labs/graphify) (an AST-derived code knowledge graph with a `graphify query` CLI) reduce the tokens a Claude Code agent spends on a mid-size Next.js codebase? This repository measures it with real headless Claude Code sessions instead of graphify's own synthetic `graphify benchmark` estimate.

## Headline result (15 tasks × 2 conditions, 1 run each, claude-sonnet-5)

**No detectable difference in total tokens; graphify used more turns and no subagents, baseline used fewer turns and spawned a subagent in 10 of 15 runs.**

| condition | tokens, all models, median | cost, median | turns, median | subagent runs | accuracy |
|---|---|---|---|---|---|
| baseline | 259,513 | $0.208 | 4 | 10 / 15 | 13 / 15 |
| graphify | 288,502 | $0.184 | 10 | 0 / 15 | 12 / 15 |

Paired difference (graphify − baseline), bootstrap 95% CI over tasks:

| metric | mean diff | 95% CI | reading |
|---|---|---|---|
| tokens (all models) | +30,228 | [−52,259, +125,341] | crosses 0 |
| cost | −$0.026 | [−0.064, +0.010] | crosses 0 |
| turns | +8.4 | [+4.5, +12.6] | graphify higher |
| cost, iso-accuracy subset (12 tasks) | −$0.039 | [−0.081, −0.001] | graphify lower |

By category the picture splits: **explain** tasks were 28% cheaper with graphify (CI excludes 0), **fix** tasks used 40% more tokens with graphify (CI excludes 0), and locate / reference / impact showed no detectable difference.

One measurement lesson is worth stating up front. The result JSON's `usage` block covers the main session only. On that metric graphify looks +350% worse, because baseline's subagent tokens go uncounted. Summing `modelUsage` across all models removes the artifact and the effect disappears. The report keeps both rows so the distortion is visible.

Full numbers, per-category tables, and every raw transcript: [`results/REPORT.md`](results/REPORT.md), [`results/summary.csv`](results/summary.csv), [`results/runs/`](results/runs/). A second 30-task set and a combined 45-task analysis are in progress.

## What is compared

| Condition | What the agent gets |
|---|---|
| `baseline` | Plain Claude Code. `--setting-sources project` hides the user-level graphify skill; the project `CLAUDE.md` carries only the shared answer-format contract. |
| `graphify` | Exactly what `graphify install --project` produces: the `## graphify` section in `CLAUDE.md`, the PreToolUse nudge hooks on `Bash|Grep` and `Read|Glob`, the project-local skill, plus a prebuilt, frozen `graphify-out/` (graph.json, GRAPH_REPORT.md, labeled communities). No `memory/` or `LESSONS.md` carry-over: every run starts from a fresh copy of the corpus. |

Both arms run `claude -p --output-format json` with the same model, effort `high`, the same turn and budget caps, and a shuffled task order. Metrics come from the result JSON (`usage`, `modelUsage`, `total_cost_usd`, `num_turns`) and the JSONL transcript (tool calls by name, tool-result bytes, whether `graph.json` was read directly, whether the skill fired).

## The corpus: Taskflow

An original, LLM-generated multi-tenant project/issue-management SaaS built for this benchmark so that the model cannot know it from training data.

| | |
|---|---|
| Stack | Next.js 16.3.4 (App Router, Server Actions, `proxy.ts`), React 19.2.8, TypeScript 5.9.3, Tailwind 4, Drizzle ORM + better-sqlite3, Zod 4, Vitest 4 |
| Size | 477 source and test files, 40,944 lines, frozen at tag `corpus-v1` (tree hash in [`docs/plan/CORPUS.md`](docs/plan/CORPUS.md)) |
| Structure | Contract-first: types, Zod schemas, Drizzle schema, and the cross-cutting hubs (`can()` permissions, event bus, feature flags, plan limits, tenant scoping, soft delete) were written first, then five workers filled disjoint directories against that contract |
| Gates | `tsc`, `eslint`, 617 Vitest tests, `next build`, and a runtime smoke over all 34 routes pass |
| Graph | 2,545 nodes, 10,202 edges, 120 labeled communities, built in 4.6 s with no LLM |

## Tasks

15 tasks, 3 per category, in [`tasks/tasks.json`](tasks/tasks.json). Keys for reference and impact tasks are derived mechanically with ts-morph (`pnpm keys:derive --check` reproduces them).

| Category | Grader | Example |
|---|---|---|
| locate | set F1 vs key files | "Where is a webhook refused because the plan's quota is used up?" |
| reference | set F1, exhaustive callers | every file calling `assertCan()` |
| explain | blind LLM judge (Haiku) with a 5-element rubric | issue creation → permission → repository → event bus → notification fan-out |
| impact | set F1, files that must change | adding a field to `PlanLimits` |
| fix | injected bug, Vitest spec must go red → green | tenant-scope predicate dropped from `findIssueById` |

Two tasks are deliberately grep-trivial so the report can show where tool value vanishes. Token savings are only claimed on the iso-accuracy subset (both arms correct), following [arXiv:2608.13568](https://arxiv.org/html/2608.13568).

## Running it

```bash
pnpm install
(cd corpus/taskflow && pnpm install --frozen-lockfile)
pnpm exec tsx scripts/patch-overlay.ts        # point the hook at this machine's graphify

pnpm bench:pilot -- --only REF1-assertcan-callers,FIX1-issue-tenant-leak
nohup pnpm bench:full > results/full.log 2>&1 &   # resumable; one dir per run
pnpm bench:collect && pnpm bench:grade && pnpm bench:analyze && pnpm bench:report
```

Requirements: Node 25, pnpm 10, Claude Code 2.1.x logged in, `graphifyy==0.9.53` (`uv tool install graphifyy==0.9.53`). Key environment variables: `BENCH_MODEL`, `BENCH_EFFORT`, `BENCH_REPS`, `BENCH_MAX_BUDGET_USD`, `BENCH_RESULTS_DIR`. See [`docs/plan/implementation-plan.md`](docs/plan/implementation-plan.md) §9. The committed 30-run set cost $7.93 and took 22 minutes at concurrency 2.

## Layout

```
bench/       harness: run / matrix / collect / grade / analyze / report (TypeScript, vitest-tested)
corpus/      the frozen Taskflow app (corpus-v1)
overlays/    per-condition files copied onto a fresh corpus clone before each run
tasks/       tasks.json, keys/, rubrics, bugs/*.patch
results/     raw result.json + transcript.jsonl per run, summary.csv, REPORT.md
docs/plan/   design, implementation plan, research notes (Japanese)
```

## Caveats

- One corpus, one model, one repetition per task. Bootstrap CIs over 15 paired differences are wide; treat the direction, not the magnitude, as the finding.
- The two arms differ in more than the graph: the graphify arm also carries the skill text and per-tool nudges in context, and it never spawned subagents. Both are part of what a real user gets, so they are not subtracted.
- Two graphify runs opened `graph.json` (4.6 MB) directly; the nudge hooks do not guard `graphify-out/`.
- `graphify benchmark` numbers such as "70x fewer tokens" are synthetic estimates from node counts and fixed sample questions. They are not comparable to these measurements.
