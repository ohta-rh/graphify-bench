# graphify-bench results

Generated 2026-09-29T06:54:25.556Z. 288 runs over 12 tasks, conditions: effort-high, effort-low, effort-medium, effort-xhigh, opus-effort-high, opus-effort-low, opus-effort-medium, opus-effort-xhigh, sonnet55-effort-high, sonnet55-effort-low, sonnet55-effort-medium, sonnet55-effort-xhigh.

## 1. Environment

- Claude Code: `2.1.284 (Claude Code)`
- graphify: `graphify 0.9.53`
- Node: `v25.5.0` / pnpm `10.28.2`
- Platform: `darwin 25.2.0 arm64`
- Model: `claude-sonnet-5`, effort `high`, --max-turns 120, --max-budget-usd 8

- Bootstrap: B=2000, percentile 95% CI, seed `graphify-bench-bootstrap`, resampled over **tasks**.
- Corpus: `corpus-v1`, tree hash (sha256) `4148d9b26fb31b95ab8424af1f88cfc7741bb655b3ad3bbb557a8c3c516c12da` (source: `docs/plan/CORPUS.md`).
- Report generated: 2026-09-29.

The `Model` line above is the harness default; arms that override it are listed here. Every field comes from the run's own `run.meta.json`, not from the report's assumptions.

| condition | model | overlays | extra `claude` args | what it isolates |
|---|---|---|---|---|
| `effort-high` | `claude-sonnet-5` | `baseline` | – | Baseline with `--effort high` spelled out. It equals the harness default, so the arm is `baseline` re-measured on the current CLI under a name that pairs it with `opus-effort-high`. |
| `effort-low` | `claude-sonnet-5` | `baseline` | – | As `effort-medium`, one notch further down: baseline with `--effort low`. |
| `effort-medium` | `claude-sonnet-5` | `baseline` | – | A RUNTIME LEVER, not a tool: the baseline overlay byte for byte, invoked with `--effort medium` instead of the harness default `high`. Thinking tokens bill as output, so the reduction is arithmetically certain and the open question is entirely about accuracy. |
| `effort-xhigh` | `claude-sonnet-5` | `baseline` | – | As `effort-high`, one notch up: baseline with `--effort xhigh`. |
| `opus-effort-high` | `claude-opus-5-5` | `baseline` | – | `effort-high` on Opus 5.5 — only the model differs. |
| `opus-effort-low` | `claude-opus-5-5` | `baseline` | – | As `opus-effort-medium`, one notch down: `effort-low` on Opus 5.5. |
| `opus-effort-medium` | `claude-opus-5-5` | `baseline` | – | `effort-medium` with one change: the model is Opus 5.5 instead of the harness default Sonnet 5. Overlay, effort and flags are identical, so the pair isolates the model at a fixed effort. |
| `opus-effort-xhigh` | `claude-opus-5-5` | `baseline` | – | `effort-xhigh` on Opus 5.5 — only the model differs. |
| `sonnet55-effort-high` | `claude-sonnet-5-5` | `baseline` | – | `effort-high` on Sonnet 5.5 — only the model differs. |
| `sonnet55-effort-low` | `claude-sonnet-5-5` | `baseline` | – | `effort-low` on Sonnet 5.5 — only the model differs. |
| `sonnet55-effort-medium` | `claude-sonnet-5-5` | `baseline` | – | `effort-medium` on Sonnet 5.5 — only the model differs. |
| `sonnet55-effort-xhigh` | `claude-sonnet-5-5` | `baseline` | – | `effort-xhigh` on Sonnet 5.5 — only the model differs. |

## 2. Overall

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-high | 24 | **7,421,004** (5,178,437–9,177,626) | 6,827,011 | 2.725 | 80.0 | 9 in 7 run(s) | 826 | 0 | 0 | 519 | 0 | 70.8% (17/24) | 7,233,688 |
| effort-low | 24 | **3,877,194** (3,344,850–5,122,750) | 3,402,205 | 1.728 | 60.0 | 25 in 21 run(s) | 465 | 0 | 0 | 280 | 0 | 75.0% (18/24) | 4,597,097 |
| effort-medium | 24 | **6,138,706** (3,757,975–7,269,753) | 4,648,323 | 2.396 | 66.0 | 26 in 19 run(s) | 715 | 0 | 0 | 301 | 0 | 66.7% (16/24) | 6,222,712 |
| effort-xhigh | 24 | **8,754,070** (7,372,507–10,291,246) | 8,754,070 | 3.052 | 90.5 | 0 in 0 run(s) | 959 | 0 | 0 | 650 | 0 | 58.3% (14/24) | 8,668,269 |
| opus-effort-high | 24 | **2,100,439** (1,485,746–2,792,455) | 2,100,439 | 1.583 | 29.0 | 0 in 0 run(s) | 1 | 0 | 0 | 665 | 0 | 91.7% (22/24) | 2,137,201 |
| opus-effort-low | 24 | **551,725** (419,370–668,836) | 551,725 | 0.604 | 13.5 | 0 in 0 run(s) | 0 | 0 | 0 | 309 | 0 | 95.8% (23/24) | 580,647 |
| opus-effort-medium | 24 | **1,204,199** (973,490–1,754,379) | 1,204,199 | 1.115 | 21.0 | 0 in 0 run(s) | 0 | 0 | 0 | 504 | 0 | 91.7% (22/24) | 1,350,398 |
| opus-effort-xhigh | 24 | **4,343,052** (3,281,736–5,230,050) | 4,343,052 | 2.898 | 44.0 | 0 in 0 run(s) | 2 | 0 | 0 | 1013 | 0 | 95.8% (23/24) | 4,277,640 |
| sonnet55-effort-high | 24 | **930,070** (586,891–1,145,141) | 930,070 | 0.621 | 16.0 | 0 in 0 run(s) | 0 | 0 | 0 | 366 | 0 | 95.8% (23/24) | 950,116 |
| sonnet55-effort-low | 24 | **491,169** (333,371–623,576) | 491,169 | 0.355 | 12.5 | 0 in 0 run(s) | 0 | 0 | 0 | 256 | 0 | 83.3% (20/24) | 488,979 |
| sonnet55-effort-medium | 24 | **618,035** (462,874–808,034) | 618,035 | 0.432 | 14.0 | 0 in 0 run(s) | 3 | 0 | 0 | 294 | 0 | 91.7% (22/24) | 645,764 |
| sonnet55-effort-xhigh | 24 | **2,938,604** (2,348,176–3,780,735) | 2,938,604 | 1.625 | 34.0 | 0 in 0 run(s) | 32 | 0 | 0 | 702 | 0 | 91.7% (22/24) | 3,000,182 |

**`uncached_all` (PRIMARY) = Σ over every entry of `modelUsage` of (inputTokens + cacheReadInputTokens + cacheCreationInputTokens)** — it covers the main session *and* any subagent, so it is commensurable with `total_cost_usd`. `uncached_main` (secondary) is the same sum taken from `usage.*`, which the result JSON populates for the **main session only**; a run that spawned a subagent therefore reports less information volume there than it actually consumed. The `subagents` column lets the two be reconciled. Tool columns are totals across all runs of the condition. T2S (tokens-to-success) = total `uncached_all` of successful runs / number of successful runs.

Fixed overhead, reported separately so readers can subtract it (architecture.md §5):

| condition | first-turn cache_creation (median) |
|---|---|
| effort-high | 12,809 |
| effort-low | 12,377 |
| effort-medium | 12,371 |
| effort-xhigh | 12,378 |
| opus-effort-high | 9,589 |
| opus-effort-low | 9,739 |
| opus-effort-medium | 9,390 |
| opus-effort-xhigh | 9,857 |
| sonnet55-effort-high | 8,470 |
| sonnet55-effort-low | 8,473 |
| sonnet55-effort-medium | 8,823 |
| sonnet55-effort-xhigh | 8,656 |

## 3. Paired difference (opus-effort-low − baseline), all tasks

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 0 | – | [–, –] | – | n too small |
| uncached_equivalent | 0 | – | [–, –] | – | n too small |
| total_cost_usd | 0 | – | [–, –] | – | n too small |
| num_turns | 0 | – | [–, –] | – | n too small |

## 4. Iso-accuracy subset

_No task succeeded in every run of both conditions, so there is no iso-accuracy subset._

## 5. By category

### fix (6 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 0 | – | [–, –] | – | n too small |
| uncached_equivalent | 0 | – | [–, –] | – | n too small |
| total_cost_usd | 0 | – | [–, –] | – | n too small |
| num_turns | 0 | – | [–, –] | – | n too small |

### implement (6 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 0 | – | [–, –] | – | n too small |
| uncached_equivalent | 0 | – | [–, –] | – | n too small |
| total_cost_usd | 0 | – | [–, –] | – | n too small |
| num_turns | 0 | – | [–, –] | – | n too small |

## 6. Answer quality by category

Section 5 reports what each category *cost*. This one reports whether it was *answered*: each cell is `successes/graded · mean grader score`. The two are not interchangeable — an arm that gives up early looks cheap in section 5 and is exposed here.

| condition | **fix** | **implement** |
|---|---|---|
| `effort-high` | 7/12 · 0.583 | 10/12 · 0.833 |
| `effort-low` | 6/12 · 0.500 | 12/12 · 1.000 |
| `effort-medium` | 6/12 · 0.500 | 10/12 · 0.833 |
| `effort-xhigh` | 5/12 · 0.417 | 9/12 · 0.750 |
| `opus-effort-high` | 10/12 · 0.833 | 12/12 · 1.000 |
| `opus-effort-low` | 11/12 · 0.917 | 12/12 · 1.000 |
| `opus-effort-medium` | 10/12 · 0.833 | 12/12 · 1.000 |
| `opus-effort-xhigh` | 11/12 · 0.917 | 12/12 · 1.000 |
| `sonnet55-effort-high` | 11/12 · 0.917 | 12/12 · 1.000 |
| `sonnet55-effort-low` | 9/12 · 0.750 | 11/12 · 0.917 |
| `sonnet55-effort-medium` | 10/12 · 0.833 | 12/12 · 1.000 |
| `sonnet55-effort-xhigh` | 10/12 · 0.833 | 12/12 · 1.000 |

## 7. Structural comparisons

Each block below is an independent paired comparison between two arms, computed with the same machinery as §3: per-task pairing over the same task set, percentile bootstrap over tasks, an iso-accuracy subset scoped to just those two arms, and a per-category breakdown. Arms that are not part of a block are excluded from it entirely.

### `opus-effort-low` vs `effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low | 24 | **3,877,194** (3,344,850–5,122,750) | 3,402,205 | 1.728 | 60.0 | 25 in 21 run(s) | 465 | 0 | 0 | 280 | 0 | 75.0% (18/24) | 4,597,097 |
| opus-effort-low | 24 | **551,725** (419,370–668,836) | 551,725 | 0.604 | 13.5 | 0 in 0 run(s) | 0 | 0 | 0 | 309 | 0 | 95.8% (23/24) | 580,647 |

Paired difference (`opus-effort-low` − `effort-low`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | -3,511,412.1 | [-4,339,461.3, -2,717,638.5] | -84.7% | opus-effort-low lower |
| uncached_equivalent | 12 | -2,964,083.9 | [-3,720,940.6, -2,249,419.3] | -81.7% | opus-effort-low lower |
| total_cost_usd | 12 | -1.0438 | [-1.2748, -0.8163] | -60.0% | opus-effort-low lower |
| num_turns | 12 | -44.3 | [-51.8, -35.8] | -74.6% | opus-effort-low lower |

Iso-accuracy subset (9/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | -3,993,027.6 | [-4,750,437.7, -3,192,113.7] | -86.5% | opus-effort-low lower |
| uncached_equivalent | 9 | -3,434,267.7 | [-4,172,347.2, -2,713,278.5] | -84.5% | opus-effort-low lower |
| total_cost_usd | 9 | -1.2002 | [-1.4136, -0.9780] | -64.4% | opus-effort-low lower |
| num_turns | 9 | -49.9 | [-56.2, -43.2] | -77.4% | opus-effort-low lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | -2,986,160.3 | [-4,452,722.3, -1,728,119.1] | -82.9% | opus-effort-low lower |
| implement | 6 | -4,036,663.8 | [-4,429,920.8, -3,646,068.2] | -86.5% | opus-effort-low lower |

**Verdict.** `opus-effort-low` vs `effort-low` over 12 paired tasks: tokens lower by 3,511,412 (95% CI [-4,339,461, -2,717,638]); cost lower by 1.0438 (95% CI [-1.2748, -0.8163]); turns lower by 44.3 (95% CI [-51.8, -35.8]); accuracy 95.8% vs 75.0% (23/24 vs 18/24).

### `opus-effort-medium` vs `effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-medium | 24 | **6,138,706** (3,757,975–7,269,753) | 4,648,323 | 2.396 | 66.0 | 26 in 19 run(s) | 715 | 0 | 0 | 301 | 0 | 66.7% (16/24) | 6,222,712 |
| opus-effort-medium | 24 | **1,204,199** (973,490–1,754,379) | 1,204,199 | 1.115 | 21.0 | 0 in 0 run(s) | 0 | 0 | 0 | 504 | 0 | 91.7% (22/24) | 1,350,398 |

Paired difference (`opus-effort-medium` − `effort-medium`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | -4,285,317.5 | [-5,334,912.5, -3,177,984.0] | -74.2% | opus-effort-medium lower |
| uncached_equivalent | 12 | -3,275,717.8 | [-4,395,846.7, -2,199,926.2] | -66.4% | opus-effort-medium lower |
| total_cost_usd | 12 | -1.1390 | [-1.5729, -0.7688] | -45.6% | opus-effort-medium lower |
| num_turns | 12 | -41.2 | [-52.7, -30.5] | -62.0% | opus-effort-medium lower |

Iso-accuracy subset (6/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | -5,178,051.4 | [-6,486,461.1, -3,568,894.3] | -79.8% | opus-effort-medium lower |
| uncached_equivalent | 6 | -4,441,787.3 | [-5,815,775.7, -2,947,349.3] | -77.2% | opus-effort-medium lower |
| total_cost_usd | 6 | -1.4009 | [-2.0816, -0.8317] | -51.9% | opus-effort-medium lower |
| num_turns | 6 | -49.8 | [-65.3, -37.2] | -69.2% | opus-effort-medium lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | -3,064,256.4 | [-4,348,164.8, -1,791,657.3] | -72.3% | opus-effort-medium lower |
| implement | 6 | -5,506,378.6 | [-6,520,409.5, -4,563,741.5] | -76.2% | opus-effort-medium lower |

**Verdict.** `opus-effort-medium` vs `effort-medium` over 12 paired tasks: tokens lower by 4,285,318 (95% CI [-5,334,913, -3,177,984]); cost lower by 1.1390 (95% CI [-1.5729, -0.7688]); turns lower by 41.2 (95% CI [-52.7, -30.5]); accuracy 91.7% vs 66.7% (22/24 vs 16/24).

### `opus-effort-high` vs `effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-high | 24 | **7,421,004** (5,178,437–9,177,626) | 6,827,011 | 2.725 | 80.0 | 9 in 7 run(s) | 826 | 0 | 0 | 519 | 0 | 70.8% (17/24) | 7,233,688 |
| opus-effort-high | 24 | **2,100,439** (1,485,746–2,792,455) | 2,100,439 | 1.583 | 29.0 | 0 in 0 run(s) | 1 | 0 | 0 | 665 | 0 | 91.7% (22/24) | 2,137,201 |

Paired difference (`opus-effort-high` − `effort-high`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | -5,163,782.7 | [-6,173,637.8, -4,085,614.4] | -70.8% | opus-effort-high lower |
| uncached_equivalent | 12 | -4,429,829.5 | [-5,510,419.8, -3,301,770.1] | -66.1% | opus-effort-high lower |
| total_cost_usd | 12 | -1.0488 | [-1.3438, -0.7181] | -37.5% | opus-effort-high lower |
| num_turns | 12 | -48.8 | [-57.5, -40.5] | -62.3% | opus-effort-high lower |

Iso-accuracy subset (6/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | -5,136,987.4 | [-6,198,476.3, -4,010,416.4] | -72.4% | opus-effort-high lower |
| uncached_equivalent | 6 | -3,973,222.6 | [-5,326,103.5, -2,446,021.3] | -63.8% | opus-effort-high lower |
| total_cost_usd | 6 | -1.1365 | [-1.4732, -0.7150] | -42.6% | opus-effort-high lower |
| num_turns | 6 | -43.5 | [-53.4, -33.2] | -60.2% | opus-effort-high lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | -4,333,344.8 | [-6,041,541.9, -2,705,644.2] | -69.6% | opus-effort-high lower |
| implement | 6 | -5,994,220.5 | [-6,704,319.8, -5,296,368.7] | -72.1% | opus-effort-high lower |

**Verdict.** `opus-effort-high` vs `effort-high` over 12 paired tasks: tokens lower by 5,163,783 (95% CI [-6,173,638, -4,085,614]); cost lower by 1.0488 (95% CI [-1.3438, -0.7181]); turns lower by 48.8 (95% CI [-57.5, -40.5]); accuracy 91.7% vs 70.8% (22/24 vs 17/24).

### `opus-effort-xhigh` vs `effort-xhigh`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-xhigh | 24 | **8,754,070** (7,372,507–10,291,246) | 8,754,070 | 3.052 | 90.5 | 0 in 0 run(s) | 959 | 0 | 0 | 650 | 0 | 58.3% (14/24) | 8,668,269 |
| opus-effort-xhigh | 24 | **4,343,052** (3,281,736–5,230,050) | 4,343,052 | 2.898 | 44.0 | 0 in 0 run(s) | 2 | 0 | 0 | 1013 | 0 | 95.8% (23/24) | 4,277,640 |

Paired difference (`opus-effort-xhigh` − `effort-xhigh`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | -4,159,714.8 | [-5,117,200.5, -3,094,831.3] | -48.1% | opus-effort-xhigh lower |
| uncached_equivalent | 12 | -4,159,714.8 | [-5,177,396.2, -3,109,934.0] | -48.1% | opus-effort-xhigh lower |
| total_cost_usd | 12 | -0.0427 | [-0.3219, 0.2516] | 1.7% | **CI crosses 0 — no detectable difference** |
| num_turns | 12 | -48.3 | [-58.4, -38.7] | -50.8% | opus-effort-xhigh lower |

Iso-accuracy subset (6/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | -4,393,323.9 | [-5,769,532.8, -2,863,006.3] | -47.8% | opus-effort-xhigh lower |
| uncached_equivalent | 6 | -4,393,323.9 | [-5,797,020.7, -2,862,660.3] | -47.8% | opus-effort-xhigh lower |
| total_cost_usd | 6 | -0.0667 | [-0.5468, 0.4526] | -1.0% | **CI crosses 0 — no detectable difference** |
| num_turns | 6 | -48.8 | [-62.3, -37.8] | -49.9% | opus-effort-xhigh lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | -2,735,703.9 | [-3,748,891.1, -1,748,086.9] | -40.4% | opus-effort-xhigh lower |
| implement | 6 | -5,583,725.6 | [-6,211,888.7, -4,775,310.1] | -55.8% | opus-effort-xhigh lower |

**Verdict.** `opus-effort-xhigh` vs `effort-xhigh` over 12 paired tasks: tokens lower by 4,159,715 (95% CI [-5,117,201, -3,094,831]); cost no detectable difference; turns lower by 48.3 (95% CI [-58.4, -38.7]); accuracy 95.8% vs 58.3% (23/24 vs 14/24).

### `opus-effort-low` vs `effort-xhigh`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-xhigh | 24 | **8,754,070** (7,372,507–10,291,246) | 8,754,070 | 3.052 | 90.5 | 0 in 0 run(s) | 959 | 0 | 0 | 650 | 0 | 58.3% (14/24) | 8,668,269 |
| opus-effort-low | 24 | **551,725** (419,370–668,836) | 551,725 | 0.604 | 13.5 | 0 in 0 run(s) | 0 | 0 | 0 | 309 | 0 | 95.8% (23/24) | 580,647 |

Paired difference (`opus-effort-low` − `effort-xhigh`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | -7,860,304.8 | [-9,089,745.5, -6,509,472.6] | -93.0% | opus-effort-low lower |
| uncached_equivalent | 12 | -7,860,304.8 | [-9,062,370.5, -6,499,237.7] | -93.0% | opus-effort-low lower |
| total_cost_usd | 12 | -2.2483 | [-2.5994, -1.8789] | -77.6% | opus-effort-low lower |
| num_turns | 12 | -79.0 | [-91.2, -67.0] | -84.4% | opus-effort-low lower |

Iso-accuracy subset (6/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | -8,375,392.3 | [-9,351,916.6, -7,459,658.1] | -93.0% | opus-effort-low lower |
| uncached_equivalent | 6 | -8,375,392.3 | [-9,401,324.8, -7,464,041.5] | -93.0% | opus-effort-low lower |
| total_cost_usd | 6 | -2.3615 | [-2.6019, -2.1231] | -78.1% | opus-effort-low lower |
| num_turns | 6 | -81.8 | [-96.7, -71.7] | -84.2% | opus-effort-low lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | -6,289,875.8 | [-7,761,772.7, -4,595,203.3] | -92.1% | opus-effort-low lower |
| implement | 6 | -9,430,733.8 | [-10,373,501.0, -8,396,465.7] | -93.9% | opus-effort-low lower |

**Verdict.** `opus-effort-low` vs `effort-xhigh` over 12 paired tasks: tokens lower by 7,860,305 (95% CI [-9,089,746, -6,509,473]); cost lower by 2.2483 (95% CI [-2.5994, -1.8789]); turns lower by 79.0 (95% CI [-91.2, -67.0]); accuracy 95.8% vs 58.3% (23/24 vs 14/24).

### `opus-effort-high` vs `opus-effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-low | 24 | **551,725** (419,370–668,836) | 551,725 | 0.604 | 13.5 | 0 in 0 run(s) | 0 | 0 | 0 | 309 | 0 | 95.8% (23/24) | 580,647 |
| opus-effort-high | 24 | **2,100,439** (1,485,746–2,792,455) | 2,100,439 | 1.583 | 29.0 | 0 in 0 run(s) | 1 | 0 | 0 | 665 | 0 | 91.7% (22/24) | 2,137,201 |

Paired difference (`opus-effort-high` − `opus-effort-low`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 1,521,077.8 | [1,129,528.1, 1,919,217.7] | 269.4% | opus-effort-high higher |
| uncached_equivalent | 12 | 1,521,077.8 | [1,125,499.0, 1,933,995.8] | 269.4% | opus-effort-high higher |
| total_cost_usd | 12 | 0.9201 | [0.7352, 1.0927] | 147.8% | opus-effort-high higher |
| num_turns | 12 | 14.9 | [11.5, 18.3] | 110.6% | opus-effort-high higher |

Iso-accuracy subset (10/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 10 | 1,496,645.4 | [1,061,998.7, 1,945,215.8] | 266.9% | opus-effort-high higher |
| uncached_equivalent | 10 | 1,496,645.4 | [1,047,258.4, 1,933,365.2] | 266.9% | opus-effort-high higher |
| total_cost_usd | 10 | 0.9034 | [0.7002, 1.1121] | 144.7% | opus-effort-high higher |
| num_turns | 10 | 15.0 | [11.1, 18.7] | 113.2% | opus-effort-high higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 1,306,879.3 | [655,873.8, 2,011,399.3] | 227.5% | opus-effort-high higher |
| implement | 6 | 1,735,276.3 | [1,305,019.5, 2,142,241.9] | 311.3% | opus-effort-high higher |

**Verdict.** `opus-effort-high` vs `opus-effort-low` over 12 paired tasks: tokens higher by 1,521,078 (95% CI [1,129,528, 1,919,218]); cost higher by 0.9201 (95% CI [0.7352, 1.0927]); turns higher by 14.9 (95% CI [11.5, 18.3]); accuracy 91.7% vs 95.8% (22/24 vs 23/24).

### `opus-effort-xhigh` vs `opus-effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-low | 24 | **551,725** (419,370–668,836) | 551,725 | 0.604 | 13.5 | 0 in 0 run(s) | 0 | 0 | 0 | 309 | 0 | 95.8% (23/24) | 580,647 |
| opus-effort-xhigh | 24 | **4,343,052** (3,281,736–5,230,050) | 4,343,052 | 2.898 | 44.0 | 0 in 0 run(s) | 2 | 0 | 0 | 1013 | 0 | 95.8% (23/24) | 4,277,640 |

Paired difference (`opus-effort-xhigh` − `opus-effort-low`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 3,700,590.0 | [2,987,627.6, 4,389,152.0] | 678.3% | opus-effort-xhigh higher |
| uncached_equivalent | 12 | 3,700,590.0 | [2,989,394.5, 4,412,032.2] | 678.3% | opus-effort-xhigh higher |
| total_cost_usd | 12 | 2.2056 | [1.8885, 2.5049] | 359.0% | opus-effort-xhigh higher |
| num_turns | 12 | 30.8 | [26.3, 34.9] | 232.2% | opus-effort-xhigh higher |

Iso-accuracy subset (11/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 11 | 3,633,778.6 | [2,875,898.4, 4,403,876.5] | 667.8% | opus-effort-xhigh higher |
| uncached_equivalent | 11 | 3,633,778.6 | [2,913,592.3, 4,392,340.2] | 667.8% | opus-effort-xhigh higher |
| total_cost_usd | 11 | 2.1642 | [1.8386, 2.4606] | 350.3% | opus-effort-xhigh higher |
| num_turns | 11 | 30.5 | [25.8, 35.0] | 232.0% | opus-effort-xhigh higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 3,554,171.8 | [2,438,673.1, 4,802,142.3] | 656.8% | opus-effort-xhigh higher |
| implement | 6 | 3,847,008.2 | [3,120,006.8, 4,552,706.5] | 699.8% | opus-effort-xhigh higher |

**Verdict.** `opus-effort-xhigh` vs `opus-effort-low` over 12 paired tasks: tokens higher by 3,700,590 (95% CI [2,987,628, 4,389,152]); cost higher by 2.2056 (95% CI [1.8885, 2.5049]); turns higher by 30.8 (95% CI [26.3, 34.9]); accuracy 95.8% vs 95.8% (23/24 vs 23/24).

### `effort-xhigh` vs `effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low | 24 | **3,877,194** (3,344,850–5,122,750) | 3,402,205 | 1.728 | 60.0 | 25 in 21 run(s) | 465 | 0 | 0 | 280 | 0 | 75.0% (18/24) | 4,597,097 |
| effort-xhigh | 24 | **8,754,070** (7,372,507–10,291,246) | 8,754,070 | 3.052 | 90.5 | 0 in 0 run(s) | 959 | 0 | 0 | 650 | 0 | 58.3% (14/24) | 8,668,269 |

Paired difference (`effort-xhigh` − `effort-low`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 4,348,892.7 | [3,223,702.2, 5,429,047.2] | 121.1% | effort-xhigh higher |
| uncached_equivalent | 12 | 4,896,220.9 | [3,723,747.0, 6,121,555.6] | 166.7% | effort-xhigh higher |
| total_cost_usd | 12 | 1.2045 | [0.9378, 1.5009] | 79.2% | effort-xhigh higher |
| num_turns | 12 | 34.7 | [24.8, 44.5] | 64.8% | effort-xhigh higher |

Iso-accuracy subset (6/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 4,000,466.6 | [2,445,111.8, 5,452,966.8] | 87.0% | effort-xhigh higher |
| uncached_equivalent | 6 | 4,551,098.2 | [3,024,516.9, 6,058,530.3] | 111.2% | effort-xhigh higher |
| total_cost_usd | 6 | 1.0815 | [0.7244, 1.3805] | 57.8% | effort-xhigh higher |
| num_turns | 6 | 30.3 | [19.0, 40.1] | 47.3% | effort-xhigh higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 3,303,715.4 | [1,742,028.9, 4,896,053.5] | 126.2% | effort-xhigh higher |
| implement | 6 | 5,394,069.9 | [4,431,710.3, 6,356,245.0] | 115.9% | effort-xhigh higher |

**Verdict.** `effort-xhigh` vs `effort-low` over 12 paired tasks: tokens higher by 4,348,893 (95% CI [3,223,702, 5,429,047]); cost higher by 1.2045 (95% CI [0.9378, 1.5009]); turns higher by 34.7 (95% CI [24.8, 44.5]); accuracy 58.3% vs 75.0% (14/24 vs 18/24).

### `sonnet55-effort-low` vs `effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low | 24 | **3,877,194** (3,344,850–5,122,750) | 3,402,205 | 1.728 | 60.0 | 25 in 21 run(s) | 465 | 0 | 0 | 280 | 0 | 75.0% (18/24) | 4,597,097 |
| sonnet55-effort-low | 24 | **491,169** (333,371–623,576) | 491,169 | 0.355 | 12.5 | 0 in 0 run(s) | 0 | 0 | 0 | 256 | 0 | 83.3% (20/24) | 488,979 |

Paired difference (`sonnet55-effort-low` − `effort-low`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | -3,595,013.9 | [-4,413,805.7, -2,799,815.6] | -87.0% | sonnet55-effort-low lower |
| uncached_equivalent | 12 | -3,047,685.7 | [-3,784,545.2, -2,311,394.2] | -84.6% | sonnet55-effort-low lower |
| total_cost_usd | 12 | -1.3085 | [-1.5414, -1.0606] | -77.2% | sonnet55-effort-low lower |
| num_turns | 12 | -46.3 | [-53.3, -38.8] | -78.5% | sonnet55-effort-low lower |

Iso-accuracy subset (8/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 8 | -4,122,221.3 | [-5,028,808.3, -3,166,362.8] | -88.8% | sonnet55-effort-low lower |
| uncached_equivalent | 8 | -3,564,998.2 | [-4,421,727.0, -2,862,300.6] | -87.3% | sonnet55-effort-low lower |
| total_cost_usd | 8 | -1.4730 | [-1.7125, -1.1753] | -79.9% | sonnet55-effort-low lower |
| num_turns | 8 | -52.9 | [-58.9, -46.1] | -81.4% | sonnet55-effort-low lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | -3,101,247.8 | [-4,676,340.1, -1,823,197.5] | -86.3% | sonnet55-effort-low lower |
| implement | 6 | -4,088,780.0 | [-4,444,845.8, -3,766,271.8] | -87.8% | sonnet55-effort-low lower |

**Verdict.** `sonnet55-effort-low` vs `effort-low` over 12 paired tasks: tokens lower by 3,595,014 (95% CI [-4,413,806, -2,799,816]); cost lower by 1.3085 (95% CI [-1.5414, -1.0606]); turns lower by 46.3 (95% CI [-53.3, -38.8]); accuracy 83.3% vs 75.0% (20/24 vs 18/24).

### `sonnet55-effort-medium` vs `effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-medium | 24 | **6,138,706** (3,757,975–7,269,753) | 4,648,323 | 2.396 | 66.0 | 26 in 19 run(s) | 715 | 0 | 0 | 301 | 0 | 66.7% (16/24) | 6,222,712 |
| sonnet55-effort-medium | 24 | **618,035** (462,874–808,034) | 618,035 | 0.432 | 14.0 | 0 in 0 run(s) | 3 | 0 | 0 | 294 | 0 | 91.7% (22/24) | 645,764 |

Paired difference (`sonnet55-effort-medium` − `effort-medium`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | -4,971,640.0 | [-6,024,968.2, -3,851,207.2] | -87.3% | sonnet55-effort-medium lower |
| uncached_equivalent | 12 | -3,962,040.3 | [-5,117,992.4, -2,770,784.5] | -83.5% | sonnet55-effort-medium lower |
| total_cost_usd | 12 | -1.8299 | [-2.2442, -1.4169] | -79.0% | sonnet55-effort-medium lower |
| num_turns | 12 | -49.5 | [-61.8, -38.4] | -75.7% | sonnet55-effort-medium lower |

Iso-accuracy subset (7/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 7 | -5,784,520.6 | [-7,000,416.3, -4,229,071.9] | -89.4% | sonnet55-effort-medium lower |
| uncached_equivalent | 7 | -5,046,248.8 | [-6,317,516.3, -3,687,437.2] | -88.2% | sonnet55-effort-medium lower |
| total_cost_usd | 7 | -2.0556 | [-2.6141, -1.4586] | -81.4% | sonnet55-effort-medium lower |
| num_turns | 7 | -57.2 | [-70.3, -44.4] | -80.1% | sonnet55-effort-medium lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | -3,518,727.4 | [-4,833,785.6, -2,226,034.3] | -85.1% | sonnet55-effort-medium lower |
| implement | 6 | -6,424,552.5 | [-7,221,086.3, -5,625,708.4] | -89.6% | sonnet55-effort-medium lower |

**Verdict.** `sonnet55-effort-medium` vs `effort-medium` over 12 paired tasks: tokens lower by 4,971,640 (95% CI [-6,024,968, -3,851,207]); cost lower by 1.8299 (95% CI [-2.2442, -1.4169]); turns lower by 49.5 (95% CI [-61.8, -38.4]); accuracy 91.7% vs 66.7% (22/24 vs 16/24).

### `sonnet55-effort-high` vs `effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-high | 24 | **7,421,004** (5,178,437–9,177,626) | 6,827,011 | 2.725 | 80.0 | 9 in 7 run(s) | 826 | 0 | 0 | 519 | 0 | 70.8% (17/24) | 7,233,688 |
| sonnet55-effort-high | 24 | **930,070** (586,891–1,145,141) | 930,070 | 0.621 | 16.0 | 0 in 0 run(s) | 0 | 0 | 0 | 366 | 0 | 95.8% (23/24) | 950,116 |

Paired difference (`sonnet55-effort-high` − `effort-high`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | -6,327,093.3 | [-7,544,889.3, -5,163,664.0] | -86.9% | sonnet55-effort-high lower |
| uncached_equivalent | 12 | -5,593,140.2 | [-6,927,445.5, -4,314,137.5] | -85.0% | sonnet55-effort-high lower |
| total_cost_usd | 12 | -1.9784 | [-2.3232, -1.5928] | -75.4% | sonnet55-effort-high lower |
| num_turns | 12 | -61.4 | [-71.4, -51.1] | -78.5% | sonnet55-effort-high lower |

Iso-accuracy subset (7/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 7 | -6,469,562.1 | [-7,564,928.8, -5,262,563.2] | -87.9% | sonnet55-effort-high lower |
| uncached_equivalent | 7 | -5,326,436.1 | [-6,721,744.4, -3,871,746.8] | -84.7% | sonnet55-effort-high lower |
| total_cost_usd | 7 | -2.1031 | [-2.4355, -1.7331] | -77.7% | sonnet55-effort-high lower |
| num_turns | 7 | -57.6 | [-67.8, -48.1] | -78.4% | sonnet55-effort-high lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | -5,406,849.8 | [-7,343,057.8, -3,470,641.9] | -86.9% | sonnet55-effort-high lower |
| implement | 6 | -7,247,336.8 | [-8,125,898.1, -6,398,525.6] | -86.9% | sonnet55-effort-high lower |

**Verdict.** `sonnet55-effort-high` vs `effort-high` over 12 paired tasks: tokens lower by 6,327,093 (95% CI [-7,544,889, -5,163,664]); cost lower by 1.9784 (95% CI [-2.3232, -1.5928]); turns lower by 61.4 (95% CI [-71.4, -51.1]); accuracy 95.8% vs 70.8% (23/24 vs 17/24).

### `sonnet55-effort-xhigh` vs `effort-xhigh`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-xhigh | 24 | **8,754,070** (7,372,507–10,291,246) | 8,754,070 | 3.052 | 90.5 | 0 in 0 run(s) | 959 | 0 | 0 | 650 | 0 | 58.3% (14/24) | 8,668,269 |
| sonnet55-effort-xhigh | 24 | **2,938,604** (2,348,176–3,780,735) | 2,938,604 | 1.625 | 34.0 | 0 in 0 run(s) | 32 | 0 | 0 | 702 | 0 | 91.7% (22/24) | 3,000,182 |

Paired difference (`sonnet55-effort-xhigh` − `effort-xhigh`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | -5,447,437.9 | [-6,396,608.7, -4,442,697.2] | -64.5% | sonnet55-effort-xhigh lower |
| uncached_equivalent | 12 | -5,447,437.9 | [-6,393,092.7, -4,469,306.9] | -64.5% | sonnet55-effort-xhigh lower |
| total_cost_usd | 12 | -1.2690 | [-1.5302, -1.0053] | -43.5% | sonnet55-effort-xhigh lower |
| num_turns | 12 | -59.2 | [-70.0, -48.5] | -62.6% | sonnet55-effort-xhigh lower |

Iso-accuracy subset (6/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | -5,747,908.5 | [-6,712,621.2, -4,795,480.2] | -63.5% | sonnet55-effort-xhigh lower |
| uncached_equivalent | 6 | -5,747,908.5 | [-6,682,268.3, -4,819,316.9] | -63.5% | sonnet55-effort-xhigh lower |
| total_cost_usd | 6 | -1.2820 | [-1.5256, -0.9989] | -42.0% | sonnet55-effort-xhigh lower |
| num_turns | 6 | -59.6 | [-72.1, -50.2] | -61.3% | sonnet55-effort-xhigh lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | -4,142,854.9 | [-5,044,114.7, -3,114,955.1] | -61.8% | sonnet55-effort-xhigh lower |
| implement | 6 | -6,752,020.8 | [-7,460,530.9, -5,994,371.0] | -67.2% | sonnet55-effort-xhigh lower |

**Verdict.** `sonnet55-effort-xhigh` vs `effort-xhigh` over 12 paired tasks: tokens lower by 5,447,438 (95% CI [-6,396,609, -4,442,697]); cost lower by 1.2690 (95% CI [-1.5302, -1.0053]); turns lower by 59.2 (95% CI [-70.0, -48.5]); accuracy 91.7% vs 58.3% (22/24 vs 14/24).

### `opus-effort-low` vs `sonnet55-effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-low | 24 | **491,169** (333,371–623,576) | 491,169 | 0.355 | 12.5 | 0 in 0 run(s) | 0 | 0 | 0 | 256 | 0 | 83.3% (20/24) | 488,979 |
| opus-effort-low | 24 | **551,725** (419,370–668,836) | 551,725 | 0.604 | 13.5 | 0 in 0 run(s) | 0 | 0 | 0 | 309 | 0 | 95.8% (23/24) | 580,647 |

Paired difference (`opus-effort-low` − `sonnet55-effort-low`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 83,601.8 | [5,318.4, 164,660.2] | 18.9% | opus-effort-low higher |
| uncached_equivalent | 12 | 83,601.8 | [7,535.5, 169,376.1] | 18.9% | opus-effort-low higher |
| total_cost_usd | 12 | 0.2647 | [0.2227, 0.3147] | 76.3% | opus-effort-low higher |
| num_turns | 12 | 2.0 | [0.4, 3.6] | 18.3% | opus-effort-low higher |

Iso-accuracy subset (9/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | 59,735.1 | [-18,842.4, 147,465.9] | 16.0% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 9 | 59,735.1 | [-20,403.8, 148,259.3] | 16.0% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 9 | 0.2426 | [0.2021, 0.2864] | 72.8% | opus-effort-low higher |
| num_turns | 9 | 1.7 | [-0.2, 3.7] | 17.8% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 115,087.5 | [18,275.0, 220,471.8] | 26.6% | opus-effort-low higher |
| implement | 6 | 52,116.2 | [-60,508.4, 168,619.2] | 11.2% | **CI crosses 0 — no detectable difference** |

**Verdict.** `opus-effort-low` vs `sonnet55-effort-low` over 12 paired tasks: tokens higher by 83,602 (95% CI [5,318, 164,660]); cost higher by 0.2647 (95% CI [0.2227, 0.3147]); turns higher by 2.0 (95% CI [0.4, 3.6]); accuracy 95.8% vs 83.3% (23/24 vs 20/24).

### `opus-effort-medium` vs `sonnet55-effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-medium | 24 | **618,035** (462,874–808,034) | 618,035 | 0.432 | 14.0 | 0 in 0 run(s) | 3 | 0 | 0 | 294 | 0 | 91.7% (22/24) | 645,764 |
| opus-effort-medium | 24 | **1,204,199** (973,490–1,754,379) | 1,204,199 | 1.115 | 21.0 | 0 in 0 run(s) | 0 | 0 | 0 | 504 | 0 | 91.7% (22/24) | 1,350,398 |

Paired difference (`opus-effort-medium` − `sonnet55-effort-medium`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 686,322.5 | [491,674.9, 873,657.2] | 106.0% | opus-effort-medium higher |
| uncached_equivalent | 12 | 686,322.5 | [499,088.6, 871,888.6] | 106.0% | opus-effort-medium higher |
| total_cost_usd | 12 | 0.6908 | [0.5841, 0.7947] | 158.6% | opus-effort-medium higher |
| num_turns | 12 | 8.4 | [6.2, 10.4] | 61.5% | opus-effort-medium higher |

Iso-accuracy subset (10/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 10 | 749,749.7 | [553,916.3, 948,847.0] | 113.8% | opus-effort-medium higher |
| uncached_equivalent | 10 | 749,749.7 | [540,207.5, 940,533.6] | 113.8% | opus-effort-medium higher |
| total_cost_usd | 10 | 0.7187 | [0.5896, 0.8307] | 163.3% | opus-effort-medium higher |
| num_turns | 10 | 9.3 | [7.1, 11.3] | 68.0% | opus-effort-medium higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 454,471.0 | [269,595.3, 671,595.3] | 79.6% | opus-effort-medium higher |
| implement | 6 | 918,173.9 | [746,888.6, 1,096,329.2] | 132.3% | opus-effort-medium higher |

**Verdict.** `opus-effort-medium` vs `sonnet55-effort-medium` over 12 paired tasks: tokens higher by 686,322 (95% CI [491,675, 873,657]); cost higher by 0.6908 (95% CI [0.5841, 0.7947]); turns higher by 8.4 (95% CI [6.2, 10.4]); accuracy 91.7% vs 91.7% (22/24 vs 22/24).

### `opus-effort-high` vs `sonnet55-effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-high | 24 | **930,070** (586,891–1,145,141) | 930,070 | 0.621 | 16.0 | 0 in 0 run(s) | 0 | 0 | 0 | 366 | 0 | 95.8% (23/24) | 950,116 |
| opus-effort-high | 24 | **2,100,439** (1,485,746–2,792,455) | 2,100,439 | 1.583 | 29.0 | 0 in 0 run(s) | 1 | 0 | 0 | 665 | 0 | 91.7% (22/24) | 2,137,201 |

Paired difference (`opus-effort-high` − `sonnet55-effort-high`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 1,163,310.7 | [841,278.1, 1,492,611.7] | 128.1% | opus-effort-high higher |
| uncached_equivalent | 12 | 1,163,310.7 | [852,268.1, 1,491,926.4] | 128.1% | opus-effort-high higher |
| total_cost_usd | 12 | 0.9296 | [0.7832, 1.0796] | 156.4% | opus-effort-high higher |
| num_turns | 12 | 12.5 | [9.5, 15.8] | 77.5% | opus-effort-high higher |

Iso-accuracy subset (10/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 10 | 1,219,804.3 | [846,835.8, 1,602,858.2] | 127.9% | opus-effort-high higher |
| uncached_equivalent | 10 | 1,219,804.3 | [853,852.5, 1,595,440.2] | 127.9% | opus-effort-high higher |
| total_cost_usd | 10 | 0.9432 | [0.7573, 1.1136] | 153.7% | opus-effort-high higher |
| num_turns | 10 | 13.3 | [9.9, 16.7] | 81.8% | opus-effort-high higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 1,073,505.0 | [583,452.7, 1,613,860.3] | 133.9% | opus-effort-high higher |
| implement | 6 | 1,253,116.3 | [885,359.2, 1,596,636.4] | 122.3% | opus-effort-high higher |

**Verdict.** `opus-effort-high` vs `sonnet55-effort-high` over 12 paired tasks: tokens higher by 1,163,311 (95% CI [841,278, 1,492,612]); cost higher by 0.9296 (95% CI [0.7832, 1.0796]); turns higher by 12.5 (95% CI [9.5, 15.8]); accuracy 91.7% vs 95.8% (22/24 vs 23/24).

### `opus-effort-xhigh` vs `sonnet55-effort-xhigh`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-xhigh | 24 | **2,938,604** (2,348,176–3,780,735) | 2,938,604 | 1.625 | 34.0 | 0 in 0 run(s) | 32 | 0 | 0 | 702 | 0 | 91.7% (22/24) | 3,000,182 |
| opus-effort-xhigh | 24 | **4,343,052** (3,281,736–5,230,050) | 4,343,052 | 2.898 | 44.0 | 0 in 0 run(s) | 2 | 0 | 0 | 1013 | 0 | 95.8% (23/24) | 4,277,640 |

Paired difference (`opus-effort-xhigh` − `sonnet55-effort-xhigh`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 1,287,723.1 | [923,951.8, 1,663,645.0] | 46.6% | opus-effort-xhigh higher |
| uncached_equivalent | 12 | 1,287,723.1 | [917,600.7, 1,650,862.3] | 46.6% | opus-effort-xhigh higher |
| total_cost_usd | 12 | 1.2263 | [1.0361, 1.4235] | 80.2% | opus-effort-xhigh higher |
| num_turns | 12 | 10.9 | [7.3, 14.1] | 33.6% | opus-effort-xhigh higher |

Iso-accuracy subset (10/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 10 | 1,363,441.2 | [927,681.1, 1,778,348.8] | 49.2% | opus-effort-xhigh higher |
| uncached_equivalent | 10 | 1,363,441.2 | [935,775.0, 1,783,517.9] | 49.2% | opus-effort-xhigh higher |
| total_cost_usd | 10 | 1.2487 | [1.0116, 1.4765] | 81.4% | opus-effort-xhigh higher |
| num_turns | 10 | 10.8 | [6.8, 14.8] | 32.8% | opus-effort-xhigh higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 1,407,151.0 | [909,133.0, 1,951,069.0] | 56.9% | opus-effort-xhigh higher |
| implement | 6 | 1,168,295.3 | [613,394.8, 1,677,410.1] | 36.3% | opus-effort-xhigh higher |

**Verdict.** `opus-effort-xhigh` vs `sonnet55-effort-xhigh` over 12 paired tasks: tokens higher by 1,287,723 (95% CI [923,952, 1,663,645]); cost higher by 1.2263 (95% CI [1.0361, 1.4235]); turns higher by 10.9 (95% CI [7.3, 14.1]); accuracy 95.8% vs 91.7% (23/24 vs 22/24).

## 8. Features never exercised

graphify exposes more than `query`. The table counts, per arm, how many times each subcommand was invoked across all runs (and, in parentheses, how many runs used it at least once). A zero column is the point: it means the benchmark never put that feature under measurement, so nothing here — positive or negative — can be read as evidence about it.

| condition | runs | `query` | `explain` | `path` | `god-nodes` | `affected` | `save-result` | `reflect` | `update` | `benchmark` |
|---|---|---|---|---|---|---|---|---|---|---|
| `effort-high` | 24 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `effort-low` | 24 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `effort-medium` | 24 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `effort-xhigh` | 24 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `opus-effort-high` | 24 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `opus-effort-low` | 24 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `opus-effort-medium` | 24 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `opus-effort-xhigh` | 24 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `sonnet55-effort-high` | 24 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `sonnet55-effort-low` | 24 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `sonnet55-effort-medium` | 24 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `sonnet55-effort-xhigh` | 24 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |

| condition | runs reading `graph.json` directly | runs that never invoked the CLI (nudge ignored) | strict denials: total (median/run) |
|---|---|---|---|
| `effort-high` | 0 | n/a (no graph) | 0 (0) |
| `effort-low` | 0 | n/a (no graph) | 0 (0) |
| `effort-medium` | 0 | n/a (no graph) | 0 (0) |
| `effort-xhigh` | 0 | n/a (no graph) | 0 (0) |
| `opus-effort-high` | 0 | n/a (no graph) | 0 (0) |
| `opus-effort-low` | 0 | n/a (no graph) | 0 (0) |
| `opus-effort-medium` | 0 | n/a (no graph) | 0 (0) |
| `opus-effort-xhigh` | 0 | n/a (no graph) | 0 (0) |
| `sonnet55-effort-high` | 0 | n/a (no graph) | 0 (0) |
| `sonnet55-effort-low` | 0 | n/a (no graph) | 0 (0) |
| `sonnet55-effort-medium` | 0 | n/a (no graph) | 0 (0) |
| `sonnet55-effort-xhigh` | 0 | n/a (no graph) | 0 (0) |

> **Cross-session memory was never measured.** `save-result`, `reflect` and `affected` are the mechanisms by which graphify is supposed to compound across sessions, and they were invoked **zero times in every arm**. Each benchmark run is a fresh corpus copy with a fresh session, so there is no second session for a saved result to pay off in — the design that would exercise them is a different experiment, not a variation of this one. The honest statement is that this benchmark measures single-session retrieval only.

## 9. Speed

> **Secondary, and noisy.** Every run in every set was measured at **concurrency 3** on a single machine, so session wall-clock includes contention this harness never controlled for and cannot quantify. Tokens and cost are properties of the measurement; durations are not. Read the session rows as an order of magnitude only.

Session timings, median (IQR) in ms:

| condition | runs | process wall `claude.wall_ms` | wall `duration_ms` | API `duration_api_ms` | `ttft_ms` | pre-request `time_to_request_ms` |
|---|---|---|---|---|---|---|
| `effort-high` | 24 | 606,505 (461,622–762,289) | 522,439 (433,598–646,852) | 582,316 (436,186–763,156) | 2,129 (1,740–2,794) | 31 (27–36) |
| `effort-low` | 24 | 428,053 (301,823–479,049) | 313,056 (244,927–455,043) | 420,187 (358,754–510,042) | 1,860 (1,512–2,418) | 27 (10–31) |
| `effort-medium` | 24 | 519,534 (390,728–762,453) | 402,023 (266,285–473,368) | 576,512 (422,027–739,350) | 2,263 (1,725–5,237) | 27 (12–31) |
| `effort-xhigh` | 24 | 648,312 (592,946–827,576) | 646,438 (579,462–825,606) | 622,786 (550,851–802,049) | 2,390 (1,701–3,203) | 30 (28–37) |
| `opus-effort-high` | 24 | 244,500 (172,803–264,857) | 242,631 (170,320–263,229) | 222,250 (153,789–243,340) | 1,435 (1,301–2,041) | 33 (29–40) |
| `opus-effort-low` | 24 | 91,655 (70,694–108,004) | 89,789 (69,560–105,637) | 77,552 (58,844–89,076) | 2,236 (1,718–2,406) | 30 (28–36) |
| `opus-effort-medium` | 24 | 164,972 (129,733–205,301) | 161,862 (128,543–203,309) | 145,026 (117,654–187,268) | 1,424 (1,356–2,112) | 37 (30–45) |
| `opus-effort-xhigh` | 24 | 486,154 (326,587–534,307) | 483,488 (322,518–530,898) | 439,430 (301,710–501,525) | 1,448 (1,392–1,526) | 32 (29–40) |
| `sonnet55-effort-high` | 24 | 124,888 (92,490–152,995) | 120,937 (88,136–145,472) | 107,783 (77,332–122,754) | 2,003 (1,690–2,412) | 34 (31–37) |
| `sonnet55-effort-low` | 24 | 79,715 (56,041–89,757) | 77,268 (52,504–88,331) | 60,370 (42,652–69,647) | 1,814 (1,356–1,994) | 39 (31–58) |
| `sonnet55-effort-medium` | 24 | 90,222 (70,685–104,063) | 88,875 (68,795–98,843) | 69,963 (55,973–79,055) | 1,793 (1,557–1,953) | 29 (27–34) |
| `sonnet55-effort-xhigh` | 24 | 371,929 (322,895–430,489) | 362,455 (320,882–420,305) | 332,538 (298,531–391,276) | 1,301 (956–1,467) | 35 (29–39) |

`claude.wall_ms` is the whole `claude -p` process as the harness timed it. Prefer it over `duration_ms` when an arm delegates: from Claude Code 2.1.28x the `Agent` tool runs in the background and `duration_ms` stops before the subagent's work is folded back in.

`time_to_request_ms` covers everything before the first API request, which is where **MCP server startup lands**: it is the only column in which an arm that must spawn and handshake with a server can differ from one that does not. The transcript itself cannot show that cost — Claude Code connects its configured servers *before* writing the first transcript entry, so the delay between the first entry and the one advertising the server's tools collapses to a few milliseconds of bookkeeping rather than measuring the spawn.

Per-tool-call latency, median (IQR) in ms, pooled over calls:

| condition | `Read` | `Bash` | `Agent` |
|---|---|---|---|
| `effort-high` | 7 (4–11) | 43 (29–184) | 9 (8–15) |
| `effort-low` | 7 (4–11) | 37 (25–1,468) | 11 (9–85,657) |
| `effort-medium` | 7 (5–11) | 46 (29–1,673) | 12 (8–17) |
| `effort-xhigh` | 8 (5–11) | 41 (29–94) | – |
| `opus-effort-high` | 254 (254–254) | 47 (33–78) | – |
| `opus-effort-low` | – | 55 (37–134) | – |
| `opus-effort-medium` | – | 50 (35–77) | – |
| `opus-effort-xhigh` | 5 (5–5) | 44 (31–65) | – |
| `sonnet55-effort-high` | – | 53 (35–97) | – |
| `sonnet55-effort-low` | – | 63 (46–195) | – |
| `sonnet55-effort-medium` | 8 (7–12) | 55 (40–165) | – |
| `sonnet55-effort-xhigh` | 5 (4–7) | 51 (33–89) | – |

Each cell is timed from the transcript entry carrying the `tool_use` block to the entry carrying its matching `tool_result`, both written locally by the same process. Calls whose result never arrived — a run that hit its turn cap mid-call — are absent rather than counted as zero. `n` per cell is the number of calls, not the number of runs, so an arm that called a tool once contributes one observation.

**Index build cost, for scale.** graphify v1: **4.6 s** total (`update` 3.4 s + `cluster-only` 1.2 s, AST-only, no API calls). graphify v2: a comparable AST pass plus roughly **35 min** of LLM-backed document extraction. MemPalace v1: **49 s**; v2: **97 s** (embedding + indexing, `--no-llm`, no API calls). All are one-off costs paid before any run, and none is included in any figure above — they are listed only so a per-query latency can be read against what producing the index cost in the first place.

## 10. Thinking tokens and model mix

Thinking tokens are billed as output and are a **subset** of `output_tokens`, not an addition to it, so the share is the honest reading of an effort change: an arm that merely wrote less prose would move the absolute count without touching the lever. The figure is main-session only — `usage.output_tokens_details` does not see a subagent — so an arm that delegates reports the *parent's* thinking, and its explorer's thinking appears only as tokens against that explorer's model in the second table.

| condition | runs | thinking tokens | main-session output | thinking share |
|---|---|---|---|---|
| `effort-high` | 24 | 515,883 | 1,017,762 | 50.7% |
| `effort-low` | 24 | 161,562 | 571,243 | 28.3% |
| `effort-medium` | 24 | 288,111 | 714,015 | 40.4% |
| `effort-xhigh` | 24 | 761,955 | 1,345,528 | 56.6% |
| `opus-effort-high` | 24 | 129,143 | 474,580 | 27.2% |
| `opus-effort-low` | 24 | 21,810 | 189,191 | 11.5% |
| `opus-effort-medium` | 24 | 69,598 | 340,127 | 20.5% |
| `opus-effort-xhigh` | 24 | 420,898 | 993,882 | 42.3% |
| `sonnet55-effort-high` | 24 | 94,677 | 341,129 | 27.8% |
| `sonnet55-effort-low` | 24 | 28,470 | 186,743 | 15.2% |
| `sonnet55-effort-medium` | 24 | 44,205 | 221,597 | 19.9% |
| `sonnet55-effort-xhigh` | 24 | 500,877 | 1,084,907 | 46.2% |

**Which model spent the tokens.** Summed from `modelUsage` over every run of the arm, on the same definition as `uncached_equivalent_all` (input + cache read + cache creation), so the row totals reconcile with the headline volume rather than describing some adjacent quantity. Note that a ~1k-token Haiku entry appears in **every** arm, including plain `baseline`: that is Claude Code's own background helper call, not delegated exploration. Only an arm whose Haiku row is orders of magnitude larger than that has actually moved work onto Haiku.

That helper's size is a deterministic function of the task prompt, so every Sonnet arm running the same task set reports the **identical** Haiku total. Rows agreeing to the token are therefore the expected result here, not a copy-paste fault — and they are what makes the figure usable as a baseline to read a genuinely delegating arm against.

| condition | `claude-opus-5-5` tokens | `claude-sonnet-5` tokens | `claude-sonnet-5-5` tokens | `claude-opus-5-5` cost | `claude-sonnet-5` cost | `claude-sonnet-5-5` cost |
|---|---|---|---|---|---|---|
| `effort-high` | 0 | 174,277,405 | 0 | $0.00 | $62.23 | $0.00 |
| `effort-low` | 0 | 98,114,644 | 0 | $0.00 | $40.02 | $0.00 |
| `effort-medium` | 0 | 134,520,875 | 0 | $0.00 | $54.35 | $0.00 |
| `effort-xhigh` | 0 | 202,488,068 | 0 | $0.00 | $68.93 | $0.00 |
| `opus-effort-high` | 50,346,621 | 0 | 0 | $37.06 | $0.00 | $0.00 |
| `opus-effort-low` | 13,840,754 | 0 | 0 | $14.97 | $0.00 | $0.00 |
| `opus-effort-medium` | 31,673,255 | 0 | 0 | $27.01 | $0.00 | $0.00 |
| `opus-effort-xhigh` | 102,654,914 | 0 | 0 | $67.91 | $0.00 | $0.00 |
| `sonnet55-effort-high` | 0 | 0 | 22,427,165 | $0.00 | $0.00 | $14.75 |
| `sonnet55-effort-low` | 0 | 0 | 11,834,310 | $0.00 | $0.00 | $8.62 |
| `sonnet55-effort-medium` | 0 | 0 | 15,201,516 | $0.00 | $0.00 | $10.43 |
| `sonnet55-effort-xhigh` | 0 | 0 | 71,749,559 | $0.00 | $0.00 | $38.48 |

## 11. Where the remaining tokens go

`uncached_all` is one number; this section splits it in two, because at this end of the range the remaining question is no longer *how much* an arm spends but *on what*. **fixed = `first_turn_cache_creation` × `num_turns`** — the system prompt and tool definitions, re-sent on every single turn — and **moving = `uncached_all` − fixed**, which is the file contents, tool results and reasoning that are actually about the task. Both are per-run medians, so the two columns need not sum to the `uncached_all` median exactly.

Caveats that bound the reading: `first_turn_cache_creation` and `num_turns` are main-session only while `uncached_all` counts subagents too, so on a delegating arm `fixed` is an under-estimate (the arms below spawn none). And cache reads bill at a tenth of fresh input, so this is a split of **information volume, not of dollars** — a 60% fixed share does not mean 60% of the bill.

| condition | runs | uncached_all (med) | turns (med) | first-turn fixed | fixed = ft×turns (med) | moving (med) | fixed share |
|---|---|---|---|---|---|---|---|
| `effort-high` | 24 | 7,421,004 | 80 | 12,809 | 1,042,897 | 6,399,522 | 14.2% |
| `effort-low` | 24 | 3,877,194 | 60 | 12,377 | 729,195 | 3,158,736 | 18.4% |
| `effort-medium` | 24 | 6,138,706 | 66 | 12,371 | 814,734 | 5,561,732 | 15.0% |
| `effort-xhigh` | 24 | 8,754,070 | 91 | 12,378 | 1,166,940 | 7,580,279 | 13.8% |
| `opus-effort-high` | 24 | 2,100,439 | 29 | 9,589 | 264,261 | 1,807,204 | 13.8% |
| `opus-effort-low` | 24 | 551,725 | 14 | 9,739 | 127,392 | 421,193 | 23.7% |
| `opus-effort-medium` | 24 | 1,204,199 | 21 | 9,390 | 197,659 | 1,002,901 | 15.5% |
| `opus-effort-xhigh` | 24 | 4,343,052 | 44 | 9,857 | 413,503 | 3,918,717 | 10.5% |
| `sonnet55-effort-high` | 24 | 930,070 | 16 | 8,470 | 142,673 | 793,091 | 15.2% |
| `sonnet55-effort-low` | 24 | 491,169 | 13 | 8,473 | 101,303 | 386,360 | 20.7% |
| `sonnet55-effort-medium` | 24 | 618,035 | 14 | 8,823 | 116,584 | 498,033 | 20.3% |
| `sonnet55-effort-xhigh` | 24 | 2,938,604 | 34 | 8,656 | 292,160 | 2,638,853 | 10.2% |

## 12. Counter-productive cases and subagent use

- `effort-high`: **9** subagent(s) spawned across **7**/24 run(s). T2S all-model 7,233,688 vs main-session-only 6,292,290.
- `effort-low`: **25** subagent(s) spawned across **21**/24 run(s). T2S all-model 4,597,097 vs main-session-only 4,038,338.
- `effort-medium`: **26** subagent(s) spawned across **19**/24 run(s). T2S all-model 6,222,712 vs main-session-only 5,397,871.
- `effort-xhigh`: **0** subagent(s) spawned across **0**/24 run(s). T2S all-model 8,668,269 vs main-session-only 8,668,269.
- `opus-effort-high`: **0** subagent(s) spawned across **0**/24 run(s). T2S all-model 2,137,201 vs main-session-only 2,137,201.
- `opus-effort-low`: **0** subagent(s) spawned across **0**/24 run(s). T2S all-model 580,647 vs main-session-only 580,647.
- `opus-effort-medium`: **0** subagent(s) spawned across **0**/24 run(s). T2S all-model 1,350,398 vs main-session-only 1,350,398.
- `opus-effort-xhigh`: **0** subagent(s) spawned across **0**/24 run(s). T2S all-model 4,277,640 vs main-session-only 4,277,640.
- `sonnet55-effort-high`: **0** subagent(s) spawned across **0**/24 run(s). T2S all-model 950,116 vs main-session-only 950,116.
- `sonnet55-effort-low`: **0** subagent(s) spawned across **0**/24 run(s). T2S all-model 488,979 vs main-session-only 488,979.
- `sonnet55-effort-medium`: **0** subagent(s) spawned across **0**/24 run(s). T2S all-model 645,764 vs main-session-only 645,764.
- `sonnet55-effort-xhigh`: **0** subagent(s) spawned across **0**/24 run(s). T2S all-model 3,000,182 vs main-session-only 3,000,182.
- Runs that opened `graphify-out/graph.json` directly: **0**
- graphify-condition runs that never invoked the `graphify` CLI (nudge ignored): **24** (`EFX1-membership-lifecycle__opus-effort-low__r1`, `EFX1-membership-lifecycle__opus-effort-low__r2`, `EFX2-audit-trail__opus-effort-low__r1`, `EFX2-audit-trail__opus-effort-low__r2`, `EFX3-signing-in-and-out__opus-effort-low__r1`, `EFX3-signing-in-and-out__opus-effort-low__r2`, `EFX4-former-members__opus-effort-low__r1`, `EFX4-former-members__opus-effort-low__r2`, `EFX5-closed-workspace__opus-effort-low__r1`, `EFX5-closed-workspace__opus-effort-low__r2`, `EFX6-foreign-references__opus-effort-low__r1`, `EFX6-foreign-references__opus-effort-low__r2`, `EIM1-ownership-handover__opus-effort-low__r1`, `EIM1-ownership-handover__opus-effort-low__r2`, `EIM2-issue-import__opus-effort-low__r1`, `EIM2-issue-import__opus-effort-low__r2`, `EIM3-out-of-office__opus-effort-low__r1`, `EIM3-out-of-office__opus-effort-low__r2`, `EIM4-member-suspension__opus-effort-low__r1`, `EIM4-member-suspension__opus-effort-low__r2`, `EIM5-workspace-lock__opus-effort-low__r1`, `EIM5-workspace-lock__opus-effort-low__r2`, `EIM6-workspace-deletion__opus-effort-low__r1`, `EIM6-workspace-deletion__opus-effort-low__r2`)

## 13. Failed and ungraded runs

Harness failures (`is_error`, or `terminal_reason` other than `completed`): **0**. The table below also lists runs that completed normally but did not meet their grader's success threshold — those are accuracy results, not execution problems.

| run_id | condition | task | is_error | terminal_reason |
|---|---|---|---|---|
| `EFX1-membership-lifecycle__opus-effort-high__r1` | opus-effort-high | EFX1-membership-lifecycle | false | completed |
| `EFX1-membership-lifecycle__opus-effort-high__r2` | opus-effort-high | EFX1-membership-lifecycle | false | completed |
| `EFX1-membership-lifecycle__opus-effort-medium__r1` | opus-effort-medium | EFX1-membership-lifecycle | false | completed |
| `EFX1-membership-lifecycle__opus-effort-medium__r2` | opus-effort-medium | EFX1-membership-lifecycle | false | completed |
| `EFX2-audit-trail__effort-high__r2` | effort-high | EFX2-audit-trail | false | completed |
| `EFX2-audit-trail__effort-low__r1` | effort-low | EFX2-audit-trail | false | completed |
| `EFX2-audit-trail__effort-low__r2` | effort-low | EFX2-audit-trail | false | completed |
| `EFX2-audit-trail__effort-medium__r1` | effort-medium | EFX2-audit-trail | false | completed |
| `EFX2-audit-trail__effort-medium__r2` | effort-medium | EFX2-audit-trail | false | completed |
| `EFX2-audit-trail__effort-xhigh__r1` | effort-xhigh | EFX2-audit-trail | false | completed |
| `EFX2-audit-trail__effort-xhigh__r2` | effort-xhigh | EFX2-audit-trail | false | completed |
| `EFX2-audit-trail__sonnet55-effort-high__r1` | sonnet55-effort-high | EFX2-audit-trail | false | completed |
| `EFX2-audit-trail__sonnet55-effort-low__r1` | sonnet55-effort-low | EFX2-audit-trail | false | completed |
| `EFX2-audit-trail__sonnet55-effort-low__r2` | sonnet55-effort-low | EFX2-audit-trail | false | completed |
| `EFX2-audit-trail__sonnet55-effort-medium__r1` | sonnet55-effort-medium | EFX2-audit-trail | false | completed |
| `EFX2-audit-trail__sonnet55-effort-medium__r2` | sonnet55-effort-medium | EFX2-audit-trail | false | completed |
| `EFX2-audit-trail__sonnet55-effort-xhigh__r1` | sonnet55-effort-xhigh | EFX2-audit-trail | false | completed |
| `EFX3-signing-in-and-out__effort-xhigh__r2` | effort-xhigh | EFX3-signing-in-and-out | false | completed |
| `EFX5-closed-workspace__effort-high__r1` | effort-high | EFX5-closed-workspace | false | completed |
| `EFX5-closed-workspace__effort-high__r2` | effort-high | EFX5-closed-workspace | false | completed |
| `EFX5-closed-workspace__effort-low__r1` | effort-low | EFX5-closed-workspace | false | completed |
| `EFX5-closed-workspace__effort-low__r2` | effort-low | EFX5-closed-workspace | false | completed |
| `EFX5-closed-workspace__effort-medium__r1` | effort-medium | EFX5-closed-workspace | false | completed |
| `EFX5-closed-workspace__effort-medium__r2` | effort-medium | EFX5-closed-workspace | false | completed |
| `EFX5-closed-workspace__effort-xhigh__r1` | effort-xhigh | EFX5-closed-workspace | false | completed |
| `EFX5-closed-workspace__effort-xhigh__r2` | effort-xhigh | EFX5-closed-workspace | false | completed |
| `EFX5-closed-workspace__opus-effort-low__r1` | opus-effort-low | EFX5-closed-workspace | false | completed |
| `EFX5-closed-workspace__opus-effort-xhigh__r1` | opus-effort-xhigh | EFX5-closed-workspace | false | completed |
| `EFX5-closed-workspace__sonnet55-effort-low__r2` | sonnet55-effort-low | EFX5-closed-workspace | false | completed |
| `EFX5-closed-workspace__sonnet55-effort-xhigh__r2` | sonnet55-effort-xhigh | EFX5-closed-workspace | false | completed |
| `EFX6-foreign-references__effort-high__r1` | effort-high | EFX6-foreign-references | false | completed |
| `EFX6-foreign-references__effort-high__r2` | effort-high | EFX6-foreign-references | false | completed |
| `EFX6-foreign-references__effort-low__r1` | effort-low | EFX6-foreign-references | false | completed |
| `EFX6-foreign-references__effort-low__r2` | effort-low | EFX6-foreign-references | false | completed |
| `EFX6-foreign-references__effort-medium__r1` | effort-medium | EFX6-foreign-references | false | completed |
| `EFX6-foreign-references__effort-medium__r2` | effort-medium | EFX6-foreign-references | false | completed |
| `EFX6-foreign-references__effort-xhigh__r1` | effort-xhigh | EFX6-foreign-references | false | completed |
| `EFX6-foreign-references__effort-xhigh__r2` | effort-xhigh | EFX6-foreign-references | false | completed |
| `EIM1-ownership-handover__effort-xhigh__r1` | effort-xhigh | EIM1-ownership-handover | false | completed |
| `EIM2-issue-import__sonnet55-effort-low__r1` | sonnet55-effort-low | EIM2-issue-import | false | completed |
| `EIM4-member-suspension__effort-high__r2` | effort-high | EIM4-member-suspension | false | completed |
| `EIM4-member-suspension__effort-medium__r2` | effort-medium | EIM4-member-suspension | false | completed |
| `EIM6-workspace-deletion__effort-high__r2` | effort-high | EIM6-workspace-deletion | false | completed |
| `EIM6-workspace-deletion__effort-medium__r2` | effort-medium | EIM6-workspace-deletion | false | completed |
| `EIM6-workspace-deletion__effort-xhigh__r1` | effort-xhigh | EIM6-workspace-deletion | false | completed |
| `EIM6-workspace-deletion__effort-xhigh__r2` | effort-xhigh | EIM6-workspace-deletion | false | completed |

## 14. Limitations

- N = 288 runs over 12 tasks; a single corpus and a single model. These results do not generalize to other codebases or models.
- Bootstrap resamples tasks, so the interval reflects task-to-task variation, not within-task run noise.
- Where a CI crosses zero the honest reading is "no difference detected at this N", not "no difference exists".
- The fixed ~21k-token system-prompt/tool-definition overhead is included in both arms and not subtracted (see §2).
- **1 repetition per (task × condition)**: within-task run-to-run variance is unmeasured, so any single per-task difference may be run noise.
- Subagent traffic is counted in `uncached_all`, but a subagent's tool calls never reach the parent transcript, so the tool-call columns stay main-session-only.
- Raw per-run data lives in `results/models/extreme/runs/<run-id>/` and the `summary.csv` beside this report.
