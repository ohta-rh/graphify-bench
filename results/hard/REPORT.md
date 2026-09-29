# graphify-bench results

Generated 2026-09-29T06:54:20.472Z. 416 runs over 16 tasks, conditions: effort-high, effort-low, effort-low-nosub, effort-medium, effort-xhigh, opus-effort-high, opus-effort-low, opus-effort-medium, opus-effort-xhigh, sonnet55-effort-high, sonnet55-effort-low, sonnet55-effort-medium, sonnet55-effort-xhigh.

## 1. Environment

- Claude Code: `2.1.283 (Claude Code)`
- graphify: `graphify 0.9.53`
- Node: `v25.5.0` / pnpm `10.28.2`
- Platform: `darwin 25.2.0 arm64`
- Model: `claude-sonnet-5`, effort `high`, --max-turns 60, --max-budget-usd 4

- Bootstrap: B=2000, percentile 95% CI, seed `graphify-bench-bootstrap`, resampled over **tasks**.
- Corpus: `corpus-v1`, tree hash (sha256) `4148d9b26fb31b95ab8424af1f88cfc7741bb655b3ad3bbb557a8c3c516c12da` (source: `docs/plan/CORPUS.md`).
- Report generated: 2026-09-29.

The `Model` line above is the harness default; arms that override it are listed here. Every field comes from the run's own `run.meta.json`, not from the report's assumptions.

| condition | model | overlays | extra `claude` args | what it isolates |
|---|---|---|---|---|
| `effort-high` | `claude-sonnet-5` | `baseline` | – | Baseline with `--effort high` spelled out. It equals the harness default, so the arm is `baseline` re-measured on the current CLI under a name that pairs it with `opus-effort-high`. |
| `effort-low` | `claude-sonnet-5` | `baseline` | – | As `effort-medium`, one notch further down: baseline with `--effort low`. |
| `effort-low-nosub` | `claude-sonnet-5` | `baseline` | `--disallowedTools Agent` | The two strongest runtime levers at once: baseline's overlay byte for byte, invoked with `--effort low` AND `--disallowedTools Agent`. Both levers cut the same resource — total exploration and thinking — so the arm exists to answer whether their savings add up or overlap. Its treatment lives entirely in `claude.argv`; nothing in the corpus copy differs from a `baseline` run. |
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
| effort-high | 32 | **1,017,962** (776,185–1,845,819) | 971,377 | 0.540 | 23.0 | 14 in 13 run(s) | 287 | 0 | 0 | 347 | 0 | 96.9% (31/32) | 1,956,460 |
| effort-low | 32 | **526,456** (359,052–1,173,759) | 379,277 | 0.287 | 14.0 | 18 in 16 run(s) | 175 | 0 | 0 | 222 | 0 | 93.8% (30/32) | 1,163,504 |
| effort-low-nosub | 32 | **462,770** (305,163–998,978) | 462,770 | 0.226 | 14.0 | 0 in 0 run(s) | 135 | 0 | 0 | 311 | 0 | 90.6% (29/32) | 1,035,691 |
| effort-medium | 32 | **808,946** (530,016–1,878,941) | 502,945 | 0.432 | 17.5 | 24 in 22 run(s) | 226 | 0 | 0 | 251 | 0 | 96.9% (31/32) | 1,557,356 |
| effort-xhigh | 32 | **1,382,317** (807,975–2,614,605) | 1,124,683 | 0.646 | 27.5 | 10 in 8 run(s) | 347 | 0 | 0 | 460 | 0 | 100.0% (32/32) | 2,372,619 |
| opus-effort-high | 32 | **277,823** (204,374–322,160) | 277,823 | 0.343 | 9.0 | 0 in 0 run(s) | 0 | 0 | 0 | 302 | 0 | 100.0% (32/32) | 364,968 |
| opus-effort-low | 32 | **162,261** (126,037–227,161) | 162,261 | 0.209 | 7.0 | 0 in 0 run(s) | 0 | 0 | 0 | 195 | 0 | 100.0% (32/32) | 186,043 |
| opus-effort-medium | 32 | **227,980** (176,611–292,629) | 227,980 | 0.285 | 8.5 | 0 in 0 run(s) | 0 | 0 | 0 | 269 | 0 | 100.0% (32/32) | 290,816 |
| opus-effort-xhigh | 32 | **506,582** (350,640–795,024) | 506,582 | 0.579 | 15.0 | 0 in 0 run(s) | 1 | 0 | 0 | 461 | 0 | 100.0% (32/32) | 745,042 |
| sonnet55-effort-high | 32 | **212,734** (182,979–288,480) | 212,734 | 0.155 | 9.5 | 0 in 0 run(s) | 13 | 0 | 0 | 250 | 0 | 100.0% (32/32) | 279,589 |
| sonnet55-effort-low | 32 | **177,106** (152,604–221,568) | 177,106 | 0.128 | 8.0 | 0 in 0 run(s) | 17 | 0 | 0 | 206 | 0 | 100.0% (32/32) | 200,575 |
| sonnet55-effort-medium | 32 | **168,975** (147,098–232,606) | 168,975 | 0.133 | 8.0 | 0 in 0 run(s) | 14 | 0 | 0 | 203 | 0 | 93.8% (30/32) | 203,604 |
| sonnet55-effort-xhigh | 32 | **370,461** (267,637–691,185) | 370,461 | 0.270 | 15.0 | 0 in 0 run(s) | 39 | 0 | 0 | 372 | 0 | 100.0% (32/32) | 605,586 |

**`uncached_all` (PRIMARY) = Σ over every entry of `modelUsage` of (inputTokens + cacheReadInputTokens + cacheCreationInputTokens)** — it covers the main session *and* any subagent, so it is commensurable with `total_cost_usd`. `uncached_main` (secondary) is the same sum taken from `usage.*`, which the result JSON populates for the **main session only**; a run that spawned a subagent therefore reports less information volume there than it actually consumed. The `subagents` column lets the two be reconciled. Tool columns are totals across all runs of the condition. T2S (tokens-to-success) = total `uncached_all` of successful runs / number of successful runs.

Fixed overhead, reported separately so readers can subtract it (architecture.md §5):

| condition | first-turn cache_creation (median) |
|---|---|
| effort-high | 11,738 |
| effort-low | 11,763 |
| effort-low-nosub | 10,911 |
| effort-medium | 11,754 |
| effort-xhigh | 11,768 |
| opus-effort-high | 8,817 |
| opus-effort-low | 8,768 |
| opus-effort-medium | 8,736 |
| opus-effort-xhigh | 8,816 |
| sonnet55-effort-high | 7,862 |
| sonnet55-effort-low | 7,861 |
| sonnet55-effort-medium | 7,860 |
| sonnet55-effort-xhigh | 7,860 |

## 3. Paired difference (opus-effort-medium − baseline), all tasks

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 0 | – | [–, –] | – | n too small |
| uncached_equivalent | 0 | – | [–, –] | – | n too small |
| total_cost_usd | 0 | – | [–, –] | – | n too small |
| num_turns | 0 | – | [–, –] | – | n too small |

## 4. Iso-accuracy subset

_No task succeeded in every run of both conditions, so there is no iso-accuracy subset._

## 5. By category

### fix (8 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 0 | – | [–, –] | – | n too small |
| uncached_equivalent | 0 | – | [–, –] | – | n too small |
| total_cost_usd | 0 | – | [–, –] | – | n too small |
| num_turns | 0 | – | [–, –] | – | n too small |

### implement (8 tasks)

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
| `effort-high` | 15/16 · 0.938 | 16/16 · 1.000 |
| `effort-low` | 14/16 · 0.875 | 16/16 · 1.000 |
| `effort-low-nosub` | 14/16 · 0.875 | 15/16 · 0.938 |
| `effort-medium` | 15/16 · 0.938 | 16/16 · 1.000 |
| `effort-xhigh` | 16/16 · 1.000 | 16/16 · 1.000 |
| `opus-effort-high` | 16/16 · 1.000 | 16/16 · 1.000 |
| `opus-effort-low` | 16/16 · 1.000 | 16/16 · 1.000 |
| `opus-effort-medium` | 16/16 · 1.000 | 16/16 · 1.000 |
| `opus-effort-xhigh` | 16/16 · 1.000 | 16/16 · 1.000 |
| `sonnet55-effort-high` | 16/16 · 1.000 | 16/16 · 1.000 |
| `sonnet55-effort-low` | 16/16 · 1.000 | 16/16 · 1.000 |
| `sonnet55-effort-medium` | 15/16 · 0.938 | 15/16 · 0.938 |
| `sonnet55-effort-xhigh` | 16/16 · 1.000 | 16/16 · 1.000 |

## 7. Structural comparisons

Each block below is an independent paired comparison between two arms, computed with the same machinery as §3: per-task pairing over the same task set, percentile bootstrap over tasks, an iso-accuracy subset scoped to just those two arms, and a per-category breakdown. Arms that are not part of a block are excluded from it entirely.

### `opus-effort-medium` vs `effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-medium | 32 | **808,946** (530,016–1,878,941) | 502,945 | 0.432 | 17.5 | 24 in 22 run(s) | 226 | 0 | 0 | 251 | 0 | 96.9% (31/32) | 1,557,356 |
| opus-effort-medium | 32 | **227,980** (176,611–292,629) | 227,980 | 0.285 | 8.5 | 0 in 0 run(s) | 0 | 0 | 0 | 269 | 0 | 100.0% (32/32) | 290,816 |

Paired difference (`opus-effort-medium` − `effort-medium`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | -1,238,540.2 | [-1,890,460.8, -694,433.8] | -73.5% | opus-effort-medium lower |
| uncached_equivalent | 16 | -880,613.6 | [-1,521,130.1, -332,876.9] | -30.6% | opus-effort-medium lower |
| total_cost_usd | 16 | -0.3281 | [-0.5068, -0.1795] | -38.8% | opus-effort-medium lower |
| num_turns | 16 | -12.7 | [-20.8, -4.9] | -0.6% | opus-effort-medium lower |

Iso-accuracy subset (15/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 15 | -1,256,092.9 | [-1,919,251.1, -701,425.1] | -73.1% | opus-effort-medium lower |
| uncached_equivalent | 15 | -950,349.1 | [-1,565,224.7, -409,903.5] | -43.0% | opus-effort-medium lower |
| total_cost_usd | 15 | -0.3258 | [-0.5076, -0.1691] | -37.7% | opus-effort-medium lower |
| num_turns | 15 | -14.1 | [-22.2, -6.1] | -23.3% | opus-effort-medium lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | -558,534.9 | [-812,213.3, -324,412.0] | -65.4% | opus-effort-medium lower |
| implement | 8 | -1,918,545.4 | [-2,852,321.5, -1,039,539.5] | -81.5% | opus-effort-medium lower |

**Verdict.** `opus-effort-medium` vs `effort-medium` over 16 paired tasks: tokens lower by 1,238,540 (95% CI [-1,890,461, -694,434]); cost lower by 0.3281 (95% CI [-0.5068, -0.1795]); turns lower by 12.7 (95% CI [-20.8, -4.9]); accuracy 100.0% vs 96.9% (32/32 vs 31/32).

### `opus-effort-low` vs `effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low | 32 | **526,456** (359,052–1,173,759) | 379,277 | 0.287 | 14.0 | 18 in 16 run(s) | 175 | 0 | 0 | 222 | 0 | 93.8% (30/32) | 1,163,504 |
| opus-effort-low | 32 | **162,261** (126,037–227,161) | 162,261 | 0.209 | 7.0 | 0 in 0 run(s) | 0 | 0 | 0 | 195 | 0 | 100.0% (32/32) | 186,043 |

Paired difference (`opus-effort-low` − `effort-low`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | -926,597.6 | [-1,506,613.7, -465,080.1] | -70.8% | opus-effort-low lower |
| uncached_equivalent | 16 | -764,676.9 | [-1,359,653.7, -284,944.4] | -50.2% | opus-effort-low lower |
| total_cost_usd | 16 | -0.2447 | [-0.4083, -0.1088] | -34.2% | opus-effort-low lower |
| num_turns | 16 | -13.3 | [-21.6, -6.0] | -33.9% | opus-effort-low lower |

Iso-accuracy subset (15/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 15 | -979,351.8 | [-1,553,112.3, -485,403.0] | -72.9% | opus-effort-low lower |
| uncached_equivalent | 15 | -818,223.2 | [-1,469,682.0, -306,363.3] | -55.0% | opus-effort-low lower |
| total_cost_usd | 15 | -0.2608 | [-0.4243, -0.1137] | -36.3% | opus-effort-low lower |
| num_turns | 15 | -14.4 | [-22.8, -6.6] | -39.3% | opus-effort-low lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | -264,349.1 | [-352,109.1, -187,153.0] | -58.7% | opus-effort-low lower |
| implement | 8 | -1,588,846.2 | [-2,448,088.8, -749,937.9] | -82.8% | opus-effort-low lower |

**Verdict.** `opus-effort-low` vs `effort-low` over 16 paired tasks: tokens lower by 926,598 (95% CI [-1,506,614, -465,080]); cost lower by 0.2447 (95% CI [-0.4083, -0.1088]); turns lower by 13.3 (95% CI [-21.6, -6.0]); accuracy 100.0% vs 93.8% (32/32 vs 30/32).

### `opus-effort-low` vs `effort-low-nosub`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low-nosub | 32 | **462,770** (305,163–998,978) | 462,770 | 0.226 | 14.0 | 0 in 0 run(s) | 135 | 0 | 0 | 311 | 0 | 90.6% (29/32) | 1,035,691 |
| opus-effort-low | 32 | **162,261** (126,037–227,161) | 162,261 | 0.209 | 7.0 | 0 in 0 run(s) | 0 | 0 | 0 | 195 | 0 | 100.0% (32/32) | 186,043 |

Paired difference (`opus-effort-low` − `effort-low-nosub`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | -785,692.7 | [-1,328,394.7, -347,769.2] | -65.0% | opus-effort-low lower |
| uncached_equivalent | 16 | -785,692.7 | [-1,329,000.0, -334,811.6] | -65.0% | opus-effort-low lower |
| total_cost_usd | 16 | -0.1384 | [-0.2747, -0.0226] | -11.4% | opus-effort-low lower |
| num_turns | 16 | -15.3 | [-24.2, -8.1] | -54.4% | opus-effort-low lower |

Iso-accuracy subset (14/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 14 | -866,436.1 | [-1,444,603.2, -387,600.4] | -67.1% | opus-effort-low lower |
| uncached_equivalent | 14 | -866,436.1 | [-1,442,657.4, -369,315.8] | -67.1% | opus-effort-low lower |
| total_cost_usd | 14 | -0.1594 | [-0.3085, -0.0403] | -14.6% | opus-effort-low lower |
| num_turns | 14 | -16.8 | [-26.0, -8.9] | -57.3% | opus-effort-low lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | -166,259.8 | [-227,135.0, -113,201.3] | -47.9% | opus-effort-low lower |
| implement | 8 | -1,405,125.6 | [-2,240,009.6, -702,062.6] | -82.2% | opus-effort-low lower |

**Verdict.** `opus-effort-low` vs `effort-low-nosub` over 16 paired tasks: tokens lower by 785,693 (95% CI [-1,328,395, -347,769]); cost lower by 0.1384 (95% CI [-0.2747, -0.0226]); turns lower by 15.3 (95% CI [-24.2, -8.1]); accuracy 100.0% vs 90.6% (32/32 vs 29/32).

### `opus-effort-medium` vs `effort-low-nosub`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low-nosub | 32 | **462,770** (305,163–998,978) | 462,770 | 0.226 | 14.0 | 0 in 0 run(s) | 135 | 0 | 0 | 311 | 0 | 90.6% (29/32) | 1,035,691 |
| opus-effort-medium | 32 | **227,980** (176,611–292,629) | 227,980 | 0.285 | 8.5 | 0 in 0 run(s) | 0 | 0 | 0 | 269 | 0 | 100.0% (32/32) | 290,816 |

Paired difference (`opus-effort-medium` − `effort-low-nosub`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | -680,919.6 | [-1,145,081.4, -282,256.9] | -50.4% | opus-effort-medium lower |
| uncached_equivalent | 16 | -680,919.6 | [-1,152,933.9, -266,261.7] | -50.4% | opus-effort-medium lower |
| total_cost_usd | 16 | -0.0318 | [-0.1285, 0.0517] | 20.9% | **CI crosses 0 — no detectable difference** |
| num_turns | 16 | -13.0 | [-20.8, -6.3] | -41.5% | opus-effort-medium lower |

Iso-accuracy subset (14/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 14 | -756,762.6 | [-1,279,655.7, -303,628.5] | -53.2% | opus-effort-medium lower |
| uncached_equivalent | 14 | -756,762.6 | [-1,321,719.6, -297,112.2] | -53.2% | opus-effort-medium lower |
| total_cost_usd | 14 | -0.0481 | [-0.1524, 0.0425] | 16.5% | **CI crosses 0 — no detectable difference** |
| num_turns | 14 | -14.4 | [-23.0, -7.0] | -45.2% | opus-effort-medium lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | -103,989.7 | [-180,460.8, -34,865.8] | -27.6% | opus-effort-medium lower |
| implement | 8 | -1,257,849.5 | [-1,984,095.9, -609,033.2] | -73.2% | opus-effort-medium lower |

**Verdict.** `opus-effort-medium` vs `effort-low-nosub` over 16 paired tasks: tokens lower by 680,920 (95% CI [-1,145,081, -282,257]); cost no detectable difference; turns lower by 13.0 (95% CI [-20.8, -6.3]); accuracy 100.0% vs 90.6% (32/32 vs 29/32).

### `opus-effort-low` vs `opus-effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-medium | 32 | **227,980** (176,611–292,629) | 227,980 | 0.285 | 8.5 | 0 in 0 run(s) | 0 | 0 | 0 | 269 | 0 | 100.0% (32/32) | 290,816 |
| opus-effort-low | 32 | **162,261** (126,037–227,161) | 162,261 | 0.209 | 7.0 | 0 in 0 run(s) | 0 | 0 | 0 | 195 | 0 | 100.0% (32/32) | 186,043 |

Paired difference (`opus-effort-low` − `opus-effort-medium`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | -104,773.1 | [-168,905.0, -54,439.8] | -29.5% | opus-effort-low lower |
| uncached_equivalent | 16 | -104,773.1 | [-166,604.4, -56,299.9] | -29.5% | opus-effort-low lower |
| total_cost_usd | 16 | -0.1066 | [-0.1536, -0.0696] | -27.2% | opus-effort-low lower |
| num_turns | 16 | -2.3 | [-3.3, -1.4] | -21.4% | opus-effort-low lower |

Iso-accuracy subset (16/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | -104,773.1 | [-167,003.2, -56,380.0] | -29.5% | opus-effort-low lower |
| uncached_equivalent | 16 | -104,773.1 | [-163,806.1, -56,739.5] | -29.5% | opus-effort-low lower |
| total_cost_usd | 16 | -0.1066 | [-0.1520, -0.0696] | -27.2% | opus-effort-low lower |
| num_turns | 16 | -2.3 | [-3.3, -1.4] | -21.4% | opus-effort-low lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | -62,270.1 | [-95,898.9, -38,181.0] | -25.7% | opus-effort-low lower |
| implement | 8 | -147,276.1 | [-250,450.6, -62,867.3] | -33.3% | opus-effort-low lower |

**Verdict.** `opus-effort-low` vs `opus-effort-medium` over 16 paired tasks: tokens lower by 104,773 (95% CI [-168,905, -54,440]); cost lower by 0.1066 (95% CI [-0.1536, -0.0696]); turns lower by 2.3 (95% CI [-3.3, -1.4]); accuracy 100.0% vs 100.0% (32/32 vs 32/32).

### `effort-low-nosub` vs `effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low | 32 | **526,456** (359,052–1,173,759) | 379,277 | 0.287 | 14.0 | 18 in 16 run(s) | 175 | 0 | 0 | 222 | 0 | 93.8% (30/32) | 1,163,504 |
| effort-low-nosub | 32 | **462,770** (305,163–998,978) | 462,770 | 0.226 | 14.0 | 0 in 0 run(s) | 135 | 0 | 0 | 311 | 0 | 90.6% (29/32) | 1,035,691 |

Paired difference (`effort-low-nosub` − `effort-low`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | -140,904.9 | [-279,666.5, -9,473.6] | -12.0% | effort-low-nosub lower |
| uncached_equivalent | 16 | 21,015.8 | [-91,199.2, 128,555.1] | 29.7% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 16 | -0.1063 | [-0.1730, -0.0455] | -22.5% | effort-low-nosub lower |
| num_turns | 16 | 2.0 | [0.1, 3.8] | 31.6% | effort-low-nosub higher |

Iso-accuracy subset (14/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 14 | -134,750.9 | [-286,533.3, 7,230.5] | -9.3% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 14 | 37,886.9 | [-78,769.3, 148,842.2] | 32.9% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 14 | -0.1095 | [-0.1888, -0.0411] | -21.3% | effort-low-nosub lower |
| num_turns | 14 | 2.6 | [1.1, 4.3] | 35.5% | effort-low-nosub higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | -98,089.3 | [-203,500.3, -2,852.6] | -18.5% | effort-low-nosub lower |
| implement | 8 | -183,720.6 | [-430,229.5, 46,144.0] | -5.4% | **CI crosses 0 — no detectable difference** |

**Verdict.** `effort-low-nosub` vs `effort-low` over 16 paired tasks: tokens lower by 140,905 (95% CI [-279,666, -9,474]); cost lower by 0.1063 (95% CI [-0.1730, -0.0455]); turns higher by 2.0 (95% CI [0.1, 3.8]); accuracy 90.6% vs 93.8% (29/32 vs 30/32).

### `opus-effort-high` vs `effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-high | 32 | **1,017,962** (776,185–1,845,819) | 971,377 | 0.540 | 23.0 | 14 in 13 run(s) | 287 | 0 | 0 | 347 | 0 | 96.9% (31/32) | 1,956,460 |
| opus-effort-high | 32 | **277,823** (204,374–322,160) | 277,823 | 0.343 | 9.0 | 0 in 0 run(s) | 0 | 0 | 0 | 302 | 0 | 100.0% (32/32) | 364,968 |

Paired difference (`opus-effort-high` − `effort-high`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | -1,552,739.1 | [-2,369,334.7, -865,130.4] | -76.0% | opus-effort-high lower |
| uncached_equivalent | 16 | -1,281,611.1 | [-2,097,223.1, -606,672.2] | -63.1% | opus-effort-high lower |
| total_cost_usd | 16 | -0.3778 | [-0.5663, -0.2138] | -39.1% | opus-effort-high lower |
| num_turns | 16 | -17.3 | [-25.3, -10.1] | -41.3% | opus-effort-high lower |

Iso-accuracy subset (15/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 15 | -1,596,862.2 | [-2,470,558.2, -860,482.9] | -76.0% | opus-effort-high lower |
| uncached_equivalent | 15 | -1,342,605.0 | [-2,246,569.1, -625,957.5] | -63.6% | opus-effort-high lower |
| total_cost_usd | 15 | -0.3809 | [-0.5739, -0.1982] | -38.3% | opus-effort-high lower |
| num_turns | 15 | -18.2 | [-26.5, -10.7] | -42.7% | opus-effort-high lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | -717,503.8 | [-912,677.3, -516,370.5] | -72.7% | opus-effort-high lower |
| implement | 8 | -2,387,974.3 | [-3,669,825.2, -1,212,395.1] | -79.2% | opus-effort-high lower |

**Verdict.** `opus-effort-high` vs `effort-high` over 16 paired tasks: tokens lower by 1,552,739 (95% CI [-2,369,335, -865,130]); cost lower by 0.3778 (95% CI [-0.5663, -0.2138]); turns lower by 17.3 (95% CI [-25.3, -10.1]); accuracy 100.0% vs 96.9% (32/32 vs 31/32).

### `opus-effort-xhigh` vs `effort-xhigh`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-xhigh | 32 | **1,382,317** (807,975–2,614,605) | 1,124,683 | 0.646 | 27.5 | 10 in 8 run(s) | 347 | 0 | 0 | 460 | 0 | 100.0% (32/32) | 2,372,619 |
| opus-effort-xhigh | 32 | **506,582** (350,640–795,024) | 506,582 | 0.579 | 15.0 | 0 in 0 run(s) | 1 | 0 | 0 | 461 | 0 | 100.0% (32/32) | 745,042 |

Paired difference (`opus-effort-xhigh` − `effort-xhigh`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | -1,627,577.3 | [-2,523,634.4, -861,230.4] | -61.3% | opus-effort-xhigh lower |
| uncached_equivalent | 16 | -1,338,471.4 | [-2,216,445.5, -669,983.7] | -52.2% | opus-effort-xhigh lower |
| total_cost_usd | 16 | -0.2370 | [-0.5032, -0.0389] | -10.7% | opus-effort-xhigh lower |
| num_turns | 16 | -17.1 | [-24.6, -9.8] | -40.6% | opus-effort-xhigh lower |

Iso-accuracy subset (16/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | -1,627,577.3 | [-2,595,766.3, -864,558.1] | -61.3% | opus-effort-xhigh lower |
| uncached_equivalent | 16 | -1,338,471.4 | [-2,199,549.0, -622,396.5] | -52.2% | opus-effort-xhigh lower |
| total_cost_usd | 16 | -0.2370 | [-0.4846, -0.0367] | -10.7% | opus-effort-xhigh lower |
| num_turns | 16 | -17.1 | [-25.2, -9.5] | -40.6% | opus-effort-xhigh lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | -714,567.1 | [-1,061,835.1, -377,568.2] | -57.8% | opus-effort-xhigh lower |
| implement | 8 | -2,540,587.4 | [-4,168,870.7, -1,171,230.9] | -64.7% | opus-effort-xhigh lower |

**Verdict.** `opus-effort-xhigh` vs `effort-xhigh` over 16 paired tasks: tokens lower by 1,627,577 (95% CI [-2,523,634, -861,230]); cost lower by 0.2370 (95% CI [-0.5032, -0.0389]); turns lower by 17.1 (95% CI [-24.6, -9.8]); accuracy 100.0% vs 100.0% (32/32 vs 32/32).

### `opus-effort-high` vs `opus-effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-low | 32 | **162,261** (126,037–227,161) | 162,261 | 0.209 | 7.0 | 0 in 0 run(s) | 0 | 0 | 0 | 195 | 0 | 100.0% (32/32) | 186,043 |
| opus-effort-high | 32 | **277,823** (204,374–322,160) | 277,823 | 0.343 | 9.0 | 0 in 0 run(s) | 0 | 0 | 0 | 302 | 0 | 100.0% (32/32) | 364,968 |

Paired difference (`opus-effort-high` − `opus-effort-low`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 178,925.1 | [98,279.7, 288,339.1] | 85.4% | opus-effort-high higher |
| uncached_equivalent | 16 | 178,925.1 | [89,744.3, 284,056.1] | 85.4% | opus-effort-high higher |
| total_cost_usd | 16 | 0.1757 | [0.1104, 0.2593] | 63.5% | opus-effort-high higher |
| num_turns | 16 | 3.4 | [2.4, 4.6] | 49.8% | opus-effort-high higher |

Iso-accuracy subset (16/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 178,925.1 | [96,417.2, 287,857.3] | 85.4% | opus-effort-high higher |
| uncached_equivalent | 16 | 178,925.1 | [93,002.6, 285,528.7] | 85.4% | opus-effort-high higher |
| total_cost_usd | 16 | 0.1757 | [0.1113, 0.2587] | 63.5% | opus-effort-high higher |
| num_turns | 16 | 3.4 | [2.4, 4.6] | 49.8% | opus-effort-high higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | 68,918.4 | [55,735.4, 80,782.8] | 43.1% | opus-effort-high higher |
| implement | 8 | 288,931.8 | [146,361.1, 460,311.6] | 127.7% | opus-effort-high higher |

**Verdict.** `opus-effort-high` vs `opus-effort-low` over 16 paired tasks: tokens higher by 178,925 (95% CI [98,280, 288,339]); cost higher by 0.1757 (95% CI [0.1104, 0.2593]); turns higher by 3.4 (95% CI [2.4, 4.6]); accuracy 100.0% vs 100.0% (32/32 vs 32/32).

### `effort-high` vs `effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low | 32 | **526,456** (359,052–1,173,759) | 379,277 | 0.287 | 14.0 | 18 in 16 run(s) | 175 | 0 | 0 | 222 | 0 | 93.8% (30/32) | 1,163,504 |
| effort-high | 32 | **1,017,962** (776,185–1,845,819) | 971,377 | 0.540 | 23.0 | 14 in 13 run(s) | 287 | 0 | 0 | 347 | 0 | 96.9% (31/32) | 1,956,460 |

Paired difference (`effort-high` − `effort-low`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 805,066.5 | [493,002.2, 1,177,085.7] | 102.5% | effort-high higher |
| uncached_equivalent | 16 | 695,859.3 | [359,237.5, 1,121,230.7] | 141.8% | effort-high higher |
| total_cost_usd | 16 | 0.3087 | [0.2067, 0.4282] | 77.2% | effort-high higher |
| num_turns | 16 | 7.4 | [4.6, 10.5] | 73.4% | effort-high higher |

Iso-accuracy subset (15/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 15 | 802,862.6 | [451,538.5, 1,191,138.0] | 93.3% | effort-high higher |
| uncached_equivalent | 15 | 709,734.0 | [346,372.3, 1,182,747.3] | 132.7% | effort-high higher |
| total_cost_usd | 15 | 0.3004 | [0.1947, 0.4268] | 69.3% | effort-high higher |
| num_turns | 15 | 7.3 | [4.3, 10.9] | 70.1% | effort-high higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | 522,073.2 | [307,368.6, 762,267.3] | 136.6% | effort-high higher |
| implement | 8 | 1,088,059.9 | [532,530.8, 1,750,383.2] | 68.3% | effort-high higher |

**Verdict.** `effort-high` vs `effort-low` over 16 paired tasks: tokens higher by 805,067 (95% CI [493,002, 1,177,086]); cost higher by 0.3087 (95% CI [0.2067, 0.4282]); turns higher by 7.4 (95% CI [4.6, 10.5]); accuracy 96.9% vs 93.8% (31/32 vs 30/32).

### `sonnet55-effort-low` vs `effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low | 32 | **526,456** (359,052–1,173,759) | 379,277 | 0.287 | 14.0 | 18 in 16 run(s) | 175 | 0 | 0 | 222 | 0 | 93.8% (30/32) | 1,163,504 |
| sonnet55-effort-low | 32 | **177,106** (152,604–221,568) | 177,106 | 0.128 | 8.0 | 0 in 0 run(s) | 17 | 0 | 0 | 206 | 0 | 100.0% (32/32) | 200,575 |

Paired difference (`sonnet55-effort-low` − `effort-low`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | -912,065.8 | [-1,482,260.0, -415,414.9] | -68.9% | sonnet55-effort-low lower |
| uncached_equivalent | 16 | -750,145.1 | [-1,321,919.8, -273,019.1] | -45.8% | sonnet55-effort-low lower |
| total_cost_usd | 16 | -0.3422 | [-0.5239, -0.1961] | -60.6% | sonnet55-effort-low lower |
| num_turns | 16 | -12.1 | [-20.4, -4.3] | -21.7% | sonnet55-effort-low lower |

Iso-accuracy subset (15/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 15 | -960,443.4 | [-1,531,599.8, -439,130.5] | -70.0% | sonnet55-effort-low lower |
| uncached_equivalent | 15 | -799,314.8 | [-1,390,651.5, -318,682.3] | -48.4% | sonnet55-effort-low lower |
| total_cost_usd | 15 | -0.3578 | [-0.5397, -0.2003] | -61.4% | sonnet55-effort-low lower |
| num_turns | 15 | -13.0 | [-21.9, -4.9] | -24.1% | sonnet55-effort-low lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | -246,147.9 | [-324,131.3, -180,853.6] | -55.4% | sonnet55-effort-low lower |
| implement | 8 | -1,577,983.6 | [-2,490,002.0, -713,050.6] | -82.4% | sonnet55-effort-low lower |

**Verdict.** `sonnet55-effort-low` vs `effort-low` over 16 paired tasks: tokens lower by 912,066 (95% CI [-1,482,260, -415,415]); cost lower by 0.3422 (95% CI [-0.5239, -0.1961]); turns lower by 12.1 (95% CI [-20.4, -4.3]); accuracy 100.0% vs 93.8% (32/32 vs 30/32).

### `sonnet55-effort-medium` vs `effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-medium | 32 | **808,946** (530,016–1,878,941) | 502,945 | 0.432 | 17.5 | 24 in 22 run(s) | 226 | 0 | 0 | 251 | 0 | 96.9% (31/32) | 1,557,356 |
| sonnet55-effort-medium | 32 | **168,975** (147,098–232,606) | 168,975 | 0.133 | 8.0 | 0 in 0 run(s) | 14 | 0 | 0 | 203 | 0 | 93.8% (30/32) | 203,604 |

Paired difference (`sonnet55-effort-medium` − `effort-medium`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | -1,324,370.6 | [-1,971,414.4, -742,336.6] | -79.6% | sonnet55-effort-medium lower |
| uncached_equivalent | 16 | -966,444.0 | [-1,625,583.0, -434,884.2] | -45.3% | sonnet55-effort-medium lower |
| total_cost_usd | 16 | -0.5239 | [-0.7491, -0.3349] | -71.6% | sonnet55-effort-medium lower |
| num_turns | 16 | -13.8 | [-22.3, -6.0] | -11.5% | sonnet55-effort-medium lower |

Iso-accuracy subset (13/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 13 | -1,145,249.2 | [-1,868,460.8, -583,054.0] | -77.5% | sonnet55-effort-medium lower |
| uncached_equivalent | 13 | -882,669.8 | [-1,571,050.6, -321,650.2] | -50.0% | sonnet55-effort-medium lower |
| total_cost_usd | 13 | -0.4405 | [-0.6483, -0.2665] | -69.0% | sonnet55-effort-medium lower |
| num_turns | 13 | -13.8 | [-22.9, -5.0] | -24.4% | sonnet55-effort-medium lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | -602,968.1 | [-855,712.4, -370,342.3] | -71.8% | sonnet55-effort-medium lower |
| implement | 8 | -2,045,773.1 | [-3,045,866.5, -1,086,930.1] | -87.4% | sonnet55-effort-medium lower |

**Verdict.** `sonnet55-effort-medium` vs `effort-medium` over 16 paired tasks: tokens lower by 1,324,371 (95% CI [-1,971,414, -742,337]); cost lower by 0.5239 (95% CI [-0.7491, -0.3349]); turns lower by 13.8 (95% CI [-22.3, -6.0]); accuracy 93.8% vs 96.9% (30/32 vs 31/32).

### `sonnet55-effort-high` vs `effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-high | 32 | **1,017,962** (776,185–1,845,819) | 971,377 | 0.540 | 23.0 | 14 in 13 run(s) | 287 | 0 | 0 | 347 | 0 | 96.9% (31/32) | 1,956,460 |
| sonnet55-effort-high | 32 | **212,734** (182,979–288,480) | 212,734 | 0.155 | 9.5 | 0 in 0 run(s) | 13 | 0 | 0 | 250 | 0 | 100.0% (32/32) | 279,589 |

Paired difference (`sonnet55-effort-high` − `effort-high`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | -1,638,117.8 | [-2,518,411.0, -891,213.7] | -79.5% | sonnet55-effort-high lower |
| uncached_equivalent | 16 | -1,366,989.9 | [-2,230,705.7, -631,130.3] | -67.0% | sonnet55-effort-high lower |
| total_cost_usd | 16 | -0.5951 | [-0.8453, -0.3914] | -69.4% | sonnet55-effort-high lower |
| num_turns | 16 | -18.1 | [-26.8, -10.0] | -42.0% | sonnet55-effort-high lower |

Iso-accuracy subset (15/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 15 | -1,680,667.5 | [-2,572,599.3, -917,604.9] | -79.2% | sonnet55-effort-high lower |
| uncached_equivalent | 15 | -1,426,410.3 | [-2,318,767.6, -665,173.1] | -66.6% | sonnet55-effort-high lower |
| total_cost_usd | 15 | -0.6007 | [-0.8630, -0.3790] | -68.8% | sonnet55-effort-high lower |
| num_turns | 15 | -18.9 | [-27.9, -10.6] | -42.0% | sonnet55-effort-high lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | -730,635.6 | [-944,141.8, -508,218.3] | -72.5% | sonnet55-effort-high lower |
| implement | 8 | -2,545,600.1 | [-3,869,702.5, -1,376,885.7] | -86.5% | sonnet55-effort-high lower |

**Verdict.** `sonnet55-effort-high` vs `effort-high` over 16 paired tasks: tokens lower by 1,638,118 (95% CI [-2,518,411, -891,214]); cost lower by 0.5951 (95% CI [-0.8453, -0.3914]); turns lower by 18.1 (95% CI [-26.8, -10.0]); accuracy 100.0% vs 96.9% (32/32 vs 31/32).

### `sonnet55-effort-xhigh` vs `effort-xhigh`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-xhigh | 32 | **1,382,317** (807,975–2,614,605) | 1,124,683 | 0.646 | 27.5 | 10 in 8 run(s) | 347 | 0 | 0 | 460 | 0 | 100.0% (32/32) | 2,372,619 |
| sonnet55-effort-xhigh | 32 | **370,461** (267,637–691,185) | 370,461 | 0.270 | 15.0 | 0 in 0 run(s) | 39 | 0 | 0 | 372 | 0 | 100.0% (32/32) | 605,586 |

Paired difference (`sonnet55-effort-xhigh` − `effort-xhigh`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | -1,767,032.8 | [-2,741,758.4, -940,440.1] | -68.3% | sonnet55-effort-xhigh lower |
| uncached_equivalent | 16 | -1,477,927.0 | [-2,327,283.0, -746,816.8] | -62.0% | sonnet55-effort-xhigh lower |
| total_cost_usd | 16 | -0.5738 | [-0.8562, -0.3460] | -53.8% | sonnet55-effort-xhigh lower |
| num_turns | 16 | -17.7 | [-26.3, -9.6] | -42.1% | sonnet55-effort-xhigh lower |

Iso-accuracy subset (16/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | -1,767,032.8 | [-2,775,784.9, -998,633.2] | -68.3% | sonnet55-effort-xhigh lower |
| uncached_equivalent | 16 | -1,477,927.0 | [-2,346,224.2, -754,871.8] | -62.0% | sonnet55-effort-xhigh lower |
| total_cost_usd | 16 | -0.5738 | [-0.8532, -0.3420] | -53.8% | sonnet55-effort-xhigh lower |
| num_turns | 16 | -17.7 | [-26.7, -10.1] | -42.1% | sonnet55-effort-xhigh lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | -799,038.3 | [-1,200,885.4, -443,361.4] | -65.4% | sonnet55-effort-xhigh lower |
| implement | 8 | -2,735,027.4 | [-4,276,453.2, -1,519,277.2] | -71.2% | sonnet55-effort-xhigh lower |

**Verdict.** `sonnet55-effort-xhigh` vs `effort-xhigh` over 16 paired tasks: tokens lower by 1,767,033 (95% CI [-2,741,758, -940,440]); cost lower by 0.5738 (95% CI [-0.8562, -0.3460]); turns lower by 17.7 (95% CI [-26.3, -9.6]); accuracy 100.0% vs 100.0% (32/32 vs 32/32).

### `opus-effort-low` vs `sonnet55-effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-low | 32 | **177,106** (152,604–221,568) | 177,106 | 0.128 | 8.0 | 0 in 0 run(s) | 17 | 0 | 0 | 206 | 0 | 100.0% (32/32) | 200,575 |
| opus-effort-low | 32 | **162,261** (126,037–227,161) | 162,261 | 0.209 | 7.0 | 0 in 0 run(s) | 0 | 0 | 0 | 195 | 0 | 100.0% (32/32) | 186,043 |

Paired difference (`opus-effort-low` − `sonnet55-effort-low`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | -14,531.8 | [-38,457.0, 9,425.7] | -4.5% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 16 | -14,531.8 | [-37,168.3, 8,694.7] | -4.5% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 16 | 0.0975 | [0.0789, 0.1210] | 67.8% | opus-effort-low higher |
| num_turns | 16 | -1.2 | [-2.0, -0.2] | -12.9% | opus-effort-low lower |

Iso-accuracy subset (16/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | -14,531.8 | [-37,642.3, 8,534.2] | -4.5% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 16 | -14,531.8 | [-37,506.0, 9,660.8] | -4.5% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 16 | 0.0975 | [0.0786, 0.1192] | 67.8% | opus-effort-low higher |
| num_turns | 16 | -1.2 | [-2.0, -0.2] | -12.9% | opus-effort-low lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | -18,201.1 | [-45,315.6, 11,759.0] | -7.6% | **CI crosses 0 — no detectable difference** |
| implement | 8 | -10,862.6 | [-44,571.1, 26,255.0] | -1.4% | **CI crosses 0 — no detectable difference** |

**Verdict.** `opus-effort-low` vs `sonnet55-effort-low` over 16 paired tasks: tokens no detectable difference; cost higher by 0.0975 (95% CI [0.0789, 0.1210]); turns lower by 1.2 (95% CI [-2.0, -0.2]); accuracy 100.0% vs 100.0% (32/32 vs 32/32).

### `opus-effort-medium` vs `sonnet55-effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-medium | 32 | **168,975** (147,098–232,606) | 168,975 | 0.133 | 8.0 | 0 in 0 run(s) | 14 | 0 | 0 | 203 | 0 | 93.8% (30/32) | 203,604 |
| opus-effort-medium | 32 | **227,980** (176,611–292,629) | 227,980 | 0.285 | 8.5 | 0 in 0 run(s) | 0 | 0 | 0 | 269 | 0 | 100.0% (32/32) | 290,816 |

Paired difference (`opus-effort-medium` − `sonnet55-effort-medium`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 85,830.4 | [41,739.8, 142,298.6] | 37.6% | opus-effort-medium higher |
| uncached_equivalent | 16 | 85,830.4 | [40,604.7, 139,076.6] | 37.6% | opus-effort-medium higher |
| total_cost_usd | 16 | 0.1958 | [0.1450, 0.2563] | 121.6% | opus-effort-medium higher |
| num_turns | 16 | 1.2 | [-0.1, 2.4] | 14.1% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (14/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 14 | 76,412.9 | [31,762.2, 135,614.0] | 33.7% | opus-effort-medium higher |
| uncached_equivalent | 14 | 76,412.9 | [31,711.2, 136,482.6] | 33.7% | opus-effort-medium higher |
| total_cost_usd | 14 | 0.1859 | [0.1388, 0.2462] | 118.0% | opus-effort-medium higher |
| num_turns | 14 | 0.9 | [-0.5, 2.3] | 10.0% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | 44,433.1 | [7,737.5, 87,544.6] | 25.8% | opus-effort-medium higher |
| implement | 8 | 127,227.7 | [52,482.0, 209,237.8] | 49.5% | opus-effort-medium higher |

**Verdict.** `opus-effort-medium` vs `sonnet55-effort-medium` over 16 paired tasks: tokens higher by 85,830 (95% CI [41,740, 142,299]); cost higher by 0.1958 (95% CI [0.1450, 0.2563]); turns no detectable difference; accuracy 100.0% vs 93.8% (32/32 vs 30/32).

### `opus-effort-high` vs `sonnet55-effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-high | 32 | **212,734** (182,979–288,480) | 212,734 | 0.155 | 9.5 | 0 in 0 run(s) | 13 | 0 | 0 | 250 | 0 | 100.0% (32/32) | 279,589 |
| opus-effort-high | 32 | **277,823** (204,374–322,160) | 277,823 | 0.343 | 9.0 | 0 in 0 run(s) | 0 | 0 | 0 | 302 | 0 | 100.0% (32/32) | 364,968 |

Paired difference (`opus-effort-high` − `sonnet55-effort-high`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 85,378.8 | [29,059.1, 155,554.5] | 31.1% | opus-effort-high higher |
| uncached_equivalent | 16 | 85,378.8 | [31,290.3, 156,026.2] | 31.1% | opus-effort-high higher |
| total_cost_usd | 16 | 0.2173 | [0.1578, 0.2932] | 104.8% | opus-effort-high higher |
| num_turns | 16 | 0.9 | [-0.5, 2.2] | 12.1% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (16/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 85,378.8 | [31,864.5, 149,996.6] | 31.1% | opus-effort-high higher |
| uncached_equivalent | 16 | 85,378.8 | [31,657.1, 152,272.9] | 31.1% | opus-effort-high higher |
| total_cost_usd | 16 | 0.2173 | [0.1560, 0.2977] | 104.8% | opus-effort-high higher |
| num_turns | 16 | 0.9 | [-0.5, 2.2] | 12.1% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | 13,131.8 | [-20,169.8, 50,253.3] | 8.0% | **CI crosses 0 — no detectable difference** |
| implement | 8 | 157,625.8 | [81,297.9, 266,813.7] | 54.2% | opus-effort-high higher |

**Verdict.** `opus-effort-high` vs `sonnet55-effort-high` over 16 paired tasks: tokens higher by 85,379 (95% CI [29,059, 155,555]); cost higher by 0.2173 (95% CI [0.1578, 0.2932]); turns no detectable difference; accuracy 100.0% vs 100.0% (32/32 vs 32/32).

### `opus-effort-xhigh` vs `sonnet55-effort-xhigh`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-xhigh | 32 | **370,461** (267,637–691,185) | 370,461 | 0.270 | 15.0 | 0 in 0 run(s) | 39 | 0 | 0 | 372 | 0 | 100.0% (32/32) | 605,586 |
| opus-effort-xhigh | 32 | **506,582** (350,640–795,024) | 506,582 | 0.579 | 15.0 | 0 in 0 run(s) | 1 | 0 | 0 | 461 | 0 | 100.0% (32/32) | 745,042 |

Paired difference (`opus-effort-xhigh` − `sonnet55-effort-xhigh`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 139,455.6 | [14,786.5, 285,455.0] | 23.9% | opus-effort-xhigh higher |
| uncached_equivalent | 16 | 139,455.6 | [16,922.8, 279,024.0] | 23.9% | opus-effort-xhigh higher |
| total_cost_usd | 16 | 0.3369 | [0.2376, 0.4747] | 93.3% | opus-effort-xhigh higher |
| num_turns | 16 | 0.6 | [-2.3, 3.7] | 7.5% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (16/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 139,455.6 | [15,716.4, 286,300.8] | 23.9% | opus-effort-xhigh higher |
| uncached_equivalent | 16 | 139,455.6 | [23,531.0, 280,681.3] | 23.9% | opus-effort-xhigh higher |
| total_cost_usd | 16 | 0.3369 | [0.2331, 0.4725] | 93.3% | opus-effort-xhigh higher |
| num_turns | 16 | 0.6 | [-2.3, 3.5] | 7.5% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | 84,471.2 | [1,244.3, 194,720.9] | 26.5% | opus-effort-xhigh higher |
| implement | 8 | 194,440.0 | [-32,082.5, 463,309.5] | 21.3% | **CI crosses 0 — no detectable difference** |

**Verdict.** `opus-effort-xhigh` vs `sonnet55-effort-xhigh` over 16 paired tasks: tokens higher by 139,456 (95% CI [14,786, 285,455]); cost higher by 0.3369 (95% CI [0.2376, 0.4747]); turns no detectable difference; accuracy 100.0% vs 100.0% (32/32 vs 32/32).

## 8. Features never exercised

graphify exposes more than `query`. The table counts, per arm, how many times each subcommand was invoked across all runs (and, in parentheses, how many runs used it at least once). A zero column is the point: it means the benchmark never put that feature under measurement, so nothing here — positive or negative — can be read as evidence about it.

| condition | runs | `query` | `explain` | `path` | `god-nodes` | `affected` | `save-result` | `reflect` | `update` | `benchmark` |
|---|---|---|---|---|---|---|---|---|---|---|
| `effort-high` | 32 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `effort-low` | 32 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `effort-low-nosub` | 32 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `effort-medium` | 32 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `effort-xhigh` | 32 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `opus-effort-high` | 32 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `opus-effort-low` | 32 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `opus-effort-medium` | 32 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `opus-effort-xhigh` | 32 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `sonnet55-effort-high` | 32 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `sonnet55-effort-low` | 32 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `sonnet55-effort-medium` | 32 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `sonnet55-effort-xhigh` | 32 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |

| condition | runs reading `graph.json` directly | runs that never invoked the CLI (nudge ignored) | strict denials: total (median/run) |
|---|---|---|---|
| `effort-high` | 0 | n/a (no graph) | 0 (0) |
| `effort-low` | 0 | n/a (no graph) | 0 (0) |
| `effort-low-nosub` | 0 | n/a (no graph) | 0 (0) |
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
| `effort-high` | 32 | 142,568 (100,387–238,486) | 102,584 (67,952–210,774) | 164,021 (94,145–282,054) | 2,374 (1,769–3,158) | 32 (18–35) |
| `effort-low` | 32 | 70,744 (51,123–151,463) | 56,875 (37,799–101,596) | 76,665 (46,069–162,618) | 1,293 (1,185–1,909) | 27 (18–30) |
| `effort-low-nosub` | 32 | 53,189 (36,996–107,437) | 50,201 (36,059–104,168) | 47,882 (30,266–98,360) | 1,542 (1,180–1,975) | 28 (27–31) |
| `effort-medium` | 32 | 113,515 (71,793–218,312) | 75,291 (24,443–180,623) | 120,854 (82,921–235,340) | 1,664 (1,238–2,521) | 25 (8–28) |
| `effort-xhigh` | 32 | 190,055 (114,005–313,224) | 139,248 (87,975–275,720) | 189,372 (111,157–304,798) | 2,282 (1,907–3,259) | 31 (24–35) |
| `opus-effort-high` | 32 | 50,100 (36,376–65,317) | 47,883 (34,620–64,256) | 38,087 (25,954–54,904) | 2,447 (2,283–2,579) | 34 (27–35) |
| `opus-effort-low` | 32 | 27,872 (24,602–38,207) | 24,389 (21,365–30,964) | 21,507 (18,140–28,751) | 2,224 (2,137–2,458) | 29 (27–34) |
| `opus-effort-medium` | 32 | 40,234 (32,197–58,609) | 36,428 (27,436–56,662) | 30,277 (23,570–47,886) | 2,571 (2,276–2,755) | 31 (29–36) |
| `opus-effort-xhigh` | 32 | 90,634 (49,238–114,973) | 88,697 (47,147–109,101) | 79,918 (42,481–101,938) | 1,549 (1,358–2,429) | 34 (27–35) |
| `sonnet55-effort-high` | 32 | 48,787 (34,895–67,671) | 25,981 (20,849–43,635) | 23,404 (18,431–31,415) | 1,430 (1,334–1,680) | 28 (26–29) |
| `sonnet55-effort-low` | 32 | 36,919 (29,396–56,830) | 18,540 (16,000–27,288) | 17,883 (15,037–23,878) | 1,425 (1,256–1,886) | 28 (26–29) |
| `sonnet55-effort-medium` | 32 | 46,272 (33,605–69,276) | 19,356 (16,616–29,513) | 17,638 (15,402–24,752) | 1,546 (1,291–1,858) | 28 (26–32) |
| `sonnet55-effort-xhigh` | 32 | 75,991 (58,484–120,570) | 62,383 (40,067–100,418) | 46,357 (32,242–82,040) | 1,710 (1,420–2,050) | 29 (26–30) |

`claude.wall_ms` is the whole `claude -p` process as the harness timed it. Prefer it over `duration_ms` when an arm delegates: from Claude Code 2.1.28x the `Agent` tool runs in the background and `duration_ms` stops before the subagent's work is folded back in.

`time_to_request_ms` covers everything before the first API request, which is where **MCP server startup lands**: it is the only column in which an arm that must spawn and handshake with a server can differ from one that does not. The transcript itself cannot show that cost — Claude Code connects its configured servers *before* writing the first transcript entry, so the delay between the first entry and the one advertising the server's tools collapses to a few milliseconds of bookkeeping rather than measuring the spawn.

Per-tool-call latency, median (IQR) in ms, pooled over calls:

| condition | `Read` | `Bash` | `Agent` |
|---|---|---|---|
| `effort-high` | 11 (6–15) | 42 (31–150) | 13 (8–23) |
| `effort-low` | 5 (4–8) | 40 (27–204) | 14 (9–31,883) |
| `effort-low-nosub` | 6 (5–9) | 37 (26–196) | – |
| `effort-medium` | 6 (5–9) | 41 (26–215) | 12 (8–34,139) |
| `effort-xhigh` | 11 (6–15) | 43 (32–170) | 17 (13–44) |
| `opus-effort-high` | – | 60 (43–179) | – |
| `opus-effort-low` | – | 62 (39–202) | – |
| `opus-effort-medium` | – | 53 (37–192) | – |
| `opus-effort-xhigh` | 23 (23–23) | 53 (41–81) | – |
| `sonnet55-effort-high` | 5 (5–10) | 50 (33–192) | – |
| `sonnet55-effort-low` | 7 (6–10) | 49 (36–187) | – |
| `sonnet55-effort-medium` | 6 (5–10) | 59 (38–192) | – |
| `sonnet55-effort-xhigh` | 8 (5–14) | 52 (35–164) | – |

Each cell is timed from the transcript entry carrying the `tool_use` block to the entry carrying its matching `tool_result`, both written locally by the same process. Calls whose result never arrived — a run that hit its turn cap mid-call — are absent rather than counted as zero. `n` per cell is the number of calls, not the number of runs, so an arm that called a tool once contributes one observation.

**Index build cost, for scale.** graphify v1: **4.6 s** total (`update` 3.4 s + `cluster-only` 1.2 s, AST-only, no API calls). graphify v2: a comparable AST pass plus roughly **35 min** of LLM-backed document extraction. MemPalace v1: **49 s**; v2: **97 s** (embedding + indexing, `--no-llm`, no API calls). All are one-off costs paid before any run, and none is included in any figure above — they are listed only so a per-query latency can be read against what producing the index cost in the first place.

## 10. Thinking tokens and model mix

Thinking tokens are billed as output and are a **subset** of `output_tokens`, not an addition to it, so the share is the honest reading of an effort change: an arm that merely wrote less prose would move the absolute count without touching the lever. The figure is main-session only — `usage.output_tokens_details` does not see a subagent — so an arm that delegates reports the *parent's* thinking, and its explorer's thinking appears only as tokens against that explorer's model in the second table.

| condition | runs | thinking tokens | main-session output | thinking share |
|---|---|---|---|---|
| `effort-high` | 32 | 149,046 | 370,875 | 40.2% |
| `effort-low` | 32 | 38,957 | 208,095 | 18.7% |
| `effort-low-nosub` | 32 | 29,170 | 204,338 | 14.3% |
| `effort-medium` | 32 | 74,527 | 268,439 | 27.8% |
| `effort-xhigh` | 32 | 252,576 | 516,021 | 48.9% |
| `opus-effort-high` | 32 | 28,028 | 160,377 | 17.5% |
| `opus-effort-low` | 32 | 5,347 | 82,329 | 6.5% |
| `opus-effort-medium` | 32 | 16,611 | 129,182 | 12.9% |
| `opus-effort-xhigh` | 32 | 91,059 | 311,621 | 29.2% |
| `sonnet55-effort-high` | 32 | 19,199 | 122,750 | 15.6% |
| `sonnet55-effort-low` | 32 | 5,831 | 85,244 | 6.8% |
| `sonnet55-effort-medium` | 32 | 8,153 | 91,538 | 8.9% |
| `sonnet55-effort-xhigh` | 32 | 89,195 | 304,105 | 29.3% |

**Which model spent the tokens.** Summed from `modelUsage` over every run of the arm, on the same definition as `uncached_equivalent_all` (input + cache read + cache creation), so the row totals reconcile with the headline volume rather than describing some adjacent quantity. Note that a ~1k-token Haiku entry appears in **every** arm, including plain `baseline`: that is Claude Code's own background helper call, not delegated exploration. Only an arm whose Haiku row is orders of magnitude larger than that has actually moved work onto Haiku.

That helper's size is a deterministic function of the task prompt, so every Sonnet arm running the same task set reports the **identical** Haiku total. Rows agreeing to the token are therefore the expected result here, not a copy-paste fault — and they are what makes the figure usable as a baseline to read a genuinely delegating arm against.

| condition | `claude-opus-5-5` tokens | `claude-sonnet-5` tokens | `claude-sonnet-5-5` tokens | `claude-opus-5-5` cost | `claude-sonnet-5` cost | `claude-sonnet-5-5` cost |
|---|---|---|---|---|---|---|
| `effort-high` | 0 | 61,366,628 | 0 | $0.00 | $25.51 | $0.00 |
| `effort-low` | 0 | 35,604,499 | 0 | $0.00 | $15.63 | $0.00 |
| `effort-low-nosub` | 0 | 31,095,542 | 0 | $0.00 | $12.23 | $0.00 |
| `effort-medium` | 0 | 48,939,400 | 0 | $0.00 | $21.71 | $0.00 |
| `effort-xhigh` | 0 | 75,923,804 | 0 | $0.00 | $30.82 | $0.00 |
| `opus-effort-high` | 11,678,978 | 0 | 0 | $13.42 | $0.00 | $0.00 |
| `opus-effort-low` | 5,953,375 | 0 | 0 | $7.80 | $0.00 | $0.00 |
| `opus-effort-medium` | 9,306,115 | 0 | 0 | $11.21 | $0.00 | $0.00 |
| `opus-effort-xhigh` | 23,841,332 | 0 | 0 | $23.24 | $0.00 | $0.00 |
| `sonnet55-effort-high` | 0 | 0 | 8,946,857 | $0.00 | $0.00 | $6.46 |
| `sonnet55-effort-low` | 0 | 0 | 6,418,394 | $0.00 | $0.00 | $4.68 |
| `sonnet55-effort-medium` | 0 | 0 | 6,559,542 | $0.00 | $0.00 | $4.94 |
| `sonnet55-effort-xhigh` | 0 | 0 | 19,378,753 | $0.00 | $0.00 | $12.46 |

## 11. Where the remaining tokens go

`uncached_all` is one number; this section splits it in two, because at this end of the range the remaining question is no longer *how much* an arm spends but *on what*. **fixed = `first_turn_cache_creation` × `num_turns`** — the system prompt and tool definitions, re-sent on every single turn — and **moving = `uncached_all` − fixed**, which is the file contents, tool results and reasoning that are actually about the task. Both are per-run medians, so the two columns need not sum to the `uncached_all` median exactly.

Caveats that bound the reading: `first_turn_cache_creation` and `num_turns` are main-session only while `uncached_all` counts subagents too, so on a delegating arm `fixed` is an under-estimate (the arms below spawn none). And cache reads bill at a tenth of fresh input, so this is a split of **information volume, not of dollars** — a 60% fixed share does not mean 60% of the bill.

| condition | runs | uncached_all (med) | turns (med) | first-turn fixed | fixed = ft×turns (med) | moving (med) | fixed share |
|---|---|---|---|---|---|---|---|
| `effort-high` | 32 | 1,017,962 | 23 | 11,738 | 259,894 | 827,829 | 18.0% |
| `effort-low` | 32 | 526,456 | 14 | 11,763 | 165,425 | 413,139 | 28.5% |
| `effort-low-nosub` | 32 | 462,770 | 14 | 10,911 | 151,997 | 305,114 | 33.4% |
| `effort-medium` | 32 | 808,946 | 18 | 11,754 | 202,155 | 602,529 | 19.0% |
| `effort-xhigh` | 32 | 1,382,317 | 28 | 11,768 | 318,719 | 1,091,181 | 23.5% |
| `opus-effort-high` | 32 | 277,823 | 9 | 8,817 | 81,431 | 182,918 | 31.5% |
| `opus-effort-low` | 32 | 162,261 | 7 | 8,768 | 60,694 | 107,132 | 36.0% |
| `opus-effort-medium` | 32 | 227,980 | 9 | 8,736 | 66,999 | 152,298 | 31.5% |
| `opus-effort-xhigh` | 32 | 506,582 | 15 | 8,816 | 131,070 | 381,455 | 23.9% |
| `sonnet55-effort-high` | 32 | 212,734 | 10 | 7,862 | 71,145 | 147,604 | 29.9% |
| `sonnet55-effort-low` | 32 | 177,106 | 8 | 7,861 | 62,716 | 114,590 | 34.0% |
| `sonnet55-effort-medium` | 32 | 168,975 | 8 | 7,860 | 62,592 | 111,351 | 33.5% |
| `sonnet55-effort-xhigh` | 32 | 370,461 | 15 | 7,860 | 116,910 | 272,240 | 26.3% |

## 12. Counter-productive cases and subagent use

- `effort-high`: **14** subagent(s) spawned across **13**/32 run(s). T2S all-model 1,956,460 vs main-session-only 1,693,381.
- `effort-low`: **18** subagent(s) spawned across **16**/32 run(s). T2S all-model 1,163,504 vs main-session-only 1,002,375.
- `effort-low-nosub`: **0** subagent(s) spawned across **0**/32 run(s). T2S all-model 1,035,691 vs main-session-only 1,035,691.
- `effort-medium`: **24** subagent(s) spawned across **22**/32 run(s). T2S all-model 1,557,356 vs main-session-only 1,204,073.
- `effort-xhigh`: **10** subagent(s) spawned across **8**/32 run(s). T2S all-model 2,372,619 vs main-session-only 2,083,513.
- `opus-effort-high`: **0** subagent(s) spawned across **0**/32 run(s). T2S all-model 364,968 vs main-session-only 364,968.
- `opus-effort-low`: **0** subagent(s) spawned across **0**/32 run(s). T2S all-model 186,043 vs main-session-only 186,043.
- `opus-effort-medium`: **0** subagent(s) spawned across **0**/32 run(s). T2S all-model 290,816 vs main-session-only 290,816.
- `opus-effort-xhigh`: **0** subagent(s) spawned across **0**/32 run(s). T2S all-model 745,042 vs main-session-only 745,042.
- `sonnet55-effort-high`: **0** subagent(s) spawned across **0**/32 run(s). T2S all-model 279,589 vs main-session-only 279,589.
- `sonnet55-effort-low`: **0** subagent(s) spawned across **0**/32 run(s). T2S all-model 200,575 vs main-session-only 200,575.
- `sonnet55-effort-medium`: **0** subagent(s) spawned across **0**/32 run(s). T2S all-model 203,604 vs main-session-only 203,604.
- `sonnet55-effort-xhigh`: **0** subagent(s) spawned across **0**/32 run(s). T2S all-model 605,586 vs main-session-only 605,586.
- Runs that opened `graphify-out/graph.json` directly: **0**
- graphify-condition runs that never invoked the `graphify` CLI (nudge ignored): **32** (`HFX1-webhook-switch-off__opus-effort-medium__r1`, `HFX1-webhook-switch-off__opus-effort-medium__r2`, `HFX2-seat-accounting__opus-effort-medium__r1`, `HFX2-seat-accounting__opus-effort-medium__r2`, `HFX3-flag-overrides__opus-effort-medium__r1`, `HFX3-flag-overrides__opus-effort-medium__r2`, `HFX4-digest-recipients__opus-effort-medium__r1`, `HFX4-digest-recipients__opus-effort-medium__r2`, `HFX5-paging-ties__opus-effort-medium__r1`, `HFX5-paging-ties__opus-effort-medium__r2`, `HFX6-project-archive-cascade__opus-effort-medium__r1`, `HFX6-project-archive-cascade__opus-effort-medium__r2`, `HFX7-rewire-double-delivery__opus-effort-medium__r1`, `HFX7-rewire-double-delivery__opus-effort-medium__r2`, `HFX8-settings-save-resets__opus-effort-medium__r1`, `HFX8-settings-save-resets__opus-effort-medium__r2`, `HIM1-bulk-archive-issues__opus-effort-medium__r1`, `HIM1-bulk-archive-issues__opus-effort-medium__r2`, `HIM2-merge-labels__opus-effort-medium__r1`, `HIM2-merge-labels__opus-effort-medium__r2`, `HIM3-change-project-lead__opus-effort-medium__r1`, `HIM3-change-project-lead__opus-effort-medium__r2`, `HIM4-issue-participants__opus-effort-medium__r1`, `HIM4-issue-participants__opus-effort-medium__r2`, `HIM5-free-viewer-seats__opus-effort-medium__r1`, `HIM5-free-viewer-seats__opus-effort-medium__r2`, `HIM6-private-project-visibility__opus-effort-medium__r1`, `HIM6-private-project-visibility__opus-effort-medium__r2`, `HIM7-issue-unassigned-event__opus-effort-medium__r1`, `HIM7-issue-unassigned-event__opus-effort-medium__r2`, `HIM8-archived-project-freeze__opus-effort-medium__r1`, `HIM8-archived-project-freeze__opus-effort-medium__r2`)

## 13. Failed and ungraded runs

Harness failures (`is_error`, or `terminal_reason` other than `completed`): **10**. The table below also lists runs that completed normally but did not meet their grader's success threshold — those are accuracy results, not execution problems.

| run_id | condition | task | is_error | terminal_reason |
|---|---|---|---|---|
| `HFX1-webhook-switch-off__sonnet55-effort-medium__r2` | sonnet55-effort-medium | HFX1-webhook-switch-off | false | completed |
| `HFX8-settings-save-resets__effort-high__r1` | effort-high | HFX8-settings-save-resets | false | completed |
| `HFX8-settings-save-resets__effort-low-nosub__r1` | effort-low-nosub | HFX8-settings-save-resets | false | completed |
| `HFX8-settings-save-resets__effort-low-nosub__r2` | effort-low-nosub | HFX8-settings-save-resets | false | completed |
| `HFX8-settings-save-resets__effort-low__r1` | effort-low | HFX8-settings-save-resets | false | completed |
| `HFX8-settings-save-resets__effort-low__r2` | effort-low | HFX8-settings-save-resets | false | completed |
| `HFX8-settings-save-resets__effort-medium__r1` | effort-medium | HFX8-settings-save-resets | false | completed |
| `HIM2-merge-labels__effort-low-nosub__r1` | effort-low-nosub | HIM2-merge-labels | false | completed |
| `HIM5-free-viewer-seats__effort-high__r1` | effort-high | HIM5-free-viewer-seats | true | max_turns |
| `HIM5-free-viewer-seats__effort-low-nosub__r2` | effort-low-nosub | HIM5-free-viewer-seats | true | max_turns |
| `HIM5-free-viewer-seats__effort-medium__r2` | effort-medium | HIM5-free-viewer-seats | true | max_turns |
| `HIM5-free-viewer-seats__effort-xhigh__r1` | effort-xhigh | HIM5-free-viewer-seats | true | max_turns |
| `HIM5-free-viewer-seats__effort-xhigh__r2` | effort-xhigh | HIM5-free-viewer-seats | true | max_turns |
| `HIM6-private-project-visibility__effort-high__r1` | effort-high | HIM6-private-project-visibility | true | max_turns |
| `HIM6-private-project-visibility__effort-high__r2` | effort-high | HIM6-private-project-visibility | true | max_turns |
| `HIM6-private-project-visibility__effort-xhigh__r1` | effort-xhigh | HIM6-private-project-visibility | true | max_turns |
| `HIM6-private-project-visibility__sonnet55-effort-medium__r1` | sonnet55-effort-medium | HIM6-private-project-visibility | false | completed |
| `HIM7-issue-unassigned-event__effort-low-nosub__r2` | effort-low-nosub | HIM7-issue-unassigned-event | true | max_turns |
| `HIM7-issue-unassigned-event__effort-low__r1` | effort-low | HIM7-issue-unassigned-event | true | max_turns |

## 14. Limitations

- N = 416 runs over 16 tasks; a single corpus and a single model. These results do not generalize to other codebases or models.
- Bootstrap resamples tasks, so the interval reflects task-to-task variation, not within-task run noise.
- Where a CI crosses zero the honest reading is "no difference detected at this N", not "no difference exists".
- The fixed ~21k-token system-prompt/tool-definition overhead is included in both arms and not subtracted (see §2).
- **1 repetition per (task × condition)**: within-task run-to-run variance is unmeasured, so any single per-task difference may be run noise.
- Subagent traffic is counted in `uncached_all`, but a subagent's tool calls never reach the parent transcript, so the tool-call columns stay main-session-only.
- Raw per-run data lives in `results/hard/runs/<run-id>/` and the `summary.csv` beside this report.
