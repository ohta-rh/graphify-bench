# graphify-bench results

Generated 2026-09-02T14:48:34.356Z. 630 runs over 45 tasks, conditions: all-in, baseline, baseline-nosub, effort-low, effort-low-nosub, effort-medium, few-turns, graphify, graphify-strict, haiku-baseline, haiku-explore, haiku-graphify, haiku-nosub, lean-tools.

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
| `all-in` | `claude-haiku-4-5` | `few-turns` | `--tools Read,Grep,Glob,Bash,Edit --disallowedTools Agent` | Every lever this repository has found at once: the cheap model, no subagents, the lean tool allowlist and the turn-economy CLAUDE.md. Like `haiku-nosub` it declares no `--effort`, because Haiku ignores it. The arm answers whether the levers still compose once the model itself is the variable being cut. |
| `baseline-nosub` | `claude-sonnet-5` | `baseline` | `--disallowedTools Agent` | Baseline with the Agent tool removed, so it cannot delegate exploration to a subagent — isolates how much of baseline's efficiency is the subagent rather than the flat search. |
| `effort-low` | `claude-sonnet-5` | `baseline` | – | As `effort-medium`, one notch further down: baseline with `--effort low`. |
| `effort-low-nosub` | `claude-sonnet-5` | `baseline` | `--disallowedTools Agent` | The two strongest runtime levers at once: baseline's overlay byte for byte, invoked with `--effort low` AND `--disallowedTools Agent`. Both levers cut the same resource — total exploration and thinking — so the arm exists to answer whether their savings add up or overlap. Its treatment lives entirely in `claude.argv`; nothing in the corpus copy differs from a `baseline` run. |
| `effort-medium` | `claude-sonnet-5` | `baseline` | – | A RUNTIME LEVER, not a tool: the baseline overlay byte for byte, invoked with `--effort medium` instead of the harness default `high`. Thinking tokens bill as output, so the reduction is arithmetically certain and the open question is entirely about accuracy. |
| `few-turns` | `claude-sonnet-5` | `few-turns` | `--disallowedTools Agent` | `effort-low-nosub` with one instruction change: `overlays/few-turns/CLAUDE.md` is baseline's file byte for byte plus a `## Working economy` section (locate with `Grep -n`, read line ranges, batch independent calls into one turn, never re-read, stop when the evidence suffices). The answer-format contract is untouched, so the arm varies how many turns are spent, not what is answered. |
| `graphify-strict` | `claude-sonnet-5` | `graphify` + `graphify-strict` | – | Same as `graphify`, but the Read\|Glob hook runs `hook-guard read --strict`: the first raw Read of an indexed in-project source file per session is DENIED and redirected to `graphify query`. |
| `haiku-baseline` | `claude-haiku-4-5` | `baseline` | – | Baseline run by a weaker explorer. |
| `haiku-explore` | `claude-sonnet-5` | `haiku-explore` | – | Baseline plus one file: `.claude/agents/Explore.md` declaring `model: haiku`, which overrides Claude Code's built-in `Explore` subagent (project agents outrank built-ins) so delegated exploration runs on Haiku while the main session stays on Sonnet. Its `CLAUDE.md` is byte-identical to baseline's — the arm changes who explores, not what the agent is told. |
| `haiku-graphify` | `claude-haiku-4-5` | `graphify` | – | graphify run by a weaker explorer — the arm where a prebuilt index should help most. |
| `haiku-nosub` | `claude-haiku-4-5` | `baseline` | `--disallowedTools Agent` | `baseline-nosub` on the cheap model: Haiku 4.5 with the Agent tool removed. It carries NO `--effort` override — Haiku 4.5 does not honour `--effort` (measured: thinking tokens 202 at `low`, 172 at `max`, 690 with the flag absent; Sonnet 5 on the same prompt goes 0 -> 192), so declaring one here would record a treatment that never ran. It therefore takes the harness default exactly as `haiku-baseline` does, which is what makes that pair a single-variable comparison. |
| `lean-tools` | `claude-sonnet-5` | `baseline` | `--tools Read,Grep,Glob,Bash,Edit --disallowedTools Agent` | `effort-low-nosub` plus `--tools Read,Grep,Glob,Bash,Edit`, which REMOVES every other built-in tool's schema from the request rather than merely denying it at permission time (proved in docs/plan/LEAN.md §3). `Edit` is kept so `fix` tasks stay solvable. `--disallowedTools Agent` is redundant — `Agent` is already outside the allowlist — and is retained only so the arm's lineage from `effort-low-nosub` is legible in `claude.argv`. |

## 2. Overall

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| all-in | 45 | **200,484** (122,579–646,876) | 199,499 | 0.081 | 13.0 | 0 in 0 run(s) | 265 | 265 | 40 | 110 | 0 | 75.6% (34/45) | 534,053 |
| baseline | 45 | **260,561** (203,616–428,937) | 144,597 | 0.197 | 5.0 | 23 in 23 run(s) | 68 | 0 | 0 | 106 | 0 | 84.4% (38/45) | 393,482 |
| baseline-nosub | 45 | **230,081** (126,680–378,938) | 229,091 | 0.134 | 8.0 | 0 in 0 run(s) | 170 | 0 | 0 | 232 | 0 | 84.4% (38/45) | 311,808 |
| effort-low | 45 | **189,614** (132,368–276,765) | 119,589 | 0.132 | 4.0 | 23 in 23 run(s) | 29 | 0 | 0 | 79 | 0 | 80.0% (36/45) | 244,318 |
| effort-low-nosub | 45 | **142,566** (130,778–229,806) | 141,561 | 0.098 | 6.0 | 0 in 0 run(s) | 82 | 0 | 0 | 206 | 0 | 84.4% (38/45) | 223,500 |
| effort-medium | 45 | **238,378** (178,164–367,677) | 83,664 | 0.181 | 2.0 | 29 in 29 run(s) | 27 | 0 | 0 | 74 | 0 | 80.0% (36/45) | 307,709 |
| few-turns | 45 | **159,886** (107,345–216,071) | 158,929 | 0.094 | 6.0 | 0 in 0 run(s) | 62 | 0 | 0 | 201 | 0 | 84.4% (38/45) | 218,629 |
| graphify | 45 | **288,502** (197,852–481,415) | 287,545 | 0.191 | 9.0 | 0 in 0 run(s) | 191 | 0 | 0 | 208 | 83 | 77.8% (35/45) | 429,005 |
| graphify-strict | 45 | **288,533** (181,403–463,327) | 286,953 | 0.186 | 8.0 | 1 in 1 run(s) | 141 | 0 | 0 | 216 | 83 | 77.8% (35/45) | 414,500 |
| haiku-baseline | 45 | **502,978** (159,352–754,040) | 498,061 | 0.121 | 15.0 | 2 in 1 run(s) | 278 | 0 | 0 | 350 | 0 | 80.0% (36/45) | 621,126 |
| haiku-explore | 45 | **243,863** (190,645–846,537) | 155,757 | 0.172 | 5.0 | 26 in 23 run(s) | 132 | 0 | 0 | 115 | 0 | 80.0% (36/45) | 687,692 |
| haiku-graphify | 45 | **327,185** (190,413–523,370) | 326,189 | 0.103 | 10.0 | 0 in 0 run(s) | 229 | 0 | 0 | 155 | 99 | 82.2% (37/45) | 491,331 |
| haiku-nosub | 45 | **308,582** (163,265–722,699) | 307,596 | 0.096 | 13.0 | 0 in 0 run(s) | 308 | 0 | 0 | 373 | 0 | 82.2% (37/45) | 626,843 |
| lean-tools | 45 | **151,221** (113,229–214,866) | 150,241 | 0.093 | 6.0 | 0 in 0 run(s) | 119 | 118 | 2 | 36 | 0 | 82.2% (37/45) | 207,408 |

**`uncached_all` (PRIMARY) = Σ over every entry of `modelUsage` of (inputTokens + cacheReadInputTokens + cacheCreationInputTokens)** — it covers the main session *and* any subagent, so it is commensurable with `total_cost_usd`. `uncached_main` (secondary) is the same sum taken from `usage.*`, which the result JSON populates for the **main session only**; a run that spawned a subagent therefore reports less information volume there than it actually consumed. The `subagents` column lets the two be reconciled. Tool columns are totals across all runs of the condition. T2S (tokens-to-success) = total `uncached_all` of successful runs / number of successful runs.

Fixed overhead, reported separately so readers can subtract it (architecture.md §5):

| condition | first-turn cache_creation (median) |
|---|---|
| all-in | 5,680 |
| baseline | 10,357 |
| baseline-nosub | 9,510 |
| effort-low | 10,363 |
| effort-low-nosub | 9,515 |
| effort-medium | 10,360 |
| few-turns | 9,871 |
| graphify | 10,943 |
| graphify-strict | 10,935 |
| haiku-baseline | 8,014 |
| haiku-explore | 10,242 |
| haiku-graphify | 8,438 |
| haiku-nosub | 7,417 |
| lean-tools | 6,668 |

## 3. Paired difference (all-in − baseline), all tasks

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | 93,358.4 | [-25,647.4, 236,453.3] | 31.3% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 45 | 282,595.6 | [127,392.8, 455,496.2] | 405.6% | all-in higher |
| total_cost_usd | 45 | -0.1399 | [-0.1797, -0.1007] | -51.8% | all-in lower |
| num_turns | 45 | 11.1 | [7.4, 15.3] | 455.9% | all-in higher |

> **Why the two token rows disagree.** Subagent use is asymmetric between the arms (baseline 23/45 runs, all-in 0/45). `uncached_equivalent` cannot see a subagent's tokens, so it charges that work to nobody and makes the subagent-spawning arm look cheap; `uncached_equivalent_all` counts it. **Read the `_all` row** — the main-only row is retained only to show the size of the distortion.

## 4. Iso-accuracy subset

Tasks where every graded run of both conditions succeeded (33/45): `EXP1-issue-create-flow`, `EXP2-comment-mention-notify`, `EXP3-digest-pipeline`, `FIX1-issue-tenant-leak`, `FIX2-project-quota-off-by-one`, `FIX3-board-shows-archived`, `IMP1-planlimits-field`, `IMP3-limited-resource-union`, `LOC1-shortcut-match`, `REF1-assertcan-callers`, `REF2-would-exceed-limit-callers`, `REF3-issue-created-subscribers`, `XEXP1-webhook-delivery`, `XEXP2-invitation-lifecycle`, `XEXP3-plan-change`, `XEXP5-search-index`, `XEXP6-overdue-sweep`, `XFIX1-csv-quote-escape`, `XFIX2-mention-inside-code`, `XFIX3-last-owner-removable`, `XFIX4-advanced-search-inverted`, `XFIX6-revoked-invite-accepted`, `XIMP3-issue-status-union`, `XIMP4-feature-flag-key-union`, `XLOC1-retry-throttle`, `XLOC2-invite-link-validity`, `XLOC3-issue-number-allocation`, `XLOC4-session-lifetime`, `XLOC6-menu-entry-visibility`, `XREF2-emit-callers`, `XREF3-isenabled-callers`, `XREF4-comment-created-subscribers`, `XREF5-rate-limit-importers`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| all-in | 33 | **200,484** (132,877–677,570) | 199,499 | 0.081 | 14.0 | 0 in 0 run(s) | 217 | 191 | 30 | 99 | 0 | 100.0% (33/33) | 518,808 |
| baseline | 33 | **272,936** (203,616–574,157) | 153,321 | 0.208 | 5.0 | 18 in 18 run(s) | 56 | 0 | 0 | 76 | 0 | 100.0% (33/33) | 409,385 |
| baseline-nosub | 33 | **242,490** (132,435–385,499) | 241,480 | 0.150 | 8.0 | 0 in 0 run(s) | 145 | 0 | 0 | 184 | 0 | 100.0% (33/33) | 323,441 |
| effort-low | 33 | **190,640** (151,689–299,398) | 120,603 | 0.132 | 4.0 | 18 in 18 run(s) | 21 | 0 | 0 | 55 | 0 | 97.0% (32/33) | 245,462 |
| effort-low-nosub | 33 | **172,563** (132,879–298,817) | 171,578 | 0.105 | 7.0 | 0 in 0 run(s) | 67 | 0 | 0 | 166 | 0 | 97.0% (32/33) | 233,182 |
| effort-medium | 33 | **253,806** (218,144–424,694) | 64,930 | 0.192 | 2.0 | 23 in 23 run(s) | 16 | 0 | 0 | 54 | 0 | 97.0% (32/33) | 311,994 |
| few-turns | 33 | **165,886** (133,701–236,202) | 164,917 | 0.098 | 6.0 | 0 in 0 run(s) | 54 | 0 | 0 | 160 | 0 | 97.0% (32/33) | 232,413 |
| graphify | 33 | **308,591** (171,544–497,839) | 307,569 | 0.197 | 9.0 | 0 in 0 run(s) | 168 | 0 | 0 | 150 | 64 | 93.9% (31/33) | 440,515 |
| graphify-strict | 33 | **322,786** (207,585–568,991) | 315,167 | 0.202 | 9.0 | 1 in 1 run(s) | 122 | 0 | 0 | 170 | 65 | 93.9% (31/33) | 431,461 |
| haiku-baseline | 33 | **526,174** (159,352–861,403) | 509,446 | 0.131 | 16.0 | 2 in 1 run(s) | 223 | 0 | 0 | 277 | 0 | 93.9% (31/33) | 625,162 |
| haiku-explore | 33 | **236,927** (190,645–1,066,366) | 154,172 | 0.174 | 5.0 | 21 in 18 run(s) | 104 | 0 | 0 | 85 | 0 | 97.0% (32/33) | 704,272 |
| haiku-graphify | 33 | **384,980** (225,505–540,609) | 384,005 | 0.107 | 12.0 | 0 in 0 run(s) | 179 | 0 | 0 | 125 | 75 | 97.0% (32/33) | 502,845 |
| haiku-nosub | 33 | **438,104** (163,265–812,590) | 437,119 | 0.104 | 15.0 | 0 in 0 run(s) | 244 | 0 | 0 | 300 | 0 | 97.0% (32/33) | 654,759 |
| lean-tools | 33 | **172,528** (122,671–241,276) | 171,552 | 0.112 | 6.0 | 0 in 0 run(s) | 97 | 94 | 2 | 30 | 0 | 97.0% (32/33) | 213,239 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 33 | 109,423.4 | [-40,907.9, 295,076.4] | 33.7% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 33 | 339,253.7 | [138,952.8, 557,479.8] | 513.3% | all-in higher |
| total_cost_usd | 33 | -0.1564 | [-0.2098, -0.1084] | -52.1% | all-in lower |
| num_turns | 33 | 12.2 | [7.5, 17.6] | 547.9% | all-in higher |

## 5. By category

### explain (9 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | 305,742.8 | [20,272.1, 622,778.1] | 48.4% | all-in higher |
| uncached_equivalent | 9 | 889,354.7 | [569,766.9, 1,218,587.3] | 1040.1% | all-in higher |
| total_cost_usd | 9 | -0.2804 | [-0.3691, -0.2025] | -56.2% | all-in lower |
| num_turns | 9 | 26.6 | [19.8, 33.2] | 1098.9% | all-in higher |

### fix (9 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | -76,333.1 | [-174,078.4, 13,994.0] | -16.9% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 9 | 120,692.0 | [-10,829.6, 264,811.4] | 106.5% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 9 | -0.1649 | [-0.2639, -0.0828] | -60.9% | all-in lower |
| num_turns | 9 | 5.7 | [2.4, 9.2] | 143.0% | all-in higher |

### impact (9 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | 314,880.1 | [-66,535.1, 821,456.7] | 128.3% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 9 | 338,053.8 | [-57,882.5, 885,018.5] | 454.4% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 9 | -0.0417 | [-0.0991, 0.0214] | -34.7% | **CI crosses 0 — no detectable difference** |
| num_turns | 9 | 12.9 | [3.8, 25.0] | 408.1% | all-in higher |

### locate (9 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | -79,348.7 | [-120,446.0, -38,978.3] | -37.2% | all-in lower |
| uncached_equivalent | 9 | 19,333.3 | [-11,559.4, 54,662.1] | 31.3% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 9 | -0.0901 | [-0.1197, -0.0599] | -59.6% | all-in lower |
| num_turns | 9 | 4.6 | [3.0, 6.2] | 164.1% | all-in higher |

### reference (9 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | 1,851.1 | [-194,062.7, 213,932.8] | 34.1% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 9 | 45,544.1 | [-198,954.1, 295,479.2] | 395.5% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 9 | -0.1225 | [-0.2035, -0.0542] | -47.6% | all-in lower |
| num_turns | 9 | 5.9 | [-0.8, 12.3] | 465.1% | **CI crosses 0 — no detectable difference** |

## 6. Answer quality by category

Section 5 reports what each category *cost*. This one reports whether it was *answered*: each cell is `successes/graded · mean grader score`. The two are not interchangeable — an arm that gives up early looks cheap in section 5 and is exposed here.

| condition | **explain** | **fix** | **impact** | **locate** | **reference** |
|---|---|---|---|---|---|
| `all-in` | 8/9 · 0.844 | 8/9 · 0.889 | 5/9 · 0.888 | 6/9 · 0.852 | 7/9 · 0.931 |
| `baseline` | 9/9 · 0.956 | 8/9 · 0.889 | 4/9 · 0.878 | 8/9 · 0.944 | 9/9 · 0.978 |
| `baseline-nosub` | 9/9 · 0.978 | 9/9 · 1.000 | 4/9 · 0.897 | 7/9 · 0.889 | 9/9 · 0.978 |
| `effort-low` | 9/9 · 0.956 | 8/9 · 0.889 | 4/9 · 0.878 | 6/9 · 0.852 | 9/9 · 0.987 |
| `effort-low-nosub` | 9/9 · 0.911 | 9/9 · 1.000 | 4/9 · 0.878 | 7/9 · 0.889 | 9/9 · 0.986 |
| `effort-medium` | 9/9 · 0.933 | 8/9 · 0.889 | 4/9 · 0.888 | 6/9 · 0.822 | 9/9 · 0.983 |
| `few-turns` | 9/9 · 0.933 | 9/9 · 1.000 | 4/9 · 0.870 | 7/9 · 0.889 | 9/9 · 0.986 |
| `graphify` | 9/9 · 0.978 | 7/9 · 0.778 | 4/9 · 0.888 | 6/9 · 0.833 | 9/9 · 0.978 |
| `graphify-strict` | 9/9 · 0.956 | 7/9 · 0.778 | 4/9 · 0.897 | 7/9 · 0.889 | 8/9 · 0.973 |
| `haiku-baseline` | 9/9 · 0.800 | 8/9 · 0.889 | 4/9 · 0.906 | 7/9 · 0.833 | 8/9 · 0.973 |
| `haiku-explore` | 8/9 · 0.822 | 8/9 · 0.889 | 4/9 · 0.878 | 7/9 · 0.889 | 9/9 · 0.987 |
| `haiku-graphify` | 9/9 · 0.933 | 8/9 · 0.889 | 5/9 · 0.898 | 6/9 · 0.852 | 9/9 · 0.974 |
| `haiku-nosub` | 9/9 · 0.844 | 8/9 · 0.889 | 3/9 · 0.869 | 8/9 · 0.889 | 9/9 · 0.988 |
| `lean-tools` | 9/9 · 0.956 | 7/9 · 0.778 | 4/9 · 0.873 | 8/9 · 0.944 | 9/9 · 0.986 |

## 7. Structural comparisons

Each block below is an independent paired comparison between two arms, computed with the same machinery as §3: per-task pairing over the same task set, percentile bootstrap over tasks, an iso-accuracy subset scoped to just those two arms, and a per-category breakdown. Arms that are not part of a block are excluded from it entirely.

### `lean-tools` vs `effort-low-nosub`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low-nosub | 45 | **142,566** (130,778–229,806) | 141,561 | 0.098 | 6.0 | 0 in 0 run(s) | 82 | 0 | 0 | 206 | 0 | 84.4% (38/45) | 223,500 |
| lean-tools | 45 | **151,221** (113,229–214,866) | 150,241 | 0.093 | 6.0 | 0 in 0 run(s) | 119 | 118 | 2 | 36 | 0 | 82.2% (37/45) | 207,408 |

Paired difference (`lean-tools` − `effort-low-nosub`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | -12,195.7 | [-43,208.0, 14,267.4] | -0.6% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 45 | -12,195.7 | [-41,946.1, 13,924.8] | -0.6% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 45 | -0.0048 | [-0.0149, 0.0055] | -1.7% | **CI crosses 0 — no detectable difference** |
| num_turns | 45 | -0.3 | [-1.1, 0.5] | -2.6% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (36/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 36 | -11,385.9 | [-47,699.1, 20,056.7] | 1.2% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 36 | -11,385.9 | [-46,848.4, 20,630.3] | 1.3% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 36 | -0.0022 | [-0.0137, 0.0099] | 1.3% | **CI crosses 0 — no detectable difference** |
| num_turns | 36 | -0.3 | [-1.3, 0.7] | -2.7% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | 23,191.1 | [-56,496.7, 96,763.0] | 14.3% | **CI crosses 0 — no detectable difference** |
| fix | 9 | -88,022.7 | [-196,199.8, -10,491.7] | -19.3% | lean-tools lower |
| impact | 9 | -5,272.2 | [-24,580.2, 16,179.4] | -4.6% | **CI crosses 0 — no detectable difference** |
| locate | 9 | -659.8 | [-23,338.7, 26,735.1] | 1.3% | **CI crosses 0 — no detectable difference** |
| reference | 9 | 9,785.1 | [-18,605.8, 40,593.3] | 5.2% | **CI crosses 0 — no detectable difference** |

**Verdict.** `lean-tools` vs `effort-low-nosub` over 45 paired tasks: tokens no detectable difference; cost no detectable difference; turns no detectable difference; accuracy 82.2% vs 84.4% (37/45 vs 38/45).

### `few-turns` vs `effort-low-nosub`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low-nosub | 45 | **142,566** (130,778–229,806) | 141,561 | 0.098 | 6.0 | 0 in 0 run(s) | 82 | 0 | 0 | 206 | 0 | 84.4% (38/45) | 223,500 |
| few-turns | 45 | **159,886** (107,345–216,071) | 158,929 | 0.094 | 6.0 | 0 in 0 run(s) | 62 | 0 | 0 | 201 | 0 | 84.4% (38/45) | 218,629 |

Paired difference (`few-turns` − `effort-low-nosub`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | -839.9 | [-27,439.9, 26,821.8] | 0.3% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 45 | -839.9 | [-27,490.9, 26,687.4] | 0.3% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 45 | -0.0067 | [-0.0189, 0.0045] | -5.2% | **CI crosses 0 — no detectable difference** |
| num_turns | 45 | -0.5 | [-1.4, 0.3] | -2.6% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (38/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 38 | -4,871.5 | [-34,015.0, 25,515.7] | -2.2% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 38 | -4,871.5 | [-35,854.0, 26,777.9] | -2.2% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 38 | -0.0078 | [-0.0213, 0.0054] | -5.0% | **CI crosses 0 — no detectable difference** |
| num_turns | 38 | -0.7 | [-1.6, 0.2] | -5.1% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | -4,031.4 | [-81,751.4, 71,677.0] | -3.1% | **CI crosses 0 — no detectable difference** |
| fix | 9 | 11,182.2 | [-81,786.2, 116,689.0] | 10.7% | **CI crosses 0 — no detectable difference** |
| impact | 9 | 14,168.3 | [-16,362.5, 52,250.6] | 9.6% | **CI crosses 0 — no detectable difference** |
| locate | 9 | -8,535.0 | [-23,450.7, 3,764.9] | -6.4% | **CI crosses 0 — no detectable difference** |
| reference | 9 | -16,983.8 | [-33,606.5, -853.3] | -9.1% | few-turns lower |

**Verdict.** `few-turns` vs `effort-low-nosub` over 45 paired tasks: tokens no detectable difference; cost no detectable difference; turns no detectable difference; accuracy 84.4% vs 84.4% (38/45 vs 38/45).

### `haiku-nosub` vs `effort-low-nosub`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low-nosub | 45 | **142,566** (130,778–229,806) | 141,561 | 0.098 | 6.0 | 0 in 0 run(s) | 82 | 0 | 0 | 206 | 0 | 84.4% (38/45) | 223,500 |
| haiku-nosub | 45 | **308,582** (163,265–722,699) | 307,596 | 0.096 | 13.0 | 0 in 0 run(s) | 308 | 0 | 0 | 373 | 0 | 82.2% (37/45) | 626,843 |

Paired difference (`haiku-nosub` − `effort-low-nosub`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | 366,345.6 | [224,416.4, 534,343.2] | 177.4% | haiku-nosub higher |
| uncached_equivalent | 45 | 366,345.6 | [220,237.3, 535,949.4] | 178.5% | haiku-nosub higher |
| total_cost_usd | 45 | 0.0027 | [-0.0153, 0.0208] | -0.3% | **CI crosses 0 — no detectable difference** |
| num_turns | 45 | 8.8 | [5.9, 11.9] | 128.9% | haiku-nosub higher |

Iso-accuracy subset (35/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 35 | 422,782.1 | [247,438.3, 618,210.9] | 186.8% | haiku-nosub higher |
| uncached_equivalent | 35 | 422,782.1 | [245,029.7, 626,750.3] | 187.8% | haiku-nosub higher |
| total_cost_usd | 35 | 0.0042 | [-0.0166, 0.0274] | 1.6% | **CI crosses 0 — no detectable difference** |
| num_turns | 35 | 9.6 | [6.6, 13.3] | 125.9% | haiku-nosub higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | 955,382.9 | [560,546.0, 1,369,442.5] | 275.2% | haiku-nosub higher |
| fix | 9 | 115,471.7 | [9,253.4, 221,685.0] | 64.9% | haiku-nosub higher |
| impact | 9 | 525,572.6 | [136,930.1, 978,018.6] | 413.0% | haiku-nosub higher |
| locate | 9 | 13,804.8 | [-12,400.4, 43,602.0] | 12.0% | **CI crosses 0 — no detectable difference** |
| reference | 9 | 221,496.2 | [140,327.1, 296,763.4] | 121.8% | haiku-nosub higher |

**Verdict.** `haiku-nosub` vs `effort-low-nosub` over 45 paired tasks: tokens higher by 366,346 (95% CI [224,416, 534,343]); cost no detectable difference; turns higher by 8.8 (95% CI [5.9, 11.9]); accuracy 82.2% vs 84.4% (37/45 vs 38/45).

### `haiku-nosub` vs `haiku-baseline`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| haiku-baseline | 45 | **502,978** (159,352–754,040) | 498,061 | 0.121 | 15.0 | 2 in 1 run(s) | 278 | 0 | 0 | 350 | 0 | 80.0% (36/45) | 621,126 |
| haiku-nosub | 45 | **308,582** (163,265–722,699) | 307,596 | 0.096 | 13.0 | 0 in 0 run(s) | 308 | 0 | 0 | 373 | 0 | 82.2% (37/45) | 626,843 |

Paired difference (`haiku-nosub` − `haiku-baseline`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | 4,281.4 | [-98,851.1, 116,966.0] | 3.8% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 45 | 17,708.4 | [-94,392.4, 130,498.5] | 43.3% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 45 | -0.0063 | [-0.0255, 0.0116] | 0.4% | **CI crosses 0 — no detectable difference** |
| num_turns | 45 | 1.2 | [-1.0, 3.4] | 39.3% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (34/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 34 | -4,232.9 | [-132,588.3, 117,443.2] | 0.5% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 34 | 13,538.1 | [-119,348.0, 145,279.0] | 52.8% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 34 | -0.0061 | [-0.0302, 0.0150] | 1.9% | **CI crosses 0 — no detectable difference** |
| num_turns | 34 | 1.4 | [-1.2, 4.0] | 50.3% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | 84,240.2 | [-304,531.5, 464,336.6] | 8.2% | **CI crosses 0 — no detectable difference** |
| fix | 9 | -82,604.0 | [-308,088.3, 67,700.3] | 1.6% | **CI crosses 0 — no detectable difference** |
| impact | 9 | 137,616.7 | [-131,192.6, 437,605.0] | 28.3% | **CI crosses 0 — no detectable difference** |
| locate | 9 | -12,123.3 | [-50,283.6, 26,162.7] | 1.4% | **CI crosses 0 — no detectable difference** |
| reference | 9 | -105,722.4 | [-182,957.4, -28,722.0] | -20.6% | haiku-nosub lower |

**Verdict.** `haiku-nosub` vs `haiku-baseline` over 45 paired tasks: tokens no detectable difference; cost no detectable difference; turns no detectable difference; accuracy 82.2% vs 80.0% (37/45 vs 36/45).

### `all-in` vs `effort-low-nosub`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| effort-low-nosub | 45 | **142,566** (130,778–229,806) | 141,561 | 0.098 | 6.0 | 0 in 0 run(s) | 82 | 0 | 0 | 206 | 0 | 84.4% (38/45) | 223,500 |
| all-in | 45 | **200,484** (122,579–646,876) | 199,499 | 0.081 | 13.0 | 0 in 0 run(s) | 265 | 265 | 40 | 110 | 0 | 75.6% (34/45) | 534,053 |

Paired difference (`all-in` − `effort-low-nosub`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | 252,769.3 | [125,822.8, 399,757.3] | 122.6% | all-in higher |
| uncached_equivalent | 45 | 252,769.3 | [128,647.0, 398,853.4] | 123.4% | all-in higher |
| total_cost_usd | 45 | -0.0155 | [-0.0346, 0.0066] | -14.2% | **CI crosses 0 — no detectable difference** |
| num_turns | 45 | 8.8 | [6.0, 11.9] | 135.2% | all-in higher |

Iso-accuracy subset (32/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 32 | 297,107.3 | [131,722.8, 510,964.5] | 131.1% | all-in higher |
| uncached_equivalent | 32 | 297,107.3 | [130,884.4, 482,542.6] | 131.8% | all-in higher |
| total_cost_usd | 32 | -0.0173 | [-0.0428, 0.0131] | -13.7% | **CI crosses 0 — no detectable difference** |
| num_turns | 32 | 9.4 | [5.7, 13.6] | 129.5% | all-in higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | 650,238.8 | [379,181.6, 960,428.3] | 181.3% | all-in higher |
| fix | 9 | 35,920.2 | [-68,389.4, 154,998.6] | 28.7% | **CI crosses 0 — no detectable difference** |
| impact | 9 | 410,963.4 | [46,376.7, 961,884.4] | 299.6% | all-in higher |
| locate | 9 | -515.2 | [-23,707.4, 23,982.6] | -1.9% | **CI crosses 0 — no detectable difference** |
| reference | 9 | 167,239.1 | [22,337.3, 329,715.3] | 105.5% | all-in higher |

**Verdict.** `all-in` vs `effort-low-nosub` over 45 paired tasks: tokens higher by 252,769 (95% CI [125,823, 399,757]); cost no detectable difference; turns higher by 8.8 (95% CI [6.0, 11.9]); accuracy 75.6% vs 84.4% (34/45 vs 38/45).

### `all-in` vs `haiku-nosub`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| haiku-nosub | 45 | **308,582** (163,265–722,699) | 307,596 | 0.096 | 13.0 | 0 in 0 run(s) | 308 | 0 | 0 | 373 | 0 | 82.2% (37/45) | 626,843 |
| all-in | 45 | **200,484** (122,579–646,876) | 199,499 | 0.081 | 13.0 | 0 in 0 run(s) | 265 | 265 | 40 | 110 | 0 | 75.6% (34/45) | 534,053 |

Paired difference (`all-in` − `haiku-nosub`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | -113,576.4 | [-210,422.1, -24,615.7] | -9.6% | all-in lower |
| uncached_equivalent | 45 | -113,576.4 | [-207,468.2, -29,047.1] | -9.6% | all-in lower |
| total_cost_usd | 45 | -0.0182 | [-0.0364, -0.0025] | -7.3% | all-in lower |
| num_turns | 45 | -0.0 | [-2.1, 2.0] | 14.2% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (32/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 32 | -125,763.6 | [-262,004.9, -11,376.6] | -8.6% | all-in lower |
| uncached_equivalent | 32 | -125,763.6 | [-254,407.6, -11,619.2] | -8.6% | all-in lower |
| total_cost_usd | 32 | -0.0208 | [-0.0440, 0.0007] | -11.1% | **CI crosses 0 — no detectable difference** |
| num_turns | 32 | -0.6 | [-3.1, 1.8] | 9.0% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | -305,144.1 | [-619,358.4, -55,946.8] | -20.0% | all-in lower |
| fix | 9 | -79,551.4 | [-214,524.3, 88,083.4] | -0.6% | **CI crosses 0 — no detectable difference** |
| impact | 9 | -114,609.1 | [-387,728.6, 74,344.2] | -11.1% | **CI crosses 0 — no detectable difference** |
| locate | 9 | -14,320.0 | [-37,885.8, 8,429.2] | -8.1% | **CI crosses 0 — no detectable difference** |
| reference | 9 | -54,257.1 | [-210,249.2, 104,379.8] | -7.9% | **CI crosses 0 — no detectable difference** |

**Verdict.** `all-in` vs `haiku-nosub` over 45 paired tasks: tokens lower by 113,576 (95% CI [-210,422, -24,616]); cost lower by 0.0182 (95% CI [-0.0364, -0.0025]); turns no detectable difference; accuracy 75.6% vs 82.2% (34/45 vs 37/45).

### `all-in` vs `baseline`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 45 | **260,561** (203,616–428,937) | 144,597 | 0.197 | 5.0 | 23 in 23 run(s) | 68 | 0 | 0 | 106 | 0 | 84.4% (38/45) | 393,482 |
| all-in | 45 | **200,484** (122,579–646,876) | 199,499 | 0.081 | 13.0 | 0 in 0 run(s) | 265 | 265 | 40 | 110 | 0 | 75.6% (34/45) | 534,053 |

Paired difference (`all-in` − `baseline`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | 93,358.4 | [-29,456.8, 226,492.7] | 31.3% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 45 | 282,595.6 | [131,911.7, 450,313.9] | 405.6% | all-in higher |
| total_cost_usd | 45 | -0.1399 | [-0.1803, -0.1023] | -51.8% | all-in lower |
| num_turns | 45 | 11.1 | [7.3, 15.3] | 455.9% | all-in higher |

Iso-accuracy subset (33/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 33 | 109,423.4 | [-37,558.1, 285,250.9] | 33.7% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 33 | 339,253.7 | [137,919.9, 572,533.6] | 513.3% | all-in higher |
| total_cost_usd | 33 | -0.1564 | [-0.2057, -0.1061] | -52.1% | all-in lower |
| num_turns | 33 | 12.2 | [7.7, 17.4] | 547.9% | all-in higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | 305,742.8 | [39,296.6, 615,032.4] | 48.4% | all-in higher |
| fix | 9 | -76,333.1 | [-177,082.6, 9,559.8] | -16.9% | **CI crosses 0 — no detectable difference** |
| impact | 9 | 314,880.1 | [-51,243.9, 858,037.2] | 128.3% | **CI crosses 0 — no detectable difference** |
| locate | 9 | -79,348.7 | [-118,253.7, -38,769.9] | -37.2% | all-in lower |
| reference | 9 | 1,851.1 | [-214,990.2, 222,330.4] | 34.1% | **CI crosses 0 — no detectable difference** |

**Verdict.** `all-in` vs `baseline` over 45 paired tasks: tokens no detectable difference; cost lower by 0.1399 (95% CI [-0.1803, -0.1023]); turns higher by 11.1 (95% CI [7.3, 15.3]); accuracy 75.6% vs 84.4% (34/45 vs 38/45).

### Accuracy by model strength

The token comparisons above are only meaningful alongside accuracy: an arm that answers fewer tasks correctly can always look cheaper. This table puts every arm's accuracy side by side so a Haiku-vs-Sonnet reading is not mistaken for an efficiency result.

| condition | graded | successes | accuracy |
|---|---|---|---|
| `all-in` | 45 | 34 | 75.6% |
| `baseline` | 45 | 38 | 84.4% |
| `baseline-nosub` | 45 | 38 | 84.4% |
| `effort-low` | 45 | 36 | 80.0% |
| `effort-low-nosub` | 45 | 38 | 84.4% |
| `effort-medium` | 45 | 36 | 80.0% |
| `few-turns` | 45 | 38 | 84.4% |
| `graphify` | 45 | 35 | 77.8% |
| `graphify-strict` | 45 | 35 | 77.8% |
| `haiku-baseline` | 45 | 36 | 80.0% |
| `haiku-explore` | 45 | 36 | 80.0% |
| `haiku-graphify` | 45 | 37 | 82.2% |
| `haiku-nosub` | 45 | 37 | 82.2% |
| `lean-tools` | 45 | 37 | 82.2% |

## 8. Features never exercised

graphify exposes more than `query`. The table counts, per arm, how many times each subcommand was invoked across all runs (and, in parentheses, how many runs used it at least once). A zero column is the point: it means the benchmark never put that feature under measurement, so nothing here — positive or negative — can be read as evidence about it.

| condition | runs | `query` | `explain` | `path` | `god-nodes` | `affected` | `save-result` | `reflect` | `update` | `benchmark` |
|---|---|---|---|---|---|---|---|---|---|---|
| `all-in` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `baseline` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `baseline-nosub` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `effort-low` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `effort-low-nosub` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `effort-medium` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `few-turns` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `graphify` | 45 | 63 (45) | 16 (8) | 4 (3) | **0** | **0** | **0** | **0** | **0** | **0** |
| `graphify-strict` | 45 | 61 (45) | 18 (12) | 3 (2) | **0** | **0** | **0** | **0** | 2 (2) | **0** |
| `haiku-baseline` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `haiku-explore` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `haiku-graphify` | 45 | 77 (43) | 15 (10) | 7 (7) | **0** | **0** | **0** | **0** | **0** | **0** |
| `haiku-nosub` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `lean-tools` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |

| condition | runs reading `graph.json` directly | runs that never invoked the CLI (nudge ignored) | strict denials: total (median/run) |
|---|---|---|---|
| `all-in` | 0 | n/a (no graph) | 0 (0) |
| `baseline` | 0 | n/a (no graph) | 0 (0) |
| `baseline-nosub` | 0 | n/a (no graph) | 0 (0) |
| `effort-low` | 0 | n/a (no graph) | 0 (0) |
| `effort-low-nosub` | 0 | n/a (no graph) | 0 (0) |
| `effort-medium` | 0 | n/a (no graph) | 0 (0) |
| `few-turns` | 0 | n/a (no graph) | 0 (0) |
| `graphify` | 4 | 0 | 0 (0) |
| `graphify-strict` | 7 | 0 | 0 (0) |
| `haiku-baseline` | 0 | n/a (no graph) | 0 (0) |
| `haiku-explore` | 0 | n/a (no graph) | 0 (0) |
| `haiku-graphify` | 2 | 2 | 0 (0) |
| `haiku-nosub` | 0 | n/a (no graph) | 0 (0) |
| `lean-tools` | 0 | n/a (no graph) | 0 (0) |

> **The strict block never fired.** Across 45 `graphify-strict` runs the hook denied **zero** reads, confirmed three ways: no `permissionDecision` in any transcript, no deny text, and `permission_denials` = 0 in every `result.json`. The cause is in graphify's own guard (`cli.py::_query_stamp_fresh`): strict suppresses its block while a query/explain/path ran within the last 30 minutes, and the overlay's `CLAUDE.md` already steers the agent to `graphify query` **before** its first raw `Read`. The soft nudge wins the race every time, so the strict flag is inert under this overlay — `graphify-strict` vs `graphify` is therefore a null result about a knob that never engaged, **not** evidence that forcing graph-first exploration does nothing.

> **Cross-session memory was never measured.** `save-result`, `reflect` and `affected` are the mechanisms by which graphify is supposed to compound across sessions, and they were invoked **zero times in every arm**. Each benchmark run is a fresh corpus copy with a fresh session, so there is no second session for a saved result to pay off in — the design that would exercise them is a different experiment, not a variation of this one. The honest statement is that this benchmark measures single-session retrieval only.

## 9. Speed

> **Secondary, and noisy.** Every run in every set was measured at **concurrency 3** on a single machine, so session wall-clock includes contention this harness never controlled for and cannot quantify. Tokens and cost are properties of the measurement; durations are not. Read the session rows as an order of magnitude only.

Session timings, median (IQR) in ms:

| condition | runs | wall `duration_ms` | API `duration_api_ms` | `ttft_ms` | pre-request `time_to_request_ms` |
|---|---|---|---|---|---|
| `all-in` | 45 | 43,873 (25,656–73,241) | 43,852 (24,967–73,325) | 2,359 (2,120–2,533) | 16 (14–19) |
| `baseline` | 45 | 29,471 (13,626–50,625) | 51,095 (30,066–103,242) | 1,975 (1,579–2,650) | 18 (6–20) |
| `baseline-nosub` | 45 | 33,485 (15,536–58,606) | 34,165 (16,084–59,353) | 1,680 (1,543–2,704) | 18 (16–21) |
| `effort-low` | 45 | 16,220 (10,622–22,799) | 29,324 (17,457–69,160) | 2,129 (1,592–3,076) | 16 (5–18) |
| `effort-low-nosub` | 45 | 15,654 (11,997–38,715) | 15,824 (12,906–39,308) | 1,875 (1,575–2,405) | 17 (16–20) |
| `effort-medium` | 45 | 15,734 (7,328–22,575) | 49,319 (24,423–80,047) | 1,954 (1,490–2,532) | 8 (5–17) |
| `few-turns` | 45 | 17,124 (11,132–32,901) | 17,986 (11,939–33,591) | 2,273 (1,840–2,609) | 17 (15–19) |
| `graphify` | 45 | 38,594 (22,199–81,513) | 38,327 (22,605–81,287) | 1,901 (1,519–2,463) | 19 (17–21) |
| `graphify-strict` | 45 | 44,277 (26,523–83,351) | 48,706 (26,186–85,475) | 2,174 (1,689–3,123) | 18 (17–20) |
| `haiku-baseline` | 45 | 52,386 (26,385–86,854) | 52,898 (27,535–88,069) | 2,391 (2,179–2,853) | 18 (16–21) |
| `haiku-explore` | 45 | 19,576 (10,260–52,302) | 60,756 (20,200–148,026) | 2,399 (1,586–3,279) | 16 (6–17) |
| `haiku-graphify` | 45 | 47,313 (29,100–70,958) | 46,333 (28,965–70,428) | 2,578 (2,306–2,848) | 18 (16–20) |
| `haiku-nosub` | 45 | 55,333 (22,100–94,027) | 52,856 (22,777–94,441) | 2,227 (2,026–2,513) | 16 (15–19) |
| `lean-tools` | 45 | 18,120 (13,482–34,903) | 16,987 (12,352–34,620) | 1,884 (1,584–2,326) | 17 (16–19) |

`time_to_request_ms` covers everything before the first API request, which is where **MCP server startup lands**: it is the only column in which an arm that must spawn and handshake with a server can differ from one that does not. The transcript itself cannot show that cost — Claude Code connects its configured servers *before* writing the first transcript entry, so the delay between the first entry and the one advertising the server's tools collapses to a few milliseconds of bookkeeping rather than measuring the spawn.

Per-tool-call latency, median (IQR) in ms, pooled over calls:

| condition | `Bash(graphify)` | `Read` | `Grep` | `Glob` | `Bash` | `Agent` |
|---|---|---|---|---|---|---|
| `all-in` | – | 5 (3–7) | 83 (15–514) | 162 (138–247) | 38 (24–97) | – |
| `baseline` | – | 7 (5–11) | – | – | 50 (34–102) | 16 (11–63,506) |
| `baseline-nosub` | – | 5 (4–6) | – | – | 45 (31–113) | – |
| `effort-low` | – | 5 (4–7) | – | – | 54 (38–179) | 10 (6–7,182) |
| `effort-low-nosub` | – | 5 (3–8) | – | – | 44 (30–160) | – |
| `effort-medium` | – | 7 (5–8) | – | – | 54 (35–190) | 9 (7–11) |
| `few-turns` | – | 6 (4–8) | – | – | 41 (31–132) | – |
| `graphify` | 294 (282–307) | 64 (59–70) | – | – | 90 (80–208) | – |
| `graphify-strict` | 300 (281–329) | 62 (55–66) | – | – | 95 (78–201) | 11 (11–11) |
| `haiku-baseline` | – | 5 (4–6) | – | – | 43 (32–121) | 5 (5–6) |
| `haiku-explore` | – | 5 (4–6) | – | – | 46 (32–119) | 9 (7–12) |
| `haiku-graphify` | 301 (286–328) | 59 (54–66) | – | – | 121 (88–269) | – |
| `haiku-nosub` | – | 5 (3–7) | – | – | 39 (28–137) | – |
| `lean-tools` | – | 5 (4–8) | 236 (16–1,203) | 131 (127–136) | 39 (26–91) | – |

Each cell is timed from the transcript entry carrying the `tool_use` block to the entry carrying its matching `tool_result`, both written locally by the same process. Calls whose result never arrived — a run that hit its turn cap mid-call — are absent rather than counted as zero. `n` per cell is the number of calls, not the number of runs, so an arm that called a tool once contributes one observation.

**Index build cost, for scale.** graphify v1: **4.6 s** total (`update` 3.4 s + `cluster-only` 1.2 s, AST-only, no API calls). graphify v2: a comparable AST pass plus roughly **35 min** of LLM-backed document extraction. MemPalace v1: **49 s**; v2: **97 s** (embedding + indexing, `--no-llm`, no API calls). All are one-off costs paid before any run, and none is included in any figure above — they are listed only so a per-query latency can be read against what producing the index cost in the first place.

## 10. Thinking tokens and model mix

Thinking tokens are billed as output and are a **subset** of `output_tokens`, not an addition to it, so the share is the honest reading of an effort change: an arm that merely wrote less prose would move the absolute count without touching the lever. The figure is main-session only — `usage.output_tokens_details` does not see a subagent — so an arm that delegates reports the *parent's* thinking, and its explorer's thinking appears only as tokens against that explorer's model in the second table.

| condition | runs | thinking tokens | main-session output | thinking share |
|---|---|---|---|---|
| `all-in` | 45 | 101,023 | 213,796 | 47.3% |
| `baseline` | 45 | 38,707 | 104,667 | 37.0% |
| `baseline-nosub` | 45 | 57,807 | 149,406 | 38.7% |
| `effort-low` | 45 | 8,153 | 51,571 | 15.8% |
| `effort-low-nosub` | 45 | 20,251 | 86,633 | 23.4% |
| `effort-medium` | 45 | 10,292 | 51,167 | 20.1% |
| `few-turns` | 45 | 14,548 | 78,736 | 18.5% |
| `graphify` | 45 | 105,595 | 209,848 | 50.3% |
| `graphify-strict` | 45 | 91,664 | 184,741 | 49.6% |
| `haiku-baseline` | 45 | 98,358 | 209,727 | 46.9% |
| `haiku-explore` | 45 | 40,226 | 105,524 | 38.1% |
| `haiku-graphify` | 45 | 88,517 | 183,175 | 48.3% |
| `haiku-nosub` | 45 | 95,395 | 219,662 | 43.4% |
| `lean-tools` | 45 | 13,951 | 80,735 | 17.3% |

**Which model spent the tokens.** Summed from `modelUsage` over every run of the arm, on the same definition as `uncached_equivalent_all` (input + cache read + cache creation), so the row totals reconcile with the headline volume rather than describing some adjacent quantity. Note that a ~1k-token Haiku entry appears in **every** arm, including plain `baseline`: that is Claude Code's own background helper call, not delegated exploration. Only an arm whose Haiku row is orders of magnitude larger than that has actually moved work onto Haiku.

That helper's size is a deterministic function of the task prompt, so every Sonnet arm running the same task set reports the **identical** Haiku total. Rows agreeing to the token are therefore the expected result here, not a copy-paste fault — and they are what makes the figure usable as a baseline to read a genuinely delegating arm against.

| condition | `claude-haiku-4-5` tokens | `claude-sonnet-5` tokens | `claude-haiku-4-5` cost | `claude-sonnet-5` cost |
|---|---|---|---|---|
| `all-in` | 20,597,079 | 0 | $5.02 | $0.00 |
| `baseline` | 44,766 | 16,351,183 | $0.05 | $11.27 |
| `baseline-nosub` | 44,766 | 12,959,103 | $0.05 | $8.01 |
| `effort-low` | 44,766 | 10,350,967 | $0.05 | $7.36 |
| `effort-low-nosub` | 44,766 | 9,177,696 | $0.05 | $5.67 |
| `effort-medium` | 44,766 | 12,707,212 | $0.05 | $9.06 |
| `few-turns` | 44,766 | 9,139,899 | $0.05 | $5.37 |
| `graphify` | 44,766 | 17,795,561 | $0.05 | $10.99 |
| `graphify-strict` | 44,766 | 17,243,098 | $0.05 | $10.65 |
| `haiku-baseline` | 25,515,351 | 0 | $6.13 | $0.00 |
| `haiku-explore` | 15,458,608 | 13,081,022 | $3.39 | $8.78 |
| `haiku-graphify` | 20,145,152 | 0 | $5.39 | $0.00 |
| `haiku-nosub` | 25,708,015 | 0 | $5.84 | $0.00 |
| `lean-tools` | 44,766 | 8,628,890 | $0.05 | $5.46 |

## 11. Where the remaining tokens go

`uncached_all` is one number; this section splits it in two, because at this end of the range the remaining question is no longer *how much* an arm spends but *on what*. **fixed = `first_turn_cache_creation` × `num_turns`** — the system prompt and tool definitions, re-sent on every single turn — and **moving = `uncached_all` − fixed**, which is the file contents, tool results and reasoning that are actually about the task. Both are per-run medians, so the two columns need not sum to the `uncached_all` median exactly.

Caveats that bound the reading: `first_turn_cache_creation` and `num_turns` are main-session only while `uncached_all` counts subagents too, so on a delegating arm `fixed` is an under-estimate (the arms below spawn none). And cache reads bill at a tenth of fresh input, so this is a split of **information volume, not of dollars** — a 60% fixed share does not mean 60% of the bill.

| condition | runs | uncached_all (med) | turns (med) | first-turn fixed | fixed = ft×turns (med) | moving (med) | fixed share |
|---|---|---|---|---|---|---|---|
| `all-in` | 45 | 200,484 | 13 | 5,680 | 73,671 | 133,723 | 27.0% |
| `baseline` | 45 | 260,561 | 5 | 10,357 | 49,825 | 223,347 | 16.8% |
| `baseline-nosub` | 45 | 230,081 | 8 | 9,510 | 76,064 | 151,501 | 33.3% |
| `effort-low` | 45 | 189,614 | 4 | 10,363 | 41,392 | 150,426 | 24.5% |
| `effort-low-nosub` | 45 | 142,566 | 6 | 9,515 | 57,000 | 93,247 | 35.3% |
| `effort-medium` | 45 | 238,378 | 2 | 10,360 | 20,836 | 224,300 | 9.3% |
| `few-turns` | 45 | 159,886 | 6 | 9,871 | 59,052 | 100,783 | 36.2% |
| `graphify` | 45 | 288,502 | 9 | 10,943 | 98,487 | 176,627 | 32.2% |
| `graphify-strict` | 45 | 288,533 | 8 | 10,935 | 87,344 | 201,189 | 31.7% |
| `haiku-baseline` | 45 | 502,978 | 15 | 8,014 | 119,955 | 382,843 | 24.6% |
| `haiku-explore` | 45 | 243,863 | 5 | 10,242 | 51,185 | 202,971 | 16.8% |
| `haiku-graphify` | 45 | 327,185 | 10 | 8,438 | 84,410 | 242,875 | 26.6% |
| `haiku-nosub` | 45 | 308,582 | 13 | 7,417 | 81,642 | 226,940 | 26.5% |
| `lean-tools` | 45 | 151,221 | 6 | 6,668 | 39,828 | 108,568 | 23.7% |

## 12. Counter-productive cases and subagent use

- `all-in`: **0** subagent(s) spawned across **0**/45 run(s). T2S all-model 534,053 vs main-session-only 533,057.
- `baseline`: **23** subagent(s) spawned across **23**/45 run(s). T2S all-model 393,482 vs main-session-only 175,246.
- `baseline-nosub`: **0** subagent(s) spawned across **0**/45 run(s). T2S all-model 311,808 vs main-session-only 310,813.
- `effort-low`: **23** subagent(s) spawned across **23**/45 run(s). T2S all-model 244,318 vs main-session-only 123,838.
- `effort-low-nosub`: **0** subagent(s) spawned across **0**/45 run(s). T2S all-model 223,500 vs main-session-only 222,505.
- `effort-medium`: **29** subagent(s) spawned across **29**/45 run(s). T2S all-model 307,709 vs main-session-only 103,201.
- `few-turns`: **0** subagent(s) spawned across **0**/45 run(s). T2S all-model 218,629 vs main-session-only 217,634.
- `graphify`: **0** subagent(s) spawned across **0**/45 run(s). T2S all-model 429,005 vs main-session-only 428,008.
- `graphify-strict`: **1** subagent(s) spawned across **1**/45 run(s). T2S all-model 414,500 vs main-session-only 386,497.
- `haiku-baseline`: **2** subagent(s) spawned across **1**/45 run(s). T2S all-model 621,126 vs main-session-only 603,345.
- `haiku-explore`: **26** subagent(s) spawned across **23**/45 run(s). T2S all-model 687,692 vs main-session-only 177,417.
- `haiku-graphify`: **0** subagent(s) spawned across **0**/45 run(s). T2S all-model 491,331 vs main-session-only 490,335.
- `haiku-nosub`: **0** subagent(s) spawned across **0**/45 run(s). T2S all-model 626,843 vs main-session-only 625,847.
- `lean-tools`: **0** subagent(s) spawned across **0**/45 run(s). T2S all-model 207,408 vs main-session-only 206,412.
- Runs that opened `graphify-out/graph.json` directly: **13** (`EXP3-digest-pipeline__graphify__r1`, `IMP2-rename-issue-created__graphify__r1`, `XFIX2-mention-inside-code__graphify__r1`, `XREF5-rate-limit-importers__graphify__r1`, `LOC3-digest-window__graphify-strict__r1`, `REF3-issue-created-subscribers__graphify-strict__r1`, `XEXP2-invitation-lifecycle__graphify-strict__r1`, `XLOC3-issue-number-allocation__graphify-strict__r1`, `XLOC3-issue-number-allocation__haiku-graphify__r1`, `XLOC4-session-lifetime__graphify-strict__r1`, `XLOC6-menu-entry-visibility__graphify-strict__r1`, `XREF2-emit-callers__haiku-graphify__r1`, `XREF3-isenabled-callers__graphify-strict__r1`)
- graphify-condition runs that never invoked the `graphify` CLI (nudge ignored): **45** (`EXP1-issue-create-flow__all-in__r1`, `EXP2-comment-mention-notify__all-in__r1`, `EXP3-digest-pipeline__all-in__r1`, `FIX1-issue-tenant-leak__all-in__r1`, `FIX2-project-quota-off-by-one__all-in__r1`, `FIX3-board-shows-archived__all-in__r1`, `IMP1-planlimits-field__all-in__r1`, `IMP2-rename-issue-created__all-in__r1`, `IMP3-limited-resource-union__all-in__r1`, `LOC1-shortcut-match__all-in__r1`, `LOC2-webhook-plan-cap__all-in__r1`, `LOC3-digest-window__all-in__r1`, `REF1-assertcan-callers__all-in__r1`, `REF2-would-exceed-limit-callers__all-in__r1`, `REF3-issue-created-subscribers__all-in__r1`, `XEXP1-webhook-delivery__all-in__r1`, `XEXP2-invitation-lifecycle__all-in__r1`, `XEXP3-plan-change__all-in__r1`, `XEXP4-signin-to-actor__all-in__r1`, `XEXP5-search-index__all-in__r1`, `XEXP6-overdue-sweep__all-in__r1`, `XFIX1-csv-quote-escape__all-in__r1`, `XFIX2-mention-inside-code__all-in__r1`, `XFIX3-last-owner-removable__all-in__r1`, `XFIX4-advanced-search-inverted__all-in__r1`, `XFIX5-self-notification__all-in__r1`, `XFIX6-revoked-invite-accepted__all-in__r1`, `XIMP1-role-union__all-in__r1`, `XIMP2-rename-comment-created__all-in__r1`, `XIMP3-issue-status-union__all-in__r1`, `XIMP4-feature-flag-key-union__all-in__r1`, `XIMP5-plan-id-union__all-in__r1`, `XIMP6-limit-check-field__all-in__r1`, `XLOC1-retry-throttle__all-in__r1`, `XLOC2-invite-link-validity__all-in__r1`, `XLOC3-issue-number-allocation__all-in__r1`, `XLOC4-session-lifetime__all-in__r1`, `XLOC5-delivery-retry-policy__all-in__r1`, `XLOC6-menu-entry-visibility__all-in__r1`, `XREF1-assertorgscope-callers__all-in__r1`, `XREF2-emit-callers__all-in__r1`, `XREF3-isenabled-callers__all-in__r1`, `XREF4-comment-created-subscribers__all-in__r1`, `XREF5-rate-limit-importers__all-in__r1`, `XREF6-member-joined-repositories__all-in__r1`)

## 13. Failed and ungraded runs

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
| `IMP2-rename-issue-created__all-in__r1` | all-in | IMP2-rename-issue-created | false | completed |
| `IMP2-rename-issue-created__few-turns__r1` | few-turns | IMP2-rename-issue-created | false | completed |
| `IMP2-rename-issue-created__haiku-nosub__r1` | haiku-nosub | IMP2-rename-issue-created | false | completed |
| `IMP2-rename-issue-created__lean-tools__r1` | lean-tools | IMP2-rename-issue-created | false | completed |
| `IMP3-limited-resource-union__haiku-nosub__r1` | haiku-nosub | IMP3-limited-resource-union | false | completed |
| `LOC2-webhook-plan-cap__all-in__r1` | all-in | LOC2-webhook-plan-cap | false | completed |
| `LOC2-webhook-plan-cap__few-turns__r1` | few-turns | LOC2-webhook-plan-cap | false | completed |
| `LOC2-webhook-plan-cap__lean-tools__r1` | lean-tools | LOC2-webhook-plan-cap | false | completed |
| `LOC3-digest-window__all-in__r1` | all-in | LOC3-digest-window | false | completed |
| `XEXP4-signin-to-actor__all-in__r1` | all-in | XEXP4-signin-to-actor | false | completed |
| `XFIX3-last-owner-removable__lean-tools__r1` | lean-tools | XFIX3-last-owner-removable | false | completed |
| `XFIX5-self-notification__all-in__r1` | all-in | XFIX5-self-notification | false | completed |
| `XFIX5-self-notification__haiku-nosub__r1` | haiku-nosub | XFIX5-self-notification | false | completed |
| `XFIX5-self-notification__lean-tools__r1` | lean-tools | XFIX5-self-notification | false | completed |
| `XIMP1-role-union__few-turns__r1` | few-turns | XIMP1-role-union | false | completed |
| `XIMP1-role-union__haiku-nosub__r1` | haiku-nosub | XIMP1-role-union | false | completed |
| `XIMP1-role-union__lean-tools__r1` | lean-tools | XIMP1-role-union | false | completed |
| `XIMP2-rename-comment-created__all-in__r1` | all-in | XIMP2-rename-comment-created | false | completed |
| `XIMP2-rename-comment-created__few-turns__r1` | few-turns | XIMP2-rename-comment-created | false | completed |
| `XIMP2-rename-comment-created__haiku-nosub__r1` | haiku-nosub | XIMP2-rename-comment-created | false | completed |
| `XIMP2-rename-comment-created__lean-tools__r1` | lean-tools | XIMP2-rename-comment-created | false | completed |
| `XIMP5-plan-id-union__all-in__r1` | all-in | XIMP5-plan-id-union | false | completed |
| `XIMP5-plan-id-union__few-turns__r1` | few-turns | XIMP5-plan-id-union | false | completed |
| `XIMP5-plan-id-union__haiku-nosub__r1` | haiku-nosub | XIMP5-plan-id-union | false | completed |
| `XIMP5-plan-id-union__lean-tools__r1` | lean-tools | XIMP5-plan-id-union | false | completed |
| `XIMP6-limit-check-field__all-in__r1` | all-in | XIMP6-limit-check-field | false | completed |
| `XIMP6-limit-check-field__few-turns__r1` | few-turns | XIMP6-limit-check-field | false | completed |
| `XIMP6-limit-check-field__haiku-nosub__r1` | haiku-nosub | XIMP6-limit-check-field | false | completed |
| `XIMP6-limit-check-field__lean-tools__r1` | lean-tools | XIMP6-limit-check-field | false | completed |
| `XLOC4-session-lifetime__few-turns__r1` | few-turns | XLOC4-session-lifetime | false | completed |
| `XLOC5-delivery-retry-policy__all-in__r1` | all-in | XLOC5-delivery-retry-policy | false | completed |
| `XLOC5-delivery-retry-policy__haiku-nosub__r1` | haiku-nosub | XLOC5-delivery-retry-policy | false | completed |
| `XREF1-assertorgscope-callers__all-in__r1` | all-in | XREF1-assertorgscope-callers | false | completed |
| `XREF6-member-joined-repositories__all-in__r1` | all-in | XREF6-member-joined-repositories | false | completed |

## 14. Per-set breakdown (drift between measurement sets)

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

### set `lean` — 180 runs over 45 tasks

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| all-in | 45 | **200,484** (122,579–646,876) | 199,499 | 0.081 | 13.0 | 0 in 0 run(s) | 265 | 265 | 40 | 110 | 0 | 75.6% (34/45) | 534,053 |
| few-turns | 45 | **159,886** (107,345–216,071) | 158,929 | 0.094 | 6.0 | 0 in 0 run(s) | 62 | 0 | 0 | 201 | 0 | 84.4% (38/45) | 218,629 |
| haiku-nosub | 45 | **308,582** (163,265–722,699) | 307,596 | 0.096 | 13.0 | 0 in 0 run(s) | 308 | 0 | 0 | 373 | 0 | 82.2% (37/45) | 626,843 |
| lean-tools | 45 | **151,221** (113,229–214,866) | 150,241 | 0.093 | 6.0 | 0 in 0 run(s) | 119 | 118 | 2 | 36 | 0 | 82.2% (37/45) | 207,408 |

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

## 15. Deliberately-easy controls vs the rest

Some tasks were written as **designed zero-advantage controls**: their answer is reproduced exactly by a single literal `grep`, so a structural index has nothing to add and the expected effect is zero or negative. They are marked `DELIBERATELY EASY` in the task notes and are separated out here so they neither flatter nor drag the headline number. Easy tasks: `IMP2-rename-issue-created`, `LOC1-shortcut-match`, `XIMP2-rename-comment-created`, `XLOC1-retry-throttle`, `XREF5-rate-limit-importers`.

### easy (zero-advantage controls) — 70 runs over 5 tasks

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| all-in | 5 | **64,392** (41,079–67,888) | 63,414 | 0.028 | 5.0 | 0 in 0 run(s) | 3 | 8 | 4 | 0 | 0 | 60.0% (3/5) | 68,710 |
| baseline | 5 | **121,254** (120,997–161,762) | 120,026 | 0.083 | 4.0 | 1 in 1 run(s) | 6 | 0 | 0 | 15 | 0 | 60.0% (3/5) | 237,318 |
| baseline-nosub | 5 | **80,302** (79,836–107,441) | 79,317 | 0.072 | 4.0 | 0 in 0 run(s) | 6 | 0 | 0 | 14 | 0 | 60.0% (3/5) | 163,665 |
| effort-low | 5 | **120,560** (120,130–121,733) | 119,589 | 0.080 | 4.0 | 0 in 0 run(s) | 2 | 0 | 0 | 16 | 0 | 60.0% (3/5) | 162,809 |
| effort-low-nosub | 5 | **104,527** (78,248–105,778) | 103,549 | 0.070 | 4.0 | 0 in 0 run(s) | 2 | 0 | 0 | 14 | 0 | 60.0% (3/5) | 132,848 |
| effort-medium | 5 | **116,011** (92,140–121,023) | 91,155 | 0.083 | 4.0 | 1 in 1 run(s) | 3 | 0 | 0 | 11 | 0 | 60.0% (3/5) | 145,764 |
| few-turns | 5 | **105,776** (78,933–107,345) | 104,798 | 0.071 | 4.0 | 0 in 0 run(s) | 2 | 0 | 0 | 13 | 0 | 60.0% (3/5) | 126,336 |
| graphify | 5 | **160,029** (141,551–240,807) | 159,058 | 0.116 | 6.0 | 0 in 0 run(s) | 4 | 0 | 0 | 16 | 6 | 60.0% (3/5) | 226,858 |
| graphify-strict | 5 | **166,765** (133,014–206,080) | 165,794 | 0.129 | 5.0 | 0 in 0 run(s) | 3 | 0 | 0 | 16 | 5 | 60.0% (3/5) | 194,847 |
| haiku-baseline | 5 | **130,913** (92,281–168,261) | 129,935 | 0.049 | 5.0 | 0 in 0 run(s) | 7 | 0 | 0 | 25 | 0 | 60.0% (3/5) | 251,088 |
| haiku-explore | 5 | **91,071** (89,523–121,353) | 90,093 | 0.075 | 4.0 | 0 in 0 run(s) | 4 | 0 | 0 | 10 | 0 | 60.0% (3/5) | 123,050 |
| haiku-graphify | 5 | **102,483** (98,518–125,223) | 101,512 | 0.049 | 4.0 | 0 in 0 run(s) | 4 | 0 | 0 | 10 | 6 | 60.0% (3/5) | 140,655 |
| haiku-nosub | 5 | **101,364** (83,739–104,528) | 100,379 | 0.042 | 5.0 | 0 in 0 run(s) | 7 | 0 | 0 | 26 | 0 | 60.0% (3/5) | 244,690 |
| lean-tools | 5 | **113,229** (54,001–140,577) | 112,251 | 0.068 | 4.0 | 0 in 0 run(s) | 3 | 12 | 0 | 0 | 0 | 60.0% (3/5) | 141,040 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 5 | -126,927.0 | [-241,605.8, -56,857.8] | -61.6% | all-in lower |
| uncached_equivalent | 5 | -107,624.4 | [-235,797.0, -25,772.6] | -49.5% | all-in lower |
| total_cost_usd | 5 | -0.0889 | [-0.1421, -0.0549] | -73.5% | all-in lower |
| num_turns | 5 | -1.2 | [-4.6, 1.8] | 11.7% | **CI crosses 0 — no detectable difference** |

### rest — 560 runs over 40 tasks

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| all-in | 40 | **264,767** (147,755–668,649) | 263,779 | 0.094 | 14.5 | 0 in 0 run(s) | 262 | 257 | 36 | 110 | 0 | 77.5% (31/40) | 579,086 |
| baseline | 40 | **270,860** (214,951–492,675) | 153,413 | 0.203 | 5.0 | 22 in 22 run(s) | 62 | 0 | 0 | 91 | 0 | 87.5% (35/40) | 406,868 |
| baseline-nosub | 40 | **233,554** (144,366–382,636) | 232,574 | 0.144 | 8.0 | 0 in 0 run(s) | 164 | 0 | 0 | 218 | 0 | 87.5% (35/40) | 324,506 |
| effort-low | 40 | **191,959** (152,838–300,875) | 111,311 | 0.137 | 4.0 | 23 in 23 run(s) | 27 | 0 | 0 | 63 | 0 | 82.5% (33/40) | 251,728 |
| effort-low-nosub | 40 | **164,490** (132,914–248,177) | 163,504 | 0.105 | 6.0 | 0 in 0 run(s) | 80 | 0 | 0 | 192 | 0 | 87.5% (35/40) | 231,271 |
| effort-medium | 40 | **254,137** (200,344–381,973) | 64,557 | 0.189 | 2.0 | 28 in 28 run(s) | 24 | 0 | 0 | 63 | 0 | 82.5% (33/40) | 322,431 |
| few-turns | 40 | **161,785** (133,363–231,360) | 160,802 | 0.096 | 6.0 | 0 in 0 run(s) | 60 | 0 | 0 | 188 | 0 | 87.5% (35/40) | 226,540 |
| graphify | 40 | **319,452** (212,223–488,364) | 318,448 | 0.205 | 9.5 | 0 in 0 run(s) | 187 | 0 | 0 | 192 | 77 | 80.0% (32/40) | 447,956 |
| graphify-strict | 40 | **326,350** (204,604–508,983) | 301,360 | 0.201 | 9.0 | 1 in 1 run(s) | 138 | 0 | 0 | 200 | 78 | 80.0% (32/40) | 435,092 |
| haiku-baseline | 40 | **518,298** (189,475–809,182) | 505,719 | 0.132 | 15.5 | 2 in 1 run(s) | 271 | 0 | 0 | 325 | 0 | 82.5% (33/40) | 654,765 |
| haiku-explore | 40 | **261,206** (214,822–1,039,848) | 184,768 | 0.199 | 6.0 | 26 in 23 run(s) | 128 | 0 | 0 | 105 | 0 | 82.5% (33/40) | 739,023 |
| haiku-graphify | 40 | **390,476** (229,454–552,878) | 389,503 | 0.111 | 12.0 | 0 in 0 run(s) | 225 | 0 | 0 | 145 | 93 | 85.0% (34/40) | 522,273 |
| haiku-nosub | 40 | **400,806** (194,955–823,990) | 399,823 | 0.101 | 15.0 | 0 in 0 run(s) | 301 | 0 | 0 | 347 | 0 | 85.0% (34/40) | 660,562 |
| lean-tools | 40 | **170,245** (115,348–243,308) | 169,250 | 0.116 | 6.0 | 0 in 0 run(s) | 116 | 106 | 2 | 36 | 0 | 85.0% (34/40) | 213,264 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 40 | 120,894.1 | [-8,488.9, 271,382.2] | 42.9% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 40 | 331,373.1 | [171,442.2, 508,828.2] | 462.5% | all-in higher |
| total_cost_usd | 40 | -0.1463 | [-0.1907, -0.1033] | -49.1% | all-in lower |
| num_turns | 40 | 12.7 | [8.9, 16.6] | 511.4% | all-in higher |

## 16. Limitations

- N = 630 runs over 45 tasks; a single corpus and a single model. These results do not generalize to other codebases or models.
- Bootstrap resamples tasks, so the interval reflects task-to-task variation, not within-task run noise.
- Where a CI crosses zero the honest reading is "no difference detected at this N", not "no difference exists".
- The fixed ~21k-token system-prompt/tool-definition overhead is included in both arms and not subtracted (see §2).
- **1 repetition per (task × condition)**: within-task run-to-run variance is unmeasured, so any single per-task difference may be run noise.
- Subagent traffic is counted in `uncached_all`, but a subagent's tool calls never reach the parent transcript, so the tool-call columns stay main-session-only.
- Raw per-run data lives in `results/runs/<run-id>/`, `results/ext/runs/<run-id>/`, `results/structural/runs/<run-id>/`, `results/levers/runs/<run-id>/`, `results/lean/runs/<run-id>/` and the `summary.csv` beside this report.
