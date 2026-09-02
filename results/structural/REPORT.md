# graphify-bench results

Generated 2026-09-02T06:51:06.240Z. 270 runs over 45 tasks, conditions: baseline, baseline-nosub, graphify, graphify-strict, haiku-baseline, haiku-graphify.

## 1. Environment

- Claude Code: `2.1.258 (Claude Code)`
- graphify: `graphify 0.9.53`
- Node: `v25.5.0` / pnpm `10.28.2`
- Platform: `darwin 25.2.0 arm64`
- Model: `claude-sonnet-5`, effort `high`, --max-turns 60, --max-budget-usd 4

- Bootstrap: B=2000, percentile 95% CI, seed `graphify-bench-bootstrap`, resampled over **tasks**.
- Corpus: `corpus-v1`, tree hash (sha256) `4148d9b26fb31b95ab8424af1f88cfc7741bb655b3ad3bbb557a8c3c516c12da` (source: `docs/plan/CORPUS.md`).
- Report generated: 2026-09-02.

The `Model` line above is the harness default; arms that override it are listed here. Every field comes from the run's own `run.meta.json`, not from the report's assumptions.

| condition | model | overlays | extra `claude` args | what it isolates |
|---|---|---|---|---|
| `baseline-nosub` | `claude-sonnet-5` | `baseline` | `--disallowedTools Agent` | Baseline with the Agent tool removed, so it cannot delegate exploration to a subagent — isolates how much of baseline's efficiency is the subagent rather than the flat search. |
| `graphify-strict` | `claude-sonnet-5` | `graphify` + `graphify-strict` | – | Same as `graphify`, but the Read\|Glob hook runs `hook-guard read --strict`: the first raw Read of an indexed in-project source file per session is DENIED and redirected to `graphify query`. |
| `haiku-baseline` | `claude-haiku-4-5` | `baseline` | – | Baseline run by a weaker explorer. |
| `haiku-graphify` | `claude-haiku-4-5` | `graphify` | – | graphify run by a weaker explorer — the arm where a prebuilt index should help most. |

## 2. Overall

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 45 | **260,561** (203,616–428,937) | 144,597 | 0.197 | 5.0 | 23 in 23 run(s) | 68 | 0 | 0 | 106 | 0 | 84.4% (38/45) | 393,482 |
| baseline-nosub | 45 | **230,081** (126,680–378,938) | 229,091 | 0.134 | 8.0 | 0 in 0 run(s) | 170 | 0 | 0 | 232 | 0 | 84.4% (38/45) | 311,808 |
| graphify | 45 | **288,502** (197,852–481,415) | 287,545 | 0.191 | 9.0 | 0 in 0 run(s) | 191 | 0 | 0 | 208 | 83 | 77.8% (35/45) | 429,005 |
| graphify-strict | 45 | **288,533** (181,403–463,327) | 286,953 | 0.186 | 8.0 | 1 in 1 run(s) | 141 | 0 | 0 | 216 | 83 | 77.8% (35/45) | 414,500 |
| haiku-baseline | 45 | **502,978** (159,352–754,040) | 498,061 | 0.121 | 15.0 | 2 in 1 run(s) | 278 | 0 | 0 | 350 | 0 | 80.0% (36/45) | 621,126 |
| haiku-graphify | 45 | **327,185** (190,413–523,370) | 326,189 | 0.103 | 10.0 | 0 in 0 run(s) | 229 | 0 | 0 | 155 | 99 | 82.2% (37/45) | 491,331 |

**`uncached_all` (PRIMARY) = Σ over every entry of `modelUsage` of (inputTokens + cacheReadInputTokens + cacheCreationInputTokens)** — it covers the main session *and* any subagent, so it is commensurable with `total_cost_usd`. `uncached_main` (secondary) is the same sum taken from `usage.*`, which the result JSON populates for the **main session only**; a run that spawned a subagent therefore reports less information volume there than it actually consumed. The `subagents` column lets the two be reconciled. Tool columns are totals across all runs of the condition. T2S (tokens-to-success) = total `uncached_all` of successful runs / number of successful runs.

Fixed overhead, reported separately so readers can subtract it (architecture.md §5):

| condition | first-turn cache_creation (median) |
|---|---|
| baseline | 10,357 |
| baseline-nosub | 9,510 |
| graphify | 10,943 |
| graphify-strict | 10,935 |
| haiku-baseline | 8,014 |
| haiku-graphify | 8,438 |

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
| baseline-nosub | 35 | **242,490** (133,374–383,591) | 241,480 | 0.150 | 8.0 | 0 in 0 run(s) | 158 | 0 | 0 | 195 | 0 | 100.0% (35/35) | 319,622 |
| graphify | 35 | **330,313** (185,854–496,908) | 329,327 | 0.214 | 9.0 | 0 in 0 run(s) | 179 | 0 | 0 | 164 | 68 | 100.0% (35/35) | 429,005 |
| graphify-strict | 35 | **354,837** (201,623–558,044) | 321,817 | 0.202 | 9.0 | 1 in 1 run(s) | 132 | 0 | 0 | 182 | 69 | 97.1% (34/35) | 422,859 |
| haiku-baseline | 35 | **528,422** (232,272–901,369) | 525,161 | 0.133 | 16.0 | 2 in 1 run(s) | 239 | 0 | 0 | 299 | 0 | 91.4% (32/35) | 647,868 |
| haiku-graphify | 35 | **395,971** (238,758–565,147) | 395,000 | 0.114 | 12.0 | 0 in 0 run(s) | 195 | 0 | 0 | 135 | 80 | 97.1% (34/35) | 506,741 |

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

## 6. Structural comparisons

Each block below is an independent paired comparison between two arms, computed with the same machinery as §3: per-task pairing over the same task set, percentile bootstrap over tasks, an iso-accuracy subset scoped to just those two arms, and a per-category breakdown. Arms that are not part of a block are excluded from it entirely.

### `graphify-strict` vs `baseline`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 45 | **260,561** (203,616–428,937) | 144,597 | 0.197 | 5.0 | 23 in 23 run(s) | 68 | 0 | 0 | 106 | 0 | 84.4% (38/45) | 393,482 |
| graphify-strict | 45 | **288,533** (181,403–463,327) | 286,953 | 0.186 | 8.0 | 1 in 1 run(s) | 141 | 0 | 0 | 216 | 83 | 77.8% (35/45) | 414,500 |

Paired difference (`graphify-strict` − `baseline`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | 19,820.3 | [-26,405.3, 74,214.7] | 17.8% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 45 | 188,053.2 | [116,808.8, 264,285.2] | 246.1% | graphify-strict higher |
| total_cost_usd | 45 | -0.0138 | [-0.0458, 0.0223] | 8.4% | **CI crosses 0 — no detectable difference** |
| num_turns | 45 | 5.6 | [3.2, 8.2] | 255.3% | graphify-strict higher |

Iso-accuracy subset (35/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 35 | 7,944.0 | [-47,204.5, 74,592.9] | 10.6% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 35 | 211,341.6 | [119,519.8, 310,721.8] | 292.4% | graphify-strict higher |
| total_cost_usd | 35 | -0.0255 | [-0.0620, 0.0199] | 1.8% | **CI crosses 0 — no detectable difference** |
| num_turns | 35 | 6.5 | [3.5, 9.6] | 311.1% | graphify-strict higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | -28,590.2 | [-107,770.6, 48,445.9] | -1.9% | **CI crosses 0 — no detectable difference** |
| fix | 9 | 103,612.9 | [-44,033.9, 309,228.8] | 41.5% | **CI crosses 0 — no detectable difference** |
| impact | 9 | 48,885.9 | [-25,204.2, 129,877.4] | 40.4% | **CI crosses 0 — no detectable difference** |
| locate | 9 | -45,154.1 | [-81,607.9, -11,722.9] | -17.8% | graphify-strict lower |
| reference | 9 | 20,347.2 | [-103,300.9, 134,830.2] | 26.8% | **CI crosses 0 — no detectable difference** |

**Verdict.** `graphify-strict` vs `baseline` over 45 paired tasks: tokens no detectable difference; cost no detectable difference; turns higher by 5.6 (95% CI [3.2, 8.2]); accuracy 77.8% vs 84.4% (35/45 vs 38/45).

### `graphify-strict` vs `graphify`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| graphify | 45 | **288,502** (197,852–481,415) | 287,545 | 0.191 | 9.0 | 0 in 0 run(s) | 191 | 0 | 0 | 208 | 83 | 77.8% (35/45) | 429,005 |
| graphify-strict | 45 | **288,533** (181,403–463,327) | 286,953 | 0.186 | 8.0 | 1 in 1 run(s) | 141 | 0 | 0 | 216 | 83 | 77.8% (35/45) | 414,500 |

Paired difference (`graphify-strict` − `graphify`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | -12,277.0 | [-66,445.4, 52,077.2] | 13.2% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 45 | -33,281.2 | [-75,798.7, 6,856.2] | 1.0% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 45 | -0.0075 | [-0.0360, 0.0328] | 8.4% | **CI crosses 0 — no detectable difference** |
| num_turns | 45 | -1.1 | [-2.3, -0.0] | -1.7% | graphify-strict lower |

Iso-accuracy subset (34/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 34 | -12,255.4 | [-78,731.2, 70,997.6] | 16.7% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 34 | -40,055.2 | [-88,587.8, 6,499.9] | 0.5% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 34 | -0.0041 | [-0.0407, 0.0440] | 11.9% | **CI crosses 0 — no detectable difference** |
| num_turns | 34 | -1.2 | [-2.6, 0.0] | -0.9% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | -290.6 | [-97,500.8, 92,742.7] | 8.1% | **CI crosses 0 — no detectable difference** |
| fix | 9 | 47,051.4 | [-174,526.7, 318,041.6] | 72.6% | **CI crosses 0 — no detectable difference** |
| impact | 9 | -18,377.2 | [-87,090.8, 55,707.4] | 3.8% | **CI crosses 0 — no detectable difference** |
| locate | 9 | -36,151.0 | [-72,688.3, -1,964.8] | -13.7% | graphify-strict lower |
| reference | 9 | -53,617.4 | [-125,832.3, 38,974.0] | -4.9% | **CI crosses 0 — no detectable difference** |

**Verdict.** `graphify-strict` vs `graphify` over 45 paired tasks: tokens no detectable difference; cost no detectable difference; turns lower by 1.1 (95% CI [-2.3, -0.0]); accuracy 77.8% vs 77.8% (35/45 vs 35/45).

### `graphify` vs `baseline-nosub`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline-nosub | 45 | **230,081** (126,680–378,938) | 229,091 | 0.134 | 8.0 | 0 in 0 run(s) | 170 | 0 | 0 | 232 | 0 | 84.4% (38/45) | 311,808 |
| graphify | 45 | **288,502** (197,852–481,415) | 287,545 | 0.191 | 9.0 | 0 in 0 run(s) | 191 | 0 | 0 | 208 | 83 | 77.8% (35/45) | 429,005 |

Paired difference (`graphify` − `baseline-nosub`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | 107,476.8 | [38,481.0, 179,530.7] | 67.6% | graphify higher |
| uncached_equivalent | 45 | 107,476.8 | [38,385.1, 185,992.1] | 68.1% | graphify higher |
| total_cost_usd | 45 | 0.0663 | [0.0366, 0.1009] | 52.2% | graphify higher |
| num_turns | 45 | 1.8 | [0.2, 3.5] | 32.8% | graphify higher |

Iso-accuracy subset (35/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 35 | 109,383.2 | [25,128.2, 211,842.7] | 60.7% | graphify higher |
| uncached_equivalent | 35 | 109,383.2 | [24,172.0, 207,601.8] | 61.1% | graphify higher |
| total_cost_usd | 35 | 0.0646 | [0.0271, 0.1058] | 47.2% | graphify higher |
| num_turns | 35 | 1.7 | [-0.3, 3.9] | 27.0% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | 29,740.9 | [-156,780.6, 230,548.3] | 9.9% | **CI crosses 0 — no detectable difference** |
| fix | 9 | 204,355.7 | [-7,170.2, 482,985.2] | 115.8% | **CI crosses 0 — no detectable difference** |
| impact | 9 | 45,334.0 | [-56,566.5, 139,615.1] | 49.4% | **CI crosses 0 — no detectable difference** |
| locate | 9 | 75,531.3 | [52,165.6, 109,747.5] | 80.7% | graphify higher |
| reference | 9 | 182,422.3 | [102,709.6, 274,316.2] | 82.0% | graphify higher |

**Verdict.** `graphify` vs `baseline-nosub` over 45 paired tasks: tokens higher by 107,477 (95% CI [38,481, 179,531]); cost higher by 0.0663 (95% CI [0.0366, 0.1009]); turns higher by 1.8 (95% CI [0.2, 3.5]); accuracy 77.8% vs 84.4% (35/45 vs 38/45).

### `baseline-nosub` vs `baseline`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 45 | **260,561** (203,616–428,937) | 144,597 | 0.197 | 5.0 | 23 in 23 run(s) | 68 | 0 | 0 | 106 | 0 | 84.4% (38/45) | 393,482 |
| baseline-nosub | 45 | **230,081** (126,680–378,938) | 229,091 | 0.134 | 8.0 | 0 in 0 run(s) | 170 | 0 | 0 | 232 | 0 | 84.4% (38/45) | 311,808 |

Paired difference (`baseline-nosub` − `baseline`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | -75,379.6 | [-130,876.3, -25,391.3] | -15.5% | baseline-nosub lower |
| uncached_equivalent | 45 | 113,857.6 | [38,341.4, 192,760.1] | 186.5% | baseline-nosub higher |
| total_cost_usd | 45 | -0.0726 | [-0.1044, -0.0453] | -22.5% | baseline-nosub lower |
| num_turns | 45 | 5.0 | [2.6, 7.7] | 236.4% | baseline-nosub higher |

Iso-accuracy subset (37/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 37 | -88,008.3 | [-152,118.8, -31,461.5] | -18.1% | baseline-nosub lower |
| uncached_equivalent | 37 | 129,940.5 | [39,467.0, 226,012.3] | 215.3% | baseline-nosub higher |
| total_cost_usd | 37 | -0.0823 | [-0.1174, -0.0523] | -25.1% | baseline-nosub lower |
| num_turns | 37 | 5.6 | [2.7, 8.9] | 275.2% | baseline-nosub higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | -58,040.6 | [-188,881.0, 82,386.7] | -4.6% | **CI crosses 0 — no detectable difference** |
| fix | 9 | -147,794.2 | [-322,836.2, -8,474.0] | -25.6% | baseline-nosub lower |
| impact | 9 | 21,929.1 | [-49,066.6, 76,932.8] | 13.3% | **CI crosses 0 — no detectable difference** |
| locate | 9 | -84,534.4 | [-121,367.5, -53,578.4] | -41.5% | baseline-nosub lower |
| reference | 9 | -108,457.7 | [-253,327.9, -10,542.0] | -19.3% | baseline-nosub lower |

**Verdict.** `baseline-nosub` vs `baseline` over 45 paired tasks: tokens lower by 75,380 (95% CI [-130,876, -25,391]); cost lower by 0.0726 (95% CI [-0.1044, -0.0453]); turns higher by 5.0 (95% CI [2.6, 7.7]); accuracy 84.4% vs 84.4% (38/45 vs 38/45).

### `haiku-graphify` vs `haiku-baseline`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| haiku-baseline | 45 | **502,978** (159,352–754,040) | 498,061 | 0.121 | 15.0 | 2 in 1 run(s) | 278 | 0 | 0 | 350 | 0 | 80.0% (36/45) | 621,126 |
| haiku-graphify | 45 | **327,185** (190,413–523,370) | 326,189 | 0.103 | 10.0 | 0 in 0 run(s) | 229 | 0 | 0 | 155 | 99 | 82.2% (37/45) | 491,331 |

Paired difference (`haiku-graphify` − `haiku-baseline`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | -119,337.8 | [-245,219.7, -11,604.5] | 4.8% | haiku-graphify lower |
| uncached_equivalent | 45 | -105,910.8 | [-235,162.7, 12,225.6] | 59.8% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 45 | -0.0163 | [-0.0378, 0.0015] | 1.6% | **CI crosses 0 — no detectable difference** |
| num_turns | 45 | -2.8 | [-5.4, -0.4] | 34.8% | haiku-graphify lower |

Iso-accuracy subset (35/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 35 | -140,139.4 | [-296,955.7, -6,729.4] | 2.2% | haiku-graphify lower |
| uncached_equivalent | 35 | -122,876.2 | [-280,312.6, 27,894.9] | 72.8% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 35 | -0.0200 | [-0.0473, 0.0024] | 1.0% | **CI crosses 0 — no detectable difference** |
| num_turns | 35 | -3.1 | [-6.2, -0.1] | 45.8% | haiku-graphify lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | -311,278.1 | [-813,506.1, 125,211.7] | -20.8% | **CI crosses 0 — no detectable difference** |
| fix | 9 | -111,258.8 | [-376,975.0, 124,278.8] | 28.7% | **CI crosses 0 — no detectable difference** |
| impact | 9 | -68,161.9 | [-238,268.1, 65,761.8] | 7.4% | **CI crosses 0 — no detectable difference** |
| locate | 9 | 29,319.0 | [-25,618.2, 100,988.9] | 33.5% | **CI crosses 0 — no detectable difference** |
| reference | 9 | -135,309.0 | [-213,291.9, -54,370.8] | -24.8% | haiku-graphify lower |

**Verdict.** `haiku-graphify` vs `haiku-baseline` over 45 paired tasks: tokens lower by 119,338 (95% CI [-245,220, -11,605]); cost no detectable difference; turns lower by 2.8 (95% CI [-5.4, -0.4]); accuracy 82.2% vs 80.0% (37/45 vs 36/45).

### Accuracy by model strength

The token comparisons above are only meaningful alongside accuracy: an arm that answers fewer tasks correctly can always look cheaper. This table puts every arm's accuracy side by side so a Haiku-vs-Sonnet reading is not mistaken for an efficiency result.

| condition | graded | successes | accuracy |
|---|---|---|---|
| `baseline` | 45 | 38 | 84.4% |
| `baseline-nosub` | 45 | 38 | 84.4% |
| `graphify` | 45 | 35 | 77.8% |
| `graphify-strict` | 45 | 35 | 77.8% |
| `haiku-baseline` | 45 | 36 | 80.0% |
| `haiku-graphify` | 45 | 37 | 82.2% |

## 7. Features never exercised

graphify exposes more than `query`. The table counts, per arm, how many times each subcommand was invoked across all runs (and, in parentheses, how many runs used it at least once). A zero column is the point: it means the benchmark never put that feature under measurement, so nothing here — positive or negative — can be read as evidence about it.

| condition | runs | `query` | `explain` | `path` | `god-nodes` | `affected` | `save-result` | `reflect` | `update` | `benchmark` |
|---|---|---|---|---|---|---|---|---|---|---|
| `baseline` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `baseline-nosub` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `graphify` | 45 | 63 (45) | 16 (8) | 4 (3) | **0** | **0** | **0** | **0** | **0** | **0** |
| `graphify-strict` | 45 | 61 (45) | 18 (12) | 3 (2) | **0** | **0** | **0** | **0** | 2 (2) | **0** |
| `haiku-baseline` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `haiku-graphify` | 45 | 77 (43) | 15 (10) | 7 (7) | **0** | **0** | **0** | **0** | **0** | **0** |

| condition | runs reading `graph.json` directly | runs that never invoked the CLI (nudge ignored) | strict denials: total (median/run) |
|---|---|---|---|
| `baseline` | 0 | n/a (no graph) | 0 (0) |
| `baseline-nosub` | 0 | n/a (no graph) | 0 (0) |
| `graphify` | 4 | 0 | 0 (0) |
| `graphify-strict` | 7 | 0 | 0 (0) |
| `haiku-baseline` | 0 | n/a (no graph) | 0 (0) |
| `haiku-graphify` | 2 | 2 | 0 (0) |

> **The strict block never fired.** Across 45 `graphify-strict` runs the hook denied **zero** reads, confirmed three ways: no `permissionDecision` in any transcript, no deny text, and `permission_denials` = 0 in every `result.json`. The cause is in graphify's own guard (`cli.py::_query_stamp_fresh`): strict suppresses its block while a query/explain/path ran within the last 30 minutes, and the overlay's `CLAUDE.md` already steers the agent to `graphify query` **before** its first raw `Read`. The soft nudge wins the race every time, so the strict flag is inert under this overlay — `graphify-strict` vs `graphify` is therefore a null result about a knob that never engaged, **not** evidence that forcing graph-first exploration does nothing.

> **Cross-session memory was never measured.** `save-result`, `reflect` and `affected` are the mechanisms by which graphify is supposed to compound across sessions, and they were invoked **zero times in every arm**. Each benchmark run is a fresh corpus copy with a fresh session, so there is no second session for a saved result to pay off in — the design that would exercise them is a different experiment, not a variation of this one. The honest statement is that this benchmark measures single-session retrieval only.

## 8. Counter-productive cases and subagent use

- `baseline`: **23** subagent(s) spawned across **23**/45 run(s). T2S all-model 393,482 vs main-session-only 175,246.
- `baseline-nosub`: **0** subagent(s) spawned across **0**/45 run(s). T2S all-model 311,808 vs main-session-only 310,813.
- `graphify`: **0** subagent(s) spawned across **0**/45 run(s). T2S all-model 429,005 vs main-session-only 428,008.
- `graphify-strict`: **1** subagent(s) spawned across **1**/45 run(s). T2S all-model 414,500 vs main-session-only 386,497.
- `haiku-baseline`: **2** subagent(s) spawned across **1**/45 run(s). T2S all-model 621,126 vs main-session-only 603,345.
- `haiku-graphify`: **0** subagent(s) spawned across **0**/45 run(s). T2S all-model 491,331 vs main-session-only 490,335.
- Runs that opened `graphify-out/graph.json` directly: **13** (`EXP3-digest-pipeline__graphify__r1`, `IMP2-rename-issue-created__graphify__r1`, `XFIX2-mention-inside-code__graphify__r1`, `XREF5-rate-limit-importers__graphify__r1`, `LOC3-digest-window__graphify-strict__r1`, `REF3-issue-created-subscribers__graphify-strict__r1`, `XEXP2-invitation-lifecycle__graphify-strict__r1`, `XLOC3-issue-number-allocation__graphify-strict__r1`, `XLOC3-issue-number-allocation__haiku-graphify__r1`, `XLOC4-session-lifetime__graphify-strict__r1`, `XLOC6-menu-entry-visibility__graphify-strict__r1`, `XREF2-emit-callers__haiku-graphify__r1`, `XREF3-isenabled-callers__graphify-strict__r1`)
- graphify-condition runs that never invoked the `graphify` CLI (nudge ignored): **0**

## 9. Failed and ungraded runs

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
| `IMP2-rename-issue-created__baseline-nosub__r1` | baseline-nosub | IMP2-rename-issue-created | false | completed |
| `IMP2-rename-issue-created__graphify-strict__r1` | graphify-strict | IMP2-rename-issue-created | false | completed |
| `IMP2-rename-issue-created__haiku-baseline__r1` | haiku-baseline | IMP2-rename-issue-created | false | completed |
| `IMP2-rename-issue-created__haiku-graphify__r1` | haiku-graphify | IMP2-rename-issue-created | false | completed |
| `LOC2-webhook-plan-cap__baseline-nosub__r1` | baseline-nosub | LOC2-webhook-plan-cap | false | completed |
| `LOC2-webhook-plan-cap__graphify-strict__r1` | graphify-strict | LOC2-webhook-plan-cap | false | completed |
| `LOC2-webhook-plan-cap__haiku-baseline__r1` | haiku-baseline | LOC2-webhook-plan-cap | false | completed |
| `LOC2-webhook-plan-cap__haiku-graphify__r1` | haiku-graphify | LOC2-webhook-plan-cap | false | completed |
| `LOC3-digest-window__baseline-nosub__r1` | baseline-nosub | LOC3-digest-window | false | completed |
| `LOC3-digest-window__graphify-strict__r1` | graphify-strict | LOC3-digest-window | false | completed |
| `REF2-would-exceed-limit-callers__graphify-strict__r1` | graphify-strict | REF2-would-exceed-limit-callers | false | completed |
| `REF2-would-exceed-limit-callers__haiku-baseline__r1` | haiku-baseline | REF2-would-exceed-limit-callers | false | completed |
| `XFIX5-self-notification__graphify-strict__r1` | graphify-strict | XFIX5-self-notification | false | completed |
| `XFIX5-self-notification__haiku-baseline__r1` | haiku-baseline | XFIX5-self-notification | false | completed |
| `XFIX5-self-notification__haiku-graphify__r1` | haiku-graphify | XFIX5-self-notification | false | completed |
| `XFIX6-revoked-invite-accepted__graphify-strict__r1` | graphify-strict | XFIX6-revoked-invite-accepted | false | completed |
| `XIMP1-role-union__baseline-nosub__r1` | baseline-nosub | XIMP1-role-union | false | completed |
| `XIMP1-role-union__graphify-strict__r1` | graphify-strict | XIMP1-role-union | false | completed |
| `XIMP2-rename-comment-created__baseline-nosub__r1` | baseline-nosub | XIMP2-rename-comment-created | false | completed |
| `XIMP2-rename-comment-created__graphify-strict__r1` | graphify-strict | XIMP2-rename-comment-created | false | completed |
| `XIMP2-rename-comment-created__haiku-baseline__r1` | haiku-baseline | XIMP2-rename-comment-created | false | completed |
| `XIMP2-rename-comment-created__haiku-graphify__r1` | haiku-graphify | XIMP2-rename-comment-created | false | completed |
| `XIMP3-issue-status-union__haiku-baseline__r1` | haiku-baseline | XIMP3-issue-status-union | false | completed |
| `XIMP5-plan-id-union__baseline-nosub__r1` | baseline-nosub | XIMP5-plan-id-union | false | completed |
| `XIMP5-plan-id-union__graphify-strict__r1` | graphify-strict | XIMP5-plan-id-union | false | completed |
| `XIMP5-plan-id-union__haiku-baseline__r1` | haiku-baseline | XIMP5-plan-id-union | false | completed |
| `XIMP5-plan-id-union__haiku-graphify__r1` | haiku-graphify | XIMP5-plan-id-union | false | completed |
| `XIMP6-limit-check-field__baseline-nosub__r1` | baseline-nosub | XIMP6-limit-check-field | false | completed |
| `XIMP6-limit-check-field__graphify-strict__r1` | graphify-strict | XIMP6-limit-check-field | false | completed |
| `XIMP6-limit-check-field__haiku-baseline__r1` | haiku-baseline | XIMP6-limit-check-field | false | completed |
| `XIMP6-limit-check-field__haiku-graphify__r1` | haiku-graphify | XIMP6-limit-check-field | false | completed |
| `XLOC4-session-lifetime__haiku-graphify__r1` | haiku-graphify | XLOC4-session-lifetime | false | completed |
| `XLOC5-delivery-retry-policy__haiku-baseline__r1` | haiku-baseline | XLOC5-delivery-retry-policy | false | completed |
| `XLOC5-delivery-retry-policy__haiku-graphify__r1` | haiku-graphify | XLOC5-delivery-retry-policy | false | completed |

## 10. Per-set breakdown (drift between measurement sets)

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

### set `structural` — 180 runs over 45 tasks

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline-nosub | 45 | **230,081** (126,680–378,938) | 229,091 | 0.134 | 8.0 | 0 in 0 run(s) | 170 | 0 | 0 | 232 | 0 | 84.4% (38/45) | 311,808 |
| graphify-strict | 45 | **288,533** (181,403–463,327) | 286,953 | 0.186 | 8.0 | 1 in 1 run(s) | 141 | 0 | 0 | 216 | 83 | 77.8% (35/45) | 414,500 |
| haiku-baseline | 45 | **502,978** (159,352–754,040) | 498,061 | 0.121 | 15.0 | 2 in 1 run(s) | 278 | 0 | 0 | 350 | 0 | 80.0% (36/45) | 621,126 |
| haiku-graphify | 45 | **327,185** (190,413–523,370) | 326,189 | 0.103 | 10.0 | 0 in 0 run(s) | 229 | 0 | 0 | 155 | 99 | 82.2% (37/45) | 491,331 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 0 | – | [–, –] | – | n too small |
| uncached_equivalent | 0 | – | [–, –] | – | n too small |
| total_cost_usd | 0 | – | [–, –] | – | n too small |
| num_turns | 0 | – | [–, –] | – | n too small |

## 11. Deliberately-easy controls vs the rest

Some tasks were written as **designed zero-advantage controls**: their answer is reproduced exactly by a single literal `grep`, so a structural index has nothing to add and the expected effect is zero or negative. They are marked `DELIBERATELY EASY` in the task notes and are separated out here so they neither flatter nor drag the headline number. Easy tasks: `IMP2-rename-issue-created`, `LOC1-shortcut-match`, `XIMP2-rename-comment-created`, `XLOC1-retry-throttle`, `XREF5-rate-limit-importers`.

### easy (zero-advantage controls) — 30 runs over 5 tasks

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 5 | **121,254** (120,997–161,762) | 120,026 | 0.083 | 4.0 | 1 in 1 run(s) | 6 | 0 | 0 | 15 | 0 | 60.0% (3/5) | 237,318 |
| baseline-nosub | 5 | **80,302** (79,836–107,441) | 79,317 | 0.072 | 4.0 | 0 in 0 run(s) | 6 | 0 | 0 | 14 | 0 | 60.0% (3/5) | 163,665 |
| graphify | 5 | **160,029** (141,551–240,807) | 159,058 | 0.116 | 6.0 | 0 in 0 run(s) | 4 | 0 | 0 | 16 | 6 | 60.0% (3/5) | 226,858 |
| graphify-strict | 5 | **166,765** (133,014–206,080) | 165,794 | 0.129 | 5.0 | 0 in 0 run(s) | 3 | 0 | 0 | 16 | 5 | 60.0% (3/5) | 194,847 |
| haiku-baseline | 5 | **130,913** (92,281–168,261) | 129,935 | 0.049 | 5.0 | 0 in 0 run(s) | 7 | 0 | 0 | 25 | 0 | 60.0% (3/5) | 251,088 |
| haiku-graphify | 5 | **102,483** (98,518–125,223) | 101,512 | 0.049 | 4.0 | 0 in 0 run(s) | 4 | 0 | 0 | 10 | 6 | 60.0% (3/5) | 140,655 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 5 | 31,715.4 | [-14,036.8, 82,196.4] | 33.3% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 5 | 51,018.0 | [9,562.0, 92,474.0] | 59.9% | graphify higher |
| total_cost_usd | 5 | 0.0254 | [0.0031, 0.0549] | 31.7% | graphify higher |
| num_turns | 5 | 1.0 | [-0.8, 2.8] | 47.7% | **CI crosses 0 — no detectable difference** |

### rest — 240 runs over 40 tasks

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 40 | **270,860** (214,951–492,675) | 153,413 | 0.203 | 5.0 | 22 in 22 run(s) | 62 | 0 | 0 | 91 | 0 | 87.5% (35/40) | 406,868 |
| baseline-nosub | 40 | **233,554** (144,366–382,636) | 232,574 | 0.144 | 8.0 | 0 in 0 run(s) | 164 | 0 | 0 | 218 | 0 | 87.5% (35/40) | 324,506 |
| graphify | 40 | **319,452** (212,223–488,364) | 318,448 | 0.205 | 9.5 | 0 in 0 run(s) | 187 | 0 | 0 | 192 | 77 | 80.0% (32/40) | 447,956 |
| graphify-strict | 40 | **326,350** (204,604–508,983) | 301,360 | 0.201 | 9.0 | 1 in 1 run(s) | 138 | 0 | 0 | 200 | 78 | 80.0% (32/40) | 435,092 |
| haiku-baseline | 40 | **518,298** (189,475–809,182) | 505,719 | 0.132 | 15.5 | 2 in 1 run(s) | 271 | 0 | 0 | 325 | 0 | 82.5% (33/40) | 654,765 |
| haiku-graphify | 40 | **390,476** (229,454–552,878) | 389,503 | 0.111 | 12.0 | 0 in 0 run(s) | 225 | 0 | 0 | 145 | 93 | 85.0% (34/40) | 522,273 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 40 | 32,145.0 | [-13,872.8, 80,495.9] | 15.5% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 40 | 242,624.0 | [154,150.8, 356,524.3] | 318.4% | graphify higher |
| total_cost_usd | 40 | -0.0102 | [-0.0336, 0.0136] | 4.5% | **CI crosses 0 — no detectable difference** |
| num_turns | 40 | 7.4 | [4.8, 10.5] | 318.1% | graphify higher |

## 12. Limitations

- N = 270 runs over 45 tasks; a single corpus and a single model. These results do not generalize to other codebases or models.
- Bootstrap resamples tasks, so the interval reflects task-to-task variation, not within-task run noise.
- Where a CI crosses zero the honest reading is "no difference detected at this N", not "no difference exists".
- The fixed ~21k-token system-prompt/tool-definition overhead is included in both arms and not subtracted (see §2).
- **1 repetition per (task × condition)**: within-task run-to-run variance is unmeasured, so any single per-task difference may be run noise.
- Subagent traffic is counted in `uncached_all`, but a subagent's tool calls never reach the parent transcript, so the tool-call columns stay main-session-only.
- Raw per-run data lives in `results/runs/<run-id>/`, `results/ext/runs/<run-id>/`, `results/structural/runs/<run-id>/` and the `summary.csv` beside this report.
