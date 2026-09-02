# graphify-bench

Does [graphify](https://github.com/Graphify-Labs/graphify) (an AST-derived code knowledge graph with a `graphify query` CLI) reduce the tokens a Claude Code agent spends on a mid-size Next.js codebase? This repository measures it with real headless Claude Code sessions instead of graphify's own synthetic `graphify benchmark` estimate.

## Headline result

45 tasks × 2 conditions, one run each, `claude-sonnet-5` at effort `high`. 90 runs, $22.35 total.

**No detectable difference in total tokens or cost. graphify used about twice as many turns and slightly lower accuracy; baseline delegated to a subagent in half of its runs, graphify never did.**

| condition | tokens (all models), median | cost, median | turns, median | runs with a subagent | accuracy |
|---|---|---|---|---|---|
| baseline | 260,561 | $0.197 | 5 | 23 / 45 | 38 / 45 (84%) |
| graphify | 288,502 | $0.191 | 9 | 0 / 45 | 35 / 45 (78%) |

Paired difference (graphify − baseline), bootstrap 95% CI over tasks:

| metric | mean diff | 95% CI | reading |
|---|---|---|---|
| tokens, all models | +32,097 | [−7,762, +74,822] | crosses 0 |
| cost | −$0.006 | [−0.028, +0.016] | crosses 0 |
| turns | +6.7 | [+4.4, +9.5] | graphify higher |
| tokens, iso-accuracy subset (35 tasks) | +19,314 | [−29,852, +75,724] | crosses 0 |
| cost, iso-accuracy subset | −$0.021 | [−0.044, +0.002] | crosses 0 |

Every per-category token CI also crosses zero (explain −28k, locate −9k, fix +57k, impact +67k, reference +74k). The two task sets, written independently, agree (+30k vs +33k), so pooling them is defensible. On the deliberately grep-trivial tasks graphify is strictly more expensive (+$0.025 [+0.003, +0.055]).

Why so little effect, in one paragraph. Baseline rarely reads files: Claude Code delegates exploration to an Explore subagent and receives a summary. graphify does not replace reading, it precedes it: `graphify query` returns node and edge labels with line numbers, so the agent still reads the code afterwards, and the PreToolUse nudge is re-injected on each of those reads. More turns of mostly cached context cost almost nothing in dollars, which is why cost is flat while turns double.

A measurement lesson worth stating up front: the result JSON's `usage` block covers the main session only. On that metric graphify looks +290% worse, because baseline's subagent tokens go uncounted. Summing `modelUsage` across all models removes the artifact and the effect disappears. Reports keep both rows so the distortion stays visible.

Reports and raw data:

| | |
|---|---|
| [`results/combined/REPORT.md`](results/combined/REPORT.md) | 45 tasks, all sections, set-1 vs ext and easy vs rest breakdowns |
| [`results/REPORT.md`](results/REPORT.md) | first set, 15 tasks |
| [`results/ext/REPORT.md`](results/ext/REPORT.md) | second set, 30 tasks |
| `results/**/runs/<run-id>/` | `result.json`, full `transcript.jsonl`, `metrics.json`, `grade.json` per run |

## What is compared

| Condition | What the agent gets |
|---|---|
| `baseline` | Plain Claude Code. `--setting-sources project` hides the user-level graphify skill; the project `CLAUDE.md` carries only the shared answer-format contract. |
| `graphify` | Exactly what `graphify install --project` produces: the `## graphify` section in `CLAUDE.md`, the PreToolUse nudge hooks on `Bash|Grep` and `Read|Glob`, the project-local skill, plus a prebuilt, frozen `graphify-out/` (graph.json, GRAPH_REPORT.md, labeled communities). No `memory/` or `LESSONS.md` carry-over: every run starts from a fresh copy of the corpus. |

Both arms run `claude -p --output-format json` with the same model, effort, turn and budget caps, and a shuffled task order. Metrics come from the result JSON (`usage`, `modelUsage`, `total_cost_usd`, `num_turns`) and the JSONL transcript (tool calls by name, tool-result bytes, whether `graph.json` was read directly, whether the skill fired).

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

45 tasks, 9 per category: [`tasks/tasks.json`](tasks/tasks.json) (15) and [`tasks/tasks-ext.json`](tasks/tasks-ext.json) (30). Keys for reference and impact tasks are derived mechanically with ts-morph (`pnpm keys:derive --check` reproduces all 18). Injected bugs each break exactly one existing test and pass `tsc`.

A third set, [`tasks/tasks-docs.json`](tasks/tasks-docs.json) (20), asks doc↔code questions over the `corpus/taskflow/docs/` layer and swaps `fix` for a new `discrepancy` category — "within this domain, which documents state something the code does not do", against 12 planted contradictions. Its keys are derived mechanically too, from the documents' own `Implemented by` / `Verified by` / `Decided in` fields and id-definition headings. See [`tasks/README.md`](tasks/README.md) and [`docs/plan/GRAPH-V2.md`](docs/plan/GRAPH-V2.md).

| Category | Grader | Example |
|---|---|---|
| locate | set F1 vs key files | "Where is a webhook refused because the plan's quota is used up?" |
| reference | set F1, exhaustive callers | every file calling `assertCan()` |
| explain | blind LLM judge (Haiku) with a 5-element rubric | issue creation → permission → repository → event bus → notification fan-out |
| impact | set F1, files that must change | adding a member to the `Role` union |
| fix | injected bug, Vitest spec must go red → green | tenant-scope predicate dropped from `findIssueById` |

Five tasks are deliberately grep-trivial so the report can show where tool value vanishes. Token savings are only claimed on the iso-accuracy subset (both arms correct), following [arXiv:2608.13568](https://arxiv.org/html/2608.13568).

## Running it

```bash
pnpm install
(cd corpus/taskflow && pnpm install --frozen-lockfile)
pnpm exec tsx scripts/patch-overlay.ts        # point the hook at this machine's graphify

pnpm bench:pilot -- --only REF1-assertcan-callers,FIX1-issue-tenant-leak
nohup pnpm bench:full > results/full.log 2>&1 &                       # set 1, resumable
nohup env BENCH_RESULTS_DIR=results/ext pnpm bench:full -- --tasks tasks/tasks-ext.json > results/ext/full.log 2>&1 &
pnpm bench:collect && pnpm bench:grade && pnpm bench:analyze && pnpm bench:report
pnpm bench:report:combined                    # 45-task report into results/combined
```

Requirements: Node 25, pnpm 10, Claude Code 2.1.x logged in, `graphifyy==0.9.53` (`uv tool install graphifyy==0.9.53`). Key environment variables: `BENCH_MODEL`, `BENCH_EFFORT`, `BENCH_REPS`, `BENCH_MAX_BUDGET_USD`, `BENCH_RESULTS_DIR`. See [`docs/plan/implementation-plan.md`](docs/plan/implementation-plan.md) §9. The 90 committed runs took about an hour at concurrency 2.

## Layout

```
bench/       harness: run / matrix / collect / grade / analyze / report (TypeScript, vitest-tested)
corpus/      the frozen Taskflow app (code: corpus-v1) plus its docs/ layer (corpus-v2)
overlays/    per-condition files copied onto a fresh corpus clone before each run
             (bench/conditions.ts layers several of them for the delta arms)
tasks/       tasks.json, tasks-ext.json, tasks-docs.json, keys/, rubrics, bugs/*.patch
results/     set 1 (results/), set 2 (results/ext/), pooled (results/combined/)
docs/plan/   design, implementation plan, research notes (Japanese)
```

## Caveats

- One corpus, one model, one repetition per task. Within-task run noise is unmeasured; treat direction, not magnitude, as the finding.
- The two arms differ in more than the graph: the graphify arm also carries the skill text and per-tool nudges in context, and it never spawned subagents. Both are part of what a real user gets, so they are not subtracted.
- Four graphify runs opened `graph.json` (4.6 MB) directly; the nudge hooks do not guard `graphify-out/`.
- Conditions not tested that could change the picture: strict hook mode (first raw read blocked), a model that reads files greedily (prior work found Haiku benefited from semantic tools where Sonnet did not), a much larger corpus where grep is noisier.
- `graphify benchmark` numbers such as "70x fewer tokens" are synthetic estimates from node counts and fixed sample questions. They are not comparable to these measurements.
