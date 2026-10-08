# graphify-bench results

Generated 2026-10-08T03:34:02.933Z. 456 runs over 12 tasks, conditions: effort-high, effort-low, effort-medium, effort-xhigh, grok-effort-high, grok-effort-low, grok-effort-medium, haiku55-effort-high, haiku55-effort-low, haiku55-effort-medium, haiku55-effort-xhigh, opus-effort-high, opus-effort-low, opus-effort-medium, opus-effort-xhigh, sonnet55-effort-high, sonnet55-effort-low, sonnet55-effort-medium, sonnet55-effort-xhigh.

## 1. Environment

- Claude Code: `2.1.283 (Claude Code)`
- graphify: `graphify 0.9.53`
- Node: `v25.5.0` / pnpm `10.28.2`
- Platform: `darwin 25.2.0 arm64`
- Model: `claude-sonnet-5`, effort `high`, --max-turns 120, --max-budget-usd 8

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
| `grok-effort-high` | `grok-4.7` | `baseline` | – | As `grok-effort-low`, at `--effort high`. No xhigh arm. |
| `grok-effort-low` | `grok-4.7` | `baseline` | – | `effort-low` on Grok 4.7. Same overlay and effort as `effort-low`. The process is `grok -p`, so the tool names differ and there is no dollar cap (Grok has no `--max-budget-usd`). The turn cap matches the set. |
| `grok-effort-medium` | `grok-4.7` | `baseline` | – | As `grok-effort-low`, at `--effort medium`. |
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
| effort-high | 24 | **636,648** (332,688–1,234,647) | 636,648 | 0.423 | 14.0 | 0 in 0 run(s) | 0 | 0 | 0 | 337 | 0 | 100.0% (24/24) | 777,121 |
| effort-low | 24 | **330,040** (216,723–535,561) | 330,040 | 0.241 | 10.5 | 0 in 0 run(s) | 5 | 0 | 0 | 224 | 0 | 95.8% (23/24) | 395,136 |
| effort-medium | 24 | **399,480** (263,209–599,805) | 399,480 | 0.312 | 11.0 | 0 in 0 run(s) | 6 | 0 | 0 | 242 | 0 | 91.7% (22/24) | 462,834 |
| effort-xhigh | 24 | **1,913,944** (820,022–2,676,812) | 1,913,944 | 1.268 | 26.0 | 0 in 0 run(s) | 12 | 0 | 0 | 586 | 0 | 95.8% (23/24) | 2,361,792 |
| grok-effort-high | 24 | **5,142,021** (3,774,437–6,881,545) | 5,142,021 | 1.169 | 48.5 | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | 100.0% (24/24) | 5,236,046 |
| grok-effort-low | 24 | **1,235,540** (632,916–1,783,578) | 1,235,540 | 0.305 | 25.5 | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | 95.8% (23/24) | 1,321,539 |
| grok-effort-medium | 24 | **3,344,034** (1,985,895–4,671,118) | 3,344,034 | 0.732 | 39.0 | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | 95.8% (23/24) | 3,377,635 |
| haiku55-effort-high | 24 | **2,421,312** (1,485,145–3,327,694) | 2,421,312 | 0.193 | 36.0 | 0 in 0 run(s) | 146 | 0 | 0 | 459 | 0 | 91.7% (22/24) | 2,616,875 |
| haiku55-effort-low | 24 | **1,042,800** (560,926–1,490,484) | 1,042,800 | 0.036 | 18.0 | 0 in 0 run(s) | 10 | 0 | 0 | 360 | 0 | 87.5% (21/24) | 1,151,932 |
| haiku55-effort-medium | 24 | **1,319,879** (922,023–2,563,401) | 1,319,879 | 0.070 | 30.0 | 0 in 0 run(s) | 96 | 0 | 0 | 403 | 0 | 87.5% (21/24) | 1,679,319 |
| haiku55-effort-xhigh | 24 | **3,870,094** (2,806,716–5,808,042) | 3,870,094 | 0.445 | 52.0 | 0 in 0 run(s) | 315 | 0 | 0 | 559 | 0 | 100.0% (24/24) | 4,925,530 |
| opus-effort-high | 24 | **1,373,094** (628,861–1,967,737) | 1,373,094 | 1.237 | 22.5 | 0 in 0 run(s) | 1 | 0 | 0 | 495 | 0 | 100.0% (24/24) | 1,361,655 |
| opus-effort-low | 24 | **400,732** (247,314–609,011) | 400,732 | 0.465 | 12.5 | 0 in 0 run(s) | 0 | 0 | 0 | 260 | 0 | 87.5% (21/24) | 459,921 |
| opus-effort-medium | 24 | **770,222** (435,641–1,303,513) | 770,222 | 0.850 | 18.5 | 0 in 0 run(s) | 0 | 0 | 0 | 427 | 0 | 95.8% (23/24) | 1,062,637 |
| opus-effort-xhigh | 24 | **2,580,519** (1,851,949–3,614,272) | 2,580,519 | 2.082 | 34.0 | 0 in 0 run(s) | 0 | 0 | 0 | 795 | 0 | 100.0% (24/24) | 3,005,946 |
| sonnet55-effort-high | 24 | **636,848** (308,725–1,163,335) | 636,848 | 0.438 | 14.5 | 0 in 0 run(s) | 2 | 0 | 0 | 324 | 0 | 91.7% (22/24) | 783,237 |
| sonnet55-effort-low | 24 | **323,277** (230,760–529,700) | 323,277 | 0.259 | 10.5 | 0 in 0 run(s) | 4 | 0 | 0 | 228 | 0 | 91.7% (22/24) | 388,470 |
| sonnet55-effort-medium | 24 | **345,412** (211,963–514,193) | 345,412 | 0.262 | 9.5 | 0 in 0 run(s) | 3 | 0 | 0 | 210 | 0 | 83.3% (20/24) | 418,415 |
| sonnet55-effort-xhigh | 24 | **1,641,541** (844,282–3,320,025) | 1,641,541 | 1.051 | 23.5 | 0 in 0 run(s) | 19 | 0 | 0 | 573 | 0 | 95.8% (23/24) | 2,209,860 |

**`uncached_all` (PRIMARY) = Σ over every entry of `modelUsage` of (inputTokens + cacheReadInputTokens + cacheCreationInputTokens)** — it covers the main session *and* any subagent, so it is commensurable with `total_cost_usd`. `uncached_main` (secondary) is the same sum taken from `usage.*`, which the result JSON populates for the **main session only**; a run that spawned a subagent therefore reports less information volume there than it actually consumed. The `subagents` column lets the two be reconciled. Tool columns are totals across all runs of the condition. T2S (tokens-to-success) = total `uncached_all` of successful runs / number of successful runs.

Fixed overhead, reported separately so readers can subtract it (architecture.md §5):

| condition | first-turn cache_creation (median) |
|---|---|
| effort-high | 8,524 |
| effort-low | 8,381 |
| effort-medium | 8,665 |
| effort-xhigh | 8,673 |
| grok-effort-high | 0 |
| grok-effort-low | 0 |
| grok-effort-medium | 0 |
| haiku55-effort-high | 11,062 |
| haiku55-effort-low | 10,993 |
| haiku55-effort-medium | 9,565 |
| haiku55-effort-xhigh | 10,975 |
| opus-effort-high | 9,259 |
| opus-effort-low | 9,300 |
| opus-effort-medium | 9,335 |
| opus-effort-xhigh | 9,483 |
| sonnet55-effort-high | 8,540 |
| sonnet55-effort-low | 8,344 |
| sonnet55-effort-medium | 8,393 |
| sonnet55-effort-xhigh | 8,332 |

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
| `effort-high` | 12/12 · 1.000 | 12/12 · 1.000 |
| `effort-low` | 11/12 · 0.917 | 12/12 · 1.000 |
| `effort-medium` | 10/12 · 0.833 | 12/12 · 1.000 |
| `effort-xhigh` | 11/12 · 0.917 | 12/12 · 1.000 |
| `grok-effort-high` | 12/12 · 1.000 | 12/12 · 1.000 |
| `grok-effort-low` | 11/12 · 0.917 | 12/12 · 1.000 |
| `grok-effort-medium` | 12/12 · 1.000 | 11/12 · 0.917 |
| `haiku55-effort-high` | 11/12 · 0.917 | 11/12 · 0.917 |
| `haiku55-effort-low` | 10/12 · 0.833 | 11/12 · 0.917 |
| `haiku55-effort-medium` | 11/12 · 0.917 | 10/12 · 0.833 |
| `haiku55-effort-xhigh` | 12/12 · 1.000 | 12/12 · 1.000 |
| `opus-effort-high` | 12/12 · 1.000 | 12/12 · 1.000 |
| `opus-effort-low` | 9/12 · 0.750 | 12/12 · 1.000 |
| `opus-effort-medium` | 11/12 · 0.917 | 12/12 · 1.000 |
| `opus-effort-xhigh` | 12/12 · 1.000 | 12/12 · 1.000 |
| `sonnet55-effort-high` | 10/12 · 0.833 | 12/12 · 1.000 |
| `sonnet55-effort-low` | 10/12 · 0.833 | 12/12 · 1.000 |
| `sonnet55-effort-medium` | 8/12 · 0.667 | 12/12 · 1.000 |
| `sonnet55-effort-xhigh` | 11/12 · 0.917 | 12/12 · 1.000 |

## 7. Structural comparisons

Each block below is an independent paired comparison between two arms, computed with the same machinery as §3: per-task pairing over the same task set, percentile bootstrap over tasks, an iso-accuracy subset scoped to just those two arms, and a per-category breakdown. Arms that are not part of a block are excluded from it entirely.

### `opus-effort-low` vs `effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low | 24 | **330,040** (216,723–535,561) | 330,040 | 0.241 | 10.5 | 0 in 0 run(s) | 5 | 0 | 0 | 224 | 0 | 95.8% (23/24) | 395,136 |
| opus-effort-low | 24 | **400,732** (247,314–609,011) | 400,732 | 0.465 | 12.5 | 0 in 0 run(s) | 0 | 0 | 0 | 260 | 0 | 87.5% (21/24) | 459,921 |

Paired difference (`opus-effort-low` − `effort-low`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 39,248.6 | [-6,370.6, 80,258.8] | 17.3% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 12 | 39,248.6 | [-5,747.5, 82,595.5] | 17.3% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 12 | 0.2131 | [0.1691, 0.2560] | 79.8% | opus-effort-low higher |
| num_turns | 12 | 1.1 | [-0.1, 2.3] | 14.5% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (10/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 10 | 31,652.2 | [-17,986.9, 77,936.8] | 12.1% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 10 | 31,652.2 | [-17,418.8, 78,279.3] | 12.1% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 10 | 0.2258 | [0.1764, 0.2721] | 76.7% | opus-effort-low higher |
| num_turns | 10 | 0.9 | [-0.6, 2.3] | 10.7% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 63,797.5 | [-8,090.1, 126,350.3] | 33.8% | **CI crosses 0 — no detectable difference** |
| implement | 6 | 14,699.8 | [-35,372.2, 51,071.1] | 0.7% | **CI crosses 0 — no detectable difference** |

**Verdict.** `opus-effort-low` vs `effort-low` over 12 paired tasks: tokens no detectable difference; cost higher by 0.2131 (95% CI [0.1691, 0.2560]); turns no detectable difference; accuracy 87.5% vs 95.8% (21/24 vs 23/24).

### `opus-effort-medium` vs `effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-medium | 24 | **399,480** (263,209–599,805) | 399,480 | 0.312 | 11.0 | 0 in 0 run(s) | 6 | 0 | 0 | 242 | 0 | 91.7% (22/24) | 462,834 |
| opus-effort-medium | 24 | **770,222** (435,641–1,303,513) | 770,222 | 0.850 | 18.5 | 0 in 0 run(s) | 0 | 0 | 0 | 427 | 0 | 95.8% (23/24) | 1,062,637 |

Paired difference (`opus-effort-medium` − `effort-medium`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 590,420.3 | [292,146.1, 979,869.3] | 120.5% | opus-effort-medium higher |
| uncached_equivalent | 12 | 590,420.3 | [287,312.7, 983,431.3] | 120.5% | opus-effort-medium higher |
| total_cost_usd | 12 | 0.6037 | [0.4276, 0.8076] | 185.4% | opus-effort-medium higher |
| num_turns | 12 | 7.6 | [4.4, 12.0] | 64.5% | opus-effort-medium higher |

Iso-accuracy subset (11/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 11 | 634,485.4 | [313,188.2, 1,064,072.6] | 126.4% | opus-effort-medium higher |
| uncached_equivalent | 11 | 634,485.4 | [312,487.2, 1,058,394.7] | 126.4% | opus-effort-medium higher |
| total_cost_usd | 11 | 0.6380 | [0.4586, 0.8538] | 188.1% | opus-effort-medium higher |
| num_turns | 11 | 8.0 | [4.5, 12.7] | 66.1% | opus-effort-medium higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 232,266.8 | [137,791.6, 343,724.3] | 78.1% | opus-effort-medium higher |
| implement | 6 | 948,573.8 | [444,036.2, 1,591,173.3] | 162.9% | opus-effort-medium higher |

**Verdict.** `opus-effort-medium` vs `effort-medium` over 12 paired tasks: tokens higher by 590,420 (95% CI [292,146, 979,869]); cost higher by 0.6037 (95% CI [0.4276, 0.8076]); turns higher by 7.6 (95% CI [4.4, 12.0]); accuracy 95.8% vs 91.7% (23/24 vs 22/24).

### `opus-effort-high` vs `effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-high | 24 | **636,648** (332,688–1,234,647) | 636,648 | 0.423 | 14.0 | 0 in 0 run(s) | 0 | 0 | 0 | 337 | 0 | 100.0% (24/24) | 777,121 |
| opus-effort-high | 24 | **1,373,094** (628,861–1,967,737) | 1,373,094 | 1.237 | 22.5 | 0 in 0 run(s) | 1 | 0 | 0 | 495 | 0 | 100.0% (24/24) | 1,361,655 |

Paired difference (`opus-effort-high` − `effort-high`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 584,533.9 | [349,647.7, 838,252.8] | 79.9% | opus-effort-high higher |
| uncached_equivalent | 12 | 584,533.9 | [364,919.9, 837,944.1] | 79.9% | opus-effort-high higher |
| total_cost_usd | 12 | 0.6593 | [0.5009, 0.8318] | 144.6% | opus-effort-high higher |
| num_turns | 12 | 6.9 | [4.5, 9.6] | 47.9% | opus-effort-high higher |

Iso-accuracy subset (12/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 584,533.9 | [355,083.4, 866,784.6] | 79.9% | opus-effort-high higher |
| uncached_equivalent | 12 | 584,533.9 | [363,726.0, 854,151.6] | 79.9% | opus-effort-high higher |
| total_cost_usd | 12 | 0.6593 | [0.4936, 0.8357] | 144.6% | opus-effort-high higher |
| num_turns | 12 | 6.9 | [4.5, 9.8] | 47.9% | opus-effort-high higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 374,062.7 | [170,253.8, 667,562.4] | 91.5% | opus-effort-high higher |
| implement | 6 | 795,005.2 | [488,496.5, 1,186,367.4] | 68.4% | opus-effort-high higher |

**Verdict.** `opus-effort-high` vs `effort-high` over 12 paired tasks: tokens higher by 584,534 (95% CI [349,648, 838,253]); cost higher by 0.6593 (95% CI [0.5009, 0.8318]); turns higher by 6.9 (95% CI [4.5, 9.6]); accuracy 100.0% vs 100.0% (24/24 vs 24/24).

### `opus-effort-xhigh` vs `effort-xhigh`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-xhigh | 24 | **1,913,944** (820,022–2,676,812) | 1,913,944 | 1.268 | 26.0 | 0 in 0 run(s) | 12 | 0 | 0 | 586 | 0 | 95.8% (23/24) | 2,361,792 |
| opus-effort-xhigh | 24 | **2,580,519** (1,851,949–3,614,272) | 2,580,519 | 2.082 | 34.0 | 0 in 0 run(s) | 0 | 0 | 0 | 795 | 0 | 100.0% (24/24) | 3,005,946 |

Paired difference (`opus-effort-xhigh` − `effort-xhigh`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 732,111.7 | [214,771.0, 1,175,433.7] | 89.3% | opus-effort-xhigh higher |
| uncached_equivalent | 12 | 732,111.7 | [256,278.4, 1,158,391.0] | 89.3% | opus-effort-xhigh higher |
| total_cost_usd | 12 | 0.9799 | [0.8292, 1.1488] | 126.0% | opus-effort-xhigh higher |
| num_turns | 12 | 8.0 | [3.3, 12.6] | 47.5% | opus-effort-xhigh higher |

Iso-accuracy subset (11/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 11 | 742,780.1 | [215,863.7, 1,213,213.1] | 85.5% | opus-effort-xhigh higher |
| uncached_equivalent | 11 | 742,780.1 | [229,175.9, 1,229,117.6] | 85.5% | opus-effort-xhigh higher |
| total_cost_usd | 11 | 1.0122 | [0.8690, 1.1939] | 119.6% | opus-effort-xhigh higher |
| num_turns | 11 | 7.9 | [2.6, 12.8] | 44.8% | opus-effort-xhigh higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 853,925.5 | [496,527.0, 1,249,479.7] | 146.6% | opus-effort-xhigh higher |
| implement | 6 | 610,297.8 | [-269,850.7, 1,448,570.7] | 31.9% | **CI crosses 0 — no detectable difference** |

**Verdict.** `opus-effort-xhigh` vs `effort-xhigh` over 12 paired tasks: tokens higher by 732,112 (95% CI [214,771, 1,175,434]); cost higher by 0.9799 (95% CI [0.8292, 1.1488]); turns higher by 8.0 (95% CI [3.3, 12.6]); accuracy 100.0% vs 95.8% (24/24 vs 23/24).

### `opus-effort-low` vs `effort-xhigh`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-xhigh | 24 | **1,913,944** (820,022–2,676,812) | 1,913,944 | 1.268 | 26.0 | 0 in 0 run(s) | 12 | 0 | 0 | 586 | 0 | 95.8% (23/24) | 2,361,792 |
| opus-effort-low | 24 | **400,732** (247,314–609,011) | 400,732 | 0.465 | 12.5 | 0 in 0 run(s) | 0 | 0 | 0 | 260 | 0 | 87.5% (21/24) | 459,921 |

Paired difference (`opus-effort-low` − `effort-xhigh`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | -1,846,603.6 | [-3,074,347.9, -977,531.7] | -71.4% | opus-effort-low lower |
| uncached_equivalent | 12 | -1,846,603.6 | [-2,996,614.9, -971,940.4] | -71.4% | opus-effort-low lower |
| total_cost_usd | 12 | -0.7342 | [-1.1671, -0.3985] | -48.8% | opus-effort-low lower |
| num_turns | 12 | -16.4 | [-22.8, -9.9] | -50.3% | opus-effort-low lower |

Iso-accuracy subset (10/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 10 | -1,952,318.7 | [-3,370,102.2, -968,576.1] | -71.2% | opus-effort-low lower |
| uncached_equivalent | 10 | -1,952,318.7 | [-3,326,348.7, -996,206.8] | -71.2% | opus-effort-low lower |
| total_cost_usd | 10 | -0.7683 | [-1.2367, -0.3992] | -49.1% | opus-effort-low lower |
| num_turns | 10 | -17.0 | [-24.5, -10.1] | -50.0% | opus-effort-low lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | -829,047.7 | [-1,483,405.3, -271,427.0] | -62.6% | opus-effort-low lower |
| implement | 6 | -2,864,159.5 | [-4,650,929.3, -1,582,443.2] | -80.2% | opus-effort-low lower |

**Verdict.** `opus-effort-low` vs `effort-xhigh` over 12 paired tasks: tokens lower by 1,846,604 (95% CI [-3,074,348, -977,532]); cost lower by 0.7342 (95% CI [-1.1671, -0.3985]); turns lower by 16.4 (95% CI [-22.8, -9.9]); accuracy 87.5% vs 95.8% (21/24 vs 23/24).

### `opus-effort-high` vs `opus-effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-low | 24 | **400,732** (247,314–609,011) | 400,732 | 0.465 | 12.5 | 0 in 0 run(s) | 0 | 0 | 0 | 260 | 0 | 87.5% (21/24) | 459,921 |
| opus-effort-high | 24 | **1,373,094** (628,861–1,967,737) | 1,373,094 | 1.237 | 22.5 | 0 in 0 run(s) | 1 | 0 | 0 | 495 | 0 | 100.0% (24/24) | 1,361,655 |

Paired difference (`opus-effort-high` − `opus-effort-low`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 934,423.8 | [583,565.7, 1,340,424.0] | 201.2% | opus-effort-high higher |
| uncached_equivalent | 12 | 934,423.8 | [587,456.1, 1,344,957.2] | 201.2% | opus-effort-high higher |
| total_cost_usd | 12 | 0.6558 | [0.4652, 0.8625] | 129.7% | opus-effort-high higher |
| num_turns | 12 | 10.2 | [6.9, 13.3] | 82.8% | opus-effort-high higher |

Iso-accuracy subset (10/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 10 | 980,577.4 | [597,848.0, 1,424,686.9] | 193.8% | opus-effort-high higher |
| uncached_equivalent | 10 | 980,577.4 | [609,911.0, 1,430,636.6] | 193.8% | opus-effort-high higher |
| total_cost_usd | 10 | 0.6797 | [0.4797, 0.9197] | 123.3% | opus-effort-high higher |
| num_turns | 10 | 10.3 | [7.0, 13.5] | 79.4% | opus-effort-high higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 504,574.4 | [222,374.7, 835,791.8] | 164.1% | opus-effort-high higher |
| implement | 6 | 1,364,273.2 | [934,908.4, 1,882,196.5] | 238.3% | opus-effort-high higher |

**Verdict.** `opus-effort-high` vs `opus-effort-low` over 12 paired tasks: tokens higher by 934,424 (95% CI [583,566, 1,340,424]); cost higher by 0.6558 (95% CI [0.4652, 0.8625]); turns higher by 10.2 (95% CI [6.9, 13.3]); accuracy 100.0% vs 87.5% (24/24 vs 21/24).

### `opus-effort-xhigh` vs `opus-effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-low | 24 | **400,732** (247,314–609,011) | 400,732 | 0.465 | 12.5 | 0 in 0 run(s) | 0 | 0 | 0 | 260 | 0 | 87.5% (21/24) | 459,921 |
| opus-effort-xhigh | 24 | **2,580,519** (1,851,949–3,614,272) | 2,580,519 | 2.082 | 34.0 | 0 in 0 run(s) | 0 | 0 | 0 | 795 | 0 | 100.0% (24/24) | 3,005,946 |

Paired difference (`opus-effort-xhigh` − `opus-effort-low`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 2,578,715.3 | [1,824,836.2, 3,510,971.9] | 604.8% | opus-effort-xhigh higher |
| uncached_equivalent | 12 | 2,578,715.3 | [1,836,049.5, 3,485,156.8] | 604.8% | opus-effort-xhigh higher |
| total_cost_usd | 12 | 1.7141 | [1.3296, 2.1806] | 355.8% | opus-effort-xhigh higher |
| num_turns | 12 | 24.4 | [19.6, 29.3] | 206.6% | opus-effort-xhigh higher |

Iso-accuracy subset (10/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 10 | 2,696,454.2 | [1,832,121.9, 3,716,704.1] | 583.9% | opus-effort-xhigh higher |
| uncached_equivalent | 10 | 2,696,454.2 | [1,829,899.9, 3,664,631.0] | 583.9% | opus-effort-xhigh higher |
| total_cost_usd | 10 | 1.7868 | [1.3726, 2.2909] | 343.2% | opus-effort-xhigh higher |
| num_turns | 10 | 24.9 | [19.5, 30.3] | 201.4% | opus-effort-xhigh higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 1,682,973.2 | [1,188,917.8, 2,271,525.5] | 587.3% | opus-effort-xhigh higher |
| implement | 6 | 3,474,457.3 | [2,381,000.7, 4,709,046.4] | 622.3% | opus-effort-xhigh higher |

**Verdict.** `opus-effort-xhigh` vs `opus-effort-low` over 12 paired tasks: tokens higher by 2,578,715 (95% CI [1,824,836, 3,510,972]); cost higher by 1.7141 (95% CI [1.3296, 2.1806]); turns higher by 24.4 (95% CI [19.6, 29.3]); accuracy 100.0% vs 87.5% (24/24 vs 21/24).

### `effort-xhigh` vs `effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low | 24 | **330,040** (216,723–535,561) | 330,040 | 0.241 | 10.5 | 0 in 0 run(s) | 5 | 0 | 0 | 224 | 0 | 95.8% (23/24) | 395,136 |
| effort-xhigh | 24 | **1,913,944** (820,022–2,676,812) | 1,913,944 | 1.268 | 26.0 | 0 in 0 run(s) | 12 | 0 | 0 | 586 | 0 | 95.8% (23/24) | 2,361,792 |

Paired difference (`effort-xhigh` − `effort-low`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 1,885,852.2 | [973,286.9, 3,071,163.5] | 480.4% | effort-xhigh higher |
| uncached_equivalent | 12 | 1,885,852.2 | [1,008,954.2, 3,025,230.8] | 480.4% | effort-xhigh higher |
| total_cost_usd | 12 | 0.9474 | [0.5827, 1.3879] | 319.3% | effort-xhigh higher |
| num_turns | 12 | 17.5 | [11.3, 24.3] | 164.7% | effort-xhigh higher |

Iso-accuracy subset (11/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 11 | 2,031,176.0 | [1,063,582.4, 3,234,217.6] | 509.9% | effort-xhigh higher |
| uncached_equivalent | 11 | 2,031,176.0 | [1,098,585.8, 3,323,460.3] | 509.9% | effort-xhigh higher |
| total_cost_usd | 11 | 1.0176 | [0.6454, 1.4516] | 337.2% | effort-xhigh higher |
| num_turns | 11 | 18.6 | [11.7, 25.8] | 173.0% | effort-xhigh higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 892,845.2 | [285,531.3, 1,655,662.8] | 450.0% | effort-xhigh higher |
| implement | 6 | 2,878,859.3 | [1,543,068.4, 4,717,575.7] | 510.8% | effort-xhigh higher |

**Verdict.** `effort-xhigh` vs `effort-low` over 12 paired tasks: tokens higher by 1,885,852 (95% CI [973,287, 3,071,163]); cost higher by 0.9474 (95% CI [0.5827, 1.3879]); turns higher by 17.5 (95% CI [11.3, 24.3]); accuracy 95.8% vs 95.8% (23/24 vs 23/24).

### `sonnet55-effort-low` vs `effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low | 24 | **330,040** (216,723–535,561) | 330,040 | 0.241 | 10.5 | 0 in 0 run(s) | 5 | 0 | 0 | 224 | 0 | 95.8% (23/24) | 395,136 |
| sonnet55-effort-low | 24 | **323,277** (230,760–529,700) | 323,277 | 0.259 | 10.5 | 0 in 0 run(s) | 4 | 0 | 0 | 228 | 0 | 91.7% (22/24) | 388,470 |

Paired difference (`sonnet55-effort-low` − `effort-low`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | -12,059.2 | [-44,291.0, 17,763.1] | 0.3% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 12 | -12,059.2 | [-44,552.4, 17,872.8] | 0.3% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 12 | -0.0030 | [-0.0135, 0.0057] | -0.5% | **CI crosses 0 — no detectable difference** |
| num_turns | 12 | 0.0 | [-0.8, 0.7] | 1.9% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (10/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 10 | -21,041.0 | [-57,885.7, 13,023.9] | -2.7% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 10 | -21,041.0 | [-54,807.5, 12,096.1] | -2.7% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 10 | -0.0052 | [-0.0172, 0.0045] | -1.5% | **CI crosses 0 — no detectable difference** |
| num_turns | 10 | -0.2 | [-1.1, 0.7] | -0.2% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 11,243.9 | [-15,327.4, 33,937.2] | 6.1% | **CI crosses 0 — no detectable difference** |
| implement | 6 | -35,362.3 | [-84,213.9, 14,520.4] | -5.5% | **CI crosses 0 — no detectable difference** |

**Verdict.** `sonnet55-effort-low` vs `effort-low` over 12 paired tasks: tokens no detectable difference; cost no detectable difference; turns no detectable difference; accuracy 91.7% vs 95.8% (22/24 vs 23/24).

### `sonnet55-effort-medium` vs `effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-medium | 24 | **399,480** (263,209–599,805) | 399,480 | 0.312 | 11.0 | 0 in 0 run(s) | 6 | 0 | 0 | 242 | 0 | 91.7% (22/24) | 462,834 |
| sonnet55-effort-medium | 24 | **345,412** (211,963–514,193) | 345,412 | 0.262 | 9.5 | 0 in 0 run(s) | 3 | 0 | 0 | 210 | 0 | 83.3% (20/24) | 418,415 |

Paired difference (`sonnet55-effort-medium` − `effort-medium`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | -62,118.6 | [-108,823.7, -9,522.9] | -12.9% | sonnet55-effort-medium lower |
| uncached_equivalent | 12 | -62,118.6 | [-109,914.9, -9,817.9] | -12.9% | sonnet55-effort-medium lower |
| total_cost_usd | 12 | -0.0142 | [-0.0345, 0.0065] | -3.6% | **CI crosses 0 — no detectable difference** |
| num_turns | 12 | -1.4 | [-2.3, -0.5] | -11.7% | sonnet55-effort-medium lower |

Iso-accuracy subset (9/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | -71,340.5 | [-133,217.8, -3,594.2] | -12.0% | sonnet55-effort-medium lower |
| uncached_equivalent | 9 | -71,340.5 | [-135,012.0, -2,447.1] | -12.0% | sonnet55-effort-medium lower |
| total_cost_usd | 9 | -0.0176 | [-0.0424, 0.0106] | -4.1% | **CI crosses 0 — no detectable difference** |
| num_turns | 9 | -1.6 | [-2.6, -0.2] | -11.6% | sonnet55-effort-medium lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | -33,107.5 | [-76,913.5, 1,981.8] | -11.5% | **CI crosses 0 — no detectable difference** |
| implement | 6 | -91,129.7 | [-158,264.2, 3,398.2] | -14.3% | **CI crosses 0 — no detectable difference** |

**Verdict.** `sonnet55-effort-medium` vs `effort-medium` over 12 paired tasks: tokens lower by 62,119 (95% CI [-108,824, -9,523]); cost no detectable difference; turns lower by 1.4 (95% CI [-2.3, -0.5]); accuracy 83.3% vs 91.7% (20/24 vs 22/24).

### `sonnet55-effort-high` vs `effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-high | 24 | **636,648** (332,688–1,234,647) | 636,648 | 0.423 | 14.0 | 0 in 0 run(s) | 0 | 0 | 0 | 337 | 0 | 100.0% (24/24) | 777,121 |
| sonnet55-effort-high | 24 | **636,848** (308,725–1,163,335) | 636,848 | 0.438 | 14.5 | 0 in 0 run(s) | 2 | 0 | 0 | 324 | 0 | 91.7% (22/24) | 783,237 |

Paired difference (`sonnet55-effort-high` − `effort-high`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | -39,959.9 | [-104,917.3, 25,123.1] | -5.4% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 12 | -39,959.9 | [-106,039.7, 23,393.9] | -5.4% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 12 | -0.0079 | [-0.0343, 0.0177] | -1.8% | **CI crosses 0 — no detectable difference** |
| num_turns | 12 | -0.4 | [-1.5, 0.8] | -1.7% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (11/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 11 | -41,339.3 | [-117,649.3, 26,322.1] | -5.1% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 11 | -41,339.3 | [-114,778.8, 29,836.4] | -5.1% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 11 | -0.0087 | [-0.0374, 0.0199] | -2.1% | **CI crosses 0 — no detectable difference** |
| num_turns | 11 | -0.4 | [-1.7, 0.8] | -1.8% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | -27,071.5 | [-108,917.8, 61,037.8] | -5.5% | **CI crosses 0 — no detectable difference** |
| implement | 6 | -52,848.3 | [-155,203.2, 41,657.8] | -5.4% | **CI crosses 0 — no detectable difference** |

**Verdict.** `sonnet55-effort-high` vs `effort-high` over 12 paired tasks: tokens no detectable difference; cost no detectable difference; turns no detectable difference; accuracy 91.7% vs 100.0% (22/24 vs 24/24).

### `sonnet55-effort-xhigh` vs `effort-xhigh`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-xhigh | 24 | **1,913,944** (820,022–2,676,812) | 1,913,944 | 1.268 | 26.0 | 0 in 0 run(s) | 12 | 0 | 0 | 586 | 0 | 95.8% (23/24) | 2,361,792 |
| sonnet55-effort-xhigh | 24 | **1,641,541** (844,282–3,320,025) | 1,641,541 | 1.051 | 23.5 | 0 in 0 run(s) | 19 | 0 | 0 | 573 | 0 | 95.8% (23/24) | 2,209,860 |

Paired difference (`sonnet55-effort-xhigh` − `effort-xhigh`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | -142,960.5 | [-511,124.9, 165,573.6] | -0.0% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 12 | -142,960.5 | [-500,612.2, 162,846.2] | -0.0% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 12 | -0.0549 | [-0.1562, 0.0486] | -2.6% | **CI crosses 0 — no detectable difference** |
| num_turns | 12 | 0.3 | [-2.3, 3.6] | 2.4% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (11/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 11 | -159,380.8 | [-546,311.4, 185,056.1] | -0.8% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 11 | -159,380.8 | [-546,378.9, 189,047.8] | -0.8% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 11 | -0.0615 | [-0.1746, 0.0476] | -3.3% | **CI crosses 0 — no detectable difference** |
| num_turns | 11 | 0.3 | [-2.6, 4.0] | 2.3% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | -112,019.6 | [-325,723.0, 66,723.3] | 0.3% | **CI crosses 0 — no detectable difference** |
| implement | 6 | -173,901.3 | [-854,548.1, 456,972.3] | -0.4% | **CI crosses 0 — no detectable difference** |

**Verdict.** `sonnet55-effort-xhigh` vs `effort-xhigh` over 12 paired tasks: tokens no detectable difference; cost no detectable difference; turns no detectable difference; accuracy 95.8% vs 95.8% (23/24 vs 23/24).

### `opus-effort-low` vs `sonnet55-effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-low | 24 | **323,277** (230,760–529,700) | 323,277 | 0.259 | 10.5 | 0 in 0 run(s) | 4 | 0 | 0 | 228 | 0 | 91.7% (22/24) | 388,470 |
| opus-effort-low | 24 | **400,732** (247,314–609,011) | 400,732 | 0.465 | 12.5 | 0 in 0 run(s) | 0 | 0 | 0 | 260 | 0 | 87.5% (21/24) | 459,921 |

Paired difference (`opus-effort-low` − `sonnet55-effort-low`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 51,307.8 | [2,463.3, 99,302.7] | 18.3% | opus-effort-low higher |
| uncached_equivalent | 12 | 51,307.8 | [3,219.3, 98,347.9] | 18.3% | opus-effort-low higher |
| total_cost_usd | 12 | 0.2161 | [0.1710, 0.2642] | 81.1% | opus-effort-low higher |
| num_turns | 12 | 1.1 | [-0.1, 2.3] | 13.5% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (9/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | 41,187.9 | [-17,382.6, 102,411.2] | 12.7% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 9 | 41,187.9 | [-16,824.0, 101,603.9] | 12.7% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 9 | 0.2263 | [0.1702, 0.2827] | 75.1% | opus-effort-low higher |
| num_turns | 9 | 0.8 | [-0.7, 2.2] | 9.1% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 52,553.6 | [-15,798.5, 111,858.6] | 28.8% | **CI crosses 0 — no detectable difference** |
| implement | 6 | 50,062.0 | [-21,184.3, 116,037.2] | 7.8% | **CI crosses 0 — no detectable difference** |

**Verdict.** `opus-effort-low` vs `sonnet55-effort-low` over 12 paired tasks: tokens higher by 51,308 (95% CI [2,463, 99,303]); cost higher by 0.2161 (95% CI [0.1710, 0.2642]); turns no detectable difference; accuracy 87.5% vs 91.7% (21/24 vs 22/24).

### `opus-effort-medium` vs `sonnet55-effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-medium | 24 | **345,412** (211,963–514,193) | 345,412 | 0.262 | 9.5 | 0 in 0 run(s) | 3 | 0 | 0 | 210 | 0 | 83.3% (20/24) | 418,415 |
| opus-effort-medium | 24 | **770,222** (435,641–1,303,513) | 770,222 | 0.850 | 18.5 | 0 in 0 run(s) | 0 | 0 | 0 | 427 | 0 | 95.8% (23/24) | 1,062,637 |

Paired difference (`opus-effort-medium` − `sonnet55-effort-medium`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 652,538.9 | [337,338.2, 1,045,899.0] | 147.4% | opus-effort-medium higher |
| uncached_equivalent | 12 | 652,538.9 | [345,734.6, 1,021,288.0] | 147.4% | opus-effort-medium higher |
| total_cost_usd | 12 | 0.6179 | [0.4387, 0.8156] | 196.4% | opus-effort-medium higher |
| num_turns | 12 | 9.0 | [5.8, 13.1] | 84.3% | opus-effort-medium higher |

Iso-accuracy subset (9/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | 822,821.1 | [470,679.0, 1,250,897.1] | 168.9% | opus-effort-medium higher |
| uncached_equivalent | 9 | 822,821.1 | [458,437.1, 1,248,380.3] | 168.9% | opus-effort-medium higher |
| total_cost_usd | 9 | 0.7301 | [0.5435, 0.9477] | 201.6% | opus-effort-medium higher |
| num_turns | 9 | 10.8 | [7.2, 15.3] | 94.8% | opus-effort-medium higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 265,374.3 | [169,680.3, 386,749.1] | 105.2% | opus-effort-medium higher |
| implement | 6 | 1,039,703.5 | [589,449.8, 1,571,740.0] | 189.7% | opus-effort-medium higher |

**Verdict.** `opus-effort-medium` vs `sonnet55-effort-medium` over 12 paired tasks: tokens higher by 652,539 (95% CI [337,338, 1,045,899]); cost higher by 0.6179 (95% CI [0.4387, 0.8156]); turns higher by 9.0 (95% CI [5.8, 13.1]); accuracy 95.8% vs 83.3% (23/24 vs 20/24).

### `opus-effort-high` vs `sonnet55-effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-high | 24 | **636,848** (308,725–1,163,335) | 636,848 | 0.438 | 14.5 | 0 in 0 run(s) | 2 | 0 | 0 | 324 | 0 | 91.7% (22/24) | 783,237 |
| opus-effort-high | 24 | **1,373,094** (628,861–1,967,737) | 1,373,094 | 1.237 | 22.5 | 0 in 0 run(s) | 1 | 0 | 0 | 495 | 0 | 100.0% (24/24) | 1,361,655 |

Paired difference (`opus-effort-high` − `sonnet55-effort-high`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 624,493.8 | [387,730.3, 915,207.2] | 90.3% | opus-effort-high higher |
| uncached_equivalent | 12 | 624,493.8 | [391,865.9, 932,698.1] | 90.3% | opus-effort-high higher |
| total_cost_usd | 12 | 0.6673 | [0.5124, 0.8514] | 149.8% | opus-effort-high higher |
| num_turns | 12 | 7.3 | [5.1, 9.7] | 50.1% | opus-effort-high higher |

Iso-accuracy subset (11/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 11 | 668,713.2 | [430,814.1, 971,817.1] | 93.0% | opus-effort-high higher |
| uncached_equivalent | 11 | 668,713.2 | [431,603.5, 978,268.7] | 93.0% | opus-effort-high higher |
| total_cost_usd | 11 | 0.7047 | [0.5504, 0.8967] | 151.2% | opus-effort-high higher |
| num_turns | 11 | 7.8 | [5.4, 10.3] | 52.6% | opus-effort-high higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 401,134.2 | [203,280.3, 641,273.4] | 98.6% | opus-effort-high higher |
| implement | 6 | 847,853.5 | [494,519.7, 1,325,329.6] | 81.9% | opus-effort-high higher |

**Verdict.** `opus-effort-high` vs `sonnet55-effort-high` over 12 paired tasks: tokens higher by 624,494 (95% CI [387,730, 915,207]); cost higher by 0.6673 (95% CI [0.5124, 0.8514]); turns higher by 7.3 (95% CI [5.1, 9.7]); accuracy 100.0% vs 91.7% (24/24 vs 22/24).

### `opus-effort-xhigh` vs `sonnet55-effort-xhigh`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-xhigh | 24 | **1,641,541** (844,282–3,320,025) | 1,641,541 | 1.051 | 23.5 | 0 in 0 run(s) | 19 | 0 | 0 | 573 | 0 | 95.8% (23/24) | 2,209,860 |
| opus-effort-xhigh | 24 | **2,580,519** (1,851,949–3,614,272) | 2,580,519 | 2.082 | 34.0 | 0 in 0 run(s) | 0 | 0 | 0 | 795 | 0 | 100.0% (24/24) | 3,005,946 |

Paired difference (`opus-effort-xhigh` − `sonnet55-effort-xhigh`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 875,072.1 | [643,656.7, 1,116,608.7] | 87.0% | opus-effort-xhigh higher |
| uncached_equivalent | 12 | 875,072.1 | [627,287.7, 1,121,256.8] | 87.0% | opus-effort-xhigh higher |
| total_cost_usd | 12 | 1.0349 | [0.8753, 1.1922] | 134.1% | opus-effort-xhigh higher |
| num_turns | 12 | 7.8 | [3.9, 11.4] | 43.6% | opus-effort-xhigh higher |

Iso-accuracy subset (11/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 11 | 902,160.9 | [653,042.7, 1,158,435.2] | 84.6% | opus-effort-xhigh higher |
| uncached_equivalent | 11 | 902,160.9 | [641,165.6, 1,159,446.8] | 84.6% | opus-effort-xhigh higher |
| total_cost_usd | 11 | 1.0737 | [0.9260, 1.2332] | 129.8% | opus-effort-xhigh higher |
| num_turns | 11 | 7.6 | [3.4, 11.5] | 41.2% | opus-effort-xhigh higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 965,945.1 | [605,268.3, 1,317,274.8] | 140.9% | opus-effort-xhigh higher |
| implement | 6 | 784,199.2 | [466,745.1, 1,075,025.0] | 33.1% | opus-effort-xhigh higher |

**Verdict.** `opus-effort-xhigh` vs `sonnet55-effort-xhigh` over 12 paired tasks: tokens higher by 875,072 (95% CI [643,657, 1,116,609]); cost higher by 1.0349 (95% CI [0.8753, 1.1922]); turns higher by 7.8 (95% CI [3.9, 11.4]); accuracy 100.0% vs 95.8% (24/24 vs 23/24).

### `grok-effort-low` vs `effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low | 24 | **330,040** (216,723–535,561) | 330,040 | 0.241 | 10.5 | 0 in 0 run(s) | 5 | 0 | 0 | 224 | 0 | 95.8% (23/24) | 395,136 |
| grok-effort-low | 24 | **1,235,540** (632,916–1,783,578) | 1,235,540 | 0.305 | 25.5 | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | 95.8% (23/24) | 1,321,539 |

Paired difference (`grok-effort-low` − `effort-low`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 899,499.2 | [638,200.4, 1,155,426.3] | 258.0% | grok-effort-low higher |
| uncached_equivalent | 12 | 899,499.2 | [636,985.0, 1,176,577.9] | 258.0% | grok-effort-low higher |
| total_cost_usd | 12 | 0.0230 | [-0.0192, 0.0727] | 15.0% | **CI crosses 0 — no detectable difference** |
| num_turns | 12 | 13.5 | [10.4, 16.5] | 134.1% | grok-effort-low higher |

Iso-accuracy subset (11/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 11 | 950,448.3 | [680,238.8, 1,211,580.4] | 264.8% | grok-effort-low higher |
| uncached_equivalent | 11 | 950,448.3 | [676,861.0, 1,211,564.4] | 264.8% | grok-effort-low higher |
| total_cost_usd | 11 | 0.0236 | [-0.0219, 0.0776] | 15.3% | **CI crosses 0 — no detectable difference** |
| num_turns | 11 | 14.0 | [10.9, 17.0] | 136.0% | grok-effort-low higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 629,271.3 | [319,086.3, 1,009,288.8] | 303.3% | grok-effort-low higher |
| implement | 6 | 1,169,727.1 | [930,439.0, 1,429,854.0] | 212.7% | grok-effort-low higher |

**Verdict.** `grok-effort-low` vs `effort-low` over 12 paired tasks: tokens higher by 899,499 (95% CI [638,200, 1,155,426]); cost no detectable difference; turns higher by 13.5 (95% CI [10.4, 16.5]); accuracy 95.8% vs 95.8% (23/24 vs 23/24).

### `grok-effort-medium` vs `effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-medium | 24 | **399,480** (263,209–599,805) | 399,480 | 0.312 | 11.0 | 0 in 0 run(s) | 6 | 0 | 0 | 242 | 0 | 91.7% (22/24) | 462,834 |
| grok-effort-medium | 24 | **3,344,034** (1,985,895–4,671,118) | 3,344,034 | 0.732 | 39.0 | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | 95.8% (23/24) | 3,377,635 |

Paired difference (`grok-effort-medium` − `effort-medium`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 2,959,101.9 | [2,186,244.0, 3,757,239.5] | 674.0% | grok-effort-medium higher |
| uncached_equivalent | 12 | 2,959,101.9 | [2,132,124.5, 3,716,971.1] | 674.0% | grok-effort-medium higher |
| total_cost_usd | 12 | 0.4306 | [0.3109, 0.5483] | 138.5% | grok-effort-medium higher |
| num_turns | 12 | 27.5 | [22.6, 32.3] | 238.2% | grok-effort-medium higher |

Iso-accuracy subset (10/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 10 | 3,035,360.4 | [2,128,018.4, 3,944,538.7] | 685.4% | grok-effort-medium higher |
| uncached_equivalent | 10 | 3,035,360.4 | [2,186,476.2, 3,877,720.1] | 685.4% | grok-effort-medium higher |
| total_cost_usd | 10 | 0.4524 | [0.3182, 0.5912] | 142.6% | grok-effort-medium higher |
| num_turns | 10 | 27.9 | [22.1, 33.0] | 238.1% | grok-effort-medium higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 2,033,282.4 | [1,247,728.7, 3,066,677.1] | 699.8% | grok-effort-medium higher |
| implement | 6 | 3,884,921.3 | [3,127,143.8, 4,621,817.5] | 648.2% | grok-effort-medium higher |

**Verdict.** `grok-effort-medium` vs `effort-medium` over 12 paired tasks: tokens higher by 2,959,102 (95% CI [2,186,244, 3,757,239]); cost higher by 0.4306 (95% CI [0.3109, 0.5483]); turns higher by 27.5 (95% CI [22.6, 32.3]); accuracy 95.8% vs 91.7% (23/24 vs 22/24).

### `grok-effort-high` vs `effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-high | 24 | **636,648** (332,688–1,234,647) | 636,648 | 0.423 | 14.0 | 0 in 0 run(s) | 0 | 0 | 0 | 337 | 0 | 100.0% (24/24) | 777,121 |
| grok-effort-high | 24 | **5,142,021** (3,774,437–6,881,545) | 5,142,021 | 1.169 | 48.5 | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | 100.0% (24/24) | 5,236,046 |

Paired difference (`grok-effort-high` − `effort-high`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 4,458,925.0 | [3,738,858.1, 5,141,050.3] | 730.5% | grok-effort-high higher |
| uncached_equivalent | 12 | 4,458,925.0 | [3,728,359.8, 5,182,403.1] | 730.5% | grok-effort-high higher |
| total_cost_usd | 12 | 0.6301 | [0.5346, 0.7176] | 158.7% | grok-effort-high higher |
| num_turns | 12 | 34.3 | [30.7, 38.2] | 252.6% | grok-effort-high higher |

Iso-accuracy subset (12/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 4,458,925.0 | [3,733,630.0, 5,135,537.6] | 730.5% | grok-effort-high higher |
| uncached_equivalent | 12 | 4,458,925.0 | [3,688,287.9, 5,185,236.5] | 730.5% | grok-effort-high higher |
| total_cost_usd | 12 | 0.6301 | [0.5335, 0.7235] | 158.7% | grok-effort-high higher |
| num_turns | 12 | 34.3 | [30.8, 37.8] | 252.6% | grok-effort-high higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 3,551,123.2 | [2,734,075.8, 4,380,652.6] | 921.6% | grok-effort-high higher |
| implement | 6 | 5,366,726.9 | [4,764,066.4, 5,936,643.3] | 539.5% | grok-effort-high higher |

**Verdict.** `grok-effort-high` vs `effort-high` over 12 paired tasks: tokens higher by 4,458,925 (95% CI [3,738,858, 5,141,050]); cost higher by 0.6301 (95% CI [0.5346, 0.7176]); turns higher by 34.3 (95% CI [30.7, 38.2]); accuracy 100.0% vs 100.0% (24/24 vs 24/24).

### `grok-effort-low` vs `sonnet55-effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-low | 24 | **323,277** (230,760–529,700) | 323,277 | 0.259 | 10.5 | 0 in 0 run(s) | 4 | 0 | 0 | 228 | 0 | 91.7% (22/24) | 388,470 |
| grok-effort-low | 24 | **1,235,540** (632,916–1,783,578) | 1,235,540 | 0.305 | 25.5 | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | 95.8% (23/24) | 1,321,539 |

Paired difference (`grok-effort-low` − `sonnet55-effort-low`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 911,558.4 | [624,544.9, 1,180,273.6] | 254.9% | grok-effort-low higher |
| uncached_equivalent | 12 | 911,558.4 | [651,748.9, 1,202,776.0] | 254.9% | grok-effort-low higher |
| total_cost_usd | 12 | 0.0260 | [-0.0137, 0.0751] | 15.3% | **CI crosses 0 — no detectable difference** |
| num_turns | 12 | 13.5 | [10.5, 16.7] | 131.2% | grok-effort-low higher |

Iso-accuracy subset (10/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 10 | 973,219.2 | [646,137.9, 1,275,874.2] | 259.2% | grok-effort-low higher |
| uncached_equivalent | 10 | 973,219.2 | [669,463.1, 1,278,432.8] | 259.2% | grok-effort-low higher |
| total_cost_usd | 10 | 0.0222 | [-0.0263, 0.0776] | 14.2% | **CI crosses 0 — no detectable difference** |
| num_turns | 10 | 14.0 | [10.5, 17.5] | 132.8% | grok-effort-low higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 618,027.4 | [310,245.4, 985,200.1] | 275.4% | grok-effort-low higher |
| implement | 6 | 1,205,089.3 | [959,461.3, 1,474,524.2] | 234.4% | grok-effort-low higher |

**Verdict.** `grok-effort-low` vs `sonnet55-effort-low` over 12 paired tasks: tokens higher by 911,558 (95% CI [624,545, 1,180,274]); cost no detectable difference; turns higher by 13.5 (95% CI [10.5, 16.7]); accuracy 95.8% vs 91.7% (23/24 vs 22/24).

### `grok-effort-medium` vs `sonnet55-effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-medium | 24 | **345,412** (211,963–514,193) | 345,412 | 0.262 | 9.5 | 0 in 0 run(s) | 3 | 0 | 0 | 210 | 0 | 83.3% (20/24) | 418,415 |
| grok-effort-medium | 24 | **3,344,034** (1,985,895–4,671,118) | 3,344,034 | 0.732 | 39.0 | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | 95.8% (23/24) | 3,377,635 |

Paired difference (`grok-effort-medium` − `sonnet55-effort-medium`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 3,021,220.5 | [2,234,089.4, 3,832,985.9] | 821.2% | grok-effort-medium higher |
| uncached_equivalent | 12 | 3,021,220.5 | [2,233,794.7, 3,825,867.3] | 821.2% | grok-effort-medium higher |
| total_cost_usd | 12 | 0.4448 | [0.3251, 0.5727] | 152.3% | grok-effort-medium higher |
| num_turns | 12 | 29.0 | [23.5, 34.3] | 291.9% | grok-effort-medium higher |

Iso-accuracy subset (8/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 8 | 3,596,250.8 | [2,769,285.5, 4,418,537.7] | 890.6% | grok-effort-medium higher |
| uncached_equivalent | 8 | 3,596,250.8 | [2,778,097.7, 4,424,534.9] | 890.6% | grok-effort-medium higher |
| total_cost_usd | 8 | 0.5445 | [0.4208, 0.6696] | 173.3% | grok-effort-medium higher |
| num_turns | 8 | 32.7 | [27.4, 37.9] | 310.0% | grok-effort-medium higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 2,066,389.9 | [1,291,481.1, 3,066,478.4] | 839.5% | grok-effort-medium higher |
| implement | 6 | 3,976,051.0 | [3,198,956.9, 4,722,324.2] | 802.8% | grok-effort-medium higher |

**Verdict.** `grok-effort-medium` vs `sonnet55-effort-medium` over 12 paired tasks: tokens higher by 3,021,220 (95% CI [2,234,089, 3,832,986]); cost higher by 0.4448 (95% CI [0.3251, 0.5727]); turns higher by 29.0 (95% CI [23.5, 34.3]); accuracy 95.8% vs 83.3% (23/24 vs 20/24).

### `grok-effort-high` vs `sonnet55-effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-high | 24 | **636,848** (308,725–1,163,335) | 636,848 | 0.438 | 14.5 | 0 in 0 run(s) | 2 | 0 | 0 | 324 | 0 | 91.7% (22/24) | 783,237 |
| grok-effort-high | 24 | **5,142,021** (3,774,437–6,881,545) | 5,142,021 | 1.169 | 48.5 | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | 100.0% (24/24) | 5,236,046 |

Paired difference (`grok-effort-high` − `sonnet55-effort-high`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 4,498,885.0 | [3,729,282.0, 5,226,680.3] | 795.1% | grok-effort-high higher |
| uncached_equivalent | 12 | 4,498,885.0 | [3,717,133.2, 5,237,791.6] | 795.1% | grok-effort-high higher |
| total_cost_usd | 12 | 0.6380 | [0.5487, 0.7231] | 164.9% | grok-effort-high higher |
| num_turns | 12 | 34.7 | [30.9, 38.6] | 262.8% | grok-effort-high higher |

Iso-accuracy subset (11/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 11 | 4,726,679.1 | [4,040,274.6, 5,347,849.2] | 788.7% | grok-effort-high higher |
| uncached_equivalent | 11 | 4,726,679.1 | [4,083,363.8, 5,364,439.1] | 788.7% | grok-effort-high higher |
| total_cost_usd | 11 | 0.6675 | [0.5872, 0.7429] | 164.9% | grok-effort-high higher |
| num_turns | 11 | 35.6 | [31.9, 39.5] | 261.4% | grok-effort-high higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 3,578,194.7 | [2,740,387.3, 4,503,868.2] | 999.8% | grok-effort-high higher |
| implement | 6 | 5,419,575.3 | [4,861,600.2, 5,975,004.9] | 590.4% | grok-effort-high higher |

**Verdict.** `grok-effort-high` vs `sonnet55-effort-high` over 12 paired tasks: tokens higher by 4,498,885 (95% CI [3,729,282, 5,226,680]); cost higher by 0.6380 (95% CI [0.5487, 0.7231]); turns higher by 34.7 (95% CI [30.9, 38.6]); accuracy 100.0% vs 91.7% (24/24 vs 22/24).

### `grok-effort-low` vs `opus-effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-low | 24 | **400,732** (247,314–609,011) | 400,732 | 0.465 | 12.5 | 0 in 0 run(s) | 0 | 0 | 0 | 260 | 0 | 87.5% (21/24) | 459,921 |
| grok-effort-low | 24 | **1,235,540** (632,916–1,783,578) | 1,235,540 | 0.305 | 25.5 | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | 95.8% (23/24) | 1,321,539 |

Paired difference (`grok-effort-low` − `opus-effort-low`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 860,250.6 | [597,979.3, 1,117,957.2] | 205.1% | grok-effort-low higher |
| uncached_equivalent | 12 | 860,250.6 | [613,524.2, 1,116,621.2] | 205.1% | grok-effort-low higher |
| total_cost_usd | 12 | -0.1901 | [-0.2607, -0.1206] | -36.2% | grok-effort-low lower |
| num_turns | 12 | 12.4 | [9.3, 15.3] | 107.0% | grok-effort-low higher |

Iso-accuracy subset (10/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 10 | 866,302.9 | [576,431.2, 1,136,854.6] | 187.8% | grok-effort-low higher |
| uncached_equivalent | 10 | 866,302.9 | [590,971.9, 1,135,077.1] | 187.8% | grok-effort-low higher |
| total_cost_usd | 10 | -0.2233 | [-0.2907, -0.1577] | -41.0% | grok-effort-low lower |
| num_turns | 10 | 12.3 | [8.9, 15.5] | 101.1% | grok-effort-low higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 565,473.8 | [277,174.6, 941,243.7] | 194.2% | grok-effort-low higher |
| implement | 6 | 1,155,027.3 | [943,244.7, 1,399,561.3] | 216.0% | grok-effort-low higher |

**Verdict.** `grok-effort-low` vs `opus-effort-low` over 12 paired tasks: tokens higher by 860,251 (95% CI [597,979, 1,117,957]); cost lower by 0.1901 (95% CI [-0.2607, -0.1206]); turns higher by 12.4 (95% CI [9.3, 15.3]); accuracy 95.8% vs 87.5% (23/24 vs 21/24).

### `grok-effort-medium` vs `opus-effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-medium | 24 | **770,222** (435,641–1,303,513) | 770,222 | 0.850 | 18.5 | 0 in 0 run(s) | 0 | 0 | 0 | 427 | 0 | 95.8% (23/24) | 1,062,637 |
| grok-effort-medium | 24 | **3,344,034** (1,985,895–4,671,118) | 3,344,034 | 0.732 | 39.0 | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | 95.8% (23/24) | 3,377,635 |

Paired difference (`grok-effort-medium` − `opus-effort-medium`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 2,368,681.6 | [1,705,520.5, 3,052,677.4] | 295.9% | grok-effort-medium higher |
| uncached_equivalent | 12 | 2,368,681.6 | [1,662,658.9, 3,061,511.8] | 295.9% | grok-effort-medium higher |
| total_cost_usd | 12 | -0.1731 | [-0.3510, -0.0317] | -14.1% | grok-effort-medium lower |
| num_turns | 12 | 20.0 | [14.3, 24.8] | 120.0% | grok-effort-medium higher |

Iso-accuracy subset (10/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 10 | 2,383,653.6 | [1,611,591.5, 3,153,864.6] | 284.0% | grok-effort-medium higher |
| uncached_equivalent | 10 | 2,383,653.6 | [1,647,676.5, 3,150,385.3] | 284.0% | grok-effort-medium higher |
| total_cost_usd | 10 | -0.1856 | [-0.3999, -0.0176] | -15.2% | grok-effort-medium lower |
| num_turns | 10 | 19.7 | [13.4, 25.6] | 116.4% | grok-effort-medium higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 1,801,015.7 | [1,136,391.3, 2,752,811.7] | 348.5% | grok-effort-medium higher |
| implement | 6 | 2,936,347.5 | [2,014,880.6, 3,679,129.3] | 243.2% | grok-effort-medium higher |

**Verdict.** `grok-effort-medium` vs `opus-effort-medium` over 12 paired tasks: tokens higher by 2,368,682 (95% CI [1,705,520, 3,052,677]); cost lower by 0.1731 (95% CI [-0.3510, -0.0317]); turns higher by 20.0 (95% CI [14.3, 24.8]); accuracy 95.8% vs 95.8% (23/24 vs 23/24).

### `grok-effort-high` vs `opus-effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-high | 24 | **1,373,094** (628,861–1,967,737) | 1,373,094 | 1.237 | 22.5 | 0 in 0 run(s) | 1 | 0 | 0 | 495 | 0 | 100.0% (24/24) | 1,361,655 |
| grok-effort-high | 24 | **5,142,021** (3,774,437–6,881,545) | 5,142,021 | 1.169 | 48.5 | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | 100.0% (24/24) | 5,236,046 |

Paired difference (`grok-effort-high` − `opus-effort-high`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 3,874,391.1 | [3,163,483.4, 4,532,570.9] | 383.0% | grok-effort-high higher |
| uncached_equivalent | 12 | 3,874,391.1 | [3,191,702.9, 4,543,652.0] | 383.0% | grok-effort-high higher |
| total_cost_usd | 12 | -0.0293 | [-0.2337, 0.1230] | 6.1% | **CI crosses 0 — no detectable difference** |
| num_turns | 12 | 27.4 | [22.6, 31.8] | 146.4% | grok-effort-high higher |

Iso-accuracy subset (12/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 3,874,391.1 | [3,191,389.1, 4,594,027.6] | 383.0% | grok-effort-high higher |
| uncached_equivalent | 12 | 3,874,391.1 | [3,171,789.7, 4,537,719.0] | 383.0% | grok-effort-high higher |
| total_cost_usd | 12 | -0.0293 | [-0.2220, 0.1180] | 6.1% | **CI crosses 0 — no detectable difference** |
| num_turns | 12 | 27.4 | [22.8, 31.8] | 146.4% | grok-effort-high higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 3,177,060.5 | [2,517,586.7, 3,915,884.0] | 473.6% | grok-effort-high higher |
| implement | 6 | 4,571,721.8 | [3,659,542.9, 5,369,288.8] | 292.4% | grok-effort-high higher |

**Verdict.** `grok-effort-high` vs `opus-effort-high` over 12 paired tasks: tokens higher by 3,874,391 (95% CI [3,163,483, 4,532,571]); cost no detectable difference; turns higher by 27.4 (95% CI [22.6, 31.8]); accuracy 100.0% vs 100.0% (24/24 vs 24/24).

### `haiku55-effort-low` vs `sonnet55-effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-low | 24 | **323,277** (230,760–529,700) | 323,277 | 0.259 | 10.5 | 0 in 0 run(s) | 4 | 0 | 0 | 228 | 0 | 91.7% (22/24) | 388,470 |
| haiku55-effort-low | 24 | **1,042,800** (560,926–1,490,484) | 1,042,800 | 0.036 | 18.0 | 0 in 0 run(s) | 10 | 0 | 0 | 360 | 0 | 87.5% (21/24) | 1,151,932 |

Paired difference (`haiku55-effort-low` − `sonnet55-effort-low`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 729,357.2 | [494,202.0, 998,048.8] | 194.0% | haiku55-effort-low higher |
| uncached_equivalent | 12 | 729,357.2 | [480,012.3, 1,002,307.3] | 194.0% | haiku55-effort-low higher |
| total_cost_usd | 12 | -0.2196 | [-0.2617, -0.1740] | -80.5% | haiku55-effort-low lower |
| num_turns | 12 | 11.6 | [7.2, 16.3] | 105.9% | haiku55-effort-low higher |

Iso-accuracy subset (9/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | 793,368.2 | [509,109.9, 1,097,347.2] | 210.4% | haiku55-effort-low higher |
| uncached_equivalent | 9 | 793,368.2 | [492,796.7, 1,096,454.1] | 210.4% | haiku55-effort-low higher |
| total_cost_usd | 9 | -0.2207 | [-0.2747, -0.1715] | -78.7% | haiku55-effort-low lower |
| num_turns | 9 | 10.8 | [6.2, 16.3] | 100.6% | haiku55-effort-low higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 423,500.3 | [250,199.1, 645,316.7] | 194.1% | haiku55-effort-low higher |
| implement | 6 | 1,035,214.0 | [719,606.0, 1,358,570.3] | 193.9% | haiku55-effort-low higher |

**Verdict.** `haiku55-effort-low` vs `sonnet55-effort-low` over 12 paired tasks: tokens higher by 729,357 (95% CI [494,202, 998,049]); cost lower by 0.2196 (95% CI [-0.2617, -0.1740]); turns higher by 11.6 (95% CI [7.2, 16.3]); accuracy 87.5% vs 91.7% (21/24 vs 22/24).

### `haiku55-effort-medium` vs `sonnet55-effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-medium | 24 | **345,412** (211,963–514,193) | 345,412 | 0.262 | 9.5 | 0 in 0 run(s) | 3 | 0 | 0 | 210 | 0 | 83.3% (20/24) | 418,415 |
| haiku55-effort-medium | 24 | **1,319,879** (922,023–2,563,401) | 1,319,879 | 0.070 | 30.0 | 0 in 0 run(s) | 96 | 0 | 0 | 403 | 0 | 87.5% (21/24) | 1,679,319 |

Paired difference (`haiku55-effort-medium` − `sonnet55-effort-medium`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 1,482,534.6 | [967,451.7, 2,057,784.0] | 365.2% | haiku55-effort-medium higher |
| uncached_equivalent | 12 | 1,482,534.6 | [953,318.8, 2,051,594.9] | 365.2% | haiku55-effort-medium higher |
| total_cost_usd | 12 | -0.1731 | [-0.2005, -0.1458] | -64.2% | haiku55-effort-medium lower |
| num_turns | 12 | 27.4 | [19.2, 36.5] | 264.2% | haiku55-effort-medium higher |

Iso-accuracy subset (7/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 7 | 1,546,794.7 | [923,118.7, 2,243,143.5] | 360.2% | haiku55-effort-medium higher |
| uncached_equivalent | 7 | 1,546,794.7 | [944,584.7, 2,238,281.1] | 360.2% | haiku55-effort-medium higher |
| total_cost_usd | 7 | -0.1874 | [-0.2215, -0.1497] | -63.0% | haiku55-effort-medium lower |
| num_turns | 7 | 26.2 | [17.3, 36.6] | 243.7% | haiku55-effort-medium higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 711,209.8 | [513,550.0, 908,869.7] | 301.3% | haiku55-effort-medium higher |
| implement | 6 | 2,253,859.3 | [1,586,259.9, 2,819,316.9] | 429.2% | haiku55-effort-medium higher |

**Verdict.** `haiku55-effort-medium` vs `sonnet55-effort-medium` over 12 paired tasks: tokens higher by 1,482,535 (95% CI [967,452, 2,057,784]); cost lower by 0.1731 (95% CI [-0.2005, -0.1458]); turns higher by 27.4 (95% CI [19.2, 36.5]); accuracy 87.5% vs 83.3% (21/24 vs 20/24).

### `haiku55-effort-high` vs `sonnet55-effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-high | 24 | **636,848** (308,725–1,163,335) | 636,848 | 0.438 | 14.5 | 0 in 0 run(s) | 2 | 0 | 0 | 324 | 0 | 91.7% (22/24) | 783,237 |
| haiku55-effort-high | 24 | **2,421,312** (1,485,145–3,327,694) | 2,421,312 | 0.193 | 36.0 | 0 in 0 run(s) | 146 | 0 | 0 | 459 | 0 | 91.7% (22/24) | 2,616,875 |

Paired difference (`haiku55-effort-high` − `sonnet55-effort-high`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 1,901,864.0 | [1,423,855.9, 2,436,519.7] | 309.6% | haiku55-effort-high higher |
| uncached_equivalent | 12 | 1,901,864.0 | [1,421,154.1, 2,441,326.4] | 309.6% | haiku55-effort-high higher |
| total_cost_usd | 12 | -0.2720 | [-0.3410, -0.2037] | -59.7% | haiku55-effort-high lower |
| num_turns | 12 | 27.5 | [20.9, 34.7] | 204.3% | haiku55-effort-high higher |

Iso-accuracy subset (10/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 10 | 1,826,491.5 | [1,450,405.3, 2,220,119.6] | 309.6% | haiku55-effort-high higher |
| uncached_equivalent | 10 | 1,826,491.5 | [1,446,973.7, 2,216,189.7] | 309.6% | haiku55-effort-high higher |
| total_cost_usd | 10 | -0.2842 | [-0.3670, -0.2084] | -59.6% | haiku55-effort-high lower |
| num_turns | 10 | 25.8 | [19.7, 32.3] | 197.0% | haiku55-effort-high higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 1,237,018.5 | [889,328.8, 1,579,634.4] | 353.1% | haiku55-effort-high higher |
| implement | 6 | 2,566,709.4 | [2,064,748.7, 3,158,660.8] | 266.1% | haiku55-effort-high higher |

**Verdict.** `haiku55-effort-high` vs `sonnet55-effort-high` over 12 paired tasks: tokens higher by 1,901,864 (95% CI [1,423,856, 2,436,520]); cost lower by 0.2720 (95% CI [-0.3410, -0.2037]); turns higher by 27.5 (95% CI [20.9, 34.7]); accuracy 91.7% vs 91.7% (22/24 vs 22/24).

### `haiku55-effort-xhigh` vs `sonnet55-effort-xhigh`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-xhigh | 24 | **1,641,541** (844,282–3,320,025) | 1,641,541 | 1.051 | 23.5 | 0 in 0 run(s) | 19 | 0 | 0 | 573 | 0 | 95.8% (23/24) | 2,209,860 |
| haiku55-effort-xhigh | 24 | **3,870,094** (2,806,716–5,808,042) | 3,870,094 | 0.445 | 52.0 | 0 in 0 run(s) | 315 | 0 | 0 | 559 | 0 | 100.0% (24/24) | 4,925,530 |

Paired difference (`haiku55-effort-xhigh` − `sonnet55-effort-xhigh`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 2,794,656.5 | [1,879,452.1, 4,052,493.1] | 190.7% | haiku55-effort-xhigh higher |
| uncached_equivalent | 12 | 2,794,656.5 | [1,847,944.8, 4,135,701.0] | 190.7% | haiku55-effort-xhigh higher |
| total_cost_usd | 12 | -0.6893 | [-0.9584, -0.4469] | -55.5% | haiku55-effort-xhigh lower |
| num_turns | 12 | 33.6 | [23.5, 47.3] | 140.4% | haiku55-effort-xhigh higher |

Iso-accuracy subset (11/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 11 | 2,927,717.2 | [1,912,938.3, 4,229,981.0] | 184.3% | haiku55-effort-xhigh higher |
| uncached_equivalent | 11 | 2,927,717.2 | [1,930,903.7, 4,318,062.0] | 184.3% | haiku55-effort-xhigh higher |
| total_cost_usd | 11 | -0.7348 | [-1.0356, -0.4803] | -55.4% | haiku55-effort-xhigh lower |
| num_turns | 11 | 34.4 | [23.9, 48.3] | 136.0% | haiku55-effort-xhigh higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 2,333,693.0 | [1,675,670.0, 3,137,594.7] | 281.6% | haiku55-effort-xhigh higher |
| implement | 6 | 3,255,620.0 | [1,599,391.5, 5,688,714.0] | 99.7% | haiku55-effort-xhigh higher |

**Verdict.** `haiku55-effort-xhigh` vs `sonnet55-effort-xhigh` over 12 paired tasks: tokens higher by 2,794,657 (95% CI [1,879,452, 4,052,493]); cost lower by 0.6893 (95% CI [-0.9584, -0.4469]); turns higher by 33.6 (95% CI [23.5, 47.3]); accuracy 100.0% vs 95.8% (24/24 vs 23/24).

### `haiku55-effort-low` vs `opus-effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-low | 24 | **400,732** (247,314–609,011) | 400,732 | 0.465 | 12.5 | 0 in 0 run(s) | 0 | 0 | 0 | 260 | 0 | 87.5% (21/24) | 459,921 |
| haiku55-effort-low | 24 | **1,042,800** (560,926–1,490,484) | 1,042,800 | 0.036 | 18.0 | 0 in 0 run(s) | 10 | 0 | 0 | 360 | 0 | 87.5% (21/24) | 1,151,932 |

Paired difference (`haiku55-effort-low` − `opus-effort-low`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 678,049.4 | [460,673.0, 911,706.5] | 152.4% | haiku55-effort-low higher |
| uncached_equivalent | 12 | 678,049.4 | [448,031.0, 926,162.6] | 152.4% | haiku55-effort-low higher |
| total_cost_usd | 12 | -0.4357 | [-0.5165, -0.3516] | -89.1% | haiku55-effort-low lower |
| num_turns | 12 | 10.5 | [6.4, 14.8] | 83.7% | haiku55-effort-low higher |

Iso-accuracy subset (9/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | 696,458.9 | [418,061.4, 983,651.4] | 148.8% | haiku55-effort-low higher |
| uncached_equivalent | 9 | 696,458.9 | [425,759.2, 971,961.9] | 148.8% | haiku55-effort-low higher |
| total_cost_usd | 9 | -0.4546 | [-0.5451, -0.3593] | -88.4% | haiku55-effort-low lower |
| num_turns | 9 | 9.2 | [4.9, 14.3] | 72.3% | haiku55-effort-low higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 370,946.8 | [219,419.7, 577,276.6] | 130.7% | haiku55-effort-low higher |
| implement | 6 | 985,152.0 | [747,219.2, 1,236,705.3] | 174.2% | haiku55-effort-low higher |

**Verdict.** `haiku55-effort-low` vs `opus-effort-low` over 12 paired tasks: tokens higher by 678,049 (95% CI [460,673, 911,706]); cost lower by 0.4357 (95% CI [-0.5165, -0.3516]); turns higher by 10.5 (95% CI [6.4, 14.8]); accuracy 87.5% vs 87.5% (21/24 vs 21/24).

### `haiku55-effort-medium` vs `opus-effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-medium | 24 | **770,222** (435,641–1,303,513) | 770,222 | 0.850 | 18.5 | 0 in 0 run(s) | 0 | 0 | 0 | 427 | 0 | 95.8% (23/24) | 1,062,637 |
| haiku55-effort-medium | 24 | **1,319,879** (922,023–2,563,401) | 1,319,879 | 0.070 | 30.0 | 0 in 0 run(s) | 96 | 0 | 0 | 403 | 0 | 87.5% (21/24) | 1,679,319 |

Paired difference (`haiku55-effort-medium` − `opus-effort-medium`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 829,995.7 | [511,852.8, 1,183,676.3] | 96.8% | haiku55-effort-medium higher |
| uncached_equivalent | 12 | 829,995.7 | [512,658.8, 1,190,536.6] | 96.8% | haiku55-effort-medium higher |
| total_cost_usd | 12 | -0.7911 | [-0.9970, -0.6167] | -87.9% | haiku55-effort-medium lower |
| num_turns | 12 | 18.4 | [12.3, 25.5] | 99.4% | haiku55-effort-medium higher |

Iso-accuracy subset (9/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | 822,236.7 | [444,753.1, 1,259,946.9] | 94.1% | haiku55-effort-medium higher |
| uncached_equivalent | 9 | 822,236.7 | [462,537.1, 1,246,310.8] | 94.1% | haiku55-effort-medium higher |
| total_cost_usd | 9 | -0.7101 | [-0.8457, -0.5767] | -88.7% | haiku55-effort-medium lower |
| num_turns | 9 | 16.2 | [10.5, 24.1] | 93.9% | haiku55-effort-medium higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 445,835.6 | [314,501.5, 562,638.7] | 99.5% | haiku55-effort-medium higher |
| implement | 6 | 1,214,155.8 | [677,936.3, 1,698,615.9] | 94.0% | haiku55-effort-medium higher |

**Verdict.** `haiku55-effort-medium` vs `opus-effort-medium` over 12 paired tasks: tokens higher by 829,996 (95% CI [511,853, 1,183,676]); cost lower by 0.7911 (95% CI [-0.9970, -0.6167]); turns higher by 18.4 (95% CI [12.3, 25.5]); accuracy 87.5% vs 95.8% (21/24 vs 23/24).

### `haiku55-effort-high` vs `opus-effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-high | 24 | **1,373,094** (628,861–1,967,737) | 1,373,094 | 1.237 | 22.5 | 0 in 0 run(s) | 1 | 0 | 0 | 495 | 0 | 100.0% (24/24) | 1,361,655 |
| haiku55-effort-high | 24 | **2,421,312** (1,485,145–3,327,694) | 2,421,312 | 0.193 | 36.0 | 0 in 0 run(s) | 146 | 0 | 0 | 459 | 0 | 91.7% (22/24) | 2,616,875 |

Paired difference (`haiku55-effort-high` − `opus-effort-high`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 1,277,370.1 | [984,702.8, 1,560,296.9] | 114.3% | haiku55-effort-high higher |
| uncached_equivalent | 12 | 1,277,370.1 | [986,742.6, 1,574,558.1] | 114.3% | haiku55-effort-high higher |
| total_cost_usd | 12 | -0.9393 | [-1.1543, -0.7245] | -83.6% | haiku55-effort-high lower |
| num_turns | 12 | 20.3 | [15.1, 25.5] | 101.5% | haiku55-effort-high higher |

Iso-accuracy subset (10/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 10 | 1,288,455.1 | [1,005,118.1, 1,577,508.2] | 117.4% | haiku55-effort-high higher |
| uncached_equivalent | 10 | 1,288,455.1 | [995,927.2, 1,579,921.2] | 117.4% | haiku55-effort-high higher |
| total_cost_usd | 10 | -0.9145 | [-1.0808, -0.7368] | -83.1% | haiku55-effort-high lower |
| num_turns | 10 | 18.9 | [13.8, 24.6] | 95.6% | haiku55-effort-high higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 835,884.3 | [621,060.4, 1,064,818.3] | 126.6% | haiku55-effort-high higher |
| implement | 6 | 1,718,855.9 | [1,494,121.3, 1,918,384.0] | 102.1% | haiku55-effort-high higher |

**Verdict.** `haiku55-effort-high` vs `opus-effort-high` over 12 paired tasks: tokens higher by 1,277,370 (95% CI [984,703, 1,560,297]); cost lower by 0.9393 (95% CI [-1.1543, -0.7245]); turns higher by 20.3 (95% CI [15.1, 25.5]); accuracy 91.7% vs 100.0% (22/24 vs 24/24).

### `haiku55-effort-xhigh` vs `opus-effort-xhigh`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-xhigh | 24 | **2,580,519** (1,851,949–3,614,272) | 2,580,519 | 2.082 | 34.0 | 0 in 0 run(s) | 0 | 0 | 0 | 795 | 0 | 100.0% (24/24) | 3,005,946 |
| haiku55-effort-xhigh | 24 | **3,870,094** (2,806,716–5,808,042) | 3,870,094 | 0.445 | 52.0 | 0 in 0 run(s) | 315 | 0 | 0 | 559 | 0 | 100.0% (24/24) | 4,925,530 |

Paired difference (`haiku55-effort-xhigh` − `opus-effort-xhigh`), all 12 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 1,919,584.4 | [1,007,103.9, 3,282,215.8] | 61.4% | haiku55-effort-xhigh higher |
| uncached_equivalent | 12 | 1,919,584.4 | [980,283.7, 3,230,821.2] | 61.4% | haiku55-effort-xhigh higher |
| total_cost_usd | 12 | -1.7242 | [-2.0552, -1.4132] | -79.7% | haiku55-effort-xhigh lower |
| num_turns | 12 | 25.9 | [17.3, 39.2] | 68.5% | haiku55-effort-xhigh higher |

Iso-accuracy subset (12/12 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 1,919,584.4 | [980,306.9, 3,273,732.1] | 61.4% | haiku55-effort-xhigh higher |
| uncached_equivalent | 12 | 1,919,584.4 | [997,090.4, 3,191,271.8] | 61.4% | haiku55-effort-xhigh higher |
| total_cost_usd | 12 | -1.7242 | [-2.0773, -1.3883] | -79.7% | haiku55-effort-xhigh lower |
| num_turns | 12 | 25.9 | [17.3, 40.0] | 68.5% | haiku55-effort-xhigh higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 6 | 1,367,747.9 | [809,332.4, 2,041,019.3] | 69.1% | haiku55-effort-xhigh higher |
| implement | 6 | 2,471,420.8 | [741,193.3, 4,974,958.7] | 53.7% | haiku55-effort-xhigh higher |

**Verdict.** `haiku55-effort-xhigh` vs `opus-effort-xhigh` over 12 paired tasks: tokens higher by 1,919,584 (95% CI [1,007,104, 3,282,216]); cost lower by 1.7242 (95% CI [-2.0552, -1.4132]); turns higher by 25.9 (95% CI [17.3, 39.2]); accuracy 100.0% vs 100.0% (24/24 vs 24/24).

## 8. Features never exercised

graphify exposes more than `query`. The table counts, per arm, how many times each subcommand was invoked across all runs (and, in parentheses, how many runs used it at least once). A zero column is the point: it means the benchmark never put that feature under measurement, so nothing here — positive or negative — can be read as evidence about it.

| condition | runs | `query` | `explain` | `path` | `god-nodes` | `affected` | `save-result` | `reflect` | `update` | `benchmark` |
|---|---|---|---|---|---|---|---|---|---|---|
| `effort-high` | 24 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `effort-low` | 24 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `effort-medium` | 24 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `effort-xhigh` | 24 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `grok-effort-high` | 24 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `grok-effort-low` | 24 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `grok-effort-medium` | 24 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `haiku55-effort-high` | 24 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `haiku55-effort-low` | 24 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `haiku55-effort-medium` | 24 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `haiku55-effort-xhigh` | 24 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
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
| `grok-effort-high` | 0 | n/a (no graph) | 0 (0) |
| `grok-effort-low` | 0 | n/a (no graph) | 0 (0) |
| `grok-effort-medium` | 0 | n/a (no graph) | 0 (0) |
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
| `effort-high` | 24 | 101,757 (54,697–163,427) | 95,435 (52,777–159,225) | 76,736 (42,506–132,206) | 1,680 (1,395–1,859) | 31 (29–40) |
| `effort-low` | 24 | 47,081 (30,509–78,756) | 45,170 (28,469–77,042) | 37,042 (25,341–64,167) | 1,372 (1,229–1,637) | 30 (28–35) |
| `effort-medium` | 24 | 62,920 (38,526–88,356) | 61,452 (32,168–86,415) | 46,434 (28,559–67,120) | 1,469 (1,289–1,744) | 35 (28–39) |
| `effort-xhigh` | 24 | 314,909 (131,301–373,764) | 312,671 (128,951–371,830) | 265,822 (111,128–334,977) | 985 (826–1,527) | 31 (28–35) |
| `grok-effort-high` | 24 | 992,104 (757,177–1,168,651) | 990,405 (755,638–1,161,974) | 975,664 (736,298–1,144,691) | – | – |
| `grok-effort-low` | 24 | 232,224 (145,501–309,772) | 230,466 (144,025–302,439) | 226,869 (143,158–289,672) | – | – |
| `grok-effort-medium` | 24 | 670,055 (456,390–868,277) | 668,493 (454,801–866,486) | 659,795 (420,984–852,984) | – | – |
| `haiku55-effort-high` | 24 | 231,153 (159,107–287,009) | 226,034 (145,882–285,577) | 188,257 (124,857–256,774) | 962 (822–1,103) | 36 (31–41) |
| `haiku55-effort-low` | 24 | 114,495 (79,845–155,099) | 111,653 (72,000–148,829) | 91,361 (59,118–128,584) | 996 (812–1,184) | 40 (37–48) |
| `haiku55-effort-medium` | 24 | 178,425 (97,354–228,176) | 154,884 (91,718–225,254) | 138,130 (80,831–209,303) | 897 (795–1,101) | 39 (33–43) |
| `haiku55-effort-xhigh` | 24 | 420,991 (284,563–500,558) | 419,165 (283,200–489,568) | 382,640 (239,751–445,371) | 1,089 (909–1,234) | 39 (34–46) |
| `opus-effort-high` | 24 | 208,974 (118,160–244,854) | 206,999 (115,152–242,881) | 176,072 (89,655–223,436) | 1,866 (1,355–2,491) | 36 (30–47) |
| `opus-effort-low` | 24 | 78,109 (58,748–94,847) | 76,185 (50,307–92,783) | 58,994 (33,551–79,640) | 2,179 (2,003–2,278) | 31 (30–36) |
| `opus-effort-medium` | 24 | 152,278 (82,477–181,546) | 150,352 (77,851–179,467) | 129,633 (65,669–163,113) | 2,442 (1,411–2,509) | 34 (30–37) |
| `opus-effort-xhigh` | 24 | 375,793 (287,961–414,542) | 371,467 (285,895–412,527) | 330,080 (229,584–389,419) | 1,368 (1,331–1,437) | 34 (29–37) |
| `sonnet55-effort-high` | 24 | 95,993 (60,932–155,253) | 93,984 (52,778–146,555) | 82,499 (39,686–127,779) | 1,773 (1,657–2,048) | 29 (26–33) |
| `sonnet55-effort-low` | 24 | 51,396 (34,834–75,775) | 50,501 (30,172–66,889) | 39,806 (24,371–62,312) | 1,379 (1,279–1,648) | 28 (27–36) |
| `sonnet55-effort-medium` | 24 | 71,674 (43,080–86,232) | 59,805 (35,824–84,119) | 43,484 (28,729–74,735) | 1,666 (1,418–1,984) | 27 (25–30) |
| `sonnet55-effort-xhigh` | 24 | 257,838 (138,558–383,534) | 256,368 (135,610–381,764) | 236,237 (119,115–334,399) | 1,561 (1,233–1,745) | 30 (27–40) |

`claude.wall_ms` is the whole `claude -p` process as the harness timed it. Prefer it over `duration_ms` when an arm delegates: from Claude Code 2.1.28x the `Agent` tool runs in the background and `duration_ms` stops before the subagent's work is folded back in.

`time_to_request_ms` covers everything before the first API request, which is where **MCP server startup lands**: it is the only column in which an arm that must spawn and handshake with a server can differ from one that does not. The transcript itself cannot show that cost — Claude Code connects its configured servers *before* writing the first transcript entry, so the delay between the first entry and the one advertising the server's tools collapses to a few milliseconds of bookkeeping rather than measuring the spawn.

Per-tool-call latency, median (IQR) in ms, pooled over calls:

| condition | `Read` | `Bash` |
|---|---|---|
| `effort-high` | – | 70 (43–249) |
| `effort-low` | 17 (8–17) | 70 (47–215) |
| `effort-medium` | 12 (10–18) | 65 (46–201) |
| `effort-xhigh` | 7 (5–9) | 54 (37–198) |
| `grok-effort-high` | – | – |
| `grok-effort-low` | – | – |
| `grok-effort-medium` | – | – |
| `haiku55-effort-high` | 10 (6–15) | 65 (40–490) |
| `haiku55-effort-low` | 20 (12–44) | 67 (47–211) |
| `haiku55-effort-medium` | 9 (5–11) | 61 (38–179) |
| `haiku55-effort-xhigh` | 8 (5–12) | 67 (40–642) |
| `opus-effort-high` | 287 (287–287) | 59 (39–203) |
| `opus-effort-low` | – | 58 (41–230) |
| `opus-effort-medium` | – | 58 (41–134) |
| `opus-effort-xhigh` | – | 54 (36–120) |
| `sonnet55-effort-high` | 10 (10–10) | 61 (37–196) |
| `sonnet55-effort-low` | 8 (6–10) | 61 (39–175) |
| `sonnet55-effort-medium` | 9 (8–10) | 60 (40–194) |
| `sonnet55-effort-xhigh` | 7 (6–12) | 51 (33–127) |

Each cell is timed from the transcript entry carrying the `tool_use` block to the entry carrying its matching `tool_result`, both written locally by the same process. Calls whose result never arrived — a run that hit its turn cap mid-call — are absent rather than counted as zero. `n` per cell is the number of calls, not the number of runs, so an arm that called a tool once contributes one observation.

**Index build cost, for scale.** graphify v1: **4.6 s** total (`update` 3.4 s + `cluster-only` 1.2 s, AST-only, no API calls). graphify v2: a comparable AST pass plus roughly **35 min** of LLM-backed document extraction. MemPalace v1: **49 s**; v2: **97 s** (embedding + indexing, `--no-llm`, no API calls). All are one-off costs paid before any run, and none is included in any figure above — they are listed only so a per-query latency can be read against what producing the index cost in the first place.

## 10. Thinking tokens and model mix

Thinking tokens are billed as output and are a **subset** of `output_tokens`, not an addition to it, so the share is the honest reading of an effort change: an arm that merely wrote less prose would move the absolute count without touching the lever. The figure is main-session only — `usage.output_tokens_details` does not see a subagent — so an arm that delegates reports the *parent's* thinking, and its explorer's thinking appears only as tokens against that explorer's model in the second table.

| condition | runs | thinking tokens | main-session output | thinking share |
|---|---|---|---|---|
| `effort-high` | 24 | 71,672 | 286,900 | 25.0% |
| `effort-low` | 24 | 18,956 | 156,041 | 12.1% |
| `effort-medium` | 24 | 27,798 | 178,081 | 15.6% |
| `effort-xhigh` | 24 | 378,716 | 856,378 | 44.2% |
| `grok-effort-high` | 24 | 0 | 0 | – |
| `grok-effort-low` | 24 | 0 | 0 | – |
| `grok-effort-medium` | 24 | 0 | 0 | – |
| `haiku55-effort-high` | 24 | 555,256 | 1,015,931 | 54.7% |
| `haiku55-effort-low` | 24 | 219,933 | 505,425 | 43.5% |
| `haiku55-effort-medium` | 24 | 359,328 | 744,697 | 48.3% |
| `haiku55-effort-xhigh` | 24 | 1,335,143 | 1,980,291 | 67.4% |
| `opus-effort-high` | 24 | 87,160 | 386,562 | 22.5% |
| `opus-effort-low` | 24 | 13,032 | 158,332 | 8.2% |
| `opus-effort-medium` | 24 | 49,657 | 303,933 | 16.3% |
| `opus-effort-xhigh` | 24 | 361,568 | 829,573 | 43.6% |
| `sonnet55-effort-high` | 24 | 70,878 | 292,863 | 24.2% |
| `sonnet55-effort-low` | 24 | 18,949 | 156,435 | 12.1% |
| `sonnet55-effort-medium` | 24 | 27,139 | 180,548 | 15.0% |
| `sonnet55-effort-xhigh` | 24 | 361,507 | 828,761 | 43.6% |

**Which model spent the tokens.** Summed from `modelUsage` over every run of the arm, on the same definition as `uncached_equivalent_all` (input + cache read + cache creation), so the row totals reconcile with the headline volume rather than describing some adjacent quantity. Note that a ~1k-token Haiku entry appears in **every** arm, including plain `baseline`: that is Claude Code's own background helper call, not delegated exploration. Only an arm whose Haiku row is orders of magnitude larger than that has actually moved work onto Haiku.

That helper's size is a deterministic function of the task prompt, so every Sonnet arm running the same task set reports the **identical** Haiku total. Rows agreeing to the token are therefore the expected result here, not a copy-paste fault — and they are what makes the figure usable as a baseline to read a genuinely delegating arm against.

| condition | `claude-haiku-5-5` tokens | `claude-opus-5-5` tokens | `claude-sonnet-5` tokens | `claude-sonnet-5-5` tokens | `grok-4.7-build` tokens | `claude-haiku-5-5` cost | `claude-opus-5-5` cost | `claude-sonnet-5` cost | `claude-sonnet-5-5` cost | `grok-4.7-build` cost |
|---|---|---|---|---|---|---|---|---|---|---|
| `effort-high` | 0 | 0 | 18,650,897 | 0 | 0 | $0.00 | $0.00 | $11.90 | $0.00 | $0.00 |
| `effort-low` | 0 | 0 | 9,311,573 | 0 | 0 | $0.00 | $0.00 | $6.87 | $0.00 | $0.00 |
| `effort-medium` | 0 | 0 | 10,566,010 | 0 | 0 | $0.00 | $0.00 | $7.79 | $0.00 | $0.00 |
| `effort-xhigh` | 0 | 0 | 54,572,026 | 0 | 0 | $0.00 | $0.00 | $29.60 | $0.00 | $0.00 |
| `grok-effort-high` | 0 | 0 | 0 | 0 | 125,665,098 | $0.00 | $0.00 | $0.00 | $0.00 | $27.02 |
| `grok-effort-low` | 0 | 0 | 0 | 0 | 30,899,554 | $0.00 | $0.00 | $0.00 | $0.00 | $7.42 |
| `grok-effort-medium` | 0 | 0 | 0 | 0 | 81,584,455 | $0.00 | $0.00 | $0.00 | $0.00 | $18.13 |
| `haiku55-effort-high` | 63,336,594 | 0 | 0 | 0 | 0 | $5.18 | $0.00 | $0.00 | $0.00 | $0.00 |
| `haiku55-effort-low` | 26,526,725 | 0 | 0 | 0 | 0 | $1.53 | $0.00 | $0.00 | $0.00 | $0.00 |
| `haiku55-effort-medium` | 44,655,994 | 0 | 0 | 0 | 0 | $3.30 | $0.00 | $0.00 | $0.00 | $0.00 |
| `haiku55-effort-xhigh` | 118,212,731 | 0 | 0 | 0 | 0 | $11.74 | $0.00 | $0.00 | $0.00 | $0.00 |
| `opus-effort-high` | 0 | 32,679,711 | 0 | 0 | 0 | $0.00 | $27.72 | $0.00 | $0.00 | $0.00 |
| `opus-effort-low` | 0 | 10,253,540 | 0 | 0 | 0 | $0.00 | $11.98 | $0.00 | $0.00 | $0.00 |
| `opus-effort-medium` | 0 | 24,736,097 | 0 | 0 | 0 | $0.00 | $22.28 | $0.00 | $0.00 | $0.00 |
| `opus-effort-xhigh` | 0 | 72,142,706 | 0 | 0 | 0 | $0.00 | $53.12 | $0.00 | $0.00 | $0.00 |
| `sonnet55-effort-high` | 0 | 0 | 0 | 17,691,859 | 0 | $0.00 | $0.00 | $0.00 | $11.71 | $0.00 |
| `sonnet55-effort-low` | 0 | 0 | 0 | 9,022,153 | 0 | $0.00 | $0.00 | $0.00 | $6.80 | $0.00 |
| `sonnet55-effort-medium` | 0 | 0 | 0 | 9,075,164 | 0 | $0.00 | $0.00 | $0.00 | $7.45 | $0.00 |
| `sonnet55-effort-xhigh` | 0 | 0 | 0 | 51,140,975 | 0 | $0.00 | $0.00 | $0.00 | $28.29 | $0.00 |

## 11. Where the remaining tokens go

`uncached_all` is one number; this section splits it in two, because at this end of the range the remaining question is no longer *how much* an arm spends but *on what*. **fixed = `first_turn_cache_creation` × `num_turns`** — the system prompt and tool definitions, re-sent on every single turn — and **moving = `uncached_all` − fixed**, which is the file contents, tool results and reasoning that are actually about the task. Both are per-run medians, so the two columns need not sum to the `uncached_all` median exactly.

Caveats that bound the reading: `first_turn_cache_creation` and `num_turns` are main-session only while `uncached_all` counts subagents too, so on a delegating arm `fixed` is an under-estimate (the arms below spawn none). And cache reads bill at a tenth of fresh input, so this is a split of **information volume, not of dollars** — a 60% fixed share does not mean 60% of the bill.

| condition | runs | uncached_all (med) | turns (med) | first-turn fixed | fixed = ft×turns (med) | moving (med) | fixed share |
|---|---|---|---|---|---|---|---|
| `effort-high` | 24 | 636,648 | 14 | 8,524 | 124,339 | 508,555 | 19.7% |
| `effort-low` | 24 | 330,040 | 11 | 8,381 | 86,837 | 232,472 | 25.9% |
| `effort-medium` | 24 | 399,480 | 11 | 8,665 | 92,240 | 315,056 | 24.3% |
| `effort-xhigh` | 24 | 1,913,944 | 26 | 8,673 | 232,957 | 1,680,987 | 12.9% |
| `grok-effort-high` | 24 | 5,142,021 | 49 | 0 | 0 | 5,142,021 | 0.0% |
| `grok-effort-low` | 24 | 1,235,540 | 26 | 0 | 0 | 1,235,540 | 0.0% |
| `grok-effort-medium` | 24 | 3,344,034 | 39 | 0 | 0 | 3,344,034 | 0.0% |
| `haiku55-effort-high` | 24 | 2,421,312 | 36 | 11,062 | 389,735 | 1,972,512 | 18.7% |
| `haiku55-effort-low` | 24 | 1,042,800 | 18 | 10,993 | 200,682 | 854,539 | 21.9% |
| `haiku55-effort-medium` | 24 | 1,319,879 | 30 | 9,565 | 315,314 | 1,002,458 | 23.6% |
| `haiku55-effort-xhigh` | 24 | 3,870,094 | 52 | 10,975 | 506,575 | 3,280,699 | 13.2% |
| `opus-effort-high` | 24 | 1,373,094 | 23 | 9,259 | 197,616 | 1,175,479 | 15.3% |
| `opus-effort-low` | 24 | 400,732 | 13 | 9,300 | 102,876 | 285,324 | 28.5% |
| `opus-effort-medium` | 24 | 770,222 | 19 | 9,335 | 170,007 | 605,832 | 20.5% |
| `opus-effort-xhigh` | 24 | 2,580,519 | 34 | 9,483 | 330,561 | 2,229,986 | 12.6% |
| `sonnet55-effort-high` | 24 | 636,848 | 15 | 8,540 | 122,769 | 514,079 | 18.7% |
| `sonnet55-effort-low` | 24 | 323,277 | 11 | 8,344 | 84,330 | 230,093 | 27.7% |
| `sonnet55-effort-medium` | 24 | 345,412 | 10 | 8,393 | 82,768 | 246,493 | 25.3% |
| `sonnet55-effort-xhigh` | 24 | 1,641,541 | 24 | 8,332 | 198,813 | 1,452,562 | 13.5% |

## 12. Counter-productive cases and subagent use

- `effort-high`: **0** subagent(s) spawned across **0**/24 run(s). T2S all-model 777,121 vs main-session-only 777,121.
- `effort-low`: **0** subagent(s) spawned across **0**/24 run(s). T2S all-model 395,136 vs main-session-only 395,136.
- `effort-medium`: **0** subagent(s) spawned across **0**/24 run(s). T2S all-model 462,834 vs main-session-only 462,834.
- `effort-xhigh`: **0** subagent(s) spawned across **0**/24 run(s). T2S all-model 2,361,792 vs main-session-only 2,361,792.
- `grok-effort-high`: **0** subagent(s) spawned across **0**/24 run(s). T2S all-model 5,236,046 vs main-session-only 5,236,046.
- `grok-effort-low`: **0** subagent(s) spawned across **0**/24 run(s). T2S all-model 1,321,539 vs main-session-only 1,321,539.
- `grok-effort-medium`: **0** subagent(s) spawned across **0**/24 run(s). T2S all-model 3,377,635 vs main-session-only 3,377,635.
- `haiku55-effort-high`: **0** subagent(s) spawned across **0**/24 run(s). T2S all-model 2,616,875 vs main-session-only 2,616,875.
- `haiku55-effort-low`: **0** subagent(s) spawned across **0**/24 run(s). T2S all-model 1,151,932 vs main-session-only 1,151,932.
- `haiku55-effort-medium`: **0** subagent(s) spawned across **0**/24 run(s). T2S all-model 1,679,319 vs main-session-only 1,679,319.
- `haiku55-effort-xhigh`: **0** subagent(s) spawned across **0**/24 run(s). T2S all-model 4,925,530 vs main-session-only 4,925,530.
- `opus-effort-high`: **0** subagent(s) spawned across **0**/24 run(s). T2S all-model 1,361,655 vs main-session-only 1,361,655.
- `opus-effort-low`: **0** subagent(s) spawned across **0**/24 run(s). T2S all-model 459,921 vs main-session-only 459,921.
- `opus-effort-medium`: **0** subagent(s) spawned across **0**/24 run(s). T2S all-model 1,062,637 vs main-session-only 1,062,637.
- `opus-effort-xhigh`: **0** subagent(s) spawned across **0**/24 run(s). T2S all-model 3,005,946 vs main-session-only 3,005,946.
- `sonnet55-effort-high`: **0** subagent(s) spawned across **0**/24 run(s). T2S all-model 783,237 vs main-session-only 783,237.
- `sonnet55-effort-low`: **0** subagent(s) spawned across **0**/24 run(s). T2S all-model 388,470 vs main-session-only 388,470.
- `sonnet55-effort-medium`: **0** subagent(s) spawned across **0**/24 run(s). T2S all-model 418,415 vs main-session-only 418,415.
- `sonnet55-effort-xhigh`: **0** subagent(s) spawned across **0**/24 run(s). T2S all-model 2,209,860 vs main-session-only 2,209,860.
- Runs that opened `graphify-out/graph.json` directly: **0**
- graphify-condition runs that never invoked the `graphify` CLI (nudge ignored): **24** (`UFX1-comment-delete-search__opus-effort-low__r1`, `UFX1-comment-delete-search__opus-effort-low__r2`, `UFX2-attachment-storage__opus-effort-low__r1`, `UFX2-attachment-storage__opus-effort-low__r2`, `UFX3-issue-lifecycle-overdue__opus-effort-low__r1`, `UFX3-issue-lifecycle-overdue__opus-effort-low__r2`, `UFX4-search-ghosts__opus-effort-low__r1`, `UFX4-search-ghosts__opus-effort-low__r2`, `UFX5-sweep-starvation__opus-effort-low__r1`, `UFX5-sweep-starvation__opus-effort-low__r2`, `UFX6-plan-drift__opus-effort-low__r1`, `UFX6-plan-drift__opus-effort-low__r2`, `UIM1-issue-dependencies__opus-effort-low__r1`, `UIM1-issue-dependencies__opus-effort-low__r2`, `UIM2-recurring-issues__opus-effort-low__r1`, `UIM2-recurring-issues__opus-effort-low__r2`, `UIM3-api-tokens__opus-effort-low__r1`, `UIM3-api-tokens__opus-effort-low__r2`, `UIM4-workspace-time-zone__opus-effort-low__r1`, `UIM4-workspace-time-zone__opus-effort-low__r2`, `UIM5-project-muting__opus-effort-low__r1`, `UIM5-project-muting__opus-effort-low__r2`, `UIM6-issue-trash__opus-effort-low__r1`, `UIM6-issue-trash__opus-effort-low__r2`)

## 13. Failed and ungraded runs

Harness failures (`is_error`, or `terminal_reason` other than `completed`): **0**. The table below also lists runs that completed normally but did not meet their grader's success threshold — those are accuracy results, not execution problems.

| run_id | condition | task | is_error | terminal_reason |
|---|---|---|---|---|
| `UFX1-comment-delete-search__sonnet55-effort-medium__r1` | sonnet55-effort-medium | UFX1-comment-delete-search | false | completed |
| `UFX2-attachment-storage__effort-low__r2` | effort-low | UFX2-attachment-storage | false | completed |
| `UFX2-attachment-storage__effort-medium__r1` | effort-medium | UFX2-attachment-storage | false | completed |
| `UFX2-attachment-storage__effort-medium__r2` | effort-medium | UFX2-attachment-storage | false | completed |
| `UFX2-attachment-storage__effort-xhigh__r1` | effort-xhigh | UFX2-attachment-storage | false | completed |
| `UFX2-attachment-storage__grok-effort-low__r2` | grok-effort-low | UFX2-attachment-storage | false | completed |
| `UFX2-attachment-storage__haiku55-effort-high__r2` | haiku55-effort-high | UFX2-attachment-storage | false | completed |
| `UFX2-attachment-storage__haiku55-effort-low__r1` | haiku55-effort-low | UFX2-attachment-storage | false | completed |
| `UFX2-attachment-storage__haiku55-effort-low__r2` | haiku55-effort-low | UFX2-attachment-storage | false | completed |
| `UFX2-attachment-storage__haiku55-effort-medium__r1` | haiku55-effort-medium | UFX2-attachment-storage | false | completed |
| `UFX2-attachment-storage__opus-effort-low__r1` | opus-effort-low | UFX2-attachment-storage | false | completed |
| `UFX2-attachment-storage__opus-effort-low__r2` | opus-effort-low | UFX2-attachment-storage | false | completed |
| `UFX2-attachment-storage__opus-effort-medium__r2` | opus-effort-medium | UFX2-attachment-storage | false | completed |
| `UFX2-attachment-storage__sonnet55-effort-high__r1` | sonnet55-effort-high | UFX2-attachment-storage | false | completed |
| `UFX2-attachment-storage__sonnet55-effort-high__r2` | sonnet55-effort-high | UFX2-attachment-storage | false | completed |
| `UFX2-attachment-storage__sonnet55-effort-low__r1` | sonnet55-effort-low | UFX2-attachment-storage | false | completed |
| `UFX2-attachment-storage__sonnet55-effort-medium__r1` | sonnet55-effort-medium | UFX2-attachment-storage | false | completed |
| `UFX2-attachment-storage__sonnet55-effort-medium__r2` | sonnet55-effort-medium | UFX2-attachment-storage | false | completed |
| `UFX2-attachment-storage__sonnet55-effort-xhigh__r1` | sonnet55-effort-xhigh | UFX2-attachment-storage | false | completed |
| `UFX4-search-ghosts__sonnet55-effort-low__r2` | sonnet55-effort-low | UFX4-search-ghosts | false | completed |
| `UFX5-sweep-starvation__sonnet55-effort-medium__r1` | sonnet55-effort-medium | UFX5-sweep-starvation | false | completed |
| `UFX6-plan-drift__opus-effort-low__r1` | opus-effort-low | UFX6-plan-drift | false | completed |
| `UIM2-recurring-issues__haiku55-effort-medium__r1` | haiku55-effort-medium | UIM2-recurring-issues | false | completed |
| `UIM3-api-tokens__grok-effort-medium__r2` | grok-effort-medium | UIM3-api-tokens | false | completed |
| `UIM4-workspace-time-zone__haiku55-effort-high__r2` | haiku55-effort-high | UIM4-workspace-time-zone | false | completed |
| `UIM4-workspace-time-zone__haiku55-effort-low__r1` | haiku55-effort-low | UIM4-workspace-time-zone | false | completed |
| `UIM4-workspace-time-zone__haiku55-effort-medium__r2` | haiku55-effort-medium | UIM4-workspace-time-zone | false | completed |

## 14. Limitations

- N = 456 runs over 12 tasks; a single corpus and a single model. These results do not generalize to other codebases or models.
- Bootstrap resamples tasks, so the interval reflects task-to-task variation, not within-task run noise.
- Where a CI crosses zero the honest reading is "no difference detected at this N", not "no difference exists".
- The fixed ~21k-token system-prompt/tool-definition overhead is included in both arms and not subtracted (see §2).
- **1 repetition per (task × condition)**: within-task run-to-run variance is unmeasured, so any single per-task difference may be run noise.
- Subagent traffic is counted in `uncached_all`, but a subagent's tool calls never reach the parent transcript, so the tool-call columns stay main-session-only.
- Raw per-run data lives in `results/ultra/runs/<run-id>/` and the `summary.csv` beside this report.
