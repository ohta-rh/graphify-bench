# graphify-bench results

Generated 2026-09-02T04:48:54.916Z. 60 runs over 30 tasks, conditions: baseline, graphify.

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
| baseline | 30 | **264,990** (200,807–401,224) | 156,888 | 0.173 | 5.0 | 13 in 13 run(s) | 58 | 0 | 0 | 79 | 0 | 83.3% (25/30) | 381,393 |
| graphify | 30 | **289,189** (178,121–470,469) | 288,194 | 0.202 | 8.5 | 0 in 0 run(s) | 125 | 0 | 0 | 130 | 59 | 76.7% (23/30) | 417,147 |

**`uncached_all` (PRIMARY) = Σ over every entry of `modelUsage` of (inputTokens + cacheReadInputTokens + cacheCreationInputTokens)** — it covers the main session *and* any subagent, so it is commensurable with `total_cost_usd`. `uncached_main` (secondary) is the same sum taken from `usage.*`, which the result JSON populates for the **main session only**; a run that spawned a subagent therefore reports less information volume there than it actually consumed. The `subagents` column lets the two be reconciled. Tool columns are totals across all runs of the condition. T2S (tokens-to-success) = total `uncached_all` of successful runs / number of successful runs.

Fixed overhead, reported separately so readers can subtract it (architecture.md §5):

| condition | first-turn cache_creation (median) |
|---|---|
| baseline | 10,364 |
| graphify | 10,945 |

## 3. Paired difference (graphify − baseline), all tasks

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 30 | 33,032.0 | [-12,120.1, 80,195.6] | 19.0% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 30 | 190,937.9 | [94,118.4, 317,434.0] | 259.5% | graphify higher |
| total_cost_usd | 30 | 0.0034 | [-0.0241, 0.0311] | 12.0% | **CI crosses 0 — no detectable difference** |
| num_turns | 30 | 5.9 | [3.1, 9.3] | 259.3% | graphify higher |

> **Why the two token rows disagree.** Subagent use is asymmetric between the arms (baseline 13/30 runs, graphify 0/30). `uncached_equivalent` cannot see a subagent's tokens, so it charges that work to nobody and makes the subagent-spawning arm look cheap; `uncached_equivalent_all` counts it. **Read the `_all` row** — the main-only row is retained only to show the size of the distortion.

## 4. Iso-accuracy subset

Tasks where every graded run of both conditions succeeded (23/30): `XEXP1-webhook-delivery`, `XEXP2-invitation-lifecycle`, `XEXP3-plan-change`, `XEXP4-signin-to-actor`, `XEXP5-search-index`, `XEXP6-overdue-sweep`, `XFIX1-csv-quote-escape`, `XFIX2-mention-inside-code`, `XFIX3-last-owner-removable`, `XFIX4-advanced-search-inverted`, `XIMP3-issue-status-union`, `XIMP4-feature-flag-key-union`, `XLOC1-retry-throttle`, `XLOC2-invite-link-validity`, `XLOC3-issue-number-allocation`, `XLOC5-delivery-retry-policy`, `XLOC6-menu-entry-visibility`, `XREF1-assertorgscope-callers`, `XREF2-emit-callers`, `XREF3-isenabled-callers`, `XREF4-comment-created-subscribers`, `XREF5-rate-limit-importers`, `XREF6-member-joined-repositories`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 23 | **272,936** (210,371–449,663) | 153,321 | 0.197 | 5.0 | 12 in 12 run(s) | 48 | 0 | 0 | 59 | 0 | 100.0% (23/23) | 399,181 |
| graphify | 23 | **330,313** (184,698–496,908) | 329,327 | 0.214 | 9.0 | 0 in 0 run(s) | 116 | 0 | 0 | 99 | 51 | 100.0% (23/23) | 417,147 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 23 | 17,965.2 | [-33,493.8, 71,999.2] | 8.6% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 23 | 217,685.6 | [96,971.5, 378,828.3] | 318.3% | graphify higher |
| total_cost_usd | 23 | -0.0120 | [-0.0387, 0.0150] | 2.2% | **CI crosses 0 — no detectable difference** |
| num_turns | 23 | 6.9 | [3.4, 11.3] | 321.9% | graphify higher |

## 5. By category

### explain (6 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 49,750.3 | [-68,423.1, 183,545.6] | 6.5% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 6 | 648,471.8 | [402,399.8, 1,021,893.2] | 1027.7% | graphify higher |
| total_cost_usd | 6 | -0.0488 | [-0.1076, 0.0166] | -11.1% | **CI crosses 0 — no detectable difference** |
| num_turns | 6 | 20.8 | [15.8, 29.3] | 1068.4% | graphify higher |

### fix (6 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | -35,747.5 | [-83,985.2, 6,625.8] | -9.9% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 6 | 23,603.2 | [-18,667.7, 63,078.4] | 25.0% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 6 | -0.0155 | [-0.0479, 0.0158] | -3.8% | **CI crosses 0 — no detectable difference** |
| num_turns | 6 | 1.0 | [-0.5, 2.3] | 31.0% | **CI crosses 0 — no detectable difference** |

### impact (6 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 102,388.0 | [21,489.2, 189,886.0] | 61.8% | graphify higher |
| uncached_equivalent | 6 | 137,148.5 | [64,080.2, 212,335.3] | 112.0% | graphify higher |
| total_cost_usd | 6 | 0.0589 | [-0.0072, 0.1357] | 47.7% | **CI crosses 0 — no detectable difference** |
| num_turns | 6 | 3.3 | [2.2, 4.5] | 92.2% | graphify higher |

### locate (6 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | -26,543.3 | [-70,969.7, 17,878.8] | -7.1% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 6 | 70,153.8 | [49,897.7, 96,594.8] | 89.3% | graphify higher |
| total_cost_usd | 6 | -0.0199 | [-0.0557, 0.0128] | -6.2% | **CI crosses 0 — no detectable difference** |
| num_turns | 6 | 1.8 | [1.0, 2.7] | 78.3% | graphify higher |

### reference (6 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 75,312.3 | [-46,884.7, 198,145.2] | 43.5% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 6 | 75,312.3 | [-46,884.7, 191,239.5] | 43.7% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 6 | 0.0426 | [-0.0024, 0.0885] | 33.0% | **CI crosses 0 — no detectable difference** |
| num_turns | 6 | 2.3 | [0.3, 4.2] | 26.7% | graphify higher |

## 6. Counter-productive cases and subagent use

- `baseline`: **13** subagent(s) spawned across **13**/30 run(s). T2S all-model 381,393 vs main-session-only 196,652.
- `graphify`: **0** subagent(s) spawned across **0**/30 run(s). T2S all-model 417,147 vs main-session-only 416,148.
- Runs that opened `graphify-out/graph.json` directly: **2** (`XFIX2-mention-inside-code__graphify__r1`, `XREF5-rate-limit-importers__graphify__r1`)
- graphify-condition runs that never invoked the `graphify` CLI (nudge ignored): **0**

## 7. Failed and ungraded runs

Harness failures (`is_error`, or `terminal_reason` other than `completed`): **0**. The table below also lists runs that completed normally but did not meet their grader's success threshold — those are accuracy results, not execution problems.

| run_id | condition | task | is_error | terminal_reason |
|---|---|---|---|---|
| `XFIX5-self-notification__baseline__r1` | baseline | XFIX5-self-notification | false | completed |
| `XFIX5-self-notification__graphify__r1` | graphify | XFIX5-self-notification | false | completed |
| `XFIX6-revoked-invite-accepted__graphify__r1` | graphify | XFIX6-revoked-invite-accepted | false | completed |
| `XIMP1-role-union__baseline__r1` | baseline | XIMP1-role-union | false | completed |
| `XIMP1-role-union__graphify__r1` | graphify | XIMP1-role-union | false | completed |
| `XIMP2-rename-comment-created__baseline__r1` | baseline | XIMP2-rename-comment-created | false | completed |
| `XIMP2-rename-comment-created__graphify__r1` | graphify | XIMP2-rename-comment-created | false | completed |
| `XIMP5-plan-id-union__baseline__r1` | baseline | XIMP5-plan-id-union | false | completed |
| `XIMP5-plan-id-union__graphify__r1` | graphify | XIMP5-plan-id-union | false | completed |
| `XIMP6-limit-check-field__baseline__r1` | baseline | XIMP6-limit-check-field | false | completed |
| `XIMP6-limit-check-field__graphify__r1` | graphify | XIMP6-limit-check-field | false | completed |
| `XLOC4-session-lifetime__graphify__r1` | graphify | XLOC4-session-lifetime | false | completed |

## 8. Deliberately-easy controls vs the rest

Some tasks were written as **designed zero-advantage controls**: their answer is reproduced exactly by a single literal `grep`, so a structural index has nothing to add and the expected effect is zero or negative. They are marked `DELIBERATELY EASY` in the task notes and are separated out here so they neither flatter nor drag the headline number. Easy tasks: `XIMP2-rename-comment-created`, `XLOC1-retry-throttle`, `XREF5-rate-limit-importers`.

### easy (zero-advantage controls) — 6 runs over 3 tasks

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 3 | **161,762** (125,823–295,350) | 88,912 | 0.121 | 3.0 | 1 in 1 run(s) | 4 | 0 | 0 | 10 | 0 | 66.7% (2/3) | 295,350 |
| graphify | 3 | **160,029** (150,790–285,186) | 159,058 | 0.116 | 6.0 | 0 in 0 run(s) | 3 | 0 | 0 | 10 | 4 | 66.7% (2/3) | 275,947 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 3 | 10,447.0 | [-20,211.0, 70,146.0] | 20.4% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 3 | 42,618.0 | [-18,594.0, 76,302.0] | 64.4% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 3 | 0.0132 | [-0.0054, 0.0371] | 17.3% | **CI crosses 0 — no detectable difference** |
| num_turns | 3 | 1.0 | [-2.0, 3.0] | 61.1% | **CI crosses 0 — no detectable difference** |

### rest — 54 runs over 27 tasks

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 27 | **269,418** (204,667–396,718) | 160,455 | 0.177 | 5.0 | 12 in 12 run(s) | 54 | 0 | 0 | 69 | 0 | 85.2% (23/27) | 388,875 |
| graphify | 27 | **330,313** (198,463–483,429) | 329,327 | 0.214 | 9.0 | 0 in 0 run(s) | 122 | 0 | 0 | 120 | 55 | 77.8% (21/27) | 430,594 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 27 | 35,541.4 | [-14,582.5, 89,748.7] | 18.8% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 27 | 207,417.9 | [104,938.3, 334,579.2] | 281.2% | graphify higher |
| total_cost_usd | 27 | 0.0024 | [-0.0279, 0.0320] | 11.4% | **CI crosses 0 — no detectable difference** |
| num_turns | 27 | 6.4 | [3.3, 10.2] | 281.3% | graphify higher |

## 9. Limitations

- N = 60 runs over 30 tasks; a single corpus and a single model. These results do not generalize to other codebases or models.
- Bootstrap resamples tasks, so the interval reflects task-to-task variation, not within-task run noise.
- Where a CI crosses zero the honest reading is "no difference detected at this N", not "no difference exists".
- The fixed ~21k-token system-prompt/tool-definition overhead is included in both arms and not subtracted (see §2).
- **1 repetition per (task × condition)**: within-task run-to-run variance is unmeasured, so any single per-task difference may be run noise.
- Subagent traffic is counted in `uncached_all`, but a subagent's tool calls never reach the parent transcript, so the tool-call columns stay main-session-only.
- Raw per-run data lives in `results/ext/runs/<run-id>/` and the `summary.csv` beside this report.
