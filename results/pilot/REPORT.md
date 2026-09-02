# graphify-bench results

Generated 2026-09-02T03:02:23.394Z. 4 runs over 2 tasks, conditions: baseline, graphify.

## 1. Environment

- Claude Code: `2.1.258 (Claude Code)`
- graphify: `graphify 0.9.53`
- Node: `v25.5.0` / pnpm `10.28.2`
- Platform: `darwin 25.2.0 arm64`
- Model: `claude-sonnet-5`, effort `high`, --max-turns 60, --max-budget-usd 4

- Bootstrap: B=2000, percentile 95% CI, seed `graphify-bench-bootstrap`, resampled over **tasks**.
- Corpus tree hash: see `docs/plan/CORPUS.md`.

## 2. Overall

| condition | runs | uncached_equiv median (IQR) | cost USD median | turns median | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S |
|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 2 | 147,589 (139,836–155,343) | 0.357 | 4.5 | 2 | 0 | 0 | 3 | 0 | 100.0% (2/2) | 147,589 |
| graphify | 2 | 307,054 (303,748–310,361) | 0.176 | 8.5 | 3 | 0 | 0 | 7 | 4 | 100.0% (2/2) | 307,054 |

`uncached_equivalent` = input + cache_creation + cache_read. Tool columns are totals across all runs of the condition. T2S (tokens-to-success) = total `uncached_equivalent` of successful runs / number of successful runs.

Fixed overhead, reported separately so readers can subtract it (architecture.md §5):

| condition | first-turn cache_creation (median) |
|---|---|
| baseline | 10,339 |
| graphify | 10,732 |

## 3. Paired difference (graphify − baseline), all tasks

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent | 2 | 159,465.0 | [137,345.0, 181,585.0] | 110.8% | graphify higher |
| total_cost_usd | 2 | -0.1806 | [-0.4144, 0.0532] | -14.8% | **CI crosses 0 — no detectable difference** |
| num_turns | 2 | 4.0 | [3.0, 5.0] | 92.5% | graphify higher |

## 4. Iso-accuracy subset

Tasks where every graded run of both conditions succeeded (2/2): `FIX1-issue-tenant-leak`, `REF1-assertcan-callers`

| condition | runs | uncached_equiv median (IQR) | cost USD median | turns median | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S |
|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 2 | 147,589 (139,836–155,343) | 0.357 | 4.5 | 2 | 0 | 0 | 3 | 0 | 100.0% (2/2) | 147,589 |
| graphify | 2 | 307,054 (303,748–310,361) | 0.176 | 8.5 | 3 | 0 | 0 | 7 | 4 | 100.0% (2/2) | 307,054 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent | 2 | 159,465.0 | [137,345.0, 181,585.0] | 110.8% | graphify higher |
| total_cost_usd | 2 | -0.1806 | [-0.4144, 0.0532] | -14.8% | **CI crosses 0 — no detectable difference** |
| num_turns | 2 | 4.0 | [3.0, 5.0] | 92.5% | graphify higher |

## 5. By category

### fix (1 task)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent | 1 | 181,585.0 | [–, –] | 137.5% | n too small |
| total_cost_usd | 1 | -0.4144 | [–, –] | -70.9% | n too small |
| num_turns | 1 | 5.0 | [–, –] | 125.0% | n too small |

### reference (1 task)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent | 1 | 137,345.0 | [–, –] | 84.2% | n too small |
| total_cost_usd | 1 | 0.0532 | [–, –] | 41.4% | n too small |
| num_turns | 1 | 3.0 | [–, –] | 60.0% | n too small |

## 6. Counter-productive cases

- Runs that opened `graphify-out/graph.json` directly: **0**
- graphify-condition runs that never invoked the `graphify` CLI (nudge ignored): **0**

## 7. Failed and ungraded runs

_None._

## 8. Limitations

- N = 4 runs over 2 tasks; a single corpus and a single model. These results do not generalize to other codebases or models.
- Bootstrap resamples tasks, so the interval reflects task-to-task variation, not within-task run noise.
- Where a CI crosses zero the honest reading is "no difference detected at this N", not "no difference exists".
- The fixed ~21k-token system-prompt/tool-definition overhead is included in both arms and not subtracted (see §2).
- Raw per-run data lives in `results/runs/<run-id>/` and `results/summary.csv`.
