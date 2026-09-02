# graphify-bench results

Generated 2026-09-02T12:53:50.056Z. 450 runs over 45 tasks, conditions: baseline, baseline-nosub, effort-low, effort-low-nosub, effort-medium, graphify, graphify-strict, haiku-baseline, haiku-explore, haiku-graphify.

## 1. Environment

- Claude Code: `2.1.258 (Claude Code)`
- graphify: `graphify 0.9.53`
- Node: `v25.5.0` / pnpm `10.28.2`
- Platform: `darwin 25.2.0 arm64`
- Model: `claude-sonnet-5`, effort `high`, --max-turns 60, --max-budget-usd 4

- Bootstrap: B=2000, percentile 95% CI, seed `graphify-bench-bootstrap`, resampled over **tasks**.
- Corpus: `corpus-v1`, tree hash (sha256) `4148d9b26fb31b95ab8424af1f88cfc7741bb655b3ad3bbb557a8c3c516c12da` (source: `docs/plan/CORPUS.md`).
- Report generated: 2026-09-02.

The `Model` line above is the harness default; arms that override it are listed here. Every field comes from the run's own `run.meta.json`, not from the report's assumptions.

| condition | model | overlays | extra `claude` args | what it isolates |
|---|---|---|---|---|
| `baseline-nosub` | `claude-sonnet-5` | `baseline` | `--disallowedTools Agent` | Baseline with the Agent tool removed, so it cannot delegate exploration to a subagent — isolates how much of baseline's efficiency is the subagent rather than the flat search. |
| `effort-low` | `claude-sonnet-5` | `baseline` | – | As `effort-medium`, one notch further down: baseline with `--effort low`. |
| `effort-low-nosub` | `claude-sonnet-5` | `baseline` | `--disallowedTools Agent` | The two strongest runtime levers at once: baseline's overlay byte for byte, invoked with `--effort low` AND `--disallowedTools Agent`. Both levers cut the same resource — total exploration and thinking — so the arm exists to answer whether their savings add up or overlap. Its treatment lives entirely in `claude.argv`; nothing in the corpus copy differs from a `baseline` run. |
| `effort-medium` | `claude-sonnet-5` | `baseline` | – | A RUNTIME LEVER, not a tool: the baseline overlay byte for byte, invoked with `--effort medium` instead of the harness default `high`. Thinking tokens bill as output, so the reduction is arithmetically certain and the open question is entirely about accuracy. |
| `graphify-strict` | `claude-sonnet-5` | `graphify` + `graphify-strict` | – | Same as `graphify`, but the Read\|Glob hook runs `hook-guard read --strict`: the first raw Read of an indexed in-project source file per session is DENIED and redirected to `graphify query`. |
| `haiku-baseline` | `claude-haiku-4-5` | `baseline` | – | Baseline run by a weaker explorer. |
| `haiku-explore` | `claude-sonnet-5` | `haiku-explore` | – | Baseline plus one file: `.claude/agents/Explore.md` declaring `model: haiku`, which overrides Claude Code's built-in `Explore` subagent (project agents outrank built-ins) so delegated exploration runs on Haiku while the main session stays on Sonnet. Its `CLAUDE.md` is byte-identical to baseline's — the arm changes who explores, not what the agent is told. |
| `haiku-graphify` | `claude-haiku-4-5` | `graphify` | – | graphify run by a weaker explorer — the arm where a prebuilt index should help most. |

## 2. Overall

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 45 | **260,561** (203,616–428,937) | 144,597 | 0.197 | 5.0 | 23 in 23 run(s) | 68 | 0 | 0 | 106 | 0 | 84.4% (38/45) | 393,482 |
| baseline-nosub | 45 | **230,081** (126,680–378,938) | 229,091 | 0.134 | 8.0 | 0 in 0 run(s) | 170 | 0 | 0 | 232 | 0 | 84.4% (38/45) | 311,808 |
| effort-low | 45 | **189,614** (132,368–276,765) | 119,589 | 0.132 | 4.0 | 23 in 23 run(s) | 29 | 0 | 0 | 79 | 0 | 80.0% (36/45) | 244,318 |
| effort-low-nosub | 45 | **142,566** (130,778–229,806) | 141,561 | 0.098 | 6.0 | 0 in 0 run(s) | 82 | 0 | 0 | 206 | 0 | 84.4% (38/45) | 223,500 |
| effort-medium | 45 | **238,378** (178,164–367,677) | 83,664 | 0.181 | 2.0 | 29 in 29 run(s) | 27 | 0 | 0 | 74 | 0 | 80.0% (36/45) | 307,709 |
| graphify | 45 | **288,502** (197,852–481,415) | 287,545 | 0.191 | 9.0 | 0 in 0 run(s) | 191 | 0 | 0 | 208 | 83 | 77.8% (35/45) | 429,005 |
| graphify-strict | 45 | **288,533** (181,403–463,327) | 286,953 | 0.186 | 8.0 | 1 in 1 run(s) | 141 | 0 | 0 | 216 | 83 | 77.8% (35/45) | 414,500 |
| haiku-baseline | 45 | **502,978** (159,352–754,040) | 498,061 | 0.121 | 15.0 | 2 in 1 run(s) | 278 | 0 | 0 | 350 | 0 | 80.0% (36/45) | 621,126 |
| haiku-explore | 45 | **243,863** (190,645–846,537) | 155,757 | 0.172 | 5.0 | 26 in 23 run(s) | 132 | 0 | 0 | 115 | 0 | 80.0% (36/45) | 687,692 |
| haiku-graphify | 45 | **327,185** (190,413–523,370) | 326,189 | 0.103 | 10.0 | 0 in 0 run(s) | 229 | 0 | 0 | 155 | 99 | 82.2% (37/45) | 491,331 |

**`uncached_all` (PRIMARY) = Σ over every entry of `modelUsage` of (inputTokens + cacheReadInputTokens + cacheCreationInputTokens)** — it covers the main session *and* any subagent, so it is commensurable with `total_cost_usd`. `uncached_main` (secondary) is the same sum taken from `usage.*`, which the result JSON populates for the **main session only**; a run that spawned a subagent therefore reports less information volume there than it actually consumed. The `subagents` column lets the two be reconciled. Tool columns are totals across all runs of the condition. T2S (tokens-to-success) = total `uncached_all` of successful runs / number of successful runs.

Fixed overhead, reported separately so readers can subtract it (architecture.md §5):

| condition | first-turn cache_creation (median) |
|---|---|
| baseline | 10,357 |
| baseline-nosub | 9,510 |
| effort-low | 10,363 |
| effort-low-nosub | 9,515 |
| effort-medium | 10,360 |
| graphify | 10,943 |
| graphify-strict | 10,935 |
| haiku-baseline | 8,014 |
| haiku-explore | 10,242 |
| haiku-graphify | 8,438 |

## 3. Paired difference (effort-medium − baseline), all tasks

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | -80,977.1 | [-143,817.8, -30,737.0] | -9.2% | effort-medium lower |
| uncached_equivalent | 45 | -73,228.5 | [-124,101.4, -31,114.6] | -5.0% | effort-medium lower |
| total_cost_usd | 45 | -0.0492 | [-0.0823, -0.0190] | -8.0% | effort-medium lower |
| num_turns | 45 | -2.1 | [-3.5, -0.9] | -7.1% | effort-medium lower |

> **Why the two token rows disagree.** Subagent use is asymmetric between the arms (baseline 23/45 runs, effort-medium 29/45). `uncached_equivalent` cannot see a subagent's tokens, so it charges that work to nobody and makes the subagent-spawning arm look cheap; `uncached_equivalent_all` counts it. **Read the `_all` row** — the main-only row is retained only to show the size of the distortion.

## 4. Iso-accuracy subset

Tasks where every graded run of both conditions succeeded (36/45): `EXP1-issue-create-flow`, `EXP2-comment-mention-notify`, `EXP3-digest-pipeline`, `FIX1-issue-tenant-leak`, `FIX2-project-quota-off-by-one`, `FIX3-board-shows-archived`, `IMP1-planlimits-field`, `IMP3-limited-resource-union`, `LOC1-shortcut-match`, `REF1-assertcan-callers`, `REF2-would-exceed-limit-callers`, `REF3-issue-created-subscribers`, `XEXP1-webhook-delivery`, `XEXP2-invitation-lifecycle`, `XEXP3-plan-change`, `XEXP4-signin-to-actor`, `XEXP5-search-index`, `XEXP6-overdue-sweep`, `XFIX1-csv-quote-escape`, `XFIX2-mention-inside-code`, `XFIX3-last-owner-removable`, `XFIX4-advanced-search-inverted`, `XFIX6-revoked-invite-accepted`, `XIMP3-issue-status-union`, `XIMP4-feature-flag-key-union`, `XLOC1-retry-throttle`, `XLOC2-invite-link-validity`, `XLOC3-issue-number-allocation`, `XLOC4-session-lifetime`, `XLOC5-delivery-retry-policy`, `XREF1-assertorgscope-callers`, `XREF2-emit-callers`, `XREF3-isenabled-callers`, `XREF4-comment-created-subscribers`, `XREF5-rate-limit-importers`, `XREF6-member-joined-repositories`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 36 | **272,542** (213,749–563,188) | 153,413 | 0.203 | 5.0 | 19 in 19 run(s) | 59 | 0 | 0 | 86 | 0 | 100.0% (36/36) | 400,354 |
| baseline-nosub | 36 | **238,930** (133,843–382,636) | 237,935 | 0.147 | 8.0 | 0 in 0 run(s) | 159 | 0 | 0 | 198 | 0 | 100.0% (36/36) | 315,394 |
| effort-low | 36 | **191,959** (152,838–300,875) | 119,878 | 0.134 | 4.0 | 20 in 20 run(s) | 22 | 0 | 0 | 61 | 0 | 100.0% (36/36) | 244,318 |
| effort-low-nosub | 36 | **176,115** (133,712–286,072) | 175,116 | 0.106 | 7.0 | 0 in 0 run(s) | 80 | 0 | 0 | 180 | 0 | 97.2% (35/36) | 231,739 |
| effort-medium | 36 | **254,137** (213,711–411,862) | 64,557 | 0.192 | 2.0 | 25 in 25 run(s) | 18 | 0 | 0 | 60 | 0 | 100.0% (36/36) | 307,709 |
| graphify | 36 | **319,452** (191,853–496,443) | 318,448 | 0.205 | 9.0 | 0 in 0 run(s) | 181 | 0 | 0 | 167 | 68 | 94.4% (34/36) | 436,713 |
| graphify-strict | 36 | **338,812** (204,604–552,570) | 318,492 | 0.194 | 9.0 | 1 in 1 run(s) | 134 | 0 | 0 | 184 | 71 | 94.4% (34/36) | 422,799 |
| haiku-baseline | 36 | **527,298** (254,359–881,386) | 517,304 | 0.132 | 16.0 | 2 in 1 run(s) | 248 | 0 | 0 | 305 | 0 | 91.7% (33/36) | 642,825 |
| haiku-explore | 36 | **249,513** (188,202–1,104,136) | 156,647 | 0.192 | 5.0 | 23 in 20 run(s) | 117 | 0 | 0 | 94 | 0 | 97.2% (35/36) | 700,575 |
| haiku-graphify | 36 | **390,476** (236,924–552,878) | 389,503 | 0.111 | 12.0 | 0 in 0 run(s) | 199 | 0 | 0 | 136 | 82 | 94.4% (34/36) | 510,036 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 36 | -92,644.8 | [-169,164.3, -30,546.5] | -8.6% | effort-medium lower |
| uncached_equivalent | 36 | -77,112.0 | [-141,963.7, -27,067.9] | -1.4% | effort-medium lower |
| total_cost_usd | 36 | -0.0547 | [-0.0969, -0.0200] | -6.8% | effort-medium lower |
| num_turns | 36 | -2.3 | [-4.0, -0.9] | -3.2% | effort-medium lower |

## 5. By category

### explain (9 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | -249,239.3 | [-416,523.2, -126,857.2] | -30.9% | effort-medium lower |
| uncached_equivalent | 9 | -74,228.7 | [-112,581.8, -38,684.4] | -53.1% | effort-medium lower |
| total_cost_usd | 9 | -0.1303 | [-0.2055, -0.0743] | -24.7% | effort-medium lower |
| num_turns | 9 | -2.3 | [-3.6, -1.2] | -54.5% | effort-medium lower |

### fix (9 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | -101,711.7 | [-255,546.9, 20,207.0] | -11.8% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 9 | -35,801.0 | [-74,570.8, 2,338.7] | -21.1% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 9 | -0.0730 | [-0.1770, 0.0054] | -13.4% | **CI crosses 0 — no detectable difference** |
| num_turns | 9 | -1.1 | [-2.2, 0.0] | -22.3% | **CI crosses 0 — no detectable difference** |

### impact (9 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | -34,678.3 | [-114,188.6, 52,394.1] | -13.4% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 9 | -82,112.7 | [-158,497.1, -1,997.2] | -14.9% | effort-medium lower |
| total_cost_usd | 9 | -0.0238 | [-0.0707, 0.0264] | -10.2% | **CI crosses 0 — no detectable difference** |
| num_turns | 9 | -2.1 | [-4.1, 0.0] | -14.7% | **CI crosses 0 — no detectable difference** |

### locate (9 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | -8,845.7 | [-50,801.4, 35,461.1] | -0.1% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 9 | -28,443.7 | [-65,959.9, 9,985.3] | -17.2% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 9 | -0.0043 | [-0.0359, 0.0320] | 7.8% | **CI crosses 0 — no detectable difference** |
| num_turns | 9 | -1.0 | [-2.6, 0.4] | -15.2% | **CI crosses 0 — no detectable difference** |

### reference (9 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | -10,410.7 | [-103,655.6, 88,139.6] | 10.4% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 9 | -145,556.3 | [-385,499.7, 34,189.0] | 81.5% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 9 | -0.0145 | [-0.0541, 0.0262] | 0.2% | **CI crosses 0 — no detectable difference** |
| num_turns | 9 | -4.1 | [-10.8, 0.8] | 71.2% | **CI crosses 0 — no detectable difference** |

## 6. Answer quality by category

Section 5 reports what each category *cost*. This one reports whether it was *answered*: each cell is `successes/graded · mean grader score`. The two are not interchangeable — an arm that gives up early looks cheap in section 5 and is exposed here.

| condition | **explain** | **fix** | **impact** | **locate** | **reference** |
|---|---|---|---|---|---|
| `baseline` | 9/9 · 0.956 | 8/9 · 0.889 | 4/9 · 0.878 | 8/9 · 0.944 | 9/9 · 0.978 |
| `baseline-nosub` | 9/9 · 0.978 | 9/9 · 1.000 | 4/9 · 0.897 | 7/9 · 0.889 | 9/9 · 0.978 |
| `effort-low` | 9/9 · 0.956 | 8/9 · 0.889 | 4/9 · 0.878 | 6/9 · 0.852 | 9/9 · 0.987 |
| `effort-low-nosub` | 9/9 · 0.911 | 9/9 · 1.000 | 4/9 · 0.878 | 7/9 · 0.889 | 9/9 · 0.986 |
| `effort-medium` | 9/9 · 0.933 | 8/9 · 0.889 | 4/9 · 0.888 | 6/9 · 0.822 | 9/9 · 0.983 |
| `graphify` | 9/9 · 0.978 | 7/9 · 0.778 | 4/9 · 0.888 | 6/9 · 0.833 | 9/9 · 0.978 |
| `graphify-strict` | 9/9 · 0.956 | 7/9 · 0.778 | 4/9 · 0.897 | 7/9 · 0.889 | 8/9 · 0.973 |
| `haiku-baseline` | 9/9 · 0.800 | 8/9 · 0.889 | 4/9 · 0.906 | 7/9 · 0.833 | 8/9 · 0.973 |
| `haiku-explore` | 8/9 · 0.822 | 8/9 · 0.889 | 4/9 · 0.878 | 7/9 · 0.889 | 9/9 · 0.987 |
| `haiku-graphify` | 9/9 · 0.933 | 8/9 · 0.889 | 5/9 · 0.898 | 6/9 · 0.852 | 9/9 · 0.974 |

## 7. Structural comparisons

Each block below is an independent paired comparison between two arms, computed with the same machinery as §3: per-task pairing over the same task set, percentile bootstrap over tasks, an iso-accuracy subset scoped to just those two arms, and a per-category breakdown. Arms that are not part of a block are excluded from it entirely.

### `effort-medium` vs `baseline`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 45 | **260,561** (203,616–428,937) | 144,597 | 0.197 | 5.0 | 23 in 23 run(s) | 68 | 0 | 0 | 106 | 0 | 84.4% (38/45) | 393,482 |
| effort-medium | 45 | **238,378** (178,164–367,677) | 83,664 | 0.181 | 2.0 | 29 in 29 run(s) | 27 | 0 | 0 | 74 | 0 | 80.0% (36/45) | 307,709 |

Paired difference (`effort-medium` − `baseline`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | -80,977.1 | [-138,002.9, -31,125.3] | -9.2% | effort-medium lower |
| uncached_equivalent | 45 | -73,228.5 | [-128,655.0, -30,775.9] | -5.0% | effort-medium lower |
| total_cost_usd | 45 | -0.0492 | [-0.0822, -0.0219] | -8.0% | effort-medium lower |
| num_turns | 45 | -2.1 | [-3.6, -0.9] | -7.1% | effort-medium lower |

Iso-accuracy subset (36/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 36 | -92,644.8 | [-166,035.2, -27,929.1] | -8.6% | effort-medium lower |
| uncached_equivalent | 36 | -77,112.0 | [-143,314.2, -27,347.3] | -1.4% | effort-medium lower |
| total_cost_usd | 36 | -0.0547 | [-0.0916, -0.0180] | -6.8% | effort-medium lower |
| num_turns | 36 | -2.3 | [-4.0, -0.8] | -3.2% | effort-medium lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | -249,239.3 | [-417,855.1, -130,570.1] | -30.9% | effort-medium lower |
| fix | 9 | -101,711.7 | [-257,129.3, 16,356.2] | -11.8% | **CI crosses 0 — no detectable difference** |
| impact | 9 | -34,678.3 | [-116,794.1, 48,574.5] | -13.4% | **CI crosses 0 — no detectable difference** |
| locate | 9 | -8,845.7 | [-48,864.7, 34,691.9] | -0.1% | **CI crosses 0 — no detectable difference** |
| reference | 9 | -10,410.7 | [-109,082.3, 88,976.0] | 10.4% | **CI crosses 0 — no detectable difference** |

**Verdict.** `effort-medium` vs `baseline` over 45 paired tasks: tokens lower by 80,977 (95% CI [-138,003, -31,125]); cost lower by 0.0492 (95% CI [-0.0822, -0.0219]); turns lower by 2.1 (95% CI [-3.6, -0.9]); accuracy 80.0% vs 84.4% (36/45 vs 38/45).

### `effort-low` vs `baseline`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 45 | **260,561** (203,616–428,937) | 144,597 | 0.197 | 5.0 | 23 in 23 run(s) | 68 | 0 | 0 | 106 | 0 | 84.4% (38/45) | 393,482 |
| effort-low | 45 | **189,614** (132,368–276,765) | 119,589 | 0.132 | 4.0 | 23 in 23 run(s) | 29 | 0 | 0 | 79 | 0 | 80.0% (36/45) | 244,318 |

Paired difference (`effort-low` − `baseline`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | -133,338.1 | [-192,247.4, -80,094.8] | -24.9% | effort-low lower |
| uncached_equivalent | 45 | -50,197.3 | [-106,481.0, -3,219.9] | 3.1% | effort-low lower |
| total_cost_usd | 45 | -0.0870 | [-0.1194, -0.0594] | -25.5% | effort-low lower |
| num_turns | 45 | -1.3 | [-2.9, 0.0] | 4.6% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (36/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 36 | -156,035.8 | [-226,500.4, -94,749.8] | -27.9% | effort-low lower |
| uncached_equivalent | 36 | -56,474.7 | [-126,159.2, -2,315.9] | 4.1% | effort-low lower |
| total_cost_usd | 36 | -0.0992 | [-0.1331, -0.0662] | -27.3% | effort-low lower |
| num_turns | 36 | -1.5 | [-3.4, 0.1] | 6.3% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | -364,572.8 | [-503,426.4, -232,061.2] | -48.4% | effort-low lower |
| fix | 9 | -62,822.2 | [-139,994.1, -3,149.6] | -12.2% | effort-low lower |
| impact | 9 | -80,752.8 | [-126,641.6, -40,297.6] | -30.3% | effort-low lower |
| locate | 9 | -19,727.0 | [-69,729.6, 28,584.1] | -6.5% | **CI crosses 0 — no detectable difference** |
| reference | 9 | -138,815.9 | [-309,774.1, -32,800.5] | -27.2% | effort-low lower |

**Verdict.** `effort-low` vs `baseline` over 45 paired tasks: tokens lower by 133,338 (95% CI [-192,247, -80,095]); cost lower by 0.0870 (95% CI [-0.1194, -0.0594]); turns no detectable difference; accuracy 80.0% vs 84.4% (36/45 vs 38/45).

### `effort-medium` vs `baseline-nosub`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline-nosub | 45 | **230,081** (126,680–378,938) | 229,091 | 0.134 | 8.0 | 0 in 0 run(s) | 170 | 0 | 0 | 232 | 0 | 84.4% (38/45) | 311,808 |
| effort-medium | 45 | **238,378** (178,164–367,677) | 83,664 | 0.181 | 2.0 | 29 in 29 run(s) | 27 | 0 | 0 | 74 | 0 | 80.0% (36/45) | 307,709 |

Paired difference (`effort-medium` − `baseline-nosub`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | -5,597.6 | [-58,383.9, 42,687.9] | 24.6% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 45 | -187,086.0 | [-261,759.7, -120,459.0] | -43.1% | effort-medium lower |
| total_cost_usd | 45 | 0.0234 | [0.0023, 0.0444] | 26.9% | effort-medium higher |
| num_turns | 45 | -7.1 | [-9.7, -4.9] | -50.8% | effort-medium lower |

Iso-accuracy subset (36/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 36 | -7,684.8 | [-70,662.2, 49,652.1] | 25.1% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 36 | -211,196.3 | [-301,472.8, -126,044.9] | -47.2% | effort-medium lower |
| total_cost_usd | 36 | 0.0263 | [0.0013, 0.0514] | 29.6% | effort-medium higher |
| num_turns | 36 | -8.0 | [-11.0, -5.3] | -54.1% | effort-medium lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | -191,198.8 | [-336,687.2, -55,407.6] | -21.3% | effort-medium lower |
| fix | 9 | 46,082.6 | [-10,663.2, 109,263.8] | 41.6% | **CI crosses 0 — no detectable difference** |
| impact | 9 | -56,607.4 | [-116,194.2, 7,484.0] | -19.7% | **CI crosses 0 — no detectable difference** |
| locate | 9 | 75,688.8 | [44,067.2, 110,474.1] | 75.8% | effort-medium higher |
| reference | 9 | 98,047.0 | [8,801.4, 198,049.7] | 46.9% | effort-medium higher |

**Verdict.** `effort-medium` vs `baseline-nosub` over 45 paired tasks: tokens no detectable difference; cost higher by 0.0234 (95% CI [0.0023, 0.0444]); turns lower by 7.1 (95% CI [-9.7, -4.9]); accuracy 80.0% vs 84.4% (36/45 vs 38/45).

### `effort-low` vs `baseline-nosub`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline-nosub | 45 | **230,081** (126,680–378,938) | 229,091 | 0.134 | 8.0 | 0 in 0 run(s) | 170 | 0 | 0 | 232 | 0 | 84.4% (38/45) | 311,808 |
| effort-low | 45 | **189,614** (132,368–276,765) | 119,589 | 0.132 | 4.0 | 23 in 23 run(s) | 29 | 0 | 0 | 79 | 0 | 80.0% (36/45) | 244,318 |

Paired difference (`effort-low` − `baseline-nosub`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | -57,958.6 | [-118,337.0, -3.8] | 8.7% | effort-low lower |
| uncached_equivalent | 45 | -164,054.9 | [-245,653.6, -92,790.6] | -31.5% | effort-low lower |
| total_cost_usd | 45 | -0.0144 | [-0.0364, 0.0085] | 6.1% | **CI crosses 0 — no detectable difference** |
| num_turns | 45 | -6.3 | [-9.1, -3.8] | -40.3% | effort-low lower |

Iso-accuracy subset (36/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 36 | -71,075.7 | [-140,640.3, -7,257.4] | 4.4% | effort-low lower |
| uncached_equivalent | 36 | -190,559.1 | [-288,034.2, -103,342.9] | -34.7% | effort-low lower |
| total_cost_usd | 36 | -0.0183 | [-0.0453, 0.0108] | 4.5% | **CI crosses 0 — no detectable difference** |
| num_turns | 36 | -7.3 | [-10.4, -4.3] | -42.7% | effort-low lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | -306,532.2 | [-436,597.7, -171,133.9] | -40.7% | effort-low lower |
| fix | 9 | 84,972.0 | [-23,091.3, 211,130.8] | 56.1% | **CI crosses 0 — no detectable difference** |
| impact | 9 | -102,681.9 | [-162,504.6, -40,497.5] | -31.7% | effort-low lower |
| locate | 9 | 64,807.4 | [31,795.1, 107,785.3] | 65.9% | effort-low higher |
| reference | 9 | -30,358.2 | [-74,121.1, 12,147.3] | -6.1% | **CI crosses 0 — no detectable difference** |

**Verdict.** `effort-low` vs `baseline-nosub` over 45 paired tasks: tokens lower by 57,959 (95% CI [-118,337, -4]); cost no detectable difference; turns lower by 6.3 (95% CI [-9.1, -3.8]); accuracy 80.0% vs 84.4% (36/45 vs 38/45).

### `haiku-explore` vs `baseline`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 45 | **260,561** (203,616–428,937) | 144,597 | 0.197 | 5.0 | 23 in 23 run(s) | 68 | 0 | 0 | 106 | 0 | 84.4% (38/45) | 393,482 |
| haiku-explore | 45 | **243,863** (190,645–846,537) | 155,757 | 0.172 | 5.0 | 26 in 23 run(s) | 132 | 0 | 0 | 115 | 0 | 80.0% (36/45) | 687,692 |

Paired difference (`haiku-explore` − `baseline`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | 269,859.6 | [103,944.6, 465,791.8] | 59.2% | haiku-explore higher |
| uncached_equivalent | 45 | 784.4 | [-53,642.6, 52,421.6] | 59.8% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 45 | 0.0189 | [-0.0215, 0.0637] | 12.0% | **CI crosses 0 — no detectable difference** |
| num_turns | 45 | 0.7 | [-0.9, 2.5] | 87.2% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (36/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 36 | 295,506.8 | [107,006.4, 527,215.7] | 65.1% | haiku-explore higher |
| uncached_equivalent | 36 | -3,565.6 | [-72,684.4, 58,763.7] | 69.8% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 36 | 0.0177 | [-0.0332, 0.0698] | 13.7% | **CI crosses 0 — no detectable difference** |
| num_turns | 36 | 0.8 | [-1.3, 3.0] | 104.3% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | 1,013,599.1 | [536,969.0, 1,523,161.0] | 144.9% | haiku-explore higher |
| fix | 9 | 105,422.1 | [-150,562.6, 473,504.2] | 41.3% | **CI crosses 0 — no detectable difference** |
| impact | 9 | 184,689.7 | [-30,679.7, 550,873.5] | 72.9% | **CI crosses 0 — no detectable difference** |
| locate | 9 | -2,704.8 | [-27,842.7, 26,654.9] | -3.7% | **CI crosses 0 — no detectable difference** |
| reference | 9 | 48,291.8 | [-141,188.1, 275,307.0] | 40.8% | **CI crosses 0 — no detectable difference** |

**Verdict.** `haiku-explore` vs `baseline` over 45 paired tasks: tokens higher by 269,860 (95% CI [103,945, 465,792]); cost no detectable difference; turns no detectable difference; accuracy 80.0% vs 84.4% (36/45 vs 38/45).

### `haiku-explore` vs `baseline-nosub`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline-nosub | 45 | **230,081** (126,680–378,938) | 229,091 | 0.134 | 8.0 | 0 in 0 run(s) | 170 | 0 | 0 | 232 | 0 | 84.4% (38/45) | 311,808 |
| haiku-explore | 45 | **243,863** (190,645–846,537) | 155,757 | 0.172 | 5.0 | 26 in 23 run(s) | 132 | 0 | 0 | 115 | 0 | 80.0% (36/45) | 687,692 |

Paired difference (`haiku-explore` − `baseline-nosub`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | 345,239.1 | [178,886.0, 526,437.6] | 101.0% | haiku-explore higher |
| uncached_equivalent | 45 | -113,073.1 | [-168,840.9, -64,887.7] | -20.9% | haiku-explore lower |
| total_cost_usd | 45 | 0.0914 | [0.0562, 0.1318] | 51.1% | haiku-explore higher |
| num_turns | 45 | -4.2 | [-6.0, -2.7] | -28.7% | haiku-explore lower |

Iso-accuracy subset (36/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 36 | 390,705.6 | [185,837.6, 641,680.4] | 113.5% | haiku-explore higher |
| uncached_equivalent | 36 | -118,574.7 | [-176,702.9, -67,969.8] | -23.7% | haiku-explore lower |
| total_cost_usd | 36 | 0.1002 | [0.0596, 0.1482] | 56.8% | haiku-explore higher |
| num_turns | 36 | -4.4 | [-6.1, -2.8] | -31.6% | haiku-explore lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | 1,071,639.7 | [582,800.2, 1,645,965.7] | 168.5% | haiku-explore higher |
| fix | 9 | 253,216.3 | [-8,712.9, 565,355.9] | 114.2% | **CI crosses 0 — no detectable difference** |
| impact | 9 | 162,760.6 | [-34,170.6, 503,314.6] | 47.8% | **CI crosses 0 — no detectable difference** |
| locate | 9 | 81,829.7 | [41,799.5, 121,667.7] | 81.4% | haiku-explore higher |
| reference | 9 | 156,749.4 | [-21,526.4, 373,982.7] | 93.3% | **CI crosses 0 — no detectable difference** |

**Verdict.** `haiku-explore` vs `baseline-nosub` over 45 paired tasks: tokens higher by 345,239 (95% CI [178,886, 526,438]); cost higher by 0.0914 (95% CI [0.0562, 0.1318]); turns lower by 4.2 (95% CI [-6.0, -2.7]); accuracy 80.0% vs 84.4% (36/45 vs 38/45).

### `effort-low-nosub` vs `baseline`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 45 | **260,561** (203,616–428,937) | 144,597 | 0.197 | 5.0 | 23 in 23 run(s) | 68 | 0 | 0 | 106 | 0 | 84.4% (38/45) | 393,482 |
| effort-low-nosub | 45 | **142,566** (130,778–229,806) | 141,561 | 0.098 | 6.0 | 0 in 0 run(s) | 82 | 0 | 0 | 206 | 0 | 84.4% (38/45) | 223,500 |

Paired difference (`effort-low-nosub` − `baseline`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | -159,410.8 | [-216,959.0, -109,874.1] | -36.7% | effort-low-nosub lower |
| uncached_equivalent | 45 | 29,826.3 | [-26,872.4, 86,997.6] | 90.7% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 45 | -0.1244 | [-0.1616, -0.0919] | -41.5% | effort-low-nosub lower |
| num_turns | 45 | 2.4 | [0.5, 4.2] | 140.5% | effort-low-nosub higher |

Iso-accuracy subset (37/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 37 | -174,966.8 | [-242,411.2, -114,593.8] | -36.6% | effort-low-nosub lower |
| uncached_equivalent | 37 | 48,145.6 | [-28,158.1, 114,815.8] | 115.1% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 37 | -0.1373 | [-0.1753, -0.1015] | -42.7% | effort-low-nosub lower |
| num_turns | 37 | 3.1 | [0.9, 5.1] | 173.2% | effort-low-nosub higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | -344,496.0 | [-497,634.8, -187,820.0] | -45.6% | effort-low-nosub lower |
| fix | 9 | -112,253.3 | [-204,519.6, -35,249.9] | -26.1% | effort-low-nosub lower |
| impact | 9 | -96,083.3 | [-151,720.4, -52,599.1] | -39.8% | effort-low-nosub lower |
| locate | 9 | -78,833.4 | [-112,952.5, -45,619.7] | -36.1% | effort-low-nosub lower |
| reference | 9 | -165,388.0 | [-334,539.5, -55,837.1] | -36.0% | effort-low-nosub lower |

**Verdict.** `effort-low-nosub` vs `baseline` over 45 paired tasks: tokens lower by 159,411 (95% CI [-216,959, -109,874]); cost lower by 0.1244 (95% CI [-0.1616, -0.0919]); turns higher by 2.4 (95% CI [0.5, 4.2]); accuracy 84.4% vs 84.4% (38/45 vs 38/45).

### `effort-low-nosub` vs `baseline-nosub`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline-nosub | 45 | **230,081** (126,680–378,938) | 229,091 | 0.134 | 8.0 | 0 in 0 run(s) | 170 | 0 | 0 | 232 | 0 | 84.4% (38/45) | 311,808 |
| effort-low-nosub | 45 | **142,566** (130,778–229,806) | 141,561 | 0.098 | 6.0 | 0 in 0 run(s) | 82 | 0 | 0 | 206 | 0 | 84.4% (38/45) | 223,500 |

Paired difference (`effort-low-nosub` − `baseline-nosub`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | -84,031.3 | [-136,186.0, -34,253.2] | -10.4% | effort-low-nosub lower |
| uncached_equivalent | 45 | -84,031.3 | [-136,747.3, -34,626.9] | -10.3% | effort-low-nosub lower |
| total_cost_usd | 45 | -0.0518 | [-0.0762, -0.0302] | -19.3% | effort-low-nosub lower |
| num_turns | 45 | -2.6 | [-4.2, -1.2] | -11.2% | effort-low-nosub lower |

Iso-accuracy subset (37/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 37 | -92,171.3 | [-156,625.2, -32,122.0] | -8.9% | effort-low-nosub lower |
| uncached_equivalent | 37 | -92,171.3 | [-157,692.0, -33,917.2] | -8.8% | effort-low-nosub lower |
| total_cost_usd | 37 | -0.0560 | [-0.0831, -0.0287] | -18.7% | effort-low-nosub lower |
| num_turns | 37 | -2.8 | [-4.7, -1.1] | -9.0% | effort-low-nosub lower |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | -286,455.4 | [-419,768.7, -158,968.7] | -40.3% | effort-low-nosub lower |
| fix | 9 | 35,540.9 | [-75,616.1, 152,868.3] | 34.1% | **CI crosses 0 — no detectable difference** |
| impact | 9 | -118,012.4 | [-173,041.4, -66,068.3] | -43.2% | effort-low-nosub lower |
| locate | 9 | 5,701.0 | [-16,449.8, 22,566.8] | 13.4% | **CI crosses 0 — no detectable difference** |
| reference | 9 | -56,930.3 | [-107,326.5, -8,105.7] | -15.9% | effort-low-nosub lower |

**Verdict.** `effort-low-nosub` vs `baseline-nosub` over 45 paired tasks: tokens lower by 84,031 (95% CI [-136,186, -34,253]); cost lower by 0.0518 (95% CI [-0.0762, -0.0302]); turns lower by 2.6 (95% CI [-4.2, -1.2]); accuracy 84.4% vs 84.4% (38/45 vs 38/45).

### `effort-low-nosub` vs `effort-low`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low | 45 | **189,614** (132,368–276,765) | 119,589 | 0.132 | 4.0 | 23 in 23 run(s) | 29 | 0 | 0 | 79 | 0 | 80.0% (36/45) | 244,318 |
| effort-low-nosub | 45 | **142,566** (130,778–229,806) | 141,561 | 0.098 | 6.0 | 0 in 0 run(s) | 82 | 0 | 0 | 206 | 0 | 84.4% (38/45) | 223,500 |

Paired difference (`effort-low-nosub` − `effort-low`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | -26,072.7 | [-52,910.7, -2,572.4] | -10.8% | effort-low-nosub lower |
| uncached_equivalent | 45 | 80,023.6 | [31,949.5, 133,311.2] | 217.9% | effort-low-nosub higher |
| total_cost_usd | 45 | -0.0374 | [-0.0504, -0.0259] | -19.8% | effort-low-nosub lower |
| num_turns | 45 | 3.7 | [2.1, 5.3] | 305.6% | effort-low-nosub higher |

Iso-accuracy subset (35/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 35 | -14,965.3 | [-46,217.2, 11,099.4] | -5.6% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 35 | 104,256.2 | [48,898.2, 165,523.9] | 273.3% | effort-low-nosub higher |
| total_cost_usd | 35 | -0.0353 | [-0.0497, -0.0217] | -16.4% | effort-low-nosub lower |
| num_turns | 35 | 4.6 | [2.6, 6.9] | 380.5% | effort-low-nosub higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | 20,076.8 | [-35,293.7, 77,385.0] | 6.0% | **CI crosses 0 — no detectable difference** |
| fix | 9 | -49,431.1 | [-146,884.1, 22,317.0] | -13.9% | **CI crosses 0 — no detectable difference** |
| impact | 9 | -15,330.6 | [-36,323.2, 5,992.5] | -10.4% | **CI crosses 0 — no detectable difference** |
| locate | 9 | -59,106.4 | [-107,218.1, -18,161.6] | -25.7% | effort-low-nosub lower |
| reference | 9 | -26,572.1 | [-42,512.5, -4,531.1] | -10.3% | effort-low-nosub lower |

**Verdict.** `effort-low-nosub` vs `effort-low` over 45 paired tasks: tokens lower by 26,073 (95% CI [-52,911, -2,572]); cost lower by 0.0374 (95% CI [-0.0504, -0.0259]); turns higher by 3.7 (95% CI [2.1, 5.3]); accuracy 84.4% vs 80.0% (38/45 vs 36/45).

### Accuracy by model strength

The token comparisons above are only meaningful alongside accuracy: an arm that answers fewer tasks correctly can always look cheaper. This table puts every arm's accuracy side by side so a Haiku-vs-Sonnet reading is not mistaken for an efficiency result.

| condition | graded | successes | accuracy |
|---|---|---|---|
| `baseline` | 45 | 38 | 84.4% |
| `baseline-nosub` | 45 | 38 | 84.4% |
| `effort-low` | 45 | 36 | 80.0% |
| `effort-low-nosub` | 45 | 38 | 84.4% |
| `effort-medium` | 45 | 36 | 80.0% |
| `graphify` | 45 | 35 | 77.8% |
| `graphify-strict` | 45 | 35 | 77.8% |
| `haiku-baseline` | 45 | 36 | 80.0% |
| `haiku-explore` | 45 | 36 | 80.0% |
| `haiku-graphify` | 45 | 37 | 82.2% |

## 8. Features never exercised

graphify exposes more than `query`. The table counts, per arm, how many times each subcommand was invoked across all runs (and, in parentheses, how many runs used it at least once). A zero column is the point: it means the benchmark never put that feature under measurement, so nothing here — positive or negative — can be read as evidence about it.

| condition | runs | `query` | `explain` | `path` | `god-nodes` | `affected` | `save-result` | `reflect` | `update` | `benchmark` |
|---|---|---|---|---|---|---|---|---|---|---|
| `baseline` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `baseline-nosub` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `effort-low` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `effort-low-nosub` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `effort-medium` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `graphify` | 45 | 63 (45) | 16 (8) | 4 (3) | **0** | **0** | **0** | **0** | **0** | **0** |
| `graphify-strict` | 45 | 61 (45) | 18 (12) | 3 (2) | **0** | **0** | **0** | **0** | 2 (2) | **0** |
| `haiku-baseline` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `haiku-explore` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `haiku-graphify` | 45 | 77 (43) | 15 (10) | 7 (7) | **0** | **0** | **0** | **0** | **0** | **0** |

| condition | runs reading `graph.json` directly | runs that never invoked the CLI (nudge ignored) | strict denials: total (median/run) |
|---|---|---|---|
| `baseline` | 0 | n/a (no graph) | 0 (0) |
| `baseline-nosub` | 0 | n/a (no graph) | 0 (0) |
| `effort-low` | 0 | n/a (no graph) | 0 (0) |
| `effort-low-nosub` | 0 | n/a (no graph) | 0 (0) |
| `effort-medium` | 0 | n/a (no graph) | 0 (0) |
| `graphify` | 4 | 0 | 0 (0) |
| `graphify-strict` | 7 | 0 | 0 (0) |
| `haiku-baseline` | 0 | n/a (no graph) | 0 (0) |
| `haiku-explore` | 0 | n/a (no graph) | 0 (0) |
| `haiku-graphify` | 2 | 2 | 0 (0) |

> **The strict block never fired.** Across 45 `graphify-strict` runs the hook denied **zero** reads, confirmed three ways: no `permissionDecision` in any transcript, no deny text, and `permission_denials` = 0 in every `result.json`. The cause is in graphify's own guard (`cli.py::_query_stamp_fresh`): strict suppresses its block while a query/explain/path ran within the last 30 minutes, and the overlay's `CLAUDE.md` already steers the agent to `graphify query` **before** its first raw `Read`. The soft nudge wins the race every time, so the strict flag is inert under this overlay — `graphify-strict` vs `graphify` is therefore a null result about a knob that never engaged, **not** evidence that forcing graph-first exploration does nothing.

> **Cross-session memory was never measured.** `save-result`, `reflect` and `affected` are the mechanisms by which graphify is supposed to compound across sessions, and they were invoked **zero times in every arm**. Each benchmark run is a fresh corpus copy with a fresh session, so there is no second session for a saved result to pay off in — the design that would exercise them is a different experiment, not a variation of this one. The honest statement is that this benchmark measures single-session retrieval only.

## 9. Speed

> **Secondary, and noisy.** Every run in every set was measured at **concurrency 3** on a single machine, so session wall-clock includes contention this harness never controlled for and cannot quantify. Tokens and cost are properties of the measurement; durations are not. Read the session rows as an order of magnitude only.

Session timings, median (IQR) in ms:

| condition | runs | wall `duration_ms` | API `duration_api_ms` | `ttft_ms` | pre-request `time_to_request_ms` |
|---|---|---|---|---|---|
| `baseline` | 45 | 29,471 (13,626–50,625) | 51,095 (30,066–103,242) | 1,975 (1,579–2,650) | 18 (6–20) |
| `baseline-nosub` | 45 | 33,485 (15,536–58,606) | 34,165 (16,084–59,353) | 1,680 (1,543–2,704) | 18 (16–21) |
| `effort-low` | 45 | 16,220 (10,622–22,799) | 29,324 (17,457–69,160) | 2,129 (1,592–3,076) | 16 (5–18) |
| `effort-low-nosub` | 45 | 15,654 (11,997–38,715) | 15,824 (12,906–39,308) | 1,875 (1,575–2,405) | 17 (16–20) |
| `effort-medium` | 45 | 15,734 (7,328–22,575) | 49,319 (24,423–80,047) | 1,954 (1,490–2,532) | 8 (5–17) |
| `graphify` | 45 | 38,594 (22,199–81,513) | 38,327 (22,605–81,287) | 1,901 (1,519–2,463) | 19 (17–21) |
| `graphify-strict` | 45 | 44,277 (26,523–83,351) | 48,706 (26,186–85,475) | 2,174 (1,689–3,123) | 18 (17–20) |
| `haiku-baseline` | 45 | 52,386 (26,385–86,854) | 52,898 (27,535–88,069) | 2,391 (2,179–2,853) | 18 (16–21) |
| `haiku-explore` | 45 | 19,576 (10,260–52,302) | 60,756 (20,200–148,026) | 2,399 (1,586–3,279) | 16 (6–17) |
| `haiku-graphify` | 45 | 47,313 (29,100–70,958) | 46,333 (28,965–70,428) | 2,578 (2,306–2,848) | 18 (16–20) |

`time_to_request_ms` covers everything before the first API request, which is where **MCP server startup lands**: it is the only column in which an arm that must spawn and handshake with a server can differ from one that does not. The transcript itself cannot show that cost — Claude Code connects its configured servers *before* writing the first transcript entry, so the delay between the first entry and the one advertising the server's tools collapses to a few milliseconds of bookkeeping rather than measuring the spawn.

Per-tool-call latency, median (IQR) in ms, pooled over calls:

| condition | `Bash(graphify)` | `Read` | `Bash` | `Agent` |
|---|---|---|---|---|
| `baseline` | – | 7 (5–11) | 50 (34–102) | 16 (11–63,506) |
| `baseline-nosub` | – | 5 (4–6) | 45 (31–113) | – |
| `effort-low` | – | 5 (4–7) | 54 (38–179) | 10 (6–7,182) |
| `effort-low-nosub` | – | 5 (3–8) | 44 (30–160) | – |
| `effort-medium` | – | 7 (5–8) | 54 (35–190) | 9 (7–11) |
| `graphify` | 294 (282–307) | 64 (59–70) | 90 (80–208) | – |
| `graphify-strict` | 300 (281–329) | 62 (55–66) | 95 (78–201) | 11 (11–11) |
| `haiku-baseline` | – | 5 (4–6) | 43 (32–121) | 5 (5–6) |
| `haiku-explore` | – | 5 (4–6) | 46 (32–119) | 9 (7–12) |
| `haiku-graphify` | 301 (286–328) | 59 (54–66) | 121 (88–269) | – |

Each cell is timed from the transcript entry carrying the `tool_use` block to the entry carrying its matching `tool_result`, both written locally by the same process. Calls whose result never arrived — a run that hit its turn cap mid-call — are absent rather than counted as zero. `n` per cell is the number of calls, not the number of runs, so an arm that called a tool once contributes one observation.

**Index build cost, for scale.** graphify v1: **4.6 s** total (`update` 3.4 s + `cluster-only` 1.2 s, AST-only, no API calls). graphify v2: a comparable AST pass plus roughly **35 min** of LLM-backed document extraction. MemPalace v1: **49 s**; v2: **97 s** (embedding + indexing, `--no-llm`, no API calls). All are one-off costs paid before any run, and none is included in any figure above — they are listed only so a per-query latency can be read against what producing the index cost in the first place.

## 10. Thinking tokens and model mix

Thinking tokens are billed as output and are a **subset** of `output_tokens`, not an addition to it, so the share is the honest reading of an effort change: an arm that merely wrote less prose would move the absolute count without touching the lever. The figure is main-session only — `usage.output_tokens_details` does not see a subagent — so an arm that delegates reports the *parent's* thinking, and its explorer's thinking appears only as tokens against that explorer's model in the second table.

| condition | runs | thinking tokens | main-session output | thinking share |
|---|---|---|---|---|
| `baseline` | 45 | 38,707 | 104,667 | 37.0% |
| `baseline-nosub` | 45 | 57,807 | 149,406 | 38.7% |
| `effort-low` | 45 | 8,153 | 51,571 | 15.8% |
| `effort-low-nosub` | 45 | 20,251 | 86,633 | 23.4% |
| `effort-medium` | 45 | 10,292 | 51,167 | 20.1% |
| `graphify` | 45 | 105,595 | 209,848 | 50.3% |
| `graphify-strict` | 45 | 91,664 | 184,741 | 49.6% |
| `haiku-baseline` | 45 | 98,358 | 209,727 | 46.9% |
| `haiku-explore` | 45 | 40,226 | 105,524 | 38.1% |
| `haiku-graphify` | 45 | 88,517 | 183,175 | 48.3% |

**Which model spent the tokens.** Summed from `modelUsage` over every run of the arm, on the same definition as `uncached_equivalent_all` (input + cache read + cache creation), so the row totals reconcile with the headline volume rather than describing some adjacent quantity. Note that a ~1k-token Haiku entry appears in **every** arm, including plain `baseline`: that is Claude Code's own background helper call, not delegated exploration. Only an arm whose Haiku row is orders of magnitude larger than that has actually moved work onto Haiku.

That helper's size is a deterministic function of the task prompt, so every Sonnet arm running the same task set reports the **identical** Haiku total. Rows agreeing to the token are therefore the expected result here, not a copy-paste fault — and they are what makes the figure usable as a baseline to read a genuinely delegating arm against.

| condition | `claude-haiku-4-5` tokens | `claude-sonnet-5` tokens | `claude-haiku-4-5` cost | `claude-sonnet-5` cost |
|---|---|---|---|---|
| `baseline` | 44,766 | 16,351,183 | $0.05 | $11.27 |
| `baseline-nosub` | 44,766 | 12,959,103 | $0.05 | $8.01 |
| `effort-low` | 44,766 | 10,350,967 | $0.05 | $7.36 |
| `effort-low-nosub` | 44,766 | 9,177,696 | $0.05 | $5.67 |
| `effort-medium` | 44,766 | 12,707,212 | $0.05 | $9.06 |
| `graphify` | 44,766 | 17,795,561 | $0.05 | $10.99 |
| `graphify-strict` | 44,766 | 17,243,098 | $0.05 | $10.65 |
| `haiku-baseline` | 25,515,351 | 0 | $6.13 | $0.00 |
| `haiku-explore` | 15,458,608 | 13,081,022 | $3.39 | $8.78 |
| `haiku-graphify` | 20,145,152 | 0 | $5.39 | $0.00 |

## 11. Counter-productive cases and subagent use

- `baseline`: **23** subagent(s) spawned across **23**/45 run(s). T2S all-model 393,482 vs main-session-only 175,246.
- `baseline-nosub`: **0** subagent(s) spawned across **0**/45 run(s). T2S all-model 311,808 vs main-session-only 310,813.
- `effort-low`: **23** subagent(s) spawned across **23**/45 run(s). T2S all-model 244,318 vs main-session-only 123,838.
- `effort-low-nosub`: **0** subagent(s) spawned across **0**/45 run(s). T2S all-model 223,500 vs main-session-only 222,505.
- `effort-medium`: **29** subagent(s) spawned across **29**/45 run(s). T2S all-model 307,709 vs main-session-only 103,201.
- `graphify`: **0** subagent(s) spawned across **0**/45 run(s). T2S all-model 429,005 vs main-session-only 428,008.
- `graphify-strict`: **1** subagent(s) spawned across **1**/45 run(s). T2S all-model 414,500 vs main-session-only 386,497.
- `haiku-baseline`: **2** subagent(s) spawned across **1**/45 run(s). T2S all-model 621,126 vs main-session-only 603,345.
- `haiku-explore`: **26** subagent(s) spawned across **23**/45 run(s). T2S all-model 687,692 vs main-session-only 177,417.
- `haiku-graphify`: **0** subagent(s) spawned across **0**/45 run(s). T2S all-model 491,331 vs main-session-only 490,335.
- Runs that opened `graphify-out/graph.json` directly: **13** (`EXP3-digest-pipeline__graphify__r1`, `IMP2-rename-issue-created__graphify__r1`, `XFIX2-mention-inside-code__graphify__r1`, `XREF5-rate-limit-importers__graphify__r1`, `LOC3-digest-window__graphify-strict__r1`, `REF3-issue-created-subscribers__graphify-strict__r1`, `XEXP2-invitation-lifecycle__graphify-strict__r1`, `XLOC3-issue-number-allocation__graphify-strict__r1`, `XLOC3-issue-number-allocation__haiku-graphify__r1`, `XLOC4-session-lifetime__graphify-strict__r1`, `XLOC6-menu-entry-visibility__graphify-strict__r1`, `XREF2-emit-callers__haiku-graphify__r1`, `XREF3-isenabled-callers__graphify-strict__r1`)
- graphify-condition runs that never invoked the `graphify` CLI (nudge ignored): **45** (`EXP1-issue-create-flow__effort-medium__r1`, `EXP2-comment-mention-notify__effort-medium__r1`, `EXP3-digest-pipeline__effort-medium__r1`, `FIX1-issue-tenant-leak__effort-medium__r1`, `FIX2-project-quota-off-by-one__effort-medium__r1`, `FIX3-board-shows-archived__effort-medium__r1`, `IMP1-planlimits-field__effort-medium__r1`, `IMP2-rename-issue-created__effort-medium__r1`, `IMP3-limited-resource-union__effort-medium__r1`, `LOC1-shortcut-match__effort-medium__r1`, `LOC2-webhook-plan-cap__effort-medium__r1`, `LOC3-digest-window__effort-medium__r1`, `REF1-assertcan-callers__effort-medium__r1`, `REF2-would-exceed-limit-callers__effort-medium__r1`, `REF3-issue-created-subscribers__effort-medium__r1`, `XEXP1-webhook-delivery__effort-medium__r1`, `XEXP2-invitation-lifecycle__effort-medium__r1`, `XEXP3-plan-change__effort-medium__r1`, `XEXP4-signin-to-actor__effort-medium__r1`, `XEXP5-search-index__effort-medium__r1`, `XEXP6-overdue-sweep__effort-medium__r1`, `XFIX1-csv-quote-escape__effort-medium__r1`, `XFIX2-mention-inside-code__effort-medium__r1`, `XFIX3-last-owner-removable__effort-medium__r1`, `XFIX4-advanced-search-inverted__effort-medium__r1`, `XFIX5-self-notification__effort-medium__r1`, `XFIX6-revoked-invite-accepted__effort-medium__r1`, `XIMP1-role-union__effort-medium__r1`, `XIMP2-rename-comment-created__effort-medium__r1`, `XIMP3-issue-status-union__effort-medium__r1`, `XIMP4-feature-flag-key-union__effort-medium__r1`, `XIMP5-plan-id-union__effort-medium__r1`, `XIMP6-limit-check-field__effort-medium__r1`, `XLOC1-retry-throttle__effort-medium__r1`, `XLOC2-invite-link-validity__effort-medium__r1`, `XLOC3-issue-number-allocation__effort-medium__r1`, `XLOC4-session-lifetime__effort-medium__r1`, `XLOC5-delivery-retry-policy__effort-medium__r1`, `XLOC6-menu-entry-visibility__effort-medium__r1`, `XREF1-assertorgscope-callers__effort-medium__r1`, `XREF2-emit-callers__effort-medium__r1`, `XREF3-isenabled-callers__effort-medium__r1`, `XREF4-comment-created-subscribers__effort-medium__r1`, `XREF5-rate-limit-importers__effort-medium__r1`, `XREF6-member-joined-repositories__effort-medium__r1`)

## 12. Failed and ungraded runs

Harness failures (`is_error`, or `terminal_reason` other than `completed`): **0**. The table below also lists runs that completed normally but did not meet their grader's success threshold — those are accuracy results, not execution problems.

| run_id | condition | task | is_error | terminal_reason |
|---|---|---|---|---|
| `IMP2-rename-issue-created__baseline__r1` | baseline | IMP2-rename-issue-created | false | completed |
| `IMP2-rename-issue-created__graphify__r1` | graphify | IMP2-rename-issue-created | false | completed |
| `LOC2-webhook-plan-cap__baseline__r1` | baseline | LOC2-webhook-plan-cap | false | completed |
| `LOC2-webhook-plan-cap__graphify__r1` | graphify | LOC2-webhook-plan-cap | false | completed |
| `LOC3-digest-window__graphify__r1` | graphify | LOC3-digest-window | false | completed |
| `XFIX5-self-notification__baseline__r1` | baseline | XFIX5-self-notification | false | completed |
| `XFIX5-self-notification__graphify__r1` | graphify | XFIX5-self-notification | false | completed |
| `XFIX6-revoked-invite-accepted__graphify__r1` | graphify | XFIX6-revoked-invite-accepted | false | completed |
| `XIMP1-role-union__baseline__r1` | baseline | XIMP1-role-union | false | completed |
| `XIMP1-role-union__graphify__r1` | graphify | XIMP1-role-union | false | completed |
| `XIMP2-rename-comment-created__baseline__r1` | baseline | XIMP2-rename-comment-created | false | completed |
| `XIMP2-rename-comment-created__graphify__r1` | graphify | XIMP2-rename-comment-created | false | completed |
| `XIMP5-plan-id-union__baseline__r1` | baseline | XIMP5-plan-id-union | false | completed |
| `XIMP5-plan-id-union__graphify__r1` | graphify | XIMP5-plan-id-union | false | completed |
| `XIMP6-limit-check-field__baseline__r1` | baseline | XIMP6-limit-check-field | false | completed |
| `XIMP6-limit-check-field__graphify__r1` | graphify | XIMP6-limit-check-field | false | completed |
| `XLOC4-session-lifetime__graphify__r1` | graphify | XLOC4-session-lifetime | false | completed |
| `IMP2-rename-issue-created__baseline-nosub__r1` | baseline-nosub | IMP2-rename-issue-created | false | completed |
| `IMP2-rename-issue-created__graphify-strict__r1` | graphify-strict | IMP2-rename-issue-created | false | completed |
| `IMP2-rename-issue-created__haiku-baseline__r1` | haiku-baseline | IMP2-rename-issue-created | false | completed |
| `IMP2-rename-issue-created__haiku-graphify__r1` | haiku-graphify | IMP2-rename-issue-created | false | completed |
| `LOC2-webhook-plan-cap__baseline-nosub__r1` | baseline-nosub | LOC2-webhook-plan-cap | false | completed |
| `LOC2-webhook-plan-cap__graphify-strict__r1` | graphify-strict | LOC2-webhook-plan-cap | false | completed |
| `LOC2-webhook-plan-cap__haiku-baseline__r1` | haiku-baseline | LOC2-webhook-plan-cap | false | completed |
| `LOC2-webhook-plan-cap__haiku-graphify__r1` | haiku-graphify | LOC2-webhook-plan-cap | false | completed |
| `LOC3-digest-window__baseline-nosub__r1` | baseline-nosub | LOC3-digest-window | false | completed |
| `LOC3-digest-window__graphify-strict__r1` | graphify-strict | LOC3-digest-window | false | completed |
| `REF2-would-exceed-limit-callers__graphify-strict__r1` | graphify-strict | REF2-would-exceed-limit-callers | false | completed |
| `REF2-would-exceed-limit-callers__haiku-baseline__r1` | haiku-baseline | REF2-would-exceed-limit-callers | false | completed |
| `XFIX5-self-notification__graphify-strict__r1` | graphify-strict | XFIX5-self-notification | false | completed |
| `XFIX5-self-notification__haiku-baseline__r1` | haiku-baseline | XFIX5-self-notification | false | completed |
| `XFIX5-self-notification__haiku-graphify__r1` | haiku-graphify | XFIX5-self-notification | false | completed |
| `XFIX6-revoked-invite-accepted__graphify-strict__r1` | graphify-strict | XFIX6-revoked-invite-accepted | false | completed |
| `XIMP1-role-union__baseline-nosub__r1` | baseline-nosub | XIMP1-role-union | false | completed |
| `XIMP1-role-union__graphify-strict__r1` | graphify-strict | XIMP1-role-union | false | completed |
| `XIMP2-rename-comment-created__baseline-nosub__r1` | baseline-nosub | XIMP2-rename-comment-created | false | completed |
| `XIMP2-rename-comment-created__graphify-strict__r1` | graphify-strict | XIMP2-rename-comment-created | false | completed |
| `XIMP2-rename-comment-created__haiku-baseline__r1` | haiku-baseline | XIMP2-rename-comment-created | false | completed |
| `XIMP2-rename-comment-created__haiku-graphify__r1` | haiku-graphify | XIMP2-rename-comment-created | false | completed |
| `XIMP3-issue-status-union__haiku-baseline__r1` | haiku-baseline | XIMP3-issue-status-union | false | completed |
| `XIMP5-plan-id-union__baseline-nosub__r1` | baseline-nosub | XIMP5-plan-id-union | false | completed |
| `XIMP5-plan-id-union__graphify-strict__r1` | graphify-strict | XIMP5-plan-id-union | false | completed |
| `XIMP5-plan-id-union__haiku-baseline__r1` | haiku-baseline | XIMP5-plan-id-union | false | completed |
| `XIMP5-plan-id-union__haiku-graphify__r1` | haiku-graphify | XIMP5-plan-id-union | false | completed |
| `XIMP6-limit-check-field__baseline-nosub__r1` | baseline-nosub | XIMP6-limit-check-field | false | completed |
| `XIMP6-limit-check-field__graphify-strict__r1` | graphify-strict | XIMP6-limit-check-field | false | completed |
| `XIMP6-limit-check-field__haiku-baseline__r1` | haiku-baseline | XIMP6-limit-check-field | false | completed |
| `XIMP6-limit-check-field__haiku-graphify__r1` | haiku-graphify | XIMP6-limit-check-field | false | completed |
| `XLOC4-session-lifetime__haiku-graphify__r1` | haiku-graphify | XLOC4-session-lifetime | false | completed |
| `XLOC5-delivery-retry-policy__haiku-baseline__r1` | haiku-baseline | XLOC5-delivery-retry-policy | false | completed |
| `XLOC5-delivery-retry-policy__haiku-graphify__r1` | haiku-graphify | XLOC5-delivery-retry-policy | false | completed |
| `IMP2-rename-issue-created__effort-low-nosub__r1` | effort-low-nosub | IMP2-rename-issue-created | false | completed |
| `IMP2-rename-issue-created__effort-low__r1` | effort-low | IMP2-rename-issue-created | false | completed |
| `IMP2-rename-issue-created__effort-medium__r1` | effort-medium | IMP2-rename-issue-created | false | completed |
| `IMP2-rename-issue-created__haiku-explore__r1` | haiku-explore | IMP2-rename-issue-created | false | completed |
| `LOC2-webhook-plan-cap__effort-low-nosub__r1` | effort-low-nosub | LOC2-webhook-plan-cap | false | completed |
| `LOC2-webhook-plan-cap__effort-low__r1` | effort-low | LOC2-webhook-plan-cap | false | completed |
| `LOC2-webhook-plan-cap__effort-medium__r1` | effort-medium | LOC2-webhook-plan-cap | false | completed |
| `LOC2-webhook-plan-cap__haiku-explore__r1` | haiku-explore | LOC2-webhook-plan-cap | false | completed |
| `LOC3-digest-window__effort-low__r1` | effort-low | LOC3-digest-window | false | completed |
| `LOC3-digest-window__effort-medium__r1` | effort-medium | LOC3-digest-window | false | completed |
| `LOC3-digest-window__haiku-explore__r1` | haiku-explore | LOC3-digest-window | false | completed |
| `XEXP6-overdue-sweep__haiku-explore__r1` | haiku-explore | XEXP6-overdue-sweep | false | completed |
| `XFIX5-self-notification__effort-low__r1` | effort-low | XFIX5-self-notification | false | completed |
| `XFIX5-self-notification__effort-medium__r1` | effort-medium | XFIX5-self-notification | false | completed |
| `XFIX5-self-notification__haiku-explore__r1` | haiku-explore | XFIX5-self-notification | false | completed |
| `XIMP1-role-union__effort-low-nosub__r1` | effort-low-nosub | XIMP1-role-union | false | completed |
| `XIMP1-role-union__effort-low__r1` | effort-low | XIMP1-role-union | false | completed |
| `XIMP1-role-union__effort-medium__r1` | effort-medium | XIMP1-role-union | false | completed |
| `XIMP1-role-union__haiku-explore__r1` | haiku-explore | XIMP1-role-union | false | completed |
| `XIMP2-rename-comment-created__effort-low-nosub__r1` | effort-low-nosub | XIMP2-rename-comment-created | false | completed |
| `XIMP2-rename-comment-created__effort-low__r1` | effort-low | XIMP2-rename-comment-created | false | completed |
| `XIMP2-rename-comment-created__effort-medium__r1` | effort-medium | XIMP2-rename-comment-created | false | completed |
| `XIMP2-rename-comment-created__haiku-explore__r1` | haiku-explore | XIMP2-rename-comment-created | false | completed |
| `XIMP5-plan-id-union__effort-low-nosub__r1` | effort-low-nosub | XIMP5-plan-id-union | false | completed |
| `XIMP5-plan-id-union__effort-low__r1` | effort-low | XIMP5-plan-id-union | false | completed |
| `XIMP5-plan-id-union__effort-medium__r1` | effort-medium | XIMP5-plan-id-union | false | completed |
| `XIMP5-plan-id-union__haiku-explore__r1` | haiku-explore | XIMP5-plan-id-union | false | completed |
| `XIMP6-limit-check-field__effort-low-nosub__r1` | effort-low-nosub | XIMP6-limit-check-field | false | completed |
| `XIMP6-limit-check-field__effort-low__r1` | effort-low | XIMP6-limit-check-field | false | completed |
| `XIMP6-limit-check-field__effort-medium__r1` | effort-medium | XIMP6-limit-check-field | false | completed |
| `XIMP6-limit-check-field__haiku-explore__r1` | haiku-explore | XIMP6-limit-check-field | false | completed |
| `XLOC4-session-lifetime__effort-low-nosub__r1` | effort-low-nosub | XLOC4-session-lifetime | false | completed |
| `XLOC6-menu-entry-visibility__effort-low__r1` | effort-low | XLOC6-menu-entry-visibility | false | completed |
| `XLOC6-menu-entry-visibility__effort-medium__r1` | effort-medium | XLOC6-menu-entry-visibility | false | completed |

## 13. Per-set breakdown (drift between measurement sets)

The two task sets were authored separately. Pooling them is only legitimate if they behave alike, so each set is re-analysed on its own here: a large gap between the two blocks means the pooled numbers above are averaging over a real difference in task design, not just sampling noise.

### set `ext` — 60 runs over 30 tasks

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 30 | **264,990** (200,807–401,224) | 156,888 | 0.173 | 5.0 | 13 in 13 run(s) | 58 | 0 | 0 | 79 | 0 | 83.3% (25/30) | 381,393 |
| graphify | 30 | **289,189** (178,121–470,469) | 288,194 | 0.202 | 8.5 | 0 in 0 run(s) | 125 | 0 | 0 | 130 | 59 | 76.7% (23/30) | 417,147 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 0 | – | [–, –] | – | n too small |
| uncached_equivalent | 0 | – | [–, –] | – | n too small |
| total_cost_usd | 0 | – | [–, –] | – | n too small |
| num_turns | 0 | – | [–, –] | – | n too small |

### set `levers` — 180 runs over 45 tasks

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low | 45 | **189,614** (132,368–276,765) | 119,589 | 0.132 | 4.0 | 23 in 23 run(s) | 29 | 0 | 0 | 79 | 0 | 80.0% (36/45) | 244,318 |
| effort-low-nosub | 45 | **142,566** (130,778–229,806) | 141,561 | 0.098 | 6.0 | 0 in 0 run(s) | 82 | 0 | 0 | 206 | 0 | 84.4% (38/45) | 223,500 |
| effort-medium | 45 | **238,378** (178,164–367,677) | 83,664 | 0.181 | 2.0 | 29 in 29 run(s) | 27 | 0 | 0 | 74 | 0 | 80.0% (36/45) | 307,709 |
| haiku-explore | 45 | **243,863** (190,645–846,537) | 155,757 | 0.172 | 5.0 | 26 in 23 run(s) | 132 | 0 | 0 | 115 | 0 | 80.0% (36/45) | 687,692 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 0 | – | [–, –] | – | n too small |
| uncached_equivalent | 0 | – | [–, –] | – | n too small |
| total_cost_usd | 0 | – | [–, –] | – | n too small |
| num_turns | 0 | – | [–, –] | – | n too small |

### set `set1` — 30 runs over 15 tasks

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 15 | **259,513** (216,927–575,709) | 120,276 | 0.208 | 4.0 | 10 in 10 run(s) | 10 | 0 | 0 | 27 | 0 | 86.7% (13/15) | 416,732 |
| graphify | 15 | **288,502** (231,038–483,621) | 287,545 | 0.184 | 10.0 | 0 in 0 run(s) | 66 | 0 | 0 | 78 | 24 | 80.0% (12/15) | 451,734 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 0 | – | [–, –] | – | n too small |
| uncached_equivalent | 0 | – | [–, –] | – | n too small |
| total_cost_usd | 0 | – | [–, –] | – | n too small |
| num_turns | 0 | – | [–, –] | – | n too small |

### set `structural` — 180 runs over 45 tasks

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline-nosub | 45 | **230,081** (126,680–378,938) | 229,091 | 0.134 | 8.0 | 0 in 0 run(s) | 170 | 0 | 0 | 232 | 0 | 84.4% (38/45) | 311,808 |
| graphify-strict | 45 | **288,533** (181,403–463,327) | 286,953 | 0.186 | 8.0 | 1 in 1 run(s) | 141 | 0 | 0 | 216 | 83 | 77.8% (35/45) | 414,500 |
| haiku-baseline | 45 | **502,978** (159,352–754,040) | 498,061 | 0.121 | 15.0 | 2 in 1 run(s) | 278 | 0 | 0 | 350 | 0 | 80.0% (36/45) | 621,126 |
| haiku-graphify | 45 | **327,185** (190,413–523,370) | 326,189 | 0.103 | 10.0 | 0 in 0 run(s) | 229 | 0 | 0 | 155 | 99 | 82.2% (37/45) | 491,331 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 0 | – | [–, –] | – | n too small |
| uncached_equivalent | 0 | – | [–, –] | – | n too small |
| total_cost_usd | 0 | – | [–, –] | – | n too small |
| num_turns | 0 | – | [–, –] | – | n too small |

## 14. Deliberately-easy controls vs the rest

Some tasks were written as **designed zero-advantage controls**: their answer is reproduced exactly by a single literal `grep`, so a structural index has nothing to add and the expected effect is zero or negative. They are marked `DELIBERATELY EASY` in the task notes and are separated out here so they neither flatter nor drag the headline number. Easy tasks: `IMP2-rename-issue-created`, `LOC1-shortcut-match`, `XIMP2-rename-comment-created`, `XLOC1-retry-throttle`, `XREF5-rate-limit-importers`.

### easy (zero-advantage controls) — 50 runs over 5 tasks

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 5 | **121,254** (120,997–161,762) | 120,026 | 0.083 | 4.0 | 1 in 1 run(s) | 6 | 0 | 0 | 15 | 0 | 60.0% (3/5) | 237,318 |
| baseline-nosub | 5 | **80,302** (79,836–107,441) | 79,317 | 0.072 | 4.0 | 0 in 0 run(s) | 6 | 0 | 0 | 14 | 0 | 60.0% (3/5) | 163,665 |
| effort-low | 5 | **120,560** (120,130–121,733) | 119,589 | 0.080 | 4.0 | 0 in 0 run(s) | 2 | 0 | 0 | 16 | 0 | 60.0% (3/5) | 162,809 |
| effort-low-nosub | 5 | **104,527** (78,248–105,778) | 103,549 | 0.070 | 4.0 | 0 in 0 run(s) | 2 | 0 | 0 | 14 | 0 | 60.0% (3/5) | 132,848 |
| effort-medium | 5 | **116,011** (92,140–121,023) | 91,155 | 0.083 | 4.0 | 1 in 1 run(s) | 3 | 0 | 0 | 11 | 0 | 60.0% (3/5) | 145,764 |
| graphify | 5 | **160,029** (141,551–240,807) | 159,058 | 0.116 | 6.0 | 0 in 0 run(s) | 4 | 0 | 0 | 16 | 6 | 60.0% (3/5) | 226,858 |
| graphify-strict | 5 | **166,765** (133,014–206,080) | 165,794 | 0.129 | 5.0 | 0 in 0 run(s) | 3 | 0 | 0 | 16 | 5 | 60.0% (3/5) | 194,847 |
| haiku-baseline | 5 | **130,913** (92,281–168,261) | 129,935 | 0.049 | 5.0 | 0 in 0 run(s) | 7 | 0 | 0 | 25 | 0 | 60.0% (3/5) | 251,088 |
| haiku-explore | 5 | **91,071** (89,523–121,353) | 90,093 | 0.075 | 4.0 | 0 in 0 run(s) | 4 | 0 | 0 | 10 | 0 | 60.0% (3/5) | 123,050 |
| haiku-graphify | 5 | **102,483** (98,518–125,223) | 101,512 | 0.049 | 4.0 | 0 in 0 run(s) | 4 | 0 | 0 | 10 | 6 | 60.0% (3/5) | 140,655 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 5 | -54,952.8 | [-133,796.2, -1,090.2] | -18.8% | effort-medium lower |
| uncached_equivalent | 5 | -46,815.2 | [-126,712.4, 10,740.8] | -11.1% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 5 | -0.0204 | [-0.0602, 0.0180] | -5.9% | **CI crosses 0 — no detectable difference** |
| num_turns | 5 | -1.2 | [-3.6, 0.8] | -0.3% | **CI crosses 0 — no detectable difference** |

### rest — 400 runs over 40 tasks

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 40 | **270,860** (214,951–492,675) | 153,413 | 0.203 | 5.0 | 22 in 22 run(s) | 62 | 0 | 0 | 91 | 0 | 87.5% (35/40) | 406,868 |
| baseline-nosub | 40 | **233,554** (144,366–382,636) | 232,574 | 0.144 | 8.0 | 0 in 0 run(s) | 164 | 0 | 0 | 218 | 0 | 87.5% (35/40) | 324,506 |
| effort-low | 40 | **191,959** (152,838–300,875) | 111,311 | 0.137 | 4.0 | 23 in 23 run(s) | 27 | 0 | 0 | 63 | 0 | 82.5% (33/40) | 251,728 |
| effort-low-nosub | 40 | **164,490** (132,914–248,177) | 163,504 | 0.105 | 6.0 | 0 in 0 run(s) | 80 | 0 | 0 | 192 | 0 | 87.5% (35/40) | 231,271 |
| effort-medium | 40 | **254,137** (200,344–381,973) | 64,557 | 0.189 | 2.0 | 28 in 28 run(s) | 24 | 0 | 0 | 63 | 0 | 82.5% (33/40) | 322,431 |
| graphify | 40 | **319,452** (212,223–488,364) | 318,448 | 0.205 | 9.5 | 0 in 0 run(s) | 187 | 0 | 0 | 192 | 77 | 80.0% (32/40) | 447,956 |
| graphify-strict | 40 | **326,350** (204,604–508,983) | 301,360 | 0.201 | 9.0 | 1 in 1 run(s) | 138 | 0 | 0 | 200 | 78 | 80.0% (32/40) | 435,092 |
| haiku-baseline | 40 | **518,298** (189,475–809,182) | 505,719 | 0.132 | 15.5 | 2 in 1 run(s) | 271 | 0 | 0 | 325 | 0 | 82.5% (33/40) | 654,765 |
| haiku-explore | 40 | **261,206** (214,822–1,039,848) | 184,768 | 0.199 | 6.0 | 26 in 23 run(s) | 128 | 0 | 0 | 105 | 0 | 82.5% (33/40) | 739,023 |
| haiku-graphify | 40 | **390,476** (229,454–552,878) | 389,503 | 0.111 | 12.0 | 0 in 0 run(s) | 225 | 0 | 0 | 145 | 93 | 85.0% (34/40) | 522,273 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 40 | -84,230.2 | [-154,503.0, -29,104.7] | -8.0% | effort-medium lower |
| uncached_equivalent | 40 | -76,530.1 | [-130,827.3, -31,807.7] | -4.2% | effort-medium lower |
| total_cost_usd | 40 | -0.0528 | [-0.0878, -0.0209] | -8.3% | effort-medium lower |
| num_turns | 40 | -2.3 | [-3.8, -1.0] | -7.9% | effort-medium lower |

## 15. Limitations

- N = 450 runs over 45 tasks; a single corpus and a single model. These results do not generalize to other codebases or models.
- Bootstrap resamples tasks, so the interval reflects task-to-task variation, not within-task run noise.
- Where a CI crosses zero the honest reading is "no difference detected at this N", not "no difference exists".
- The fixed ~21k-token system-prompt/tool-definition overhead is included in both arms and not subtracted (see §2).
- **1 repetition per (task × condition)**: within-task run-to-run variance is unmeasured, so any single per-task difference may be run noise.
- Subagent traffic is counted in `uncached_all`, but a subagent's tool calls never reach the parent transcript, so the tool-call columns stay main-session-only.
- Raw per-run data lives in `results/runs/<run-id>/`, `results/ext/runs/<run-id>/`, `results/structural/runs/<run-id>/`, `results/levers/runs/<run-id>/` and the `summary.csv` beside this report.
