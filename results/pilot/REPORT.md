# graphify-bench results

Generated 2026-09-02T03:11:26.774Z. 4 runs over 2 tasks, conditions: baseline, graphify.

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
| baseline | 2 | **418,273** (291,163–545,382) | 147,589 | 0.357 | 4.5 | 1 in 1 run(s) | 2 | 0 | 0 | 3 | 0 | 100.0% (2/2) | 418,273 |
| graphify | 2 | **308,023** (304,710–311,335) | 307,054 | 0.176 | 8.5 | 0 in 0 run(s) | 3 | 0 | 0 | 7 | 4 | 100.0% (2/2) | 308,023 |

**`uncached_all` (PRIMARY) = Σ over every entry of `modelUsage` of (inputTokens + cacheReadInputTokens + cacheCreationInputTokens)** — it covers the main session *and* any subagent, so it is commensurable with `total_cost_usd`. `uncached_main` (secondary) is the same sum taken from `usage.*`, which the result JSON populates for the **main session only**; a run that spawned a subagent therefore reports less information volume there than it actually consumed. The `subagents` column lets the two be reconciled. Tool columns are totals across all runs of the condition. T2S (tokens-to-success) = total `uncached_all` of successful runs / number of successful runs.

Fixed overhead, reported separately so readers can subtract it (architecture.md §5):

| condition | first-turn cache_creation (median) |
|---|---|
| baseline | 10,339 |
| graphify | 10,732 |

## 3. Paired difference (graphify − baseline), all tasks

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 2 | -110,250.0 | [-357,845.0, 137,345.0] | 15.3% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 2 | 159,465.0 | [137,345.0, 181,585.0] | 110.8% | graphify higher |
| total_cost_usd | 2 | -0.1806 | [-0.4144, 0.0532] | -14.8% | **CI crosses 0 — no detectable difference** |
| num_turns | 2 | 4.0 | [3.0, 5.0] | 92.5% | graphify higher |

## 4. Iso-accuracy subset

Tasks where every graded run of both conditions succeeded (2/2): `FIX1-issue-tenant-leak`, `REF1-assertcan-callers`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 2 | **418,273** (291,163–545,382) | 147,589 | 0.357 | 4.5 | 1 in 1 run(s) | 2 | 0 | 0 | 3 | 0 | 100.0% (2/2) | 418,273 |
| graphify | 2 | **308,023** (304,710–311,335) | 307,054 | 0.176 | 8.5 | 0 in 0 run(s) | 3 | 0 | 0 | 7 | 4 | 100.0% (2/2) | 308,023 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 2 | -110,250.0 | [-357,845.0, 137,345.0] | 15.3% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 2 | 159,465.0 | [137,345.0, 181,585.0] | 110.8% | graphify higher |
| total_cost_usd | 2 | -0.1806 | [-0.4144, 0.0532] | -14.8% | **CI crosses 0 — no detectable difference** |
| num_turns | 2 | 4.0 | [3.0, 5.0] | 92.5% | graphify higher |

## 5. By category

### fix (1 task)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 1 | -357,845.0 | [–, –] | -53.2% | n too small |
| uncached_equivalent | 1 | 181,585.0 | [–, –] | 137.5% | n too small |
| total_cost_usd | 1 | -0.4144 | [–, –] | -70.9% | n too small |
| num_turns | 1 | 5.0 | [–, –] | 125.0% | n too small |

### reference (1 task)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 1 | 137,345.0 | [–, –] | 83.7% | n too small |
| uncached_equivalent | 1 | 137,345.0 | [–, –] | 84.2% | n too small |
| total_cost_usd | 1 | 0.0532 | [–, –] | 41.4% | n too small |
| num_turns | 1 | 3.0 | [–, –] | 60.0% | n too small |

## 6. Counter-productive cases and subagent use

- `baseline`: **1** subagent(s) spawned across **1**/2 run(s). T2S all-model 418,273 vs main-session-only 147,589.
- `graphify`: **0** subagent(s) spawned across **0**/2 run(s). T2S all-model 308,023 vs main-session-only 307,054.
- Runs that opened `graphify-out/graph.json` directly: **0**
- graphify-condition runs that never invoked the `graphify` CLI (nudge ignored): **0**

## 7. Failed and ungraded runs

_None._

## 8. Limitations

- N = 4 runs over 2 tasks; a single corpus and a single model. These results do not generalize to other codebases or models.
- Bootstrap resamples tasks, so the interval reflects task-to-task variation, not within-task run noise.
- Where a CI crosses zero the honest reading is "no difference detected at this N", not "no difference exists".
- The fixed ~21k-token system-prompt/tool-definition overhead is included in both arms and not subtracted (see §2).
- **1 repetition per (task × condition)**: within-task run-to-run variance is unmeasured, so any single per-task difference may be run noise.
- Subagent traffic is counted in `uncached_all`, but a subagent's tool calls never reach the parent transcript, so the tool-call columns stay main-session-only.
- Raw per-run data lives in `results/runs/<run-id>/` and `results/summary.csv`.
