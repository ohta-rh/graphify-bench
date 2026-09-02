# graphify-bench results

Generated 2026-09-02T03:35:44.890Z. 30 runs over 15 tasks, conditions: baseline, graphify.

## 1. Environment

- Claude Code: `2.1.258 (Claude Code)`
- graphify: `graphify 0.9.53`
- Node: `v25.5.0` / pnpm `10.28.2`
- Platform: `darwin 25.2.0 arm64`
- Model: `claude-sonnet-5`, effort `high`, --max-turns 60, --max-budget-usd 4

- Bootstrap: B=2000, percentile 95% CI, seed `graphify-bench-bootstrap`, resampled over **tasks**.
- Corpus: `corpus-v1`, tree hash (sha256) `4148d9b26fb31b95ab8424af1f88cfc7741bb655b3ad3bbb557a8c3c516c12da` (source: `docs/plan/CORPUS.md`).
- Report generated: 2026-09-02.

## 2. Overall

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 15 | **259,513** (216,927–575,709) | 120,276 | 0.208 | 4.0 | 10 in 10 run(s) | 10 | 0 | 0 | 27 | 0 | 86.7% (13/15) | 416,732 |
| graphify | 15 | **288,502** (231,038–483,621) | 287,545 | 0.184 | 10.0 | 0 in 0 run(s) | 66 | 0 | 0 | 78 | 24 | 80.0% (12/15) | 451,734 |

**`uncached_all` (PRIMARY) = Σ over every entry of `modelUsage` of (inputTokens + cacheReadInputTokens + cacheCreationInputTokens)** — it covers the main session *and* any subagent, so it is commensurable with `total_cost_usd`. `uncached_main` (secondary) is the same sum taken from `usage.*`, which the result JSON populates for the **main session only**; a run that spawned a subagent therefore reports less information volume there than it actually consumed. The `subagents` column lets the two be reconciled. Tool columns are totals across all runs of the condition. T2S (tokens-to-success) = total `uncached_all` of successful runs / number of successful runs.

Fixed overhead, reported separately so readers can subtract it (architecture.md §5):

| condition | first-turn cache_creation (median) |
|---|---|
| baseline | 10,351 |
| graphify | 10,934 |

## 3. Paired difference (graphify − baseline), all tasks

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 15 | 30,227.9 | [-52,259.2, 125,341.4] | 14.5% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 15 | 282,127.4 | [142,233.7, 456,453.0] | 350.0% | graphify higher |
| total_cost_usd | 15 | -0.0257 | [-0.0635, 0.0095] | -1.3% | **CI crosses 0 — no detectable difference** |
| num_turns | 15 | 8.4 | [4.5, 12.6] | 345.5% | graphify higher |

> **Why the two token rows disagree.** Subagent use is asymmetric between the arms (baseline 10/15 runs, graphify 0/15). `uncached_equivalent` cannot see a subagent's tokens, so it charges that work to nobody and makes the subagent-spawning arm look cheap; `uncached_equivalent_all` counts it. **Read the `_all` row** — the main-only row is retained only to show the size of the distortion.

## 4. Iso-accuracy subset

Tasks where every graded run of both conditions succeeded (12/15): `EXP1-issue-create-flow`, `EXP2-comment-mention-notify`, `EXP3-digest-pipeline`, `FIX1-issue-tenant-leak`, `FIX2-project-quota-off-by-one`, `FIX3-board-shows-archived`, `IMP1-planlimits-field`, `IMP3-limited-resource-union`, `LOC1-shortcut-match`, `REF1-assertcan-callers`, `REF2-would-exceed-limit-callers`, `REF3-issue-created-subscribers`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 12 | **290,692** (231,394–611,014) | 149,051 | 0.216 | 4.5 | 8 in 8 run(s) | 8 | 0 | 0 | 23 | 0 | 100.0% (12/12) | 429,833 |
| graphify | 12 | **353,026** (209,415–535,331) | 352,021 | 0.208 | 11.5 | 0 in 0 run(s) | 63 | 0 | 0 | 65 | 17 | 100.0% (12/12) | 451,734 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 21,900.3 | [-81,233.9, 139,612.3] | 7.1% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 12 | 311,111.7 | [124,920.9, 527,851.8] | 388.0% | graphify higher |
| total_cost_usd | 12 | -0.0392 | [-0.0806, -0.0006] | -9.8% | graphify lower |
| num_turns | 12 | 9.2 | [4.1, 14.4] | 389.5% | graphify higher |

## 5. By category

### explain (3 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 3 | -184,399.7 | [-250,941.0, -110,470.0] | -28.5% | graphify lower |
| uncached_equivalent | 3 | 368,993.0 | [154,065.0, 617,109.0] | 423.9% | graphify higher |
| total_cost_usd | 3 | -0.1287 | [-0.1937, -0.0774] | -28.2% | graphify lower |
| num_turns | 3 | 17.0 | [8.0, 25.0] | 633.3% | graphify higher |

### fix (3 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 3 | 241,179.3 | [30,035.0, 516,758.0] | 40.4% | graphify higher |
| uncached_equivalent | 3 | 713,553.3 | [326,929.0, 1,218,267.0] | 509.5% | graphify higher |
| total_cost_usd | 3 | 0.0065 | [-0.0849, 0.0793] | 2.6% | **CI crosses 0 — no detectable difference** |
| num_turns | 3 | 15.7 | [8.0, 23.0] | 384.4% | graphify higher |

### impact (3 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 3 | -2,986.7 | [-98,447.0, 119,810.0] | 15.9% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 3 | -2,986.7 | [-98,447.0, 119,810.0] | 16.1% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 3 | 0.0001 | [-0.0700, 0.0765] | 17.7% | **CI crosses 0 — no detectable difference** |
| num_turns | 3 | 0.0 | [-2.0, 3.0] | 9.9% | **CI crosses 0 — no detectable difference** |

### locate (3 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 3 | 26,077.3 | [7,051.0, 63,755.0] | 13.1% | graphify higher |
| uncached_equivalent | 3 | 128,729.0 | [7,426.0, 198,105.0] | 166.4% | graphify higher |
| total_cost_usd | 3 | 0.0063 | [-0.0039, 0.0120] | 6.1% | **CI crosses 0 — no detectable difference** |
| num_turns | 3 | 4.0 | [-1.0, 7.0] | 137.8% | **CI crosses 0 — no detectable difference** |

### reference (3 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 3 | 71,269.3 | [-12,114.0, 172,030.0] | 31.4% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 3 | 202,348.3 | [-12,114.0, 363,824.0] | 634.0% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 3 | -0.0130 | [-0.0335, 0.0174] | -4.7% | **CI crosses 0 — no detectable difference** |
| num_turns | 3 | 5.3 | [-1.0, 10.0] | 561.9% | **CI crosses 0 — no detectable difference** |

## 6. Counter-productive cases and subagent use

- `baseline`: **10** subagent(s) spawned across **10**/15 run(s). T2S all-model 416,732 vs main-session-only 134,079.
- `graphify`: **0** subagent(s) spawned across **0**/15 run(s). T2S all-model 451,734 vs main-session-only 450,741.
- Runs that opened `graphify-out/graph.json` directly: **2** (`EXP3-digest-pipeline__graphify__r1`, `IMP2-rename-issue-created__graphify__r1`)
- graphify-condition runs that never invoked the `graphify` CLI (nudge ignored): **0**

## 7. Failed and ungraded runs

Harness failures (`is_error`, or `terminal_reason` other than `completed`): **0**. The table below also lists runs that completed normally but did not meet their grader's success threshold — those are accuracy results, not execution problems.

| run_id | condition | task | is_error | terminal_reason |
|---|---|---|---|---|
| `IMP2-rename-issue-created__baseline__r1` | baseline | IMP2-rename-issue-created | false | completed |
| `IMP2-rename-issue-created__graphify__r1` | graphify | IMP2-rename-issue-created | false | completed |
| `LOC2-webhook-plan-cap__baseline__r1` | baseline | LOC2-webhook-plan-cap | false | completed |
| `LOC2-webhook-plan-cap__graphify__r1` | graphify | LOC2-webhook-plan-cap | false | completed |
| `LOC3-digest-window__graphify__r1` | graphify | LOC3-digest-window | false | completed |

## 8. Limitations

- N = 30 runs over 15 tasks; a single corpus and a single model. These results do not generalize to other codebases or models.
- Bootstrap resamples tasks, so the interval reflects task-to-task variation, not within-task run noise.
- Where a CI crosses zero the honest reading is "no difference detected at this N", not "no difference exists".
- The fixed ~21k-token system-prompt/tool-definition overhead is included in both arms and not subtracted (see §2).
- **1 repetition per (task × condition)**: within-task run-to-run variance is unmeasured, so any single per-task difference may be run noise.
- Subagent traffic is counted in `uncached_all`, but a subagent's tool calls never reach the parent transcript, so the tool-call columns stay main-session-only.
- Raw per-run data lives in `results/runs/<run-id>/` and `results/summary.csv`.
