# graphify-bench results

Generated 2026-09-02T04:48:55.705Z. 90 runs over 45 tasks, conditions: baseline, graphify.

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
| baseline | 45 | **260,561** (203,616–428,937) | 144,597 | 0.197 | 5.0 | 23 in 23 run(s) | 68 | 0 | 0 | 106 | 0 | 84.4% (38/45) | 393,482 |
| graphify | 45 | **288,502** (197,852–481,415) | 287,545 | 0.191 | 9.0 | 0 in 0 run(s) | 191 | 0 | 0 | 208 | 83 | 77.8% (35/45) | 429,005 |

**`uncached_all` (PRIMARY) = Σ over every entry of `modelUsage` of (inputTokens + cacheReadInputTokens + cacheCreationInputTokens)** — it covers the main session *and* any subagent, so it is commensurable with `total_cost_usd`. `uncached_main` (secondary) is the same sum taken from `usage.*`, which the result JSON populates for the **main session only**; a run that spawned a subagent therefore reports less information volume there than it actually consumed. The `subagents` column lets the two be reconciled. Tool columns are totals across all runs of the condition. T2S (tokens-to-success) = total `uncached_all` of successful runs / number of successful runs.

Fixed overhead, reported separately so readers can subtract it (architecture.md §5):

| condition | first-turn cache_creation (median) |
|---|---|
| baseline | 10,357 |
| graphify | 10,943 |

## 3. Paired difference (graphify − baseline), all tasks

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | 32,097.3 | [-7,761.7, 74,822.1] | 17.5% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 45 | 221,334.4 | [139,995.9, 319,795.5] | 289.7% | graphify higher |
| total_cost_usd | 45 | -0.0063 | [-0.0284, 0.0163] | 7.5% | **CI crosses 0 — no detectable difference** |
| num_turns | 45 | 6.7 | [4.4, 9.5] | 288.0% | graphify higher |

> **Why the two token rows disagree.** Subagent use is asymmetric between the arms (baseline 23/45 runs, graphify 0/45). `uncached_equivalent` cannot see a subagent's tokens, so it charges that work to nobody and makes the subagent-spawning arm look cheap; `uncached_equivalent_all` counts it. **Read the `_all` row** — the main-only row is retained only to show the size of the distortion.

## 4. Iso-accuracy subset

Tasks where every graded run of both conditions succeeded (35/45): `EXP1-issue-create-flow`, `EXP2-comment-mention-notify`, `EXP3-digest-pipeline`, `FIX1-issue-tenant-leak`, `FIX2-project-quota-off-by-one`, `FIX3-board-shows-archived`, `IMP1-planlimits-field`, `IMP3-limited-resource-union`, `LOC1-shortcut-match`, `REF1-assertcan-callers`, `REF2-would-exceed-limit-callers`, `REF3-issue-created-subscribers`, `XEXP1-webhook-delivery`, `XEXP2-invitation-lifecycle`, `XEXP3-plan-change`, `XEXP4-signin-to-actor`, `XEXP5-search-index`, `XEXP6-overdue-sweep`, `XFIX1-csv-quote-escape`, `XFIX2-mention-inside-code`, `XFIX3-last-owner-removable`, `XFIX4-advanced-search-inverted`, `XIMP3-issue-status-union`, `XIMP4-feature-flag-key-union`, `XLOC1-retry-throttle`, `XLOC2-invite-link-validity`, `XLOC3-issue-number-allocation`, `XLOC5-delivery-retry-policy`, `XLOC6-menu-entry-visibility`, `XREF1-assertorgscope-callers`, `XREF2-emit-callers`, `XREF3-isenabled-callers`, `XREF4-comment-created-subscribers`, `XREF5-rate-limit-importers`, `XREF6-member-joined-repositories`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 35 | **272,936** (220,758–566,845) | 153,321 | 0.212 | 5.0 | 20 in 20 run(s) | 56 | 0 | 0 | 82 | 0 | 100.0% (35/35) | 409,691 |
| graphify | 35 | **330,313** (185,854–496,908) | 329,327 | 0.214 | 9.0 | 0 in 0 run(s) | 179 | 0 | 0 | 164 | 68 | 100.0% (35/35) | 429,005 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 35 | 19,314.3 | [-29,852.2, 75,723.5] | 8.1% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 35 | 249,717.4 | [146,326.7, 379,659.6] | 342.2% | graphify higher |
| total_cost_usd | 35 | -0.0214 | [-0.0442, 0.0024] | -1.9% | **CI crosses 0 — no detectable difference** |
| num_turns | 35 | 7.7 | [4.8, 11.0] | 345.1% | graphify higher |

## 5. By category

### explain (9 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | -28,299.7 | [-138,598.1, 87,068.7] | -5.1% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 9 | 555,312.2 | [359,928.9, 849,093.0] | 826.4% | graphify higher |
| total_cost_usd | 9 | -0.0754 | [-0.1230, -0.0208] | -16.8% | graphify lower |
| num_turns | 9 | 19.6 | [14.7, 25.8] | 923.4% | graphify higher |

### fix (9 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | 56,561.4 | [-40,854.7, 185,611.3] | 6.8% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 9 | 253,586.6 | [33,039.6, 533,747.5] | 186.5% | graphify higher |
| total_cost_usd | 9 | -0.0082 | [-0.0433, 0.0279] | -1.6% | **CI crosses 0 — no detectable difference** |
| num_turns | 9 | 5.9 | [1.2, 11.1] | 148.8% | graphify higher |

### impact (9 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | 67,263.1 | [-5,550.0, 144,909.6] | 46.5% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 9 | 90,436.8 | [16,342.6, 167,802.6] | 80.0% | graphify higher |
| total_cost_usd | 9 | 0.0393 | [-0.0147, 0.0999] | 37.7% | **CI crosses 0 — no detectable difference** |
| num_turns | 9 | 2.2 | [0.7, 3.7] | 64.8% | graphify higher |

### locate (9 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | -9,003.1 | [-46,042.7, 23,940.7] | -0.4% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 9 | 89,678.9 | [52,258.0, 129,770.1] | 115.0% | graphify higher |
| total_cost_usd | 9 | -0.0112 | [-0.0358, 0.0099] | -2.1% | **CI crosses 0 — no detectable difference** |
| num_turns | 9 | 2.6 | [1.0, 4.3] | 98.1% | graphify higher |

### reference (9 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | 73,964.7 | [-14,905.8, 158,882.7] | 39.5% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 9 | 117,657.7 | [7,841.9, 223,134.0] | 240.5% | graphify higher |
| total_cost_usd | 9 | 0.0241 | [-0.0111, 0.0609] | 20.5% | **CI crosses 0 — no detectable difference** |
| num_turns | 9 | 3.3 | [1.0, 5.7] | 205.1% | graphify higher |

## 6. Counter-productive cases and subagent use

- `baseline`: **23** subagent(s) spawned across **23**/45 run(s). T2S all-model 393,482 vs main-session-only 175,246.
- `graphify`: **0** subagent(s) spawned across **0**/45 run(s). T2S all-model 429,005 vs main-session-only 428,008.
- Runs that opened `graphify-out/graph.json` directly: **4** (`EXP3-digest-pipeline__graphify__r1`, `IMP2-rename-issue-created__graphify__r1`, `XFIX2-mention-inside-code__graphify__r1`, `XREF5-rate-limit-importers__graphify__r1`)
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

## 8. Per-set breakdown (drift between measurement sets)

The two task sets were authored separately. Pooling them is only legitimate if they behave alike, so each set is re-analysed on its own here: a large gap between the two blocks means the pooled numbers above are averaging over a real difference in task design, not just sampling noise.

### set `ext` — 60 runs over 30 tasks

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 30 | **264,990** (200,807–401,224) | 156,888 | 0.173 | 5.0 | 13 in 13 run(s) | 58 | 0 | 0 | 79 | 0 | 83.3% (25/30) | 381,393 |
| graphify | 30 | **289,189** (178,121–470,469) | 288,194 | 0.202 | 8.5 | 0 in 0 run(s) | 125 | 0 | 0 | 130 | 59 | 76.7% (23/30) | 417,147 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 30 | 33,032.0 | [-10,786.1, 81,237.1] | 19.0% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 30 | 190,937.9 | [91,712.9, 319,753.0] | 259.5% | graphify higher |
| total_cost_usd | 30 | 0.0034 | [-0.0227, 0.0318] | 12.0% | **CI crosses 0 — no detectable difference** |
| num_turns | 30 | 5.9 | [3.2, 9.3] | 259.3% | graphify higher |

### set `set1` — 30 runs over 15 tasks

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 15 | **259,513** (216,927–575,709) | 120,276 | 0.208 | 4.0 | 10 in 10 run(s) | 10 | 0 | 0 | 27 | 0 | 86.7% (13/15) | 416,732 |
| graphify | 15 | **288,502** (231,038–483,621) | 287,545 | 0.184 | 10.0 | 0 in 0 run(s) | 66 | 0 | 0 | 78 | 24 | 80.0% (12/15) | 451,734 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 15 | 30,227.9 | [-50,114.9, 132,350.4] | 14.5% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 15 | 282,127.4 | [144,911.8, 463,040.0] | 350.0% | graphify higher |
| total_cost_usd | 15 | -0.0257 | [-0.0632, 0.0093] | -1.3% | **CI crosses 0 — no detectable difference** |
| num_turns | 15 | 8.4 | [4.3, 12.8] | 345.5% | graphify higher |

## 9. Deliberately-easy controls vs the rest

Some tasks were written as **designed zero-advantage controls**: their answer is reproduced exactly by a single literal `grep`, so a structural index has nothing to add and the expected effect is zero or negative. They are marked `DELIBERATELY EASY` in the task notes and are separated out here so they neither flatter nor drag the headline number. Easy tasks: `IMP2-rename-issue-created`, `LOC1-shortcut-match`, `XIMP2-rename-comment-created`, `XLOC1-retry-throttle`, `XREF5-rate-limit-importers`.

### easy (zero-advantage controls) — 10 runs over 5 tasks

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 5 | **121,254** (120,997–161,762) | 120,026 | 0.083 | 4.0 | 1 in 1 run(s) | 6 | 0 | 0 | 15 | 0 | 60.0% (3/5) | 237,318 |
| graphify | 5 | **160,029** (141,551–240,807) | 159,058 | 0.116 | 6.0 | 0 in 0 run(s) | 4 | 0 | 0 | 16 | 6 | 60.0% (3/5) | 226,858 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 5 | 31,715.4 | [-14,036.8, 82,196.4] | 33.3% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 5 | 51,018.0 | [9,562.0, 92,474.0] | 59.9% | graphify higher |
| total_cost_usd | 5 | 0.0254 | [0.0031, 0.0549] | 31.7% | graphify higher |
| num_turns | 5 | 1.0 | [-0.8, 2.8] | 47.7% | **CI crosses 0 — no detectable difference** |

### rest — 80 runs over 40 tasks

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 40 | **270,860** (214,951–492,675) | 153,413 | 0.203 | 5.0 | 22 in 22 run(s) | 62 | 0 | 0 | 91 | 0 | 87.5% (35/40) | 406,868 |
| graphify | 40 | **319,452** (212,223–488,364) | 318,448 | 0.205 | 9.5 | 0 in 0 run(s) | 187 | 0 | 0 | 192 | 77 | 80.0% (32/40) | 447,956 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 40 | 32,145.0 | [-13,872.8, 80,495.9] | 15.5% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 40 | 242,624.0 | [154,150.8, 356,524.3] | 318.4% | graphify higher |
| total_cost_usd | 40 | -0.0102 | [-0.0336, 0.0136] | 4.5% | **CI crosses 0 — no detectable difference** |
| num_turns | 40 | 7.4 | [4.8, 10.5] | 318.1% | graphify higher |

## 10. Limitations

- N = 90 runs over 45 tasks; a single corpus and a single model. These results do not generalize to other codebases or models.
- Bootstrap resamples tasks, so the interval reflects task-to-task variation, not within-task run noise.
- Where a CI crosses zero the honest reading is "no difference detected at this N", not "no difference exists".
- The fixed ~21k-token system-prompt/tool-definition overhead is included in both arms and not subtracted (see §2).
- **1 repetition per (task × condition)**: within-task run-to-run variance is unmeasured, so any single per-task difference may be run noise.
- Subagent traffic is counted in `uncached_all`, but a subagent's tool calls never reach the parent transcript, so the tool-call columns stay main-session-only.
- Raw per-run data lives in `results/runs/<run-id>/`, `results/ext/runs/<run-id>/` and the `summary.csv` beside this report.
