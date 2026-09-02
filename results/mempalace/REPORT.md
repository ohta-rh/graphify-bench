# graphify-bench results

Generated 2026-09-02T10:09:57.039Z. 500 runs over 65 tasks, conditions: baseline, baseline-nosub, graphify, graphify-strict, graphify-strict-v2, graphify-v2, haiku-baseline, haiku-graphify, haiku-graphify-v2, haiku-mempalace, haiku-mempalace-v2, mempalace, mempalace-v2.

## 1. Environment

- Claude Code: `2.1.258 (Claude Code)`
- graphify: `graphify 0.9.53`
- Node: `v25.5.0` / pnpm `10.28.2`
- Platform: `darwin 25.2.0 arm64`
- Model: `claude-sonnet-5`, effort `high`, --max-turns 60, --max-budget-usd 4

- Bootstrap: B=2000, percentile 95% CI, seed `graphify-bench-bootstrap`, resampled over **tasks**.
- Corpus: `corpus-v1+v2`, tree hash (sha256) `4148d9b26fb31b95ab8424af1f88cfc7741bb655b3ad3bbb557a8c3c516c12da` (source: `docs/plan/CORPUS.md`). That hash pins `src`+`tests`, which `corpus-v1+v2` leaves frozen; its addition is the `docs/` layer, hashed the same way: `2f3392342f9a9745dbc2868eeb6e11cebdc17837d9cbbef078eef594db9c9b64`.
- Report generated: 2026-09-02.

The `Model` line above is the harness default; arms that override it are listed here. Every field comes from the run's own `run.meta.json`, not from the report's assumptions.

| condition | model | overlays | extra `claude` args | what it isolates |
|---|---|---|---|---|
| `baseline` | `claude-sonnet-5` | `baseline` | – | No graph, no hooks — the reference arm. Corpus-independent: it ships no graph, so it reads whatever corpus generation it is run against, docs included. |
| `baseline-nosub` | `claude-sonnet-5` | `baseline` | `--disallowedTools Agent` | Baseline with the Agent tool removed, so it cannot delegate exploration to a subagent — isolates how much of baseline's efficiency is the subagent rather than the flat search. |
| `graphify-strict` | `claude-sonnet-5` | `graphify` + `graphify-strict` | – | Same as `graphify`, but the Read\|Glob hook runs `hook-guard read --strict`: the first raw Read of an indexed in-project source file per session is DENIED and redirected to `graphify query`. |
| `graphify-strict-v2` | `claude-sonnet-5` | `graphify-v2` + `graphify-strict-v2` | – | `graphify-v2` with the Read\|Glob hook switched to `hook-guard read --strict`, so the first raw Read of an indexed file is DENIED and redirected to `graphify query`. A delta overlay: it ships only the settings file and inherits the multi-megabyte graph from `graphify-v2`. |
| `graphify-v2` | `claude-sonnet-5` | `graphify-v2` | – | graphify over code AND the 139-file documentation layer (corpus-v2). Same skill, CLAUDE.md and nudge hooks as `graphify`; the graph adds doc nodes and doc->code traceability edges, which is what the doc-vs-code task set measures. |
| `haiku-baseline` | `claude-haiku-4-5` | `baseline` | – | Baseline run by a weaker explorer. |
| `haiku-graphify` | `claude-haiku-4-5` | `graphify` | – | graphify run by a weaker explorer — the arm where a prebuilt index should help most. |
| `haiku-graphify-v2` | `claude-haiku-4-5` | `graphify-v2` | – | `graphify-v2` run by a weaker explorer. Its reference arm is `haiku-baseline`, which ships no graph and therefore reads whatever corpus it is pointed at — on corpus-v2 that includes the documentation layer, so the pair isolates the graph, not the presence of the docs. |
| `haiku-mempalace` | `claude-haiku-4-5` | `mempalace` | – | `mempalace` run by a weaker explorer — its reference arm is `haiku-baseline`. |
| `haiku-mempalace-v2` | `claude-haiku-4-5` | `mempalace-v2` | – | `mempalace-v2` run by a weaker explorer — its reference arm is `haiku-baseline`. |
| `mempalace` | `claude-sonnet-5` | `mempalace` | – | A semantic-retrieval index instead of a structural one: MemPalace 3.9.0 over the code-only corpus, reached through the `mempalace_search` MCP tool. The CLAUDE.md nudge is the same strength as graphify's; what differs is the retrieval model (embedding + BM25 over text chunks, not an AST graph). |
| `mempalace-v2` | `claude-sonnet-5` | `mempalace-v2` | – | MemPalace over code AND the 139-file documentation layer (corpus-v2). Its index covers the docs, so it is the semantic-retrieval counterpart to `graphify-v2` on the doc-vs-code set. |

## 2. Overall

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 65 | **272,782** (203,616–574,157) | 151,011 | 0.212 | 5.0 | 33 in 31 run(s) | 95 | 0 | 0 | 199 | 0 | 80.0% (52/65) | 386,441 |
| baseline-nosub | 45 | **230,081** (126,680–378,938) | 229,091 | 0.134 | 8.0 | 0 in 0 run(s) | 170 | 0 | 0 | 232 | 0 | 84.4% (38/45) | 311,808 |
| graphify | 45 | **288,502** (197,852–481,415) | 287,545 | 0.191 | 9.0 | 0 in 0 run(s) | 191 | 0 | 0 | 208 | 83 | 77.8% (35/45) | 429,005 |
| graphify-strict | 45 | **288,533** (181,403–463,327) | 286,953 | 0.186 | 8.0 | 1 in 1 run(s) | 141 | 0 | 0 | 216 | 83 | 77.8% (35/45) | 414,500 |
| graphify-strict-v2 | 20 | **456,468** (228,101–667,047) | 455,427 | 0.286 | 12.0 | 0 in 0 run(s) | 74 | 0 | 0 | 135 | 36 | 70.0% (14/20) | 453,066 |
| graphify-v2 | 20 | **443,863** (205,549–734,775) | 442,839 | 0.283 | 12.5 | 0 in 0 run(s) | 63 | 0 | 0 | 146 | 38 | 80.0% (16/20) | 502,286 |
| haiku-baseline | 65 | **526,174** (159,352–774,139) | 501,991 | 0.131 | 14.0 | 3 in 2 run(s) | 400 | 0 | 0 | 504 | 0 | 80.0% (52/65) | 624,387 |
| haiku-graphify | 45 | **327,185** (190,413–523,370) | 326,189 | 0.103 | 10.0 | 0 in 0 run(s) | 229 | 0 | 0 | 155 | 99 | 82.2% (37/45) | 491,331 |
| haiku-graphify-v2 | 20 | **440,614** (161,348–897,862) | 439,649 | 0.127 | 12.5 | 0 in 0 run(s) | 123 | 0 | 0 | 78 | 41 | 75.0% (15/20) | 439,640 |
| haiku-mempalace | 45 | **497,712** (200,238–959,939) | 462,057 | 0.154 | 12.0 | 2 in 2 run(s) | 206 | 0 | 0 | 160 | 0 | 75.6% (34/45) | 676,983 |
| haiku-mempalace-v2 | 20 | **430,577** (118,174–686,342) | 429,608 | 0.133 | 10.5 | 0 in 0 run(s) | 112 | 0 | 0 | 35 | 0 | 55.0% (11/20) | 606,265 |
| mempalace | 45 | **456,481** (227,888–723,818) | 449,651 | 0.360 | 11.0 | 1 in 1 run(s) | 134 | 0 | 0 | 61 | 0 | 80.0% (36/45) | 556,835 |
| mempalace-v2 | 20 | **385,812** (325,372–575,918) | 384,811 | 0.372 | 11.0 | 1 in 1 run(s) | 33 | 0 | 0 | 22 | 0 | 60.0% (12/20) | 408,343 |

**`uncached_all` (PRIMARY) = Σ over every entry of `modelUsage` of (inputTokens + cacheReadInputTokens + cacheCreationInputTokens)** — it covers the main session *and* any subagent, so it is commensurable with `total_cost_usd`. `uncached_main` (secondary) is the same sum taken from `usage.*`, which the result JSON populates for the **main session only**; a run that spawned a subagent therefore reports less information volume there than it actually consumed. The `subagents` column lets the two be reconciled. Tool columns are totals across all runs of the condition. T2S (tokens-to-success) = total `uncached_all` of successful runs / number of successful runs.

Fixed overhead, reported separately so readers can subtract it (architecture.md §5):

| condition | first-turn cache_creation (median) |
|---|---|
| baseline | 10,357 |
| baseline-nosub | 9,510 |
| graphify | 10,943 |
| graphify-strict | 10,935 |
| graphify-strict-v2 | 10,934 |
| graphify-v2 | 10,936 |
| haiku-baseline | 8,013 |
| haiku-graphify | 8,438 |
| haiku-graphify-v2 | 8,430 |
| haiku-mempalace | 8,627 |
| haiku-mempalace-v2 | 8,640 |
| mempalace | 11,108 |
| mempalace-v2 | 11,124 |

## 3. Paired difference (mempalace − baseline), all tasks

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | 170,329.2 | [63,770.6, 291,391.1] | 76.2% | mempalace higher |
| uncached_equivalent | 45 | 351,604.4 | [223,356.6, 492,697.8] | 410.2% | mempalace higher |
| total_cost_usd | 45 | 0.1365 | [0.0783, 0.2058] | 81.9% | mempalace higher |
| num_turns | 45 | 6.7 | [4.3, 9.2] | 269.0% | mempalace higher |

> **Why the two token rows disagree.** Subagent use is asymmetric between the arms (baseline 31/65 runs, mempalace 1/45). `uncached_equivalent` cannot see a subagent's tokens, so it charges that work to nobody and makes the subagent-spawning arm look cheap; `uncached_equivalent_all` counts it. **Read the `_all` row** — the main-only row is retained only to show the size of the distortion.

## 4. Iso-accuracy subset

Tasks where every graded run of both conditions succeeded (36/65): `EXP1-issue-create-flow`, `EXP2-comment-mention-notify`, `EXP3-digest-pipeline`, `FIX1-issue-tenant-leak`, `FIX2-project-quota-off-by-one`, `FIX3-board-shows-archived`, `IMP1-planlimits-field`, `IMP3-limited-resource-union`, `LOC1-shortcut-match`, `REF1-assertcan-callers`, `REF2-would-exceed-limit-callers`, `REF3-issue-created-subscribers`, `XEXP1-webhook-delivery`, `XEXP2-invitation-lifecycle`, `XEXP3-plan-change`, `XEXP4-signin-to-actor`, `XEXP5-search-index`, `XEXP6-overdue-sweep`, `XFIX1-csv-quote-escape`, `XFIX2-mention-inside-code`, `XFIX3-last-owner-removable`, `XFIX4-advanced-search-inverted`, `XFIX6-revoked-invite-accepted`, `XIMP3-issue-status-union`, `XIMP4-feature-flag-key-union`, `XLOC1-retry-throttle`, `XLOC2-invite-link-validity`, `XLOC3-issue-number-allocation`, `XLOC4-session-lifetime`, `XLOC5-delivery-retry-policy`, `XREF1-assertorgscope-callers`, `XREF2-emit-callers`, `XREF3-isenabled-callers`, `XREF4-comment-created-subscribers`, `XREF5-rate-limit-importers`, `XREF6-member-joined-repositories`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 36 | **272,542** (213,749–563,188) | 153,413 | 0.203 | 5.0 | 19 in 19 run(s) | 59 | 0 | 0 | 86 | 0 | 100.0% (36/36) | 400,354 |
| baseline-nosub | 36 | **238,930** (133,843–382,636) | 237,935 | 0.147 | 8.0 | 0 in 0 run(s) | 159 | 0 | 0 | 198 | 0 | 100.0% (36/36) | 315,394 |
| graphify | 36 | **319,452** (191,853–496,443) | 318,448 | 0.205 | 9.0 | 0 in 0 run(s) | 181 | 0 | 0 | 167 | 68 | 94.4% (34/36) | 436,713 |
| graphify-strict | 36 | **338,812** (204,604–552,570) | 318,492 | 0.194 | 9.0 | 1 in 1 run(s) | 134 | 0 | 0 | 184 | 71 | 94.4% (34/36) | 422,799 |
| graphify-strict-v2 | 0 | **–** (–––) | – | – | – | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | – (0/0) | – |
| graphify-v2 | 0 | **–** (–––) | – | – | – | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | – (0/0) | – |
| haiku-baseline | 36 | **527,298** (254,359–881,386) | 517,304 | 0.132 | 16.0 | 2 in 1 run(s) | 248 | 0 | 0 | 305 | 0 | 91.7% (33/36) | 642,825 |
| haiku-graphify | 36 | **390,476** (236,924–552,878) | 389,503 | 0.111 | 12.0 | 0 in 0 run(s) | 199 | 0 | 0 | 136 | 82 | 94.4% (34/36) | 510,036 |
| haiku-graphify-v2 | 0 | **–** (–––) | – | – | – | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | – (0/0) | – |
| haiku-mempalace | 36 | **515,542** (241,861–982,074) | 502,242 | 0.161 | 12.5 | 2 in 2 run(s) | 181 | 0 | 0 | 110 | 0 | 88.9% (32/36) | 710,473 |
| haiku-mempalace-v2 | 0 | **–** (–––) | – | – | – | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | – (0/0) | – |
| mempalace | 36 | **464,935** (245,984–751,106) | 456,399 | 0.381 | 11.0 | 1 in 1 run(s) | 122 | 0 | 0 | 47 | 0 | 100.0% (36/36) | 556,835 |
| mempalace-v2 | 0 | **–** (–––) | – | – | – | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | – (0/0) | – |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 36 | 156,481.1 | [46,110.4, 290,225.7] | 63.3% | mempalace higher |
| uncached_equivalent | 36 | 365,573.1 | [222,811.8, 522,447.3] | 466.8% | mempalace higher |
| total_cost_usd | 36 | 0.1244 | [0.0577, 0.1944] | 68.1% | mempalace higher |
| num_turns | 36 | 7.2 | [4.4, 10.4] | 310.1% | mempalace higher |

## 5. By category

### discrepancy (4 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 0 | – | [–, –] | – | n too small |
| uncached_equivalent | 0 | – | [–, –] | – | n too small |
| total_cost_usd | 0 | – | [–, –] | – | n too small |
| num_turns | 0 | – | [–, –] | – | n too small |

### explain (13 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | 107,554.7 | [-43,256.9, 254,721.2] | 17.3% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 9 | 691,166.6 | [470,354.4, 899,651.0] | 889.2% | mempalace higher |
| total_cost_usd | 9 | 0.0976 | [0.0014, 0.1823] | 23.8% | mempalace higher |
| num_turns | 9 | 17.0 | [14.0, 20.4] | 692.1% | mempalace higher |

### fix (9 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | 97,253.9 | [-17,195.9, 243,158.7] | 42.2% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 9 | 254,469.6 | [94,594.6, 431,973.0] | 200.9% | mempalace higher |
| total_cost_usd | 9 | 0.0574 | [-0.0391, 0.1508] | 47.3% | **CI crosses 0 — no detectable difference** |
| num_turns | 9 | 4.1 | [1.4, 7.0] | 113.3% | mempalace higher |

### impact (13 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | 616,002.9 | [302,457.8, 998,196.9] | 283.2% | mempalace higher |
| uncached_equivalent | 9 | 639,176.6 | [310,258.6, 1,045,753.8] | 564.3% | mempalace higher |
| total_cost_usd | 9 | 0.4206 | [0.2586, 0.6067] | 257.1% | mempalace higher |
| num_turns | 9 | 9.7 | [5.2, 15.6] | 275.0% | mempalace higher |

### locate (13 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | -58,184.2 | [-97,383.0, -27,341.9] | -26.9% | mempalace lower |
| uncached_equivalent | 9 | 40,497.8 | [-1,286.0, 81,738.4] | 66.0% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 9 | -0.0263 | [-0.0531, -0.0039] | -13.0% | mempalace lower |
| num_turns | 9 | 0.9 | [-0.7, 2.4] | 51.5% | **CI crosses 0 — no detectable difference** |

### reference (13 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | 89,018.7 | [-100,089.4, 246,294.4] | 65.2% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 9 | 132,711.7 | [-85,461.3, 308,223.1] | 330.4% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 9 | 0.1330 | [0.0413, 0.2207] | 94.4% | mempalace higher |
| num_turns | 9 | 1.9 | [-4.0, 6.7] | 213.4% | **CI crosses 0 — no detectable difference** |

## 6. Answer quality by category

Section 5 reports what each category *cost*. This one reports whether it was *answered*: each cell is `successes/graded · mean grader score`. The two are not interchangeable — an arm that gives up early looks cheap in section 5 and is exposed here.

| condition | **discrepancy** | **explain** | **fix** | **impact** | **locate** | **reference** |
|---|---|---|---|---|---|---|
| `baseline` | 2/4 · 0.681 | 13/13 · 0.954 | 8/9 · 0.889 | 5/13 · 0.789 | 12/13 · 0.962 | 12/13 · 0.959 |
| `baseline-nosub` | – | 9/9 · 0.978 | 9/9 · 1.000 | 4/9 · 0.897 | 7/9 · 0.889 | 9/9 · 0.978 |
| `graphify` | – | 9/9 · 0.978 | 7/9 · 0.778 | 4/9 · 0.888 | 6/9 · 0.833 | 9/9 · 0.978 |
| `graphify-strict` | – | 9/9 · 0.956 | 7/9 · 0.778 | 4/9 · 0.897 | 7/9 · 0.889 | 8/9 · 0.973 |
| `graphify-strict-v2` | 2/4 · 0.714 | 4/4 · 0.900 | – | 1/4 · 0.591 | 3/4 · 0.917 | 4/4 · 1.000 |
| `graphify-v2` | 4/4 · 0.938 | 4/4 · 0.900 | – | 1/4 · 0.602 | 4/4 · 1.000 | 3/4 · 0.917 |
| `haiku-baseline` | 3/4 · 0.717 | 13/13 · 0.831 | 8/9 · 0.889 | 5/13 · 0.780 | 11/13 · 0.885 | 12/13 · 0.981 |
| `haiku-graphify` | – | 9/9 · 0.933 | 8/9 · 0.889 | 5/9 · 0.898 | 6/9 · 0.852 | 9/9 · 0.974 |
| `haiku-graphify-v2` | 2/4 · 0.550 | 4/4 · 0.850 | – | 1/4 · 0.617 | 4/4 · 1.000 | 4/4 · 1.000 |
| `haiku-mempalace` | – | 9/9 · 0.844 | 9/9 · 1.000 | 4/9 · 0.878 | 6/9 · 0.778 | 6/9 · 0.808 |
| `haiku-mempalace-v2` | 2/4 · 0.575 | 4/4 · 0.850 | – | 1/4 · 0.589 | 3/4 · 0.917 | 1/4 · 0.430 |
| `mempalace` | – | 9/9 · 0.956 | 8/9 · 0.889 | 4/9 · 0.897 | 6/9 · 0.852 | 9/9 · 0.971 |
| `mempalace-v2` | 2/4 · 0.588 | 4/4 · 0.950 | – | 0/4 · 0.536 | 4/4 · 1.000 | 2/4 · 0.783 |

**`discrepancy` — the doc-vs-code contradiction hunt.** 4 tasks partition the **12** contradictions planted into corpus-v2 when it was written and recorded in `tasks/keys/docs-discrepancies.json`. The prompts name no document, path or id: each describes a domain in prose and asks which documents the code contradicts. Its `success_threshold` is **0.6**, not the 0.9 the other set categories use — finding two of three planted contradictions is a genuinely useful result, and at 0.9 the category would report an almost uniform zero and measure nothing. A success here therefore means something weaker than a success elsewhere, which is why the mean score is printed beside it rather than the pass count alone.

## 7. Structural comparisons

Each block below is an independent paired comparison between two arms, computed with the same machinery as §3: per-task pairing over the same task set, percentile bootstrap over tasks, an iso-accuracy subset scoped to just those two arms, and a per-category breakdown. Arms that are not part of a block are excluded from it entirely.

### `mempalace` vs `baseline`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 45 | **260,561** (203,616–428,937) | 144,597 | 0.197 | 5.0 | 23 in 23 run(s) | 68 | 0 | 0 | 106 | 0 | 84.4% (38/45) | 393,482 |
| mempalace | 45 | **456,481** (227,888–723,818) | 449,651 | 0.360 | 11.0 | 1 in 1 run(s) | 134 | 0 | 0 | 61 | 0 | 80.0% (36/45) | 556,835 |

Paired difference (`mempalace` − `baseline`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | 170,329.2 | [65,640.0, 287,806.8] | 76.2% | mempalace higher |
| uncached_equivalent | 45 | 351,604.4 | [235,486.2, 483,009.3] | 410.2% | mempalace higher |
| total_cost_usd | 45 | 0.1365 | [0.0782, 0.2045] | 81.9% | mempalace higher |
| num_turns | 45 | 6.7 | [4.3, 9.2] | 269.0% | mempalace higher |

Iso-accuracy subset (36/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 36 | 156,481.1 | [43,215.6, 282,239.0] | 63.3% | mempalace higher |
| uncached_equivalent | 36 | 365,573.1 | [218,323.2, 519,637.0] | 466.8% | mempalace higher |
| total_cost_usd | 36 | 0.1244 | [0.0615, 0.1900] | 68.1% | mempalace higher |
| num_turns | 36 | 7.2 | [4.0, 10.1] | 310.1% | mempalace higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | 107,554.7 | [-36,972.0, 255,527.5] | 17.3% | **CI crosses 0 — no detectable difference** |
| fix | 9 | 97,253.9 | [-19,922.3, 243,247.3] | 42.2% | **CI crosses 0 — no detectable difference** |
| impact | 9 | 616,002.9 | [310,153.1, 998,879.4] | 283.2% | mempalace higher |
| locate | 9 | -58,184.2 | [-97,080.0, -28,172.2] | -26.9% | mempalace lower |
| reference | 9 | 89,018.7 | [-114,157.8, 257,582.9] | 65.2% | **CI crosses 0 — no detectable difference** |

**Verdict.** `mempalace` vs `baseline` over 45 paired tasks: tokens higher by 170,329 (95% CI [65,640, 287,807]); cost higher by 0.1365 (95% CI [0.0782, 0.2045]); turns higher by 6.7 (95% CI [4.3, 9.2]); accuracy 80.0% vs 84.4% (36/45 vs 38/45).

### `mempalace` vs `graphify`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| graphify | 45 | **288,502** (197,852–481,415) | 287,545 | 0.191 | 9.0 | 0 in 0 run(s) | 191 | 0 | 0 | 208 | 83 | 77.8% (35/45) | 429,005 |
| mempalace | 45 | **456,481** (227,888–723,818) | 449,651 | 0.360 | 11.0 | 1 in 1 run(s) | 134 | 0 | 0 | 61 | 0 | 80.0% (36/45) | 556,835 |

Paired difference (`mempalace` − `graphify`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | 138,231.9 | [30,901.4, 254,588.4] | 62.1% | mempalace higher |
| uncached_equivalent | 45 | 130,270.0 | [23,376.6, 251,570.8] | 61.2% | mempalace higher |
| total_cost_usd | 45 | 0.1428 | [0.0844, 0.2117] | 73.5% | mempalace higher |
| num_turns | 45 | 0.0 | [-2.1, 2.2] | 19.7% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (34/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 34 | 136,483.1 | [11,699.5, 290,955.6] | 70.9% | mempalace higher |
| uncached_equivalent | 34 | 125,945.3 | [-7,841.3, 274,058.9] | 69.8% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 34 | 0.1455 | [0.0753, 0.2270] | 80.2% | mempalace higher |
| num_turns | 34 | -0.2 | [-2.9, 2.5] | 25.4% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | 135,854.3 | [-57,052.3, 337,714.6] | 34.1% | **CI crosses 0 — no detectable difference** |
| fix | 9 | 40,692.4 | [-187,540.1, 262,488.9] | 59.3% | **CI crosses 0 — no detectable difference** |
| impact | 9 | 548,739.8 | [222,628.1, 924,561.9] | 220.8% | mempalace higher |
| locate | 9 | -49,181.1 | [-74,414.6, -21,504.7] | -24.1% | mempalace lower |
| reference | 9 | 15,054.0 | [-116,222.0, 139,472.8] | 20.3% | **CI crosses 0 — no detectable difference** |

**Verdict.** `mempalace` vs `graphify` over 45 paired tasks: tokens higher by 138,232 (95% CI [30,901, 254,588]); cost higher by 0.1428 (95% CI [0.0844, 0.2117]); turns no detectable difference; accuracy 80.0% vs 77.8% (36/45 vs 35/45).

### `mempalace` vs `baseline-nosub`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline-nosub | 45 | **230,081** (126,680–378,938) | 229,091 | 0.134 | 8.0 | 0 in 0 run(s) | 170 | 0 | 0 | 232 | 0 | 84.4% (38/45) | 311,808 |
| mempalace | 45 | **456,481** (227,888–723,818) | 449,651 | 0.360 | 11.0 | 1 in 1 run(s) | 134 | 0 | 0 | 61 | 0 | 80.0% (36/45) | 556,835 |

Paired difference (`mempalace` − `baseline-nosub`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | 245,708.7 | [157,438.4, 355,428.7] | 117.4% | mempalace higher |
| uncached_equivalent | 45 | 237,746.8 | [142,624.9, 341,597.8] | 114.7% | mempalace higher |
| total_cost_usd | 45 | 0.2090 | [0.1524, 0.2698] | 137.7% | mempalace higher |
| num_turns | 45 | 1.8 | [0.2, 3.4] | 36.1% | mempalace higher |

Iso-accuracy subset (36/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 36 | 241,441.1 | [140,321.3, 355,159.4] | 108.3% | mempalace higher |
| uncached_equivalent | 36 | 231,488.8 | [129,452.1, 347,992.5] | 104.6% | mempalace higher |
| total_cost_usd | 36 | 0.2053 | [0.1496, 0.2721] | 129.0% | mempalace higher |
| num_turns | 36 | 1.4 | [-0.3, 3.3] | 30.5% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | 165,595.2 | [-3,115.5, 324,965.4] | 30.1% | **CI crosses 0 — no detectable difference** |
| fix | 9 | 245,048.1 | [66,921.2, 449,315.4] | 180.3% | mempalace higher |
| impact | 9 | 594,073.8 | [313,058.5, 936,249.5] | 239.4% | mempalace higher |
| locate | 9 | 26,350.2 | [1,355.4, 52,961.0] | 34.0% | mempalace higher |
| reference | 9 | 197,476.3 | [109,264.9, 276,699.8] | 103.2% | mempalace higher |

**Verdict.** `mempalace` vs `baseline-nosub` over 45 paired tasks: tokens higher by 245,709 (95% CI [157,438, 355,429]); cost higher by 0.2090 (95% CI [0.1524, 0.2698]); turns higher by 1.8 (95% CI [0.2, 3.4]); accuracy 80.0% vs 84.4% (36/45 vs 38/45).

### `haiku-mempalace` vs `haiku-baseline`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| haiku-baseline | 45 | **502,978** (159,352–754,040) | 498,061 | 0.121 | 15.0 | 2 in 1 run(s) | 278 | 0 | 0 | 350 | 0 | 80.0% (36/45) | 621,126 |
| haiku-mempalace | 45 | **497,712** (200,238–959,939) | 462,057 | 0.154 | 12.0 | 2 in 2 run(s) | 206 | 0 | 0 | 160 | 0 | 75.6% (34/45) | 676,983 |

Paired difference (`haiku-mempalace` − `haiku-baseline`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | 100,877.2 | [-53,507.3, 264,042.8] | 82.1% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 45 | 93,958.8 | [-78,194.0, 270,234.7] | 157.0% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 45 | 0.0348 | [0.0098, 0.0624] | 46.4% | haiku-mempalace higher |
| num_turns | 45 | -1.3 | [-4.0, 1.6] | 48.0% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (32/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 32 | 32,467.1 | [-134,358.1, 188,713.3] | 33.6% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 32 | 22,738.2 | [-170,549.5, 208,631.2] | 138.1% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 32 | 0.0218 | [-0.0029, 0.0493] | 29.3% | **CI crosses 0 — no detectable difference** |
| num_turns | 32 | -2.1 | [-5.4, 1.3] | 57.1% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | -330,862.8 | [-712,073.2, 32,978.1] | -23.7% | **CI crosses 0 — no detectable difference** |
| fix | 9 | 143,468.6 | [-11,152.4, 319,988.1] | 30.5% | **CI crosses 0 — no detectable difference** |
| impact | 9 | 508,170.3 | [110,037.6, 1,042,867.3] | 367.8% | haiku-mempalace higher |
| locate | 9 | -613.9 | [-37,189.1, 45,511.4] | -2.2% | **CI crosses 0 — no detectable difference** |
| reference | 9 | 184,223.8 | [-85,963.8, 485,580.2] | 38.2% | **CI crosses 0 — no detectable difference** |

**Verdict.** `haiku-mempalace` vs `haiku-baseline` over 45 paired tasks: tokens no detectable difference; cost higher by 0.0348 (95% CI [0.0098, 0.0624]); turns no detectable difference; accuracy 75.6% vs 80.0% (34/45 vs 36/45).

### `haiku-mempalace` vs `haiku-graphify`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| haiku-graphify | 45 | **327,185** (190,413–523,370) | 326,189 | 0.103 | 10.0 | 0 in 0 run(s) | 229 | 0 | 0 | 155 | 99 | 82.2% (37/45) | 491,331 |
| haiku-mempalace | 45 | **497,712** (200,238–959,939) | 462,057 | 0.154 | 12.0 | 2 in 2 run(s) | 206 | 0 | 0 | 160 | 0 | 75.6% (34/45) | 676,983 |

Paired difference (`haiku-mempalace` − `haiku-graphify`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | 220,215.0 | [74,728.0, 378,331.6] | 89.7% | haiku-mempalace higher |
| uncached_equivalent | 45 | 199,869.6 | [51,637.9, 352,774.3] | 85.3% | haiku-mempalace higher |
| total_cost_usd | 45 | 0.0511 | [0.0264, 0.0803] | 55.0% | haiku-mempalace higher |
| num_turns | 45 | 1.5 | [-0.9, 4.0] | 25.2% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (32/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 32 | 196,015.4 | [40,710.5, 363,535.0] | 72.1% | haiku-mempalace higher |
| uncached_equivalent | 32 | 167,404.8 | [682.9, 341,689.6] | 65.7% | haiku-mempalace higher |
| total_cost_usd | 32 | 0.0459 | [0.0194, 0.0761] | 42.7% | haiku-mempalace higher |
| num_turns | 32 | 1.1 | [-1.9, 4.3] | 22.4% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | -19,584.7 | [-210,953.1, 175,601.1] | 7.8% | **CI crosses 0 — no detectable difference** |
| fix | 9 | 254,727.3 | [-63,003.6, 621,401.8] | 103.7% | **CI crosses 0 — no detectable difference** |
| impact | 9 | 576,332.2 | [95,825.4, 1,093,665.9] | 254.7% | haiku-mempalace higher |
| locate | 9 | -29,932.9 | [-111,916.3, 62,551.4] | -11.2% | **CI crosses 0 — no detectable difference** |
| reference | 9 | 319,532.8 | [65,949.6, 594,269.5] | 93.5% | haiku-mempalace higher |

**Verdict.** `haiku-mempalace` vs `haiku-graphify` over 45 paired tasks: tokens higher by 220,215 (95% CI [74,728, 378,332]); cost higher by 0.0511 (95% CI [0.0264, 0.0803]); turns no detectable difference; accuracy 75.6% vs 82.2% (34/45 vs 37/45).

### `mempalace-v2` vs `baseline`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 20 | **318,144** (208,381–869,934) | 151,516 | 0.256 | 5.0 | 10 in 8 run(s) | 27 | 0 | 0 | 93 | 0 | 70.0% (14/20) | 367,328 |
| mempalace-v2 | 20 | **385,812** (325,372–575,918) | 384,811 | 0.372 | 11.0 | 1 in 1 run(s) | 33 | 0 | 0 | 22 | 0 | 60.0% (12/20) | 408,343 |

Paired difference (`mempalace-v2` − `baseline`), all 20 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 20 | -200,731.2 | [-542,027.0, 42,504.6] | 29.5% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 20 | 210,141.1 | [113,777.5, 312,334.2] | 255.6% | mempalace-v2 higher |
| total_cost_usd | 20 | 0.0017 | [-0.1373, 0.1219] | 62.3% | **CI crosses 0 — no detectable difference** |
| num_turns | 20 | 4.5 | [2.2, 6.8] | 189.5% | mempalace-v2 higher |

Iso-accuracy subset (12/20 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 2,569.3 | [-161,577.4, 152,981.7] | 35.5% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 12 | 149,167.3 | [55,967.7, 243,808.9] | 93.4% | mempalace-v2 higher |
| total_cost_usd | 12 | 0.0489 | [-0.0493, 0.1583] | 44.2% | **CI crosses 0 — no detectable difference** |
| num_turns | 12 | 2.6 | [-0.2, 5.5] | 64.7% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| discrepancy | 4 | -816,907.5 | [-2,059,526.5, 117,769.5] | -19.0% | **CI crosses 0 — no detectable difference** |
| explain | 4 | -93,640.5 | [-485,516.8, 114,837.5] | 3.8% | **CI crosses 0 — no detectable difference** |
| impact | 4 | -185,603.0 | [-598,129.8, 209,689.8] | 48.6% | **CI crosses 0 — no detectable difference** |
| locate | 4 | -65,734.8 | [-123,825.5, 3,759.8] | -22.1% | **CI crosses 0 — no detectable difference** |
| reference | 4 | 158,230.0 | [2,775.5, 307,045.0] | 136.1% | mempalace-v2 higher |

**Verdict.** `mempalace-v2` vs `baseline` over 20 paired tasks: tokens no detectable difference; cost no detectable difference; turns higher by 4.5 (95% CI [2.2, 6.8]); accuracy 60.0% vs 70.0% (12/20 vs 14/20).

### `mempalace-v2` vs `graphify-v2`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| graphify-v2 | 20 | **443,863** (205,549–734,775) | 442,839 | 0.283 | 12.5 | 0 in 0 run(s) | 63 | 0 | 0 | 146 | 38 | 80.0% (16/20) | 502,286 |
| mempalace-v2 | 20 | **385,812** (325,372–575,918) | 384,811 | 0.372 | 11.0 | 1 in 1 run(s) | 33 | 0 | 0 | 22 | 0 | 60.0% (12/20) | 408,343 |

Paired difference (`mempalace-v2` − `graphify-v2`), all 20 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 20 | -71,290.8 | [-232,098.8, 76,843.4] | 12.0% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 20 | -73,297.1 | [-235,964.0, 75,163.3] | 12.0% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 20 | 0.0857 | [0.0092, 0.1639] | 53.0% | mempalace-v2 higher |
| num_turns | 20 | -2.0 | [-4.7, 0.5] | -0.5% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (12/20 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 13,461.1 | [-146,850.0, 152,032.8] | 15.6% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 12 | 13,461.1 | [-131,912.8, 153,115.3] | 15.7% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 12 | 0.0802 | [-0.0040, 0.1769] | 37.6% | **CI crosses 0 — no detectable difference** |
| num_turns | 12 | -0.5 | [-3.6, 2.1] | 4.0% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| discrepancy | 4 | -322,217.8 | [-839,190.3, 181,023.5] | -9.5% | **CI crosses 0 — no detectable difference** |
| explain | 4 | 45,913.5 | [-109,233.5, 242,815.5] | 10.1% | **CI crosses 0 — no detectable difference** |
| impact | 4 | -32,678.3 | [-355,663.0, 290,306.5] | 25.3% | **CI crosses 0 — no detectable difference** |
| locate | 4 | -184,208.0 | [-470,661.3, -30,179.5] | -38.1% | mempalace-v2 lower |
| reference | 4 | 136,736.8 | [12,070.3, 231,045.0] | 72.3% | mempalace-v2 higher |

**Verdict.** `mempalace-v2` vs `graphify-v2` over 20 paired tasks: tokens no detectable difference; cost higher by 0.0857 (95% CI [0.0092, 0.1639]); turns no detectable difference; accuracy 60.0% vs 80.0% (12/20 vs 16/20).

### `haiku-mempalace-v2` vs `haiku-baseline`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| haiku-baseline | 20 | **634,043** (153,893–839,805) | 582,590 | 0.167 | 14.0 | 1 in 1 run(s) | 122 | 0 | 0 | 154 | 0 | 80.0% (16/20) | 631,724 |
| haiku-mempalace-v2 | 20 | **430,577** (118,174–686,342) | 429,608 | 0.133 | 10.5 | 0 in 0 run(s) | 112 | 0 | 0 | 35 | 0 | 55.0% (11/20) | 606,265 |

Paired difference (`haiku-mempalace-v2` − `haiku-baseline`), all 20 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 20 | -137,135.0 | [-357,971.7, 75,770.0] | 6.4% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 20 | -99,800.1 | [-311,348.0, 125,056.2] | 100.5% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 20 | -0.0135 | [-0.0525, 0.0322] | 12.8% | **CI crosses 0 — no detectable difference** |
| num_turns | 20 | -2.1 | [-5.4, 1.5] | 57.9% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (11/20 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 11 | -32,778.7 | [-294,309.6, 251,084.4] | 36.5% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 11 | -32,778.7 | [-288,383.0, 251,040.8] | 36.9% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 11 | -0.0025 | [-0.0507, 0.0504] | 18.1% | **CI crosses 0 — no detectable difference** |
| num_turns | 11 | 0.2 | [-3.6, 4.5] | 25.4% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| discrepancy | 4 | -52,746.5 | [-930,519.0, 775,903.0] | 15.8% | **CI crosses 0 — no detectable difference** |
| explain | 4 | -385,828.5 | [-602,238.5, -57,130.5] | -32.0% | haiku-mempalace-v2 lower |
| impact | 4 | -155,525.3 | [-339,791.3, 71,459.0] | 31.1% | **CI crosses 0 — no detectable difference** |
| locate | 4 | -7,872.3 | [-41,865.3, 44,756.0] | -15.3% | **CI crosses 0 — no detectable difference** |
| reference | 4 | -83,702.5 | [-336,889.0, 169,455.0] | 32.3% | **CI crosses 0 — no detectable difference** |

**Verdict.** `haiku-mempalace-v2` vs `haiku-baseline` over 20 paired tasks: tokens no detectable difference; cost no detectable difference; turns no detectable difference; accuracy 55.0% vs 80.0% (11/20 vs 16/20).

### `haiku-mempalace-v2` vs `haiku-graphify-v2`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| haiku-graphify-v2 | 20 | **440,614** (161,348–897,862) | 439,649 | 0.127 | 12.5 | 0 in 0 run(s) | 123 | 0 | 0 | 78 | 41 | 75.0% (15/20) | 439,640 |
| haiku-mempalace-v2 | 20 | **430,577** (118,174–686,342) | 429,608 | 0.133 | 10.5 | 0 in 0 run(s) | 112 | 0 | 0 | 35 | 0 | 55.0% (11/20) | 606,265 |

Paired difference (`haiku-mempalace-v2` − `haiku-graphify-v2`), all 20 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 20 | 23,817.9 | [-121,759.5, 182,754.8] | 11.6% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 20 | 23,817.9 | [-126,048.7, 188,837.5] | 11.7% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 20 | 0.0162 | [-0.0157, 0.0521] | 20.2% | **CI crosses 0 — no detectable difference** |
| num_turns | 20 | -0.6 | [-2.7, 1.9] | 0.2% | **CI crosses 0 — no detectable difference** |

Iso-accuracy subset (10/20 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 10 | 105,843.5 | [-77,290.3, 278,306.8] | 45.2% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 10 | 105,843.5 | [-68,971.3, 276,949.0] | 45.5% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 10 | 0.0296 | [-0.0075, 0.0677] | 31.4% | **CI crosses 0 — no detectable difference** |
| num_turns | 10 | 1.5 | [-1.3, 4.1] | 25.5% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| discrepancy | 4 | 238,820.5 | [-317,631.0, 795,272.0] | 11.8% | **CI crosses 0 — no detectable difference** |
| explain | 4 | -7,468.3 | [-356,646.0, 306,230.3] | 17.2% | **CI crosses 0 — no detectable difference** |
| impact | 4 | -109,833.3 | [-389,519.8, 107,049.3] | 17.0% | **CI crosses 0 — no detectable difference** |
| locate | 4 | -22,945.5 | [-106,967.5, 78,652.5] | -20.7% | **CI crosses 0 — no detectable difference** |
| reference | 4 | 20,515.8 | [-146,781.5, 207,782.8] | 32.5% | **CI crosses 0 — no detectable difference** |

**Verdict.** `haiku-mempalace-v2` vs `haiku-graphify-v2` over 20 paired tasks: tokens no detectable difference; cost no detectable difference; turns no detectable difference; accuracy 55.0% vs 75.0% (11/20 vs 15/20).

### Accuracy by model strength

The token comparisons above are only meaningful alongside accuracy: an arm that answers fewer tasks correctly can always look cheaper. This table puts every arm's accuracy side by side so a Haiku-vs-Sonnet reading is not mistaken for an efficiency result.

| condition | graded | successes | accuracy |
|---|---|---|---|
| `baseline` | 65 | 52 | 80.0% |
| `baseline-nosub` | 45 | 38 | 84.4% |
| `graphify` | 45 | 35 | 77.8% |
| `graphify-strict` | 45 | 35 | 77.8% |
| `graphify-strict-v2` | 20 | 14 | 70.0% |
| `graphify-v2` | 20 | 16 | 80.0% |
| `haiku-baseline` | 65 | 52 | 80.0% |
| `haiku-graphify` | 45 | 37 | 82.2% |
| `haiku-graphify-v2` | 20 | 15 | 75.0% |
| `haiku-mempalace` | 45 | 34 | 75.6% |
| `haiku-mempalace-v2` | 20 | 11 | 55.0% |
| `mempalace` | 45 | 36 | 80.0% |
| `mempalace-v2` | 20 | 12 | 60.0% |

## 8. Features never exercised

graphify exposes more than `query`. The table counts, per arm, how many times each subcommand was invoked across all runs (and, in parentheses, how many runs used it at least once). A zero column is the point: it means the benchmark never put that feature under measurement, so nothing here — positive or negative — can be read as evidence about it.

| condition | runs | `query` | `explain` | `path` | `god-nodes` | `affected` | `save-result` | `reflect` | `update` | `benchmark` |
|---|---|---|---|---|---|---|---|---|---|---|
| `baseline` | 65 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `baseline-nosub` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `graphify` | 45 | 63 (45) | 16 (8) | 4 (3) | **0** | **0** | **0** | **0** | **0** | **0** |
| `graphify-strict` | 45 | 61 (45) | 18 (12) | 3 (2) | **0** | **0** | **0** | **0** | 2 (2) | **0** |
| `graphify-strict-v2` | 20 | 24 (20) | 7 (7) | 3 (2) | **0** | **0** | **0** | **0** | **0** | **0** |
| `graphify-v2` | 20 | 27 (20) | 8 (5) | 2 (2) | **0** | **0** | **0** | **0** | **0** | **0** |
| `haiku-baseline` | 65 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `haiku-graphify` | 45 | 77 (43) | 15 (10) | 7 (7) | **0** | **0** | **0** | **0** | **0** | **0** |
| `haiku-graphify-v2` | 20 | 36 (20) | 2 (2) | 3 (3) | **0** | **0** | **0** | **0** | **0** | **0** |
| `haiku-mempalace` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `haiku-mempalace-v2` | 20 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `mempalace` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `mempalace-v2` | 20 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |

| condition | runs reading `graph.json` directly | runs that never invoked the CLI (nudge ignored) | strict denials: total (median/run) |
|---|---|---|---|
| `baseline` | 0 | n/a (no graph) | 0 (0) |
| `baseline-nosub` | 0 | n/a (no graph) | 0 (0) |
| `graphify` | 4 | 0 | 0 (0) |
| `graphify-strict` | 7 | 0 | 0 (0) |
| `graphify-strict-v2` | 2 | n/a (no graph) | 0 (0) |
| `graphify-v2` | 3 | n/a (no graph) | 0 (0) |
| `haiku-baseline` | 0 | n/a (no graph) | 0 (0) |
| `haiku-graphify` | 2 | 2 | 0 (0) |
| `haiku-graphify-v2` | 1 | n/a (no graph) | 0 (0) |
| `haiku-mempalace` | 0 | n/a (no graph) | 0 (0) |
| `haiku-mempalace-v2` | 0 | n/a (no graph) | 0 (0) |
| `mempalace` | 0 | n/a (no graph) | 0 (0) |
| `mempalace-v2` | 0 | n/a (no graph) | 0 (0) |

> **The strict block never fired.** Across 45 `graphify-strict` runs the hook denied **zero** reads, confirmed three ways: no `permissionDecision` in any transcript, no deny text, and `permission_denials` = 0 in every `result.json`. The cause is in graphify's own guard (`cli.py::_query_stamp_fresh`): strict suppresses its block while a query/explain/path ran within the last 30 minutes, and the overlay's `CLAUDE.md` already steers the agent to `graphify query` **before** its first raw `Read`. The soft nudge wins the race every time, so the strict flag is inert under this overlay — `graphify-strict` vs `graphify` is therefore a null result about a knob that never engaged, **not** evidence that forcing graph-first exploration does nothing.

**MCP retrieval tools.** The same question asked of the other retrieval mechanism.

The `mempalace` arms have no CLI to invoke, so every zero in the table above is structural for them rather than a finding. What they do have is a server exposing **45** tools, of which the nudge in `CLAUDE.md` points at exactly one. The columns below count what was actually called, and the `bytes returned` column is the efficiency claim itself: a prebuilt index only pays for itself if what it hands back is smaller than reading the files would have been.

| condition | runs | `mempalace__mempalace_search` | `mempalace__memplacem_search` | total calls | median/run | runs using | bytes returned |
|---|---|---|---|---|---|---|---|
| `haiku-mempalace` | 45 | 154 | 1 | 155 | 2 | 43/45 | 2,447,274 |
| `haiku-mempalace-v2` | 20 | 68 | **0** | 68 | 2.5 | 20/20 | 1,026,316 |
| `mempalace` | 45 | 241 | **0** | 241 | 4 | 45/45 | 4,004,248 |
| `mempalace-v2` | 20 | 131 | **0** | 131 | 6.5 | 20/20 | 1,963,417 |

> **The retrieval nudge was ignored in some runs.** `haiku-mempalace` 2/45 run(s) never called `mempalace_search` at all, despite `CLAUDE.md` telling the agent to search before grepping. Those runs are a baseline in everything but name and their tokens are still pooled into the arm, so the arm's measured effect is diluted by exactly that fraction — the same caveat the `never invoked the CLI` column records for graphify.

> **The 45 tool definitions are a fixed cost, and it is in §2.** Every `mempalace` run carries the server's full tool schema — ~32 KB of JSON, roughly 8k tokens — in its first request, whether or not it ever calls a tool. That lands in `first_turn_cache_creation`, so the fixed-overhead table in §2 is where the arms are separable on it; it is **not** subtracted from any figure in this report. Note also that these arms run with `--strict-mcp-config` while the others do not, so they are the only arms that do *not* also carry the measuring host's own MCP servers — those appear in the other arms as deferred names only, which is far cheaper than a loaded schema but not zero.

> **Cross-session memory was never measured.** `save-result`, `reflect` and `affected` are the mechanisms by which graphify is supposed to compound across sessions, and they were invoked **zero times in every arm**. Each benchmark run is a fresh corpus copy with a fresh session, so there is no second session for a saved result to pay off in — the design that would exercise them is a different experiment, not a variation of this one. The honest statement is that this benchmark measures single-session retrieval only.

## 9. Speed

> **Secondary, and noisy.** Every run in every set was measured at **concurrency 3** on a single machine, so session wall-clock includes contention this harness never controlled for and cannot quantify. Tokens and cost are properties of the measurement; durations are not. Read the session rows as an order of magnitude only.

Session timings, median (IQR) in ms:

| condition | runs | wall `duration_ms` | API `duration_api_ms` | `ttft_ms` | pre-request `time_to_request_ms` |
|---|---|---|---|---|---|
| `baseline` | 65 | 26,832 (12,921–51,734) | 51,095 (27,283–117,472) | 2,041 (1,673–2,720) | 17 (6–20) |
| `baseline-nosub` | 45 | 33,485 (15,536–58,606) | 34,165 (16,084–59,353) | 1,680 (1,543–2,704) | 18 (16–21) |
| `graphify` | 45 | 38,594 (22,199–81,513) | 38,327 (22,605–81,287) | 1,901 (1,519–2,463) | 19 (17–21) |
| `graphify-strict` | 45 | 44,277 (26,523–83,351) | 48,706 (26,186–85,475) | 2,174 (1,689–3,123) | 18 (17–20) |
| `graphify-strict-v2` | 20 | 56,406 (23,320–91,218) | 56,364 (23,589–89,951) | 1,599 (1,493–2,144) | 18 (16–20) |
| `graphify-v2` | 20 | 66,322 (22,785–87,931) | 65,977 (23,068–87,144) | 1,884 (1,497–2,130) | 20 (17–22) |
| `haiku-baseline` | 65 | 52,386 (24,919–86,854) | 53,107 (26,941–89,496) | 2,426 (2,165–2,771) | 18 (16–20) |
| `haiku-graphify` | 45 | 47,313 (29,100–70,958) | 46,333 (28,965–70,428) | 2,578 (2,306–2,848) | 18 (16–20) |
| `haiku-graphify-v2` | 20 | 49,073 (28,485–87,480) | 48,467 (28,087–86,862) | 2,313 (2,155–2,538) | 17 (16–18) |
| `haiku-mempalace` | 45 | 49,239 (33,468–82,107) | 56,896 (32,050–86,211) | 2,505 (2,155–2,789) | 17 (15–24) |
| `haiku-mempalace-v2` | 20 | 51,229 (24,810–76,214) | 51,748 (25,165–76,770) | 2,500 (2,227–2,723) | 16 (15–21) |
| `mempalace` | 45 | 49,578 (30,615–92,805) | 50,593 (31,155–93,401) | 1,689 (1,517–2,483) | 16 (15–18) |
| `mempalace-v2` | 20 | 50,041 (30,968–91,454) | 50,739 (31,566–92,069) | 2,115 (1,948–2,607) | 16 (16–19) |

`time_to_request_ms` covers everything before the first API request, which is where **MCP server startup lands**: it is the only column in which an arm that must spawn and handshake with a server can differ from one that does not. The transcript itself cannot show that cost — Claude Code connects its configured servers *before* writing the first transcript entry, so the delay between the first entry and the one advertising the server's tools collapses to a few milliseconds of bookkeeping rather than measuring the spawn.

For the record, that bookkeeping delay was `haiku-mempalace` 56 ms, `haiku-mempalace-v2` 57 ms, `mempalace` 55 ms, `mempalace-v2` 58 ms — reported so it is not mistaken for the startup cost.

Per-tool-call latency, median (IQR) in ms, pooled over calls:

| condition | `mempalace_search` | `other MCP` | `Bash(graphify)` | `Read` | `Bash` | `Agent` |
|---|---|---|---|---|---|---|
| `baseline` | – | – | – | 6 (5–9) | 44 (31–97) | 13 (8–33,667) |
| `baseline-nosub` | – | – | – | 5 (4–6) | 45 (31–113) | – |
| `graphify` | – | – | 294 (282–307) | 64 (59–70) | 90 (80–208) | – |
| `graphify-strict` | – | – | 300 (281–329) | 62 (55–66) | 95 (78–201) | 11 (11–11) |
| `graphify-strict-v2` | – | – | 338 (321–372) | 59 (53–68) | 86 (77–108) | – |
| `graphify-v2` | – | – | 343 (315–373) | 62 (56–69) | 85 (75–101) | – |
| `haiku-baseline` | – | – | – | 5 (4–6) | 43 (32–123) | 6 (5–7) |
| `haiku-graphify` | – | – | 301 (286–328) | 59 (54–66) | 121 (88–269) | – |
| `haiku-graphify-v2` | – | – | 336 (323–355) | 64 (59–68) | 91 (78–223) | – |
| `haiku-mempalace` | 43 (36–198) | 1 (1–1) | – | 6 (4–9) | 41 (28–96) | 9 (8–11) |
| `haiku-mempalace-v2` | 46 (40–168) | – | – | 7 (4–10) | 36 (26–142) | – |
| `mempalace` | 43 (36–63) | – | – | 6 (4–8) | 43 (33–189) | 87,208 (87,208–87,208) |
| `mempalace-v2` | 49 (41–66) | – | – | 8 (6–11) | 40 (33–79) | 9,855 (9,855–9,855) |

Each cell is timed from the transcript entry carrying the `tool_use` block to the entry carrying its matching `tool_result`, both written locally by the same process. Calls whose result never arrived — a run that hit its turn cap mid-call — are absent rather than counted as zero. `n` per cell is the number of calls, not the number of runs, so an arm that called a tool once contributes one observation.

**Index build cost, for scale.** graphify v1: **4.6 s** total (`update` 3.4 s + `cluster-only` 1.2 s, AST-only, no API calls). graphify v2: a comparable AST pass plus roughly **35 min** of LLM-backed document extraction. MemPalace v1: **49 s**; v2: **97 s** (embedding + indexing, `--no-llm`, no API calls). All are one-off costs paid before any run, and none is included in any figure above — they are listed only so a per-query latency can be read against what producing the index cost in the first place.

## 10. Counter-productive cases and subagent use

- `baseline`: **33** subagent(s) spawned across **31**/65 run(s). T2S all-model 386,441 vs main-session-only 192,862.
- `baseline-nosub`: **0** subagent(s) spawned across **0**/45 run(s). T2S all-model 311,808 vs main-session-only 310,813.
- `graphify`: **0** subagent(s) spawned across **0**/45 run(s). T2S all-model 429,005 vs main-session-only 428,008.
- `graphify-strict`: **1** subagent(s) spawned across **1**/45 run(s). T2S all-model 414,500 vs main-session-only 386,497.
- `graphify-strict-v2`: **0** subagent(s) spawned across **0**/20 run(s). T2S all-model 453,066 vs main-session-only 452,071.
- `graphify-v2`: **0** subagent(s) spawned across **0**/20 run(s). T2S all-model 502,286 vs main-session-only 501,285.
- `haiku-baseline`: **3** subagent(s) spawned across **2**/65 run(s). T2S all-model 624,387 vs main-session-only 611,771.
- `haiku-graphify`: **0** subagent(s) spawned across **0**/45 run(s). T2S all-model 491,331 vs main-session-only 490,335.
- `haiku-graphify-v2`: **0** subagent(s) spawned across **0**/20 run(s). T2S all-model 439,640 vs main-session-only 438,645.
- `haiku-mempalace`: **2** subagent(s) spawned across **2**/45 run(s). T2S all-model 676,983 vs main-session-only 649,058.
- `haiku-mempalace-v2`: **0** subagent(s) spawned across **0**/20 run(s). T2S all-model 606,265 vs main-session-only 605,265.
- `mempalace`: **1** subagent(s) spawned across **1**/45 run(s). T2S all-model 556,835 vs main-session-only 545,886.
- `mempalace-v2`: **1** subagent(s) spawned across **1**/20 run(s). T2S all-model 408,343 vs main-session-only 407,344.
- Runs that opened `graphify-out/graph.json` directly: **19** (`EXP3-digest-pipeline__graphify__r1`, `IMP2-rename-issue-created__graphify__r1`, `XFIX2-mention-inside-code__graphify__r1`, `XREF5-rate-limit-importers__graphify__r1`, `LOC3-digest-window__graphify-strict__r1`, `REF3-issue-created-subscribers__graphify-strict__r1`, `XEXP2-invitation-lifecycle__graphify-strict__r1`, `XLOC3-issue-number-allocation__graphify-strict__r1`, `XLOC3-issue-number-allocation__haiku-graphify__r1`, `XLOC4-session-lifetime__graphify-strict__r1`, `XLOC6-menu-entry-visibility__graphify-strict__r1`, `XREF2-emit-callers__haiku-graphify__r1`, `XREF3-isenabled-callers__graphify-strict__r1`, `DIMP2-job-cadence-table__graphify-v2__r1`, `DIMP2-job-cadence-table__haiku-graphify-v2__r1`, `DREF1-webhook-service-requirements__graphify-strict-v2__r1`, `DREF1-webhook-service-requirements__graphify-v2__r1`, `DREF2-digest-cadence-adrs__graphify-strict-v2__r1`, `DREF4-adr017-references__graphify-v2__r1`)
- graphify-condition runs that never invoked the `graphify` CLI (nudge ignored): **45** (`EXP1-issue-create-flow__mempalace__r1`, `EXP2-comment-mention-notify__mempalace__r1`, `EXP3-digest-pipeline__mempalace__r1`, `FIX1-issue-tenant-leak__mempalace__r1`, `FIX2-project-quota-off-by-one__mempalace__r1`, `FIX3-board-shows-archived__mempalace__r1`, `IMP1-planlimits-field__mempalace__r1`, `IMP2-rename-issue-created__mempalace__r1`, `IMP3-limited-resource-union__mempalace__r1`, `LOC1-shortcut-match__mempalace__r1`, `LOC2-webhook-plan-cap__mempalace__r1`, `LOC3-digest-window__mempalace__r1`, `REF1-assertcan-callers__mempalace__r1`, `REF2-would-exceed-limit-callers__mempalace__r1`, `REF3-issue-created-subscribers__mempalace__r1`, `XEXP1-webhook-delivery__mempalace__r1`, `XEXP2-invitation-lifecycle__mempalace__r1`, `XEXP3-plan-change__mempalace__r1`, `XEXP4-signin-to-actor__mempalace__r1`, `XEXP5-search-index__mempalace__r1`, `XEXP6-overdue-sweep__mempalace__r1`, `XFIX1-csv-quote-escape__mempalace__r1`, `XFIX2-mention-inside-code__mempalace__r1`, `XFIX3-last-owner-removable__mempalace__r1`, `XFIX4-advanced-search-inverted__mempalace__r1`, `XFIX5-self-notification__mempalace__r1`, `XFIX6-revoked-invite-accepted__mempalace__r1`, `XIMP1-role-union__mempalace__r1`, `XIMP2-rename-comment-created__mempalace__r1`, `XIMP3-issue-status-union__mempalace__r1`, `XIMP4-feature-flag-key-union__mempalace__r1`, `XIMP5-plan-id-union__mempalace__r1`, `XIMP6-limit-check-field__mempalace__r1`, `XLOC1-retry-throttle__mempalace__r1`, `XLOC2-invite-link-validity__mempalace__r1`, `XLOC3-issue-number-allocation__mempalace__r1`, `XLOC4-session-lifetime__mempalace__r1`, `XLOC5-delivery-retry-policy__mempalace__r1`, `XLOC6-menu-entry-visibility__mempalace__r1`, `XREF1-assertorgscope-callers__mempalace__r1`, `XREF2-emit-callers__mempalace__r1`, `XREF3-isenabled-callers__mempalace__r1`, `XREF4-comment-created-subscribers__mempalace__r1`, `XREF5-rate-limit-importers__mempalace__r1`, `XREF6-member-joined-repositories__mempalace__r1`)

## 11. Failed and ungraded runs

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
| `DDIS1-permissions-and-role-gates__haiku-mempalace-v2__r1` | haiku-mempalace-v2 | DDIS1-permissions-and-role-gates | false | completed |
| `DDIS2-time-and-retry-constants__mempalace-v2__r1` | mempalace-v2 | DDIS2-time-and-retry-constants | false | completed |
| `DDIS4-quotas-flags-and-rate-limits__haiku-mempalace-v2__r1` | haiku-mempalace-v2 | DDIS4-quotas-flags-and-rate-limits | false | completed |
| `DDIS4-quotas-flags-and-rate-limits__mempalace-v2__r1` | mempalace-v2 | DDIS4-quotas-flags-and-rate-limits | false | completed |
| `DIMP1-error-code-union__haiku-mempalace-v2__r1` | haiku-mempalace-v2 | DIMP1-error-code-union | false | completed |
| `DIMP1-error-code-union__mempalace-v2__r1` | mempalace-v2 | DIMP1-error-code-union | false | completed |
| `DIMP2-job-cadence-table__haiku-mempalace-v2__r1` | haiku-mempalace-v2 | DIMP2-job-cadence-table | false | completed |
| `DIMP2-job-cadence-table__mempalace-v2__r1` | mempalace-v2 | DIMP2-job-cadence-table | false | completed |
| `DIMP3-notification-kind-union__haiku-mempalace-v2__r1` | haiku-mempalace-v2 | DIMP3-notification-kind-union | false | completed |
| `DIMP3-notification-kind-union__mempalace-v2__r1` | mempalace-v2 | DIMP3-notification-kind-union | false | completed |
| `DIMP4-req157-renumber__mempalace-v2__r1` | mempalace-v2 | DIMP4-req157-renumber | false | completed |
| `DLOC3-subscriber-isolation__haiku-mempalace-v2__r1` | haiku-mempalace-v2 | DLOC3-subscriber-isolation | false | completed |
| `DREF1-webhook-service-requirements__haiku-mempalace-v2__r1` | haiku-mempalace-v2 | DREF1-webhook-service-requirements | false | completed |
| `DREF1-webhook-service-requirements__mempalace-v2__r1` | mempalace-v2 | DREF1-webhook-service-requirements | false | completed |
| `DREF3-permission-matrix-verified-by__haiku-mempalace-v2__r1` | haiku-mempalace-v2 | DREF3-permission-matrix-verified-by | false | completed |
| `DREF4-adr017-references__haiku-mempalace-v2__r1` | haiku-mempalace-v2 | DREF4-adr017-references | false | completed |
| `DREF4-adr017-references__mempalace-v2__r1` | mempalace-v2 | DREF4-adr017-references | false | completed |
| `IMP2-rename-issue-created__haiku-mempalace__r1` | haiku-mempalace | IMP2-rename-issue-created | false | completed |
| `IMP2-rename-issue-created__mempalace__r1` | mempalace | IMP2-rename-issue-created | false | completed |
| `LOC2-webhook-plan-cap__haiku-mempalace__r1` | haiku-mempalace | LOC2-webhook-plan-cap | false | completed |
| `LOC2-webhook-plan-cap__mempalace__r1` | mempalace | LOC2-webhook-plan-cap | false | completed |
| `LOC3-digest-window__haiku-mempalace__r1` | haiku-mempalace | LOC3-digest-window | false | completed |
| `LOC3-digest-window__mempalace__r1` | mempalace | LOC3-digest-window | false | completed |
| `REF2-would-exceed-limit-callers__haiku-mempalace__r1` | haiku-mempalace | REF2-would-exceed-limit-callers | false | completed |
| `XFIX5-self-notification__mempalace__r1` | mempalace | XFIX5-self-notification | false | completed |
| `XIMP1-role-union__haiku-mempalace__r1` | haiku-mempalace | XIMP1-role-union | false | completed |
| `XIMP1-role-union__mempalace__r1` | mempalace | XIMP1-role-union | false | completed |
| `XIMP2-rename-comment-created__haiku-mempalace__r1` | haiku-mempalace | XIMP2-rename-comment-created | false | completed |
| `XIMP2-rename-comment-created__mempalace__r1` | mempalace | XIMP2-rename-comment-created | false | completed |
| `XIMP5-plan-id-union__haiku-mempalace__r1` | haiku-mempalace | XIMP5-plan-id-union | false | completed |
| `XIMP5-plan-id-union__mempalace__r1` | mempalace | XIMP5-plan-id-union | false | completed |
| `XIMP6-limit-check-field__haiku-mempalace__r1` | haiku-mempalace | XIMP6-limit-check-field | false | completed |
| `XIMP6-limit-check-field__mempalace__r1` | mempalace | XIMP6-limit-check-field | false | completed |
| `XLOC5-delivery-retry-policy__haiku-mempalace__r1` | haiku-mempalace | XLOC5-delivery-retry-policy | false | completed |
| `XLOC6-menu-entry-visibility__mempalace__r1` | mempalace | XLOC6-menu-entry-visibility | false | completed |
| `XREF5-rate-limit-importers__haiku-mempalace__r1` | haiku-mempalace | XREF5-rate-limit-importers | false | completed |
| `XREF6-member-joined-repositories__haiku-mempalace__r1` | haiku-mempalace | XREF6-member-joined-repositories | false | completed |

## 12. Per-set breakdown (drift between measurement sets)

The two task sets were authored separately. Pooling them is only legitimate if they behave alike, so each set is re-analysed on its own here: a large gap between the two blocks means the pooled numbers above are averaging over a real difference in task design, not just sampling noise.

### set `docs` — 100 runs over 20 tasks

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 20 | **318,144** (208,381–869,934) | 151,516 | 0.256 | 5.0 | 10 in 8 run(s) | 27 | 0 | 0 | 93 | 0 | 70.0% (14/20) | 367,328 |
| graphify-strict-v2 | 20 | **456,468** (228,101–667,047) | 455,427 | 0.286 | 12.0 | 0 in 0 run(s) | 74 | 0 | 0 | 135 | 36 | 70.0% (14/20) | 453,066 |
| graphify-v2 | 20 | **443,863** (205,549–734,775) | 442,839 | 0.283 | 12.5 | 0 in 0 run(s) | 63 | 0 | 0 | 146 | 38 | 80.0% (16/20) | 502,286 |
| haiku-baseline | 20 | **634,043** (153,893–839,805) | 582,590 | 0.167 | 14.0 | 1 in 1 run(s) | 122 | 0 | 0 | 154 | 0 | 80.0% (16/20) | 631,724 |
| haiku-graphify-v2 | 20 | **440,614** (161,348–897,862) | 439,649 | 0.127 | 12.5 | 0 in 0 run(s) | 123 | 0 | 0 | 78 | 41 | 75.0% (15/20) | 439,640 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 0 | – | [–, –] | – | n too small |
| uncached_equivalent | 0 | – | [–, –] | – | n too small |
| total_cost_usd | 0 | – | [–, –] | – | n too small |
| num_turns | 0 | – | [–, –] | – | n too small |

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

### set `mempalace` — 130 runs over 65 tasks

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| haiku-mempalace | 45 | **497,712** (200,238–959,939) | 462,057 | 0.154 | 12.0 | 2 in 2 run(s) | 206 | 0 | 0 | 160 | 0 | 75.6% (34/45) | 676,983 |
| haiku-mempalace-v2 | 20 | **430,577** (118,174–686,342) | 429,608 | 0.133 | 10.5 | 0 in 0 run(s) | 112 | 0 | 0 | 35 | 0 | 55.0% (11/20) | 606,265 |
| mempalace | 45 | **456,481** (227,888–723,818) | 449,651 | 0.360 | 11.0 | 1 in 1 run(s) | 134 | 0 | 0 | 61 | 0 | 80.0% (36/45) | 556,835 |
| mempalace-v2 | 20 | **385,812** (325,372–575,918) | 384,811 | 0.372 | 11.0 | 1 in 1 run(s) | 33 | 0 | 0 | 22 | 0 | 60.0% (12/20) | 408,343 |

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

## 13. Deliberately-easy controls vs the rest

Some tasks were written as **designed zero-advantage controls**: their answer is reproduced exactly by a single literal `grep`, so a structural index has nothing to add and the expected effect is zero or negative. They are marked `DELIBERATELY EASY` in the task notes and are separated out here so they neither flatter nor drag the headline number. Easy tasks: `DIMP4-req157-renumber`, `DREF4-adr017-references`, `IMP2-rename-issue-created`, `LOC1-shortcut-match`, `XIMP2-rename-comment-created`, `XLOC1-retry-throttle`, `XREF5-rate-limit-importers`.

### easy (zero-advantage controls) — 54 runs over 7 tasks

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 7 | **121,327** (121,126–156,875) | 120,276 | 0.087 | 4.0 | 1 in 1 run(s) | 6 | 0 | 0 | 22 | 0 | 71.4% (5/7) | 197,054 |
| baseline-nosub | 5 | **80,302** (79,836–107,441) | 79,317 | 0.072 | 4.0 | 0 in 0 run(s) | 6 | 0 | 0 | 14 | 0 | 60.0% (3/5) | 163,665 |
| graphify | 5 | **160,029** (141,551–240,807) | 159,058 | 0.116 | 6.0 | 0 in 0 run(s) | 4 | 0 | 0 | 16 | 6 | 60.0% (3/5) | 226,858 |
| graphify-strict | 5 | **166,765** (133,014–206,080) | 165,794 | 0.129 | 5.0 | 0 in 0 run(s) | 3 | 0 | 0 | 16 | 5 | 60.0% (3/5) | 194,847 |
| graphify-strict-v2 | 2 | **253,078** (243,589–262,566) | 252,103 | 0.152 | 7.5 | 0 in 0 run(s) | 0 | 0 | 0 | 11 | 2 | 100.0% (2/2) | 253,078 |
| graphify-v2 | 2 | **202,146** (199,875–204,416) | 201,171 | 0.127 | 6.0 | 0 in 0 run(s) | 0 | 0 | 0 | 8 | 2 | 100.0% (2/2) | 202,146 |
| haiku-baseline | 7 | **92,281** (73,626–149,587) | 91,296 | 0.048 | 4.0 | 0 in 0 run(s) | 7 | 0 | 0 | 30 | 0 | 71.4% (5/7) | 179,918 |
| haiku-graphify | 5 | **102,483** (98,518–125,223) | 101,512 | 0.049 | 4.0 | 0 in 0 run(s) | 4 | 0 | 0 | 10 | 6 | 60.0% (3/5) | 140,655 |
| haiku-graphify-v2 | 2 | **102,776** (102,755–102,796) | 101,801 | 0.051 | 4.0 | 0 in 0 run(s) | 0 | 0 | 0 | 4 | 2 | 100.0% (2/2) | 102,776 |
| haiku-mempalace | 5 | **122,663** (106,008–305,223) | 121,692 | 0.050 | 5.0 | 0 in 0 run(s) | 3 | 0 | 0 | 5 | 0 | 40.0% (2/5) | 89,638 |
| haiku-mempalace-v2 | 2 | **188,878** (154,708–223,047) | 187,903 | 0.097 | 7.0 | 0 in 0 run(s) | 3 | 0 | 0 | 5 | 0 | 50.0% (1/2) | 257,217 |
| mempalace | 5 | **227,888** (172,651–241,509) | 226,919 | 0.192 | 6.0 | 0 in 0 run(s) | 2 | 0 | 0 | 7 | 0 | 60.0% (3/5) | 165,758 |
| mempalace-v2 | 2 | **418,607** (384,935–452,280) | 417,633 | 0.458 | 9.5 | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | 0.0% (0/2) | – |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 5 | 21,942.6 | [-95,207.8, 131,934.2] | 50.2% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 5 | 41,245.2 | [-90,980.0, 151,236.8] | 82.8% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 5 | 0.0538 | [0.0082, 0.0995] | 65.6% | mempalace higher |
| num_turns | 5 | 0.4 | [-2.8, 3.0] | 48.7% | **CI crosses 0 — no detectable difference** |

### rest — 446 runs over 58 tasks

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 58 | **279,142** (224,649–623,817) | 153,413 | 0.218 | 5.0 | 32 in 30 run(s) | 89 | 0 | 0 | 177 | 0 | 81.0% (47/58) | 406,588 |
| baseline-nosub | 40 | **233,554** (144,366–382,636) | 232,574 | 0.144 | 8.0 | 0 in 0 run(s) | 164 | 0 | 0 | 218 | 0 | 87.5% (35/40) | 324,506 |
| graphify | 40 | **319,452** (212,223–488,364) | 318,448 | 0.205 | 9.5 | 0 in 0 run(s) | 187 | 0 | 0 | 192 | 77 | 80.0% (32/40) | 447,956 |
| graphify-strict | 40 | **326,350** (204,604–508,983) | 301,360 | 0.201 | 9.0 | 1 in 1 run(s) | 138 | 0 | 0 | 200 | 78 | 80.0% (32/40) | 435,092 |
| graphify-strict-v2 | 18 | **526,994** (233,567–760,937) | 525,957 | 0.312 | 12.0 | 0 in 0 run(s) | 74 | 0 | 0 | 124 | 34 | 66.7% (12/18) | 486,397 |
| graphify-v2 | 18 | **505,270** (227,710–752,219) | 504,259 | 0.319 | 15.5 | 0 in 0 run(s) | 63 | 0 | 0 | 138 | 36 | 77.8% (14/18) | 545,164 |
| haiku-baseline | 58 | **583,584** (211,562–843,996) | 526,306 | 0.151 | 15.0 | 3 in 2 run(s) | 393 | 0 | 0 | 474 | 0 | 81.0% (47/58) | 671,671 |
| haiku-graphify | 40 | **390,476** (229,454–552,878) | 389,503 | 0.111 | 12.0 | 0 in 0 run(s) | 225 | 0 | 0 | 145 | 93 | 85.0% (34/40) | 522,273 |
| haiku-graphify-v2 | 18 | **607,129** (227,758–941,959) | 606,164 | 0.149 | 16.0 | 0 in 0 run(s) | 123 | 0 | 0 | 74 | 39 | 72.2% (13/18) | 491,465 |
| haiku-mempalace | 40 | **521,490** (241,861–1,052,288) | 513,754 | 0.160 | 13.0 | 2 in 2 run(s) | 203 | 0 | 0 | 155 | 0 | 80.0% (32/40) | 713,692 |
| haiku-mempalace-v2 | 18 | **477,076** (135,267–715,059) | 476,111 | 0.150 | 12.0 | 0 in 0 run(s) | 109 | 0 | 0 | 30 | 0 | 55.6% (10/18) | 641,170 |
| mempalace | 40 | **476,970** (246,702–751,106) | 463,952 | 0.396 | 11.5 | 1 in 1 run(s) | 132 | 0 | 0 | 54 | 0 | 82.5% (33/40) | 592,387 |
| mempalace-v2 | 18 | **385,812** (275,102–591,165) | 384,811 | 0.364 | 11.5 | 1 in 1 run(s) | 33 | 0 | 0 | 22 | 0 | 66.7% (12/18) | 408,343 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 40 | 188,877.5 | [78,966.7, 316,004.4] | 79.5% | mempalace higher |
| uncached_equivalent | 40 | 390,399.3 | [261,215.8, 537,604.7] | 451.1% | mempalace higher |
| total_cost_usd | 40 | 0.1468 | [0.0784, 0.2183] | 83.9% | mempalace higher |
| num_turns | 40 | 7.5 | [4.9, 10.2] | 296.6% | mempalace higher |

## 14. Limitations

- N = 500 runs over 65 tasks; a single corpus and a single model. These results do not generalize to other codebases or models.
- Bootstrap resamples tasks, so the interval reflects task-to-task variation, not within-task run noise.
- Where a CI crosses zero the honest reading is "no difference detected at this N", not "no difference exists".
- The fixed ~21k-token system-prompt/tool-definition overhead is included in both arms and not subtracted (see §2).
- **1 repetition per (task × condition)**: within-task run-to-run variance is unmeasured, so any single per-task difference may be run noise.
- Subagent traffic is counted in `uncached_all`, but a subagent's tool calls never reach the parent transcript, so the tool-call columns stay main-session-only.
- Raw per-run data lives in `results/runs/<run-id>/`, `results/ext/runs/<run-id>/`, `results/structural/runs/<run-id>/`, `results/docs/runs/<run-id>/`, `results/mempalace/runs/<run-id>/` and the `summary.csv` beside this report.
