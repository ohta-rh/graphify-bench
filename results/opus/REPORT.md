# graphify-bench results

Generated 2026-09-29T06:54:17.631Z. 585 runs over 45 tasks, conditions: effort-high, effort-low, effort-low-nosub, effort-medium, effort-xhigh, opus-effort-high, opus-effort-low, opus-effort-medium, opus-effort-xhigh, sonnet55-effort-high, sonnet55-effort-low, sonnet55-effort-medium, sonnet55-effort-xhigh.

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
| effort-high | 45 | **273,470** (170,815–530,879) | 135,393 | 0.185 | 4.0 | 23 in 22 run(s) | 57 | 0 | 0 | 108 | 0 | 82.2% (37/45) | 463,430 |
| effort-low | 45 | **248,369** (155,721–315,825) | 93,983 | 0.158 | 3.0 | 26 in 26 run(s) | 15 | 0 | 0 | 94 | 0 | 77.8% (35/45) | 264,338 |
| effort-low-nosub | 45 | **148,873** (112,370–241,099) | 148,873 | 0.107 | 6.0 | 0 in 0 run(s) | 65 | 0 | 0 | 184 | 0 | 84.4% (38/45) | 210,387 |
| effort-medium | 45 | **271,427** (187,325–398,152) | 124,539 | 0.181 | 4.0 | 26 in 26 run(s) | 38 | 0 | 0 | 97 | 0 | 80.0% (36/45) | 349,581 |
| effort-xhigh | 45 | **421,143** (279,249–872,961) | 243,832 | 0.302 | 8.0 | 20 in 18 run(s) | 219 | 0 | 0 | 202 | 0 | 82.2% (37/45) | 649,577 |
| opus-effort-high | 45 | **131,978** (102,009–175,134) | 131,978 | 0.196 | 6.0 | 0 in 0 run(s) | 0 | 0 | 0 | 237 | 0 | 86.7% (39/45) | 172,766 |
| opus-effort-low | 45 | **104,202** (78,168–132,332) | 104,202 | 0.138 | 5.0 | 0 in 0 run(s) | 0 | 0 | 0 | 189 | 0 | 84.4% (38/45) | 121,364 |
| opus-effort-medium | 45 | **119,567** (87,232–155,771) | 119,567 | 0.168 | 5.0 | 0 in 0 run(s) | 2 | 0 | 0 | 212 | 0 | 84.4% (38/45) | 147,596 |
| opus-effort-xhigh | 45 | **144,863** (106,661–248,963) | 144,863 | 0.235 | 6.0 | 0 in 0 run(s) | 0 | 0 | 0 | 313 | 0 | 84.4% (38/45) | 274,361 |
| sonnet55-effort-high | 45 | **124,327** (79,460–164,246) | 124,327 | 0.089 | 6.0 | 0 in 0 run(s) | 10 | 1 | 0 | 224 | 0 | 86.7% (39/45) | 150,851 |
| sonnet55-effort-low | 45 | **80,852** (74,483–116,832) | 80,852 | 0.072 | 4.0 | 0 in 0 run(s) | 2 | 0 | 0 | 165 | 0 | 86.7% (39/45) | 107,969 |
| sonnet55-effort-medium | 45 | **97,000** (74,877–140,953) | 97,000 | 0.075 | 5.0 | 0 in 0 run(s) | 0 | 0 | 0 | 191 | 0 | 88.9% (40/45) | 121,496 |
| sonnet55-effort-xhigh | 45 | **134,815** (99,587–174,203) | 134,815 | 0.116 | 7.0 | 0 in 0 run(s) | 97 | 1 | 0 | 263 | 0 | 84.4% (38/45) | 211,021 |

**`uncached_all` (PRIMARY) = Σ over every entry of `modelUsage` of (inputTokens + cacheReadInputTokens + cacheCreationInputTokens)** — it covers the main session *and* any subagent, so it is commensurable with `total_cost_usd`. `uncached_main` (secondary) is the same sum taken from `usage.*`, which the result JSON populates for the **main session only**; a run that spawned a subagent therefore reports less information volume there than it actually consumed. The `subagents` column lets the two be reconciled. Tool columns are totals across all runs of the condition. T2S (tokens-to-success) = total `uncached_all` of successful runs / number of successful runs.

Fixed overhead, reported separately so readers can subtract it (architecture.md §5):

| condition | first-turn cache_creation (median) |
|---|---|
| effort-high | 11,488 |
| effort-low | 11,490 |
| effort-low-nosub | 10,640 |
| effort-medium | 11,488 |
| effort-xhigh | 11,494 |
| opus-effort-high | 8,534 |
| opus-effort-low | 8,533 |
| opus-effort-medium | 8,532 |
| opus-effort-xhigh | 8,535 |
| sonnet55-effort-high | 7,596 |
| sonnet55-effort-low | 7,597 |
| sonnet55-effort-medium | 7,593 |
| sonnet55-effort-xhigh | 7,597 |

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

### explain (9 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 0 | – | [–, –] | – | n too small |
| uncached_equivalent | 0 | – | [–, –] | – | n too small |
| total_cost_usd | 0 | – | [–, –] | – | n too small |
| num_turns | 0 | – | [–, –] | – | n too small |

### fix (9 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 0 | – | [–, –] | – | n too small |
| uncached_equivalent | 0 | – | [–, –] | – | n too small |
| total_cost_usd | 0 | – | [–, –] | – | n too small |
| num_turns | 0 | – | [–, –] | – | n too small |

### impact (9 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 0 | – | [–, –] | – | n too small |
| uncached_equivalent | 0 | – | [–, –] | – | n too small |
| total_cost_usd | 0 | – | [–, –] | – | n too small |
| num_turns | 0 | – | [–, –] | – | n too small |

### locate (9 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 0 | – | [–, –] | – | n too small |
| uncached_equivalent | 0 | – | [–, –] | – | n too small |
| total_cost_usd | 0 | – | [–, –] | – | n too small |
| num_turns | 0 | – | [–, –] | – | n too small |

### reference (9 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 0 | – | [–, –] | – | n too small |
| uncached_equivalent | 0 | – | [–, –] | – | n too small |
| total_cost_usd | 0 | – | [–, –] | – | n too small |
| num_turns | 0 | – | [–, –] | – | n too small |

## 6. Answer quality by category

Section 5 reports what each category *cost*. This one reports whether it was *answered*: each cell is `successes/graded · mean grader score`. The two are not interchangeable — an arm that gives up early looks cheap in section 5 and is exposed here.

| condition | **explain** | **fix** | **impact** | **locate** | **reference** |
|---|---|---|---|---|---|
| `effort-high` | 9/9 · 0.956 | 9/9 · 1.000 | 3/9 · 0.870 | 7/9 · 0.889 | 9/9 · 0.978 |
| `effort-low` | 9/9 · 0.911 | 7/9 · 0.778 | 4/9 · 0.891 | 8/9 · 0.944 | 7/9 · 0.957 |
| `effort-low-nosub` | 9/9 · 0.933 | 9/9 · 1.000 | 4/9 · 0.870 | 7/9 · 0.889 | 9/9 · 0.986 |
| `effort-medium` | 9/9 · 0.889 | 7/9 · 0.778 | 4/9 · 0.878 | 7/9 · 0.889 | 9/9 · 0.986 |
| `effort-xhigh` | 9/9 · 0.933 | 8/9 · 0.889 | 4/9 · 0.888 | 7/9 · 0.889 | 9/9 · 0.973 |
| `opus-effort-high` | 9/9 · 0.956 | 9/9 · 1.000 | 6/9 · 0.931 | 6/9 · 0.833 | 9/9 · 0.986 |
| `opus-effort-low` | 9/9 · 1.000 | 9/9 · 1.000 | 5/9 · 0.905 | 6/9 · 0.867 | 9/9 · 0.990 |
| `opus-effort-medium` | 9/9 · 1.000 | 9/9 · 1.000 | 4/9 · 0.897 | 7/9 · 0.889 | 9/9 · 0.986 |
| `opus-effort-xhigh` | 9/9 · 0.978 | 9/9 · 1.000 | 5/9 · 0.913 | 6/9 · 0.833 | 9/9 · 0.986 |
| `sonnet55-effort-high` | 9/9 · 1.000 | 9/9 · 1.000 | 5/9 · 0.916 | 7/9 · 0.956 | 9/9 · 0.986 |
| `sonnet55-effort-low` | 9/9 · 1.000 | 9/9 · 1.000 | 6/9 · 0.915 | 6/9 · 0.900 | 9/9 · 0.990 |
| `sonnet55-effort-medium` | 9/9 · 1.000 | 9/9 · 1.000 | 6/9 · 0.915 | 7/9 · 0.956 | 9/9 · 0.988 |
| `sonnet55-effort-xhigh` | 9/9 · 1.000 | 9/9 · 1.000 | 5/9 · 0.916 | 6/9 · 0.900 | 9/9 · 0.987 |

## 7. Structural comparisons

Each block below is an independent paired comparison between two arms, computed with the same machinery as §3: per-task pairing over the same task set, percentile bootstrap over tasks, an iso-accuracy subset scoped to just those two arms, and a per-category breakdown. Arms that are not part of a block are excluded from it entirely.

### `opus-effort-medium` vs `effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-medium | 45 | **271,427** (187,325–398,152) | 124,539 | 0.181 | 4.0 | 26 in 26 run(s) | 38 | 0 | 0 | 97 | 0 | 80.0% (36/45) | 349,581 |
| opus-effort-medium | 45 | **119,567** (87,232–155,771) | 119,567 | 0.168 | 5.0 | 0 in 0 run(s) | 2 | 0 | 0 | 212 | 0 | 84.4% (38/45) | 147,596 |

Paired difference (`opus-effort-medium` − `effort-medium`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | -182,286.3 | [-221,689.4, -140,860.7] | -52.2% | opus-effort-medium lower |
| uncached_equivalent | 45 | -9,162.7 | [-53,158.4, 34,315.4] | 94.1% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 45 | -0.0033 | [-0.0244, 0.0194] | 6.1% | **CI crosses 0 — no detectable difference** |
| num_turns | 45 | 1.5 | [0.3, 2.8] | 163.9% | opus-effort-medium higher |

Iso-accuracy subset (35/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 35 | -203,693.5 | [-252,678.5, -157,457.6] | -52.9% | opus-effort-medium lower |
| uncached_equivalent | 35 | -5,244.7 | [-61,296.9, 55,586.1] | 124.2% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 35 | -0.0050 | [-0.0299, 0.0218] | 4.6% | **CI crosses 0 — no detectable difference** |
| num_turns | 35 | 1.7 | [0.1, 3.4] | 201.7% | opus-effort-medium higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | -300,630.4 | [-395,461.9, -212,191.8] | -51.6% | opus-effort-medium lower |
| fix | 9 | -275,503.6 | [-364,443.7, -193,736.1] | -64.5% | opus-effort-medium lower |
| impact | 9 | -81,945.7 | [-123,215.9, -47,692.8] | -47.9% | opus-effort-medium lower |
| locate | 9 | -99,252.2 | [-135,027.8, -64,665.7] | -48.2% | opus-effort-medium lower |
| reference | 9 | -154,099.7 | [-227,539.4, -95,934.6] | -48.9% | opus-effort-medium lower |

**Verdict.** `opus-effort-medium` vs `effort-medium` over 45 paired tasks: tokens lower by 182,286 (95% CI [-221,689, -140,861]); cost no detectable difference; turns higher by 1.5 (95% CI [0.3, 2.8]); accuracy 84.4% vs 80.0% (38/45 vs 36/45).

### `opus-effort-low` vs `effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low | 45 | **248,369** (155,721–315,825) | 93,983 | 0.158 | 3.0 | 26 in 26 run(s) | 15 | 0 | 0 | 94 | 0 | 77.8% (35/45) | 264,338 |
| opus-effort-low | 45 | **104,202** (78,168–132,332) | 104,202 | 0.138 | 5.0 | 0 in 0 run(s) | 0 | 0 | 0 | 189 | 0 | 84.4% (38/45) | 121,364 |

Paired difference (`opus-effort-low` − `effort-low`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | -140,959.4 | [-176,636.9, -108,719.2] | -49.8% | opus-effort-low lower |
| uncached_equivalent | 45 | 1,633.9 | [-30,950.0, 33,704.2] | 82.9% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 45 | -0.0189 | [-0.0433, 0.0005] | -0.1% | **CI crosses 0 — no detectable difference** |
| num_turns | 45 | 1.9 | [0.8, 2.8] | 182.5% | opus-effort-low higher |

Iso-accuracy subset (33/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 33 | -146,757.1 | [-192,368.0, -111,244.2] | -50.1% | opus-effort-low lower |
| uncached_equivalent | 33 | 25,496.0 | [-5,764.7, 57,873.4] | 111.9% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 33 | -0.0189 | [-0.0489, 0.0053] | -0.6% | **CI crosses 0 — no detectable difference** |
| num_turns | 33 | 2.6 | [1.6, 3.7] | 226.4% | opus-effort-low higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | -147,790.3 | [-173,316.6, -117,689.3] | -45.7% | opus-effort-low lower |
| fix | 9 | -195,573.1 | [-330,191.9, -72,226.7] | -42.7% | opus-effort-low lower |
| impact | 9 | -112,252.8 | [-178,529.8, -57,224.1] | -56.6% | opus-effort-low lower |
| locate | 9 | -85,308.3 | [-129,240.8, -49,555.9] | -44.6% | opus-effort-low lower |
| reference | 9 | -163,872.6 | [-207,647.7, -120,059.9] | -59.4% | opus-effort-low lower |

**Verdict.** `opus-effort-low` vs `effort-low` over 45 paired tasks: tokens lower by 140,959 (95% CI [-176,637, -108,719]); cost no detectable difference; turns higher by 1.9 (95% CI [0.8, 2.8]); accuracy 84.4% vs 77.8% (38/45 vs 35/45).

### `opus-effort-low` vs `opus-effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-medium | 45 | **119,567** (87,232–155,771) | 119,567 | 0.168 | 5.0 | 0 in 0 run(s) | 2 | 0 | 0 | 212 | 0 | 84.4% (38/45) | 147,596 |
| opus-effort-low | 45 | **104,202** (78,168–132,332) | 104,202 | 0.138 | 5.0 | 0 in 0 run(s) | 0 | 0 | 0 | 189 | 0 | 84.4% (38/45) | 121,364 |

Paired difference (`opus-effort-low` − `opus-effort-medium`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | -22,864.4 | [-39,708.4, -7,767.1] | -10.4% | opus-effort-low lower |
| uncached_equivalent | 45 | -22,864.4 | [-39,143.2, -7,409.4] | -10.4% | opus-effort-low lower |
| total_cost_usd | 45 | -0.0517 | [-0.0718, -0.0332] | -18.7% | opus-effort-low lower |
| num_turns | 45 | -0.6 | [-1.2, -0.0] | -6.1% | opus-effort-low lower |

Iso-accuracy subset (37/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 37 | -25,724.1 | [-45,774.1, -6,635.8] | -10.9% | opus-effort-low lower |
| uncached_equivalent | 37 | -25,724.1 | [-46,457.0, -8,124.9] | -10.9% | opus-effort-low lower |
| total_cost_usd | 37 | -0.0572 | [-0.0814, -0.0347] | -19.1% | opus-effort-low lower |
| num_turns | 37 | -0.7 | [-1.4, 0.0] | -6.5% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | -87,208.4 | [-129,176.6, -45,625.7] | -30.7% | opus-effort-low lower |
| fix | 9 | 25,097.4 | [-316.2, 55,546.4] | 19.5% | **CI crosses 0 — no detectable difference** |
| impact | 9 | -13,553.9 | [-27,930.3, -973.5] | -13.4% | opus-effort-low lower |
| locate | 9 | -4,546.3 | [-14,859.0, 5,984.9] | -2.9% | **CI crosses 0 — no detectable difference** |
| reference | 9 | -34,110.9 | [-46,202.0, -24,577.0] | -24.5% | opus-effort-low lower |

**Verdict.** `opus-effort-low` vs `opus-effort-medium` over 45 paired tasks: tokens lower by 22,864 (95% CI [-39,708, -7,767]); cost lower by 0.0517 (95% CI [-0.0718, -0.0332]); turns lower by 0.6 (95% CI [-1.2, -0.0]); accuracy 84.4% vs 84.4% (38/45 vs 38/45).

### `effort-low` vs `effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-medium | 45 | **271,427** (187,325–398,152) | 124,539 | 0.181 | 4.0 | 26 in 26 run(s) | 38 | 0 | 0 | 97 | 0 | 80.0% (36/45) | 349,581 |
| effort-low | 45 | **248,369** (155,721–315,825) | 93,983 | 0.158 | 3.0 | 26 in 26 run(s) | 15 | 0 | 0 | 94 | 0 | 77.8% (35/45) | 264,338 |

Paired difference (`effort-low` − `effort-medium`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | -64,191.3 | [-113,325.7, -17,789.8] | -6.6% | effort-low lower |
| uncached_equivalent | 45 | -33,661.0 | [-70,280.9, 3,669.4] | -3.0% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 45 | -0.0360 | [-0.0603, -0.0118] | -9.1% | effort-low lower |
| num_turns | 45 | -1.0 | [-2.0, 0.0] | -2.9% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (33/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 33 | -72,975.5 | [-128,304.0, -17,020.7] | -7.9% | effort-low lower |
| uncached_equivalent | 33 | -50,538.5 | [-88,498.2, -17,725.1] | -18.8% | effort-low lower |
| total_cost_usd | 33 | -0.0392 | [-0.0704, -0.0117] | -9.7% | effort-low lower |
| num_turns | 33 | -1.5 | [-2.7, -0.6] | -20.5% | effort-low lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | -240,048.6 | [-332,658.2, -151,051.3] | -39.2% | effort-low lower |
| fix | 9 | -54,833.0 | [-191,813.6, 81,204.9] | -9.0% | **CI crosses 0 — no detectable difference** |
| impact | 9 | 16,753.2 | [-41,407.3, 88,703.7] | 21.6% | **CI crosses 0 — no detectable difference** |
| locate | 9 | -18,490.2 | [-54,368.4, 19,395.2] | -5.1% | **CI crosses 0 — no detectable difference** |
| reference | 9 | -24,338.0 | [-89,055.2, 33,647.6] | -1.5% | **CI crosses 0 — no detectable difference** |

**Verdict.** `effort-low` vs `effort-medium` over 45 paired tasks: tokens lower by 64,191 (95% CI [-113,326, -17,790]); cost lower by 0.0360 (95% CI [-0.0603, -0.0118]); turns no detectable difference; accuracy 77.8% vs 80.0% (35/45 vs 36/45).

### `opus-effort-low` vs `effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-medium | 45 | **271,427** (187,325–398,152) | 124,539 | 0.181 | 4.0 | 26 in 26 run(s) | 38 | 0 | 0 | 97 | 0 | 80.0% (36/45) | 349,581 |
| opus-effort-low | 45 | **104,202** (78,168–132,332) | 104,202 | 0.138 | 5.0 | 0 in 0 run(s) | 0 | 0 | 0 | 189 | 0 | 84.4% (38/45) | 121,364 |

Paired difference (`opus-effort-low` − `effort-medium`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | -205,150.7 | [-249,422.8, -163,961.3] | -58.4% | opus-effort-low lower |
| uncached_equivalent | 45 | -32,027.1 | [-67,058.9, 986.6] | 44.1% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 45 | -0.0549 | [-0.0762, -0.0358] | -14.8% | opus-effort-low lower |
| num_turns | 45 | 0.9 | [-0.0, 1.9] | 114.6% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (35/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 35 | -231,085.1 | [-282,612.5, -179,311.3] | -60.0% | opus-effort-low lower |
| uncached_equivalent | 35 | -32,636.2 | [-80,753.8, 12,001.5] | 60.9% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 35 | -0.0644 | [-0.0893, -0.0411] | -17.2% | opus-effort-low lower |
| num_turns | 35 | 1.0 | [-0.2, 2.2] | 138.5% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | -387,838.9 | [-472,836.9, -308,908.2] | -67.9% | opus-effort-low lower |
| fix | 9 | -250,406.1 | [-325,972.4, -172,473.9] | -57.8% | opus-effort-low lower |
| impact | 9 | -95,499.6 | [-143,980.2, -57,508.5] | -55.4% | opus-effort-low lower |
| locate | 9 | -103,798.6 | [-142,919.9, -65,398.9] | -49.7% | opus-effort-low lower |
| reference | 9 | -188,210.6 | [-258,060.7, -125,588.0] | -61.4% | opus-effort-low lower |

**Verdict.** `opus-effort-low` vs `effort-medium` over 45 paired tasks: tokens lower by 205,151 (95% CI [-249,423, -163,961]); cost lower by 0.0549 (95% CI [-0.0762, -0.0358]); turns no detectable difference; accuracy 84.4% vs 80.0% (38/45 vs 36/45).

### `opus-effort-low` vs `effort-low-nosub`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low-nosub | 45 | **148,873** (112,370–241,099) | 148,873 | 0.107 | 6.0 | 0 in 0 run(s) | 65 | 0 | 0 | 184 | 0 | 84.4% (38/45) | 210,387 |
| opus-effort-low | 45 | **104,202** (78,168–132,332) | 104,202 | 0.138 | 5.0 | 0 in 0 run(s) | 0 | 0 | 0 | 189 | 0 | 84.4% (38/45) | 121,364 |

Paired difference (`opus-effort-low` − `effort-low-nosub`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | -79,889.9 | [-103,572.8, -57,451.8] | -34.8% | opus-effort-low lower |
| uncached_equivalent | 45 | -79,889.9 | [-102,291.4, -58,816.5] | -34.8% | opus-effort-low lower |
| total_cost_usd | 45 | 0.0368 | [0.0276, 0.0472] | 34.3% | opus-effort-low higher |
| num_turns | 45 | -1.5 | [-2.3, -0.8] | -13.1% | opus-effort-low lower |

Iso-accuracy subset (37/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 37 | -89,246.0 | [-118,464.8, -64,560.6] | -36.0% | opus-effort-low lower |
| uncached_equivalent | 37 | -89,246.0 | [-118,331.8, -65,100.8] | -36.0% | opus-effort-low lower |
| total_cost_usd | 37 | 0.0373 | [0.0267, 0.0486] | 31.7% | opus-effort-low higher |
| num_turns | 37 | -1.8 | [-2.7, -0.9] | -14.9% | opus-effort-low lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | -159,620.3 | [-223,095.8, -94,952.9] | -43.0% | opus-effort-low lower |
| fix | 9 | -72,649.3 | [-130,293.9, -24,414.1] | -26.3% | opus-effort-low lower |
| impact | 9 | -57,477.9 | [-78,014.2, -37,615.7] | -45.5% | opus-effort-low lower |
| locate | 9 | -23,240.4 | [-36,411.6, -8,751.8] | -19.4% | opus-effort-low lower |
| reference | 9 | -86,461.4 | [-126,563.5, -48,668.8] | -39.7% | opus-effort-low lower |

**Verdict.** `opus-effort-low` vs `effort-low-nosub` over 45 paired tasks: tokens lower by 79,890 (95% CI [-103,573, -57,452]); cost higher by 0.0368 (95% CI [0.0276, 0.0472]); turns lower by 1.5 (95% CI [-2.3, -0.8]); accuracy 84.4% vs 84.4% (38/45 vs 38/45).

### `opus-effort-medium` vs `effort-low-nosub`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low-nosub | 45 | **148,873** (112,370–241,099) | 148,873 | 0.107 | 6.0 | 0 in 0 run(s) | 65 | 0 | 0 | 184 | 0 | 84.4% (38/45) | 210,387 |
| opus-effort-medium | 45 | **119,567** (87,232–155,771) | 119,567 | 0.168 | 5.0 | 0 in 0 run(s) | 2 | 0 | 0 | 212 | 0 | 84.4% (38/45) | 147,596 |

Paired difference (`opus-effort-medium` − `effort-low-nosub`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | -57,025.5 | [-80,563.8, -33,729.2] | -23.5% | opus-effort-medium lower |
| uncached_equivalent | 45 | -57,025.5 | [-81,534.0, -33,516.7] | -23.5% | opus-effort-medium lower |
| total_cost_usd | 45 | 0.0885 | [0.0653, 0.1134] | 70.1% | opus-effort-medium higher |
| num_turns | 45 | -0.9 | [-1.6, -0.3] | -5.9% | opus-effort-medium lower |

Iso-accuracy subset (38/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 38 | -62,790.6 | [-91,081.6, -34,894.3] | -23.8% | opus-effort-medium lower |
| uncached_equivalent | 38 | -62,790.6 | [-91,355.7, -35,436.4] | -23.8% | opus-effort-medium lower |
| total_cost_usd | 38 | 0.0935 | [0.0675, 0.1234] | 68.7% | opus-effort-medium higher |
| num_turns | 38 | -1.1 | [-1.9, -0.3] | -7.5% | opus-effort-medium lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | -72,411.9 | [-155,353.4, 16,571.2] | -9.7% | **CI crosses 0 — no detectable difference** |
| fix | 9 | -97,746.8 | [-152,435.9, -51,242.4] | -37.3% | opus-effort-medium lower |
| impact | 9 | -43,924.0 | [-62,230.0, -25,269.4] | -35.5% | opus-effort-medium lower |
| locate | 9 | -18,694.1 | [-34,182.4, -1,967.1] | -14.4% | opus-effort-medium lower |
| reference | 9 | -52,350.6 | [-92,454.8, -15,606.4] | -20.4% | opus-effort-medium lower |

**Verdict.** `opus-effort-medium` vs `effort-low-nosub` over 45 paired tasks: tokens lower by 57,025 (95% CI [-80,564, -33,729]); cost higher by 0.0885 (95% CI [0.0653, 0.1134]); turns lower by 0.9 (95% CI [-1.6, -0.3]); accuracy 84.4% vs 84.4% (38/45 vs 38/45).

### `effort-low-nosub` vs `effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low | 45 | **248,369** (155,721–315,825) | 93,983 | 0.158 | 3.0 | 26 in 26 run(s) | 15 | 0 | 0 | 94 | 0 | 77.8% (35/45) | 264,338 |
| effort-low-nosub | 45 | **148,873** (112,370–241,099) | 148,873 | 0.107 | 6.0 | 0 in 0 run(s) | 65 | 0 | 0 | 184 | 0 | 84.4% (38/45) | 210,387 |

Paired difference (`effort-low-nosub` − `effort-low`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | -61,069.5 | [-97,205.2, -27,149.5] | -18.9% | effort-low-nosub lower |
| uncached_equivalent | 45 | 81,523.8 | [38,411.0, 127,165.3] | 217.6% | effort-low-nosub higher |
| total_cost_usd | 45 | -0.0558 | [-0.0771, -0.0381] | -24.7% | effort-low-nosub lower |
| num_turns | 45 | 3.4 | [2.0, 4.8] | 295.0% | effort-low-nosub higher |

Iso-accuracy subset (34/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 34 | -58,068.1 | [-98,415.5, -23,180.6] | -19.2% | effort-low-nosub lower |
| uncached_equivalent | 34 | 110,959.4 | [63,179.8, 161,253.6] | 274.9% | effort-low-nosub higher |
| total_cost_usd | 34 | -0.0591 | [-0.0846, -0.0386] | -25.9% | effort-low-nosub lower |
| num_turns | 34 | 4.4 | [2.8, 6.1] | 370.5% | effort-low-nosub higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | 11,830.0 | [-52,226.5, 73,427.9] | 3.2% | **CI crosses 0 — no detectable difference** |
| fix | 9 | -122,923.8 | [-256,370.9, -4,873.6] | -21.2% | effort-low-nosub lower |
| impact | 9 | -54,774.9 | [-120,423.5, -1,861.0] | -18.4% | effort-low-nosub lower |
| locate | 9 | -62,067.9 | [-107,937.3, -22,149.4] | -28.9% | effort-low-nosub lower |
| reference | 9 | -77,411.1 | [-110,893.7, -48,190.9] | -29.3% | effort-low-nosub lower |

**Verdict.** `effort-low-nosub` vs `effort-low` over 45 paired tasks: tokens lower by 61,070 (95% CI [-97,205, -27,149]); cost lower by 0.0558 (95% CI [-0.0771, -0.0381]); turns higher by 3.4 (95% CI [2.0, 4.8]); accuracy 84.4% vs 77.8% (38/45 vs 35/45).

### `opus-effort-high` vs `effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-high | 45 | **273,470** (170,815–530,879) | 135,393 | 0.185 | 4.0 | 23 in 22 run(s) | 57 | 0 | 0 | 108 | 0 | 82.2% (37/45) | 463,430 |
| opus-effort-high | 45 | **131,978** (102,009–175,134) | 131,978 | 0.196 | 6.0 | 0 in 0 run(s) | 0 | 0 | 0 | 237 | 0 | 86.7% (39/45) | 172,766 |

Paired difference (`opus-effort-high` − `effort-high`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | -256,748.2 | [-348,142.1, -178,390.5] | -50.6% | opus-effort-high lower |
| uncached_equivalent | 45 | 485.2 | [-32,052.6, 37,718.9] | 34.4% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 45 | -0.0185 | [-0.0560, 0.0163] | 10.7% | **CI crosses 0 — no detectable difference** |
| num_turns | 45 | 1.5 | [0.6, 2.4] | 77.9% | opus-effort-high higher |

Iso-accuracy subset (36/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 36 | -288,738.0 | [-396,262.0, -188,923.1] | -49.9% | opus-effort-high lower |
| uncached_equivalent | 36 | 8,002.5 | [-31,586.3, 52,896.4] | 44.7% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 36 | -0.0256 | [-0.0710, 0.0165] | 8.4% | **CI crosses 0 — no detectable difference** |
| num_turns | 36 | 1.7 | [0.7, 2.8] | 88.5% | opus-effort-high higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | -551,137.2 | [-794,105.0, -321,093.5] | -57.6% | opus-effort-high lower |
| fix | 9 | -312,170.3 | [-514,684.0, -130,315.6] | -52.2% | opus-effort-high lower |
| impact | 9 | -75,159.8 | [-99,942.1, -48,361.4] | -46.1% | opus-effort-high lower |
| locate | 9 | -120,233.4 | [-186,315.5, -58,127.5] | -45.1% | opus-effort-high lower |
| reference | 9 | -225,040.1 | [-357,487.7, -120,864.8] | -52.1% | opus-effort-high lower |

**Verdict.** `opus-effort-high` vs `effort-high` over 45 paired tasks: tokens lower by 256,748 (95% CI [-348,142, -178,390]); cost no detectable difference; turns higher by 1.5 (95% CI [0.6, 2.4]); accuracy 86.7% vs 82.2% (39/45 vs 37/45).

### `opus-effort-xhigh` vs `effort-xhigh`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-xhigh | 45 | **421,143** (279,249–872,961) | 243,832 | 0.302 | 8.0 | 20 in 18 run(s) | 219 | 0 | 0 | 202 | 0 | 82.2% (37/45) | 649,577 |
| opus-effort-xhigh | 45 | **144,863** (106,661–248,963) | 144,863 | 0.235 | 6.0 | 0 in 0 run(s) | 0 | 0 | 0 | 313 | 0 | 84.4% (38/45) | 274,361 |

Paired difference (`opus-effort-xhigh` − `effort-xhigh`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | -356,629.6 | [-532,290.1, -235,125.6] | -50.0% | opus-effort-xhigh lower |
| uncached_equivalent | 45 | -118,236.9 | [-289,842.7, 14,615.7] | 14.4% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 45 | -0.0240 | [-0.0945, 0.0359] | 9.5% | **CI crosses 0 — no detectable difference** |
| num_turns | 45 | -2.4 | [-4.8, 0.0] | 24.2% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (36/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 36 | -372,040.7 | [-575,724.8, -225,961.4] | -46.4% | opus-effort-xhigh lower |
| uncached_equivalent | 36 | -106,165.9 | [-316,551.6, 42,037.2] | 18.4% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 36 | -0.0144 | [-0.1026, 0.0609] | 14.0% | **CI crosses 0 — no detectable difference** |
| num_turns | 36 | -2.2 | [-5.3, 0.5] | 22.4% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | -402,303.4 | [-596,809.7, -188,411.2] | -29.5% | opus-effort-xhigh lower |
| fix | 9 | -643,405.3 | [-1,327,288.9, -204,688.4] | -58.3% | opus-effort-xhigh lower |
| impact | 9 | -298,180.6 | [-462,830.8, -171,989.5] | -67.6% | opus-effort-xhigh lower |
| locate | 9 | -142,431.1 | [-224,834.0, -63,407.1] | -42.5% | opus-effort-xhigh lower |
| reference | 9 | -296,827.7 | [-511,134.2, -119,958.5] | -51.9% | opus-effort-xhigh lower |

**Verdict.** `opus-effort-xhigh` vs `effort-xhigh` over 45 paired tasks: tokens lower by 356,630 (95% CI [-532,290, -235,126]); cost no detectable difference; turns no detectable difference; accuracy 84.4% vs 82.2% (38/45 vs 37/45).

### `opus-effort-high` vs `opus-effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-low | 45 | **104,202** (78,168–132,332) | 104,202 | 0.138 | 5.0 | 0 in 0 run(s) | 0 | 0 | 0 | 189 | 0 | 84.4% (38/45) | 121,364 |
| opus-effort-high | 45 | **131,978** (102,009–175,134) | 131,978 | 0.196 | 6.0 | 0 in 0 run(s) | 0 | 0 | 0 | 237 | 0 | 86.7% (39/45) | 172,766 |

Paired difference (`opus-effort-high` − `opus-effort-low`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | 47,048.0 | [25,744.3, 72,088.1] | 40.1% | opus-effort-high higher |
| uncached_equivalent | 45 | 47,048.0 | [25,300.4, 71,724.3] | 40.1% | opus-effort-high higher |
| total_cost_usd | 45 | 0.0885 | [0.0618, 0.1195] | 46.8% | opus-effort-high higher |
| num_turns | 45 | 1.2 | [0.5, 1.8] | 24.8% | opus-effort-high higher |

Iso-accuracy subset (38/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 38 | 52,475.8 | [28,098.6, 80,777.9] | 41.2% | opus-effort-high higher |
| uncached_equivalent | 38 | 52,475.8 | [27,813.0, 80,533.0] | 41.2% | opus-effort-high higher |
| total_cost_usd | 38 | 0.0963 | [0.0663, 0.1313] | 48.2% | opus-effort-high higher |
| num_turns | 38 | 1.3 | [0.5, 2.0] | 25.6% | opus-effort-high higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | 156,979.8 | [94,131.3, 232,572.7] | 88.4% | opus-effort-high higher |
| fix | 9 | -2,029.2 | [-36,625.2, 31,902.1] | 5.6% | **CI crosses 0 — no detectable difference** |
| impact | 9 | 24,329.7 | [1,168.8, 46,237.6] | 44.6% | opus-effort-high higher |
| locate | 9 | 14,503.9 | [-4,351.7, 36,459.3] | 19.5% | **CI crosses 0 — no detectable difference** |
| reference | 9 | 41,456.1 | [24,758.7, 59,984.9] | 42.4% | opus-effort-high higher |

**Verdict.** `opus-effort-high` vs `opus-effort-low` over 45 paired tasks: tokens higher by 47,048 (95% CI [25,744, 72,088]); cost higher by 0.0885 (95% CI [0.0618, 0.1195]); turns higher by 1.2 (95% CI [0.5, 1.8]); accuracy 86.7% vs 84.4% (39/45 vs 38/45).

### `effort-high` vs `effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low | 45 | **248,369** (155,721–315,825) | 93,983 | 0.158 | 3.0 | 26 in 26 run(s) | 15 | 0 | 0 | 94 | 0 | 77.8% (35/45) | 264,338 |
| effort-high | 45 | **273,470** (170,815–530,879) | 135,393 | 0.185 | 4.0 | 23 in 22 run(s) | 57 | 0 | 0 | 108 | 0 | 82.2% (37/45) | 463,430 |

Paired difference (`effort-high` − `effort-low`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | 162,836.8 | [78,480.3, 254,121.5] | 60.1% | effort-high higher |
| uncached_equivalent | 45 | 48,196.8 | [16,706.1, 80,055.2] | 119.6% | effort-high higher |
| total_cost_usd | 45 | 0.0880 | [0.0453, 0.1344] | 44.0% | effort-high higher |
| num_turns | 45 | 1.6 | [0.6, 2.6] | 149.1% | effort-high higher |

Iso-accuracy subset (33/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 33 | 205,165.7 | [93,768.4, 331,994.4] | 65.4% | effort-high higher |
| uncached_equivalent | 33 | 63,092.8 | [33,279.6, 96,630.0] | 143.7% | effort-high higher |
| total_cost_usd | 33 | 0.1077 | [0.0550, 0.1628] | 46.3% | effort-high higher |
| num_turns | 33 | 2.1 | [1.2, 3.4] | 184.8% | effort-high higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | 560,326.7 | [331,264.2, 832,274.3] | 170.9% | effort-high higher |
| fix | 9 | 114,568.0 | [-81,247.8, 291,542.2] | 46.9% | **CI crosses 0 — no detectable difference** |
| impact | 9 | -12,763.3 | [-56,574.4, 26,015.6] | 4.0% | **CI crosses 0 — no detectable difference** |
| locate | 9 | 49,429.0 | [-40,395.2, 147,837.8] | 46.9% | **CI crosses 0 — no detectable difference** |
| reference | 9 | 102,623.7 | [29,201.1, 203,295.1] | 31.6% | effort-high higher |

**Verdict.** `effort-high` vs `effort-low` over 45 paired tasks: tokens higher by 162,837 (95% CI [78,480, 254,122]); cost higher by 0.0880 (95% CI [0.0453, 0.1344]); turns higher by 1.6 (95% CI [0.6, 2.6]); accuracy 82.2% vs 77.8% (37/45 vs 35/45).

### `sonnet55-effort-low` vs `effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low | 45 | **248,369** (155,721–315,825) | 93,983 | 0.158 | 3.0 | 26 in 26 run(s) | 15 | 0 | 0 | 94 | 0 | 77.8% (35/45) | 264,338 |
| sonnet55-effort-low | 45 | **80,852** (74,483–116,832) | 80,852 | 0.072 | 4.0 | 0 in 0 run(s) | 2 | 0 | 0 | 165 | 0 | 86.7% (39/45) | 107,969 |

Paired difference (`sonnet55-effort-low` − `effort-low`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | -154,005.8 | [-191,925.3, -121,526.4] | -55.5% | sonnet55-effort-low lower |
| uncached_equivalent | 45 | -11,412.5 | [-41,195.4, 20,218.5] | 59.8% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 45 | -0.0997 | [-0.1234, -0.0796] | -50.2% | sonnet55-effort-low lower |
| num_turns | 45 | 1.5 | [0.5, 2.5] | 159.5% | sonnet55-effort-low higher |

Iso-accuracy subset (33/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 33 | -161,346.2 | [-205,501.9, -123,049.8] | -55.6% | sonnet55-effort-low lower |
| uncached_equivalent | 33 | 10,906.9 | [-20,007.7, 42,702.3] | 87.3% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 33 | -0.1064 | [-0.1342, -0.0822] | -50.2% | sonnet55-effort-low lower |
| num_turns | 33 | 2.3 | [1.3, 3.3] | 202.3% | sonnet55-effort-low higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | -171,355.8 | [-194,069.9, -145,793.0] | -53.1% | sonnet55-effort-low lower |
| fix | 9 | -203,667.0 | [-346,618.0, -73,927.9] | -45.2% | sonnet55-effort-low lower |
| impact | 9 | -114,562.7 | [-181,725.6, -60,368.2] | -59.6% | sonnet55-effort-low lower |
| locate | 9 | -96,628.7 | [-137,858.4, -61,798.2] | -51.7% | sonnet55-effort-low lower |
| reference | 9 | -183,815.0 | [-226,264.6, -143,011.7] | -67.9% | sonnet55-effort-low lower |

**Verdict.** `sonnet55-effort-low` vs `effort-low` over 45 paired tasks: tokens lower by 154,006 (95% CI [-191,925, -121,526]); cost lower by 0.0997 (95% CI [-0.1234, -0.0796]); turns higher by 1.5 (95% CI [0.5, 2.5]); accuracy 86.7% vs 77.8% (39/45 vs 35/45).

### `sonnet55-effort-medium` vs `effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-medium | 45 | **271,427** (187,325–398,152) | 124,539 | 0.181 | 4.0 | 26 in 26 run(s) | 38 | 0 | 0 | 97 | 0 | 80.0% (36/45) | 349,581 |
| sonnet55-effort-medium | 45 | **97,000** (74,877–140,953) | 97,000 | 0.075 | 5.0 | 0 in 0 run(s) | 0 | 0 | 0 | 191 | 0 | 88.9% (40/45) | 121,496 |

Paired difference (`sonnet55-effort-medium` − `effort-medium`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | -203,555.6 | [-249,093.2, -161,514.6] | -59.0% | sonnet55-effort-medium lower |
| uncached_equivalent | 45 | -30,432.0 | [-69,131.8, 7,804.2] | 52.0% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 45 | -0.1255 | [-0.1510, -0.1023] | -53.9% | sonnet55-effort-medium lower |
| num_turns | 45 | 1.1 | [0.0, 2.2] | 126.8% | sonnet55-effort-medium higher |

Iso-accuracy subset (35/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 35 | -227,572.7 | [-281,184.1, -177,307.5] | -59.4% | sonnet55-effort-medium lower |
| uncached_equivalent | 35 | -29,123.9 | [-79,333.5, 20,398.8] | 73.2% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 35 | -0.1382 | [-0.1668, -0.1111] | -54.2% | sonnet55-effort-medium lower |
| num_turns | 35 | 1.3 | [-0.1, 2.6] | 155.2% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | -365,613.7 | [-460,683.6, -269,242.2] | -63.0% | sonnet55-effort-medium lower |
| fix | 9 | -264,092.0 | [-358,846.3, -174,331.2] | -61.9% | sonnet55-effort-medium lower |
| impact | 9 | -102,578.6 | [-143,766.1, -64,951.7] | -61.9% | sonnet55-effort-medium lower |
| locate | 9 | -103,291.6 | [-146,345.4, -61,271.6] | -48.8% | sonnet55-effort-medium lower |
| reference | 9 | -182,202.1 | [-261,775.6, -117,612.2] | -59.4% | sonnet55-effort-medium lower |

**Verdict.** `sonnet55-effort-medium` vs `effort-medium` over 45 paired tasks: tokens lower by 203,556 (95% CI [-249,093, -161,515]); cost lower by 0.1255 (95% CI [-0.1510, -0.1023]); turns higher by 1.1 (95% CI [0.0, 2.2]); accuracy 88.9% vs 80.0% (40/45 vs 36/45).

### `sonnet55-effort-high` vs `effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-high | 45 | **273,470** (170,815–530,879) | 135,393 | 0.185 | 4.0 | 23 in 22 run(s) | 57 | 0 | 0 | 108 | 0 | 82.2% (37/45) | 463,430 |
| sonnet55-effort-high | 45 | **124,327** (79,460–164,246) | 124,327 | 0.089 | 6.0 | 0 in 0 run(s) | 10 | 1 | 0 | 224 | 0 | 86.7% (39/45) | 150,851 |

Paired difference (`sonnet55-effort-high` − `effort-high`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | -276,758.2 | [-373,576.5, -193,823.4] | -54.8% | sonnet55-effort-high lower |
| uncached_equivalent | 45 | -19,524.8 | [-53,981.9, 13,835.6] | 19.8% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 45 | -0.1537 | [-0.2003, -0.1111] | -48.8% | sonnet55-effort-high lower |
| num_turns | 45 | 1.4 | [0.4, 2.6] | 87.8% | sonnet55-effort-high higher |

Iso-accuracy subset (36/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 36 | -309,741.8 | [-423,464.7, -211,407.3] | -54.1% | sonnet55-effort-high lower |
| uncached_equivalent | 36 | -13,001.4 | [-50,853.0, 27,962.1] | 28.4% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 36 | -0.1698 | [-0.2250, -0.1182] | -48.4% | sonnet55-effort-high lower |
| num_turns | 36 | 1.8 | [0.5, 3.0] | 100.3% | sonnet55-effort-high higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | -602,481.9 | [-875,843.0, -359,564.2] | -62.4% | sonnet55-effort-high lower |
| fix | 9 | -328,660.7 | [-547,153.2, -148,525.2] | -57.1% | sonnet55-effort-high lower |
| impact | 9 | -99,139.8 | [-136,051.8, -63,239.0] | -57.2% | sonnet55-effort-high lower |
| locate | 9 | -123,139.8 | [-204,522.4, -58,103.4] | -44.3% | sonnet55-effort-high lower |
| reference | 9 | -230,368.9 | [-356,991.7, -118,244.1] | -53.3% | sonnet55-effort-high lower |

**Verdict.** `sonnet55-effort-high` vs `effort-high` over 45 paired tasks: tokens lower by 276,758 (95% CI [-373,577, -193,823]); cost lower by 0.1537 (95% CI [-0.2003, -0.1111]); turns higher by 1.4 (95% CI [0.4, 2.6]); accuracy 86.7% vs 82.2% (39/45 vs 37/45).

### `sonnet55-effort-xhigh` vs `effort-xhigh`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-xhigh | 45 | **421,143** (279,249–872,961) | 243,832 | 0.302 | 8.0 | 20 in 18 run(s) | 219 | 0 | 0 | 202 | 0 | 82.2% (37/45) | 649,577 |
| sonnet55-effort-xhigh | 45 | **134,815** (99,587–174,203) | 134,815 | 0.116 | 7.0 | 0 in 0 run(s) | 97 | 1 | 0 | 263 | 0 | 84.4% (38/45) | 211,021 |

Paired difference (`sonnet55-effort-xhigh` − `effort-xhigh`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | -411,913.9 | [-583,179.2, -276,610.6] | -57.0% | sonnet55-effort-xhigh lower |
| uncached_equivalent | 45 | -173,521.2 | [-348,962.6, -47,889.2] | -1.8% | sonnet55-effort-xhigh lower |
| total_cost_usd | 45 | -0.1946 | [-0.2631, -0.1380] | -45.3% | sonnet55-effort-xhigh lower |
| num_turns | 45 | -1.2 | [-4.4, 1.8] | 53.3% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (36/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 36 | -439,382.8 | [-637,942.8, -278,795.5] | -55.0% | sonnet55-effort-xhigh lower |
| uncached_equivalent | 36 | -173,508.1 | [-381,010.9, -28,337.0] | -2.0% | sonnet55-effort-xhigh lower |
| total_cost_usd | 36 | -0.2015 | [-0.2892, -0.1317] | -42.8% | sonnet55-effort-xhigh lower |
| num_turns | 36 | -1.0 | [-4.9, 2.7] | 40.3% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | -607,691.9 | [-826,455.1, -356,902.0] | -48.6% | sonnet55-effort-xhigh lower |
| fix | 9 | -672,547.8 | [-1,377,758.5, -221,883.0] | -59.5% | sonnet55-effort-xhigh lower |
| impact | 9 | -313,036.0 | [-482,337.6, -175,668.6] | -69.5% | sonnet55-effort-xhigh lower |
| locate | 9 | -149,332.7 | [-224,934.2, -75,685.6] | -47.7% | sonnet55-effort-xhigh lower |
| reference | 9 | -316,961.0 | [-515,500.0, -150,967.1] | -59.5% | sonnet55-effort-xhigh lower |

**Verdict.** `sonnet55-effort-xhigh` vs `effort-xhigh` over 45 paired tasks: tokens lower by 411,914 (95% CI [-583,179, -276,611]); cost lower by 0.1946 (95% CI [-0.2631, -0.1380]); turns no detectable difference; accuracy 84.4% vs 82.2% (38/45 vs 37/45).

### `opus-effort-low` vs `sonnet55-effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-low | 45 | **80,852** (74,483–116,832) | 80,852 | 0.072 | 4.0 | 0 in 0 run(s) | 2 | 0 | 0 | 165 | 0 | 86.7% (39/45) | 107,969 |
| opus-effort-low | 45 | **104,202** (78,168–132,332) | 104,202 | 0.138 | 5.0 | 0 in 0 run(s) | 0 | 0 | 0 | 189 | 0 | 84.4% (38/45) | 121,364 |

Paired difference (`opus-effort-low` − `sonnet55-effort-low`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | 13,046.4 | [3,830.3, 22,297.9] | 16.9% | opus-effort-low higher |
| uncached_equivalent | 45 | 13,046.4 | [4,669.8, 21,693.2] | 16.9% | opus-effort-low higher |
| total_cost_usd | 45 | 0.0807 | [0.0706, 0.0921] | 102.5% | opus-effort-low higher |
| num_turns | 45 | 0.3 | [-0.1, 0.7] | 10.5% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (38/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 38 | 12,059.6 | [1,983.3, 22,081.3] | 13.6% | opus-effort-low higher |
| uncached_equivalent | 38 | 12,059.6 | [2,206.0, 22,009.1] | 13.6% | opus-effort-low higher |
| total_cost_usd | 38 | 0.0835 | [0.0716, 0.0972] | 99.1% | opus-effort-low higher |
| num_turns | 38 | 0.3 | [-0.2, 0.7] | 7.6% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | 23,565.4 | [4,466.2, 44,896.0] | 17.8% | opus-effort-low higher |
| fix | 9 | 8,093.9 | [-23,033.6, 36,771.5] | 10.8% | **CI crosses 0 — no detectable difference** |
| impact | 9 | 2,309.9 | [-11,632.3, 15,674.5] | 12.3% | **CI crosses 0 — no detectable difference** |
| locate | 9 | 11,320.3 | [3,315.8, 23,650.4] | 16.2% | opus-effort-low higher |
| reference | 9 | 19,942.4 | [8,419.8, 30,523.9] | 27.6% | opus-effort-low higher |

**Verdict.** `opus-effort-low` vs `sonnet55-effort-low` over 45 paired tasks: tokens higher by 13,046 (95% CI [3,830, 22,298]); cost higher by 0.0807 (95% CI [0.0706, 0.0921]); turns no detectable difference; accuracy 84.4% vs 86.7% (38/45 vs 39/45).

### `opus-effort-medium` vs `sonnet55-effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-medium | 45 | **97,000** (74,877–140,953) | 97,000 | 0.075 | 5.0 | 0 in 0 run(s) | 0 | 0 | 0 | 191 | 0 | 88.9% (40/45) | 121,496 |
| opus-effort-medium | 45 | **119,567** (87,232–155,771) | 119,567 | 0.168 | 5.0 | 0 in 0 run(s) | 2 | 0 | 0 | 212 | 0 | 84.4% (38/45) | 147,596 |

Paired difference (`opus-effort-medium` − `sonnet55-effort-medium`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | 21,269.3 | [7,441.7, 34,744.0] | 22.7% | opus-effort-medium higher |
| uncached_equivalent | 45 | 21,269.3 | [8,620.8, 34,875.1] | 22.7% | opus-effort-medium higher |
| total_cost_usd | 45 | 0.1222 | [0.1001, 0.1475] | 134.2% | opus-effort-medium higher |
| num_turns | 45 | 0.4 | [-0.2, 1.0] | 10.7% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (37/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 37 | 22,592.5 | [6,983.7, 38,053.6] | 20.7% | opus-effort-medium higher |
| uncached_equivalent | 37 | 22,592.5 | [7,394.0, 37,783.9] | 20.7% | opus-effort-medium higher |
| total_cost_usd | 37 | 0.1299 | [0.1042, 0.1594] | 131.1% | opus-effort-medium higher |
| num_turns | 37 | 0.4 | [-0.2, 1.0] | 9.0% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | 64,983.2 | [27,018.6, 107,426.1] | 34.8% | opus-effort-medium higher |
| fix | 9 | -11,411.6 | [-42,244.1, 11,552.4] | -2.1% | **CI crosses 0 — no detectable difference** |
| impact | 9 | 20,632.9 | [9,780.2, 33,218.7] | 39.0% | opus-effort-medium higher |
| locate | 9 | 4,039.3 | [-8,052.6, 16,339.7] | 7.2% | **CI crosses 0 — no detectable difference** |
| reference | 9 | 28,102.4 | [10,716.9, 47,282.5] | 34.3% | opus-effort-medium higher |

**Verdict.** `opus-effort-medium` vs `sonnet55-effort-medium` over 45 paired tasks: tokens higher by 21,269 (95% CI [7,442, 34,744]); cost higher by 0.1222 (95% CI [0.1001, 0.1475]); turns no detectable difference; accuracy 84.4% vs 88.9% (38/45 vs 40/45).

### `opus-effort-high` vs `sonnet55-effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-high | 45 | **124,327** (79,460–164,246) | 124,327 | 0.089 | 6.0 | 0 in 0 run(s) | 10 | 1 | 0 | 224 | 0 | 86.7% (39/45) | 150,851 |
| opus-effort-high | 45 | **131,978** (102,009–175,134) | 131,978 | 0.196 | 6.0 | 0 in 0 run(s) | 0 | 0 | 0 | 237 | 0 | 86.7% (39/45) | 172,766 |

Paired difference (`opus-effort-high` − `sonnet55-effort-high`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | 20,010.0 | [-1,186.0, 43,548.6] | 19.4% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 45 | 20,010.0 | [-1,454.6, 43,369.2] | 19.4% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 45 | 0.1352 | [0.1113, 0.1636] | 121.6% | opus-effort-high higher |
| num_turns | 45 | 0.0 | [-0.5, 0.5] | 4.4% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (38/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 38 | 21,930.4 | [-3,038.9, 48,816.4] | 20.1% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 38 | 21,930.4 | [-3,513.2, 49,754.3] | 20.1% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 38 | 0.1418 | [0.1134, 0.1735] | 117.6% | opus-effort-high higher |
| num_turns | 38 | 0.1 | [-0.5, 0.7] | 5.3% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | 51,344.7 | [-49,233.0, 152,521.8] | 28.6% | **CI crosses 0 — no detectable difference** |
| fix | 9 | 16,490.3 | [478.4, 35,697.0] | 14.2% | opus-effort-high higher |
| impact | 9 | 23,980.0 | [3,840.6, 46,359.8] | 40.5% | opus-effort-high higher |
| locate | 9 | 2,906.3 | [-16,664.7, 24,033.7] | 5.2% | **CI crosses 0 — no detectable difference** |
| reference | 9 | 5,328.8 | [-11,676.2, 24,000.6] | 8.7% | **CI crosses 0 — no detectable difference** |

**Verdict.** `opus-effort-high` vs `sonnet55-effort-high` over 45 paired tasks: tokens no detectable difference; cost higher by 0.1352 (95% CI [0.1113, 0.1636]); turns no detectable difference; accuracy 86.7% vs 86.7% (39/45 vs 39/45).

### `opus-effort-xhigh` vs `sonnet55-effort-xhigh`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-xhigh | 45 | **134,815** (99,587–174,203) | 134,815 | 0.116 | 7.0 | 0 in 0 run(s) | 97 | 1 | 0 | 263 | 0 | 84.4% (38/45) | 211,021 |
| opus-effort-xhigh | 45 | **144,863** (106,661–248,963) | 144,863 | 0.235 | 6.0 | 0 in 0 run(s) | 0 | 0 | 0 | 313 | 0 | 84.4% (38/45) | 274,361 |

Paired difference (`opus-effort-xhigh` − `sonnet55-effort-xhigh`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | 55,284.2 | [27,307.6, 90,284.1] | 20.3% | opus-effort-xhigh higher |
| uncached_equivalent | 45 | 55,284.2 | [29,051.8, 88,344.0] | 20.3% | opus-effort-xhigh higher |
| total_cost_usd | 45 | 0.1706 | [0.1332, 0.2131] | 106.2% | opus-effort-xhigh higher |
| num_turns | 45 | -1.1 | [-3.0, 0.2] | -3.7% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (38/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 38 | 63,339.4 | [32,339.0, 103,889.8] | 21.5% | opus-effort-xhigh higher |
| uncached_equivalent | 38 | 63,339.4 | [31,191.0, 105,743.1] | 21.5% | opus-effort-xhigh higher |
| total_cost_usd | 38 | 0.1822 | [0.1409, 0.2341] | 104.2% | opus-effort-xhigh higher |
| num_turns | 38 | -1.2 | [-3.3, 0.4] | -3.4% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | 205,388.4 | [113,881.1, 312,039.8] | 40.3% | opus-effort-xhigh higher |
| fix | 9 | 29,142.4 | [-7,158.2, 72,766.4] | 19.3% | **CI crosses 0 — no detectable difference** |
| impact | 9 | 14,855.4 | [1,546.7, 30,930.0] | 17.2% | opus-effort-xhigh higher |
| locate | 9 | 6,901.6 | [1,320.2, 13,574.2] | 8.5% | opus-effort-xhigh higher |
| reference | 9 | 20,133.3 | [3,380.8, 36,044.9] | 16.4% | opus-effort-xhigh higher |

**Verdict.** `opus-effort-xhigh` vs `sonnet55-effort-xhigh` over 45 paired tasks: tokens higher by 55,284 (95% CI [27,308, 90,284]); cost higher by 0.1706 (95% CI [0.1332, 0.2131]); turns no detectable difference; accuracy 84.4% vs 84.4% (38/45 vs 38/45).

## 8. Features never exercised

graphify exposes more than `query`. The table counts, per arm, how many times each subcommand was invoked across all runs (and, in parentheses, how many runs used it at least once). A zero column is the point: it means the benchmark never put that feature under measurement, so nothing here — positive or negative — can be read as evidence about it.

| condition | runs | `query` | `explain` | `path` | `god-nodes` | `affected` | `save-result` | `reflect` | `update` | `benchmark` |
|---|---|---|---|---|---|---|---|---|---|---|
| `effort-high` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `effort-low` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `effort-low-nosub` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `effort-medium` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `effort-xhigh` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `opus-effort-high` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `opus-effort-low` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `opus-effort-medium` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `opus-effort-xhigh` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `sonnet55-effort-high` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `sonnet55-effort-low` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `sonnet55-effort-medium` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `sonnet55-effort-xhigh` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |

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
| `effort-high` | 45 | 53,440 (29,073–99,628) | 25,812 (12,917–38,966) | 56,931 (26,385–126,857) | 2,430 (2,109–3,251) | 24 (15–36) |
| `effort-low` | 45 | 34,447 (17,275–60,488) | 13,968 (6,896–18,176) | 33,765 (13,708–77,154) | 2,533 (1,440–4,027) | 26 (8–34) |
| `effort-low-nosub` | 45 | 20,555 (16,655–34,452) | 15,783 (10,182–32,062) | 15,446 (9,890–31,746) | 1,893 (1,499–2,439) | 29 (27–40) |
| `effort-medium` | 45 | 44,652 (26,240–72,750) | 21,696 (7,515–36,453) | 42,676 (24,190–80,432) | 2,005 (1,302–2,589) | 27 (8–31) |
| `effort-xhigh` | 45 | 78,398 (44,433–136,502) | 41,799 (19,955–72,291) | 80,809 (41,467–152,616) | 2,516 (1,894–3,223) | 25 (12–37) |
| `opus-effort-high` | 45 | 21,226 (18,045–32,415) | 18,496 (15,554–25,971) | 18,141 (15,247–25,243) | 2,496 (2,297–2,740) | 34 (27–36) |
| `opus-effort-low` | 45 | 18,670 (14,521–27,411) | 13,345 (11,584–17,895) | 13,055 (10,998–17,389) | 2,365 (2,194–2,540) | 34 (29–42) |
| `opus-effort-medium` | 45 | 20,933 (18,143–33,144) | 17,793 (13,582–22,849) | 16,823 (13,234–21,395) | 2,530 (2,304–2,662) | 32 (28–38) |
| `opus-effort-xhigh` | 45 | 26,462 (20,185–43,718) | 24,795 (18,317–38,949) | 24,402 (18,012–38,590) | 2,694 (1,535–2,882) | 32 (28–36) |
| `sonnet55-effort-high` | 45 | 40,129 (21,967–66,757) | 12,030 (9,438–16,152) | 11,704 (9,148–15,880) | 1,568 (1,469–1,814) | 27 (26–28) |
| `sonnet55-effort-low` | 45 | 38,141 (26,688–48,558) | 8,491 (6,224–15,146) | 8,260 (5,995–14,833) | 1,479 (1,385–1,757) | 27 (26–28) |
| `sonnet55-effort-medium` | 45 | 40,186 (29,415–55,629) | 9,148 (7,052–16,264) | 8,839 (6,750–15,931) | 1,584 (1,427–1,812) | 28 (26–29) |
| `sonnet55-effort-xhigh` | 45 | 47,634 (37,429–71,854) | 16,890 (12,821–30,481) | 16,573 (11,815–30,138) | 1,644 (1,412–1,955) | 27 (26–29) |

`claude.wall_ms` is the whole `claude -p` process as the harness timed it. Prefer it over `duration_ms` when an arm delegates: from Claude Code 2.1.28x the `Agent` tool runs in the background and `duration_ms` stops before the subagent's work is folded back in.

`time_to_request_ms` covers everything before the first API request, which is where **MCP server startup lands**: it is the only column in which an arm that must spawn and handshake with a server can differ from one that does not. The transcript itself cannot show that cost — Claude Code connects its configured servers *before* writing the first transcript entry, so the delay between the first entry and the one advertising the server's tools collapses to a few milliseconds of bookkeeping rather than measuring the spawn.

Per-tool-call latency, median (IQR) in ms, pooled over calls:

| condition | `Read` | `Grep` | `Bash` | `Agent` |
|---|---|---|---|---|
| `effort-high` | 8 (5–16) | – | 54 (39–176) | 14 (8–18) |
| `effort-low` | 8 (7–11) | – | 57 (36–193) | 9 (8–11) |
| `effort-low-nosub` | 7 (5–9) | – | 51 (35–181) | – |
| `effort-medium` | 7 (6–12) | – | 55 (33–190) | 13 (8–16) |
| `effort-xhigh` | 8 (5–13) | – | 48 (32–132) | 11 (8–15) |
| `opus-effort-high` | – | – | 53 (41–77) | – |
| `opus-effort-low` | – | – | 52 (38–100) | – |
| `opus-effort-medium` | 123 (66–179) | – | 56 (42–88) | – |
| `opus-effort-xhigh` | – | – | 49 (39–68) | – |
| `sonnet55-effort-high` | 6 (4–6) | 1 (1–1) | 42 (29–62) | – |
| `sonnet55-effort-low` | 6 (5–6) | – | 44 (34–171) | – |
| `sonnet55-effort-medium` | – | – | 42 (30–72) | – |
| `sonnet55-effort-xhigh` | 4 (4–6) | 1 (1–1) | 41 (30–66) | – |

Each cell is timed from the transcript entry carrying the `tool_use` block to the entry carrying its matching `tool_result`, both written locally by the same process. Calls whose result never arrived — a run that hit its turn cap mid-call — are absent rather than counted as zero. `n` per cell is the number of calls, not the number of runs, so an arm that called a tool once contributes one observation.

**Index build cost, for scale.** graphify v1: **4.6 s** total (`update` 3.4 s + `cluster-only` 1.2 s, AST-only, no API calls). graphify v2: a comparable AST pass plus roughly **35 min** of LLM-backed document extraction. MemPalace v1: **49 s**; v2: **97 s** (embedding + indexing, `--no-llm`, no API calls). All are one-off costs paid before any run, and none is included in any figure above — they are listed only so a per-query latency can be read against what producing the index cost in the first place.

## 10. Thinking tokens and model mix

Thinking tokens are billed as output and are a **subset** of `output_tokens`, not an addition to it, so the share is the honest reading of an effort change: an arm that merely wrote less prose would move the absolute count without touching the lever. The figure is main-session only — `usage.output_tokens_details` does not see a subagent — so an arm that delegates reports the *parent's* thinking, and its explorer's thinking appears only as tokens against that explorer's model in the second table.

| condition | runs | thinking tokens | main-session output | thinking share |
|---|---|---|---|---|
| `effort-high` | 45 | 31,429 | 93,362 | 33.7% |
| `effort-low` | 45 | 6,552 | 47,632 | 13.8% |
| `effort-low-nosub` | 45 | 12,338 | 76,364 | 16.2% |
| `effort-medium` | 45 | 24,417 | 80,850 | 30.2% |
| `effort-xhigh` | 45 | 117,688 | 220,344 | 53.4% |
| `opus-effort-high` | 45 | 17,513 | 116,075 | 15.1% |
| `opus-effort-low` | 45 | 3,320 | 63,780 | 5.2% |
| `opus-effort-medium` | 45 | 9,381 | 92,876 | 10.1% |
| `opus-effort-xhigh` | 45 | 51,424 | 177,148 | 29.0% |
| `sonnet55-effort-high` | 45 | 8,167 | 85,439 | 9.6% |
| `sonnet55-effort-low` | 45 | 2,091 | 53,695 | 3.9% |
| `sonnet55-effort-medium` | 45 | 4,045 | 64,786 | 6.2% |
| `sonnet55-effort-xhigh` | 45 | 51,470 | 164,796 | 31.2% |

**Which model spent the tokens.** Summed from `modelUsage` over every run of the arm, on the same definition as `uncached_equivalent_all` (input + cache read + cache creation), so the row totals reconcile with the headline volume rather than describing some adjacent quantity. Note that a ~1k-token Haiku entry appears in **every** arm, including plain `baseline`: that is Claude Code's own background helper call, not delegated exploration. Only an arm whose Haiku row is orders of magnitude larger than that has actually moved work onto Haiku.

That helper's size is a deterministic function of the task prompt, so every Sonnet arm running the same task set reports the **identical** Haiku total. Rows agreeing to the token are therefore the expected result here, not a copy-paste fault — and they are what makes the figure usable as a baseline to read a genuinely delegating arm against.

| condition | `claude-opus-5-5` tokens | `claude-sonnet-5` tokens | `claude-sonnet-5-5` tokens | `claude-opus-5-5` cost | `claude-sonnet-5` cost | `claude-sonnet-5-5` cost |
|---|---|---|---|---|---|---|
| `effort-high` | 0 | 18,827,147 | 0 | $0.00 | $12.14 | $0.00 |
| `effort-low` | 0 | 11,499,491 | 0 | $0.00 | $8.18 | $0.00 |
| `effort-low-nosub` | 0 | 8,751,362 | 0 | $0.00 | $5.67 | $0.00 |
| `effort-medium` | 0 | 14,388,100 | 0 | $0.00 | $9.80 | $0.00 |
| `effort-xhigh` | 0 | 27,255,569 | 0 | $0.00 | $16.60 | $0.00 |
| `opus-effort-high` | 7,273,479 | 0 | 0 | $11.31 | $0.00 | $0.00 |
| `opus-effort-low` | 5,156,317 | 0 | 0 | $7.33 | $0.00 | $0.00 |
| `opus-effort-medium` | 6,185,216 | 0 | 0 | $9.65 | $0.00 | $0.00 |
| `opus-effort-xhigh` | 11,207,236 | 0 | 0 | $15.52 | $0.00 | $0.00 |
| `sonnet55-effort-high` | 0 | 0 | 6,373,028 | $0.00 | $0.00 | $5.23 |
| `sonnet55-effort-low` | 0 | 0 | 4,569,229 | $0.00 | $0.00 | $3.70 |
| `sonnet55-effort-medium` | 0 | 0 | 5,228,099 | $0.00 | $0.00 | $4.15 |
| `sonnet55-effort-xhigh` | 0 | 0 | 8,719,445 | $0.00 | $0.00 | $7.85 |

## 11. Where the remaining tokens go

`uncached_all` is one number; this section splits it in two, because at this end of the range the remaining question is no longer *how much* an arm spends but *on what*. **fixed = `first_turn_cache_creation` × `num_turns`** — the system prompt and tool definitions, re-sent on every single turn — and **moving = `uncached_all` − fixed**, which is the file contents, tool results and reasoning that are actually about the task. Both are per-run medians, so the two columns need not sum to the `uncached_all` median exactly.

Caveats that bound the reading: `first_turn_cache_creation` and `num_turns` are main-session only while `uncached_all` counts subagents too, so on a delegating arm `fixed` is an under-estimate (the arms below spawn none). And cache reads bill at a tenth of fresh input, so this is a split of **information volume, not of dollars** — a 60% fixed share does not mean 60% of the bill.

| condition | runs | uncached_all (med) | turns (med) | first-turn fixed | fixed = ft×turns (med) | moving (med) | fixed share |
|---|---|---|---|---|---|---|---|
| `effort-high` | 45 | 273,470 | 4 | 11,488 | 46,112 | 181,614 | 29.4% |
| `effort-low` | 45 | 248,369 | 3 | 11,490 | 34,419 | 210,109 | 18.4% |
| `effort-low-nosub` | 45 | 148,873 | 6 | 10,640 | 55,920 | 95,728 | 36.7% |
| `effort-medium` | 45 | 271,427 | 4 | 11,488 | 40,712 | 210,194 | 21.8% |
| `effort-xhigh` | 45 | 421,143 | 8 | 11,494 | 91,521 | 316,710 | 27.3% |
| `opus-effort-high` | 45 | 131,978 | 6 | 8,534 | 42,775 | 88,144 | 35.9% |
| `opus-effort-low` | 45 | 104,202 | 5 | 8,533 | 42,570 | 61,939 | 40.8% |
| `opus-effort-medium` | 45 | 119,567 | 5 | 8,532 | 42,675 | 75,896 | 37.9% |
| `opus-effort-xhigh` | 45 | 144,863 | 6 | 8,535 | 51,132 | 93,701 | 33.9% |
| `sonnet55-effort-high` | 45 | 124,327 | 6 | 7,596 | 45,402 | 78,877 | 37.6% |
| `sonnet55-effort-low` | 45 | 80,852 | 4 | 7,597 | 30,424 | 50,444 | 38.3% |
| `sonnet55-effort-medium` | 45 | 97,000 | 5 | 7,593 | 37,965 | 59,092 | 38.3% |
| `sonnet55-effort-xhigh` | 45 | 134,815 | 7 | 7,597 | 45,642 | 88,266 | 36.3% |

## 12. Counter-productive cases and subagent use

- `effort-high`: **23** subagent(s) spawned across **22**/45 run(s). T2S all-model 463,430 vs main-session-only 167,811.
- `effort-low`: **26** subagent(s) spawned across **26**/45 run(s). T2S all-model 264,338 vs main-session-only 95,835.
- `effort-low-nosub`: **0** subagent(s) spawned across **0**/45 run(s). T2S all-model 210,387 vs main-session-only 210,387.
- `effort-medium`: **26** subagent(s) spawned across **26**/45 run(s). T2S all-model 349,581 vs main-session-only 152,779.
- `effort-xhigh`: **20** subagent(s) spawned across **18**/45 run(s). T2S all-model 649,577 vs main-session-only 380,270.
- `opus-effort-high`: **0** subagent(s) spawned across **0**/45 run(s). T2S all-model 172,766 vs main-session-only 172,766.
- `opus-effort-low`: **0** subagent(s) spawned across **0**/45 run(s). T2S all-model 121,364 vs main-session-only 121,364.
- `opus-effort-medium`: **0** subagent(s) spawned across **0**/45 run(s). T2S all-model 147,596 vs main-session-only 147,596.
- `opus-effort-xhigh`: **0** subagent(s) spawned across **0**/45 run(s). T2S all-model 274,361 vs main-session-only 274,361.
- `sonnet55-effort-high`: **0** subagent(s) spawned across **0**/45 run(s). T2S all-model 150,851 vs main-session-only 150,851.
- `sonnet55-effort-low`: **0** subagent(s) spawned across **0**/45 run(s). T2S all-model 107,969 vs main-session-only 107,969.
- `sonnet55-effort-medium`: **0** subagent(s) spawned across **0**/45 run(s). T2S all-model 121,496 vs main-session-only 121,496.
- `sonnet55-effort-xhigh`: **0** subagent(s) spawned across **0**/45 run(s). T2S all-model 211,021 vs main-session-only 211,021.
- Runs that opened `graphify-out/graph.json` directly: **0**
- graphify-condition runs that never invoked the `graphify` CLI (nudge ignored): **45** (`EXP1-issue-create-flow__opus-effort-medium__r1`, `EXP2-comment-mention-notify__opus-effort-medium__r1`, `EXP3-digest-pipeline__opus-effort-medium__r1`, `FIX1-issue-tenant-leak__opus-effort-medium__r1`, `FIX2-project-quota-off-by-one__opus-effort-medium__r1`, `FIX3-board-shows-archived__opus-effort-medium__r1`, `IMP1-planlimits-field__opus-effort-medium__r1`, `IMP2-rename-issue-created__opus-effort-medium__r1`, `IMP3-limited-resource-union__opus-effort-medium__r1`, `LOC1-shortcut-match__opus-effort-medium__r1`, `LOC2-webhook-plan-cap__opus-effort-medium__r1`, `LOC3-digest-window__opus-effort-medium__r1`, `REF1-assertcan-callers__opus-effort-medium__r1`, `REF2-would-exceed-limit-callers__opus-effort-medium__r1`, `REF3-issue-created-subscribers__opus-effort-medium__r1`, `XEXP1-webhook-delivery__opus-effort-medium__r1`, `XEXP2-invitation-lifecycle__opus-effort-medium__r1`, `XEXP3-plan-change__opus-effort-medium__r1`, `XEXP4-signin-to-actor__opus-effort-medium__r1`, `XEXP5-search-index__opus-effort-medium__r1`, `XEXP6-overdue-sweep__opus-effort-medium__r1`, `XFIX1-csv-quote-escape__opus-effort-medium__r1`, `XFIX2-mention-inside-code__opus-effort-medium__r1`, `XFIX3-last-owner-removable__opus-effort-medium__r1`, `XFIX4-advanced-search-inverted__opus-effort-medium__r1`, `XFIX5-self-notification__opus-effort-medium__r1`, `XFIX6-revoked-invite-accepted__opus-effort-medium__r1`, `XIMP1-role-union__opus-effort-medium__r1`, `XIMP2-rename-comment-created__opus-effort-medium__r1`, `XIMP3-issue-status-union__opus-effort-medium__r1`, `XIMP4-feature-flag-key-union__opus-effort-medium__r1`, `XIMP5-plan-id-union__opus-effort-medium__r1`, `XIMP6-limit-check-field__opus-effort-medium__r1`, `XLOC1-retry-throttle__opus-effort-medium__r1`, `XLOC2-invite-link-validity__opus-effort-medium__r1`, `XLOC3-issue-number-allocation__opus-effort-medium__r1`, `XLOC4-session-lifetime__opus-effort-medium__r1`, `XLOC5-delivery-retry-policy__opus-effort-medium__r1`, `XLOC6-menu-entry-visibility__opus-effort-medium__r1`, `XREF1-assertorgscope-callers__opus-effort-medium__r1`, `XREF2-emit-callers__opus-effort-medium__r1`, `XREF3-isenabled-callers__opus-effort-medium__r1`, `XREF4-comment-created-subscribers__opus-effort-medium__r1`, `XREF5-rate-limit-importers__opus-effort-medium__r1`, `XREF6-member-joined-repositories__opus-effort-medium__r1`)

## 13. Failed and ungraded runs

Harness failures (`is_error`, or `terminal_reason` other than `completed`): **0**. The table below also lists runs that completed normally but did not meet their grader's success threshold — those are accuracy results, not execution problems.

| run_id | condition | task | is_error | terminal_reason |
|---|---|---|---|---|
| `IMP2-rename-issue-created__effort-high__r1` | effort-high | IMP2-rename-issue-created | false | completed |
| `IMP2-rename-issue-created__effort-low-nosub__r1` | effort-low-nosub | IMP2-rename-issue-created | false | completed |
| `IMP2-rename-issue-created__effort-low__r1` | effort-low | IMP2-rename-issue-created | false | completed |
| `IMP2-rename-issue-created__effort-medium__r1` | effort-medium | IMP2-rename-issue-created | false | completed |
| `IMP2-rename-issue-created__effort-xhigh__r1` | effort-xhigh | IMP2-rename-issue-created | false | completed |
| `IMP2-rename-issue-created__opus-effort-high__r1` | opus-effort-high | IMP2-rename-issue-created | false | completed |
| `IMP2-rename-issue-created__opus-effort-low__r1` | opus-effort-low | IMP2-rename-issue-created | false | completed |
| `IMP2-rename-issue-created__opus-effort-medium__r1` | opus-effort-medium | IMP2-rename-issue-created | false | completed |
| `IMP2-rename-issue-created__opus-effort-xhigh__r1` | opus-effort-xhigh | IMP2-rename-issue-created | false | completed |
| `IMP2-rename-issue-created__sonnet55-effort-high__r1` | sonnet55-effort-high | IMP2-rename-issue-created | false | completed |
| `IMP2-rename-issue-created__sonnet55-effort-low__r1` | sonnet55-effort-low | IMP2-rename-issue-created | false | completed |
| `IMP2-rename-issue-created__sonnet55-effort-medium__r1` | sonnet55-effort-medium | IMP2-rename-issue-created | false | completed |
| `IMP2-rename-issue-created__sonnet55-effort-xhigh__r1` | sonnet55-effort-xhigh | IMP2-rename-issue-created | false | completed |
| `IMP3-limited-resource-union__effort-high__r1` | effort-high | IMP3-limited-resource-union | false | completed |
| `LOC2-webhook-plan-cap__effort-high__r1` | effort-high | LOC2-webhook-plan-cap | false | completed |
| `LOC2-webhook-plan-cap__effort-low-nosub__r1` | effort-low-nosub | LOC2-webhook-plan-cap | false | completed |
| `LOC2-webhook-plan-cap__effort-low__r1` | effort-low | LOC2-webhook-plan-cap | false | completed |
| `LOC2-webhook-plan-cap__effort-medium__r1` | effort-medium | LOC2-webhook-plan-cap | false | completed |
| `LOC2-webhook-plan-cap__effort-xhigh__r1` | effort-xhigh | LOC2-webhook-plan-cap | false | completed |
| `LOC2-webhook-plan-cap__opus-effort-high__r1` | opus-effort-high | LOC2-webhook-plan-cap | false | completed |
| `LOC2-webhook-plan-cap__opus-effort-low__r1` | opus-effort-low | LOC2-webhook-plan-cap | false | completed |
| `LOC2-webhook-plan-cap__opus-effort-medium__r1` | opus-effort-medium | LOC2-webhook-plan-cap | false | completed |
| `LOC2-webhook-plan-cap__opus-effort-xhigh__r1` | opus-effort-xhigh | LOC2-webhook-plan-cap | false | completed |
| `LOC2-webhook-plan-cap__sonnet55-effort-low__r1` | sonnet55-effort-low | LOC2-webhook-plan-cap | false | completed |
| `LOC2-webhook-plan-cap__sonnet55-effort-xhigh__r1` | sonnet55-effort-xhigh | LOC2-webhook-plan-cap | false | completed |
| `LOC3-digest-window__effort-high__r1` | effort-high | LOC3-digest-window | false | completed |
| `LOC3-digest-window__effort-medium__r1` | effort-medium | LOC3-digest-window | false | completed |
| `LOC3-digest-window__effort-xhigh__r1` | effort-xhigh | LOC3-digest-window | false | completed |
| `LOC3-digest-window__opus-effort-high__r1` | opus-effort-high | LOC3-digest-window | false | completed |
| `LOC3-digest-window__opus-effort-low__r1` | opus-effort-low | LOC3-digest-window | false | completed |
| `LOC3-digest-window__opus-effort-xhigh__r1` | opus-effort-xhigh | LOC3-digest-window | false | completed |
| `LOC3-digest-window__sonnet55-effort-high__r1` | sonnet55-effort-high | LOC3-digest-window | false | completed |
| `LOC3-digest-window__sonnet55-effort-low__r1` | sonnet55-effort-low | LOC3-digest-window | false | completed |
| `LOC3-digest-window__sonnet55-effort-medium__r1` | sonnet55-effort-medium | LOC3-digest-window | false | completed |
| `LOC3-digest-window__sonnet55-effort-xhigh__r1` | sonnet55-effort-xhigh | LOC3-digest-window | false | completed |
| `REF2-would-exceed-limit-callers__effort-low__r1` | effort-low | REF2-would-exceed-limit-callers | false | completed |
| `XFIX3-last-owner-removable__effort-low__r1` | effort-low | XFIX3-last-owner-removable | false | completed |
| `XFIX5-self-notification__effort-low__r1` | effort-low | XFIX5-self-notification | false | completed |
| `XFIX5-self-notification__effort-medium__r1` | effort-medium | XFIX5-self-notification | false | completed |
| `XFIX6-revoked-invite-accepted__effort-medium__r1` | effort-medium | XFIX6-revoked-invite-accepted | false | completed |
| `XFIX6-revoked-invite-accepted__effort-xhigh__r1` | effort-xhigh | XFIX6-revoked-invite-accepted | false | completed |
| `XIMP1-role-union__effort-high__r1` | effort-high | XIMP1-role-union | false | completed |
| `XIMP1-role-union__effort-low-nosub__r1` | effort-low-nosub | XIMP1-role-union | false | completed |
| `XIMP1-role-union__effort-low__r1` | effort-low | XIMP1-role-union | false | completed |
| `XIMP1-role-union__effort-medium__r1` | effort-medium | XIMP1-role-union | false | completed |
| `XIMP1-role-union__effort-xhigh__r1` | effort-xhigh | XIMP1-role-union | false | completed |
| `XIMP1-role-union__opus-effort-medium__r1` | opus-effort-medium | XIMP1-role-union | false | completed |
| `XIMP1-role-union__opus-effort-xhigh__r1` | opus-effort-xhigh | XIMP1-role-union | false | completed |
| `XIMP1-role-union__sonnet55-effort-high__r1` | sonnet55-effort-high | XIMP1-role-union | false | completed |
| `XIMP1-role-union__sonnet55-effort-xhigh__r1` | sonnet55-effort-xhigh | XIMP1-role-union | false | completed |
| `XIMP2-rename-comment-created__effort-high__r1` | effort-high | XIMP2-rename-comment-created | false | completed |
| `XIMP2-rename-comment-created__effort-low-nosub__r1` | effort-low-nosub | XIMP2-rename-comment-created | false | completed |
| `XIMP2-rename-comment-created__effort-low__r1` | effort-low | XIMP2-rename-comment-created | false | completed |
| `XIMP2-rename-comment-created__effort-medium__r1` | effort-medium | XIMP2-rename-comment-created | false | completed |
| `XIMP2-rename-comment-created__effort-xhigh__r1` | effort-xhigh | XIMP2-rename-comment-created | false | completed |
| `XIMP2-rename-comment-created__opus-effort-high__r1` | opus-effort-high | XIMP2-rename-comment-created | false | completed |
| `XIMP2-rename-comment-created__opus-effort-low__r1` | opus-effort-low | XIMP2-rename-comment-created | false | completed |
| `XIMP2-rename-comment-created__opus-effort-medium__r1` | opus-effort-medium | XIMP2-rename-comment-created | false | completed |
| `XIMP2-rename-comment-created__opus-effort-xhigh__r1` | opus-effort-xhigh | XIMP2-rename-comment-created | false | completed |
| `XIMP2-rename-comment-created__sonnet55-effort-high__r1` | sonnet55-effort-high | XIMP2-rename-comment-created | false | completed |
| `XIMP2-rename-comment-created__sonnet55-effort-low__r1` | sonnet55-effort-low | XIMP2-rename-comment-created | false | completed |
| `XIMP2-rename-comment-created__sonnet55-effort-medium__r1` | sonnet55-effort-medium | XIMP2-rename-comment-created | false | completed |
| `XIMP2-rename-comment-created__sonnet55-effort-xhigh__r1` | sonnet55-effort-xhigh | XIMP2-rename-comment-created | false | completed |
| `XIMP5-plan-id-union__effort-high__r1` | effort-high | XIMP5-plan-id-union | false | completed |
| `XIMP5-plan-id-union__effort-low-nosub__r1` | effort-low-nosub | XIMP5-plan-id-union | false | completed |
| `XIMP5-plan-id-union__effort-low__r1` | effort-low | XIMP5-plan-id-union | false | completed |
| `XIMP5-plan-id-union__effort-medium__r1` | effort-medium | XIMP5-plan-id-union | false | completed |
| `XIMP5-plan-id-union__effort-xhigh__r1` | effort-xhigh | XIMP5-plan-id-union | false | completed |
| `XIMP5-plan-id-union__opus-effort-low__r1` | opus-effort-low | XIMP5-plan-id-union | false | completed |
| `XIMP5-plan-id-union__opus-effort-medium__r1` | opus-effort-medium | XIMP5-plan-id-union | false | completed |
| `XIMP6-limit-check-field__effort-high__r1` | effort-high | XIMP6-limit-check-field | false | completed |
| `XIMP6-limit-check-field__effort-low-nosub__r1` | effort-low-nosub | XIMP6-limit-check-field | false | completed |
| `XIMP6-limit-check-field__effort-low__r1` | effort-low | XIMP6-limit-check-field | false | completed |
| `XIMP6-limit-check-field__effort-medium__r1` | effort-medium | XIMP6-limit-check-field | false | completed |
| `XIMP6-limit-check-field__effort-xhigh__r1` | effort-xhigh | XIMP6-limit-check-field | false | completed |
| `XIMP6-limit-check-field__opus-effort-high__r1` | opus-effort-high | XIMP6-limit-check-field | false | completed |
| `XIMP6-limit-check-field__opus-effort-low__r1` | opus-effort-low | XIMP6-limit-check-field | false | completed |
| `XIMP6-limit-check-field__opus-effort-medium__r1` | opus-effort-medium | XIMP6-limit-check-field | false | completed |
| `XIMP6-limit-check-field__opus-effort-xhigh__r1` | opus-effort-xhigh | XIMP6-limit-check-field | false | completed |
| `XIMP6-limit-check-field__sonnet55-effort-high__r1` | sonnet55-effort-high | XIMP6-limit-check-field | false | completed |
| `XIMP6-limit-check-field__sonnet55-effort-low__r1` | sonnet55-effort-low | XIMP6-limit-check-field | false | completed |
| `XIMP6-limit-check-field__sonnet55-effort-medium__r1` | sonnet55-effort-medium | XIMP6-limit-check-field | false | completed |
| `XIMP6-limit-check-field__sonnet55-effort-xhigh__r1` | sonnet55-effort-xhigh | XIMP6-limit-check-field | false | completed |
| `XLOC4-session-lifetime__effort-low-nosub__r1` | effort-low-nosub | XLOC4-session-lifetime | false | completed |
| `XLOC4-session-lifetime__opus-effort-high__r1` | opus-effort-high | XLOC4-session-lifetime | false | completed |
| `XLOC4-session-lifetime__opus-effort-low__r1` | opus-effort-low | XLOC4-session-lifetime | false | completed |
| `XLOC4-session-lifetime__opus-effort-medium__r1` | opus-effort-medium | XLOC4-session-lifetime | false | completed |
| `XLOC4-session-lifetime__opus-effort-xhigh__r1` | opus-effort-xhigh | XLOC4-session-lifetime | false | completed |
| `XLOC4-session-lifetime__sonnet55-effort-high__r1` | sonnet55-effort-high | XLOC4-session-lifetime | false | completed |
| `XLOC4-session-lifetime__sonnet55-effort-low__r1` | sonnet55-effort-low | XLOC4-session-lifetime | false | completed |
| `XLOC4-session-lifetime__sonnet55-effort-medium__r1` | sonnet55-effort-medium | XLOC4-session-lifetime | false | completed |
| `XLOC4-session-lifetime__sonnet55-effort-xhigh__r1` | sonnet55-effort-xhigh | XLOC4-session-lifetime | false | completed |
| `XREF4-comment-created-subscribers__effort-low__r1` | effort-low | XREF4-comment-created-subscribers | false | completed |

## 14. Deliberately-easy controls vs the rest

Some tasks were written as **designed zero-advantage controls**: their answer is reproduced exactly by a single literal `grep`, so a structural index has nothing to add and the expected effect is zero or negative. They are marked `DELIBERATELY EASY` in the task notes and are separated out here so they neither flatter nor drag the headline number. Easy tasks: `IMP2-rename-issue-created`, `LOC1-shortcut-match`, `XIMP2-rename-comment-created`, `XLOC1-retry-throttle`, `XREF5-rate-limit-importers`.

### easy (zero-advantage controls) — 65 runs over 5 tasks

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-high | 5 | **94,324** (92,748–96,364) | 94,324 | 0.080 | 4.0 | 0 in 0 run(s) | 4 | 0 | 0 | 13 | 0 | 60.0% (3/5) | 153,538 |
| effort-low | 5 | **124,237** (93,983–248,369) | 93,983 | 0.081 | 3.0 | 1 in 1 run(s) | 1 | 0 | 0 | 15 | 0 | 60.0% (3/5) | 208,498 |
| effort-low-nosub | 5 | **82,392** (80,421–108,567) | 82,392 | 0.070 | 3.0 | 0 in 0 run(s) | 3 | 0 | 0 | 13 | 0 | 60.0% (3/5) | 141,075 |
| effort-medium | 5 | **124,539** (92,436–271,427) | 92,436 | 0.086 | 3.0 | 1 in 1 run(s) | 6 | 0 | 0 | 13 | 0 | 60.0% (3/5) | 229,770 |
| effort-xhigh | 5 | **96,273** (94,484–163,023) | 96,273 | 0.086 | 4.0 | 0 in 0 run(s) | 5 | 0 | 0 | 15 | 0 | 60.0% (3/5) | 171,636 |
| opus-effort-high | 5 | **78,738** (66,046–101,377) | 78,738 | 0.136 | 4.0 | 0 in 0 run(s) | 0 | 0 | 0 | 14 | 0 | 60.0% (3/5) | 95,623 |
| opus-effort-low | 5 | **77,993** (77,459–78,168) | 77,993 | 0.106 | 4.0 | 0 in 0 run(s) | 0 | 0 | 0 | 14 | 0 | 60.0% (3/5) | 85,795 |
| opus-effort-medium | 5 | **76,868** (61,445–80,266) | 76,868 | 0.121 | 4.0 | 0 in 0 run(s) | 0 | 0 | 0 | 14 | 0 | 60.0% (3/5) | 94,499 |
| opus-effort-xhigh | 5 | **79,462** (64,692–102,789) | 79,462 | 0.150 | 4.0 | 0 in 0 run(s) | 0 | 0 | 0 | 16 | 0 | 60.0% (3/5) | 108,226 |
| sonnet55-effort-high | 5 | **74,574** (74,424–96,729) | 74,574 | 0.057 | 4.0 | 0 in 0 run(s) | 0 | 0 | 0 | 17 | 0 | 60.0% (3/5) | 98,543 |
| sonnet55-effort-low | 5 | **74,069** (36,510–74,506) | 74,069 | 0.052 | 4.0 | 0 in 0 run(s) | 0 | 0 | 0 | 11 | 0 | 60.0% (3/5) | 74,607 |
| sonnet55-effort-medium | 5 | **73,543** (36,491–75,617) | 73,543 | 0.055 | 4.0 | 0 in 0 run(s) | 0 | 0 | 0 | 12 | 0 | 60.0% (3/5) | 82,032 |
| sonnet55-effort-xhigh | 5 | **77,670** (76,430–79,355) | 77,670 | 0.069 | 4.0 | 0 in 0 run(s) | 2 | 0 | 0 | 15 | 0 | 60.0% (3/5) | 87,252 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 0 | – | [–, –] | – | n too small |
| uncached_equivalent | 0 | – | [–, –] | – | n too small |
| total_cost_usd | 0 | – | [–, –] | – | n too small |
| num_turns | 0 | – | [–, –] | – | n too small |

### rest — 520 runs over 40 tasks

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-high | 40 | **321,500** (195,255–569,019) | 141,903 | 0.217 | 4.0 | 23 in 22 run(s) | 53 | 0 | 0 | 95 | 0 | 85.0% (34/40) | 490,774 |
| effort-low | 40 | **251,188** (157,062–324,032) | 82,501 | 0.192 | 2.5 | 25 in 25 run(s) | 14 | 0 | 0 | 79 | 0 | 80.0% (32/40) | 269,573 |
| effort-low-nosub | 40 | **167,447** (130,650–252,597) | 167,447 | 0.109 | 6.0 | 0 in 0 run(s) | 62 | 0 | 0 | 171 | 0 | 87.5% (35/40) | 216,328 |
| effort-medium | 40 | **276,907** (211,014–440,793) | 125,807 | 0.184 | 4.0 | 25 in 25 run(s) | 32 | 0 | 0 | 84 | 0 | 82.5% (33/40) | 360,473 |
| effort-xhigh | 40 | **457,484** (309,918–905,747) | 266,797 | 0.311 | 9.0 | 20 in 18 run(s) | 214 | 0 | 0 | 187 | 0 | 85.0% (34/40) | 691,748 |
| opus-effort-high | 40 | **133,123** (104,874–197,099) | 133,123 | 0.214 | 6.0 | 0 in 0 run(s) | 0 | 0 | 0 | 223 | 0 | 90.0% (36/40) | 179,195 |
| opus-effort-low | 40 | **111,884** (79,484–138,039) | 111,884 | 0.140 | 5.0 | 0 in 0 run(s) | 0 | 0 | 0 | 175 | 0 | 87.5% (35/40) | 124,413 |
| opus-effort-medium | 40 | **123,417** (102,736–164,967) | 123,417 | 0.171 | 6.0 | 0 in 0 run(s) | 2 | 0 | 0 | 198 | 0 | 87.5% (35/40) | 152,147 |
| opus-effort-xhigh | 40 | **162,586** (112,648–263,626) | 162,586 | 0.242 | 6.0 | 0 in 0 run(s) | 0 | 0 | 0 | 297 | 0 | 87.5% (35/40) | 288,601 |
| sonnet55-effort-high | 40 | **132,122** (95,894–167,997) | 132,122 | 0.091 | 6.0 | 0 in 0 run(s) | 10 | 1 | 0 | 207 | 0 | 90.0% (36/40) | 155,210 |
| sonnet55-effort-low | 40 | **96,960** (74,980–120,951) | 96,960 | 0.072 | 5.0 | 0 in 0 run(s) | 2 | 0 | 0 | 154 | 0 | 90.0% (36/40) | 110,749 |
| sonnet55-effort-medium | 40 | **100,518** (76,154–150,749) | 100,518 | 0.076 | 5.0 | 0 in 0 run(s) | 0 | 0 | 0 | 179 | 0 | 92.5% (37/40) | 124,695 |
| sonnet55-effort-xhigh | 40 | **142,480** (108,789–197,308) | 142,480 | 0.117 | 7.5 | 0 in 0 run(s) | 95 | 1 | 0 | 248 | 0 | 87.5% (35/40) | 221,630 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 0 | – | [–, –] | – | n too small |
| uncached_equivalent | 0 | – | [–, –] | – | n too small |
| total_cost_usd | 0 | – | [–, –] | – | n too small |
| num_turns | 0 | – | [–, –] | – | n too small |

## 15. Limitations

- N = 585 runs over 45 tasks; a single corpus and a single model. These results do not generalize to other codebases or models.
- Bootstrap resamples tasks, so the interval reflects task-to-task variation, not within-task run noise.
- Where a CI crosses zero the honest reading is "no difference detected at this N", not "no difference exists".
- The fixed ~21k-token system-prompt/tool-definition overhead is included in both arms and not subtracted (see §2).
- **1 repetition per (task × condition)**: within-task run-to-run variance is unmeasured, so any single per-task difference may be run noise.
- Subagent traffic is counted in `uncached_all`, but a subagent's tool calls never reach the parent transcript, so the tool-call columns stay main-session-only.
- Raw per-run data lives in `results/opus/runs/<run-id>/` and the `summary.csv` beside this report.
