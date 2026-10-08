# graphify-bench results

Generated 2026-10-08T16:48:28.171Z. 192 runs over 6 tasks, conditions: effort-high, effort-low, effort-medium, effort-xhigh, haiku55-effort-high, haiku55-effort-low, haiku55-effort-medium, haiku55-effort-xhigh, opus-effort-high, opus-effort-low, opus-effort-medium, opus-effort-xhigh, sonnet55-effort-high, sonnet55-effort-low, sonnet55-effort-medium, sonnet55-effort-xhigh.

## 1. Environment

- Claude Code: `2.1.294 (Claude Code)`
- graphify: `graphify 0.9.53`
- Node: `v25.5.0` / pnpm `10.28.2`
- Platform: `darwin 25.2.0 arm64`
- Model: `claude-sonnet-5`, effort `high`, --max-turns 160, --max-budget-usd 12

- Bootstrap: B=2000, percentile 95% CI, seed `graphify-bench-bootstrap`, resampled over **tasks**.
- Corpus: `corpus-v1`, tree hash (sha256) `4148d9b26fb31b95ab8424af1f88cfc7741bb655b3ad3bbb557a8c3c516c12da` (source: `docs/plan/CORPUS.md`).
- Report generated: 2026-10-08.

The `Model` line above is the harness default; arms that override it are listed here. Every field comes from the run's own `run.meta.json`, not from the report's assumptions.

| condition | model | overlays | extra `claude` args | what it isolates |
|---|---|---|---|---|
| `effort-high` | `claude-sonnet-5` | `baseline` | – | Baseline with `--effort high` spelled out. It equals the harness default, so the arm is `baseline` re-measured on the current CLI under a name that pairs it with `opus-effort-high`. |
| `effort-low` | `claude-sonnet-5` | `baseline` | – | As `effort-medium`, one notch further down: baseline with `--effort low`. |
| `effort-medium` | `claude-sonnet-5` | `baseline` | – | A RUNTIME LEVER, not a tool: the baseline overlay byte for byte, invoked with `--effort medium` instead of the harness default `high`. Thinking tokens bill as output, so the reduction is arithmetically certain and the open question is entirely about accuracy. |
| `effort-xhigh` | `claude-sonnet-5` | `baseline` | – | As `effort-high`, one notch up: baseline with `--effort xhigh`. |
| `haiku55-effort-high` | `claude-haiku-5-5` | `baseline` | – | `effort-high` on Haiku 5.5 — only the model differs. |
| `haiku55-effort-low` | `claude-haiku-5-5` | `baseline` | – | `effort-low` on Haiku 5.5 — only the model differs. |
| `haiku55-effort-medium` | `claude-haiku-5-5` | `baseline` | – | `effort-medium` on Haiku 5.5 — only the model differs. |
| `haiku55-effort-xhigh` | `claude-haiku-5-5` | `baseline` | – | `effort-xhigh` on Haiku 5.5 — only the model differs. |
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
| effort-high | 12 | **10,672,552** (6,728,046–14,521,911) | 10,672,552 | 3.505 | 92.5 | 2 in 2 run(s) | 437 | 0 | 0 | 369 | 0 | 58.3% (7/12) | 12,094,778 |
| effort-low | 12 | **4,817,069** (2,972,306–9,734,385) | 2,639,921 | 1.986 | 44.0 | 18 in 9 run(s) | 283 | 0 | 0 | 182 | 0 | 58.3% (7/12) | 5,180,595 |
| effort-medium | 12 | **6,051,494** (5,249,587–10,336,428) | 6,051,494 | 2.077 | 68.0 | 3 in 3 run(s) | 270 | 0 | 0 | 330 | 0 | 58.3% (7/12) | 8,486,673 |
| effort-xhigh | 12 | **12,357,323** (9,734,861–17,390,381) | 12,357,323 | 4.082 | 111.5 | 0 in 0 run(s) | 509 | 0 | 0 | 403 | 0 | 66.7% (8/12) | 12,968,364 |
| haiku55-effort-high | 12 | **4,317,687** (3,022,184–7,608,746) | 4,317,687 | 0.455 | 57.0 | 0 in 0 run(s) | 76 | 0 | 0 | 309 | 0 | 91.7% (11/12) | 5,046,978 |
| haiku55-effort-low | 12 | **2,163,244** (1,106,118–3,090,608) | 2,163,244 | 0.153 | 29.5 | 0 in 0 run(s) | 50 | 0 | 0 | 248 | 0 | 100.0% (12/12) | 2,309,853 |
| haiku55-effort-medium | 12 | **3,483,694** (1,917,013–4,132,195) | 3,483,694 | 0.282 | 36.0 | 0 in 0 run(s) | 8 | 0 | 0 | 328 | 0 | 91.7% (11/12) | 3,182,830 |
| haiku55-effort-xhigh | 12 | **6,879,460** (4,896,652–8,924,558) | 6,879,460 | 0.806 | 74.0 | 0 in 0 run(s) | 188 | 0 | 0 | 354 | 0 | 100.0% (12/12) | 7,206,945 |
| opus-effort-high | 12 | **2,619,255** (1,699,282–3,097,737) | 2,619,255 | 1.840 | 33.5 | 0 in 0 run(s) | 0 | 0 | 0 | 359 | 0 | 100.0% (12/12) | 2,472,083 |
| opus-effort-low | 12 | **479,245** (397,564–913,194) | 479,245 | 0.640 | 12.0 | 0 in 0 run(s) | 0 | 0 | 0 | 169 | 0 | 100.0% (12/12) | 737,579 |
| opus-effort-medium | 12 | **1,573,947** (1,015,503–2,308,918) | 1,573,947 | 1.304 | 24.0 | 0 in 0 run(s) | 0 | 0 | 0 | 295 | 0 | 100.0% (12/12) | 1,761,545 |
| opus-effort-xhigh | 12 | **4,180,799** (3,903,506–5,397,899) | 4,180,799 | 2.985 | 46.0 | 0 in 0 run(s) | 3 | 0 | 0 | 531 | 0 | 100.0% (12/12) | 4,805,321 |
| sonnet55-effort-high | 12 | **1,763,470** (1,118,829–2,031,932) | 1,763,470 | 0.914 | 23.5 | 0 in 0 run(s) | 0 | 0 | 0 | 260 | 0 | 100.0% (12/12) | 1,615,728 |
| sonnet55-effort-low | 12 | **539,741** (335,557–753,410) | 539,741 | 0.380 | 12.0 | 0 in 0 run(s) | 0 | 0 | 0 | 134 | 0 | 91.7% (11/12) | 636,425 |
| sonnet55-effort-medium | 12 | **568,228** (378,964–1,228,390) | 568,228 | 0.465 | 12.0 | 0 in 0 run(s) | 0 | 0 | 0 | 161 | 0 | 100.0% (12/12) | 815,558 |
| sonnet55-effort-xhigh | 12 | **4,564,634** (2,557,902–5,042,238) | 4,564,634 | 2.217 | 40.0 | 0 in 0 run(s) | 9 | 0 | 0 | 417 | 0 | 91.7% (11/12) | 3,846,805 |

**`uncached_all` (PRIMARY) = Σ over every entry of `modelUsage` of (inputTokens + cacheReadInputTokens + cacheCreationInputTokens)** — it covers the main session *and* any subagent, so it is commensurable with `total_cost_usd`. `uncached_main` (secondary) is the same sum taken from `usage.*`, which the result JSON populates for the **main session only**; a run that spawned a subagent therefore reports less information volume there than it actually consumed. The `subagents` column lets the two be reconciled. Tool columns are totals across all runs of the condition. T2S (tokens-to-success) = total `uncached_all` of successful runs / number of successful runs.

Fixed overhead, reported separately so readers can subtract it (architecture.md §5):

| condition | first-turn cache_creation (median) |
|---|---|
| effort-high | 13,774 |
| effort-low | 12,462 |
| effort-medium | 13,732 |
| effort-xhigh | 13,057 |
| haiku55-effort-high | 9,388 |
| haiku55-effort-low | 10,592 |
| haiku55-effort-medium | 9,948 |
| haiku55-effort-xhigh | 10,990 |
| opus-effort-high | 8,691 |
| opus-effort-low | 10,769 |
| opus-effort-medium | 8,688 |
| opus-effort-xhigh | 9,377 |
| sonnet55-effort-high | 10,616 |
| sonnet55-effort-low | 8,608 |
| sonnet55-effort-medium | 9,821 |
| sonnet55-effort-xhigh | 8,606 |

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

### fix (3 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 0 | – | [–, –] | – | n too small |
| uncached_equivalent | 0 | – | [–, –] | – | n too small |
| total_cost_usd | 0 | – | [–, –] | – | n too small |
| num_turns | 0 | – | [–, –] | – | n too small |

### implement (3 tasks)

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
| `effort-high` | 4/6 · 0.667 | 3/6 · 0.500 |
| `effort-low` | 6/6 · 1.000 | 1/6 · 0.167 |
| `effort-medium` | 4/6 · 0.667 | 3/6 · 0.500 |
| `effort-xhigh` | 6/6 · 1.000 | 2/6 · 0.333 |
| `haiku55-effort-high` | 6/6 · 1.000 | 5/6 · 0.833 |
| `haiku55-effort-low` | 6/6 · 1.000 | 6/6 · 1.000 |
| `haiku55-effort-medium` | 6/6 · 1.000 | 5/6 · 0.833 |
| `haiku55-effort-xhigh` | 6/6 · 1.000 | 6/6 · 1.000 |
| `opus-effort-high` | 6/6 · 1.000 | 6/6 · 1.000 |
| `opus-effort-low` | 6/6 · 1.000 | 6/6 · 1.000 |
| `opus-effort-medium` | 6/6 · 1.000 | 6/6 · 1.000 |
| `opus-effort-xhigh` | 6/6 · 1.000 | 6/6 · 1.000 |
| `sonnet55-effort-high` | 6/6 · 1.000 | 6/6 · 1.000 |
| `sonnet55-effort-low` | 6/6 · 1.000 | 5/6 · 0.833 |
| `sonnet55-effort-medium` | 6/6 · 1.000 | 6/6 · 1.000 |
| `sonnet55-effort-xhigh` | 6/6 · 1.000 | 5/6 · 0.833 |

## 7. Structural comparisons

Each block below is an independent paired comparison between two arms, computed with the same machinery as §3: per-task pairing over the same task set, percentile bootstrap over tasks, an iso-accuracy subset scoped to just those two arms, and a per-category breakdown. Arms that are not part of a block are excluded from it entirely.

### `opus-effort-low` vs `effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low | 12 | **4,817,069** (2,972,306–9,734,385) | 2,639,921 | 1.986 | 44.0 | 18 in 9 run(s) | 283 | 0 | 0 | 182 | 0 | 58.3% (7/12) | 5,180,595 |
| opus-effort-low | 12 | **479,245** (397,564–913,194) | 479,245 | 0.640 | 12.0 | 0 in 0 run(s) | 0 | 0 | 0 | 169 | 0 | 100.0% (12/12) | 737,579 |

Paired difference (`opus-effort-low` − `effort-low`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | -6,064,464.4 | [-9,399,538.8, -3,174,186.7] | -88.7% | opus-effort-low lower |
| uncached_equivalent | 6 | -2,879,484.0 | [-3,445,696.3, -2,339,779.2] | -80.5% | opus-effort-low lower |
| total_cost_usd | 6 | -1.5878 | [-2.3660, -0.9285] | -64.9% | opus-effort-low lower |
| num_turns | 6 | -30.4 | [-36.1, -25.0] | -66.9% | opus-effort-low lower |

Iso-accuracy subset (3/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 3 | -4,617,322.5 | [-8,999,801.5, -2,344,495.5] | -87.7% | opus-effort-low lower |
| uncached_equivalent | 3 | -2,472,762.0 | [-3,375,237.5, -1,765,174.5] | -81.6% | opus-effort-low lower |
| total_cost_usd | 3 | -1.2553 | [-2.3818, -0.5859] | -62.9% | opus-effort-low lower |
| num_turns | 3 | -25.8 | [-33.0, -21.5] | -66.1% | opus-effort-low lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | -4,617,322.5 | [-8,999,801.5, -2,344,495.5] | -87.7% | opus-effort-low lower |
| implement | 3 | -7,511,606.3 | [-13,194,031.0, -3,906,040.0] | -89.6% | opus-effort-low lower |

**Verdict.** `opus-effort-low` vs `effort-low` over 6 paired tasks: tokens lower by 6,064,464 (95% CI [-9,399,539, -3,174,187]); cost lower by 1.5878 (95% CI [-2.3660, -0.9285]); turns lower by 30.4 (95% CI [-36.1, -25.0]); accuracy 100.0% vs 58.3% (12/12 vs 7/12).

### `opus-effort-medium` vs `effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-medium | 12 | **6,051,494** (5,249,587–10,336,428) | 6,051,494 | 2.077 | 68.0 | 3 in 3 run(s) | 270 | 0 | 0 | 330 | 0 | 58.3% (7/12) | 8,486,673 |
| opus-effort-medium | 12 | **1,573,947** (1,015,503–2,308,918) | 1,573,947 | 1.304 | 24.0 | 0 in 0 run(s) | 0 | 0 | 0 | 295 | 0 | 100.0% (12/12) | 1,761,545 |

Paired difference (`opus-effort-medium` − `effort-medium`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | -5,774,773.1 | [-8,394,191.5, -3,884,657.8] | -76.1% | opus-effort-medium lower |
| uncached_equivalent | 6 | -5,578,002.2 | [-8,131,631.7, -3,565,032.7] | -75.3% | opus-effort-medium lower |
| total_cost_usd | 6 | -1.1390 | [-1.7485, -0.7485] | -43.9% | opus-effort-medium lower |
| num_turns | 6 | -52.1 | [-73.5, -36.3] | -65.2% | opus-effort-medium lower |

Iso-accuracy subset (2/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 2 | -8,530,497.8 | [-11,727,680.0, -5,333,315.5] | -73.1% | opus-effort-medium lower |
| uncached_equivalent | 2 | -8,315,305.0 | [-11,297,294.5, -5,333,315.5] | -72.8% | opus-effort-medium lower |
| total_cost_usd | 2 | -1.6389 | [-2.5764, -0.7015] | -42.1% | opus-effort-medium lower |
| num_turns | 2 | -72.3 | [-100.5, -44.0] | -65.8% | opus-effort-medium lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | -3,969,718.7 | [-5,333,315.5, -2,915,899.0] | -72.3% | opus-effort-medium lower |
| implement | 3 | -7,579,827.5 | [-11,727,680.0, -4,822,950.5] | -79.9% | opus-effort-medium lower |

**Verdict.** `opus-effort-medium` vs `effort-medium` over 6 paired tasks: tokens lower by 5,774,773 (95% CI [-8,394,192, -3,884,658]); cost lower by 1.1390 (95% CI [-1.7485, -0.7485]); turns lower by 52.1 (95% CI [-73.5, -36.3]); accuracy 100.0% vs 58.3% (12/12 vs 7/12).

### `opus-effort-high` vs `effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-high | 12 | **10,672,552** (6,728,046–14,521,911) | 10,672,552 | 3.505 | 92.5 | 2 in 2 run(s) | 437 | 0 | 0 | 369 | 0 | 58.3% (7/12) | 12,094,778 |
| opus-effort-high | 12 | **2,619,255** (1,699,282–3,097,737) | 2,619,255 | 1.840 | 33.5 | 0 in 0 run(s) | 0 | 0 | 0 | 359 | 0 | 100.0% (12/12) | 2,472,083 |

Paired difference (`opus-effort-high` − `effort-high`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | -8,510,152.8 | [-11,761,575.7, -5,469,359.3] | -75.8% | opus-effort-high lower |
| uncached_equivalent | 6 | -8,320,723.0 | [-11,683,961.3, -5,057,842.1] | -74.8% | opus-effort-high lower |
| total_cost_usd | 6 | -1.7681 | [-2.4585, -1.1889] | -48.0% | opus-effort-high lower |
| num_turns | 6 | -66.0 | [-91.0, -44.1] | -65.4% | opus-effort-high lower |

Iso-accuracy subset (3/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 3 | -10,155,542.2 | [-15,002,601.5, -4,768,992.0] | -76.6% | opus-effort-high lower |
| uncached_equivalent | 3 | -9,931,911.3 | [-15,002,601.5, -4,098,099.5] | -75.6% | opus-effort-high lower |
| total_cost_usd | 3 | -2.1248 | [-3.1526, -1.0462] | -50.6% | opus-effort-high lower |
| num_turns | 3 | -72.5 | [-113.0, -35.5] | -64.7% | opus-effort-high lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | -6,396,820.5 | [-10,695,033.0, -3,726,436.5] | -71.1% | opus-effort-high lower |
| implement | 3 | -10,623,485.2 | [-15,002,601.5, -5,727,674.0] | -80.5% | opus-effort-high lower |

**Verdict.** `opus-effort-high` vs `effort-high` over 6 paired tasks: tokens lower by 8,510,153 (95% CI [-11,761,576, -5,469,359]); cost lower by 1.7681 (95% CI [-2.4585, -1.1889]); turns lower by 66.0 (95% CI [-91.0, -44.1]); accuracy 100.0% vs 58.3% (12/12 vs 7/12).

### `opus-effort-xhigh` vs `effort-xhigh`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-xhigh | 12 | **12,357,323** (9,734,861–17,390,381) | 12,357,323 | 4.082 | 111.5 | 0 in 0 run(s) | 509 | 0 | 0 | 403 | 0 | 66.7% (8/12) | 12,968,364 |
| opus-effort-xhigh | 12 | **4,180,799** (3,903,506–5,397,899) | 4,180,799 | 2.985 | 46.0 | 0 in 0 run(s) | 3 | 0 | 0 | 531 | 0 | 100.0% (12/12) | 4,805,321 |

Paired difference (`opus-effort-xhigh` − `effort-xhigh`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | -8,246,200.6 | [-10,810,689.1, -5,790,429.5] | -61.6% | opus-effort-xhigh lower |
| uncached_equivalent | 6 | -8,246,200.6 | [-11,000,333.1, -5,774,672.7] | -61.6% | opus-effort-xhigh lower |
| total_cost_usd | 6 | -1.0155 | [-1.6009, -0.4773] | -22.3% | opus-effort-xhigh lower |
| num_turns | 6 | -57.1 | [-77.8, -38.4] | -51.6% | opus-effort-xhigh lower |

Iso-accuracy subset (4/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 4 | -7,799,359.1 | [-11,646,091.9, -4,652,819.5] | -57.9% | opus-effort-xhigh lower |
| uncached_equivalent | 4 | -7,799,359.1 | [-11,646,091.9, -4,652,819.5] | -57.9% | opus-effort-xhigh lower |
| total_cost_usd | 4 | -0.8481 | [-1.6577, -0.2578] | -17.9% | opus-effort-xhigh lower |
| num_turns | 4 | -53.1 | [-84.6, -30.5] | -47.1% | opus-effort-xhigh lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | -5,741,927.3 | [-7,920,143.0, -4,636,235.0] | -52.6% | opus-effort-xhigh lower |
| implement | 3 | -10,750,473.8 | [-13,971,654.5, -8,083,446.0] | -70.5% | opus-effort-xhigh lower |

**Verdict.** `opus-effort-xhigh` vs `effort-xhigh` over 6 paired tasks: tokens lower by 8,246,201 (95% CI [-10,810,689, -5,790,429]); cost lower by 1.0155 (95% CI [-1.6009, -0.4773]); turns lower by 57.1 (95% CI [-77.8, -38.4]); accuracy 100.0% vs 66.7% (12/12 vs 8/12).

### `opus-effort-low` vs `effort-xhigh`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-xhigh | 12 | **12,357,323** (9,734,861–17,390,381) | 12,357,323 | 4.082 | 111.5 | 0 in 0 run(s) | 509 | 0 | 0 | 403 | 0 | 66.7% (8/12) | 12,968,364 |
| opus-effort-low | 12 | **479,245** (397,564–913,194) | 479,245 | 0.640 | 12.0 | 0 in 0 run(s) | 0 | 0 | 0 | 169 | 0 | 100.0% (12/12) | 737,579 |

Paired difference (`opus-effort-low` − `effort-xhigh`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | -12,313,943.1 | [-14,810,737.0, -9,692,008.3] | -94.7% | opus-effort-low lower |
| uncached_equivalent | 6 | -12,313,943.1 | [-14,989,205.2, -9,817,149.2] | -94.7% | opus-effort-low lower |
| total_cost_usd | 6 | -3.3569 | [-3.9132, -2.8032] | -81.8% | opus-effort-low lower |
| num_turns | 6 | -91.0 | [-107.2, -76.0] | -86.1% | opus-effort-low lower |

Iso-accuracy subset (4/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 4 | -12,130,447.6 | [-15,875,638.5, -8,385,256.8] | -94.1% | opus-effort-low lower |
| uncached_equivalent | 4 | -12,130,447.6 | [-15,875,638.5, -8,270,923.1] | -94.1% | opus-effort-low lower |
| total_cost_usd | 4 | -3.2246 | [-4.0552, -2.3940] | -80.7% | opus-effort-low lower |
| num_turns | 4 | -89.3 | [-112.1, -68.3] | -85.0% | opus-effort-low lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | -10,375,448.8 | [-14,355,833.0, -8,156,589.5] | -94.9% | opus-effort-low lower |
| implement | 3 | -14,252,437.3 | [-17,395,444.0, -12,076,844.0] | -94.5% | opus-effort-low lower |

**Verdict.** `opus-effort-low` vs `effort-xhigh` over 6 paired tasks: tokens lower by 12,313,943 (95% CI [-14,810,737, -9,692,008]); cost lower by 3.3569 (95% CI [-3.9132, -2.8032]); turns lower by 91.0 (95% CI [-107.2, -76.0]); accuracy 100.0% vs 66.7% (12/12 vs 8/12).

### `opus-effort-high` vs `opus-effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-low | 12 | **479,245** (397,564–913,194) | 479,245 | 0.640 | 12.0 | 0 in 0 run(s) | 0 | 0 | 0 | 169 | 0 | 100.0% (12/12) | 737,579 |
| opus-effort-high | 12 | **2,619,255** (1,699,282–3,097,737) | 2,619,255 | 1.840 | 33.5 | 0 in 0 run(s) | 0 | 0 | 0 | 359 | 0 | 100.0% (12/12) | 2,472,083 |

Paired difference (`opus-effort-high` − `opus-effort-low`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 1,734,504.6 | [1,324,124.6, 2,146,276.0] | 295.1% | opus-effort-high higher |
| uncached_equivalent | 6 | 1,734,504.6 | [1,335,518.2, 2,145,571.5] | 295.1% | opus-effort-high higher |
| total_cost_usd | 6 | 1.0088 | [0.8277, 1.2248] | 145.8% | opus-effort-high higher |
| num_turns | 6 | 16.5 | [12.8, 19.9] | 124.1% | opus-effort-high higher |

Iso-accuracy subset (6/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 1,734,504.6 | [1,335,500.6, 2,143,653.1] | 295.1% | opus-effort-high higher |
| uncached_equivalent | 6 | 1,734,504.6 | [1,330,449.2, 2,145,571.5] | 295.1% | opus-effort-high higher |
| total_cost_usd | 6 | 1.0088 | [0.8279, 1.2209] | 145.8% | opus-effort-high higher |
| num_turns | 6 | 16.5 | [12.7, 20.0] | 124.1% | opus-effort-high higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | 1,835,553.3 | [1,504,506.5, 2,493,420.0] | 353.6% | opus-effort-high higher |
| implement | 3 | 1,633,455.8 | [1,027,442.5, 2,436,674.5] | 236.5% | opus-effort-high higher |

**Verdict.** `opus-effort-high` vs `opus-effort-low` over 6 paired tasks: tokens higher by 1,734,505 (95% CI [1,324,125, 2,146,276]); cost higher by 1.0088 (95% CI [0.8277, 1.2248]); turns higher by 16.5 (95% CI [12.8, 19.9]); accuracy 100.0% vs 100.0% (12/12 vs 12/12).

### `opus-effort-xhigh` vs `opus-effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-low | 12 | **479,245** (397,564–913,194) | 479,245 | 0.640 | 12.0 | 0 in 0 run(s) | 0 | 0 | 0 | 169 | 0 | 100.0% (12/12) | 737,579 |
| opus-effort-xhigh | 12 | **4,180,799** (3,903,506–5,397,899) | 4,180,799 | 2.985 | 46.0 | 0 in 0 run(s) | 3 | 0 | 0 | 531 | 0 | 100.0% (12/12) | 4,805,321 |

Paired difference (`opus-effort-xhigh` − `opus-effort-low`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 4,067,742.5 | [3,384,019.3, 5,032,622.3] | 703.0% | opus-effort-xhigh higher |
| uncached_equivalent | 6 | 4,067,742.5 | [3,400,130.1, 5,111,462.9] | 703.0% | opus-effort-xhigh higher |
| total_cost_usd | 6 | 2.3415 | [2.1202, 2.6622] | 341.6% | opus-effort-xhigh higher |
| num_turns | 6 | 33.9 | [28.6, 39.8] | 255.0% | opus-effort-xhigh higher |

Iso-accuracy subset (6/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 4,067,742.5 | [3,400,130.1, 5,103,316.6] | 703.0% | opus-effort-xhigh higher |
| uncached_equivalent | 6 | 4,067,742.5 | [3,398,882.4, 5,055,615.2] | 703.0% | opus-effort-xhigh higher |
| total_cost_usd | 6 | 2.3415 | [2.1198, 2.6622] | 341.6% | opus-effort-xhigh higher |
| num_turns | 6 | 33.9 | [28.6, 38.9] | 255.0% | opus-effort-xhigh higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | 4,633,521.5 | [3,520,354.5, 6,435,690.0] | 887.2% | opus-effort-xhigh higher |
| implement | 3 | 3,501,963.5 | [3,088,703.0, 3,993,398.0] | 518.9% | opus-effort-xhigh higher |

**Verdict.** `opus-effort-xhigh` vs `opus-effort-low` over 6 paired tasks: tokens higher by 4,067,743 (95% CI [3,384,019, 5,032,622]); cost higher by 2.3415 (95% CI [2.1202, 2.6622]); turns higher by 33.9 (95% CI [28.6, 39.8]); accuracy 100.0% vs 100.0% (12/12 vs 12/12).

### `effort-xhigh` vs `effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low | 12 | **4,817,069** (2,972,306–9,734,385) | 2,639,921 | 1.986 | 44.0 | 18 in 9 run(s) | 283 | 0 | 0 | 182 | 0 | 58.3% (7/12) | 5,180,595 |
| effort-xhigh | 12 | **12,357,323** (9,734,861–17,390,381) | 12,357,323 | 4.082 | 111.5 | 0 in 0 run(s) | 509 | 0 | 0 | 403 | 0 | 66.7% (8/12) | 12,968,364 |

Paired difference (`effort-xhigh` − `effort-low`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 6,249,478.7 | [5,123,391.5, 7,617,702.2] | 139.2% | effort-xhigh higher |
| uncached_equivalent | 6 | 9,434,459.1 | [7,362,395.4, 11,548,124.8] | 262.5% | effort-xhigh higher |
| total_cost_usd | 6 | 1.7691 | [1.3859, 2.3123] | 104.5% | effort-xhigh higher |
| num_turns | 6 | 60.6 | [46.3, 77.1] | 134.0% | effort-xhigh higher |

Iso-accuracy subset (3/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 3 | 5,758,126.3 | [5,356,031.5, 6,269,428.5] | 160.5% | effort-xhigh higher |
| uncached_equivalent | 3 | 7,902,686.8 | [6,336,050.0, 10,980,595.5] | 261.9% | effort-xhigh higher |
| total_cost_usd | 3 | 1.6311 | [1.4894, 1.9053] | 113.5% | effort-xhigh higher |
| num_turns | 3 | 51.3 | [39.0, 72.0] | 132.2% | effort-xhigh higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | 5,758,126.3 | [5,356,031.5, 6,269,428.5] | 160.5% | effort-xhigh higher |
| implement | 3 | 6,740,831.0 | [4,201,413.0, 9,378,984.0] | 118.0% | effort-xhigh higher |

**Verdict.** `effort-xhigh` vs `effort-low` over 6 paired tasks: tokens higher by 6,249,479 (95% CI [5,123,392, 7,617,702]); cost higher by 1.7691 (95% CI [1.3859, 2.3123]); turns higher by 60.6 (95% CI [46.3, 77.1]); accuracy 66.7% vs 58.3% (8/12 vs 7/12).

### `sonnet55-effort-low` vs `effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low | 12 | **4,817,069** (2,972,306–9,734,385) | 2,639,921 | 1.986 | 44.0 | 18 in 9 run(s) | 283 | 0 | 0 | 182 | 0 | 58.3% (7/12) | 5,180,595 |
| sonnet55-effort-low | 12 | **539,741** (335,557–753,410) | 539,741 | 0.380 | 12.0 | 0 in 0 run(s) | 0 | 0 | 0 | 134 | 0 | 91.7% (11/12) | 636,425 |

Paired difference (`sonnet55-effort-low` − `effort-low`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | -6,198,513.3 | [-9,636,864.6, -3,267,481.6] | -89.9% | sonnet55-effort-low lower |
| uncached_equivalent | 6 | -3,013,532.8 | [-3,638,460.0, -2,348,800.3] | -83.4% | sonnet55-effort-low lower |
| total_cost_usd | 6 | -1.9224 | [-2.7218, -1.1446] | -80.0% | sonnet55-effort-low lower |
| num_turns | 6 | -33.2 | [-40.5, -26.6] | -72.3% | sonnet55-effort-low lower |

Iso-accuracy subset (3/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 3 | -4,679,329.2 | [-9,237,498.0, -2,211,035.0] | -87.8% | sonnet55-effort-low lower |
| uncached_equivalent | 3 | -2,534,768.7 | [-3,612,934.0, -1,846,958.5] | -83.0% | sonnet55-effort-low lower |
| total_cost_usd | 3 | -1.5344 | [-2.8314, -0.7554] | -78.4% | sonnet55-effort-low lower |
| num_turns | 3 | -26.7 | [-30.5, -23.0] | -68.5% | sonnet55-effort-low lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | -4,679,329.2 | [-9,237,498.0, -2,211,035.0] | -87.8% | sonnet55-effort-low lower |
| implement | 3 | -7,717,697.3 | [-13,646,112.0, -4,072,661.5] | -91.9% | sonnet55-effort-low lower |

**Verdict.** `sonnet55-effort-low` vs `effort-low` over 6 paired tasks: tokens lower by 6,198,513 (95% CI [-9,636,865, -3,267,482]); cost lower by 1.9224 (95% CI [-2.7218, -1.1446]); turns lower by 33.2 (95% CI [-40.5, -26.6]); accuracy 91.7% vs 58.3% (11/12 vs 7/12).

### `sonnet55-effort-medium` vs `effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-medium | 12 | **6,051,494** (5,249,587–10,336,428) | 6,051,494 | 2.077 | 68.0 | 3 in 3 run(s) | 270 | 0 | 0 | 330 | 0 | 58.3% (7/12) | 8,486,673 |
| sonnet55-effort-medium | 12 | **568,228** (378,964–1,228,390) | 568,228 | 0.465 | 12.0 | 0 in 0 run(s) | 0 | 0 | 0 | 161 | 0 | 100.0% (12/12) | 815,558 |

Paired difference (`sonnet55-effort-medium` − `effort-medium`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | -6,720,759.9 | [-9,364,966.1, -4,759,096.5] | -89.5% | sonnet55-effort-medium lower |
| uncached_equivalent | 6 | -6,523,989.0 | [-9,026,660.2, -4,392,406.7] | -89.2% | sonnet55-effort-medium lower |
| total_cost_usd | 6 | -1.9789 | [-2.6743, -1.4655] | -79.0% | sonnet55-effort-medium lower |
| num_turns | 6 | -63.3 | [-84.4, -47.0] | -80.7% | sonnet55-effort-medium lower |

Iso-accuracy subset (2/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 2 | -9,774,279.8 | [-12,826,266.5, -6,722,293.0] | -85.2% | sonnet55-effort-medium lower |
| uncached_equivalent | 2 | -9,559,087.0 | [-12,395,881.0, -6,722,293.0] | -85.1% | sonnet55-effort-medium lower |
| total_cost_usd | 2 | -2.7215 | [-3.6047, -1.8383] | -74.8% | sonnet55-effort-medium lower |
| num_turns | 2 | -84.3 | [-111.0, -57.5] | -78.1% | sonnet55-effort-medium lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | -4,834,794.7 | [-6,722,293.0, -3,519,479.5] | -87.3% | sonnet55-effort-medium lower |
| implement | 3 | -8,606,725.2 | [-12,826,266.5, -5,568,445.0] | -91.8% | sonnet55-effort-medium lower |

**Verdict.** `sonnet55-effort-medium` vs `effort-medium` over 6 paired tasks: tokens lower by 6,720,760 (95% CI [-9,364,966, -4,759,097]); cost lower by 1.9789 (95% CI [-2.6743, -1.4655]); turns lower by 63.3 (95% CI [-84.4, -47.0]); accuracy 100.0% vs 58.3% (12/12 vs 7/12).

### `sonnet55-effort-high` vs `effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-high | 12 | **10,672,552** (6,728,046–14,521,911) | 10,672,552 | 3.505 | 92.5 | 2 in 2 run(s) | 437 | 0 | 0 | 369 | 0 | 58.3% (7/12) | 12,094,778 |
| sonnet55-effort-high | 12 | **1,763,470** (1,118,829–2,031,932) | 1,763,470 | 0.914 | 23.5 | 0 in 0 run(s) | 0 | 0 | 0 | 260 | 0 | 100.0% (12/12) | 1,615,728 |

Paired difference (`sonnet55-effort-high` − `effort-high`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | -9,366,508.1 | [-12,861,329.3, -6,370,970.8] | -84.5% | sonnet55-effort-high lower |
| uncached_equivalent | 6 | -9,177,078.3 | [-12,878,282.3, -5,880,295.7] | -84.0% | sonnet55-effort-high lower |
| total_cost_usd | 6 | -2.6552 | [-3.3660, -2.0093] | -74.8% | sonnet55-effort-high lower |
| num_turns | 6 | -74.6 | [-97.8, -52.3] | -74.7% | sonnet55-effort-high lower |

Iso-accuracy subset (3/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 3 | -11,172,890.0 | [-15,863,442.5, -5,732,806.5] | -85.9% | sonnet55-effort-high lower |
| uncached_equivalent | 3 | -10,949,259.2 | [-15,863,442.5, -5,061,914.0] | -85.4% | sonnet55-effort-high lower |
| total_cost_usd | 3 | -3.0790 | [-4.0237, -1.8772] | -76.2% | sonnet55-effort-high lower |
| num_turns | 3 | -83.5 | [-123.5, -46.5] | -76.3% | sonnet55-effort-high lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | -7,402,573.2 | [-11,922,421.0, -4,552,492.0] | -83.8% | sonnet55-effort-high lower |
| implement | 3 | -11,330,443.0 | [-15,863,442.5, -5,834,524.0] | -85.3% | sonnet55-effort-high lower |

**Verdict.** `sonnet55-effort-high` vs `effort-high` over 6 paired tasks: tokens lower by 9,366,508 (95% CI [-12,861,329, -6,370,971]); cost lower by 2.6552 (95% CI [-3.3660, -2.0093]); turns lower by 74.6 (95% CI [-97.8, -52.3]); accuracy 100.0% vs 58.3% (12/12 vs 7/12).

### `sonnet55-effort-xhigh` vs `effort-xhigh`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-xhigh | 12 | **12,357,323** (9,734,861–17,390,381) | 12,357,323 | 4.082 | 111.5 | 0 in 0 run(s) | 509 | 0 | 0 | 403 | 0 | 66.7% (8/12) | 12,968,364 |
| sonnet55-effort-xhigh | 12 | **4,564,634** (2,557,902–5,042,238) | 4,564,634 | 2.217 | 40.0 | 0 in 0 run(s) | 9 | 0 | 0 | 417 | 0 | 91.7% (11/12) | 3,846,805 |

Paired difference (`sonnet55-effort-xhigh` − `effort-xhigh`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | -9,129,907.4 | [-11,287,888.0, -7,296,960.9] | -70.4% | sonnet55-effort-xhigh lower |
| uncached_equivalent | 6 | -9,129,907.4 | [-11,309,528.2, -7,296,960.9] | -70.4% | sonnet55-effort-xhigh lower |
| total_cost_usd | 6 | -2.1812 | [-2.5810, -1.8082] | -53.5% | sonnet55-effort-xhigh lower |
| num_turns | 6 | -67.6 | [-83.8, -54.7] | -63.4% | sonnet55-effort-xhigh lower |

Iso-accuracy subset (4/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 4 | -9,249,983.8 | [-11,953,199.0, -6,581,846.0] | -72.1% | sonnet55-effort-xhigh lower |
| uncached_equivalent | 4 | -9,249,983.8 | [-12,803,791.8, -6,500,564.0] | -72.1% | sonnet55-effort-xhigh lower |
| total_cost_usd | 4 | -2.2355 | [-2.7586, -1.7123] | -56.3% | sonnet55-effort-xhigh lower |
| num_turns | 4 | -68.1 | [-92.4, -50.5] | -64.0% | sonnet55-effort-xhigh lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | -7,770,157.7 | [-10,146,781.0, -6,419,282.0] | -72.1% | sonnet55-effort-xhigh lower |
| implement | 3 | -10,489,657.2 | [-13,689,462.0, -7,687,168.0] | -68.7% | sonnet55-effort-xhigh lower |

**Verdict.** `sonnet55-effort-xhigh` vs `effort-xhigh` over 6 paired tasks: tokens lower by 9,129,907 (95% CI [-11,287,888, -7,296,961]); cost lower by 2.1812 (95% CI [-2.5810, -1.8082]); turns lower by 67.6 (95% CI [-83.8, -54.7]); accuracy 91.7% vs 66.7% (11/12 vs 8/12).

### `opus-effort-low` vs `sonnet55-effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-low | 12 | **539,741** (335,557–753,410) | 539,741 | 0.380 | 12.0 | 0 in 0 run(s) | 0 | 0 | 0 | 134 | 0 | 91.7% (11/12) | 636,425 |
| opus-effort-low | 12 | **479,245** (397,564–913,194) | 479,245 | 0.640 | 12.0 | 0 in 0 run(s) | 0 | 0 | 0 | 169 | 0 | 100.0% (12/12) | 737,579 |

Paired difference (`opus-effort-low` − `sonnet55-effort-low`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 134,048.8 | [-5,085.5, 285,649.0] | 21.8% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 6 | 134,048.8 | [-5,085.5, 279,215.7] | 21.8% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 6 | 0.3346 | [0.2300, 0.4481] | 77.4% | opus-effort-low higher |
| num_turns | 6 | 2.8 | [0.3, 5.3] | 24.3% | opus-effort-low higher |

Iso-accuracy subset (5/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 5 | 127,534.3 | [-37,199.2, 318,702.0] | 13.5% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 5 | 127,534.3 | [-37,199.2, 318,702.0] | 13.5% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 5 | 0.3464 | [0.2204, 0.4743] | 74.0% | opus-effort-low higher |
| num_turns | 5 | 2.4 | [-0.5, 5.4] | 15.3% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | 62,006.7 | [-133,460.5, 237,696.5] | 9.0% | **CI crosses 0 — no detectable difference** |
| implement | 3 | 206,091.0 | [-429.5, 452,081.0] | 34.5% | **CI crosses 0 — no detectable difference** |

**Verdict.** `opus-effort-low` vs `sonnet55-effort-low` over 6 paired tasks: tokens no detectable difference; cost higher by 0.3346 (95% CI [0.2300, 0.4481]); turns higher by 2.8 (95% CI [0.3, 5.3]); accuracy 100.0% vs 91.7% (12/12 vs 11/12).

### `opus-effort-medium` vs `sonnet55-effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-medium | 12 | **568,228** (378,964–1,228,390) | 568,228 | 0.465 | 12.0 | 0 in 0 run(s) | 0 | 0 | 0 | 161 | 0 | 100.0% (12/12) | 815,558 |
| opus-effort-medium | 12 | **1,573,947** (1,015,503–2,308,918) | 1,573,947 | 1.304 | 24.0 | 0 in 0 run(s) | 0 | 0 | 0 | 295 | 0 | 100.0% (12/12) | 1,761,545 |

Paired difference (`opus-effort-medium` − `sonnet55-effort-medium`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 945,986.8 | [709,430.3, 1,184,285.3] | 141.3% | opus-effort-medium higher |
| uncached_equivalent | 6 | 945,986.8 | [709,126.8, 1,192,993.5] | 141.3% | opus-effort-medium higher |
| total_cost_usd | 6 | 0.8399 | [0.6723, 1.0194] | 170.9% | opus-effort-medium higher |
| num_turns | 6 | 11.3 | [9.7, 12.8] | 83.8% | opus-effort-medium higher |

Iso-accuracy subset (6/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 945,986.8 | [709,278.6, 1,207,305.7] | 141.3% | opus-effort-medium higher |
| uncached_equivalent | 6 | 945,986.8 | [708,782.3, 1,184,285.3] | 141.3% | opus-effort-medium higher |
| total_cost_usd | 6 | 0.8399 | [0.6666, 1.0080] | 170.9% | opus-effort-medium higher |
| num_turns | 6 | 11.3 | [9.7, 12.9] | 83.8% | opus-effort-medium higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | 865,076.0 | [602,670.0, 1,388,977.5] | 134.5% | opus-effort-medium higher |
| implement | 3 | 1,026,897.7 | [745,494.5, 1,236,612.0] | 148.1% | opus-effort-medium higher |

**Verdict.** `opus-effort-medium` vs `sonnet55-effort-medium` over 6 paired tasks: tokens higher by 945,987 (95% CI [709,430, 1,184,285]); cost higher by 0.8399 (95% CI [0.6723, 1.0194]); turns higher by 11.3 (95% CI [9.7, 12.8]); accuracy 100.0% vs 100.0% (12/12 vs 12/12).

### `opus-effort-high` vs `sonnet55-effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-high | 12 | **1,763,470** (1,118,829–2,031,932) | 1,763,470 | 0.914 | 23.5 | 0 in 0 run(s) | 0 | 0 | 0 | 260 | 0 | 100.0% (12/12) | 1,615,728 |
| opus-effort-high | 12 | **2,619,255** (1,699,282–3,097,737) | 2,619,255 | 1.840 | 33.5 | 0 in 0 run(s) | 0 | 0 | 0 | 359 | 0 | 100.0% (12/12) | 2,472,083 |

Paired difference (`opus-effort-high` − `sonnet55-effort-high`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 856,355.3 | [533,341.5, 1,097,752.6] | 57.4% | opus-effort-high higher |
| uncached_equivalent | 6 | 856,355.3 | [520,973.9, 1,091,835.2] | 57.4% | opus-effort-high higher |
| total_cost_usd | 6 | 0.8871 | [0.7219, 1.0405] | 106.8% | opus-effort-high higher |
| num_turns | 6 | 8.6 | [4.9, 10.9] | 37.9% | opus-effort-high higher |

Iso-accuracy subset (6/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 856,355.3 | [526,771.5, 1,102,427.4] | 57.4% | opus-effort-high higher |
| uncached_equivalent | 6 | 856,355.3 | [539,139.1, 1,102,427.4] | 57.4% | opus-effort-high higher |
| total_cost_usd | 6 | 0.8871 | [0.7337, 1.0423] | 106.8% | opus-effort-high higher |
| num_turns | 6 | 8.6 | [5.0, 11.0] | 37.9% | opus-effort-high higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | 1,005,752.7 | [826,055.5, 1,227,388.0] | 78.9% | opus-effort-high higher |
| implement | 3 | 706,957.8 | [106,850.0, 1,153,182.5] | 36.0% | opus-effort-high higher |

**Verdict.** `opus-effort-high` vs `sonnet55-effort-high` over 6 paired tasks: tokens higher by 856,355 (95% CI [533,342, 1,097,753]); cost higher by 0.8871 (95% CI [0.7219, 1.0405]); turns higher by 8.6 (95% CI [4.9, 10.9]); accuracy 100.0% vs 100.0% (12/12 vs 12/12).

### `opus-effort-xhigh` vs `sonnet55-effort-xhigh`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-xhigh | 12 | **4,564,634** (2,557,902–5,042,238) | 4,564,634 | 2.217 | 40.0 | 0 in 0 run(s) | 9 | 0 | 0 | 417 | 0 | 91.7% (11/12) | 3,846,805 |
| opus-effort-xhigh | 12 | **4,180,799** (3,903,506–5,397,899) | 4,180,799 | 2.985 | 46.0 | 0 in 0 run(s) | 3 | 0 | 0 | 531 | 0 | 100.0% (12/12) | 4,805,321 |

Paired difference (`opus-effort-xhigh` − `sonnet55-effort-xhigh`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 883,706.8 | [64,375.7, 1,757,955.6] | 34.0% | opus-effort-xhigh higher |
| uncached_equivalent | 6 | 883,706.8 | [64,319.1, 1,764,213.3] | 34.0% | opus-effort-xhigh higher |
| total_cost_usd | 6 | 1.1657 | [0.8571, 1.5199] | 71.5% | opus-effort-xhigh higher |
| num_turns | 6 | 10.5 | [4.2, 17.0] | 32.0% | opus-effort-xhigh higher |

Iso-accuracy subset (5/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 5 | 1,081,244.1 | [85,221.2, 2,049,201.6] | 41.3% | opus-effort-xhigh higher |
| uncached_equivalent | 5 | 1,081,244.1 | [97,978.8, 2,049,201.6] | 41.3% | opus-effort-xhigh higher |
| total_cost_usd | 5 | 1.2550 | [0.8903, 1.6055] | 78.4% | opus-effort-xhigh higher |
| num_turns | 5 | 12.1 | [4.9, 19.3] | 37.1% | opus-effort-xhigh higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | 2,028,230.3 | [1,783,047.0, 2,226,638.0] | 73.3% | opus-effort-xhigh higher |
| implement | 3 | -260,816.7 | [-396,278.0, -103,979.5] | -5.4% | opus-effort-xhigh lower |

**Verdict.** `opus-effort-xhigh` vs `sonnet55-effort-xhigh` over 6 paired tasks: tokens higher by 883,707 (95% CI [64,376, 1,757,956]); cost higher by 1.1657 (95% CI [0.8571, 1.5199]); turns higher by 10.5 (95% CI [4.2, 17.0]); accuracy 100.0% vs 91.7% (12/12 vs 11/12).

### `grok-effort-low` vs `effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low | 0 | **–** (–––) | – | – | – | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | – (0/0) | – |
| grok-effort-low | 0 | **–** (–––) | – | – | – | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | – (0/0) | – |

Paired difference (`grok-effort-low` − `effort-low`), all 0 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 0 | – | [–, –] | – | n too small |
| uncached_equivalent | 0 | – | [–, –] | – | n too small |
| total_cost_usd | 0 | – | [–, –] | – | n too small |
| num_turns | 0 | – | [–, –] | – | n too small |

_No task succeeded in every run of both arms, so there is no iso-accuracy subset._

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|

**Verdict.** `grok-effort-low` vs `effort-low` over 0 paired tasks: tokens no detectable difference; cost no detectable difference; turns no detectable difference; accuracy not comparable.

### `grok-effort-medium` vs `effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-medium | 0 | **–** (–––) | – | – | – | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | – (0/0) | – |
| grok-effort-medium | 0 | **–** (–––) | – | – | – | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | – (0/0) | – |

Paired difference (`grok-effort-medium` − `effort-medium`), all 0 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 0 | – | [–, –] | – | n too small |
| uncached_equivalent | 0 | – | [–, –] | – | n too small |
| total_cost_usd | 0 | – | [–, –] | – | n too small |
| num_turns | 0 | – | [–, –] | – | n too small |

_No task succeeded in every run of both arms, so there is no iso-accuracy subset._

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|

**Verdict.** `grok-effort-medium` vs `effort-medium` over 0 paired tasks: tokens no detectable difference; cost no detectable difference; turns no detectable difference; accuracy not comparable.

### `grok-effort-high` vs `effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-high | 0 | **–** (–––) | – | – | – | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | – (0/0) | – |
| grok-effort-high | 0 | **–** (–––) | – | – | – | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | – (0/0) | – |

Paired difference (`grok-effort-high` − `effort-high`), all 0 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 0 | – | [–, –] | – | n too small |
| uncached_equivalent | 0 | – | [–, –] | – | n too small |
| total_cost_usd | 0 | – | [–, –] | – | n too small |
| num_turns | 0 | – | [–, –] | – | n too small |

_No task succeeded in every run of both arms, so there is no iso-accuracy subset._

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|

**Verdict.** `grok-effort-high` vs `effort-high` over 0 paired tasks: tokens no detectable difference; cost no detectable difference; turns no detectable difference; accuracy not comparable.

### `grok-effort-low` vs `sonnet55-effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-low | 0 | **–** (–––) | – | – | – | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | – (0/0) | – |
| grok-effort-low | 0 | **–** (–––) | – | – | – | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | – (0/0) | – |

Paired difference (`grok-effort-low` − `sonnet55-effort-low`), all 0 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 0 | – | [–, –] | – | n too small |
| uncached_equivalent | 0 | – | [–, –] | – | n too small |
| total_cost_usd | 0 | – | [–, –] | – | n too small |
| num_turns | 0 | – | [–, –] | – | n too small |

_No task succeeded in every run of both arms, so there is no iso-accuracy subset._

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|

**Verdict.** `grok-effort-low` vs `sonnet55-effort-low` over 0 paired tasks: tokens no detectable difference; cost no detectable difference; turns no detectable difference; accuracy not comparable.

### `grok-effort-medium` vs `sonnet55-effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-medium | 0 | **–** (–––) | – | – | – | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | – (0/0) | – |
| grok-effort-medium | 0 | **–** (–––) | – | – | – | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | – (0/0) | – |

Paired difference (`grok-effort-medium` − `sonnet55-effort-medium`), all 0 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 0 | – | [–, –] | – | n too small |
| uncached_equivalent | 0 | – | [–, –] | – | n too small |
| total_cost_usd | 0 | – | [–, –] | – | n too small |
| num_turns | 0 | – | [–, –] | – | n too small |

_No task succeeded in every run of both arms, so there is no iso-accuracy subset._

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|

**Verdict.** `grok-effort-medium` vs `sonnet55-effort-medium` over 0 paired tasks: tokens no detectable difference; cost no detectable difference; turns no detectable difference; accuracy not comparable.

### `grok-effort-high` vs `sonnet55-effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-high | 0 | **–** (–––) | – | – | – | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | – (0/0) | – |
| grok-effort-high | 0 | **–** (–––) | – | – | – | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | – (0/0) | – |

Paired difference (`grok-effort-high` − `sonnet55-effort-high`), all 0 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 0 | – | [–, –] | – | n too small |
| uncached_equivalent | 0 | – | [–, –] | – | n too small |
| total_cost_usd | 0 | – | [–, –] | – | n too small |
| num_turns | 0 | – | [–, –] | – | n too small |

_No task succeeded in every run of both arms, so there is no iso-accuracy subset._

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|

**Verdict.** `grok-effort-high` vs `sonnet55-effort-high` over 0 paired tasks: tokens no detectable difference; cost no detectable difference; turns no detectable difference; accuracy not comparable.

### `grok-effort-low` vs `opus-effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-low | 0 | **–** (–––) | – | – | – | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | – (0/0) | – |
| grok-effort-low | 0 | **–** (–––) | – | – | – | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | – (0/0) | – |

Paired difference (`grok-effort-low` − `opus-effort-low`), all 0 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 0 | – | [–, –] | – | n too small |
| uncached_equivalent | 0 | – | [–, –] | – | n too small |
| total_cost_usd | 0 | – | [–, –] | – | n too small |
| num_turns | 0 | – | [–, –] | – | n too small |

_No task succeeded in every run of both arms, so there is no iso-accuracy subset._

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|

**Verdict.** `grok-effort-low` vs `opus-effort-low` over 0 paired tasks: tokens no detectable difference; cost no detectable difference; turns no detectable difference; accuracy not comparable.

### `grok-effort-medium` vs `opus-effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-medium | 0 | **–** (–––) | – | – | – | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | – (0/0) | – |
| grok-effort-medium | 0 | **–** (–––) | – | – | – | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | – (0/0) | – |

Paired difference (`grok-effort-medium` − `opus-effort-medium`), all 0 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 0 | – | [–, –] | – | n too small |
| uncached_equivalent | 0 | – | [–, –] | – | n too small |
| total_cost_usd | 0 | – | [–, –] | – | n too small |
| num_turns | 0 | – | [–, –] | – | n too small |

_No task succeeded in every run of both arms, so there is no iso-accuracy subset._

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|

**Verdict.** `grok-effort-medium` vs `opus-effort-medium` over 0 paired tasks: tokens no detectable difference; cost no detectable difference; turns no detectable difference; accuracy not comparable.

### `grok-effort-high` vs `opus-effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-high | 0 | **–** (–––) | – | – | – | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | – (0/0) | – |
| grok-effort-high | 0 | **–** (–––) | – | – | – | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | – (0/0) | – |

Paired difference (`grok-effort-high` − `opus-effort-high`), all 0 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 0 | – | [–, –] | – | n too small |
| uncached_equivalent | 0 | – | [–, –] | – | n too small |
| total_cost_usd | 0 | – | [–, –] | – | n too small |
| num_turns | 0 | – | [–, –] | – | n too small |

_No task succeeded in every run of both arms, so there is no iso-accuracy subset._

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|

**Verdict.** `grok-effort-high` vs `opus-effort-high` over 0 paired tasks: tokens no detectable difference; cost no detectable difference; turns no detectable difference; accuracy not comparable.

### `haiku55-effort-low` vs `sonnet55-effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-low | 12 | **539,741** (335,557–753,410) | 539,741 | 0.380 | 12.0 | 0 in 0 run(s) | 0 | 0 | 0 | 134 | 0 | 91.7% (11/12) | 636,425 |
| haiku55-effort-low | 12 | **2,163,244** (1,106,118–3,090,608) | 2,163,244 | 0.153 | 29.5 | 0 in 0 run(s) | 50 | 0 | 0 | 248 | 0 | 100.0% (12/12) | 2,309,853 |

Paired difference (`haiku55-effort-low` − `sonnet55-effort-low`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 1,706,323.1 | [852,198.0, 2,709,472.8] | 283.2% | haiku55-effort-low higher |
| uncached_equivalent | 6 | 1,706,323.1 | [883,138.5, 2,742,182.2] | 283.2% | haiku55-effort-low higher |
| total_cost_usd | 6 | -0.2579 | [-0.3004, -0.2168] | -65.8% | haiku55-effort-low lower |
| num_turns | 6 | 22.5 | [13.5, 32.7] | 192.0% | haiku55-effort-low higher |

Iso-accuracy subset (5/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 5 | 1,744,600.8 | [720,961.7, 2,877,707.9] | 225.6% | haiku55-effort-low higher |
| uncached_equivalent | 5 | 1,744,600.8 | [720,961.7, 2,859,837.2] | 225.6% | haiku55-effort-low higher |
| total_cost_usd | 5 | -0.2724 | [-0.3092, -0.2400] | -66.3% | haiku55-effort-low lower |
| num_turns | 5 | 22.1 | [11.1, 34.0] | 155.0% | haiku55-effort-low higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | 942,032.3 | [344,679.0, 1,868,297.5] | 156.1% | haiku55-effort-low higher |
| implement | 3 | 2,470,613.8 | [1,514,934.5, 3,939,256.0] | 410.4% | haiku55-effort-low higher |

**Verdict.** `haiku55-effort-low` vs `sonnet55-effort-low` over 6 paired tasks: tokens higher by 1,706,323 (95% CI [852,198, 2,709,473]); cost lower by 0.2579 (95% CI [-0.3004, -0.2168]); turns higher by 22.5 (95% CI [13.5, 32.7]); accuracy 100.0% vs 91.7% (12/12 vs 11/12).

### `haiku55-effort-medium` vs `sonnet55-effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-medium | 12 | **568,228** (378,964–1,228,390) | 568,228 | 0.465 | 12.0 | 0 in 0 run(s) | 0 | 0 | 0 | 161 | 0 | 100.0% (12/12) | 815,558 |
| haiku55-effort-medium | 12 | **3,483,694** (1,917,013–4,132,195) | 3,483,694 | 0.282 | 36.0 | 0 in 0 run(s) | 8 | 0 | 0 | 328 | 0 | 91.7% (11/12) | 3,182,830 |

Paired difference (`haiku55-effort-medium` − `sonnet55-effort-medium`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 2,315,908.5 | [1,707,091.4, 2,875,054.3] | 355.4% | haiku55-effort-medium higher |
| uncached_equivalent | 6 | 2,315,908.5 | [1,762,818.1, 2,860,889.6] | 355.4% | haiku55-effort-medium higher |
| total_cost_usd | 6 | -0.2612 | [-0.3744, -0.1541] | -50.6% | haiku55-effort-medium lower |
| num_turns | 6 | 21.5 | [18.9, 24.0] | 161.4% | haiku55-effort-medium higher |

Iso-accuracy subset (5/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 5 | 2,403,630.5 | [1,657,758.8, 3,020,222.1] | 330.3% | haiku55-effort-medium higher |
| uncached_equivalent | 5 | 2,403,630.5 | [1,657,758.8, 3,020,222.1] | 330.3% | haiku55-effort-medium higher |
| total_cost_usd | 5 | -0.2738 | [-0.4023, -0.1453] | -50.1% | haiku55-effort-medium lower |
| num_turns | 5 | 21.4 | [18.3, 24.5] | 147.4% | haiku55-effort-medium higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | 1,939,901.0 | [1,160,614.0, 2,704,211.5] | 325.1% | haiku55-effort-medium higher |
| implement | 3 | 2,691,916.0 | [1,877,298.5, 3,346,375.0] | 385.8% | haiku55-effort-medium higher |

**Verdict.** `haiku55-effort-medium` vs `sonnet55-effort-medium` over 6 paired tasks: tokens higher by 2,315,909 (95% CI [1,707,091, 2,875,054]); cost lower by 0.2612 (95% CI [-0.3744, -0.1541]); turns higher by 21.5 (95% CI [18.9, 24.0]); accuracy 91.7% vs 100.0% (11/12 vs 12/12).

### `haiku55-effort-high` vs `sonnet55-effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-high | 12 | **1,763,470** (1,118,829–2,031,932) | 1,763,470 | 0.914 | 23.5 | 0 in 0 run(s) | 0 | 0 | 0 | 260 | 0 | 100.0% (12/12) | 1,615,728 |
| haiku55-effort-high | 12 | **4,317,687** (3,022,184–7,608,746) | 4,317,687 | 0.455 | 57.0 | 0 in 0 run(s) | 76 | 0 | 0 | 309 | 0 | 91.7% (11/12) | 5,046,978 |

Paired difference (`haiku55-effort-high` − `sonnet55-effort-high`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 3,414,695.7 | [1,968,697.2, 5,040,656.6] | 193.8% | haiku55-effort-high higher |
| uncached_equivalent | 6 | 3,414,695.7 | [1,993,890.2, 5,211,421.8] | 193.8% | haiku55-effort-high higher |
| total_cost_usd | 6 | -0.4190 | [-0.5374, -0.3223] | -50.4% | haiku55-effort-high lower |
| num_turns | 6 | 37.5 | [25.2, 49.9] | 156.4% | haiku55-effort-high higher |

Iso-accuracy subset (5/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 5 | 3,240,915.6 | [1,538,819.3, 5,402,865.8] | 188.1% | haiku55-effort-high higher |
| uncached_equivalent | 5 | 3,240,915.6 | [1,538,819.3, 5,161,837.1] | 188.1% | haiku55-effort-high higher |
| total_cost_usd | 5 | -0.4089 | [-0.5540, -0.2986] | -52.1% | haiku55-effort-high lower |
| num_turns | 5 | 36.2 | [21.4, 51.3] | 151.0% | haiku55-effort-high higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | 3,211,446.5 | [809,331.0, 6,855,033.5] | 191.6% | haiku55-effort-high higher |
| implement | 3 | 3,617,944.8 | [2,135,484.5, 4,434,754.0] | 196.0% | haiku55-effort-high higher |

**Verdict.** `haiku55-effort-high` vs `sonnet55-effort-high` over 6 paired tasks: tokens higher by 3,414,696 (95% CI [1,968,697, 5,040,657]); cost lower by 0.4190 (95% CI [-0.5374, -0.3223]); turns higher by 37.5 (95% CI [25.2, 49.9]); accuracy 91.7% vs 100.0% (11/12 vs 12/12).

### `haiku55-effort-xhigh` vs `sonnet55-effort-xhigh`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-xhigh | 12 | **4,564,634** (2,557,902–5,042,238) | 4,564,634 | 2.217 | 40.0 | 0 in 0 run(s) | 9 | 0 | 0 | 417 | 0 | 91.7% (11/12) | 3,846,805 |
| haiku55-effort-xhigh | 12 | **6,879,460** (4,896,652–8,924,558) | 6,879,460 | 0.806 | 74.0 | 0 in 0 run(s) | 188 | 0 | 0 | 354 | 0 | 100.0% (12/12) | 7,206,945 |

Paired difference (`haiku55-effort-xhigh` − `sonnet55-effort-xhigh`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 3,285,330.7 | [2,120,951.9, 4,599,731.8] | 84.1% | haiku55-effort-xhigh higher |
| uncached_equivalent | 6 | 3,285,330.7 | [2,155,894.1, 4,600,881.2] | 84.1% | haiku55-effort-xhigh higher |
| total_cost_usd | 6 | -1.2001 | [-1.4587, -0.9029] | -62.3% | haiku55-effort-xhigh lower |
| num_turns | 6 | 38.0 | [31.0, 44.3] | 98.4% | haiku55-effort-xhigh higher |

Iso-accuracy subset (5/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 5 | 3,517,969.2 | [2,162,645.3, 5,042,275.1] | 89.2% | haiku55-effort-xhigh higher |
| uncached_equivalent | 5 | 3,517,969.2 | [2,194,655.4, 4,945,945.8] | 89.2% | haiku55-effort-xhigh higher |
| total_cost_usd | 5 | -1.2014 | [-1.5118, -0.8911] | -62.6% | haiku55-effort-xhigh lower |
| num_turns | 5 | 36.6 | [29.2, 44.0] | 94.5% | haiku55-effort-xhigh higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | 2,280,314.7 | [1,745,318.0, 2,868,661.5] | 79.3% | haiku55-effort-xhigh higher |
| implement | 3 | 4,290,346.7 | [2,122,138.0, 6,117,754.5] | 88.9% | haiku55-effort-xhigh higher |

**Verdict.** `haiku55-effort-xhigh` vs `sonnet55-effort-xhigh` over 6 paired tasks: tokens higher by 3,285,331 (95% CI [2,120,952, 4,599,732]); cost lower by 1.2001 (95% CI [-1.4587, -0.9029]); turns higher by 38.0 (95% CI [31.0, 44.3]); accuracy 100.0% vs 91.7% (12/12 vs 11/12).

### `haiku55-effort-low` vs `opus-effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-low | 12 | **479,245** (397,564–913,194) | 479,245 | 0.640 | 12.0 | 0 in 0 run(s) | 0 | 0 | 0 | 169 | 0 | 100.0% (12/12) | 737,579 |
| haiku55-effort-low | 12 | **2,163,244** (1,106,118–3,090,608) | 2,163,244 | 0.153 | 29.5 | 0 in 0 run(s) | 50 | 0 | 0 | 248 | 0 | 100.0% (12/12) | 2,309,853 |

Paired difference (`haiku55-effort-low` − `opus-effort-low`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 1,572,274.3 | [813,303.3, 2,413,198.8] | 213.5% | haiku55-effort-low higher |
| uncached_equivalent | 6 | 1,572,274.3 | [813,303.3, 2,419,083.3] | 213.5% | haiku55-effort-low higher |
| total_cost_usd | 6 | -0.5925 | [-0.7236, -0.4696] | -80.7% | haiku55-effort-low lower |
| num_turns | 6 | 19.8 | [12.7, 28.0] | 130.7% | haiku55-effort-low higher |

Iso-accuracy subset (6/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 1,572,274.3 | [806,943.3, 2,413,312.4] | 213.5% | haiku55-effort-low higher |
| uncached_equivalent | 6 | 1,572,274.3 | [806,943.3, 2,419,083.3] | 213.5% | haiku55-effort-low higher |
| total_cost_usd | 6 | -0.5925 | [-0.7236, -0.4690] | -80.7% | haiku55-effort-low lower |
| num_turns | 6 | 19.8 | [12.6, 27.7] | 130.7% | haiku55-effort-low higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | 880,025.7 | [262,895.0, 1,630,601.0] | 146.9% | haiku55-effort-low higher |
| implement | 3 | 2,264,522.8 | [1,348,313.0, 3,487,175.0] | 280.2% | haiku55-effort-low higher |

**Verdict.** `haiku55-effort-low` vs `opus-effort-low` over 6 paired tasks: tokens higher by 1,572,274 (95% CI [813,303, 2,413,199]); cost lower by 0.5925 (95% CI [-0.7236, -0.4696]); turns higher by 19.8 (95% CI [12.7, 28.0]); accuracy 100.0% vs 100.0% (12/12 vs 12/12).

### `haiku55-effort-medium` vs `opus-effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-medium | 12 | **1,573,947** (1,015,503–2,308,918) | 1,573,947 | 1.304 | 24.0 | 0 in 0 run(s) | 0 | 0 | 0 | 295 | 0 | 100.0% (12/12) | 1,761,545 |
| haiku55-effort-medium | 12 | **3,483,694** (1,917,013–4,132,195) | 3,483,694 | 0.282 | 36.0 | 0 in 0 run(s) | 8 | 0 | 0 | 328 | 0 | 91.7% (11/12) | 3,182,830 |

Paired difference (`haiku55-effort-medium` − `opus-effort-medium`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 1,369,921.7 | [984,766.7, 1,732,478.0] | 85.9% | haiku55-effort-medium higher |
| uncached_equivalent | 6 | 1,369,921.7 | [984,766.7, 1,738,673.7] | 85.9% | haiku55-effort-medium higher |
| total_cost_usd | 6 | -1.1010 | [-1.3698, -0.8502] | -81.4% | haiku55-effort-medium lower |
| num_turns | 6 | 10.3 | [8.5, 11.9] | 41.7% | haiku55-effort-medium higher |

Iso-accuracy subset (5/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 5 | 1,417,545.2 | [947,964.5, 1,879,602.2] | 83.1% | haiku55-effort-medium higher |
| uncached_equivalent | 5 | 1,417,545.2 | [947,964.5, 1,815,741.9] | 83.1% | haiku55-effort-medium higher |
| total_cost_usd | 5 | -1.1438 | [-1.4448, -0.8429] | -81.0% | haiku55-effort-medium lower |
| num_turns | 5 | 10.2 | [8.1, 12.2] | 40.0% | haiku55-effort-medium higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | 1,074,825.0 | [557,033.5, 1,352,207.5] | 78.4% | haiku55-effort-medium higher |
| implement | 3 | 1,665,018.3 | [1,131,804.0, 2,109,763.0] | 93.3% | haiku55-effort-medium higher |

**Verdict.** `haiku55-effort-medium` vs `opus-effort-medium` over 6 paired tasks: tokens higher by 1,369,922 (95% CI [984,767, 1,732,478]); cost lower by 1.1010 (95% CI [-1.3698, -0.8502]); turns higher by 10.3 (95% CI [8.5, 11.9]); accuracy 91.7% vs 100.0% (11/12 vs 12/12).

### `haiku55-effort-high` vs `opus-effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-high | 12 | **2,619,255** (1,699,282–3,097,737) | 2,619,255 | 1.840 | 33.5 | 0 in 0 run(s) | 0 | 0 | 0 | 359 | 0 | 100.0% (12/12) | 2,472,083 |
| haiku55-effort-high | 12 | **4,317,687** (3,022,184–7,608,746) | 4,317,687 | 0.455 | 57.0 | 0 in 0 run(s) | 76 | 0 | 0 | 309 | 0 | 91.7% (11/12) | 5,046,978 |

Paired difference (`haiku55-effort-high` − `opus-effort-high`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 2,558,340.4 | [1,047,169.4, 4,011,769.8] | 95.4% | haiku55-effort-high higher |
| uncached_equivalent | 6 | 2,558,340.4 | [1,047,169.4, 4,086,310.7] | 95.4% | haiku55-effort-high higher |
| total_cost_usd | 6 | -1.3061 | [-1.4947, -1.0838] | -74.8% | haiku55-effort-high lower |
| num_turns | 6 | 28.9 | [16.3, 40.4] | 90.3% | haiku55-effort-high higher |

Iso-accuracy subset (5/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 5 | 2,443,925.8 | [801,501.3, 4,188,041.1] | 94.1% | haiku55-effort-high higher |
| uncached_equivalent | 5 | 2,443,925.8 | [801,501.3, 4,320,153.8] | 94.1% | haiku55-effort-high higher |
| total_cost_usd | 5 | -1.2515 | [-1.4494, -1.0237] | -75.5% | haiku55-effort-high lower |
| num_turns | 5 | 28.0 | [12.8, 42.9] | 89.0% | haiku55-effort-high higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | 2,205,693.8 | [-154,483.5, 5,627,645.5] | 70.8% | **CI crosses 0 — no detectable difference** |
| implement | 3 | 2,910,987.0 | [2,028,634.5, 3,573,913.0] | 120.0% | haiku55-effort-high higher |

**Verdict.** `haiku55-effort-high` vs `opus-effort-high` over 6 paired tasks: tokens higher by 2,558,340 (95% CI [1,047,169, 4,011,770]); cost lower by 1.3061 (95% CI [-1.4947, -1.0838]); turns higher by 28.9 (95% CI [16.3, 40.4]); accuracy 91.7% vs 100.0% (11/12 vs 12/12).

### `haiku55-effort-xhigh` vs `opus-effort-xhigh`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-xhigh | 12 | **4,180,799** (3,903,506–5,397,899) | 4,180,799 | 2.985 | 46.0 | 0 in 0 run(s) | 3 | 0 | 0 | 531 | 0 | 100.0% (12/12) | 4,805,321 |
| haiku55-effort-xhigh | 12 | **6,879,460** (4,896,652–8,924,558) | 6,879,460 | 0.806 | 74.0 | 0 in 0 run(s) | 188 | 0 | 0 | 354 | 0 | 100.0% (12/12) | 7,206,945 |

Paired difference (`haiku55-effort-xhigh` − `opus-effort-xhigh`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 2,401,623.8 | [516,100.0, 4,480,695.3] | 52.0% | haiku55-effort-xhigh higher |
| uncached_equivalent | 6 | 2,401,623.8 | [516,100.0, 4,515,901.3] | 52.0% | haiku55-effort-xhigh higher |
| total_cost_usd | 6 | -2.3658 | [-2.7366, -2.0917] | -76.4% | haiku55-effort-xhigh lower |
| num_turns | 6 | 27.5 | [13.1, 40.4] | 58.7% | haiku55-effort-xhigh higher |

Iso-accuracy subset (6/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 2,401,623.8 | [516,100.0, 4,482,883.6] | 52.0% | haiku55-effort-xhigh higher |
| uncached_equivalent | 6 | 2,401,623.8 | [483,082.3, 4,492,852.1] | 52.0% | haiku55-effort-xhigh higher |
| total_cost_usd | 6 | -2.3658 | [-2.7471, -2.1092] | -76.4% | haiku55-effort-xhigh lower |
| num_turns | 6 | 27.5 | [13.1, 40.0] | 58.7% | haiku55-effort-xhigh higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | 252,084.3 | [-329,688.0, 642,023.5] | 4.1% | **CI crosses 0 — no detectable difference** |
| implement | 3 | 4,551,163.3 | [2,226,117.5, 6,399,947.0] | 100.0% | haiku55-effort-xhigh higher |

**Verdict.** `haiku55-effort-xhigh` vs `opus-effort-xhigh` over 6 paired tasks: tokens higher by 2,401,624 (95% CI [516,100, 4,480,695]); cost lower by 2.3658 (95% CI [-2.7366, -2.0917]); turns higher by 27.5 (95% CI [13.1, 40.4]); accuracy 100.0% vs 100.0% (12/12 vs 12/12).

## 8. Features never exercised

graphify exposes more than `query`. The table counts, per arm, how many times each subcommand was invoked across all runs (and, in parentheses, how many runs used it at least once). A zero column is the point: it means the benchmark never put that feature under measurement, so nothing here — positive or negative — can be read as evidence about it.

| condition | runs | `query` | `explain` | `path` | `god-nodes` | `affected` | `save-result` | `reflect` | `update` | `benchmark` |
|---|---|---|---|---|---|---|---|---|---|---|
| `effort-high` | 12 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `effort-low` | 12 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `effort-medium` | 12 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `effort-xhigh` | 12 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `haiku55-effort-high` | 12 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `haiku55-effort-low` | 12 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `haiku55-effort-medium` | 12 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `haiku55-effort-xhigh` | 12 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `opus-effort-high` | 12 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `opus-effort-low` | 12 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `opus-effort-medium` | 12 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `opus-effort-xhigh` | 12 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `sonnet55-effort-high` | 12 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `sonnet55-effort-low` | 12 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `sonnet55-effort-medium` | 12 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `sonnet55-effort-xhigh` | 12 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |

| condition | runs reading `graph.json` directly | runs that never invoked the CLI (nudge ignored) | strict denials: total (median/run) |
|---|---|---|---|
| `effort-high` | 0 | n/a (no graph) | 0 (0) |
| `effort-low` | 0 | n/a (no graph) | 0 (0) |
| `effort-medium` | 0 | n/a (no graph) | 0 (0) |
| `effort-xhigh` | 0 | n/a (no graph) | 0 (0) |
| `haiku55-effort-high` | 0 | n/a (no graph) | 0 (0) |
| `haiku55-effort-low` | 0 | n/a (no graph) | 0 (0) |
| `haiku55-effort-medium` | 0 | n/a (no graph) | 0 (0) |
| `haiku55-effort-xhigh` | 0 | n/a (no graph) | 0 (0) |
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
| `effort-high` | 12 | 1,017,573 (861,662–1,117,367) | 952,081 (746,545–1,115,382) | 991,255 (827,775–1,085,334) | 3,622 (2,365–12,743) | 42 (28–50) |
| `effort-low` | 12 | 564,741 (413,147–763,557) | 336,090 (142,810–544,415) | 618,911 (390,339–901,084) | 2,657 (2,103–3,278) | 29 (26–47) |
| `effort-medium` | 12 | 622,400 (527,596–840,630) | 586,051 (512,245–803,724) | 602,290 (512,192–828,441) | 2,704 (2,372–3,271) | 41 (33–57) |
| `effort-xhigh` | 12 | 1,080,796 (888,354–1,150,284) | 1,078,605 (885,415–1,149,174) | 1,039,300 (859,491–1,113,772) | 3,234 (2,350–3,971) | 44 (39–58) |
| `haiku55-effort-high` | 12 | 370,000 (234,940–472,568) | 367,518 (230,860–470,266) | 345,099 (208,916–437,172) | 846 (796–919) | 47 (39–61) |
| `haiku55-effort-low` | 12 | 197,732 (113,381–253,907) | 194,224 (112,071–251,421) | 177,305 (98,718–224,388) | 799 (763–849) | 42 (40–53) |
| `haiku55-effort-medium` | 12 | 270,155 (202,142–308,265) | 266,889 (199,674–304,088) | 222,635 (175,736–259,499) | 870 (809–974) | 42 (35–56) |
| `haiku55-effort-xhigh` | 12 | 568,179 (443,157–661,638) | 566,983 (439,109–658,807) | 524,241 (401,631–605,518) | 1,070 (944–1,172) | 45 (36–51) |
| `opus-effort-high` | 12 | 275,451 (223,192–327,395) | 274,554 (222,144–326,464) | 255,827 (203,884–297,491) | 1,461 (1,338–1,549) | 48 (41–62) |
| `opus-effort-low` | 12 | 99,803 (76,689–168,135) | 97,749 (73,557–166,622) | 81,734 (60,446–153,144) | 1,999 (1,965–2,475) | 39 (33–46) |
| `opus-effort-medium` | 12 | 241,074 (145,118–277,574) | 240,088 (142,399–273,968) | 221,916 (130,189–246,606) | 1,850 (1,404–2,366) | 48 (41–61) |
| `opus-effort-xhigh` | 12 | 491,911 (453,069–588,832) | 489,530 (451,317–582,462) | 461,015 (423,640–533,056) | 1,430 (1,331–1,648) | 44 (39–56) |
| `sonnet55-effort-high` | 12 | 256,196 (199,820–300,408) | 252,988 (196,592–298,950) | 220,252 (180,180–267,603) | 3,385 (2,373–6,337) | 37 (35–43) |
| `sonnet55-effort-low` | 12 | 113,834 (75,702–146,499) | 112,580 (74,624–133,529) | 82,393 (64,941–116,550) | 3,701 (2,707–4,708) | 47 (41–67) |
| `sonnet55-effort-medium` | 12 | 113,084 (91,576–184,493) | 112,172 (88,526–174,879) | 100,315 (76,332–156,265) | 2,983 (2,674–3,400) | 46 (41–70) |
| `sonnet55-effort-xhigh` | 12 | 499,149 (333,851–649,186) | 496,924 (332,423–646,677) | 459,154 (301,952–576,025) | 1,742 (1,422–2,853) | 42 (34–58) |

`claude.wall_ms` is the whole `claude -p` process as the harness timed it. Prefer it over `duration_ms` when an arm delegates: from Claude Code 2.1.28x the `Agent` tool runs in the background and `duration_ms` stops before the subagent's work is folded back in.

`time_to_request_ms` covers everything before the first API request, which is where **MCP server startup lands**: it is the only column in which an arm that must spawn and handshake with a server can differ from one that does not. The transcript itself cannot show that cost — Claude Code connects its configured servers *before* writing the first transcript entry, so the delay between the first entry and the one advertising the server's tools collapses to a few milliseconds of bookkeeping rather than measuring the spawn.

Per-tool-call latency, median (IQR) in ms, pooled over calls:

| condition | `Read` | `Bash` | `Agent` |
|---|---|---|---|
| `effort-high` | 9 (6–15) | 42 (31–192) | 12 (10–13) |
| `effort-low` | 10 (6–15) | 44 (29–287) | 12 (7–16) |
| `effort-medium` | 9 (6–15) | 40 (30–67) | 16 (14–19) |
| `effort-xhigh` | 9 (5–15) | 43 (30–152) | – |
| `haiku55-effort-high` | 8 (5–16) | 53 (38–195) | – |
| `haiku55-effort-low` | 12 (7–16) | 63 (46–158) | – |
| `haiku55-effort-medium` | 7 (5–13) | 62 (40–219) | – |
| `haiku55-effort-xhigh` | 8 (5–15) | 59 (39–512) | – |
| `opus-effort-high` | – | 52 (38–118) | – |
| `opus-effort-low` | – | 54 (41–101) | – |
| `opus-effort-medium` | – | 55 (38–143) | – |
| `opus-effort-xhigh` | 22 (17–165) | 46 (32–77) | – |
| `sonnet55-effort-high` | – | 60 (37–196) | – |
| `sonnet55-effort-low` | – | 71 (51–197) | – |
| `sonnet55-effort-medium` | – | 66 (45–203) | – |
| `sonnet55-effort-xhigh` | 17 (8–19) | 57 (39–133) | – |

Each cell is timed from the transcript entry carrying the `tool_use` block to the entry carrying its matching `tool_result`, both written locally by the same process. Calls whose result never arrived — a run that hit its turn cap mid-call — are absent rather than counted as zero. `n` per cell is the number of calls, not the number of runs, so an arm that called a tool once contributes one observation.

**Index build cost, for scale.** graphify v1: **4.6 s** total (`update` 3.4 s + `cluster-only` 1.2 s, AST-only, no API calls). graphify v2: a comparable AST pass plus roughly **35 min** of LLM-backed document extraction. MemPalace v1: **49 s**; v2: **97 s** (embedding + indexing, `--no-llm`, no API calls). All are one-off costs paid before any run, and none is included in any figure above — they are listed only so a per-query latency can be read against what producing the index cost in the first place.

## 10. Thinking tokens and model mix

Thinking tokens are billed as output and are a **subset** of `output_tokens`, not an addition to it, so the share is the honest reading of an effort change: an arm that merely wrote less prose would move the absolute count without touching the lever. The figure is main-session only — `usage.output_tokens_details` does not see a subagent — so an arm that delegates reports the *parent's* thinking, and its explorer's thinking appears only as tokens against that explorer's model in the second table.

| condition | runs | thinking tokens | main-session output | thinking share |
|---|---|---|---|---|
| `effort-high` | 12 | 393,161 | 759,145 | 51.8% |
| `effort-low` | 12 | 87,020 | 262,893 | 33.1% |
| `effort-medium` | 12 | 207,402 | 505,858 | 41.0% |
| `effort-xhigh` | 12 | 529,156 | 913,812 | 57.9% |
| `haiku55-effort-high` | 12 | 526,897 | 877,240 | 60.1% |
| `haiku55-effort-low` | 12 | 210,661 | 437,482 | 48.2% |
| `haiku55-effort-medium` | 12 | 310,757 | 589,499 | 52.7% |
| `haiku55-effort-xhigh` | 12 | 902,404 | 1,355,686 | 66.6% |
| `opus-effort-high` | 12 | 83,304 | 301,909 | 27.6% |
| `opus-effort-low` | 12 | 15,192 | 123,737 | 12.3% |
| `opus-effort-medium` | 12 | 45,163 | 223,850 | 20.2% |
| `opus-effort-xhigh` | 12 | 229,837 | 561,254 | 41.0% |
| `sonnet55-effort-high` | 12 | 75,656 | 266,391 | 28.4% |
| `sonnet55-effort-low` | 12 | 19,627 | 124,043 | 15.8% |
| `sonnet55-effort-medium` | 12 | 30,305 | 154,170 | 19.7% |
| `sonnet55-effort-xhigh` | 12 | 310,287 | 670,527 | 46.3% |

**Which model spent the tokens.** Summed from `modelUsage` over every run of the arm, on the same definition as `uncached_equivalent_all` (input + cache read + cache creation), so the row totals reconcile with the headline volume rather than describing some adjacent quantity. Note that a ~1k-token Haiku entry appears in **every** arm, including plain `baseline`: that is Claude Code's own background helper call, not delegated exploration. Only an arm whose Haiku row is orders of magnitude larger than that has actually moved work onto Haiku.

That helper's size is a deterministic function of the task prompt, so every Sonnet arm running the same task set reports the **identical** Haiku total. Rows agreeing to the token are therefore the expected result here, not a copy-paste fault — and they are what makes the figure usable as a baseline to read a genuinely delegating arm against.

| condition | `claude-haiku-5-5` tokens | `claude-opus-5-5` tokens | `claude-sonnet-5` tokens | `claude-sonnet-5-5` tokens | `claude-haiku-5-5` cost | `claude-opus-5-5` cost | `claude-sonnet-5` cost | `claude-sonnet-5-5` cost |
|---|---|---|---|---|---|---|---|---|
| `effort-high` | 0 | 0 | 131,786,833 | 0 | $0.00 | $0.00 | $42.57 | $0.00 |
| `effort-low` | 0 | 0 | 81,624,517 | 0 | $0.00 | $0.00 | $28.30 | $0.00 |
| `effort-medium` | 0 | 0 | 90,435,814 | 0 | $0.00 | $0.00 | $30.15 | $0.00 |
| `effort-xhigh` | 0 | 0 | 156,618,261 | 0 | $0.00 | $0.00 | $49.53 | $0.00 |
| `haiku55-effort-high` | 60,365,084 | 0 | 0 | 0 | $5.68 | $0.00 | $0.00 | $0.00 |
| `haiku55-effort-low` | 27,718,235 | 0 | 0 | 0 | $2.14 | $0.00 | $0.00 | $0.00 |
| `haiku55-effort-medium` | 37,577,597 | 0 | 0 | 0 | $3.27 | $0.00 | $0.00 | $0.00 |
| `haiku55-effort-xhigh` | 86,483,340 | 0 | 0 | 0 | $8.95 | $0.00 | $0.00 | $0.00 |
| `opus-effort-high` | 0 | 29,664,999 | 0 | 0 | $0.00 | $21.35 | $0.00 | $0.00 |
| `opus-effort-low` | 0 | 8,850,944 | 0 | 0 | $0.00 | $9.25 | $0.00 | $0.00 |
| `opus-effort-medium` | 0 | 21,138,537 | 0 | 0 | $0.00 | $16.48 | $0.00 | $0.00 |
| `opus-effort-xhigh` | 0 | 57,663,854 | 0 | 0 | $0.00 | $37.34 | $0.00 | $0.00 |
| `sonnet55-effort-high` | 0 | 0 | 0 | 19,388,736 | $0.00 | $0.00 | $0.00 | $10.71 |
| `sonnet55-effort-low` | 0 | 0 | 0 | 7,242,358 | $0.00 | $0.00 | $0.00 | $5.23 |
| `sonnet55-effort-medium` | 0 | 0 | 0 | 9,786,695 | $0.00 | $0.00 | $0.00 | $6.40 |
| `sonnet55-effort-xhigh` | 0 | 0 | 0 | 47,059,372 | $0.00 | $0.00 | $0.00 | $23.36 |

## 11. Where the remaining tokens go

`uncached_all` is one number; this section splits it in two, because at this end of the range the remaining question is no longer *how much* an arm spends but *on what*. **fixed = `first_turn_cache_creation` × `num_turns`** — the system prompt and tool definitions, re-sent on every single turn — and **moving = `uncached_all` − fixed**, which is the file contents, tool results and reasoning that are actually about the task. Both are per-run medians, so the two columns need not sum to the `uncached_all` median exactly.

Caveats that bound the reading: `first_turn_cache_creation` and `num_turns` are main-session only while `uncached_all` counts subagents too, so on a delegating arm `fixed` is an under-estimate (the arms below spawn none). And cache reads bill at a tenth of fresh input, so this is a split of **information volume, not of dollars** — a 60% fixed share does not mean 60% of the bill.

| condition | runs | uncached_all (med) | turns (med) | first-turn fixed | fixed = ft×turns (med) | moving (med) | fixed share |
|---|---|---|---|---|---|---|---|
| `effort-high` | 12 | 10,672,552 | 93 | 13,774 | 1,191,818 | 9,331,597 | 12.1% |
| `effort-low` | 12 | 4,817,069 | 44 | 12,462 | 543,137 | 4,467,006 | 14.7% |
| `effort-medium` | 12 | 6,051,494 | 68 | 13,732 | 892,704 | 5,067,683 | 13.7% |
| `effort-xhigh` | 12 | 12,357,323 | 112 | 13,057 | 1,315,335 | 11,017,895 | 11.2% |
| `haiku55-effort-high` | 12 | 4,317,687 | 57 | 9,388 | 574,937 | 3,586,780 | 15.1% |
| `haiku55-effort-low` | 12 | 2,163,244 | 30 | 10,592 | 335,168 | 1,781,907 | 16.5% |
| `haiku55-effort-medium` | 12 | 3,483,694 | 36 | 9,948 | 380,646 | 3,104,066 | 11.9% |
| `haiku55-effort-xhigh` | 12 | 6,879,460 | 74 | 10,990 | 702,188 | 5,817,927 | 11.4% |
| `opus-effort-high` | 12 | 2,619,255 | 34 | 8,691 | 276,346 | 2,316,060 | 11.1% |
| `opus-effort-low` | 12 | 479,245 | 12 | 10,769 | 134,741 | 355,488 | 23.1% |
| `opus-effort-medium` | 12 | 1,573,947 | 24 | 8,688 | 225,707 | 1,364,445 | 15.2% |
| `opus-effort-xhigh` | 12 | 4,180,799 | 46 | 9,377 | 473,575 | 3,677,348 | 10.4% |
| `sonnet55-effort-high` | 12 | 1,763,470 | 24 | 10,616 | 228,812 | 1,544,976 | 14.1% |
| `sonnet55-effort-low` | 12 | 539,741 | 12 | 8,608 | 107,379 | 442,925 | 18.8% |
| `sonnet55-effort-medium` | 12 | 568,228 | 12 | 9,821 | 126,883 | 445,264 | 20.0% |
| `sonnet55-effort-xhigh` | 12 | 4,564,634 | 40 | 8,606 | 351,430 | 4,179,162 | 9.5% |

## 12. Counter-productive cases and subagent use

- `effort-high`: **2** subagent(s) spawned across **2**/12 run(s). T2S all-model 12,094,778 vs main-session-only 11,903,095.
- `effort-low`: **18** subagent(s) spawned across **9**/12 run(s). T2S all-model 5,180,595 vs main-session-only 2,653,450.
- `effort-medium`: **3** subagent(s) spawned across **3**/12 run(s). T2S all-model 8,486,673 vs main-session-only 8,230,552.
- `effort-xhigh`: **0** subagent(s) spawned across **0**/12 run(s). T2S all-model 12,968,364 vs main-session-only 12,968,364.
- `haiku55-effort-high`: **0** subagent(s) spawned across **0**/12 run(s). T2S all-model 5,046,978 vs main-session-only 5,046,978.
- `haiku55-effort-low`: **0** subagent(s) spawned across **0**/12 run(s). T2S all-model 2,309,853 vs main-session-only 2,309,853.
- `haiku55-effort-medium`: **0** subagent(s) spawned across **0**/12 run(s). T2S all-model 3,182,830 vs main-session-only 3,182,830.
- `haiku55-effort-xhigh`: **0** subagent(s) spawned across **0**/12 run(s). T2S all-model 7,206,945 vs main-session-only 7,206,945.
- `opus-effort-high`: **0** subagent(s) spawned across **0**/12 run(s). T2S all-model 2,472,083 vs main-session-only 2,472,083.
- `opus-effort-low`: **0** subagent(s) spawned across **0**/12 run(s). T2S all-model 737,579 vs main-session-only 737,579.
- `opus-effort-medium`: **0** subagent(s) spawned across **0**/12 run(s). T2S all-model 1,761,545 vs main-session-only 1,761,545.
- `opus-effort-xhigh`: **0** subagent(s) spawned across **0**/12 run(s). T2S all-model 4,805,321 vs main-session-only 4,805,321.
- `sonnet55-effort-high`: **0** subagent(s) spawned across **0**/12 run(s). T2S all-model 1,615,728 vs main-session-only 1,615,728.
- `sonnet55-effort-low`: **0** subagent(s) spawned across **0**/12 run(s). T2S all-model 636,425 vs main-session-only 636,425.
- `sonnet55-effort-medium`: **0** subagent(s) spawned across **0**/12 run(s). T2S all-model 815,558 vs main-session-only 815,558.
- `sonnet55-effort-xhigh`: **0** subagent(s) spawned across **0**/12 run(s). T2S all-model 3,846,805 vs main-session-only 3,846,805.
- Runs that opened `graphify-out/graph.json` directly: **0**
- graphify-condition runs that never invoked the `graphify` CLI (nudge ignored): **12** (`AFX1-discussion-threads__opus-effort-low__r1`, `AFX1-discussion-threads__opus-effort-low__r2`, `AFX2-alerts-and-inbox__opus-effort-low__r1`, `AFX2-alerts-and-inbox__opus-effort-low__r2`, `AFX3-project-lifecycle__opus-effort-low__r1`, `AFX3-project-lifecycle__opus-effort-low__r2`, `AIM1-milestones__opus-effort-low__r1`, `AIM1-milestones__opus-effort-low__r2`, `AIM2-billing-periods__opus-effort-low__r1`, `AIM2-billing-periods__opus-effort-low__r2`, `AIM3-sub-issues__opus-effort-low__r1`, `AIM3-sub-issues__opus-effort-low__r2`)

## 13. Failed and ungraded runs

Harness failures (`is_error`, or `terminal_reason` other than `completed`): **0**. The table below also lists runs that completed normally but did not meet their grader's success threshold — those are accuracy results, not execution problems.

| run_id | condition | task | is_error | terminal_reason |
|---|---|---|---|---|
| `AFX1-discussion-threads__effort-high__r1` | effort-high | AFX1-discussion-threads | false | completed |
| `AFX1-discussion-threads__effort-high__r2` | effort-high | AFX1-discussion-threads | false | completed |
| `AFX1-discussion-threads__effort-medium__r2` | effort-medium | AFX1-discussion-threads | false | completed |
| `AFX3-project-lifecycle__effort-medium__r2` | effort-medium | AFX3-project-lifecycle | false | completed |
| `AIM1-milestones__effort-low__r1` | effort-low | AIM1-milestones | false | completed |
| `AIM1-milestones__effort-low__r2` | effort-low | AIM1-milestones | false | completed |
| `AIM2-billing-periods__effort-high__r1` | effort-high | AIM2-billing-periods | false | completed |
| `AIM2-billing-periods__effort-high__r2` | effort-high | AIM2-billing-periods | false | completed |
| `AIM2-billing-periods__effort-low__r2` | effort-low | AIM2-billing-periods | false | completed |
| `AIM2-billing-periods__effort-medium__r1` | effort-medium | AIM2-billing-periods | false | completed |
| `AIM2-billing-periods__effort-medium__r2` | effort-medium | AIM2-billing-periods | false | completed |
| `AIM2-billing-periods__effort-xhigh__r1` | effort-xhigh | AIM2-billing-periods | false | completed |
| `AIM2-billing-periods__effort-xhigh__r2` | effort-xhigh | AIM2-billing-periods | false | completed |
| `AIM2-billing-periods__haiku55-effort-high__r1` | haiku55-effort-high | AIM2-billing-periods | false | completed |
| `AIM3-sub-issues__effort-high__r2` | effort-high | AIM3-sub-issues | false | completed |
| `AIM3-sub-issues__effort-low__r1` | effort-low | AIM3-sub-issues | false | completed |
| `AIM3-sub-issues__effort-low__r2` | effort-low | AIM3-sub-issues | false | completed |
| `AIM3-sub-issues__effort-medium__r1` | effort-medium | AIM3-sub-issues | false | completed |
| `AIM3-sub-issues__effort-xhigh__r1` | effort-xhigh | AIM3-sub-issues | false | completed |
| `AIM3-sub-issues__effort-xhigh__r2` | effort-xhigh | AIM3-sub-issues | false | completed |
| `AIM3-sub-issues__haiku55-effort-medium__r1` | haiku55-effort-medium | AIM3-sub-issues | false | completed |
| `AIM3-sub-issues__sonnet55-effort-low__r1` | sonnet55-effort-low | AIM3-sub-issues | false | completed |
| `AIM3-sub-issues__sonnet55-effort-xhigh__r1` | sonnet55-effort-xhigh | AIM3-sub-issues | false | completed |

## 14. Limitations

- N = 192 runs over 6 tasks; a single corpus and a single model. These results do not generalize to other codebases or models.
- Bootstrap resamples tasks, so the interval reflects task-to-task variation, not within-task run noise.
- Where a CI crosses zero the honest reading is "no difference detected at this N", not "no difference exists".
- The fixed ~21k-token system-prompt/tool-definition overhead is included in both arms and not subtracted (see §2).
- **1 repetition per (task × condition)**: within-task run-to-run variance is unmeasured, so any single per-task difference may be run noise.
- Subagent traffic is counted in `uncached_all`, but a subagent's tool calls never reach the parent transcript, so the tool-call columns stay main-session-only.
- Raw per-run data lives in `results/models/apex/runs/<run-id>/` and the `summary.csv` beside this report.
