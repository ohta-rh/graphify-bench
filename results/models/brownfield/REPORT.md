# graphify-bench results

Generated 2026-10-08T21:06:32.314Z. 192 runs over 6 tasks, conditions: effort-high, effort-low, effort-medium, effort-xhigh, haiku55-effort-high, haiku55-effort-low, haiku55-effort-medium, haiku55-effort-xhigh, opus-effort-high, opus-effort-low, opus-effort-medium, opus-effort-xhigh, sonnet55-effort-high, sonnet55-effort-low, sonnet55-effort-medium, sonnet55-effort-xhigh.

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
| effort-high | 12 | **6,330,380** (4,782,800–9,367,135) | 6,330,380 | 2.351 | 71.5 | 0 in 0 run(s) | 418 | 0 | 0 | 289 | 0 | 58.3% (7/12) | 6,271,515 |
| effort-low | 12 | **2,841,296** (2,612,605–3,233,614) | 2,755,948 | 1.134 | 40.0 | 6 in 5 run(s) | 155 | 0 | 0 | 220 | 0 | 16.7% (2/12) | 3,281,682 |
| effort-medium | 12 | **4,586,979** (3,635,667–4,968,682) | 4,586,979 | 1.639 | 59.5 | 2 in 1 run(s) | 253 | 0 | 0 | 271 | 0 | 25.0% (3/12) | 3,959,563 |
| effort-xhigh | 12 | **8,231,292** (6,873,901–10,123,469) | 8,231,292 | 2.788 | 83.0 | 0 in 0 run(s) | 450 | 0 | 0 | 359 | 0 | 41.7% (5/12) | 8,252,692 |
| haiku55-effort-high | 12 | **2,834,356** (2,488,240–3,331,245) | 2,834,356 | 0.252 | 44.0 | 0 in 0 run(s) | 43 | 0 | 0 | 271 | 0 | 91.7% (11/12) | 3,200,742 |
| haiku55-effort-low | 12 | **1,135,477** (950,770–1,378,238) | 1,135,477 | 0.035 | 25.5 | 0 in 0 run(s) | 0 | 0 | 0 | 166 | 0 | 75.0% (9/12) | 1,151,269 |
| haiku55-effort-medium | 12 | **2,069,023** (1,708,623–2,688,431) | 2,069,023 | 0.126 | 33.0 | 0 in 0 run(s) | 8 | 0 | 0 | 238 | 0 | 75.0% (9/12) | 2,184,608 |
| haiku55-effort-xhigh | 12 | **5,421,285** (4,535,117–7,838,681) | 5,421,285 | 0.584 | 66.0 | 0 in 0 run(s) | 104 | 0 | 0 | 371 | 0 | 75.0% (9/12) | 6,085,137 |
| opus-effort-high | 12 | **1,598,211** (1,436,231–1,840,200) | 1,598,211 | 1.278 | 26.5 | 0 in 0 run(s) | 0 | 0 | 0 | 309 | 0 | 66.7% (8/12) | 1,615,353 |
| opus-effort-low | 12 | **444,290** (420,913–547,894) | 444,290 | 0.559 | 12.0 | 0 in 0 run(s) | 0 | 0 | 0 | 137 | 0 | 83.3% (10/12) | 460,327 |
| opus-effort-medium | 12 | **1,123,248** (922,780–1,280,174) | 1,123,248 | 0.992 | 21.0 | 0 in 0 run(s) | 0 | 0 | 0 | 235 | 0 | 83.3% (10/12) | 1,141,387 |
| opus-effort-xhigh | 12 | **3,396,540** (2,884,086–3,934,572) | 3,396,540 | 2.497 | 39.0 | 0 in 0 run(s) | 0 | 0 | 0 | 437 | 0 | 75.0% (9/12) | 3,582,543 |
| sonnet55-effort-high | 12 | **892,750** (751,677–1,116,794) | 892,750 | 0.577 | 16.5 | 0 in 0 run(s) | 2 | 0 | 0 | 190 | 0 | 66.7% (8/12) | 896,391 |
| sonnet55-effort-low | 12 | **441,487** (389,582–591,548) | 441,487 | 0.320 | 11.5 | 0 in 0 run(s) | 0 | 0 | 0 | 129 | 0 | 41.7% (5/12) | 438,611 |
| sonnet55-effort-medium | 12 | **530,004** (438,757–615,911) | 530,004 | 0.383 | 11.5 | 0 in 0 run(s) | 0 | 0 | 0 | 133 | 0 | 58.3% (7/12) | 496,825 |
| sonnet55-effort-xhigh | 12 | **2,241,481** (2,060,540–2,822,021) | 2,241,481 | 1.288 | 29.0 | 0 in 0 run(s) | 0 | 0 | 0 | 348 | 0 | 75.0% (9/12) | 2,263,180 |

**`uncached_all` (PRIMARY) = Σ over every entry of `modelUsage` of (inputTokens + cacheReadInputTokens + cacheCreationInputTokens)** — it covers the main session *and* any subagent, so it is commensurable with `total_cost_usd`. `uncached_main` (secondary) is the same sum taken from `usage.*`, which the result JSON populates for the **main session only**; a run that spawned a subagent therefore reports less information volume there than it actually consumed. The `subagents` column lets the two be reconciled. Tool columns are totals across all runs of the condition. T2S (tokens-to-success) = total `uncached_all` of successful runs / number of successful runs.

Fixed overhead, reported separately so readers can subtract it (architecture.md §5):

| condition | first-turn cache_creation (median) |
|---|---|
| effort-high | 13,280 |
| effort-low | 12,271 |
| effort-medium | 11,299 |
| effort-xhigh | 11,304 |
| haiku55-effort-high | 8,191 |
| haiku55-effort-low | 10,893 |
| haiku55-effort-medium | 10,888 |
| haiku55-effort-xhigh | 8,189 |
| opus-effort-high | 8,929 |
| opus-effort-low | 10,323 |
| opus-effort-medium | 10,323 |
| opus-effort-xhigh | 10,311 |
| sonnet55-effort-high | 10,143 |
| sonnet55-effort-low | 8,771 |
| sonnet55-effort-medium | 8,761 |
| sonnet55-effort-xhigh | 7,412 |

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
| `effort-high` | 3/6 · 0.500 | 4/6 · 0.667 |
| `effort-low` | 2/6 · 0.333 | 0/6 · 0.000 |
| `effort-medium` | 2/6 · 0.333 | 1/6 · 0.167 |
| `effort-xhigh` | 3/6 · 0.500 | 2/6 · 0.333 |
| `haiku55-effort-high` | 6/6 · 1.000 | 5/6 · 0.833 |
| `haiku55-effort-low` | 5/6 · 0.833 | 4/6 · 0.667 |
| `haiku55-effort-medium` | 5/6 · 0.833 | 4/6 · 0.667 |
| `haiku55-effort-xhigh` | 5/6 · 0.833 | 4/6 · 0.667 |
| `opus-effort-high` | 4/6 · 0.667 | 4/6 · 0.667 |
| `opus-effort-low` | 6/6 · 1.000 | 4/6 · 0.667 |
| `opus-effort-medium` | 6/6 · 1.000 | 4/6 · 0.667 |
| `opus-effort-xhigh` | 5/6 · 0.833 | 4/6 · 0.667 |
| `sonnet55-effort-high` | 3/6 · 0.500 | 5/6 · 0.833 |
| `sonnet55-effort-low` | 2/6 · 0.333 | 3/6 · 0.500 |
| `sonnet55-effort-medium` | 3/6 · 0.500 | 4/6 · 0.667 |
| `sonnet55-effort-xhigh` | 4/6 · 0.667 | 5/6 · 0.833 |

## 7. Structural comparisons

Each block below is an independent paired comparison between two arms, computed with the same machinery as §3: per-task pairing over the same task set, percentile bootstrap over tasks, an iso-accuracy subset scoped to just those two arms, and a per-category breakdown. Arms that are not part of a block are excluded from it entirely.

### `opus-effort-low` vs `effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low | 12 | **2,841,296** (2,612,605–3,233,614) | 2,755,948 | 1.134 | 40.0 | 6 in 5 run(s) | 155 | 0 | 0 | 220 | 0 | 16.7% (2/12) | 3,281,682 |
| opus-effort-low | 12 | **444,290** (420,913–547,894) | 444,290 | 0.559 | 12.0 | 0 in 0 run(s) | 0 | 0 | 0 | 137 | 0 | 83.3% (10/12) | 460,327 |

Paired difference (`opus-effort-low` − `effort-low`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | -3,009,855.0 | [-4,571,946.1, -2,054,565.1] | -84.6% | opus-effort-low lower |
| uncached_equivalent | 6 | -2,727,464.9 | [-4,145,128.7, -1,785,715.9] | -83.1% | opus-effort-low lower |
| total_cost_usd | 6 | -0.7837 | [-1.2632, -0.4596] | -54.8% | opus-effort-low lower |
| num_turns | 6 | -34.9 | [-46.3, -25.7] | -72.1% | opus-effort-low lower |

Iso-accuracy subset (1/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 1 | -2,923,841.5 | [–, –] | -89.1% | n too small |
| uncached_equivalent | 1 | -2,923,841.5 | [–, –] | -89.1% | n too small |
| total_cost_usd | 1 | -0.7310 | [–, –] | -63.6% | n too small |
| num_turns | 1 | -44.5 | [–, –] | -80.2% | n too small |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | -3,871,055.3 | [-6,720,892.0, -1,968,432.5] | -88.6% | opus-effort-low lower |
| implement | 3 | -2,148,654.7 | [-2,376,726.5, -1,944,561.5] | -80.7% | opus-effort-low lower |

**Verdict.** `opus-effort-low` vs `effort-low` over 6 paired tasks: tokens lower by 3,009,855 (95% CI [-4,571,946, -2,054,565]); cost lower by 0.7837 (95% CI [-1.2632, -0.4596]); turns lower by 34.9 (95% CI [-46.3, -25.7]); accuracy 83.3% vs 16.7% (10/12 vs 2/12).

### `opus-effort-medium` vs `effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-medium | 12 | **4,586,979** (3,635,667–4,968,682) | 4,586,979 | 1.639 | 59.5 | 2 in 1 run(s) | 253 | 0 | 0 | 271 | 0 | 25.0% (3/12) | 3,959,563 |
| opus-effort-medium | 12 | **1,123,248** (922,780–1,280,174) | 1,123,248 | 0.992 | 21.0 | 0 in 0 run(s) | 0 | 0 | 0 | 235 | 0 | 83.3% (10/12) | 1,141,387 |

Paired difference (`opus-effort-medium` − `effort-medium`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | -3,598,604.7 | [-4,863,706.2, -2,626,578.3] | -74.9% | opus-effort-medium lower |
| uncached_equivalent | 6 | -3,541,307.8 | [-4,863,706.2, -2,512,004.5] | -74.3% | opus-effort-medium lower |
| total_cost_usd | 6 | -0.6770 | [-0.9911, -0.3925] | -37.5% | opus-effort-medium lower |
| num_turns | 6 | -39.6 | [-48.6, -31.6] | -64.7% | opus-effort-medium lower |

Iso-accuracy subset (1/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 1 | -2,246,231.0 | [–, –] | -70.9% | n too small |
| uncached_equivalent | 1 | -2,246,231.0 | [–, –] | -70.9% | n too small |
| total_cost_usd | 1 | -0.3342 | [–, –] | -28.6% | n too small |
| num_turns | 1 | -31.5 | [–, –] | -61.2% | n too small |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | -4,102,330.8 | [-6,339,055.5, -2,246,231.0] | -78.0% | opus-effort-medium lower |
| implement | 3 | -3,094,878.5 | [-4,197,133.5, -2,458,872.0] | -71.7% | opus-effort-medium lower |

**Verdict.** `opus-effort-medium` vs `effort-medium` over 6 paired tasks: tokens lower by 3,598,605 (95% CI [-4,863,706, -2,626,578]); cost lower by 0.6770 (95% CI [-0.9911, -0.3925]); turns lower by 39.6 (95% CI [-48.6, -31.6]); accuracy 83.3% vs 25.0% (10/12 vs 3/12).

### `opus-effort-high` vs `effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-high | 12 | **6,330,380** (4,782,800–9,367,135) | 6,330,380 | 2.351 | 71.5 | 0 in 0 run(s) | 418 | 0 | 0 | 289 | 0 | 58.3% (7/12) | 6,271,515 |
| opus-effort-high | 12 | **1,598,211** (1,436,231–1,840,200) | 1,598,211 | 1.278 | 26.5 | 0 in 0 run(s) | 0 | 0 | 0 | 309 | 0 | 66.7% (8/12) | 1,615,353 |

Paired difference (`opus-effort-high` − `effort-high`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | -5,716,893.5 | [-8,564,662.2, -3,345,464.2] | -73.6% | opus-effort-high lower |
| uncached_equivalent | 6 | -5,716,893.5 | [-8,569,397.0, -3,511,719.9] | -73.6% | opus-effort-high lower |
| total_cost_usd | 6 | -1.2183 | [-1.8845, -0.6170] | -42.7% | opus-effort-high lower |
| num_turns | 6 | -49.5 | [-64.2, -36.5] | -63.0% | opus-effort-high lower |

Iso-accuracy subset (2/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 2 | -4,063,438.3 | [-6,217,360.5, -1,909,516.0] | -66.7% | opus-effort-high lower |
| uncached_equivalent | 2 | -4,063,438.3 | [-6,217,360.5, -1,909,516.0] | -66.7% | opus-effort-high lower |
| total_cost_usd | 2 | -0.8048 | [-1.3293, -0.2803] | -34.1% | opus-effort-high lower |
| num_turns | 2 | -45.5 | [-66.0, -25.0] | -60.3% | opus-effort-high lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | -6,727,673.3 | [-11,905,536.0, -1,909,516.0] | -73.1% | opus-effort-high lower |
| implement | 3 | -4,706,113.7 | [-6,217,360.5, -3,236,644.0] | -74.1% | opus-effort-high lower |

**Verdict.** `opus-effort-high` vs `effort-high` over 6 paired tasks: tokens lower by 5,716,894 (95% CI [-8,564,662, -3,345,464]); cost lower by 1.2183 (95% CI [-1.8845, -0.6170]); turns lower by 49.5 (95% CI [-64.2, -36.5]); accuracy 66.7% vs 58.3% (8/12 vs 7/12).

### `opus-effort-xhigh` vs `effort-xhigh`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-xhigh | 12 | **8,231,292** (6,873,901–10,123,469) | 8,231,292 | 2.788 | 83.0 | 0 in 0 run(s) | 450 | 0 | 0 | 359 | 0 | 41.7% (5/12) | 8,252,692 |
| opus-effort-xhigh | 12 | **3,396,540** (2,884,086–3,934,572) | 3,396,540 | 2.497 | 39.0 | 0 in 0 run(s) | 0 | 0 | 0 | 437 | 0 | 75.0% (9/12) | 3,582,543 |

Paired difference (`opus-effort-xhigh` − `effort-xhigh`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | -5,776,240.5 | [-8,399,644.4, -4,021,382.3] | -61.1% | opus-effort-xhigh lower |
| uncached_equivalent | 6 | -5,776,240.5 | [-8,320,537.6, -4,065,886.7] | -61.1% | opus-effort-xhigh lower |
| total_cost_usd | 6 | -0.6945 | [-1.2706, -0.2649] | -19.2% | opus-effort-xhigh lower |
| num_turns | 6 | -47.2 | [-56.2, -41.2] | -54.2% | opus-effort-xhigh lower |

Iso-accuracy subset (2/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 2 | -3,615,178.0 | [-3,748,691.0, -3,481,665.0] | -52.7% | opus-effort-xhigh lower |
| uncached_equivalent | 2 | -3,615,178.0 | [-3,748,691.0, -3,481,665.0] | -52.7% | opus-effort-xhigh lower |
| total_cost_usd | 2 | -0.1234 | [-0.1285, -0.1183] | -5.0% | opus-effort-xhigh lower |
| num_turns | 2 | -42.3 | [-45.0, -39.5] | -52.1% | opus-effort-xhigh lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | -6,991,381.3 | [-11,931,243.5, -3,481,665.0] | -63.2% | opus-effort-xhigh lower |
| implement | 3 | -4,561,099.7 | [-5,115,039.5, -3,748,691.0] | -58.9% | opus-effort-xhigh lower |

**Verdict.** `opus-effort-xhigh` vs `effort-xhigh` over 6 paired tasks: tokens lower by 5,776,241 (95% CI [-8,399,644, -4,021,382]); cost lower by 0.6945 (95% CI [-1.2706, -0.2649]); turns lower by 47.2 (95% CI [-56.2, -41.2]); accuracy 75.0% vs 41.7% (9/12 vs 5/12).

### `opus-effort-low` vs `effort-xhigh`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-xhigh | 12 | **8,231,292** (6,873,901–10,123,469) | 8,231,292 | 2.788 | 83.0 | 0 in 0 run(s) | 450 | 0 | 0 | 359 | 0 | 41.7% (5/12) | 8,252,692 |
| opus-effort-low | 12 | **444,290** (420,913–547,894) | 444,290 | 0.559 | 12.0 | 0 in 0 run(s) | 0 | 0 | 0 | 137 | 0 | 83.3% (10/12) | 460,327 |

Paired difference (`opus-effort-low` − `effort-xhigh`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | -8,649,204.9 | [-11,402,160.0, -6,734,067.8] | -94.5% | opus-effort-low lower |
| uncached_equivalent | 6 | -8,649,204.9 | [-11,358,772.9, -6,824,828.1] | -94.5% | opus-effort-low lower |
| total_cost_usd | 6 | -2.6055 | [-3.3810, -2.0163] | -81.9% | opus-effort-low lower |
| num_turns | 6 | -73.9 | [-83.2, -67.5] | -85.5% | opus-effort-low lower |

Iso-accuracy subset (2/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 2 | -6,432,454.3 | [-6,703,493.0, -6,161,415.5] | -93.8% | opus-effort-low lower |
| uncached_equivalent | 2 | -6,432,454.3 | [-6,703,493.0, -6,161,415.5] | -93.8% | opus-effort-low lower |
| total_cost_usd | 2 | -1.9690 | [-1.9934, -1.9447] | -80.2% | opus-effort-low lower |
| num_turns | 2 | -69.0 | [-73.0, -65.0] | -85.2% | opus-effort-low lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | -10,051,322.2 | [-15,046,273.0, -6,161,415.5] | -95.7% | opus-effort-low lower |
| implement | 3 | -7,247,087.7 | [-8,152,895.5, -6,703,493.0] | -93.4% | opus-effort-low lower |

**Verdict.** `opus-effort-low` vs `effort-xhigh` over 6 paired tasks: tokens lower by 8,649,205 (95% CI [-11,402,160, -6,734,068]); cost lower by 2.6055 (95% CI [-3.3810, -2.0163]); turns lower by 73.9 (95% CI [-83.2, -67.5]); accuracy 83.3% vs 41.7% (10/12 vs 5/12).

### `opus-effort-high` vs `opus-effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-low | 12 | **444,290** (420,913–547,894) | 444,290 | 0.559 | 12.0 | 0 in 0 run(s) | 0 | 0 | 0 | 137 | 0 | 83.3% (10/12) | 460,327 |
| opus-effort-high | 12 | **1,598,211** (1,436,231–1,840,200) | 1,598,211 | 1.278 | 26.5 | 0 in 0 run(s) | 0 | 0 | 0 | 309 | 0 | 66.7% (8/12) | 1,615,353 |

Paired difference (`opus-effort-high` − `opus-effort-low`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 1,207,906.5 | [1,055,033.8, 1,404,462.1] | 265.6% | opus-effort-high higher |
| uncached_equivalent | 6 | 1,207,906.5 | [1,058,566.8, 1,403,151.3] | 265.6% | opus-effort-high higher |
| total_cost_usd | 6 | 0.7983 | [0.6747, 0.9534] | 150.2% | opus-effort-high higher |
| num_turns | 6 | 14.7 | [12.5, 16.9] | 119.6% | opus-effort-high higher |

Iso-accuracy subset (4/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 4 | 1,172,777.4 | [1,099,972.5, 1,216,899.3] | 275.2% | opus-effort-high higher |
| uncached_equivalent | 4 | 1,172,777.4 | [1,099,972.5, 1,216,899.3] | 275.2% | opus-effort-high higher |
| total_cost_usd | 4 | 0.7649 | [0.6998, 0.8099] | 152.8% | opus-effort-high higher |
| num_turns | 4 | 14.3 | [11.8, 16.8] | 121.3% | opus-effort-high higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | 1,360,147.0 | [1,212,129.0, 1,646,642.5] | 324.4% | opus-effort-high higher |
| implement | 3 | 1,055,666.0 | [909,687.0, 1,194,724.0] | 206.8% | opus-effort-high higher |

**Verdict.** `opus-effort-high` vs `opus-effort-low` over 6 paired tasks: tokens higher by 1,207,907 (95% CI [1,055,034, 1,404,462]); cost higher by 0.7983 (95% CI [0.6747, 0.9534]); turns higher by 14.7 (95% CI [12.5, 16.9]); accuracy 66.7% vs 83.3% (8/12 vs 10/12).

### `opus-effort-xhigh` vs `opus-effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-low | 12 | **444,290** (420,913–547,894) | 444,290 | 0.559 | 12.0 | 0 in 0 run(s) | 0 | 0 | 0 | 137 | 0 | 83.3% (10/12) | 460,327 |
| opus-effort-xhigh | 12 | **3,396,540** (2,884,086–3,934,572) | 3,396,540 | 2.497 | 39.0 | 0 in 0 run(s) | 0 | 0 | 0 | 437 | 0 | 75.0% (9/12) | 3,582,543 |

Paired difference (`opus-effort-xhigh` − `opus-effort-low`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 2,872,964.4 | [2,388,183.3, 3,251,095.1] | 633.8% | opus-effort-xhigh higher |
| uncached_equivalent | 6 | 2,872,964.4 | [2,405,837.5, 3,242,475.8] | 633.8% | opus-effort-xhigh higher |
| total_cost_usd | 6 | 1.9110 | [1.6276, 2.1743] | 361.8% | opus-effort-xhigh higher |
| num_turns | 6 | 26.8 | [23.7, 29.8] | 218.0% | opus-effort-xhigh higher |

Iso-accuracy subset (4/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 4 | 3,088,230.5 | [2,817,276.3, 3,372,113.6] | 715.2% | opus-effort-xhigh higher |
| uncached_equivalent | 4 | 3,088,230.5 | [2,817,276.3, 3,359,184.8] | 715.2% | opus-effort-xhigh higher |
| total_cost_usd | 4 | 1.9716 | [1.8311, 2.2080] | 392.6% | opus-effort-xhigh higher |
| num_turns | 4 | 28.4 | [26.1, 31.5] | 238.7% | opus-effort-xhigh higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | 3,059,940.8 | [2,679,750.5, 3,385,042.5] | 744.7% | opus-effort-xhigh higher |
| implement | 3 | 2,685,988.0 | [1,769,835.0, 3,333,327.0] | 523.0% | opus-effort-xhigh higher |

**Verdict.** `opus-effort-xhigh` vs `opus-effort-low` over 6 paired tasks: tokens higher by 2,872,964 (95% CI [2,388,183, 3,251,095]); cost higher by 1.9110 (95% CI [1.6276, 2.1743]); turns higher by 26.8 (95% CI [23.7, 29.8]); accuracy 75.0% vs 83.3% (9/12 vs 10/12).

### `effort-xhigh` vs `effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low | 12 | **2,841,296** (2,612,605–3,233,614) | 2,755,948 | 1.134 | 40.0 | 6 in 5 run(s) | 155 | 0 | 0 | 220 | 0 | 16.7% (2/12) | 3,281,682 |
| effort-xhigh | 12 | **8,231,292** (6,873,901–10,123,469) | 8,231,292 | 2.788 | 83.0 | 0 in 0 run(s) | 450 | 0 | 0 | 359 | 0 | 41.7% (5/12) | 8,252,692 |

Paired difference (`effort-xhigh` − `effort-low`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 5,639,349.9 | [4,252,657.0, 7,042,268.3] | 182.2% | effort-xhigh higher |
| uncached_equivalent | 6 | 5,921,740.0 | [4,435,200.0, 7,365,933.8] | 212.5% | effort-xhigh higher |
| total_cost_usd | 6 | 1.8217 | [1.4276, 2.2622] | 150.8% | effort-xhigh higher |
| num_turns | 6 | 39.0 | [30.3, 45.3] | 91.9% | effort-xhigh higher |

Iso-accuracy subset (1/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 1 | 3,237,574.0 | [–, –] | 98.7% | n too small |
| uncached_equivalent | 1 | 3,237,574.0 | [–, –] | 98.7% | n too small |
| total_cost_usd | 1 | 1.2137 | [–, –] | 105.5% | n too small |
| num_turns | 1 | 20.5 | [–, –] | 36.9% | n too small |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | 6,180,266.8 | [3,237,574.0, 8,325,381.0] | 170.3% | effort-xhigh higher |
| implement | 3 | 5,098,433.0 | [4,326,766.5, 6,208,334.0] | 194.0% | effort-xhigh higher |

**Verdict.** `effort-xhigh` vs `effort-low` over 6 paired tasks: tokens higher by 5,639,350 (95% CI [4,252,657, 7,042,268]); cost higher by 1.8217 (95% CI [1.4276, 2.2622]); turns higher by 39.0 (95% CI [30.3, 45.3]); accuracy 41.7% vs 16.7% (5/12 vs 2/12).

### `sonnet55-effort-low` vs `effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low | 12 | **2,841,296** (2,612,605–3,233,614) | 2,755,948 | 1.134 | 40.0 | 6 in 5 run(s) | 155 | 0 | 0 | 220 | 0 | 16.7% (2/12) | 3,281,682 |
| sonnet55-effort-low | 12 | **441,487** (389,582–591,548) | 441,487 | 0.320 | 11.5 | 0 in 0 run(s) | 0 | 0 | 0 | 129 | 0 | 41.7% (5/12) | 438,611 |

Paired difference (`sonnet55-effort-low` − `effort-low`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | -3,008,432.8 | [-4,483,658.8, -2,114,161.2] | -85.3% | sonnet55-effort-low lower |
| uncached_equivalent | 6 | -2,726,042.7 | [-4,084,566.2, -1,855,691.5] | -84.0% | sonnet55-effort-low lower |
| total_cost_usd | 6 | -1.0092 | [-1.4775, -0.6986] | -74.1% | sonnet55-effort-low lower |
| num_turns | 6 | -35.2 | [-44.9, -27.1] | -73.6% | sonnet55-effort-low lower |

_No task succeeded in every run of both arms, so there is no iso-accuracy subset._

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | -3,835,471.0 | [-6,576,181.0, -2,065,471.5] | -88.7% | sonnet55-effort-low lower |
| implement | 3 | -2,181,394.5 | [-2,356,024.5, -1,952,624.5] | -82.0% | sonnet55-effort-low lower |

**Verdict.** `sonnet55-effort-low` vs `effort-low` over 6 paired tasks: tokens lower by 3,008,433 (95% CI [-4,483,659, -2,114,161]); cost lower by 1.0092 (95% CI [-1.4775, -0.6986]); turns lower by 35.2 (95% CI [-44.9, -27.1]); accuracy 41.7% vs 16.7% (5/12 vs 2/12).

### `sonnet55-effort-medium` vs `effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-medium | 12 | **4,586,979** (3,635,667–4,968,682) | 4,586,979 | 1.639 | 59.5 | 2 in 1 run(s) | 253 | 0 | 0 | 271 | 0 | 25.0% (3/12) | 3,959,563 |
| sonnet55-effort-medium | 12 | **530,004** (438,757–615,911) | 530,004 | 0.383 | 11.5 | 0 in 0 run(s) | 0 | 0 | 0 | 133 | 0 | 58.3% (7/12) | 496,825 |

Paired difference (`sonnet55-effort-medium` − `effort-medium`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | -4,199,238.3 | [-5,502,482.4, -3,190,136.5] | -88.5% | sonnet55-effort-medium lower |
| uncached_equivalent | 6 | -4,141,941.4 | [-5,440,799.3, -3,111,368.4] | -88.2% | sonnet55-effort-medium lower |
| total_cost_usd | 6 | -1.3223 | [-1.6901, -1.0074] | -77.4% | sonnet55-effort-medium lower |
| num_turns | 6 | -48.1 | [-57.0, -40.2] | -79.5% | sonnet55-effort-medium lower |

Iso-accuracy subset (1/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 1 | -2,773,908.0 | [–, –] | -87.6% | n too small |
| uncached_equivalent | 1 | -2,773,908.0 | [–, –] | -87.6% | n too small |
| total_cost_usd | 1 | -0.8999 | [–, –] | -76.9% | n too small |
| num_turns | 1 | -40.5 | [–, –] | -78.6% | n too small |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | -4,710,658.0 | [-7,127,734.0, -2,773,908.0] | -90.7% | sonnet55-effort-medium lower |
| implement | 3 | -3,687,818.5 | [-4,627,452.5, -3,141,621.5] | -86.3% | sonnet55-effort-medium lower |

**Verdict.** `sonnet55-effort-medium` vs `effort-medium` over 6 paired tasks: tokens lower by 4,199,238 (95% CI [-5,502,482, -3,190,137]); cost lower by 1.3223 (95% CI [-1.6901, -1.0074]); turns lower by 48.1 (95% CI [-57.0, -40.2]); accuracy 58.3% vs 25.0% (7/12 vs 3/12).

### `sonnet55-effort-high` vs `effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-high | 12 | **6,330,380** (4,782,800–9,367,135) | 6,330,380 | 2.351 | 71.5 | 0 in 0 run(s) | 418 | 0 | 0 | 289 | 0 | 58.3% (7/12) | 6,271,515 |
| sonnet55-effort-high | 12 | **892,750** (751,677–1,116,794) | 892,750 | 0.577 | 16.5 | 0 in 0 run(s) | 2 | 0 | 0 | 190 | 0 | 66.7% (8/12) | 896,391 |

Paired difference (`sonnet55-effort-high` − `effort-high`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | -6,440,778.4 | [-9,351,561.8, -4,036,036.9] | -85.0% | sonnet55-effort-high lower |
| uncached_equivalent | 6 | -6,440,778.4 | [-9,316,140.8, -4,134,880.3] | -85.0% | sonnet55-effort-high lower |
| total_cost_usd | 6 | -1.9723 | [-2.7747, -1.2861] | -74.5% | sonnet55-effort-high lower |
| num_turns | 6 | -59.4 | [-75.1, -44.8] | -76.3% | sonnet55-effort-high lower |

Iso-accuracy subset (2/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 2 | -4,967,820.3 | [-7,062,708.0, -2,872,932.5] | -85.9% | sonnet55-effort-high lower |
| uncached_equivalent | 2 | -4,967,820.3 | [-7,062,708.0, -2,872,932.5] | -85.9% | sonnet55-effort-high lower |
| total_cost_usd | 2 | -1.6011 | [-2.1427, -1.0595] | -75.6% | sonnet55-effort-high lower |
| num_turns | 2 | -57.0 | [-77.0, -37.0] | -78.0% | sonnet55-effort-high lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | -7,682,415.5 | [-12,898,805.0, -2,872,932.5] | -88.5% | sonnet55-effort-high lower |
| implement | 3 | -5,199,141.3 | [-7,062,708.0, -3,465,992.5] | -81.5% | sonnet55-effort-high lower |

**Verdict.** `sonnet55-effort-high` vs `effort-high` over 6 paired tasks: tokens lower by 6,440,778 (95% CI [-9,351,562, -4,036,037]); cost lower by 1.9723 (95% CI [-2.7747, -1.2861]); turns lower by 59.4 (95% CI [-75.1, -44.8]); accuracy 66.7% vs 58.3% (8/12 vs 7/12).

### `sonnet55-effort-xhigh` vs `effort-xhigh`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-xhigh | 12 | **8,231,292** (6,873,901–10,123,469) | 8,231,292 | 2.788 | 83.0 | 0 in 0 run(s) | 450 | 0 | 0 | 359 | 0 | 41.7% (5/12) | 8,252,692 |
| sonnet55-effort-xhigh | 12 | **2,241,481** (2,060,540–2,822,021) | 2,241,481 | 1.288 | 29.0 | 0 in 0 run(s) | 0 | 0 | 0 | 348 | 0 | 75.0% (9/12) | 2,263,180 |

Paired difference (`sonnet55-effort-xhigh` − `effort-xhigh`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | -6,629,215.0 | [-8,714,606.5, -5,065,924.9] | -71.8% | sonnet55-effort-xhigh lower |
| uncached_equivalent | 6 | -6,629,215.0 | [-9,003,193.5, -5,065,924.9] | -71.8% | sonnet55-effort-xhigh lower |
| total_cost_usd | 6 | -1.8090 | [-2.4062, -1.2976] | -56.0% | sonnet55-effort-xhigh lower |
| num_turns | 6 | -55.2 | [-61.5, -50.4] | -63.9% | sonnet55-effort-xhigh lower |

Iso-accuracy subset (2/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 2 | -4,796,848.8 | [-4,875,923.5, -4,717,774.0] | -70.0% | sonnet55-effort-xhigh lower |
| uncached_equivalent | 2 | -4,796,848.8 | [-4,875,923.5, -4,717,774.0] | -70.0% | sonnet55-effort-xhigh lower |
| total_cost_usd | 2 | -1.2950 | [-1.3052, -1.2847] | -52.8% | sonnet55-effort-xhigh lower |
| num_turns | 2 | -52.3 | [-56.0, -48.5] | -64.5% | sonnet55-effort-xhigh lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | -7,851,767.8 | [-11,917,085.5, -4,717,774.0] | -74.4% | sonnet55-effort-xhigh lower |
| implement | 3 | -5,406,662.2 | [-6,604,048.0, -4,740,015.0] | -69.3% | sonnet55-effort-xhigh lower |

**Verdict.** `sonnet55-effort-xhigh` vs `effort-xhigh` over 6 paired tasks: tokens lower by 6,629,215 (95% CI [-8,714,607, -5,065,925]); cost lower by 1.8090 (95% CI [-2.4062, -1.2976]); turns lower by 55.2 (95% CI [-61.5, -50.4]); accuracy 75.0% vs 41.7% (9/12 vs 5/12).

### `opus-effort-low` vs `sonnet55-effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-low | 12 | **441,487** (389,582–591,548) | 441,487 | 0.320 | 11.5 | 0 in 0 run(s) | 0 | 0 | 0 | 129 | 0 | 41.7% (5/12) | 438,611 |
| opus-effort-low | 12 | **444,290** (420,913–547,894) | 444,290 | 0.559 | 12.0 | 0 in 0 run(s) | 0 | 0 | 0 | 137 | 0 | 83.3% (10/12) | 460,327 |

Paired difference (`opus-effort-low` − `sonnet55-effort-low`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | -1,422.3 | [-70,037.2, 67,192.7] | 4.2% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 6 | -1,422.3 | [-73,572.8, 67,192.7] | 4.2% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 6 | 0.2254 | [0.1954, 0.2533] | 73.9% | opus-effort-low higher |
| num_turns | 6 | 0.3 | [-1.2, 1.8] | 5.2% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (1/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 1 | -20,702.0 | [–, –] | -4.0% | n too small |
| uncached_equivalent | 1 | -20,702.0 | [–, –] | -4.0% | n too small |
| total_cost_usd | 1 | 0.2070 | [–, –] | 58.8% | n too small |
| num_turns | 1 | 0.0 | [–, –] | 0.0% | n too small |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | -35,584.3 | [-144,711.0, 97,039.0] | -0.3% | **CI crosses 0 — no detectable difference** |
| implement | 3 | 32,739.8 | [-20,702.0, 110,858.5] | 8.7% | **CI crosses 0 — no detectable difference** |

**Verdict.** `opus-effort-low` vs `sonnet55-effort-low` over 6 paired tasks: tokens no detectable difference; cost higher by 0.2254 (95% CI [0.1954, 0.2533]); turns no detectable difference; accuracy 83.3% vs 41.7% (10/12 vs 5/12).

### `opus-effort-medium` vs `sonnet55-effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-medium | 12 | **530,004** (438,757–615,911) | 530,004 | 0.383 | 11.5 | 0 in 0 run(s) | 0 | 0 | 0 | 133 | 0 | 58.3% (7/12) | 496,825 |
| opus-effort-medium | 12 | **1,123,248** (922,780–1,280,174) | 1,123,248 | 0.992 | 21.0 | 0 in 0 run(s) | 0 | 0 | 0 | 235 | 0 | 83.3% (10/12) | 1,141,387 |

Paired difference (`opus-effort-medium` − `sonnet55-effort-medium`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 600,633.6 | [505,100.3, 693,669.7] | 120.1% | opus-effort-medium higher |
| uncached_equivalent | 6 | 600,633.6 | [504,843.4, 695,383.8] | 120.1% | opus-effort-medium higher |
| total_cost_usd | 6 | 0.6453 | [0.5752, 0.7430] | 182.2% | opus-effort-medium higher |
| num_turns | 6 | 8.5 | [6.6, 9.8] | 72.4% | opus-effort-medium higher |

Iso-accuracy subset (3/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 3 | 625,392.7 | [527,677.0, 682,749.5] | 121.6% | opus-effort-medium higher |
| uncached_equivalent | 3 | 625,392.7 | [527,677.0, 682,749.5] | 121.6% | opus-effort-medium higher |
| total_cost_usd | 3 | 0.6234 | [0.5658, 0.6537] | 173.6% | opus-effort-medium higher |
| num_turns | 3 | 9.5 | [9.0, 10.0] | 81.6% | opus-effort-medium higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | 608,327.2 | [508,626.0, 788,678.5] | 136.5% | opus-effort-medium higher |
| implement | 3 | 592,940.0 | [430,319.0, 682,749.5] | 103.8% | opus-effort-medium higher |

**Verdict.** `opus-effort-medium` vs `sonnet55-effort-medium` over 6 paired tasks: tokens higher by 600,634 (95% CI [505,100, 693,670]); cost higher by 0.6453 (95% CI [0.5752, 0.7430]); turns higher by 8.5 (95% CI [6.6, 9.8]); accuracy 83.3% vs 58.3% (10/12 vs 7/12).

### `opus-effort-high` vs `sonnet55-effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-high | 12 | **892,750** (751,677–1,116,794) | 892,750 | 0.577 | 16.5 | 0 in 0 run(s) | 2 | 0 | 0 | 190 | 0 | 66.7% (8/12) | 896,391 |
| opus-effort-high | 12 | **1,598,211** (1,436,231–1,840,200) | 1,598,211 | 1.278 | 26.5 | 0 in 0 run(s) | 0 | 0 | 0 | 309 | 0 | 66.7% (8/12) | 1,615,353 |

Paired difference (`opus-effort-high` − `sonnet55-effort-high`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 723,884.9 | [483,419.8, 944,376.6] | 88.5% | opus-effort-high higher |
| uncached_equivalent | 6 | 723,884.9 | [463,854.6, 943,754.3] | 88.5% | opus-effort-high higher |
| total_cost_usd | 6 | 0.7540 | [0.6192, 0.8881] | 134.9% | opus-effort-high higher |
| num_turns | 6 | 9.9 | [6.4, 12.8] | 61.5% | opus-effort-high higher |

Iso-accuracy subset (3/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 3 | 679,370.8 | [229,348.5, 963,416.5] | 91.8% | opus-effort-high higher |
| uncached_equivalent | 3 | 679,370.8 | [229,348.5, 963,416.5] | 91.8% | opus-effort-high higher |
| total_cost_usd | 3 | 0.7180 | [0.5613, 0.8133] | 136.8% | opus-effort-high higher |
| num_turns | 3 | 8.5 | [2.5, 12.0] | 56.7% | opus-effort-high higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | 954,742.2 | [907,541.0, 993,269.0] | 124.7% | opus-effort-high higher |
| implement | 3 | 493,027.7 | [229,348.5, 845,347.5] | 52.3% | opus-effort-high higher |

**Verdict.** `opus-effort-high` vs `sonnet55-effort-high` over 6 paired tasks: tokens higher by 723,885 (95% CI [483,420, 944,377]); cost higher by 0.7540 (95% CI [0.6192, 0.8881]); turns higher by 9.9 (95% CI [6.4, 12.8]); accuracy 66.7% vs 66.7% (8/12 vs 8/12).

### `opus-effort-xhigh` vs `sonnet55-effort-xhigh`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-xhigh | 12 | **2,241,481** (2,060,540–2,822,021) | 2,241,481 | 1.288 | 29.0 | 0 in 0 run(s) | 0 | 0 | 0 | 348 | 0 | 75.0% (9/12) | 2,263,180 |
| opus-effort-xhigh | 12 | **3,396,540** (2,884,086–3,934,572) | 3,396,540 | 2.497 | 39.0 | 0 in 0 run(s) | 0 | 0 | 0 | 437 | 0 | 75.0% (9/12) | 3,582,543 |

Paired difference (`opus-effort-xhigh` − `sonnet55-effort-xhigh`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 852,974.5 | [224,534.9, 1,441,786.3] | 40.8% | opus-effort-xhigh higher |
| uncached_equivalent | 6 | 852,974.5 | [224,534.9, 1,439,415.8] | 40.8% | opus-effort-xhigh higher |
| total_cost_usd | 6 | 1.1145 | [0.8066, 1.3346] | 86.4% | opus-effort-xhigh higher |
| num_turns | 6 | 8.0 | [3.2, 12.2] | 27.5% | opus-effort-xhigh higher |

Iso-accuracy subset (4/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 4 | 1,376,757.4 | [1,181,670.8, 1,647,386.9] | 64.8% | opus-effort-xhigh higher |
| uncached_equivalent | 4 | 1,376,757.4 | [1,181,670.8, 1,647,386.9] | 64.8% | opus-effort-xhigh higher |
| total_cost_usd | 4 | 1.2774 | [1.1716, 1.3831] | 105.9% | opus-effort-xhigh higher |
| num_turns | 4 | 11.6 | [9.8, 13.6] | 40.4% | opus-effort-xhigh higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | 860,386.5 | [-14,158.0, 1,359,208.5] | 41.6% | **CI crosses 0 — no detectable difference** |
| implement | 3 | 845,562.5 | [-375,024.5, 1,784,479.5] | 39.9% | **CI crosses 0 — no detectable difference** |

**Verdict.** `opus-effort-xhigh` vs `sonnet55-effort-xhigh` over 6 paired tasks: tokens higher by 852,975 (95% CI [224,535, 1,441,786]); cost higher by 1.1145 (95% CI [0.8066, 1.3346]); turns higher by 8.0 (95% CI [3.2, 12.2]); accuracy 75.0% vs 75.0% (9/12 vs 9/12).

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
| sonnet55-effort-low | 12 | **441,487** (389,582–591,548) | 441,487 | 0.320 | 11.5 | 0 in 0 run(s) | 0 | 0 | 0 | 129 | 0 | 41.7% (5/12) | 438,611 |
| haiku55-effort-low | 12 | **1,135,477** (950,770–1,378,238) | 1,135,477 | 0.035 | 25.5 | 0 in 0 run(s) | 0 | 0 | 0 | 166 | 0 | 75.0% (9/12) | 1,151,269 |

Paired difference (`haiku55-effort-low` − `sonnet55-effort-low`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 678,390.8 | [541,585.2, 821,100.8] | 148.9% | haiku55-effort-low higher |
| uncached_equivalent | 6 | 678,390.8 | [534,074.2, 821,279.2] | 148.9% | haiku55-effort-low higher |
| total_cost_usd | 6 | -0.2712 | [-0.3044, -0.2312] | -86.5% | haiku55-effort-low lower |
| num_turns | 6 | 13.1 | [8.7, 17.1] | 115.2% | haiku55-effort-low higher |

Iso-accuracy subset (1/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 1 | 657,248.0 | [–, –] | 127.0% | n too small |
| uncached_equivalent | 1 | 657,248.0 | [–, –] | 127.0% | n too small |
| total_cost_usd | 1 | -0.3077 | [–, –] | -87.4% | n too small |
| num_turns | 1 | 4.5 | [–, –] | 34.6% | n too small |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | 614,476.5 | [428,935.0, 911,349.0] | 136.3% | haiku55-effort-low higher |
| implement | 3 | 742,305.0 | [657,248.0, 876,992.0] | 161.4% | haiku55-effort-low higher |

**Verdict.** `haiku55-effort-low` vs `sonnet55-effort-low` over 6 paired tasks: tokens higher by 678,391 (95% CI [541,585, 821,101]); cost lower by 0.2712 (95% CI [-0.3044, -0.2312]); turns higher by 13.1 (95% CI [8.7, 17.1]); accuracy 75.0% vs 41.7% (9/12 vs 5/12).

### `haiku55-effort-medium` vs `sonnet55-effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-medium | 12 | **530,004** (438,757–615,911) | 530,004 | 0.383 | 11.5 | 0 in 0 run(s) | 0 | 0 | 0 | 133 | 0 | 58.3% (7/12) | 496,825 |
| haiku55-effort-medium | 12 | **2,069,023** (1,708,623–2,688,431) | 2,069,023 | 0.126 | 33.0 | 0 in 0 run(s) | 8 | 0 | 0 | 238 | 0 | 75.0% (9/12) | 2,184,608 |

Paired difference (`haiku55-effort-medium` − `sonnet55-effort-medium`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 1,706,398.8 | [1,251,689.6, 2,198,891.2] | 327.6% | haiku55-effort-medium higher |
| uncached_equivalent | 6 | 1,706,398.8 | [1,214,711.1, 2,164,748.1] | 327.6% | haiku55-effort-medium higher |
| total_cost_usd | 6 | -0.2228 | [-0.2767, -0.1789] | -63.3% | haiku55-effort-medium lower |
| num_turns | 6 | 22.7 | [17.9, 27.5] | 188.9% | haiku55-effort-medium higher |

Iso-accuracy subset (3/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 3 | 1,766,027.0 | [1,385,702.0, 2,290,323.5] | 341.4% | haiku55-effort-medium higher |
| uncached_equivalent | 3 | 1,766,027.0 | [1,385,702.0, 2,290,323.5] | 341.4% | haiku55-effort-medium higher |
| total_cost_usd | 3 | -0.2362 | [-0.3382, -0.1638] | -64.8% | haiku55-effort-medium lower |
| num_turns | 3 | 22.7 | [16.5, 30.0] | 193.0% | haiku55-effort-medium higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | 1,645,161.5 | [865,488.0, 2,684,294.5] | 344.3% | haiku55-effort-medium higher |
| implement | 3 | 1,767,636.2 | [1,390,529.5, 2,290,323.5] | 310.9% | haiku55-effort-medium higher |

**Verdict.** `haiku55-effort-medium` vs `sonnet55-effort-medium` over 6 paired tasks: tokens higher by 1,706,399 (95% CI [1,251,690, 2,198,891]); cost lower by 0.2228 (95% CI [-0.2767, -0.1789]); turns higher by 22.7 (95% CI [17.9, 27.5]); accuracy 75.0% vs 58.3% (9/12 vs 7/12).

### `haiku55-effort-high` vs `sonnet55-effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-high | 12 | **892,750** (751,677–1,116,794) | 892,750 | 0.577 | 16.5 | 0 in 0 run(s) | 2 | 0 | 0 | 190 | 0 | 66.7% (8/12) | 896,391 |
| haiku55-effort-high | 12 | **2,834,356** (2,488,240–3,331,245) | 2,834,356 | 0.252 | 44.0 | 0 in 0 run(s) | 43 | 0 | 0 | 271 | 0 | 91.7% (11/12) | 3,200,742 |

Paired difference (`haiku55-effort-high` − `sonnet55-effort-high`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 2,254,765.9 | [1,576,935.2, 3,071,375.2] | 252.3% | haiku55-effort-high higher |
| uncached_equivalent | 6 | 2,254,765.9 | [1,597,858.7, 3,160,012.2] | 252.3% | haiku55-effort-high higher |
| total_cost_usd | 6 | -0.3042 | [-0.3994, -0.2283] | -52.0% | haiku55-effort-high lower |
| num_turns | 6 | 29.3 | [22.8, 37.1] | 175.1% | haiku55-effort-high higher |

Iso-accuracy subset (3/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 3 | 1,863,343.3 | [1,134,207.5, 2,504,478.5] | 233.4% | haiku55-effort-high higher |
| uncached_equivalent | 3 | 1,863,343.3 | [1,134,207.5, 2,504,478.5] | 233.4% | haiku55-effort-high higher |
| total_cost_usd | 3 | -0.3245 | [-0.5147, -0.2293] | -55.8% | haiku55-effort-high lower |
| num_turns | 3 | 24.7 | [20.0, 30.5] | 155.1% | haiku55-effort-high higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | 2,714,208.5 | [1,932,767.0, 4,258,514.5] | 320.3% | haiku55-effort-high higher |
| implement | 3 | 1,795,323.3 | [1,134,207.5, 2,504,478.5] | 184.3% | haiku55-effort-high higher |

**Verdict.** `haiku55-effort-high` vs `sonnet55-effort-high` over 6 paired tasks: tokens higher by 2,254,766 (95% CI [1,576,935, 3,071,375]); cost lower by 0.3042 (95% CI [-0.3994, -0.2283]); turns higher by 29.3 (95% CI [22.8, 37.1]); accuracy 91.7% vs 66.7% (11/12 vs 8/12).

### `haiku55-effort-xhigh` vs `sonnet55-effort-xhigh`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-xhigh | 12 | **2,241,481** (2,060,540–2,822,021) | 2,241,481 | 1.288 | 29.0 | 0 in 0 run(s) | 0 | 0 | 0 | 348 | 0 | 75.0% (9/12) | 2,263,180 |
| haiku55-effort-xhigh | 12 | **5,421,285** (4,535,117–7,838,681) | 5,421,285 | 0.584 | 66.0 | 0 in 0 run(s) | 104 | 0 | 0 | 371 | 0 | 75.0% (9/12) | 6,085,137 |

Paired difference (`haiku55-effort-xhigh` − `sonnet55-effort-xhigh`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 3,984,908.2 | [2,453,954.3, 5,565,763.0] | 154.3% | haiku55-effort-xhigh higher |
| uncached_equivalent | 6 | 3,984,908.2 | [2,581,751.9, 5,717,467.8] | 154.3% | haiku55-effort-xhigh higher |
| total_cost_usd | 6 | -0.7158 | [-0.7752, -0.6569] | -54.5% | haiku55-effort-xhigh lower |
| num_turns | 6 | 31.3 | [24.8, 36.4] | 100.1% | haiku55-effort-xhigh higher |

Iso-accuracy subset (4/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 4 | 3,235,305.5 | [2,035,523.5, 5,035,929.6] | 146.7% | haiku55-effort-xhigh higher |
| uncached_equivalent | 4 | 3,235,305.5 | [2,035,523.5, 5,035,929.6] | 146.7% | haiku55-effort-xhigh higher |
| total_cost_usd | 4 | -0.6781 | [-0.7300, -0.6262] | -56.7% | haiku55-effort-xhigh lower |
| num_turns | 4 | 27.9 | [19.8, 33.3] | 96.6% | haiku55-effort-xhigh higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | 5,076,080.3 | [1,978,111.0, 7,233,202.5] | 186.0% | haiku55-effort-xhigh higher |
| implement | 3 | 2,893,736.0 | [2,092,936.0, 3,735,024.5] | 122.7% | haiku55-effort-xhigh higher |

**Verdict.** `haiku55-effort-xhigh` vs `sonnet55-effort-xhigh` over 6 paired tasks: tokens higher by 3,984,908 (95% CI [2,453,954, 5,565,763]); cost lower by 0.7158 (95% CI [-0.7752, -0.6569]); turns higher by 31.3 (95% CI [24.8, 36.4]); accuracy 75.0% vs 75.0% (9/12 vs 9/12).

### `haiku55-effort-low` vs `opus-effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-low | 12 | **444,290** (420,913–547,894) | 444,290 | 0.559 | 12.0 | 0 in 0 run(s) | 0 | 0 | 0 | 137 | 0 | 83.3% (10/12) | 460,327 |
| haiku55-effort-low | 12 | **1,135,477** (950,770–1,378,238) | 1,135,477 | 0.035 | 25.5 | 0 in 0 run(s) | 0 | 0 | 0 | 166 | 0 | 75.0% (9/12) | 1,151,269 |

Paired difference (`haiku55-effort-low` − `opus-effort-low`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 679,813.0 | [505,847.3, 862,415.0] | 143.6% | haiku55-effort-low higher |
| uncached_equivalent | 6 | 679,813.0 | [515,030.3, 862,415.0] | 143.6% | haiku55-effort-low higher |
| total_cost_usd | 6 | -0.4966 | [-0.5467, -0.4428] | -92.1% | haiku55-effort-low lower |
| num_turns | 6 | 12.8 | [8.9, 16.3] | 103.0% | haiku55-effort-low higher |

Iso-accuracy subset (4/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 4 | 745,212.1 | [592,822.9, 961,532.5] | 154.8% | haiku55-effort-low higher |
| uncached_equivalent | 4 | 745,212.1 | [592,822.9, 961,532.5] | 154.8% | haiku55-effort-low higher |
| total_cost_usd | 4 | -0.5070 | [-0.5667, -0.4196] | -91.5% | haiku55-effort-low lower |
| num_turns | 4 | 12.0 | [7.0, 17.0] | 93.3% | haiku55-effort-low higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | 650,060.8 | [331,896.0, 1,056,060.0] | 148.0% | haiku55-effort-low higher |
| implement | 3 | 709,565.2 | [677,950.0, 766,133.5] | 139.2% | haiku55-effort-low higher |

**Verdict.** `haiku55-effort-low` vs `opus-effort-low` over 6 paired tasks: tokens higher by 679,813 (95% CI [505,847, 862,415]); cost lower by 0.4966 (95% CI [-0.5467, -0.4428]); turns higher by 12.8 (95% CI [8.9, 16.3]); accuracy 75.0% vs 83.3% (9/12 vs 10/12).

### `haiku55-effort-medium` vs `opus-effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-medium | 12 | **1,123,248** (922,780–1,280,174) | 1,123,248 | 0.992 | 21.0 | 0 in 0 run(s) | 0 | 0 | 0 | 235 | 0 | 83.3% (10/12) | 1,141,387 |
| haiku55-effort-medium | 12 | **2,069,023** (1,708,623–2,688,431) | 2,069,023 | 0.126 | 33.0 | 0 in 0 run(s) | 8 | 0 | 0 | 238 | 0 | 75.0% (9/12) | 2,184,608 |

Paired difference (`haiku55-effort-medium` − `opus-effort-medium`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 1,105,765.3 | [721,548.4, 1,503,658.6] | 95.5% | haiku55-effort-medium higher |
| uncached_equivalent | 6 | 1,105,765.3 | [731,611.2, 1,493,466.2] | 95.5% | haiku55-effort-medium higher |
| total_cost_usd | 6 | -0.8680 | [-0.9452, -0.7957] | -86.7% | haiku55-effort-medium lower |
| num_turns | 6 | 14.2 | [10.3, 18.0] | 68.0% | haiku55-effort-medium higher |

Iso-accuracy subset (4/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 4 | 944,691.3 | [502,473.0, 1,432,935.3] | 85.0% | haiku55-effort-medium higher |
| uncached_equivalent | 4 | 944,691.3 | [502,473.0, 1,432,935.3] | 85.0% | haiku55-effort-medium higher |
| total_cost_usd | 4 | -0.8565 | [-0.9475, -0.7910] | -89.0% | haiku55-effort-medium lower |
| num_turns | 4 | 13.0 | [8.0, 18.5] | 64.3% | haiku55-effort-medium higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | 1,036,834.3 | [356,862.0, 1,895,616.0] | 89.6% | haiku55-effort-medium higher |
| implement | 3 | 1,174,696.2 | [939,306.0, 1,624,572.0] | 101.4% | haiku55-effort-medium higher |

**Verdict.** `haiku55-effort-medium` vs `opus-effort-medium` over 6 paired tasks: tokens higher by 1,105,765 (95% CI [721,548, 1,503,659]); cost lower by 0.8680 (95% CI [-0.9452, -0.7957]); turns higher by 14.2 (95% CI [10.3, 18.0]); accuracy 75.0% vs 83.3% (9/12 vs 10/12).

### `haiku55-effort-high` vs `opus-effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-high | 12 | **1,598,211** (1,436,231–1,840,200) | 1,598,211 | 1.278 | 26.5 | 0 in 0 run(s) | 0 | 0 | 0 | 309 | 0 | 66.7% (8/12) | 1,615,353 |
| haiku55-effort-high | 12 | **2,834,356** (2,488,240–3,331,245) | 2,834,356 | 0.252 | 44.0 | 0 in 0 run(s) | 43 | 0 | 0 | 271 | 0 | 91.7% (11/12) | 3,200,742 |

Paired difference (`haiku55-effort-high` − `opus-effort-high`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 1,530,881.0 | [1,017,987.7, 2,251,126.1] | 87.8% | haiku55-effort-high higher |
| uncached_equivalent | 6 | 1,530,881.0 | [1,031,800.9, 2,251,126.1] | 87.8% | haiku55-effort-high higher |
| total_cost_usd | 6 | -1.0582 | [-1.1577, -0.9744] | -79.6% | haiku55-effort-high lower |
| num_turns | 6 | 19.4 | [14.5, 25.6] | 70.5% | haiku55-effort-high higher |

Iso-accuracy subset (4/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 4 | 1,144,285.9 | [934,950.8, 1,491,330.1] | 70.4% | haiku55-effort-high higher |
| uncached_equivalent | 4 | 1,144,285.9 | [934,950.8, 1,491,330.1] | 70.4% | haiku55-effort-high higher |
| total_cost_usd | 4 | -1.0418 | [-1.0670, -1.0173] | -81.5% | haiku55-effort-high lower |
| num_turns | 4 | 17.3 | [13.5, 20.0] | 65.9% | haiku55-effort-high higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | 1,759,466.3 | [987,927.5, 3,265,245.5] | 92.3% | haiku55-effort-high higher |
| implement | 3 | 1,302,295.7 | [904,859.0, 1,659,131.0] | 83.3% | haiku55-effort-high higher |

**Verdict.** `haiku55-effort-high` vs `opus-effort-high` over 6 paired tasks: tokens higher by 1,530,881 (95% CI [1,017,988, 2,251,126]); cost lower by 1.0582 (95% CI [-1.1577, -0.9744]); turns higher by 19.4 (95% CI [14.5, 25.6]); accuracy 91.7% vs 66.7% (11/12 vs 8/12).

### `haiku55-effort-xhigh` vs `opus-effort-xhigh`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-xhigh | 12 | **3,396,540** (2,884,086–3,934,572) | 3,396,540 | 2.497 | 39.0 | 0 in 0 run(s) | 0 | 0 | 0 | 437 | 0 | 75.0% (9/12) | 3,582,543 |
| haiku55-effort-xhigh | 12 | **5,421,285** (4,535,117–7,838,681) | 5,421,285 | 0.584 | 66.0 | 0 in 0 run(s) | 104 | 0 | 0 | 371 | 0 | 75.0% (9/12) | 6,085,137 |

Paired difference (`haiku55-effort-xhigh` − `opus-effort-xhigh`), all 6 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 6 | 3,131,933.7 | [1,432,371.3, 5,208,641.9] | 97.3% | haiku55-effort-xhigh higher |
| uncached_equivalent | 6 | 3,131,933.7 | [1,432,371.3, 5,247,498.0] | 97.3% | haiku55-effort-xhigh higher |
| total_cost_usd | 6 | -1.8303 | [-2.0039, -1.5426] | -74.6% | haiku55-effort-xhigh lower |
| num_turns | 6 | 23.3 | [14.8, 31.7] | 61.0% | haiku55-effort-xhigh higher |

Iso-accuracy subset (4/6 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 4 | 1,858,548.1 | [823,693.5, 3,734,715.1] | 51.0% | haiku55-effort-xhigh higher |
| uncached_equivalent | 4 | 1,858,548.1 | [823,693.5, 3,734,715.1] | 51.0% | haiku55-effort-xhigh higher |
| total_cost_usd | 4 | -1.9555 | [-2.0094, -1.9016] | -78.9% | haiku55-effort-xhigh lower |
| num_turns | 4 | 16.3 | [10.9, 20.0] | 39.7% | haiku55-effort-xhigh higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 3 | 4,215,693.8 | [742,002.0, 7,247,360.5] | 115.7% | haiku55-effort-xhigh higher |
| implement | 3 | 2,048,173.5 | [965,703.5, 4,110,049.0] | 79.0% | haiku55-effort-xhigh higher |

**Verdict.** `haiku55-effort-xhigh` vs `opus-effort-xhigh` over 6 paired tasks: tokens higher by 3,131,934 (95% CI [1,432,371, 5,208,642]); cost lower by 1.8303 (95% CI [-2.0039, -1.5426]); turns higher by 23.3 (95% CI [14.8, 31.7]); accuracy 75.0% vs 75.0% (9/12 vs 9/12).

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
| `effort-high` | 12 | 638,140 (487,631–1,041,983) | 633,129 (483,874–1,039,541) | 614,562 (465,120–1,003,789) | 2,413 (1,699–2,646) | 42 (38–51) |
| `effort-low` | 12 | 319,150 (296,552–426,266) | 286,263 (242,979–341,622) | 303,382 (282,828–406,713) | 2,248 (1,905–2,876) | 43 (31–50) |
| `effort-medium` | 12 | 449,432 (422,024–611,152) | 439,677 (410,193–610,054) | 438,675 (402,981–586,480) | 2,202 (2,070–2,368) | 58 (37–67) |
| `effort-xhigh` | 12 | 794,793 (665,704–1,179,334) | 792,720 (662,739–1,168,798) | 769,808 (635,846–1,133,168) | 1,902 (1,263–2,644) | 43 (39–62) |
| `haiku55-effort-high` | 12 | 257,286 (227,236–286,188) | 254,897 (224,549–285,193) | 224,866 (198,393–247,065) | 1,005 (948–1,091) | 44 (39–55) |
| `haiku55-effort-low` | 12 | 118,977 (108,781–143,402) | 117,003 (107,317–140,553) | 106,013 (94,589–123,200) | 917 (811–1,269) | 38 (34–43) |
| `haiku55-effort-medium` | 12 | 180,580 (163,075–216,989) | 177,504 (159,319–215,337) | 157,176 (143,964–199,273) | 986 (783–1,099) | 41 (39–47) |
| `haiku55-effort-xhigh` | 12 | 447,492 (409,663–521,939) | 445,522 (406,529–520,830) | 402,308 (372,694–480,176) | 1,142 (937–1,168) | 44 (37–48) |
| `opus-effort-high` | 12 | 215,648 (202,984–279,198) | 213,090 (196,909–277,430) | 194,134 (180,511–258,283) | 1,419 (1,384–1,501) | 37 (34–45) |
| `opus-effort-low` | 12 | 83,071 (71,146–91,496) | 79,688 (67,166–88,396) | 67,889 (53,508–74,171) | 2,332 (2,197–3,255) | 41 (34–44) |
| `opus-effort-medium` | 12 | 150,507 (137,518–168,240) | 147,465 (134,152–161,468) | 129,901 (122,721–147,263) | 2,274 (1,750–2,453) | 39 (30–46) |
| `opus-effort-xhigh` | 12 | 452,663 (372,644–542,576) | 448,916 (369,172–533,588) | 422,527 (350,561–514,486) | 1,489 (1,322–1,965) | 44 (37–58) |
| `sonnet55-effort-high` | 12 | 149,882 (117,636–182,799) | 148,799 (111,968–179,675) | 125,749 (94,582–157,311) | 2,484 (2,185–3,107) | 38 (32–43) |
| `sonnet55-effort-low` | 12 | 68,056 (53,487–82,686) | 64,314 (52,649–79,730) | 55,305 (40,603–60,421) | 2,197 (1,930–3,845) | 41 (37–44) |
| `sonnet55-effort-medium` | 12 | 83,880 (69,592–96,816) | 80,495 (68,145–89,903) | 65,342 (52,074–72,908) | 2,594 (2,124–3,269) | 42 (35–60) |
| `sonnet55-effort-xhigh` | 12 | 344,557 (281,315–409,661) | 341,354 (277,434–406,292) | 306,895 (244,016–382,768) | 1,337 (1,199–1,465) | 43 (37–62) |

`claude.wall_ms` is the whole `claude -p` process as the harness timed it. Prefer it over `duration_ms` when an arm delegates: from Claude Code 2.1.28x the `Agent` tool runs in the background and `duration_ms` stops before the subagent's work is folded back in.

`time_to_request_ms` covers everything before the first API request, which is where **MCP server startup lands**: it is the only column in which an arm that must spawn and handshake with a server can differ from one that does not. The transcript itself cannot show that cost — Claude Code connects its configured servers *before* writing the first transcript entry, so the delay between the first entry and the one advertising the server's tools collapses to a few milliseconds of bookkeeping rather than measuring the spawn.

Per-tool-call latency, median (IQR) in ms, pooled over calls:

| condition | `Read` | `Bash` | `Agent` |
|---|---|---|---|
| `effort-high` | 11 (7–16) | 54 (35–212) | – |
| `effort-low` | 10 (6–16) | 42 (34–153) | 18 (12–21) |
| `effort-medium` | 11 (6–17) | 45 (33–117) | 1,337 (674–1,999) |
| `effort-xhigh` | 10 (6–16) | 45 (34–161) | – |
| `haiku55-effort-high` | 11 (8–17) | 59 (42–202) | – |
| `haiku55-effort-low` | – | 66 (46–154) | – |
| `haiku55-effort-medium` | 19 (9–23) | 63 (43–148) | – |
| `haiku55-effort-xhigh` | 9 (5–15) | 58 (40–247) | – |
| `opus-effort-high` | – | 53 (40–90) | – |
| `opus-effort-low` | – | 65 (48–191) | – |
| `opus-effort-medium` | – | 59 (41–116) | – |
| `opus-effort-xhigh` | – | 49 (35–90) | – |
| `sonnet55-effort-high` | 14 (12–17) | 67 (47–204) | – |
| `sonnet55-effort-low` | – | 70 (54–199) | – |
| `sonnet55-effort-medium` | – | 67 (46–203) | – |
| `sonnet55-effort-xhigh` | – | 56 (39–106) | – |

Each cell is timed from the transcript entry carrying the `tool_use` block to the entry carrying its matching `tool_result`, both written locally by the same process. Calls whose result never arrived — a run that hit its turn cap mid-call — are absent rather than counted as zero. `n` per cell is the number of calls, not the number of runs, so an arm that called a tool once contributes one observation.

**Index build cost, for scale.** graphify v1: **4.6 s** total (`update` 3.4 s + `cluster-only` 1.2 s, AST-only, no API calls). graphify v2: a comparable AST pass plus roughly **35 min** of LLM-backed document extraction. MemPalace v1: **49 s**; v2: **97 s** (embedding + indexing, `--no-llm`, no API calls). All are one-off costs paid before any run, and none is included in any figure above — they are listed only so a per-query latency can be read against what producing the index cost in the first place.

## 10. Thinking tokens and model mix

Thinking tokens are billed as output and are a **subset** of `output_tokens`, not an addition to it, so the share is the honest reading of an effort change: an arm that merely wrote less prose would move the absolute count without touching the lever. The figure is main-session only — `usage.output_tokens_details` does not see a subagent — so an arm that delegates reports the *parent's* thinking, and its explorer's thinking appears only as tokens against that explorer's model in the second table.

| condition | runs | thinking tokens | main-session output | thinking share |
|---|---|---|---|---|
| `effort-high` | 12 | 370,958 | 612,923 | 60.5% |
| `effort-low` | 12 | 90,248 | 248,980 | 36.2% |
| `effort-medium` | 12 | 183,206 | 383,834 | 47.7% |
| `effort-xhigh` | 12 | 502,000 | 796,692 | 63.0% |
| `haiku55-effort-high` | 12 | 364,264 | 627,083 | 58.1% |
| `haiku55-effort-low` | 12 | 130,620 | 276,523 | 47.2% |
| `haiku55-effort-medium` | 12 | 227,513 | 432,297 | 52.6% |
| `haiku55-effort-xhigh` | 12 | 814,559 | 1,156,200 | 70.5% |
| `opus-effort-high` | 12 | 71,602 | 226,454 | 31.6% |
| `opus-effort-low` | 12 | 10,150 | 79,075 | 12.8% |
| `opus-effort-medium` | 12 | 37,313 | 160,389 | 23.3% |
| `opus-effort-xhigh` | 12 | 243,117 | 478,926 | 50.8% |
| `sonnet55-effort-high` | 12 | 42,989 | 160,841 | 26.7% |
| `sonnet55-effort-low` | 12 | 11,114 | 80,057 | 13.9% |
| `sonnet55-effort-medium` | 12 | 15,655 | 88,659 | 17.7% |
| `sonnet55-effort-xhigh` | 12 | 212,487 | 447,533 | 47.5% |

**Which model spent the tokens.** Summed from `modelUsage` over every run of the arm, on the same definition as `uncached_equivalent_all` (input + cache read + cache creation), so the row totals reconcile with the headline volume rather than describing some adjacent quantity. Note that a ~1k-token Haiku entry appears in **every** arm, including plain `baseline`: that is Claude Code's own background helper call, not delegated exploration. Only an arm whose Haiku row is orders of magnitude larger than that has actually moved work onto Haiku.

That helper's size is a deterministic function of the task prompt, so every Sonnet arm running the same task set reports the **identical** Haiku total. Rows agreeing to the token are therefore the expected result here, not a copy-paste fault — and they are what makes the figure usable as a baseline to read a genuinely delegating arm against.

| condition | `claude-haiku-5-5` tokens | `claude-opus-5-5` tokens | `claude-sonnet-5` tokens | `claude-sonnet-5-5` tokens | `claude-haiku-5-5` cost | `claude-opus-5-5` cost | `claude-sonnet-5` cost | `claude-sonnet-5-5` cost |
|---|---|---|---|---|---|---|---|---|
| `effort-high` | 0 | 0 | 88,695,666 | 0 | $0.00 | $0.00 | $30.68 | $0.00 |
| `effort-low` | 0 | 0 | 41,716,326 | 0 | $0.00 | $0.00 | $15.89 | $0.00 |
| `effort-medium` | 0 | 0 | 56,524,085 | 0 | $0.00 | $0.00 | $20.21 | $0.00 |
| `effort-xhigh` | 0 | 0 | 109,388,525 | 0 | $0.00 | $0.00 | $37.75 | $0.00 |
| `haiku55-effort-high` | 38,463,516 | 0 | 0 | 0 | $3.36 | $0.00 | $0.00 | $0.00 |
| `haiku55-effort-low` | 13,755,822 | 0 | 0 | 0 | $0.52 | $0.00 | $0.00 | $0.00 |
| `haiku55-effort-medium` | 26,610,012 | 0 | 0 | 0 | $1.67 | $0.00 | $0.00 | $0.00 |
| `haiku55-effort-xhigh` | 77,656,843 | 0 | 0 | 0 | $7.45 | $0.00 | $0.00 | $0.00 |
| `opus-effort-high` | 0 | 20,092,944 | 0 | 0 | $0.00 | $16.06 | $0.00 | $0.00 |
| `opus-effort-low` | 0 | 5,598,066 | 0 | 0 | $0.00 | $6.48 | $0.00 | $0.00 |
| `opus-effort-medium` | 0 | 13,340,829 | 0 | 0 | $0.00 | $12.09 | $0.00 | $0.00 |
| `opus-effort-xhigh` | 0 | 40,073,639 | 0 | 0 | $0.00 | $29.41 | $0.00 | $0.00 |
| `sonnet55-effort-high` | 0 | 0 | 0 | 11,406,325 | $0.00 | $0.00 | $0.00 | $7.01 |
| `sonnet55-effort-low` | 0 | 0 | 0 | 5,615,133 | $0.00 | $0.00 | $0.00 | $3.78 |
| `sonnet55-effort-medium` | 0 | 0 | 0 | 6,133,226 | $0.00 | $0.00 | $0.00 | $4.35 |
| `sonnet55-effort-xhigh` | 0 | 0 | 0 | 29,837,945 | $0.00 | $0.00 | $0.00 | $16.04 |

## 11. Where the remaining tokens go

`uncached_all` is one number; this section splits it in two, because at this end of the range the remaining question is no longer *how much* an arm spends but *on what*. **fixed = `first_turn_cache_creation` × `num_turns`** — the system prompt and tool definitions, re-sent on every single turn — and **moving = `uncached_all` − fixed**, which is the file contents, tool results and reasoning that are actually about the task. Both are per-run medians, so the two columns need not sum to the `uncached_all` median exactly.

Caveats that bound the reading: `first_turn_cache_creation` and `num_turns` are main-session only while `uncached_all` counts subagents too, so on a delegating arm `fixed` is an under-estimate (the arms below spawn none). And cache reads bill at a tenth of fresh input, so this is a split of **information volume, not of dollars** — a 60% fixed share does not mean 60% of the bill.

| condition | runs | uncached_all (med) | turns (med) | first-turn fixed | fixed = ft×turns (med) | moving (med) | fixed share |
|---|---|---|---|---|---|---|---|
| `effort-high` | 12 | 6,330,380 | 72 | 13,280 | 954,843 | 5,333,309 | 14.7% |
| `effort-low` | 12 | 2,841,296 | 40 | 12,271 | 500,611 | 2,279,656 | 17.8% |
| `effort-medium` | 12 | 4,586,979 | 60 | 11,299 | 720,920 | 3,900,466 | 15.5% |
| `effort-xhigh` | 12 | 8,231,292 | 83 | 11,304 | 966,470 | 7,135,825 | 12.1% |
| `haiku55-effort-high` | 12 | 2,834,356 | 44 | 8,191 | 405,226 | 2,405,616 | 13.8% |
| `haiku55-effort-low` | 12 | 1,135,477 | 26 | 10,893 | 225,380 | 910,097 | 19.4% |
| `haiku55-effort-medium` | 12 | 2,069,023 | 33 | 10,888 | 353,248 | 1,791,179 | 15.1% |
| `haiku55-effort-xhigh` | 12 | 5,421,285 | 66 | 8,189 | 572,985 | 4,880,858 | 10.0% |
| `opus-effort-high` | 12 | 1,598,211 | 27 | 8,929 | 244,929 | 1,372,874 | 14.5% |
| `opus-effort-low` | 12 | 444,290 | 12 | 10,323 | 120,588 | 337,464 | 26.4% |
| `opus-effort-medium` | 12 | 1,123,248 | 21 | 10,323 | 192,506 | 904,573 | 18.1% |
| `opus-effort-xhigh` | 12 | 3,396,540 | 39 | 10,311 | 359,905 | 3,094,673 | 10.9% |
| `sonnet55-effort-high` | 12 | 892,750 | 17 | 10,143 | 143,549 | 727,508 | 16.8% |
| `sonnet55-effort-low` | 12 | 441,487 | 12 | 8,771 | 108,455 | 325,369 | 23.1% |
| `sonnet55-effort-medium` | 12 | 530,004 | 12 | 8,761 | 108,718 | 412,244 | 20.7% |
| `sonnet55-effort-xhigh` | 12 | 2,241,481 | 29 | 7,412 | 276,882 | 1,970,834 | 11.0% |

## 12. Counter-productive cases and subagent use

- `effort-high`: **0** subagent(s) spawned across **0**/12 run(s). T2S all-model 6,271,515 vs main-session-only 6,271,515.
- `effort-low`: **6** subagent(s) spawned across **5**/12 run(s). T2S all-model 3,281,682 vs main-session-only 3,281,682.
- `effort-medium`: **2** subagent(s) spawned across **1**/12 run(s). T2S all-model 3,959,563 vs main-session-only 3,959,563.
- `effort-xhigh`: **0** subagent(s) spawned across **0**/12 run(s). T2S all-model 8,252,692 vs main-session-only 8,252,692.
- `haiku55-effort-high`: **0** subagent(s) spawned across **0**/12 run(s). T2S all-model 3,200,742 vs main-session-only 3,200,742.
- `haiku55-effort-low`: **0** subagent(s) spawned across **0**/12 run(s). T2S all-model 1,151,269 vs main-session-only 1,151,269.
- `haiku55-effort-medium`: **0** subagent(s) spawned across **0**/12 run(s). T2S all-model 2,184,608 vs main-session-only 2,184,608.
- `haiku55-effort-xhigh`: **0** subagent(s) spawned across **0**/12 run(s). T2S all-model 6,085,137 vs main-session-only 6,085,137.
- `opus-effort-high`: **0** subagent(s) spawned across **0**/12 run(s). T2S all-model 1,615,353 vs main-session-only 1,615,353.
- `opus-effort-low`: **0** subagent(s) spawned across **0**/12 run(s). T2S all-model 460,327 vs main-session-only 460,327.
- `opus-effort-medium`: **0** subagent(s) spawned across **0**/12 run(s). T2S all-model 1,141,387 vs main-session-only 1,141,387.
- `opus-effort-xhigh`: **0** subagent(s) spawned across **0**/12 run(s). T2S all-model 3,582,543 vs main-session-only 3,582,543.
- `sonnet55-effort-high`: **0** subagent(s) spawned across **0**/12 run(s). T2S all-model 896,391 vs main-session-only 896,391.
- `sonnet55-effort-low`: **0** subagent(s) spawned across **0**/12 run(s). T2S all-model 438,611 vs main-session-only 438,611.
- `sonnet55-effort-medium`: **0** subagent(s) spawned across **0**/12 run(s). T2S all-model 496,825 vs main-session-only 496,825.
- `sonnet55-effort-xhigh`: **0** subagent(s) spawned across **0**/12 run(s). T2S all-model 2,263,180 vs main-session-only 2,263,180.
- Runs that opened `graphify-out/graph.json` directly: **0**
- graphify-condition runs that never invoked the `graphify` CLI (nudge ignored): **12** (`BFX1-search-queries__opus-effort-low__r1`, `BFX1-search-queries__opus-effort-low__r2`, `BFX2-issue-filters__opus-effort-low__r1`, `BFX2-issue-filters__opus-effort-low__r2`, `BFX3-sign-up__opus-effort-low__r1`, `BFX3-sign-up__opus-effort-low__r2`, `BIM1-issue-relocation__opus-effort-low__r1`, `BIM1-issue-relocation__opus-effort-low__r2`, `BIM2-workspace-slug__opus-effort-low__r1`, `BIM2-workspace-slug__opus-effort-low__r2`, `BIM3-project-cloning__opus-effort-low__r1`, `BIM3-project-cloning__opus-effort-low__r2`)

## 13. Failed and ungraded runs

Harness failures (`is_error`, or `terminal_reason` other than `completed`): **0**. The table below also lists runs that completed normally but did not meet their grader's success threshold — those are accuracy results, not execution problems.

| run_id | condition | task | is_error | terminal_reason |
|---|---|---|---|---|
| `BFX1-search-queries__sonnet55-effort-low__r1` | sonnet55-effort-low | BFX1-search-queries | false | completed |
| `BFX2-issue-filters__effort-high__r1` | effort-high | BFX2-issue-filters | false | completed |
| `BFX2-issue-filters__effort-high__r2` | effort-high | BFX2-issue-filters | false | completed |
| `BFX2-issue-filters__effort-low__r1` | effort-low | BFX2-issue-filters | false | completed |
| `BFX2-issue-filters__effort-low__r2` | effort-low | BFX2-issue-filters | false | completed |
| `BFX2-issue-filters__effort-medium__r1` | effort-medium | BFX2-issue-filters | false | completed |
| `BFX2-issue-filters__effort-medium__r2` | effort-medium | BFX2-issue-filters | false | completed |
| `BFX2-issue-filters__effort-xhigh__r1` | effort-xhigh | BFX2-issue-filters | false | completed |
| `BFX2-issue-filters__haiku55-effort-medium__r2` | haiku55-effort-medium | BFX2-issue-filters | false | completed |
| `BFX2-issue-filters__haiku55-effort-xhigh__r2` | haiku55-effort-xhigh | BFX2-issue-filters | false | completed |
| `BFX2-issue-filters__opus-effort-high__r1` | opus-effort-high | BFX2-issue-filters | false | completed |
| `BFX2-issue-filters__opus-effort-high__r2` | opus-effort-high | BFX2-issue-filters | false | completed |
| `BFX2-issue-filters__opus-effort-xhigh__r2` | opus-effort-xhigh | BFX2-issue-filters | false | completed |
| `BFX2-issue-filters__sonnet55-effort-high__r1` | sonnet55-effort-high | BFX2-issue-filters | false | completed |
| `BFX2-issue-filters__sonnet55-effort-high__r2` | sonnet55-effort-high | BFX2-issue-filters | false | completed |
| `BFX2-issue-filters__sonnet55-effort-low__r1` | sonnet55-effort-low | BFX2-issue-filters | false | completed |
| `BFX2-issue-filters__sonnet55-effort-low__r2` | sonnet55-effort-low | BFX2-issue-filters | false | completed |
| `BFX2-issue-filters__sonnet55-effort-medium__r1` | sonnet55-effort-medium | BFX2-issue-filters | false | completed |
| `BFX2-issue-filters__sonnet55-effort-medium__r2` | sonnet55-effort-medium | BFX2-issue-filters | false | completed |
| `BFX2-issue-filters__sonnet55-effort-xhigh__r1` | sonnet55-effort-xhigh | BFX2-issue-filters | false | completed |
| `BFX2-issue-filters__sonnet55-effort-xhigh__r2` | sonnet55-effort-xhigh | BFX2-issue-filters | false | completed |
| `BFX3-sign-up__effort-high__r2` | effort-high | BFX3-sign-up | false | completed |
| `BFX3-sign-up__effort-low__r1` | effort-low | BFX3-sign-up | false | completed |
| `BFX3-sign-up__effort-low__r2` | effort-low | BFX3-sign-up | false | completed |
| `BFX3-sign-up__effort-medium__r1` | effort-medium | BFX3-sign-up | false | completed |
| `BFX3-sign-up__effort-medium__r2` | effort-medium | BFX3-sign-up | false | completed |
| `BFX3-sign-up__effort-xhigh__r1` | effort-xhigh | BFX3-sign-up | false | completed |
| `BFX3-sign-up__effort-xhigh__r2` | effort-xhigh | BFX3-sign-up | false | completed |
| `BFX3-sign-up__haiku55-effort-low__r1` | haiku55-effort-low | BFX3-sign-up | false | completed |
| `BFX3-sign-up__sonnet55-effort-high__r2` | sonnet55-effort-high | BFX3-sign-up | false | completed |
| `BFX3-sign-up__sonnet55-effort-low__r2` | sonnet55-effort-low | BFX3-sign-up | false | completed |
| `BFX3-sign-up__sonnet55-effort-medium__r2` | sonnet55-effort-medium | BFX3-sign-up | false | completed |
| `BIM1-issue-relocation__effort-high__r1` | effort-high | BIM1-issue-relocation | false | completed |
| `BIM1-issue-relocation__effort-low__r1` | effort-low | BIM1-issue-relocation | false | completed |
| `BIM1-issue-relocation__effort-low__r2` | effort-low | BIM1-issue-relocation | false | completed |
| `BIM1-issue-relocation__effort-medium__r1` | effort-medium | BIM1-issue-relocation | false | completed |
| `BIM1-issue-relocation__effort-medium__r2` | effort-medium | BIM1-issue-relocation | false | completed |
| `BIM1-issue-relocation__effort-xhigh__r1` | effort-xhigh | BIM1-issue-relocation | false | completed |
| `BIM1-issue-relocation__effort-xhigh__r2` | effort-xhigh | BIM1-issue-relocation | false | completed |
| `BIM1-issue-relocation__sonnet55-effort-low__r1` | sonnet55-effort-low | BIM1-issue-relocation | false | completed |
| `BIM2-workspace-slug__effort-low__r1` | effort-low | BIM2-workspace-slug | false | completed |
| `BIM2-workspace-slug__effort-low__r2` | effort-low | BIM2-workspace-slug | false | completed |
| `BIM2-workspace-slug__effort-medium__r1` | effort-medium | BIM2-workspace-slug | false | completed |
| `BIM2-workspace-slug__effort-medium__r2` | effort-medium | BIM2-workspace-slug | false | completed |
| `BIM3-project-cloning__effort-high__r2` | effort-high | BIM3-project-cloning | false | completed |
| `BIM3-project-cloning__effort-low__r1` | effort-low | BIM3-project-cloning | false | completed |
| `BIM3-project-cloning__effort-low__r2` | effort-low | BIM3-project-cloning | false | completed |
| `BIM3-project-cloning__effort-medium__r2` | effort-medium | BIM3-project-cloning | false | completed |
| `BIM3-project-cloning__effort-xhigh__r1` | effort-xhigh | BIM3-project-cloning | false | completed |
| `BIM3-project-cloning__effort-xhigh__r2` | effort-xhigh | BIM3-project-cloning | false | completed |
| `BIM3-project-cloning__haiku55-effort-high__r2` | haiku55-effort-high | BIM3-project-cloning | false | completed |
| `BIM3-project-cloning__haiku55-effort-low__r1` | haiku55-effort-low | BIM3-project-cloning | false | completed |
| `BIM3-project-cloning__haiku55-effort-low__r2` | haiku55-effort-low | BIM3-project-cloning | false | completed |
| `BIM3-project-cloning__haiku55-effort-medium__r1` | haiku55-effort-medium | BIM3-project-cloning | false | completed |
| `BIM3-project-cloning__haiku55-effort-medium__r2` | haiku55-effort-medium | BIM3-project-cloning | false | completed |
| `BIM3-project-cloning__haiku55-effort-xhigh__r1` | haiku55-effort-xhigh | BIM3-project-cloning | false | completed |
| `BIM3-project-cloning__haiku55-effort-xhigh__r2` | haiku55-effort-xhigh | BIM3-project-cloning | false | completed |
| `BIM3-project-cloning__opus-effort-high__r1` | opus-effort-high | BIM3-project-cloning | false | completed |
| `BIM3-project-cloning__opus-effort-high__r2` | opus-effort-high | BIM3-project-cloning | false | completed |
| `BIM3-project-cloning__opus-effort-low__r1` | opus-effort-low | BIM3-project-cloning | false | completed |
| `BIM3-project-cloning__opus-effort-low__r2` | opus-effort-low | BIM3-project-cloning | false | completed |
| `BIM3-project-cloning__opus-effort-medium__r1` | opus-effort-medium | BIM3-project-cloning | false | completed |
| `BIM3-project-cloning__opus-effort-medium__r2` | opus-effort-medium | BIM3-project-cloning | false | completed |
| `BIM3-project-cloning__opus-effort-xhigh__r1` | opus-effort-xhigh | BIM3-project-cloning | false | completed |
| `BIM3-project-cloning__opus-effort-xhigh__r2` | opus-effort-xhigh | BIM3-project-cloning | false | completed |
| `BIM3-project-cloning__sonnet55-effort-high__r2` | sonnet55-effort-high | BIM3-project-cloning | false | completed |
| `BIM3-project-cloning__sonnet55-effort-low__r1` | sonnet55-effort-low | BIM3-project-cloning | false | completed |
| `BIM3-project-cloning__sonnet55-effort-low__r2` | sonnet55-effort-low | BIM3-project-cloning | false | completed |
| `BIM3-project-cloning__sonnet55-effort-medium__r1` | sonnet55-effort-medium | BIM3-project-cloning | false | completed |
| `BIM3-project-cloning__sonnet55-effort-medium__r2` | sonnet55-effort-medium | BIM3-project-cloning | false | completed |
| `BIM3-project-cloning__sonnet55-effort-xhigh__r1` | sonnet55-effort-xhigh | BIM3-project-cloning | false | completed |

## 14. Limitations

- N = 192 runs over 6 tasks; a single corpus and a single model. These results do not generalize to other codebases or models.
- Bootstrap resamples tasks, so the interval reflects task-to-task variation, not within-task run noise.
- Where a CI crosses zero the honest reading is "no difference detected at this N", not "no difference exists".
- The fixed ~21k-token system-prompt/tool-definition overhead is included in both arms and not subtracted (see §2).
- **1 repetition per (task × condition)**: within-task run-to-run variance is unmeasured, so any single per-task difference may be run noise.
- Subagent traffic is counted in `uncached_all`, but a subagent's tool calls never reach the parent transcript, so the tool-call columns stay main-session-only.
- Raw per-run data lives in `results/models/brownfield/runs/<run-id>/` and the `summary.csv` beside this report.
