# graphify-bench results

Generated 2026-10-08T03:33:58.365Z. 640 runs over 16 tasks, conditions: effort-high, effort-low, effort-low-nosub, effort-medium, effort-xhigh, grok-effort-high, grok-effort-low, grok-effort-medium, haiku55-effort-high, haiku55-effort-low, haiku55-effort-medium, haiku55-effort-xhigh, opus-effort-high, opus-effort-low, opus-effort-medium, opus-effort-xhigh, sonnet55-effort-high, sonnet55-effort-low, sonnet55-effort-medium, sonnet55-effort-xhigh.

## 1. Environment

- Claude Code: `2.1.283 (Claude Code)`
- graphify: `graphify 0.9.53`
- Node: `v25.5.0` / pnpm `10.28.2`
- Platform: `darwin 25.2.0 arm64`
- Model: `claude-sonnet-5`, effort `high`, --max-turns 60, --max-budget-usd 4

- Bootstrap: B=2000, percentile 95% CI, seed `graphify-bench-bootstrap`, resampled over **tasks**.
- Corpus: `corpus-v1`, tree hash (sha256) `4148d9b26fb31b95ab8424af1f88cfc7741bb655b3ad3bbb557a8c3c516c12da` (source: `docs/plan/CORPUS.md`).
- Report generated: 2026-10-08.

The `Model` line above is the harness default; arms that override it are listed here. Every field comes from the run's own `run.meta.json`, not from the report's assumptions.

| condition | model | overlays | extra `claude` args | what it isolates |
|---|---|---|---|---|
| `effort-high` | `claude-sonnet-5` | `baseline` | – | Baseline with `--effort high` spelled out. It equals the harness default, so the arm is `baseline` re-measured on the current CLI under a name that pairs it with `opus-effort-high`. |
| `effort-low` | `claude-sonnet-5` | `baseline` | – | As `effort-medium`, one notch further down: baseline with `--effort low`. |
| `effort-low-nosub` | `claude-sonnet-5` | `baseline` | `--disallowedTools Agent` | The two strongest runtime levers at once: baseline's overlay byte for byte, invoked with `--effort low` AND `--disallowedTools Agent`. Both levers cut the same resource — total exploration and thinking — so the arm exists to answer whether their savings add up or overlap. Its treatment lives entirely in `claude.argv`; nothing in the corpus copy differs from a `baseline` run. |
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
| effort-high | 32 | **1,017,962** (776,185–1,845,819) | 971,377 | 0.540 | 23.0 | 14 in 13 run(s) | 287 | 0 | 0 | 347 | 0 | 96.9% (31/32) | 1,956,460 |
| effort-low | 32 | **526,456** (359,052–1,173,759) | 379,277 | 0.287 | 14.0 | 18 in 16 run(s) | 175 | 0 | 0 | 222 | 0 | 93.8% (30/32) | 1,163,504 |
| effort-low-nosub | 32 | **462,770** (305,163–998,978) | 462,770 | 0.226 | 14.0 | 0 in 0 run(s) | 135 | 0 | 0 | 311 | 0 | 90.6% (29/32) | 1,035,691 |
| effort-medium | 32 | **808,946** (530,016–1,878,941) | 502,945 | 0.432 | 17.5 | 24 in 22 run(s) | 226 | 0 | 0 | 251 | 0 | 96.9% (31/32) | 1,557,356 |
| effort-xhigh | 32 | **1,382,317** (807,975–2,614,605) | 1,124,683 | 0.646 | 27.5 | 10 in 8 run(s) | 347 | 0 | 0 | 460 | 0 | 100.0% (32/32) | 2,372,619 |
| grok-effort-high | 32 | **2,174,098** (1,337,710–3,454,045) | 2,174,098 | 0.523 | 31.0 | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | 100.0% (32/32) | 2,480,025 |
| grok-effort-low | 32 | **387,181** (233,958–646,884) | 387,181 | 0.107 | 12.0 | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | 100.0% (32/32) | 482,287 |
| grok-effort-medium | 32 | **1,248,999** (691,571–2,298,037) | 1,248,999 | 0.323 | 24.5 | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | 100.0% (32/32) | 1,536,574 |
| haiku55-effort-high | 32 | **607,549** (373,373–1,134,867) | 607,549 | 0.022 | 19.0 | 0 in 0 run(s) | 45 | 0 | 0 | 404 | 0 | 100.0% (32/32) | 1,044,938 |
| haiku55-effort-low | 32 | **258,305** (195,628–358,613) | 258,305 | 0.012 | 11.5 | 0 in 0 run(s) | 30 | 0 | 0 | 217 | 0 | 100.0% (32/32) | 400,999 |
| haiku55-effort-medium | 32 | **358,514** (253,181–479,206) | 358,514 | 0.015 | 13.0 | 0 in 0 run(s) | 32 | 2 | 0 | 259 | 0 | 100.0% (32/32) | 578,782 |
| haiku55-effort-xhigh | 32 | **1,461,990** (1,016,967–2,515,852) | 1,461,990 | 0.049 | 32.0 | 0 in 0 run(s) | 186 | 0 | 0 | 578 | 0 | 100.0% (32/32) | 2,198,766 |
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
| grok-effort-high | 0 |
| grok-effort-low | 0 |
| grok-effort-medium | 0 |
| haiku55-effort-high | 8,210 |
| haiku55-effort-low | 10,620 |
| haiku55-effort-medium | 10,603 |
| haiku55-effort-xhigh | 8,213 |
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
| `grok-effort-high` | 16/16 · 1.000 | 16/16 · 1.000 |
| `grok-effort-low` | 16/16 · 1.000 | 16/16 · 1.000 |
| `grok-effort-medium` | 16/16 · 1.000 | 16/16 · 1.000 |
| `haiku55-effort-high` | 16/16 · 1.000 | 16/16 · 1.000 |
| `haiku55-effort-low` | 16/16 · 1.000 | 16/16 · 1.000 |
| `haiku55-effort-medium` | 16/16 · 1.000 | 16/16 · 1.000 |
| `haiku55-effort-xhigh` | 16/16 · 1.000 | 16/16 · 1.000 |
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

### `grok-effort-low` vs `effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low | 32 | **526,456** (359,052–1,173,759) | 379,277 | 0.287 | 14.0 | 18 in 16 run(s) | 175 | 0 | 0 | 222 | 0 | 93.8% (30/32) | 1,163,504 |
| grok-effort-low | 32 | **387,181** (233,958–646,884) | 387,181 | 0.107 | 12.0 | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | 100.0% (32/32) | 482,287 |

Paired difference (`grok-effort-low` − `effort-low`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | -630,353.5 | [-1,151,119.4, -188,371.4] | -27.6% | grok-effort-low lower |
| uncached_equivalent | 16 | -468,432.8 | [-940,073.9, -55,026.1] | 20.3% | grok-effort-low lower |
| total_cost_usd | 16 | -0.3581 | [-0.5417, -0.2024] | -65.5% | grok-effort-low lower |
| num_turns | 16 | -7.3 | [-14.9, -0.1] | 14.4% | grok-effort-low lower |

Iso-accuracy subset (15/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 15 | -713,966.6 | [-1,238,637.5, -286,506.7] | -41.3% | grok-effort-low lower |
| uncached_equivalent | 15 | -552,838.0 | [-1,065,097.5, -143,205.1] | -8.6% | grok-effort-low lower |
| total_cost_usd | 15 | -0.3832 | [-0.5621, -0.2305] | -70.4% | grok-effort-low lower |
| num_turns | 15 | -9.1 | [-16.4, -2.2] | -5.2% | grok-effort-low lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | -43,671.6 | [-223,831.9, 187,822.3] | -0.9% | **CI crosses 0 — no detectable difference** |
| implement | 8 | -1,217,035.3 | [-1,988,319.6, -513,504.8] | -54.3% | grok-effort-low lower |

**Verdict.** `grok-effort-low` vs `effort-low` over 16 paired tasks: tokens lower by 630,353 (95% CI [-1,151,119, -188,371]); cost lower by 0.3581 (95% CI [-0.5417, -0.2024]); turns lower by 7.3 (95% CI [-14.9, -0.1]); accuracy 100.0% vs 93.8% (32/32 vs 30/32).

### `grok-effort-medium` vs `effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-medium | 32 | **808,946** (530,016–1,878,941) | 502,945 | 0.432 | 17.5 | 24 in 22 run(s) | 226 | 0 | 0 | 251 | 0 | 96.9% (31/32) | 1,557,356 |
| grok-effort-medium | 32 | **1,248,999** (691,571–2,298,037) | 1,248,999 | 0.323 | 24.5 | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | 100.0% (32/32) | 1,536,574 |

Paired difference (`grok-effort-medium` − `effort-medium`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 7,218.0 | [-369,784.4, 389,227.2] | 37.7% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 16 | 365,144.5 | [5,296.9, 750,710.1] | 292.7% | grok-effort-medium higher |
| total_cost_usd | 16 | -0.2958 | [-0.4504, -0.1544] | -36.0% | grok-effort-medium lower |
| num_turns | 16 | 3.4 | [-4.1, 11.2] | 178.6% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (15/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 15 | -64,099.8 | [-436,272.5, 298,304.4] | 34.5% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 15 | 241,644.0 | [-116,585.3, 581,139.9] | 173.8% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 15 | -0.3069 | [-0.4791, -0.1590] | -37.1% | grok-effort-medium lower |
| num_turns | 15 | 1.2 | [-5.3, 7.6] | 93.1% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | 287,604.7 | [-153,809.8, 697,712.2] | 67.1% | **CI crosses 0 — no detectable difference** |
| implement | 8 | -273,168.8 | [-818,982.2, 293,506.9] | 8.3% | **CI crosses 0 — no detectable difference** |

**Verdict.** `grok-effort-medium` vs `effort-medium` over 16 paired tasks: tokens no detectable difference; cost lower by 0.2958 (95% CI [-0.4504, -0.1544]); turns no detectable difference; accuracy 100.0% vs 96.9% (32/32 vs 31/32).

### `grok-effort-high` vs `effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-high | 32 | **1,017,962** (776,185–1,845,819) | 971,377 | 0.540 | 23.0 | 14 in 13 run(s) | 287 | 0 | 0 | 347 | 0 | 96.9% (31/32) | 1,956,460 |
| grok-effort-high | 32 | **2,174,098** (1,337,710–3,454,045) | 2,174,098 | 0.523 | 31.0 | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | 100.0% (32/32) | 2,480,025 |

Paired difference (`grok-effort-high` − `effort-high`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 562,317.7 | [115,152.2, 966,780.5] | 73.1% | grok-effort-high higher |
| uncached_equivalent | 16 | 833,445.6 | [343,205.4, 1,320,808.0] | 156.8% | grok-effort-high higher |
| total_cost_usd | 16 | -0.2273 | [-0.4071, -0.0770] | -16.6% | grok-effort-high lower |
| num_turns | 16 | 4.3 | [-2.3, 10.8] | 72.2% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (15/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 15 | 433,477.4 | [6,086.8, 776,203.9] | 64.0% | grok-effort-high higher |
| uncached_equivalent | 15 | 687,734.6 | [203,528.3, 1,113,239.6] | 136.9% | grok-effort-high higher |
| total_cost_usd | 15 | -0.2536 | [-0.4396, -0.0992] | -19.4% | grok-effort-high lower |
| num_turns | 15 | 2.3 | [-4.0, 8.0] | 61.1% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | 830,710.5 | [303,038.0, 1,402,697.9] | 102.3% | grok-effort-high higher |
| implement | 8 | 293,924.8 | [-365,339.3, 856,131.5] | 43.9% | **CI crosses 0 — no detectable difference** |

**Verdict.** `grok-effort-high` vs `effort-high` over 16 paired tasks: tokens higher by 562,318 (95% CI [115,152, 966,780]); cost lower by 0.2273 (95% CI [-0.4071, -0.0770]); turns no detectable difference; accuracy 100.0% vs 96.9% (32/32 vs 31/32).

### `grok-effort-low` vs `sonnet55-effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-low | 32 | **177,106** (152,604–221,568) | 177,106 | 0.128 | 8.0 | 0 in 0 run(s) | 17 | 0 | 0 | 206 | 0 | 100.0% (32/32) | 200,575 |
| grok-effort-low | 32 | **387,181** (233,958–646,884) | 387,181 | 0.107 | 12.0 | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | 100.0% (32/32) | 482,287 |

Paired difference (`grok-effort-low` − `sonnet55-effort-low`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 281,712.3 | [169,772.7, 409,194.0] | 141.4% | grok-effort-low higher |
| uncached_equivalent | 16 | 281,712.3 | [172,254.5, 413,412.8] | 141.4% | grok-effort-low higher |
| total_cost_usd | 16 | -0.0159 | [-0.0358, 0.0077] | -12.5% | **CI crosses 0 — no detectable difference** |
| num_turns | 16 | 4.8 | [2.8, 7.5] | 59.8% | grok-effort-low higher |

Iso-accuracy subset (16/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 281,712.3 | [168,639.4, 412,964.1] | 141.4% | grok-effort-low higher |
| uncached_equivalent | 16 | 281,712.3 | [174,095.8, 413,053.8] | 141.4% | grok-effort-low higher |
| total_cost_usd | 16 | -0.0159 | [-0.0346, 0.0102] | -12.5% | **CI crosses 0 — no detectable difference** |
| num_turns | 16 | 4.8 | [2.7, 7.6] | 59.8% | grok-effort-low higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | 202,476.3 | [70,274.6, 389,124.0] | 115.2% | grok-effort-low higher |
| implement | 8 | 360,948.3 | [229,706.7, 521,520.6] | 167.5% | grok-effort-low higher |

**Verdict.** `grok-effort-low` vs `sonnet55-effort-low` over 16 paired tasks: tokens higher by 281,712 (95% CI [169,773, 409,194]); cost no detectable difference; turns higher by 4.8 (95% CI [2.8, 7.5]); accuracy 100.0% vs 100.0% (32/32 vs 32/32).

### `grok-effort-medium` vs `sonnet55-effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-medium | 32 | **168,975** (147,098–232,606) | 168,975 | 0.133 | 8.0 | 0 in 0 run(s) | 14 | 0 | 0 | 203 | 0 | 93.8% (30/32) | 203,604 |
| grok-effort-medium | 32 | **1,248,999** (691,571–2,298,037) | 1,248,999 | 0.323 | 24.5 | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | 100.0% (32/32) | 1,536,574 |

Paired difference (`grok-effort-medium` − `sonnet55-effort-medium`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 1,331,588.5 | [892,241.6, 1,785,219.6] | 644.4% | grok-effort-medium higher |
| uncached_equivalent | 16 | 1,331,588.5 | [919,915.0, 1,759,301.7] | 644.4% | grok-effort-medium higher |
| total_cost_usd | 16 | 0.2281 | [0.1482, 0.3157] | 141.3% | grok-effort-medium higher |
| num_turns | 16 | 17.3 | [12.9, 21.8] | 210.8% | grok-effort-medium higher |

Iso-accuracy subset (14/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 14 | 1,279,059.6 | [880,724.6, 1,679,883.5] | 642.3% | grok-effort-medium higher |
| uncached_equivalent | 14 | 1,279,059.6 | [912,891.5, 1,681,793.6] | 642.3% | grok-effort-medium higher |
| total_cost_usd | 14 | 0.2174 | [0.1427, 0.2967] | 142.4% | grok-effort-medium higher |
| num_turns | 14 | 17.0 | [12.9, 21.8] | 207.3% | grok-effort-medium higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | 890,572.8 | [544,236.3, 1,293,944.5] | 477.3% | grok-effort-medium higher |
| implement | 8 | 1,772,604.3 | [1,147,090.4, 2,430,440.1] | 811.6% | grok-effort-medium higher |

**Verdict.** `grok-effort-medium` vs `sonnet55-effort-medium` over 16 paired tasks: tokens higher by 1,331,589 (95% CI [892,242, 1,785,220]); cost higher by 0.2281 (95% CI [0.1482, 0.3157]); turns higher by 17.3 (95% CI [12.9, 21.8]); accuracy 100.0% vs 93.8% (32/32 vs 30/32).

### `grok-effort-high` vs `sonnet55-effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-high | 32 | **212,734** (182,979–288,480) | 212,734 | 0.155 | 9.5 | 0 in 0 run(s) | 13 | 0 | 0 | 250 | 0 | 100.0% (32/32) | 279,589 |
| grok-effort-high | 32 | **2,174,098** (1,337,710–3,454,045) | 2,174,098 | 0.523 | 31.0 | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | 100.0% (32/32) | 2,480,025 |

Paired difference (`grok-effort-high` − `sonnet55-effort-high`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 2,200,435.5 | [1,606,485.6, 2,838,093.8] | 862.8% | grok-effort-high higher |
| uncached_equivalent | 16 | 2,200,435.5 | [1,596,911.2, 2,816,532.8] | 862.8% | grok-effort-high higher |
| total_cost_usd | 16 | 0.3678 | [0.2628, 0.4783] | 189.0% | grok-effort-high higher |
| num_turns | 16 | 22.5 | [17.9, 26.9] | 245.3% | grok-effort-high higher |

Iso-accuracy subset (16/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 2,200,435.5 | [1,626,271.7, 2,857,218.7] | 862.8% | grok-effort-high higher |
| uncached_equivalent | 16 | 2,200,435.5 | [1,597,888.3, 2,802,550.2] | 862.8% | grok-effort-high higher |
| total_cost_usd | 16 | 0.3678 | [0.2644, 0.4743] | 189.0% | grok-effort-high higher |
| num_turns | 16 | 22.5 | [17.5, 27.2] | 245.3% | grok-effort-high higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | 1,561,346.1 | [1,031,294.9, 2,170,830.8] | 742.2% | grok-effort-high higher |
| implement | 8 | 2,839,524.9 | [1,971,668.5, 3,737,449.6] | 983.5% | grok-effort-high higher |

**Verdict.** `grok-effort-high` vs `sonnet55-effort-high` over 16 paired tasks: tokens higher by 2,200,436 (95% CI [1,606,486, 2,838,094]); cost higher by 0.3678 (95% CI [0.2628, 0.4783]); turns higher by 22.5 (95% CI [17.9, 26.9]); accuracy 100.0% vs 100.0% (32/32 vs 32/32).

### `grok-effort-low` vs `opus-effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-low | 32 | **162,261** (126,037–227,161) | 162,261 | 0.209 | 7.0 | 0 in 0 run(s) | 0 | 0 | 0 | 195 | 0 | 100.0% (32/32) | 186,043 |
| grok-effort-low | 32 | **387,181** (233,958–646,884) | 387,181 | 0.107 | 12.0 | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | 100.0% (32/32) | 482,287 |

Paired difference (`grok-effort-low` − `opus-effort-low`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 296,244.2 | [185,294.0, 421,532.9] | 151.8% | grok-effort-low higher |
| uncached_equivalent | 16 | 296,244.2 | [186,181.5, 424,640.3] | 151.8% | grok-effort-low higher |
| total_cost_usd | 16 | -0.1134 | [-0.1380, -0.0864] | -47.6% | grok-effort-low lower |
| num_turns | 16 | 6.0 | [4.2, 8.2] | 84.3% | grok-effort-low higher |

Iso-accuracy subset (16/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 296,244.2 | [186,174.7, 420,910.0] | 151.8% | grok-effort-low higher |
| uncached_equivalent | 16 | 296,244.2 | [184,671.5, 424,691.1] | 151.8% | grok-effort-low higher |
| total_cost_usd | 16 | -0.1134 | [-0.1377, -0.0860] | -47.6% | grok-effort-low lower |
| num_turns | 16 | 6.0 | [4.3, 8.0] | 84.3% | grok-effort-low higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | 220,677.4 | [94,258.5, 399,139.8] | 126.2% | grok-effort-low higher |
| implement | 8 | 371,810.9 | [226,139.6, 548,706.3] | 177.5% | grok-effort-low higher |

**Verdict.** `grok-effort-low` vs `opus-effort-low` over 16 paired tasks: tokens higher by 296,244 (95% CI [185,294, 421,533]); cost lower by 0.1134 (95% CI [-0.1380, -0.0864]); turns higher by 6.0 (95% CI [4.2, 8.2]); accuracy 100.0% vs 100.0% (32/32 vs 32/32).

### `grok-effort-medium` vs `opus-effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-medium | 32 | **227,980** (176,611–292,629) | 227,980 | 0.285 | 8.5 | 0 in 0 run(s) | 0 | 0 | 0 | 269 | 0 | 100.0% (32/32) | 290,816 |
| grok-effort-medium | 32 | **1,248,999** (691,571–2,298,037) | 1,248,999 | 0.323 | 24.5 | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | 100.0% (32/32) | 1,536,574 |

Paired difference (`grok-effort-medium` − `opus-effort-medium`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 1,245,758.1 | [865,089.7, 1,690,020.0] | 467.3% | grok-effort-medium higher |
| uncached_equivalent | 16 | 1,245,758.1 | [859,559.2, 1,655,125.1] | 467.3% | grok-effort-medium higher |
| total_cost_usd | 16 | 0.0323 | [-0.0188, 0.0924] | 10.3% | **CI crosses 0 — no detectable difference** |
| num_turns | 16 | 16.1 | [11.9, 20.3] | 183.6% | grok-effort-medium higher |

Iso-accuracy subset (16/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 1,245,758.1 | [871,287.1, 1,657,433.9] | 467.3% | grok-effort-medium higher |
| uncached_equivalent | 16 | 1,245,758.1 | [864,234.8, 1,654,287.2] | 467.3% | grok-effort-medium higher |
| total_cost_usd | 16 | 0.0323 | [-0.0239, 0.0880] | 10.3% | **CI crosses 0 — no detectable difference** |
| num_turns | 16 | 16.1 | [12.0, 20.4] | 183.6% | grok-effort-medium higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | 846,139.6 | [502,754.1, 1,289,220.2] | 386.2% | grok-effort-medium higher |
| implement | 8 | 1,645,376.6 | [1,037,917.3, 2,208,441.6] | 548.4% | grok-effort-medium higher |

**Verdict.** `grok-effort-medium` vs `opus-effort-medium` over 16 paired tasks: tokens higher by 1,245,758 (95% CI [865,090, 1,690,020]); cost no detectable difference; turns higher by 16.1 (95% CI [11.9, 20.3]); accuracy 100.0% vs 100.0% (32/32 vs 32/32).

### `grok-effort-high` vs `opus-effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-high | 32 | **277,823** (204,374–322,160) | 277,823 | 0.343 | 9.0 | 0 in 0 run(s) | 0 | 0 | 0 | 302 | 0 | 100.0% (32/32) | 364,968 |
| grok-effort-high | 32 | **2,174,098** (1,337,710–3,454,045) | 2,174,098 | 0.523 | 31.0 | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | 100.0% (32/32) | 2,480,025 |

Paired difference (`grok-effort-high` − `opus-effort-high`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 2,115,056.7 | [1,576,860.1, 2,716,270.0] | 626.9% | grok-effort-high higher |
| uncached_equivalent | 16 | 2,115,056.7 | [1,540,766.5, 2,723,244.7] | 626.9% | grok-effort-high higher |
| total_cost_usd | 16 | 0.1505 | [0.0815, 0.2266] | 40.6% | grok-effort-high higher |
| num_turns | 16 | 21.6 | [17.7, 25.5] | 209.9% | grok-effort-high higher |

Iso-accuracy subset (16/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 2,115,056.7 | [1,558,270.1, 2,719,520.2] | 626.9% | grok-effort-high higher |
| uncached_equivalent | 16 | 2,115,056.7 | [1,563,841.7, 2,735,334.3] | 626.9% | grok-effort-high higher |
| total_cost_usd | 16 | 0.1505 | [0.0843, 0.2243] | 40.6% | grok-effort-high higher |
| num_turns | 16 | 21.6 | [17.8, 25.5] | 209.9% | grok-effort-high higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | 1,548,214.3 | [1,022,557.8, 2,134,059.2] | 645.9% | grok-effort-high higher |
| implement | 8 | 2,681,899.1 | [1,861,788.7, 3,519,308.5] | 607.9% | grok-effort-high higher |

**Verdict.** `grok-effort-high` vs `opus-effort-high` over 16 paired tasks: tokens higher by 2,115,057 (95% CI [1,576,860, 2,716,270]); cost higher by 0.1505 (95% CI [0.0815, 0.2266]); turns higher by 21.6 (95% CI [17.7, 25.5]); accuracy 100.0% vs 100.0% (32/32 vs 32/32).

### `haiku55-effort-low` vs `sonnet55-effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-low | 32 | **177,106** (152,604–221,568) | 177,106 | 0.128 | 8.0 | 0 in 0 run(s) | 17 | 0 | 0 | 206 | 0 | 100.0% (32/32) | 200,575 |
| haiku55-effort-low | 32 | **258,305** (195,628–358,613) | 258,305 | 0.012 | 11.5 | 0 in 0 run(s) | 30 | 0 | 0 | 217 | 0 | 100.0% (32/32) | 400,999 |

Paired difference (`haiku55-effort-low` − `sonnet55-effort-low`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 200,424.6 | [88,113.1, 352,790.2] | 84.8% | haiku55-effort-low higher |
| uncached_equivalent | 16 | 200,424.6 | [83,330.4, 346,050.0] | 84.8% | haiku55-effort-low higher |
| total_cost_usd | 16 | -0.1311 | [-0.1529, -0.1129] | -90.3% | haiku55-effort-low lower |
| num_turns | 16 | 5.5 | [2.8, 8.8] | 62.2% | haiku55-effort-low higher |

Iso-accuracy subset (16/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 200,424.6 | [83,368.3, 340,488.3] | 84.8% | haiku55-effort-low higher |
| uncached_equivalent | 16 | 200,424.6 | [82,012.3, 345,893.4] | 84.8% | haiku55-effort-low higher |
| total_cost_usd | 16 | -0.1311 | [-0.1541, -0.1130] | -90.3% | haiku55-effort-low lower |
| num_turns | 16 | 5.5 | [2.8, 8.7] | 62.2% | haiku55-effort-low higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | 32,505.2 | [7,419.1, 60,012.4] | 20.9% | haiku55-effort-low higher |
| implement | 8 | 368,343.9 | [185,451.0, 588,742.3] | 148.7% | haiku55-effort-low higher |

**Verdict.** `haiku55-effort-low` vs `sonnet55-effort-low` over 16 paired tasks: tokens higher by 200,425 (95% CI [88,113, 352,790]); cost lower by 0.1311 (95% CI [-0.1529, -0.1129]); turns higher by 5.5 (95% CI [2.8, 8.8]); accuracy 100.0% vs 100.0% (32/32 vs 32/32).

### `haiku55-effort-medium` vs `sonnet55-effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-medium | 32 | **168,975** (147,098–232,606) | 168,975 | 0.133 | 8.0 | 0 in 0 run(s) | 14 | 0 | 0 | 203 | 0 | 93.8% (30/32) | 203,604 |
| haiku55-effort-medium | 32 | **358,514** (253,181–479,206) | 358,514 | 0.015 | 13.0 | 0 in 0 run(s) | 32 | 2 | 0 | 259 | 0 | 100.0% (32/32) | 578,782 |

Paired difference (`haiku55-effort-medium` − `sonnet55-effort-medium`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 373,795.8 | [164,377.3, 653,580.1] | 147.6% | haiku55-effort-medium higher |
| uncached_equivalent | 16 | 373,795.8 | [163,535.3, 648,917.1] | 147.6% | haiku55-effort-medium higher |
| total_cost_usd | 16 | -0.1279 | [-0.1453, -0.1133] | -86.0% | haiku55-effort-medium lower |
| num_turns | 16 | 10.1 | [4.8, 17.2] | 110.2% | haiku55-effort-medium higher |

Iso-accuracy subset (14/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 14 | 366,382.5 | [151,514.9, 691,197.7] | 146.2% | haiku55-effort-medium higher |
| uncached_equivalent | 14 | 366,382.5 | [147,900.4, 688,187.0] | 146.2% | haiku55-effort-medium higher |
| total_cost_usd | 14 | -0.1251 | [-0.1412, -0.1126] | -85.7% | haiku55-effort-medium lower |
| num_turns | 14 | 9.9 | [4.4, 17.8] | 105.6% | haiku55-effort-medium higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | 95,037.1 | [65,165.5, 125,155.8] | 52.2% | haiku55-effort-medium higher |
| implement | 8 | 652,554.6 | [303,731.6, 1,112,291.4] | 243.0% | haiku55-effort-medium higher |

**Verdict.** `haiku55-effort-medium` vs `sonnet55-effort-medium` over 16 paired tasks: tokens higher by 373,796 (95% CI [164,377, 653,580]); cost lower by 0.1279 (95% CI [-0.1453, -0.1133]); turns higher by 10.1 (95% CI [4.8, 17.2]); accuracy 100.0% vs 93.8% (32/32 vs 30/32).

### `haiku55-effort-high` vs `sonnet55-effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-high | 32 | **212,734** (182,979–288,480) | 212,734 | 0.155 | 9.5 | 0 in 0 run(s) | 13 | 0 | 0 | 250 | 0 | 100.0% (32/32) | 279,589 |
| haiku55-effort-high | 32 | **607,549** (373,373–1,134,867) | 607,549 | 0.022 | 19.0 | 0 in 0 run(s) | 45 | 0 | 0 | 404 | 0 | 100.0% (32/32) | 1,044,938 |

Paired difference (`haiku55-effort-high` − `sonnet55-effort-high`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 765,348.7 | [378,835.4, 1,244,098.7] | 242.7% | haiku55-effort-high higher |
| uncached_equivalent | 16 | 765,348.7 | [380,822.1, 1,227,110.4] | 242.7% | haiku55-effort-high higher |
| total_cost_usd | 16 | -0.1465 | [-0.1684, -0.1297] | -79.5% | haiku55-effort-high lower |
| num_turns | 16 | 13.7 | [7.8, 19.6] | 139.2% | haiku55-effort-high higher |

Iso-accuracy subset (16/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 765,348.7 | [368,696.9, 1,243,977.2] | 242.7% | haiku55-effort-high higher |
| uncached_equivalent | 16 | 765,348.7 | [370,979.1, 1,263,701.7] | 242.7% | haiku55-effort-high higher |
| total_cost_usd | 16 | -0.1465 | [-0.1685, -0.1292] | -79.5% | haiku55-effort-high lower |
| num_turns | 16 | 13.7 | [7.9, 19.9] | 139.2% | haiku55-effort-high higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | 205,763.9 | [103,286.8, 327,338.4] | 98.8% | haiku55-effort-high higher |
| implement | 8 | 1,324,933.5 | [703,523.0, 2,025,155.2] | 386.7% | haiku55-effort-high higher |

**Verdict.** `haiku55-effort-high` vs `sonnet55-effort-high` over 16 paired tasks: tokens higher by 765,349 (95% CI [378,835, 1,244,099]); cost lower by 0.1465 (95% CI [-0.1684, -0.1297]); turns higher by 13.7 (95% CI [7.8, 19.6]); accuracy 100.0% vs 100.0% (32/32 vs 32/32).

### `haiku55-effort-xhigh` vs `sonnet55-effort-xhigh`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sonnet55-effort-xhigh | 32 | **370,461** (267,637–691,185) | 370,461 | 0.270 | 15.0 | 0 in 0 run(s) | 39 | 0 | 0 | 372 | 0 | 100.0% (32/32) | 605,586 |
| haiku55-effort-xhigh | 32 | **1,461,990** (1,016,967–2,515,852) | 1,461,990 | 0.049 | 32.0 | 0 in 0 run(s) | 186 | 0 | 0 | 578 | 0 | 100.0% (32/32) | 2,198,766 |

Paired difference (`haiku55-effort-xhigh` − `sonnet55-effort-xhigh`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 1,593,180.2 | [934,666.4, 2,353,071.2] | 268.0% | haiku55-effort-xhigh higher |
| uncached_equivalent | 16 | 1,593,180.2 | [952,528.1, 2,375,702.9] | 268.0% | haiku55-effort-xhigh higher |
| total_cost_usd | 16 | -0.2305 | [-0.2742, -0.1889] | -69.5% | haiku55-effort-xhigh lower |
| num_turns | 16 | 22.0 | [15.1, 29.7] | 141.3% | haiku55-effort-xhigh higher |

Iso-accuracy subset (16/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 1,593,180.2 | [978,859.8, 2,362,335.5] | 268.0% | haiku55-effort-xhigh higher |
| uncached_equivalent | 16 | 1,593,180.2 | [952,586.7, 2,348,128.7] | 268.0% | haiku55-effort-xhigh higher |
| total_cost_usd | 16 | -0.2305 | [-0.2742, -0.1888] | -69.5% | haiku55-effort-xhigh lower |
| num_turns | 16 | 22.0 | [15.4, 29.2] | 141.3% | haiku55-effort-xhigh higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | 855,798.3 | [481,212.8, 1,210,120.7] | 285.7% | haiku55-effort-xhigh higher |
| implement | 8 | 2,330,562.1 | [1,250,621.9, 3,592,666.0] | 250.3% | haiku55-effort-xhigh higher |

**Verdict.** `haiku55-effort-xhigh` vs `sonnet55-effort-xhigh` over 16 paired tasks: tokens higher by 1,593,180 (95% CI [934,666, 2,353,071]); cost lower by 0.2305 (95% CI [-0.2742, -0.1889]); turns higher by 22.0 (95% CI [15.1, 29.7]); accuracy 100.0% vs 100.0% (32/32 vs 32/32).

### `haiku55-effort-low` vs `opus-effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-low | 32 | **162,261** (126,037–227,161) | 162,261 | 0.209 | 7.0 | 0 in 0 run(s) | 0 | 0 | 0 | 195 | 0 | 100.0% (32/32) | 186,043 |
| haiku55-effort-low | 32 | **258,305** (195,628–358,613) | 258,305 | 0.012 | 11.5 | 0 in 0 run(s) | 30 | 0 | 0 | 217 | 0 | 100.0% (32/32) | 400,999 |

Paired difference (`haiku55-effort-low` − `opus-effort-low`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 214,956.4 | [100,068.3, 369,507.3] | 99.0% | haiku55-effort-low higher |
| uncached_equivalent | 16 | 214,956.4 | [101,784.3, 370,797.4] | 99.0% | haiku55-effort-low higher |
| total_cost_usd | 16 | -0.2286 | [-0.2668, -0.1938] | -94.1% | haiku55-effort-low lower |
| num_turns | 16 | 6.7 | [3.9, 9.9] | 92.5% | haiku55-effort-low higher |

Iso-accuracy subset (16/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 214,956.4 | [94,578.8, 372,072.4] | 99.0% | haiku55-effort-low higher |
| uncached_equivalent | 16 | 214,956.4 | [87,970.7, 369,796.0] | 99.0% | haiku55-effort-low higher |
| total_cost_usd | 16 | -0.2286 | [-0.2698, -0.1934] | -94.1% | haiku55-effort-low lower |
| num_turns | 16 | 6.7 | [4.1, 9.8] | 92.5% | haiku55-effort-low higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | 50,706.3 | [30,511.8, 75,152.9] | 35.3% | haiku55-effort-low higher |
| implement | 8 | 379,206.5 | [182,731.0, 627,601.8] | 162.8% | haiku55-effort-low higher |

**Verdict.** `haiku55-effort-low` vs `opus-effort-low` over 16 paired tasks: tokens higher by 214,956 (95% CI [100,068, 369,507]); cost lower by 0.2286 (95% CI [-0.2668, -0.1938]); turns higher by 6.7 (95% CI [3.9, 9.9]); accuracy 100.0% vs 100.0% (32/32 vs 32/32).

### `haiku55-effort-medium` vs `opus-effort-medium`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-medium | 32 | **227,980** (176,611–292,629) | 227,980 | 0.285 | 8.5 | 0 in 0 run(s) | 0 | 0 | 0 | 269 | 0 | 100.0% (32/32) | 290,816 |
| haiku55-effort-medium | 32 | **358,514** (253,181–479,206) | 358,514 | 0.015 | 13.0 | 0 in 0 run(s) | 32 | 2 | 0 | 259 | 0 | 100.0% (32/32) | 578,782 |

Paired difference (`haiku55-effort-medium` − `opus-effort-medium`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 287,965.4 | [114,326.8, 536,905.6] | 81.8% | haiku55-effort-medium higher |
| uncached_equivalent | 16 | 287,965.4 | [110,780.6, 526,960.9] | 81.8% | haiku55-effort-medium higher |
| total_cost_usd | 16 | -0.3237 | [-0.3927, -0.2613] | -93.8% | haiku55-effort-medium lower |
| num_turns | 16 | 8.9 | [4.2, 15.7] | 87.5% | haiku55-effort-medium higher |

Iso-accuracy subset (16/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 287,965.4 | [110,182.9, 522,201.0] | 81.8% | haiku55-effort-medium higher |
| uncached_equivalent | 16 | 287,965.4 | [112,336.2, 525,027.9] | 81.8% | haiku55-effort-medium higher |
| total_cost_usd | 16 | -0.3237 | [-0.3959, -0.2636] | -93.8% | haiku55-effort-medium lower |
| num_turns | 16 | 8.9 | [3.9, 15.1] | 87.5% | haiku55-effort-medium higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | 50,603.9 | [-4,416.9, 100,984.2] | 29.1% | **CI crosses 0 — no detectable difference** |
| implement | 8 | 525,326.9 | [242,558.9, 936,891.3] | 134.5% | haiku55-effort-medium higher |

**Verdict.** `haiku55-effort-medium` vs `opus-effort-medium` over 16 paired tasks: tokens higher by 287,965 (95% CI [114,327, 536,906]); cost lower by 0.3237 (95% CI [-0.3927, -0.2613]); turns higher by 8.9 (95% CI [4.2, 15.7]); accuracy 100.0% vs 100.0% (32/32 vs 32/32).

### `haiku55-effort-high` vs `opus-effort-high`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-high | 32 | **277,823** (204,374–322,160) | 277,823 | 0.343 | 9.0 | 0 in 0 run(s) | 0 | 0 | 0 | 302 | 0 | 100.0% (32/32) | 364,968 |
| haiku55-effort-high | 32 | **607,549** (373,373–1,134,867) | 607,549 | 0.022 | 19.0 | 0 in 0 run(s) | 45 | 0 | 0 | 404 | 0 | 100.0% (32/32) | 1,044,938 |

Paired difference (`haiku55-effort-high` − `opus-effort-high`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 679,969.9 | [320,939.9, 1,108,323.6] | 148.7% | haiku55-effort-high higher |
| uncached_equivalent | 16 | 679,969.9 | [320,775.2, 1,115,636.6] | 148.7% | haiku55-effort-high higher |
| total_cost_usd | 16 | -0.3639 | [-0.4457, -0.2907] | -90.4% | haiku55-effort-high lower |
| num_turns | 16 | 12.8 | [8.0, 18.6] | 111.9% | haiku55-effort-high higher |

Iso-accuracy subset (16/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 679,969.9 | [330,091.9, 1,102,675.1] | 148.7% | haiku55-effort-high higher |
| uncached_equivalent | 16 | 679,969.9 | [330,868.6, 1,114,192.2] | 148.7% | haiku55-effort-high higher |
| total_cost_usd | 16 | -0.3639 | [-0.4502, -0.2929] | -90.4% | haiku55-effort-high lower |
| num_turns | 16 | 12.8 | [7.7, 18.4] | 111.9% | haiku55-effort-high higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | 192,632.1 | [118,951.8, 285,950.7] | 77.4% | haiku55-effort-high higher |
| implement | 8 | 1,167,307.7 | [561,430.4, 1,822,017.1] | 220.1% | haiku55-effort-high higher |

**Verdict.** `haiku55-effort-high` vs `opus-effort-high` over 16 paired tasks: tokens higher by 679,970 (95% CI [320,940, 1,108,324]); cost lower by 0.3639 (95% CI [-0.4457, -0.2907]); turns higher by 12.8 (95% CI [8.0, 18.6]); accuracy 100.0% vs 100.0% (32/32 vs 32/32).

### `haiku55-effort-xhigh` vs `opus-effort-xhigh`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opus-effort-xhigh | 32 | **506,582** (350,640–795,024) | 506,582 | 0.579 | 15.0 | 0 in 0 run(s) | 1 | 0 | 0 | 461 | 0 | 100.0% (32/32) | 745,042 |
| haiku55-effort-xhigh | 32 | **1,461,990** (1,016,967–2,515,852) | 1,461,990 | 0.049 | 32.0 | 0 in 0 run(s) | 186 | 0 | 0 | 578 | 0 | 100.0% (32/32) | 2,198,766 |

Paired difference (`haiku55-effort-xhigh` − `opus-effort-xhigh`), all 16 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 1,453,724.6 | [859,686.9, 2,168,116.6] | 219.3% | haiku55-effort-xhigh higher |
| uncached_equivalent | 16 | 1,453,724.6 | [851,560.8, 2,179,060.7] | 219.3% | haiku55-effort-xhigh higher |
| total_cost_usd | 16 | -0.5674 | [-0.7375, -0.4287] | -83.2% | haiku55-effort-xhigh lower |
| num_turns | 16 | 21.4 | [15.5, 28.5] | 138.5% | haiku55-effort-xhigh higher |

Iso-accuracy subset (16/16 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 16 | 1,453,724.6 | [870,160.5, 2,173,511.5] | 219.3% | haiku55-effort-xhigh higher |
| uncached_equivalent | 16 | 1,453,724.6 | [860,323.9, 2,161,020.6] | 219.3% | haiku55-effort-xhigh higher |
| total_cost_usd | 16 | -0.5674 | [-0.7381, -0.4312] | -83.2% | haiku55-effort-xhigh lower |
| num_turns | 16 | 21.4 | [15.3, 28.3] | 138.5% | haiku55-effort-xhigh higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| fix | 8 | 771,327.1 | [423,651.1, 1,130,367.7] | 232.3% | haiku55-effort-xhigh higher |
| implement | 8 | 2,136,122.1 | [1,086,999.9, 3,290,217.0] | 206.4% | haiku55-effort-xhigh higher |

**Verdict.** `haiku55-effort-xhigh` vs `opus-effort-xhigh` over 16 paired tasks: tokens higher by 1,453,725 (95% CI [859,687, 2,168,117]); cost lower by 0.5674 (95% CI [-0.7375, -0.4287]); turns higher by 21.4 (95% CI [15.5, 28.5]); accuracy 100.0% vs 100.0% (32/32 vs 32/32).

## 8. Features never exercised

graphify exposes more than `query`. The table counts, per arm, how many times each subcommand was invoked across all runs (and, in parentheses, how many runs used it at least once). A zero column is the point: it means the benchmark never put that feature under measurement, so nothing here — positive or negative — can be read as evidence about it.

| condition | runs | `query` | `explain` | `path` | `god-nodes` | `affected` | `save-result` | `reflect` | `update` | `benchmark` |
|---|---|---|---|---|---|---|---|---|---|---|
| `effort-high` | 32 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `effort-low` | 32 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `effort-low-nosub` | 32 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `effort-medium` | 32 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `effort-xhigh` | 32 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `grok-effort-high` | 32 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `grok-effort-low` | 32 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `grok-effort-medium` | 32 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `haiku55-effort-high` | 32 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `haiku55-effort-low` | 32 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `haiku55-effort-medium` | 32 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `haiku55-effort-xhigh` | 32 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
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
| `effort-high` | 32 | 142,568 (100,387–238,486) | 102,584 (67,952–210,774) | 164,021 (94,145–282,054) | 2,374 (1,769–3,158) | 32 (18–35) |
| `effort-low` | 32 | 70,744 (51,123–151,463) | 56,875 (37,799–101,596) | 76,665 (46,069–162,618) | 1,293 (1,185–1,909) | 27 (18–30) |
| `effort-low-nosub` | 32 | 53,189 (36,996–107,437) | 50,201 (36,059–104,168) | 47,882 (30,266–98,360) | 1,542 (1,180–1,975) | 28 (27–31) |
| `effort-medium` | 32 | 113,515 (71,793–218,312) | 75,291 (24,443–180,623) | 120,854 (82,921–235,340) | 1,664 (1,238–2,521) | 25 (8–28) |
| `effort-xhigh` | 32 | 190,055 (114,005–313,224) | 139,248 (87,975–275,720) | 189,372 (111,157–304,798) | 2,282 (1,907–3,259) | 31 (24–35) |
| `grok-effort-high` | 32 | 445,452 (276,989–612,255) | 443,984 (275,545–607,771) | 434,960 (270,856–605,536) | – | – |
| `grok-effort-low` | 32 | 76,629 (56,831–130,604) | 74,338 (50,271–126,827) | 73,566 (49,639–125,917) | – | – |
| `grok-effort-medium` | 32 | 249,384 (155,322–448,969) | 245,389 (147,225–447,480) | 241,926 (145,473–443,889) | – | – |
| `haiku55-effort-high` | 32 | 71,006 (46,220–126,003) | 65,674 (43,058–119,591) | 59,928 (40,530–108,519) | 989 (833–1,084) | 42 (39–49) |
| `haiku55-effort-low` | 32 | 38,759 (29,846–70,794) | 30,085 (21,880–67,892) | 29,565 (21,293–66,283) | 1,265 (896–1,413) | 38 (33–44) |
| `haiku55-effort-medium` | 32 | 49,706 (30,827–71,473) | 40,368 (25,119–55,884) | 37,355 (24,581–53,271) | 1,011 (865–1,257) | 40 (34–59) |
| `haiku55-effort-xhigh` | 32 | 169,622 (119,195–262,773) | 161,045 (111,088–254,168) | 144,174 (98,789–225,690) | 905 (809–1,021) | 41 (35–48) |
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

| condition | `Read` | `Grep` | `Bash` | `Agent` |
|---|---|---|---|---|
| `effort-high` | 11 (6–15) | – | 42 (31–150) | 13 (8–23) |
| `effort-low` | 5 (4–8) | – | 40 (27–204) | 14 (9–31,883) |
| `effort-low-nosub` | 6 (5–9) | – | 37 (26–196) | – |
| `effort-medium` | 6 (5–9) | – | 41 (26–215) | 12 (8–34,139) |
| `effort-xhigh` | 11 (6–15) | – | 43 (32–170) | 17 (13–44) |
| `grok-effort-high` | – | – | – | – |
| `grok-effort-low` | – | – | – | – |
| `grok-effort-medium` | – | – | – | – |
| `haiku55-effort-high` | 8 (5–12) | – | 51 (33–146) | – |
| `haiku55-effort-low` | 8 (5–10) | – | 54 (42–134) | – |
| `haiku55-effort-medium` | 6 (5–8) | 2 (2–2) | 52 (35–125) | – |
| `haiku55-effort-xhigh` | 6 (5–10) | – | 51 (33–206) | – |
| `opus-effort-high` | – | – | 60 (43–179) | – |
| `opus-effort-low` | – | – | 62 (39–202) | – |
| `opus-effort-medium` | – | – | 53 (37–192) | – |
| `opus-effort-xhigh` | 23 (23–23) | – | 53 (41–81) | – |
| `sonnet55-effort-high` | 5 (5–10) | – | 50 (33–192) | – |
| `sonnet55-effort-low` | 7 (6–10) | – | 49 (36–187) | – |
| `sonnet55-effort-medium` | 6 (5–10) | – | 59 (38–192) | – |
| `sonnet55-effort-xhigh` | 8 (5–14) | – | 52 (35–164) | – |

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
| `grok-effort-high` | 32 | 0 | 0 | – |
| `grok-effort-low` | 32 | 0 | 0 | – |
| `grok-effort-medium` | 32 | 0 | 0 | – |
| `haiku55-effort-high` | 32 | 268,090 | 534,138 | 50.2% |
| `haiku55-effort-low` | 32 | 82,216 | 240,126 | 34.2% |
| `haiku55-effort-medium` | 32 | 136,839 | 330,284 | 41.4% |
| `haiku55-effort-xhigh` | 32 | 744,315 | 1,185,227 | 62.8% |
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

| condition | `claude-haiku-5-5` tokens | `claude-opus-5-5` tokens | `claude-sonnet-5` tokens | `claude-sonnet-5-5` tokens | `grok-4.7-build` tokens | `claude-haiku-5-5` cost | `claude-opus-5-5` cost | `claude-sonnet-5` cost | `claude-sonnet-5-5` cost | `grok-4.7-build` cost |
|---|---|---|---|---|---|---|---|---|---|---|
| `effort-high` | 0 | 0 | 61,366,628 | 0 | 0 | $0.00 | $0.00 | $25.51 | $0.00 | $0.00 |
| `effort-low` | 0 | 0 | 35,604,499 | 0 | 0 | $0.00 | $0.00 | $15.63 | $0.00 | $0.00 |
| `effort-low-nosub` | 0 | 0 | 31,095,542 | 0 | 0 | $0.00 | $0.00 | $12.23 | $0.00 | $0.00 |
| `effort-medium` | 0 | 0 | 48,939,400 | 0 | 0 | $0.00 | $0.00 | $21.71 | $0.00 | $0.00 |
| `effort-xhigh` | 0 | 0 | 75,923,804 | 0 | 0 | $0.00 | $0.00 | $30.82 | $0.00 | $0.00 |
| `grok-effort-high` | 0 | 0 | 0 | 0 | 79,360,793 | $0.00 | $0.00 | $0.00 | $0.00 | $18.23 |
| `grok-effort-low` | 0 | 0 | 0 | 0 | 15,433,188 | $0.00 | $0.00 | $0.00 | $0.00 | $4.17 |
| `grok-effort-medium` | 0 | 0 | 0 | 0 | 49,170,375 | $0.00 | $0.00 | $0.00 | $0.00 | $12.24 |
| `haiku55-effort-high` | 33,438,015 | 0 | 0 | 0 | 0 | $1.77 | $0.00 | $0.00 | $0.00 | $0.00 |
| `haiku55-effort-low` | 12,831,980 | 0 | 0 | 0 | 0 | $0.48 | $0.00 | $0.00 | $0.00 | $0.00 |
| `haiku55-effort-medium` | 18,521,009 | 0 | 0 | 0 | 0 | $0.85 | $0.00 | $0.00 | $0.00 | $0.00 |
| `haiku55-effort-xhigh` | 70,360,519 | 0 | 0 | 0 | 0 | $5.08 | $0.00 | $0.00 | $0.00 | $0.00 |
| `opus-effort-high` | 0 | 11,678,978 | 0 | 0 | 0 | $0.00 | $13.42 | $0.00 | $0.00 | $0.00 |
| `opus-effort-low` | 0 | 5,953,375 | 0 | 0 | 0 | $0.00 | $7.80 | $0.00 | $0.00 | $0.00 |
| `opus-effort-medium` | 0 | 9,306,115 | 0 | 0 | 0 | $0.00 | $11.21 | $0.00 | $0.00 | $0.00 |
| `opus-effort-xhigh` | 0 | 23,841,332 | 0 | 0 | 0 | $0.00 | $23.24 | $0.00 | $0.00 | $0.00 |
| `sonnet55-effort-high` | 0 | 0 | 0 | 8,946,857 | 0 | $0.00 | $0.00 | $0.00 | $6.46 | $0.00 |
| `sonnet55-effort-low` | 0 | 0 | 0 | 6,418,394 | 0 | $0.00 | $0.00 | $0.00 | $4.68 | $0.00 |
| `sonnet55-effort-medium` | 0 | 0 | 0 | 6,559,542 | 0 | $0.00 | $0.00 | $0.00 | $4.94 | $0.00 |
| `sonnet55-effort-xhigh` | 0 | 0 | 0 | 19,378,753 | 0 | $0.00 | $0.00 | $0.00 | $12.46 | $0.00 |

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
| `grok-effort-high` | 32 | 2,174,098 | 31 | 0 | 0 | 2,174,098 | 0.0% |
| `grok-effort-low` | 32 | 387,181 | 12 | 0 | 0 | 387,181 | 0.0% |
| `grok-effort-medium` | 32 | 1,248,999 | 25 | 0 | 0 | 1,248,999 | 0.0% |
| `haiku55-effort-high` | 32 | 607,549 | 19 | 8,210 | 166,780 | 414,512 | 28.6% |
| `haiku55-effort-low` | 32 | 258,305 | 12 | 10,620 | 106,407 | 139,079 | 41.0% |
| `haiku55-effort-medium` | 32 | 358,514 | 13 | 10,603 | 142,467 | 208,027 | 36.0% |
| `haiku55-effort-xhigh` | 32 | 1,461,990 | 32 | 8,213 | 318,566 | 1,194,683 | 19.5% |
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
- `grok-effort-high`: **0** subagent(s) spawned across **0**/32 run(s). T2S all-model 2,480,025 vs main-session-only 2,480,025.
- `grok-effort-low`: **0** subagent(s) spawned across **0**/32 run(s). T2S all-model 482,287 vs main-session-only 482,287.
- `grok-effort-medium`: **0** subagent(s) spawned across **0**/32 run(s). T2S all-model 1,536,574 vs main-session-only 1,536,574.
- `haiku55-effort-high`: **0** subagent(s) spawned across **0**/32 run(s). T2S all-model 1,044,938 vs main-session-only 1,044,938.
- `haiku55-effort-low`: **0** subagent(s) spawned across **0**/32 run(s). T2S all-model 400,999 vs main-session-only 400,999.
- `haiku55-effort-medium`: **0** subagent(s) spawned across **0**/32 run(s). T2S all-model 578,782 vs main-session-only 578,782.
- `haiku55-effort-xhigh`: **0** subagent(s) spawned across **0**/32 run(s). T2S all-model 2,198,766 vs main-session-only 2,198,766.
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

Harness failures (`is_error`, or `terminal_reason` other than `completed`): **12**. The table below also lists runs that completed normally but did not meet their grader's success threshold — those are accuracy results, not execution problems.

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
| `HIM5-free-viewer-seats__haiku55-effort-xhigh__r1` | haiku55-effort-xhigh | HIM5-free-viewer-seats | true | max_turns |
| `HIM6-private-project-visibility__effort-high__r1` | effort-high | HIM6-private-project-visibility | true | max_turns |
| `HIM6-private-project-visibility__effort-high__r2` | effort-high | HIM6-private-project-visibility | true | max_turns |
| `HIM6-private-project-visibility__effort-xhigh__r1` | effort-xhigh | HIM6-private-project-visibility | true | max_turns |
| `HIM6-private-project-visibility__sonnet55-effort-medium__r1` | sonnet55-effort-medium | HIM6-private-project-visibility | false | completed |
| `HIM7-issue-unassigned-event__effort-low-nosub__r2` | effort-low-nosub | HIM7-issue-unassigned-event | true | max_turns |
| `HIM7-issue-unassigned-event__effort-low__r1` | effort-low | HIM7-issue-unassigned-event | true | max_turns |
| `HIM7-issue-unassigned-event__grok-effort-high__r2` | grok-effort-high | HIM7-issue-unassigned-event | true | error_max_turns |

## 14. Limitations

- N = 640 runs over 16 tasks; a single corpus and a single model. These results do not generalize to other codebases or models.
- Bootstrap resamples tasks, so the interval reflects task-to-task variation, not within-task run noise.
- Where a CI crosses zero the honest reading is "no difference detected at this N", not "no difference exists".
- The fixed ~21k-token system-prompt/tool-definition overhead is included in both arms and not subtracted (see §2).
- **1 repetition per (task × condition)**: within-task run-to-run variance is unmeasured, so any single per-task difference may be run noise.
- Subagent traffic is counted in `uncached_all`, but a subagent's tool calls never reach the parent transcript, so the tool-call columns stay main-session-only.
- Raw per-run data lives in `results/hard/runs/<run-id>/` and the `summary.csv` beside this report.
