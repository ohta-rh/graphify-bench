# graphify-bench results

Generated 2026-09-02T08:16:25.983Z. 100 runs over 20 tasks, conditions: baseline, graphify-strict-v2, graphify-v2, haiku-baseline, haiku-graphify-v2.

## 1. Environment

- Claude Code: `2.1.258 (Claude Code)`
- graphify: `graphify 0.9.53`
- Node: `v25.5.0` / pnpm `10.28.2`
- Platform: `darwin 25.2.0 arm64`
- Model: `claude-sonnet-5`, effort `high`, --max-turns 60, --max-budget-usd 4

- Bootstrap: B=2000, percentile 95% CI, seed `graphify-bench-bootstrap`, resampled over **tasks**.
- Corpus: `corpus-v2`, tree hash (sha256) `4148d9b26fb31b95ab8424af1f88cfc7741bb655b3ad3bbb557a8c3c516c12da` (source: `docs/plan/CORPUS.md`). That hash pins `src`+`tests`, which `corpus-v2` leaves frozen; its addition is the `docs/` layer, hashed the same way: `2f3392342f9a9745dbc2868eeb6e11cebdc17837d9cbbef078eef594db9c9b64`.
- Report generated: 2026-09-02.

The `Model` line above is the harness default; arms that override it are listed here. Every field comes from the run's own `run.meta.json`, not from the report's assumptions.

| condition | model | overlays | extra `claude` args | what it isolates |
|---|---|---|---|---|
| `baseline` | `claude-sonnet-5` | `baseline` | – | No graph, no hooks — the reference arm. Corpus-independent: it ships no graph, so it reads whatever corpus generation it is run against, docs included. |
| `graphify-strict-v2` | `claude-sonnet-5` | `graphify-v2` + `graphify-strict-v2` | – | `graphify-v2` with the Read\|Glob hook switched to `hook-guard read --strict`, so the first raw Read of an indexed file is DENIED and redirected to `graphify query`. A delta overlay: it ships only the settings file and inherits the multi-megabyte graph from `graphify-v2`. |
| `graphify-v2` | `claude-sonnet-5` | `graphify-v2` | – | graphify over code AND the 139-file documentation layer (corpus-v2). Same skill, CLAUDE.md and nudge hooks as `graphify`; the graph adds doc nodes and doc->code traceability edges, which is what the doc-vs-code task set measures. |
| `haiku-baseline` | `claude-haiku-4-5` | `baseline` | – | Baseline run by a weaker explorer. |
| `haiku-graphify-v2` | `claude-haiku-4-5` | `graphify-v2` | – | `graphify-v2` run by a weaker explorer. Its reference arm is `haiku-baseline`, which ships no graph and therefore reads whatever corpus it is pointed at — on corpus-v2 that includes the documentation layer, so the pair isolates the graph, not the presence of the docs. |

## 2. Overall

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 20 | **318,144** (208,381–869,934) | 151,516 | 0.256 | 5.0 | 10 in 8 run(s) | 27 | 0 | 0 | 93 | 0 | 70.0% (14/20) | 367,328 |
| graphify-strict-v2 | 20 | **456,468** (228,101–667,047) | 455,427 | 0.286 | 12.0 | 0 in 0 run(s) | 74 | 0 | 0 | 135 | 36 | 70.0% (14/20) | 453,066 |
| graphify-v2 | 20 | **443,863** (205,549–734,775) | 442,839 | 0.283 | 12.5 | 0 in 0 run(s) | 63 | 0 | 0 | 146 | 38 | 80.0% (16/20) | 502,286 |
| haiku-baseline | 20 | **634,043** (153,893–839,805) | 582,590 | 0.167 | 14.0 | 1 in 1 run(s) | 122 | 0 | 0 | 154 | 0 | 80.0% (16/20) | 631,724 |
| haiku-graphify-v2 | 20 | **440,614** (161,348–897,862) | 439,649 | 0.127 | 12.5 | 0 in 0 run(s) | 123 | 0 | 0 | 78 | 41 | 75.0% (15/20) | 439,640 |

**`uncached_all` (PRIMARY) = Σ over every entry of `modelUsage` of (inputTokens + cacheReadInputTokens + cacheCreationInputTokens)** — it covers the main session *and* any subagent, so it is commensurable with `total_cost_usd`. `uncached_main` (secondary) is the same sum taken from `usage.*`, which the result JSON populates for the **main session only**; a run that spawned a subagent therefore reports less information volume there than it actually consumed. The `subagents` column lets the two be reconciled. Tool columns are totals across all runs of the condition. T2S (tokens-to-success) = total `uncached_all` of successful runs / number of successful runs.

Fixed overhead, reported separately so readers can subtract it (architecture.md §5):

| condition | first-turn cache_creation (median) |
|---|---|
| baseline | 10,355 |
| graphify-strict-v2 | 10,934 |
| graphify-v2 | 10,936 |
| haiku-baseline | 8,006 |
| haiku-graphify-v2 | 8,430 |

## 3. Paired difference (graphify-v2 − baseline), all tasks

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 20 | -129,440.4 | [-324,503.1, 32,832.3] | 15.1% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 20 | 283,438.2 | [137,110.3, 441,012.9] | 337.4% | graphify-v2 higher |
| total_cost_usd | 20 | -0.0839 | [-0.1801, -0.0049] | 1.6% | graphify-v2 lower |
| num_turns | 20 | 6.5 | [3.0, 9.9] | 275.7% | graphify-v2 higher |

> **Why the two token rows disagree.** Subagent use is asymmetric between the arms (baseline 8/20 runs, graphify-v2 0/20). `uncached_equivalent` cannot see a subagent's tokens, so it charges that work to nobody and makes the subagent-spawning arm look cheap; `uncached_equivalent_all` counts it. **Read the `_all` row** — the main-only row is retained only to show the size of the distortion.

## 4. Iso-accuracy subset

Tasks where every graded run of both conditions succeeded (14/20): `DDIS1-permissions-and-role-gates`, `DDIS3-schema-indexes`, `DEXP1-webhook-attempt-ceiling-chain`, `DEXP2-flags-screen-permission-chain`, `DEXP3-digest-cadence-chain`, `DEXP4-issue-number-allocation-chain`, `DIMP4-req157-renumber`, `DLOC1-issue-number-scope`, `DLOC2-webhook-retry-decision`, `DLOC3-subscriber-isolation`, `DLOC4-webhook-delivery-history-screen`, `DREF2-digest-cadence-adrs`, `DREF3-permission-matrix-verified-by`, `DREF4-adr017-references`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 14 | **267,019** (152,241–411,763) | 188,935 | 0.192 | 5.5 | 3 in 3 run(s) | 24 | 0 | 0 | 68 | 0 | 100.0% (14/14) | 367,328 |
| graphify-strict-v2 | 14 | **288,005** (208,865–560,152) | 287,012 | 0.215 | 9.5 | 0 in 0 run(s) | 37 | 0 | 0 | 79 | 20 | 92.9% (13/14) | 463,396 |
| graphify-v2 | 14 | **258,392** (198,989–532,386) | 257,399 | 0.199 | 8.0 | 0 in 0 run(s) | 37 | 0 | 0 | 78 | 17 | 100.0% (14/14) | 367,348 |
| haiku-baseline | 14 | **330,654** (111,600–728,065) | 329,675 | 0.098 | 10.5 | 0 in 0 run(s) | 78 | 0 | 0 | 89 | 0 | 100.0% (14/14) | 608,937 |
| haiku-graphify-v2 | 14 | **260,428** (112,194–834,897) | 259,432 | 0.092 | 8.0 | 0 in 0 run(s) | 71 | 0 | 0 | 47 | 26 | 100.0% (14/14) | 450,941 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 14 | 19.6 | [-129,899.7, 125,700.1] | 30.7% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 14 | 125,675.1 | [28,741.0, 230,730.4] | 87.6% | graphify-v2 higher |
| total_cost_usd | 14 | -0.0219 | [-0.1036, 0.0438] | 13.7% | **CI crosses 0 — no detectable difference** |
| num_turns | 14 | 2.9 | [0.4, 5.6] | 65.7% | graphify-v2 higher |

## 5. By category

### discrepancy (4 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 4 | -494,689.8 | [-1,220,336.3, -52,687.0] | -20.0% | graphify-v2 lower |
| uncached_equivalent | 4 | 588,467.5 | [201,968.5, 938,256.0] | 338.7% | graphify-v2 higher |
| total_cost_usd | 4 | -0.2958 | [-0.5913, -0.0608] | -29.0% | graphify-v2 lower |
| num_turns | 4 | 11.0 | [3.3, 16.0] | 275.6% | graphify-v2 higher |

### explain (4 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 4 | -139,554.0 | [-472,729.0, 155,680.5] | 2.0% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 4 | 108,315.3 | [-101,613.5, 318,244.0] | 122.6% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 4 | -0.0847 | [-0.3120, 0.0620] | -6.1% | **CI crosses 0 — no detectable difference** |
| num_turns | 4 | 2.5 | [-3.5, 8.5] | 70.1% | **CI crosses 0 — no detectable difference** |

### impact (4 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 4 | -152,924.8 | [-414,820.0, 108,970.5] | 4.4% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 4 | 536,122.8 | [240,252.3, 780,968.0] | 1108.6% | graphify-v2 higher |
| total_cost_usd | 4 | -0.0728 | [-0.1758, 0.0302] | -0.7% | **CI crosses 0 — no detectable difference** |
| num_turns | 4 | 14.8 | [5.8, 22.0] | 937.5% | graphify-v2 higher |

### locate (4 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 4 | 118,473.3 | [-67,159.8, 372,681.0] | 60.8% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 4 | 162,792.0 | [7,053.5, 395,988.5] | 88.1% | graphify-v2 higher |
| total_cost_usd | 4 | 0.0265 | [-0.0777, 0.1426] | 26.3% | **CI crosses 0 — no detectable difference** |
| num_turns | 4 | 3.5 | [-0.3, 8.0] | 72.4% | **CI crosses 0 — no detectable difference** |

### reference (4 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 4 | 21,493.3 | [-34,354.0, 77,340.5] | 28.5% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 4 | 21,493.3 | [-34,354.0, 77,340.5] | 28.8% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 4 | 0.0071 | [-0.0420, 0.0389] | 17.4% | **CI crosses 0 — no detectable difference** |
| num_turns | 4 | 0.5 | [-1.3, 2.3] | 22.9% | **CI crosses 0 — no detectable difference** |

## 6. Answer quality by category

Section 5 reports what each category *cost*. This one reports whether it was *answered*: each cell is `successes/graded · mean grader score`. The two are not interchangeable — an arm that gives up early looks cheap in section 5 and is exposed here.

| condition | **discrepancy** | **explain** | **impact** | **locate** | **reference** |
|---|---|---|---|---|---|
| `baseline` | 2/4 · 0.681 | 4/4 · 0.950 | 1/4 · 0.587 | 4/4 · 1.000 | 3/4 · 0.917 |
| `graphify-strict-v2` | 2/4 · 0.714 | 4/4 · 0.900 | 1/4 · 0.591 | 3/4 · 0.917 | 4/4 · 1.000 |
| `graphify-v2` | 4/4 · 0.938 | 4/4 · 0.900 | 1/4 · 0.602 | 4/4 · 1.000 | 3/4 · 0.917 |
| `haiku-baseline` | 3/4 · 0.717 | 4/4 · 0.900 | 1/4 · 0.495 | 4/4 · 1.000 | 4/4 · 1.000 |
| `haiku-graphify-v2` | 2/4 · 0.550 | 4/4 · 0.850 | 1/4 · 0.617 | 4/4 · 1.000 | 4/4 · 1.000 |

**`discrepancy` — the doc-vs-code contradiction hunt.** 4 tasks partition the **12** contradictions planted into corpus-v2 when it was written and recorded in `tasks/keys/docs-discrepancies.json`. The prompts name no document, path or id: each describes a domain in prose and asks which documents the code contradicts. Its `success_threshold` is **0.6**, not the 0.9 the other set categories use — finding two of three planted contradictions is a genuinely useful result, and at 0.9 the category would report an almost uniform zero and measure nothing. A success here therefore means something weaker than a success elsewhere, which is why the mean score is printed beside it rather than the pass count alone.

## 7. This set beside the other one

The same arm pairs, measured on both task sets. One set alone cannot separate a property of the corpus under test from a property of the harness; two columns can. Both sides are paired mean differences with a 95% percentile bootstrap CI over tasks, computed by the same code — only the tasks, and on this side the documentation layer, differ.

### graphify / graphify-v2 − baseline (headline)

| metric | code-45 (n=45) | docs-20 (n=20) |
|---|---|---|
| `uncached_equivalent_all` | 32,097.3 [-7,761.7, 74,822.1] — crosses 0 | -129,440.4 [-324,503.1, 32,832.3] — crosses 0 |
| `total_cost_usd` | -0.0063 [-0.0284, 0.0163] — crosses 0 | -0.0839 [-0.1801, -0.0049] |
| `num_turns` | 6.7 [4.4, 9.5] | 6.5 [3.0, 9.9] |

### haiku graphify − haiku baseline

| metric | code-45 (n=45) | docs-20 (n=20) |
|---|---|---|
| `uncached_equivalent_all` | -119,337.8 [-245,219.7, -11,604.5] | -160,952.9 [-316,961.3, -25,318.9] |
| `total_cost_usd` | -0.0163 [-0.0378, 0.0015] — crosses 0 | -0.0297 [-0.0601, -0.0038] |
| `num_turns` | -2.8 [-5.4, -0.4] | -1.5 [-4.3, 1.5] — crosses 0 |

## 8. Structural comparisons

Each block below is an independent paired comparison between two arms, computed with the same machinery as §3: per-task pairing over the same task set, percentile bootstrap over tasks, an iso-accuracy subset scoped to just those two arms, and a per-category breakdown. Arms that are not part of a block are excluded from it entirely.

### `graphify-v2` vs `baseline`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 20 | **318,144** (208,381–869,934) | 151,516 | 0.256 | 5.0 | 10 in 8 run(s) | 27 | 0 | 0 | 93 | 0 | 70.0% (14/20) | 367,328 |
| graphify-v2 | 20 | **443,863** (205,549–734,775) | 442,839 | 0.283 | 12.5 | 0 in 0 run(s) | 63 | 0 | 0 | 146 | 38 | 80.0% (16/20) | 502,286 |

Paired difference (`graphify-v2` − `baseline`), all 20 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 20 | -129,440.4 | [-340,221.3, 32,930.7] | 15.1% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 20 | 283,438.2 | [139,000.5, 440,569.4] | 337.4% | graphify-v2 higher |
| total_cost_usd | 20 | -0.0839 | [-0.1852, -0.0043] | 1.6% | graphify-v2 lower |
| num_turns | 20 | 6.5 | [3.1, 10.0] | 275.7% | graphify-v2 higher |

Iso-accuracy subset (14/20 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 14 | 19.6 | [-137,291.0, 127,550.0] | 30.7% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 14 | 125,675.1 | [28,264.0, 240,426.4] | 87.6% | graphify-v2 higher |
| total_cost_usd | 14 | -0.0219 | [-0.0996, 0.0450] | 13.7% | **CI crosses 0 — no detectable difference** |
| num_turns | 14 | 2.9 | [0.3, 5.6] | 65.7% | graphify-v2 higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| discrepancy | 4 | -494,689.8 | [-1,220,336.3, -52,687.0] | -20.0% | graphify-v2 lower |
| explain | 4 | -139,554.0 | [-472,729.0, 219,800.8] | 2.0% | **CI crosses 0 — no detectable difference** |
| impact | 4 | -152,924.8 | [-414,820.0, 108,970.5] | 4.4% | **CI crosses 0 — no detectable difference** |
| locate | 4 | 118,473.3 | [-66,634.5, 372,681.0] | 60.8% | **CI crosses 0 — no detectable difference** |
| reference | 4 | 21,493.3 | [-34,354.0, 77,340.5] | 28.5% | **CI crosses 0 — no detectable difference** |

**Verdict.** `graphify-v2` vs `baseline` over 20 paired tasks: tokens no detectable difference; cost lower by 0.0839 (95% CI [-0.1852, -0.0043]); turns higher by 6.5 (95% CI [3.1, 10.0]); accuracy 80.0% vs 70.0% (16/20 vs 14/20).

### `graphify-strict-v2` vs `baseline`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 20 | **318,144** (208,381–869,934) | 151,516 | 0.256 | 5.0 | 10 in 8 run(s) | 27 | 0 | 0 | 93 | 0 | 70.0% (14/20) | 367,328 |
| graphify-strict-v2 | 20 | **456,468** (228,101–667,047) | 455,427 | 0.286 | 12.0 | 0 in 0 run(s) | 74 | 0 | 0 | 135 | 36 | 70.0% (14/20) | 453,066 |

Paired difference (`graphify-strict-v2` − `baseline`), all 20 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 20 | -109,699.1 | [-483,894.2, 156,238.9] | 27.9% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 20 | 303,179.5 | [134,614.3, 468,976.3] | 376.9% | graphify-strict-v2 higher |
| total_cost_usd | 20 | -0.0835 | [-0.2290, 0.0281] | 9.1% | **CI crosses 0 — no detectable difference** |
| num_turns | 20 | 6.4 | [3.2, 10.1] | 285.4% | graphify-strict-v2 higher |

Iso-accuracy subset (13/20 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 13 | 89,212.8 | [-95,028.0, 261,924.6] | 50.9% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 13 | 210,897.5 | [111,160.0, 330,343.5] | 98.9% | graphify-strict-v2 higher |
| total_cost_usd | 13 | 0.0136 | [-0.0788, 0.0966] | 30.5% | **CI crosses 0 — no detectable difference** |
| num_turns | 13 | 3.2 | [1.5, 4.7] | 59.9% | graphify-strict-v2 higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| discrepancy | 4 | -763,847.8 | [-2,353,462.0, 204,994.3] | -9.2% | **CI crosses 0 — no detectable difference** |
| explain | 4 | 91,206.5 | [-428,763.0, 563,667.5] | 29.8% | **CI crosses 0 — no detectable difference** |
| impact | 4 | 16,525.5 | [-461,544.8, 316,932.5] | 38.3% | **CI crosses 0 — no detectable difference** |
| locate | 4 | 62,890.0 | [-80,983.5, 222,159.5] | 40.3% | **CI crosses 0 — no detectable difference** |
| reference | 4 | 44,730.3 | [-7,177.0, 96,637.5] | 40.2% | **CI crosses 0 — no detectable difference** |

**Verdict.** `graphify-strict-v2` vs `baseline` over 20 paired tasks: tokens no detectable difference; cost no detectable difference; turns higher by 6.4 (95% CI [3.2, 10.1]); accuracy 70.0% vs 70.0% (14/20 vs 14/20).

### `graphify-strict-v2` vs `graphify-v2`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| graphify-v2 | 20 | **443,863** (205,549–734,775) | 442,839 | 0.283 | 12.5 | 0 in 0 run(s) | 63 | 0 | 0 | 146 | 38 | 80.0% (16/20) | 502,286 |
| graphify-strict-v2 | 20 | **456,468** (228,101–667,047) | 455,427 | 0.286 | 12.0 | 0 in 0 run(s) | 74 | 0 | 0 | 135 | 36 | 70.0% (14/20) | 453,066 |

Paired difference (`graphify-strict-v2` − `graphify-v2`), all 20 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 20 | 19,741.3 | [-185,108.2, 213,100.6] | 16.5% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 20 | 19,741.3 | [-203,543.7, 219,282.0] | 16.5% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 20 | 0.0004 | [-0.0680, 0.0660] | 7.6% | **CI crosses 0 — no detectable difference** |
| num_turns | 20 | -0.1 | [-2.6, 2.1] | 5.4% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (13/20 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 13 | 80,833.5 | [-42,808.2, 254,962.6] | 20.2% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 13 | 80,833.5 | [-43,326.1, 250,524.4] | 20.3% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 13 | 0.0287 | [-0.0125, 0.0789] | 12.4% | **CI crosses 0 — no detectable difference** |
| num_turns | 13 | 0.3 | [-1.8, 2.5] | 7.0% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| discrepancy | 4 | -269,158.0 | [-1,090,894.3, 319,058.0] | 3.4% | **CI crosses 0 — no detectable difference** |
| explain | 4 | 230,760.5 | [-22,698.5, 726,399.3] | 40.9% | **CI crosses 0 — no detectable difference** |
| impact | 4 | 169,450.3 | [-159,687.0, 546,997.3] | 37.0% | **CI crosses 0 — no detectable difference** |
| locate | 4 | -55,583.3 | [-150,521.5, 3,341.5] | -10.0% | **CI crosses 0 — no detectable difference** |
| reference | 4 | 23,237.0 | [8,416.5, 34,117.5] | 11.1% | graphify-strict-v2 higher |

**Verdict.** `graphify-strict-v2` vs `graphify-v2` over 20 paired tasks: tokens no detectable difference; cost no detectable difference; turns no detectable difference; accuracy 70.0% vs 80.0% (14/20 vs 16/20).

### `haiku-graphify-v2` vs `haiku-baseline`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| haiku-baseline | 20 | **634,043** (153,893–839,805) | 582,590 | 0.167 | 14.0 | 1 in 1 run(s) | 122 | 0 | 0 | 154 | 0 | 80.0% (16/20) | 631,724 |
| haiku-graphify-v2 | 20 | **440,614** (161,348–897,862) | 439,649 | 0.127 | 12.5 | 0 in 0 run(s) | 123 | 0 | 0 | 78 | 41 | 75.0% (15/20) | 439,640 |

Paired difference (`haiku-graphify-v2` − `haiku-baseline`), all 20 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 20 | -160,952.9 | [-316,961.3, -25,318.9] | -4.8% | haiku-graphify-v2 lower |
| uncached_equivalent | 20 | -123,618.0 | [-303,844.8, 40,451.4] | 98.5% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 20 | -0.0297 | [-0.0601, -0.0038] | -5.7% | haiku-graphify-v2 lower |
| num_turns | 20 | -1.5 | [-4.3, 1.5] | 66.5% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (15/20 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 15 | -165,079.5 | [-356,959.9, 10,591.4] | -3.0% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 15 | -165,079.5 | [-379,022.7, 11,378.1] | -2.9% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 15 | -0.0302 | [-0.0671, 0.0035] | -4.7% | **CI crosses 0 — no detectable difference** |
| num_turns | 15 | -1.7 | [-4.5, 0.9] | -1.6% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| discrepancy | 4 | -291,567.0 | [-834,234.0, 226,109.5] | -4.3% | **CI crosses 0 — no detectable difference** |
| explain | 4 | -378,360.3 | [-631,587.0, -87,290.3] | -30.3% | haiku-graphify-v2 lower |
| impact | 4 | -45,692.0 | [-155,222.0, 63,838.0] | 2.6% | **CI crosses 0 — no detectable difference** |
| locate | 4 | 15,073.3 | [-41,433.3, 80,460.0] | 23.9% | **CI crosses 0 — no detectable difference** |
| reference | 4 | -104,218.3 | [-227,683.0, 19,246.5] | -16.0% | **CI crosses 0 — no detectable difference** |

**Verdict.** `haiku-graphify-v2` vs `haiku-baseline` over 20 paired tasks: tokens lower by 160,953 (95% CI [-316,961, -25,319]); cost lower by 0.0297 (95% CI [-0.0601, -0.0038]); turns no detectable difference; accuracy 75.0% vs 80.0% (15/20 vs 16/20).

### Accuracy by model strength

The token comparisons above are only meaningful alongside accuracy: an arm that answers fewer tasks correctly can always look cheaper. This table puts every arm's accuracy side by side so a Haiku-vs-Sonnet reading is not mistaken for an efficiency result.

| condition | graded | successes | accuracy |
|---|---|---|---|
| `baseline` | 20 | 14 | 70.0% |
| `graphify-strict-v2` | 20 | 14 | 70.0% |
| `graphify-v2` | 20 | 16 | 80.0% |
| `haiku-baseline` | 20 | 16 | 80.0% |
| `haiku-graphify-v2` | 20 | 15 | 75.0% |

## 9. Features never exercised

graphify exposes more than `query`. The table counts, per arm, how many times each subcommand was invoked across all runs (and, in parentheses, how many runs used it at least once). A zero column is the point: it means the benchmark never put that feature under measurement, so nothing here — positive or negative — can be read as evidence about it.

| condition | runs | `query` | `explain` | `path` | `god-nodes` | `affected` | `save-result` | `reflect` | `update` | `benchmark` |
|---|---|---|---|---|---|---|---|---|---|---|
| `baseline` | 20 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `graphify-strict-v2` | 20 | 24 (20) | 7 (7) | 3 (2) | **0** | **0** | **0** | **0** | **0** | **0** |
| `graphify-v2` | 20 | 27 (20) | 8 (5) | 2 (2) | **0** | **0** | **0** | **0** | **0** | **0** |
| `haiku-baseline` | 20 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `haiku-graphify-v2` | 20 | 36 (20) | 2 (2) | 3 (3) | **0** | **0** | **0** | **0** | **0** | **0** |

| condition | runs reading `graph.json` directly | runs that never invoked the CLI (nudge ignored) | strict denials: total (median/run) |
|---|---|---|---|
| `baseline` | 0 | n/a (no graph) | 0 (0) |
| `graphify-strict-v2` | 2 | n/a (no graph) | 0 (0) |
| `graphify-v2` | 3 | n/a (no graph) | 0 (0) |
| `haiku-baseline` | 0 | n/a (no graph) | 0 (0) |
| `haiku-graphify-v2` | 1 | n/a (no graph) | 0 (0) |

> **Cross-session memory was never measured.** `save-result`, `reflect` and `affected` are the mechanisms by which graphify is supposed to compound across sessions, and they were invoked **zero times in every arm**. Each benchmark run is a fresh corpus copy with a fresh session, so there is no second session for a saved result to pay off in — the design that would exercise them is a different experiment, not a variation of this one. The honest statement is that this benchmark measures single-session retrieval only.

## 10. Counter-productive cases and subagent use

- `baseline`: **10** subagent(s) spawned across **8**/20 run(s). T2S all-model 367,328 vs main-session-only 240,677.
- `graphify-strict-v2`: **0** subagent(s) spawned across **0**/20 run(s). T2S all-model 453,066 vs main-session-only 452,071.
- `graphify-v2`: **0** subagent(s) spawned across **0**/20 run(s). T2S all-model 502,286 vs main-session-only 501,285.
- `haiku-baseline`: **1** subagent(s) spawned across **1**/20 run(s). T2S all-model 631,724 vs main-session-only 630,727.
- `haiku-graphify-v2`: **0** subagent(s) spawned across **0**/20 run(s). T2S all-model 439,640 vs main-session-only 438,645.
- Runs that opened `graphify-out/graph.json` directly: **6** (`DIMP2-job-cadence-table__graphify-v2__r1`, `DIMP2-job-cadence-table__haiku-graphify-v2__r1`, `DREF1-webhook-service-requirements__graphify-strict-v2__r1`, `DREF1-webhook-service-requirements__graphify-v2__r1`, `DREF2-digest-cadence-adrs__graphify-strict-v2__r1`, `DREF4-adr017-references__graphify-v2__r1`)
- graphify-condition runs that never invoked the `graphify` CLI (nudge ignored): **0**

## 11. Failed and ungraded runs

Harness failures (`is_error`, or `terminal_reason` other than `completed`): **0**. The table below also lists runs that completed normally but did not meet their grader's success threshold — those are accuracy results, not execution problems.

| run_id | condition | task | is_error | terminal_reason |
|---|---|---|---|---|
| `DDIS2-time-and-retry-constants__baseline__r1` | baseline | DDIS2-time-and-retry-constants | false | completed |
| `DDIS2-time-and-retry-constants__graphify-strict-v2__r1` | graphify-strict-v2 | DDIS2-time-and-retry-constants | false | completed |
| `DDIS2-time-and-retry-constants__haiku-graphify-v2__r1` | haiku-graphify-v2 | DDIS2-time-and-retry-constants | false | completed |
| `DDIS4-quotas-flags-and-rate-limits__baseline__r1` | baseline | DDIS4-quotas-flags-and-rate-limits | false | completed |
| `DDIS4-quotas-flags-and-rate-limits__graphify-strict-v2__r1` | graphify-strict-v2 | DDIS4-quotas-flags-and-rate-limits | false | completed |
| `DDIS4-quotas-flags-and-rate-limits__haiku-baseline__r1` | haiku-baseline | DDIS4-quotas-flags-and-rate-limits | false | completed |
| `DDIS4-quotas-flags-and-rate-limits__haiku-graphify-v2__r1` | haiku-graphify-v2 | DDIS4-quotas-flags-and-rate-limits | false | completed |
| `DIMP1-error-code-union__baseline__r1` | baseline | DIMP1-error-code-union | false | completed |
| `DIMP1-error-code-union__graphify-strict-v2__r1` | graphify-strict-v2 | DIMP1-error-code-union | false | completed |
| `DIMP1-error-code-union__graphify-v2__r1` | graphify-v2 | DIMP1-error-code-union | false | completed |
| `DIMP1-error-code-union__haiku-baseline__r1` | haiku-baseline | DIMP1-error-code-union | false | completed |
| `DIMP1-error-code-union__haiku-graphify-v2__r1` | haiku-graphify-v2 | DIMP1-error-code-union | false | completed |
| `DIMP2-job-cadence-table__baseline__r1` | baseline | DIMP2-job-cadence-table | false | completed |
| `DIMP2-job-cadence-table__graphify-strict-v2__r1` | graphify-strict-v2 | DIMP2-job-cadence-table | false | completed |
| `DIMP2-job-cadence-table__graphify-v2__r1` | graphify-v2 | DIMP2-job-cadence-table | false | completed |
| `DIMP2-job-cadence-table__haiku-baseline__r1` | haiku-baseline | DIMP2-job-cadence-table | false | completed |
| `DIMP2-job-cadence-table__haiku-graphify-v2__r1` | haiku-graphify-v2 | DIMP2-job-cadence-table | false | completed |
| `DIMP3-notification-kind-union__baseline__r1` | baseline | DIMP3-notification-kind-union | false | completed |
| `DIMP3-notification-kind-union__graphify-strict-v2__r1` | graphify-strict-v2 | DIMP3-notification-kind-union | false | completed |
| `DIMP3-notification-kind-union__graphify-v2__r1` | graphify-v2 | DIMP3-notification-kind-union | false | completed |
| `DIMP3-notification-kind-union__haiku-baseline__r1` | haiku-baseline | DIMP3-notification-kind-union | false | completed |
| `DIMP3-notification-kind-union__haiku-graphify-v2__r1` | haiku-graphify-v2 | DIMP3-notification-kind-union | false | completed |
| `DLOC2-webhook-retry-decision__graphify-strict-v2__r1` | graphify-strict-v2 | DLOC2-webhook-retry-decision | false | completed |
| `DREF1-webhook-service-requirements__baseline__r1` | baseline | DREF1-webhook-service-requirements | false | completed |
| `DREF1-webhook-service-requirements__graphify-v2__r1` | graphify-v2 | DREF1-webhook-service-requirements | false | completed |

## 12. Deliberately-easy controls vs the rest

Some tasks were written as **designed zero-advantage controls**: their answer is reproduced exactly by a single literal `grep`, so a structural index has nothing to add and the expected effect is zero or negative. They are marked `DELIBERATELY EASY` in the task notes and are separated out here so they neither flatter nor drag the headline number. Easy tasks: `DIMP4-req157-renumber`, `DREF4-adr017-references`.

### easy (zero-advantage controls) — 10 runs over 2 tasks

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 2 | **136,658** (128,992–144,323) | 135,683 | 0.092 | 4.5 | 0 in 0 run(s) | 0 | 0 | 0 | 7 | 0 | 100.0% (2/2) | 136,658 |
| graphify-strict-v2 | 2 | **253,078** (243,589–262,566) | 252,103 | 0.152 | 7.5 | 0 in 0 run(s) | 0 | 0 | 0 | 11 | 2 | 100.0% (2/2) | 253,078 |
| graphify-v2 | 2 | **202,146** (199,875–204,416) | 201,171 | 0.127 | 6.0 | 0 in 0 run(s) | 0 | 0 | 0 | 8 | 2 | 100.0% (2/2) | 202,146 |
| haiku-baseline | 2 | **73,162** (71,806–74,517) | 72,187 | 0.041 | 3.5 | 0 in 0 run(s) | 0 | 0 | 0 | 5 | 0 | 100.0% (2/2) | 73,162 |
| haiku-graphify-v2 | 2 | **102,776** (102,755–102,796) | 101,801 | 0.051 | 4.0 | 0 in 0 run(s) | 0 | 0 | 0 | 4 | 2 | 100.0% (2/2) | 102,776 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 2 | 65,488.0 | [45,617.0, 85,359.0] | 50.2% | graphify-v2 higher |
| uncached_equivalent | 2 | 65,488.0 | [45,617.0, 85,359.0] | 50.6% | graphify-v2 higher |
| total_cost_usd | 2 | 0.0345 | [0.0211, 0.0478] | 38.2% | graphify-v2 higher |
| num_turns | 2 | 1.5 | [1.0, 2.0] | 35.0% | graphify-v2 higher |

### rest — 90 runs over 18 tasks

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 18 | **383,130** (261,424–925,665) | 188,935 | 0.285 | 5.5 | 10 in 8 run(s) | 27 | 0 | 0 | 86 | 0 | 66.7% (12/18) | 405,773 |
| graphify-strict-v2 | 18 | **526,994** (233,567–760,937) | 525,957 | 0.312 | 12.0 | 0 in 0 run(s) | 74 | 0 | 0 | 124 | 34 | 66.7% (12/18) | 486,397 |
| graphify-v2 | 18 | **505,270** (227,710–752,219) | 504,259 | 0.319 | 15.5 | 0 in 0 run(s) | 63 | 0 | 0 | 138 | 36 | 77.8% (14/18) | 545,164 |
| haiku-baseline | 18 | **650,575** (309,921–971,136) | 633,054 | 0.174 | 14.5 | 1 in 1 run(s) | 122 | 0 | 0 | 149 | 0 | 77.8% (14/18) | 711,519 |
| haiku-graphify-v2 | 18 | **607,129** (227,758–941,959) | 606,164 | 0.149 | 16.0 | 0 in 0 run(s) | 123 | 0 | 0 | 74 | 39 | 72.2% (13/18) | 491,465 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 18 | -151,099.1 | [-372,683.4, 32,793.7] | 11.3% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 18 | 307,654.8 | [150,265.0, 480,021.2] | 369.3% | graphify-v2 higher |
| total_cost_usd | 18 | -0.0971 | [-0.2056, -0.0108] | -2.5% | graphify-v2 lower |
| num_turns | 18 | 7.0 | [3.3, 10.9] | 302.4% | graphify-v2 higher |

## 13. Limitations

- N = 100 runs over 20 tasks; a single corpus and a single model. These results do not generalize to other codebases or models.
- Bootstrap resamples tasks, so the interval reflects task-to-task variation, not within-task run noise.
- Where a CI crosses zero the honest reading is "no difference detected at this N", not "no difference exists".
- The fixed ~21k-token system-prompt/tool-definition overhead is included in both arms and not subtracted (see §2).
- **1 repetition per (task × condition)**: within-task run-to-run variance is unmeasured, so any single per-task difference may be run noise.
- Subagent traffic is counted in `uncached_all`, but a subagent's tool calls never reach the parent transcript, so the tool-call columns stay main-session-only.
- Raw per-run data lives in `results/docs/runs/<run-id>/` and the `summary.csv` beside this report.
