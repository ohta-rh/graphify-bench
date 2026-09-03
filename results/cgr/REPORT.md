# graphify-bench results

Generated 2026-09-03T09:43:43.738Z. 630 runs over 65 tasks, conditions: baseline, baseline-nosub, cgr, cgr-v2, graphify, graphify-strict, graphify-strict-v2, graphify-v2, haiku-baseline, haiku-cgr, haiku-cgr-v2, haiku-graphify, haiku-graphify-v2, haiku-mempalace, haiku-mempalace-v2, mempalace, mempalace-v2.

## 1. Environment

- Claude Code: `2.1.258 (Claude Code)`
- graphify: `graphify 0.9.53`
- Node: `v25.5.0` / pnpm `10.28.2`
- Platform: `darwin 25.2.0 arm64`
- Model: `claude-sonnet-5`, effort `high`, --max-turns 60, --max-budget-usd 4

- Bootstrap: B=2000, percentile 95% CI, seed `graphify-bench-bootstrap`, resampled over **tasks**.
- Corpus: `corpus-v1+v2`, tree hash (sha256) `4148d9b26fb31b95ab8424af1f88cfc7741bb655b3ad3bbb557a8c3c516c12da` (source: `docs/plan/CORPUS.md`). That hash pins `src`+`tests`, which `corpus-v1+v2` leaves frozen; its addition is the `docs/` layer, hashed the same way: `2f3392342f9a9745dbc2868eeb6e11cebdc17837d9cbbef078eef594db9c9b64`.
- Report generated: 2026-09-03.

The `Model` line above is the harness default; arms that override it are listed here. Every field comes from the run's own `run.meta.json`, not from the report's assumptions.

| condition | model | overlays | extra `claude` args | what it isolates |
|---|---|---|---|---|
| `baseline` | `claude-sonnet-5` | `baseline` | – | No graph, no hooks — the reference arm. Corpus-independent: it ships no graph, so it reads whatever corpus generation it is run against, docs included. |
| `baseline-nosub` | `claude-sonnet-5` | `baseline` | `--disallowedTools Agent` | Baseline with the Agent tool removed, so it cannot delegate exploration to a subagent — isolates how much of baseline's efficiency is the subagent rather than the flat search. |
| `cgr` | `claude-sonnet-5` | `cgr` | `--disallowedTools mcp__code-graph-rag__ask_agent,mcp__code-graph-rag__query_code_graph,mcp__code-graph-rag__index_repository,mcp__code-graph-rag__update_repository,mcp__code-graph-rag__reingest,mcp__code-graph-rag__wipe_database,mcp__code-graph-rag__delete_project,mcp__code-graph-rag__surgical_replace_code,mcp__code-graph-rag__write_file,mcp__code-graph-rag__structural_replace,mcp__code-graph-rag__read_file,mcp__code-graph-rag__list_directory` | A third index shape: a Tree-sitter AST graph in a Memgraph database instead of a JSON file (graphify) or embedded text chunks (mempalace), reached through nine LLM-free, read-only MCP tools over the code-only corpus. `ask_agent` / `query_code_graph` (the tool's NL->Cypher path) and every write/mutate tool are disallowed — reference arms for both `graphify` and `mempalace`. |
| `cgr-v2` | `claude-sonnet-5` | `cgr-v2` | `--disallowedTools mcp__code-graph-rag__ask_agent,mcp__code-graph-rag__query_code_graph,mcp__code-graph-rag__index_repository,mcp__code-graph-rag__update_repository,mcp__code-graph-rag__reingest,mcp__code-graph-rag__wipe_database,mcp__code-graph-rag__delete_project,mcp__code-graph-rag__surgical_replace_code,mcp__code-graph-rag__write_file,mcp__code-graph-rag__structural_replace,mcp__code-graph-rag__read_file,mcp__code-graph-rag__list_directory` | `cgr` over code AND the 139-file documentation layer (corpus-v2): code-graph-rag indexes Markdown as `Section` nodes per heading, so the doc-vs-code task set is meaningful here too. Reference arms are `graphify-v2` and `mempalace-v2`. |
| `graphify-strict` | `claude-sonnet-5` | `graphify` + `graphify-strict` | – | Same as `graphify`, but the Read\|Glob hook runs `hook-guard read --strict`: the first raw Read of an indexed in-project source file per session is DENIED and redirected to `graphify query`. |
| `graphify-strict-v2` | `claude-sonnet-5` | `graphify-v2` + `graphify-strict-v2` | – | `graphify-v2` with the Read\|Glob hook switched to `hook-guard read --strict`, so the first raw Read of an indexed file is DENIED and redirected to `graphify query`. A delta overlay: it ships only the settings file and inherits the multi-megabyte graph from `graphify-v2`. |
| `graphify-v2` | `claude-sonnet-5` | `graphify-v2` | – | graphify over code AND the 139-file documentation layer (corpus-v2). Same skill, CLAUDE.md and nudge hooks as `graphify`; the graph adds doc nodes and doc->code traceability edges, which is what the doc-vs-code task set measures. |
| `haiku-baseline` | `claude-haiku-4-5` | `baseline` | – | Baseline run by a weaker explorer. |
| `haiku-cgr` | `claude-haiku-4-5` | `cgr` | `--disallowedTools mcp__code-graph-rag__ask_agent,mcp__code-graph-rag__query_code_graph,mcp__code-graph-rag__index_repository,mcp__code-graph-rag__update_repository,mcp__code-graph-rag__reingest,mcp__code-graph-rag__wipe_database,mcp__code-graph-rag__delete_project,mcp__code-graph-rag__surgical_replace_code,mcp__code-graph-rag__write_file,mcp__code-graph-rag__structural_replace,mcp__code-graph-rag__read_file,mcp__code-graph-rag__list_directory` | `cgr` run by a weaker explorer — its reference arm is `haiku-baseline`. |
| `haiku-cgr-v2` | `claude-haiku-4-5` | `cgr-v2` | `--disallowedTools mcp__code-graph-rag__ask_agent,mcp__code-graph-rag__query_code_graph,mcp__code-graph-rag__index_repository,mcp__code-graph-rag__update_repository,mcp__code-graph-rag__reingest,mcp__code-graph-rag__wipe_database,mcp__code-graph-rag__delete_project,mcp__code-graph-rag__surgical_replace_code,mcp__code-graph-rag__write_file,mcp__code-graph-rag__structural_replace,mcp__code-graph-rag__read_file,mcp__code-graph-rag__list_directory` | `cgr-v2` run by a weaker explorer — its reference arm is `haiku-baseline`. |
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
| cgr | 45 | **377,788** (230,828–552,458) | 346,483 | 0.205 | 14.0 | 2 in 2 run(s) | 175 | 0 | 0 | 144 | 0 | 82.2% (37/45) | 489,919 |
| cgr-v2 | 20 | **488,624** (259,832–676,437) | 487,628 | 0.268 | 16.5 | 1 in 1 run(s) | 82 | 0 | 0 | 97 | 0 | 75.0% (15/20) | 415,464 |
| graphify | 45 | **288,502** (197,852–481,415) | 287,545 | 0.191 | 9.0 | 0 in 0 run(s) | 191 | 0 | 0 | 208 | 83 | 77.8% (35/45) | 429,005 |
| graphify-strict | 45 | **288,533** (181,403–463,327) | 286,953 | 0.186 | 8.0 | 1 in 1 run(s) | 141 | 0 | 0 | 216 | 83 | 77.8% (35/45) | 414,500 |
| graphify-strict-v2 | 20 | **456,468** (228,101–667,047) | 455,427 | 0.286 | 12.0 | 0 in 0 run(s) | 74 | 0 | 0 | 135 | 36 | 70.0% (14/20) | 453,066 |
| graphify-v2 | 20 | **443,863** (205,549–734,775) | 442,839 | 0.283 | 12.5 | 0 in 0 run(s) | 63 | 0 | 0 | 146 | 38 | 80.0% (16/20) | 502,286 |
| haiku-baseline | 65 | **526,174** (159,352–774,139) | 501,991 | 0.131 | 14.0 | 3 in 2 run(s) | 400 | 0 | 0 | 504 | 0 | 80.0% (52/65) | 624,387 |
| haiku-cgr | 45 | **450,644** (222,904–718,688) | 365,825 | 0.116 | 16.0 | 5 in 5 run(s) | 238 | 0 | 0 | 173 | 0 | 72.7% (32/44) | 696,575 |
| haiku-cgr-v2 | 20 | **669,144** (424,694–1,131,236) | 668,131 | 0.171 | 19.0 | 2 in 2 run(s) | 144 | 0 | 0 | 139 | 0 | 75.0% (15/20) | 789,769 |
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
| cgr | 10,488 |
| cgr-v2 | 10,510 |
| graphify | 10,943 |
| graphify-strict | 10,935 |
| graphify-strict-v2 | 10,934 |
| graphify-v2 | 10,936 |
| haiku-baseline | 8,013 |
| haiku-cgr | 8,155 |
| haiku-cgr-v2 | 8,165 |
| haiku-graphify | 8,438 |
| haiku-graphify-v2 | 8,430 |
| haiku-mempalace | 8,627 |
| haiku-mempalace-v2 | 8,640 |
| mempalace | 11,108 |
| mempalace-v2 | 11,124 |

## 3. Paired difference (cgr − baseline), all tasks

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | 95,372.7 | [47,819.3, 145,624.6] | 39.5% | cgr higher |
| uncached_equivalent | 45 | 282,185.0 | [192,364.2, 389,001.9] | 335.6% | cgr higher |
| total_cost_usd | 45 | 0.0033 | [-0.0220, 0.0295] | 15.4% | **CI crosses 0 — no detectable difference** |
| num_turns | 45 | 12.3 | [8.8, 16.3] | 449.5% | cgr higher |

> **Why the two token rows disagree.** Subagent use is asymmetric between the arms (baseline 31/65 runs, cgr 2/45). `uncached_equivalent` cannot see a subagent's tokens, so it charges that work to nobody and makes the subagent-spawning arm look cheap; `uncached_equivalent_all` counts it. **Read the `_all` row** — the main-only row is retained only to show the size of the distortion.

## 4. Iso-accuracy subset

Tasks where every graded run of both conditions succeeded (36/65): `EXP1-issue-create-flow`, `EXP2-comment-mention-notify`, `EXP3-digest-pipeline`, `FIX1-issue-tenant-leak`, `FIX2-project-quota-off-by-one`, `FIX3-board-shows-archived`, `IMP1-planlimits-field`, `IMP3-limited-resource-union`, `LOC1-shortcut-match`, `REF1-assertcan-callers`, `REF2-would-exceed-limit-callers`, `REF3-issue-created-subscribers`, `XEXP1-webhook-delivery`, `XEXP2-invitation-lifecycle`, `XEXP3-plan-change`, `XEXP4-signin-to-actor`, `XEXP5-search-index`, `XEXP6-overdue-sweep`, `XFIX1-csv-quote-escape`, `XFIX2-mention-inside-code`, `XFIX3-last-owner-removable`, `XFIX4-advanced-search-inverted`, `XFIX6-revoked-invite-accepted`, `XIMP3-issue-status-union`, `XIMP4-feature-flag-key-union`, `XLOC1-retry-throttle`, `XLOC2-invite-link-validity`, `XLOC3-issue-number-allocation`, `XLOC5-delivery-retry-policy`, `XLOC6-menu-entry-visibility`, `XREF1-assertorgscope-callers`, `XREF2-emit-callers`, `XREF3-isenabled-callers`, `XREF4-comment-created-subscribers`, `XREF5-rate-limit-importers`, `XREF6-member-joined-repositories`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 36 | **272,859** (222,573–563,188) | 153,413 | 0.210 | 5.0 | 20 in 20 run(s) | 58 | 0 | 0 | 85 | 0 | 100.0% (36/36) | 404,699 |
| baseline-nosub | 36 | **238,930** (133,843–382,636) | 237,935 | 0.147 | 8.0 | 0 in 0 run(s) | 159 | 0 | 0 | 198 | 0 | 100.0% (36/36) | 315,413 |
| cgr | 36 | **413,294** (254,082–658,074) | 393,116 | 0.247 | 15.0 | 2 in 2 run(s) | 158 | 0 | 0 | 123 | 0 | 100.0% (36/36) | 497,363 |
| cgr-v2 | 0 | **–** (–––) | – | – | – | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | – (0/0) | – |
| graphify | 36 | **319,452** (191,853–496,443) | 318,448 | 0.205 | 9.0 | 0 in 0 run(s) | 183 | 0 | 0 | 165 | 69 | 97.2% (35/36) | 429,005 |
| graphify-strict | 36 | **338,812** (204,604–552,570) | 318,492 | 0.194 | 9.0 | 1 in 1 run(s) | 134 | 0 | 0 | 184 | 71 | 94.4% (34/36) | 422,859 |
| graphify-strict-v2 | 0 | **–** (–––) | – | – | – | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | – (0/0) | – |
| graphify-v2 | 0 | **–** (–––) | – | – | – | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | – (0/0) | – |
| haiku-baseline | 36 | **527,298** (254,359–881,386) | 517,304 | 0.132 | 16.0 | 2 in 1 run(s) | 246 | 0 | 0 | 304 | 0 | 91.7% (33/36) | 641,829 |
| haiku-cgr | 36 | **467,829** (242,101–821,836) | 411,380 | 0.117 | 16.0 | 5 in 5 run(s) | 183 | 0 | 0 | 145 | 0 | 86.1% (31/36) | 715,265 |
| haiku-cgr-v2 | 0 | **–** (–––) | – | – | – | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | – (0/0) | – |
| haiku-graphify | 36 | **390,476** (236,924–552,878) | 389,503 | 0.111 | 12.0 | 0 in 0 run(s) | 198 | 0 | 0 | 136 | 82 | 97.2% (35/36) | 499,141 |
| haiku-graphify-v2 | 0 | **–** (–––) | – | – | – | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | – (0/0) | – |
| haiku-mempalace | 36 | **515,542** (241,861–982,074) | 502,242 | 0.161 | 12.5 | 2 in 2 run(s) | 181 | 0 | 0 | 110 | 0 | 88.9% (32/36) | 711,528 |
| haiku-mempalace-v2 | 0 | **–** (–––) | – | – | – | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | – (0/0) | – |
| mempalace | 36 | **464,935** (245,984–751,106) | 456,399 | 0.381 | 11.0 | 1 in 1 run(s) | 122 | 0 | 0 | 47 | 0 | 97.2% (35/36) | 569,913 |
| mempalace-v2 | 0 | **–** (–––) | – | – | – | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | – (0/0) | – |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 36 | 92,664.3 | [33,650.0, 152,596.9] | 31.0% | cgr higher |
| uncached_equivalent | 36 | 313,636.1 | [198,984.4, 442,506.9] | 386.8% | cgr higher |
| total_cost_usd | 36 | -0.0039 | [-0.0368, 0.0272] | 10.3% | **CI crosses 0 — no detectable difference** |
| num_turns | 36 | 13.8 | [9.4, 18.4] | 525.2% | cgr higher |

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
| uncached_equivalent_all | 9 | 168,993.4 | [43,272.4, 296,326.7] | 28.8% | cgr higher |
| uncached_equivalent | 9 | 752,605.3 | [555,904.9, 1,019,520.9] | 1024.2% | cgr higher |
| total_cost_usd | 9 | -0.0492 | [-0.1096, 0.0059] | -8.9% | **CI crosses 0 — no detectable difference** |
| num_turns | 9 | 33.1 | [27.0, 39.7] | 1425.8% | cgr higher |

### fix (9 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | 119,142.1 | [-7,396.5, 245,623.1] | 41.7% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 9 | 304,042.8 | [134,638.7, 517,455.8] | 237.5% | cgr higher |
| total_cost_usd | 9 | 0.0114 | [-0.0704, 0.0846] | 24.3% | **CI crosses 0 — no detectable difference** |
| num_turns | 9 | 11.4 | [6.4, 17.1] | 270.6% | cgr higher |

### impact (13 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | 132,917.8 | [54,230.2, 213,434.5] | 77.5% | cgr higher |
| uncached_equivalent | 9 | 156,091.4 | [92,443.1, 221,942.9] | 107.7% | cgr higher |
| total_cost_usd | 9 | 0.0746 | [0.0269, 0.1259] | 60.5% | cgr higher |
| num_turns | 9 | 6.9 | [4.6, 9.4] | 146.0% | cgr higher |

### locate (13 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | 28,758.6 | [-20,192.7, 104,106.4] | 25.3% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 9 | 127,440.6 | [70,794.1, 179,914.7] | 154.0% | cgr higher |
| total_cost_usd | 9 | -0.0250 | [-0.0518, 0.0101] | -9.0% | **CI crosses 0 — no detectable difference** |
| num_turns | 9 | 5.3 | [2.7, 8.2] | 184.4% | cgr higher |

### reference (13 tasks)

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 9 | 27,051.8 | [-71,547.7, 114,430.5] | 24.0% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 9 | 70,744.8 | [-40,116.5, 162,551.0] | 154.7% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 9 | 0.0047 | [-0.0331, 0.0436] | 9.9% | **CI crosses 0 — no detectable difference** |
| num_turns | 9 | 4.9 | [1.9, 7.8] | 220.8% | cgr higher |

## 6. Answer quality by category

Section 5 reports what each category *cost*. This one reports whether it was *answered*: each cell is `successes/graded · mean grader score`. The two are not interchangeable — an arm that gives up early looks cheap in section 5 and is exposed here.

| condition | **discrepancy** | **explain** | **fix** | **impact** | **locate** | **reference** |
|---|---|---|---|---|---|---|
| `baseline` | 2/4 · 0.681 | 13/13 · 0.954 | 8/9 · 0.889 | 5/13 · 0.789 | 12/13 · 0.962 | 12/13 · 0.959 |
| `baseline-nosub` | – | 9/9 · 0.978 | 9/9 · 1.000 | 4/9 · 0.897 | 7/9 · 0.889 | 9/9 · 0.978 |
| `cgr` | – | 9/9 · 0.933 | 8/9 · 0.889 | 4/9 · 0.897 | 7/9 · 0.889 | 9/9 · 0.987 |
| `cgr-v2` | 3/4 · 0.756 | 4/4 · 0.950 | – | 1/4 · 0.574 | 4/4 · 1.000 | 3/4 · 0.950 |
| `graphify` | – | 9/9 · 0.978 | 7/9 · 0.778 | 4/9 · 0.888 | 6/9 · 0.833 | 9/9 · 0.978 |
| `graphify-strict` | – | 9/9 · 0.956 | 7/9 · 0.778 | 4/9 · 0.897 | 7/9 · 0.889 | 8/9 · 0.973 |
| `graphify-strict-v2` | 2/4 · 0.714 | 4/4 · 0.900 | – | 1/4 · 0.591 | 3/4 · 0.917 | 4/4 · 1.000 |
| `graphify-v2` | 4/4 · 0.938 | 4/4 · 0.900 | – | 1/4 · 0.602 | 4/4 · 1.000 | 3/4 · 0.917 |
| `haiku-baseline` | 3/4 · 0.717 | 13/13 · 0.831 | 8/9 · 0.889 | 5/13 · 0.780 | 11/13 · 0.885 | 12/13 · 0.981 |
| `haiku-cgr` | – | 9/9 · 0.844 | 7/9 · 0.778 | 2/8 · 0.802 | 6/9 · 0.852 | 8/9 · 0.957 |
| `haiku-cgr-v2` | 3/4 · 0.717 | 4/4 · 0.900 | – | 1/4 · 0.636 | 4/4 · 1.000 | 3/4 · 0.950 |
| `haiku-graphify` | – | 9/9 · 0.933 | 8/9 · 0.889 | 5/9 · 0.898 | 6/9 · 0.852 | 9/9 · 0.974 |
| `haiku-graphify-v2` | 2/4 · 0.550 | 4/4 · 0.850 | – | 1/4 · 0.617 | 4/4 · 1.000 | 4/4 · 1.000 |
| `haiku-mempalace` | – | 9/9 · 0.867 | 9/9 · 1.000 | 4/9 · 0.878 | 6/9 · 0.778 | 6/9 · 0.808 |
| `haiku-mempalace-v2` | 2/4 · 0.575 | 4/4 · 0.850 | – | 1/4 · 0.589 | 3/4 · 0.917 | 1/4 · 0.430 |
| `mempalace` | – | 9/9 · 0.956 | 8/9 · 0.889 | 4/9 · 0.897 | 6/9 · 0.852 | 9/9 · 0.971 |
| `mempalace-v2` | 2/4 · 0.588 | 4/4 · 0.950 | – | 0/4 · 0.536 | 4/4 · 1.000 | 2/4 · 0.783 |

**`discrepancy` — the doc-vs-code contradiction hunt.** 4 tasks partition the **12** contradictions planted into corpus-v2 when it was written and recorded in `tasks/keys/docs-discrepancies.json`. The prompts name no document, path or id: each describes a domain in prose and asks which documents the code contradicts. Its `success_threshold` is **0.6**, not the 0.9 the other set categories use — finding two of three planted contradictions is a genuinely useful result, and at 0.9 the category would report an almost uniform zero and measure nothing. A success here therefore means something weaker than a success elsewhere, which is why the mean score is printed beside it rather than the pass count alone.

## 7. Structural comparisons

Each block below is an independent paired comparison between two arms, computed with the same machinery as §3: per-task pairing over the same task set, percentile bootstrap over tasks, an iso-accuracy subset scoped to just those two arms, and a per-category breakdown. Arms that are not part of a block are excluded from it entirely.

### `cgr` vs `baseline`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 45 | **260,561** (203,616–428,937) | 144,597 | 0.197 | 5.0 | 23 in 23 run(s) | 68 | 0 | 0 | 106 | 0 | 84.4% (38/45) | 393,482 |
| cgr | 45 | **377,788** (230,828–552,458) | 346,483 | 0.205 | 14.0 | 2 in 2 run(s) | 175 | 0 | 0 | 144 | 0 | 82.2% (37/45) | 489,919 |

Paired difference (`cgr` − `baseline`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | 95,372.7 | [43,799.2, 144,953.1] | 39.5% | cgr higher |
| uncached_equivalent | 45 | 282,185.0 | [188,187.4, 385,306.5] | 335.6% | cgr higher |
| total_cost_usd | 45 | 0.0033 | [-0.0245, 0.0304] | 15.4% | **CI crosses 0 — no detectable difference** |
| num_turns | 45 | 12.3 | [8.8, 16.2] | 449.5% | cgr higher |

Iso-accuracy subset (36/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 36 | 92,664.3 | [34,462.3, 154,324.9] | 31.0% | cgr higher |
| uncached_equivalent | 36 | 313,636.1 | [206,188.2, 437,456.9] | 386.8% | cgr higher |
| total_cost_usd | 36 | -0.0039 | [-0.0344, 0.0275] | 10.3% | **CI crosses 0 — no detectable difference** |
| num_turns | 36 | 13.8 | [9.7, 18.4] | 525.2% | cgr higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | 168,993.4 | [47,555.4, 298,673.6] | 28.8% | cgr higher |
| fix | 9 | 119,142.1 | [-12,873.2, 250,084.7] | 41.7% | **CI crosses 0 — no detectable difference** |
| impact | 9 | 132,917.8 | [55,825.8, 211,855.2] | 77.5% | cgr higher |
| locate | 9 | 28,758.6 | [-21,022.8, 99,466.7] | 25.3% | **CI crosses 0 — no detectable difference** |
| reference | 9 | 27,051.8 | [-74,500.0, 119,673.5] | 24.0% | **CI crosses 0 — no detectable difference** |

**Verdict.** `cgr` vs `baseline` over 45 paired tasks: tokens higher by 95,373 (95% CI [43,799, 144,953]); cost no detectable difference; turns higher by 12.3 (95% CI [8.8, 16.2]); accuracy 82.2% vs 84.4% (37/45 vs 38/45).

### `cgr` vs `graphify`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| graphify | 45 | **288,502** (197,852–481,415) | 287,545 | 0.191 | 9.0 | 0 in 0 run(s) | 191 | 0 | 0 | 208 | 83 | 77.8% (35/45) | 429,005 |
| cgr | 45 | **377,788** (230,828–552,458) | 346,483 | 0.205 | 14.0 | 2 in 2 run(s) | 175 | 0 | 0 | 144 | 0 | 82.2% (37/45) | 489,919 |

Paired difference (`cgr` − `graphify`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | 63,275.4 | [5,748.6, 114,170.5] | 28.2% | cgr higher |
| uncached_equivalent | 45 | 60,850.6 | [-2,924.1, 115,264.0] | 27.4% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 45 | 0.0096 | [-0.0148, 0.0339] | 10.3% | **CI crosses 0 — no detectable difference** |
| num_turns | 45 | 5.6 | [3.7, 7.8] | 57.4% | cgr higher |

Iso-accuracy subset (35/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 35 | 70,678.8 | [-5,194.2, 136,964.3] | 29.7% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 35 | 69,523.1 | [-1,792.4, 135,829.4] | 29.5% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 35 | 0.0128 | [-0.0179, 0.0411] | 11.6% | **CI crosses 0 — no detectable difference** |
| num_turns | 35 | 6.3 | [4.0, 8.8] | 60.2% | cgr higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | 197,293.1 | [115,233.9, 286,712.4] | 40.2% | cgr higher |
| fix | 9 | 62,580.7 | [-166,662.6, 239,805.6] | 44.5% | **CI crosses 0 — no detectable difference** |
| impact | 9 | 65,654.7 | [-13,862.9, 159,303.2] | 38.2% | **CI crosses 0 — no detectable difference** |
| locate | 9 | 37,761.7 | [-18,570.0, 101,404.9] | 27.1% | **CI crosses 0 — no detectable difference** |
| reference | 9 | -46,912.9 | [-91,209.0, 2,403.9] | -8.8% | **CI crosses 0 — no detectable difference** |

**Verdict.** `cgr` vs `graphify` over 45 paired tasks: tokens higher by 63,275 (95% CI [5,749, 114,170]); cost no detectable difference; turns higher by 5.6 (95% CI [3.7, 7.8]); accuracy 82.2% vs 77.8% (37/45 vs 35/45).

### `cgr` vs `mempalace`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| mempalace | 45 | **456,481** (227,888–723,818) | 449,651 | 0.360 | 11.0 | 1 in 1 run(s) | 134 | 0 | 0 | 61 | 0 | 80.0% (36/45) | 556,835 |
| cgr | 45 | **377,788** (230,828–552,458) | 346,483 | 0.205 | 14.0 | 2 in 2 run(s) | 175 | 0 | 0 | 144 | 0 | 82.2% (37/45) | 489,919 |

Paired difference (`cgr` − `mempalace`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | -74,956.4 | [-193,392.0, 26,281.6] | 11.2% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 45 | -69,419.4 | [-182,704.9, 36,039.6] | 15.0% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 45 | -0.1331 | [-0.1973, -0.0788] | -21.9% | cgr lower |
| num_turns | 45 | 5.6 | [2.7, 8.6] | 64.5% | cgr higher |

Iso-accuracy subset (35/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 35 | -66,792.1 | [-202,546.1, 41,863.9] | 4.1% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 35 | -59,673.1 | [-203,003.4, 62,343.5] | 8.9% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 35 | -0.1301 | [-0.1965, -0.0729] | -23.2% | cgr lower |
| num_turns | 35 | 6.5 | [3.1, 9.9] | 57.0% | cgr higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | 61,438.8 | [-84,134.6, 198,145.7] | 15.0% | **CI crosses 0 — no detectable difference** |
| fix | 9 | 21,888.2 | [-148,916.4, 179,706.3] | 13.3% | **CI crosses 0 — no detectable difference** |
| impact | 9 | -483,085.1 | [-904,868.8, -173,662.5] | -42.0% | cgr lower |
| locate | 9 | 86,942.8 | [37,893.3, 150,057.6] | 78.4% | cgr higher |
| reference | 9 | -61,966.9 | [-187,257.7, 65,214.9] | -9.0% | **CI crosses 0 — no detectable difference** |

**Verdict.** `cgr` vs `mempalace` over 45 paired tasks: tokens no detectable difference; cost lower by 0.1331 (95% CI [-0.1973, -0.0788]); turns higher by 5.6 (95% CI [2.7, 8.6]); accuracy 82.2% vs 80.0% (37/45 vs 36/45).

### `cgr` vs `baseline-nosub`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline-nosub | 45 | **230,081** (126,680–378,938) | 229,091 | 0.134 | 8.0 | 0 in 0 run(s) | 170 | 0 | 0 | 232 | 0 | 84.4% (38/45) | 311,808 |
| cgr | 45 | **377,788** (230,828–552,458) | 346,483 | 0.205 | 14.0 | 2 in 2 run(s) | 175 | 0 | 0 | 144 | 0 | 82.2% (37/45) | 489,919 |

Paired difference (`cgr` − `baseline-nosub`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | 170,752.3 | [109,132.7, 233,849.2] | 96.8% | cgr higher |
| uncached_equivalent | 45 | 168,327.4 | [109,241.0, 234,668.8] | 96.4% | cgr higher |
| total_cost_usd | 45 | 0.0759 | [0.0481, 0.1042] | 57.2% | cgr higher |
| num_turns | 45 | 7.4 | [5.3, 9.7] | 97.3% | cgr higher |

Iso-accuracy subset (36/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 36 | 181,950.3 | [107,019.9, 267,160.3] | 90.7% | cgr higher |
| uncached_equivalent | 36 | 178,919.1 | [107,586.1, 259,821.2] | 89.9% | cgr higher |
| total_cost_usd | 36 | 0.0803 | [0.0463, 0.1144] | 56.3% | cgr higher |
| num_turns | 36 | 8.0 | [5.4, 10.9] | 93.3% | cgr higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | 227,034.0 | [37,454.3, 411,530.1] | 47.1% | cgr higher |
| fix | 9 | 266,936.3 | [88,692.2, 468,701.6] | 162.8% | cgr higher |
| impact | 9 | 110,988.7 | [10,407.1, 207,763.4] | 74.1% | cgr higher |
| locate | 9 | 113,293.0 | [56,501.7, 179,618.0] | 130.6% | cgr higher |
| reference | 9 | 135,509.4 | [42,459.5, 234,900.1] | 69.5% | cgr higher |

**Verdict.** `cgr` vs `baseline-nosub` over 45 paired tasks: tokens higher by 170,752 (95% CI [109,133, 233,849]); cost higher by 0.0759 (95% CI [0.0481, 0.1042]); turns higher by 7.4 (95% CI [5.3, 9.7]); accuracy 82.2% vs 84.4% (37/45 vs 38/45).

### `haiku-cgr` vs `haiku-baseline`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| haiku-baseline | 45 | **502,978** (159,352–754,040) | 498,061 | 0.121 | 15.0 | 2 in 1 run(s) | 278 | 0 | 0 | 350 | 0 | 80.0% (36/45) | 621,126 |
| haiku-cgr | 45 | **450,644** (222,904–718,688) | 365,825 | 0.116 | 16.0 | 5 in 5 run(s) | 238 | 0 | 0 | 173 | 0 | 72.7% (32/44) | 696,575 |

Paired difference (`haiku-cgr` − `haiku-baseline`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | 74,213.4 | [-51,885.8, 215,848.8] | 49.1% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 45 | 2,409.0 | [-117,230.5, 153,011.9] | 52.0% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 45 | 0.0109 | [-0.0093, 0.0349] | 21.0% | **CI crosses 0 — no detectable difference** |
| num_turns | 45 | 3.7 | [1.0, 6.7] | 70.2% | haiku-cgr higher |

Iso-accuracy subset (31/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 31 | 73,861.7 | [-32,978.7, 204,500.9] | 41.7% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 31 | -49,861.2 | [-146,309.8, 38,778.3] | 14.9% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 31 | 0.0134 | [-0.0067, 0.0367] | 22.2% | **CI crosses 0 — no detectable difference** |
| num_turns | 31 | 2.7 | [-0.2, 5.3] | 30.0% | **CI crosses 0 — no detectable difference** |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | -101,125.1 | [-221,412.9, 26,579.0] | -12.8% | **CI crosses 0 — no detectable difference** |
| fix | 9 | 186,347.7 | [24,376.2, 334,739.8] | 99.5% | haiku-cgr higher |
| impact | 9 | 126,890.8 | [-333,027.5, 754,345.7] | 74.8% | **CI crosses 0 — no detectable difference** |
| locate | 9 | 64,358.7 | [-3,760.1, 118,476.6] | 72.8% | **CI crosses 0 — no detectable difference** |
| reference | 9 | 94,594.9 | [-176,891.9, 491,736.9] | 11.2% | **CI crosses 0 — no detectable difference** |

**Verdict.** `haiku-cgr` vs `haiku-baseline` over 45 paired tasks: tokens no detectable difference; cost no detectable difference; turns higher by 3.7 (95% CI [1.0, 6.7]); accuracy 72.7% vs 80.0% (32/44 vs 36/45).

### `haiku-cgr` vs `haiku-graphify`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| haiku-graphify | 45 | **327,185** (190,413–523,370) | 326,189 | 0.103 | 10.0 | 0 in 0 run(s) | 229 | 0 | 0 | 155 | 99 | 82.2% (37/45) | 491,331 |
| haiku-cgr | 45 | **450,644** (222,904–718,688) | 365,825 | 0.116 | 16.0 | 5 in 5 run(s) | 238 | 0 | 0 | 173 | 0 | 72.7% (32/44) | 696,575 |

Paired difference (`haiku-cgr` − `haiku-graphify`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | 193,551.1 | [35,412.4, 369,202.6] | 74.0% | haiku-cgr higher |
| uncached_equivalent | 45 | 108,319.8 | [-44,403.4, 279,362.5] | 53.2% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 45 | 0.0273 | [0.0010, 0.0577] | 30.5% | haiku-cgr higher |
| num_turns | 45 | 6.5 | [3.2, 10.2] | 70.3% | haiku-cgr higher |

Iso-accuracy subset (32/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 32 | 218,743.8 | [51,407.0, 423,363.4] | 80.0% | haiku-cgr higher |
| uncached_equivalent | 32 | 98,887.3 | [-58,809.4, 289,090.9] | 50.7% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 32 | 0.0342 | [0.0060, 0.0702] | 35.9% | haiku-cgr higher |
| num_turns | 32 | 6.3 | [2.9, 10.1] | 61.8% | haiku-cgr higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | 210,153.0 | [-237,880.1, 712,302.0] | 74.2% | **CI crosses 0 — no detectable difference** |
| fix | 9 | 297,606.4 | [87,619.6, 540,359.4] | 125.9% | haiku-cgr higher |
| impact | 9 | 195,052.7 | [-277,526.7, 894,420.2] | 64.8% | **CI crosses 0 — no detectable difference** |
| locate | 9 | 35,039.7 | [-32,985.0, 95,335.2] | 40.7% | **CI crosses 0 — no detectable difference** |
| reference | 9 | 229,903.9 | [-87,479.3, 644,581.9] | 64.6% | **CI crosses 0 — no detectable difference** |

**Verdict.** `haiku-cgr` vs `haiku-graphify` over 45 paired tasks: tokens higher by 193,551 (95% CI [35,412, 369,203]); cost higher by 0.0273 (95% CI [0.0010, 0.0577]); turns higher by 6.5 (95% CI [3.2, 10.2]); accuracy 72.7% vs 82.2% (32/44 vs 37/45).

### `haiku-cgr` vs `haiku-mempalace`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| haiku-mempalace | 45 | **497,712** (200,238–959,939) | 462,057 | 0.154 | 12.0 | 2 in 2 run(s) | 206 | 0 | 0 | 160 | 0 | 75.6% (34/45) | 676,983 |
| haiku-cgr | 45 | **450,644** (222,904–718,688) | 365,825 | 0.116 | 16.0 | 5 in 5 run(s) | 238 | 0 | 0 | 173 | 0 | 72.7% (32/44) | 696,575 |

Paired difference (`haiku-cgr` − `haiku-mempalace`), all 45 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 45 | -26,663.8 | [-234,148.7, 175,781.0] | 43.7% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 45 | -91,549.8 | [-291,938.4, 90,805.3] | 70.5% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 45 | -0.0238 | [-0.0554, 0.0109] | 0.0% | **CI crosses 0 — no detectable difference** |
| num_turns | 45 | 5.0 | [1.6, 8.7] | 81.8% | haiku-cgr higher |

Iso-accuracy subset (28/45 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 28 | -6,258.9 | [-196,763.8, 193,362.3] | 37.9% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 28 | -37,762.9 | [-254,151.3, 209,039.8] | 103.2% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 28 | -0.0163 | [-0.0505, 0.0157] | 1.5% | **CI crosses 0 — no detectable difference** |
| num_turns | 28 | 6.0 | [1.8, 10.8] | 89.3% | haiku-cgr higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| explain | 9 | 229,737.7 | [-166,368.4, 672,318.5] | 45.3% | **CI crosses 0 — no detectable difference** |
| fix | 9 | 42,879.1 | [-167,114.6, 231,381.2] | 64.9% | **CI crosses 0 — no detectable difference** |
| impact | 9 | -381,279.6 | [-955,243.3, 251,508.3] | -33.5% | **CI crosses 0 — no detectable difference** |
| locate | 9 | 64,972.6 | [-37,372.6, 132,321.8] | 91.5% | **CI crosses 0 — no detectable difference** |
| reference | 9 | -89,628.9 | [-604,686.7, 532,832.2] | 50.5% | **CI crosses 0 — no detectable difference** |

**Verdict.** `haiku-cgr` vs `haiku-mempalace` over 45 paired tasks: tokens no detectable difference; cost no detectable difference; turns higher by 5.0 (95% CI [1.6, 8.7]); accuracy 72.7% vs 75.6% (32/44 vs 34/45).

### `cgr-v2` vs `baseline`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 20 | **318,144** (208,381–869,934) | 151,516 | 0.256 | 5.0 | 10 in 8 run(s) | 27 | 0 | 0 | 93 | 0 | 70.0% (14/20) | 367,328 |
| cgr-v2 | 20 | **488,624** (259,832–676,437) | 487,628 | 0.268 | 16.5 | 1 in 1 run(s) | 82 | 0 | 0 | 97 | 0 | 75.0% (15/20) | 415,464 |

Paired difference (`cgr-v2` − `baseline`), all 20 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 20 | -110,738.9 | [-314,076.4, 41,279.2] | 25.4% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 20 | 299,361.7 | [180,562.9, 435,251.1] | 328.4% | cgr-v2 higher |
| total_cost_usd | 20 | -0.0554 | [-0.1385, 0.0167] | 11.0% | **CI crosses 0 — no detectable difference** |
| num_turns | 20 | 10.6 | [7.3, 14.1] | 363.0% | cgr-v2 higher |

Iso-accuracy subset (14/20 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 14 | 12,986.8 | [-115,318.8, 116,642.6] | 41.1% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 14 | 138,642.2 | [78,672.1, 208,477.4] | 104.5% | cgr-v2 higher |
| total_cost_usd | 14 | 0.0051 | [-0.0651, 0.0617] | 26.3% | **CI crosses 0 — no detectable difference** |
| num_turns | 14 | 6.8 | [4.6, 9.2] | 134.0% | cgr-v2 higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| discrepancy | 4 | -555,265.5 | [-1,189,790.3, -138,804.0] | -31.1% | cgr-v2 lower |
| explain | 4 | -21,639.8 | [-361,615.0, 200,048.0] | 22.5% | **CI crosses 0 — no detectable difference** |
| impact | 4 | -191,174.3 | [-486,122.8, 64,219.5] | -1.0% | **CI crosses 0 — no detectable difference** |
| locate | 4 | 125,674.5 | [34,384.0, 226,570.5] | 83.8% | cgr-v2 higher |
| reference | 4 | 88,710.5 | [25,378.0, 153,766.0] | 52.5% | cgr-v2 higher |

**Verdict.** `cgr-v2` vs `baseline` over 20 paired tasks: tokens no detectable difference; cost no detectable difference; turns higher by 10.6 (95% CI [7.3, 14.1]); accuracy 75.0% vs 70.0% (15/20 vs 14/20).

### `cgr-v2` vs `graphify-v2`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| graphify-v2 | 20 | **443,863** (205,549–734,775) | 442,839 | 0.283 | 12.5 | 0 in 0 run(s) | 63 | 0 | 0 | 146 | 38 | 80.0% (16/20) | 502,286 |
| cgr-v2 | 20 | **488,624** (259,832–676,437) | 487,628 | 0.268 | 16.5 | 1 in 1 run(s) | 82 | 0 | 0 | 97 | 0 | 75.0% (15/20) | 415,464 |

Paired difference (`cgr-v2` − `graphify-v2`), all 20 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 20 | 18,701.5 | [-48,172.6, 81,665.5] | 16.0% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 20 | 15,923.5 | [-48,873.7, 80,807.8] | 15.9% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 20 | 0.0285 | [-0.0075, 0.0649] | 12.9% | **CI crosses 0 — no detectable difference** |
| num_turns | 20 | 4.1 | [2.4, 5.9] | 45.0% | cgr-v2 higher |

Iso-accuracy subset (15/20 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 15 | 15,870.6 | [-66,719.5, 91,604.2] | 17.0% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 15 | 15,870.6 | [-66,053.0, 93,442.6] | 17.1% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 15 | 0.0402 | [0.0068, 0.0778] | 18.7% | cgr-v2 higher |
| num_turns | 15 | 4.2 | [2.3, 6.1] | 51.9% | cgr-v2 higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| discrepancy | 4 | -60,575.8 | [-223,764.3, 67,358.0] | -11.6% | **CI crosses 0 — no detectable difference** |
| explain | 4 | 117,914.3 | [-39,572.3, 245,941.0] | 30.5% | **CI crosses 0 — no detectable difference** |
| impact | 4 | -38,249.5 | [-167,680.0, 97,682.5] | -3.3% | **CI crosses 0 — no detectable difference** |
| locate | 4 | 7,201.3 | [-176,670.8, 101,018.5] | 37.6% | **CI crosses 0 — no detectable difference** |
| reference | 4 | 67,217.3 | [6,221.0, 156,341.8] | 26.7% | cgr-v2 higher |

**Verdict.** `cgr-v2` vs `graphify-v2` over 20 paired tasks: tokens no detectable difference; cost no detectable difference; turns higher by 4.1 (95% CI [2.4, 5.9]); accuracy 75.0% vs 80.0% (15/20 vs 16/20).

### `cgr-v2` vs `mempalace-v2`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| mempalace-v2 | 20 | **385,812** (325,372–575,918) | 384,811 | 0.372 | 11.0 | 1 in 1 run(s) | 33 | 0 | 0 | 22 | 0 | 60.0% (12/20) | 408,343 |
| cgr-v2 | 20 | **488,624** (259,832–676,437) | 487,628 | 0.268 | 16.5 | 1 in 1 run(s) | 82 | 0 | 0 | 97 | 0 | 75.0% (15/20) | 415,464 |

Paired difference (`cgr-v2` − `mempalace-v2`), all 20 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 20 | 89,992.3 | [-44,770.7, 247,604.8] | 42.1% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 20 | 89,220.6 | [-50,197.8, 240,858.8] | 42.5% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 20 | -0.0571 | [-0.1468, 0.0333] | -2.5% | **CI crosses 0 — no detectable difference** |
| num_turns | 20 | 6.1 | [3.2, 9.3] | 79.4% | cgr-v2 higher |

Iso-accuracy subset (12/20 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 12 | 316.2 | [-126,829.0, 117,840.1] | 40.4% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 12 | 316.2 | [-126,884.3, 124,616.2] | 40.8% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 12 | -0.0502 | [-0.1408, 0.0266] | 4.5% | **CI crosses 0 — no detectable difference** |
| num_turns | 12 | 4.8 | [1.5, 7.7] | 90.6% | cgr-v2 higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| discrepancy | 4 | 261,642.0 | [-327,178.0, 850,462.0] | 46.2% | **CI crosses 0 — no detectable difference** |
| explain | 4 | 72,000.8 | [-10,149.0, 154,150.5] | 21.0% | **CI crosses 0 — no detectable difference** |
| impact | 4 | -5,571.3 | [-217,988.5, 206,846.0] | 5.9% | **CI crosses 0 — no detectable difference** |
| locate | 4 | 191,409.3 | [131,198.0, 294,567.3] | 145.1% | cgr-v2 higher |
| reference | 4 | -69,519.5 | [-230,471.5, 149,919.0] | -7.8% | **CI crosses 0 — no detectable difference** |

**Verdict.** `cgr-v2` vs `mempalace-v2` over 20 paired tasks: tokens no detectable difference; cost no detectable difference; turns higher by 6.1 (95% CI [3.2, 9.3]); accuracy 75.0% vs 60.0% (15/20 vs 12/20).

### `haiku-cgr-v2` vs `haiku-baseline`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| haiku-baseline | 20 | **634,043** (153,893–839,805) | 582,590 | 0.167 | 14.0 | 1 in 1 run(s) | 122 | 0 | 0 | 154 | 0 | 80.0% (16/20) | 631,724 |
| haiku-cgr-v2 | 20 | **669,144** (424,694–1,131,236) | 668,131 | 0.171 | 19.0 | 2 in 2 run(s) | 144 | 0 | 0 | 139 | 0 | 75.0% (15/20) | 789,769 |

Paired difference (`haiku-cgr-v2` − `haiku-baseline`), all 20 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 20 | 87,155.3 | [-111,373.4, 270,526.7] | 93.2% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 20 | 101,305.0 | [-105,003.2, 294,590.1] | 209.7% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 20 | 0.0194 | [-0.0114, 0.0498] | 43.0% | **CI crosses 0 — no detectable difference** |
| num_turns | 20 | 6.9 | [3.4, 10.2] | 168.2% | haiku-cgr-v2 higher |

Iso-accuracy subset (15/20 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 15 | 152,307.0 | [-75,859.8, 358,657.4] | 125.4% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 15 | 121,393.4 | [-104,229.3, 347,038.4] | 84.5% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 15 | 0.0341 | [0.0002, 0.0680] | 59.9% | haiku-cgr-v2 higher |
| num_turns | 15 | 7.4 | [4.3, 10.3] | 85.6% | haiku-cgr-v2 higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| discrepancy | 4 | -33,274.8 | [-781,545.0, 714,995.5] | 24.5% | **CI crosses 0 — no detectable difference** |
| explain | 4 | -242,734.3 | [-329,633.0, -137,786.8] | -23.3% | haiku-cgr-v2 lower |
| impact | 4 | 116,903.3 | [-36,283.0, 294,623.8] | 109.5% | **CI crosses 0 — no detectable difference** |
| locate | 4 | 381,883.8 | [261,979.0, 577,169.8] | 233.5% | haiku-cgr-v2 higher |
| reference | 4 | 212,998.5 | [19,651.5, 406,345.5] | 121.6% | haiku-cgr-v2 higher |

**Verdict.** `haiku-cgr-v2` vs `haiku-baseline` over 20 paired tasks: tokens no detectable difference; cost no detectable difference; turns higher by 6.9 (95% CI [3.4, 10.2]); accuracy 75.0% vs 80.0% (15/20 vs 16/20).

### `haiku-cgr-v2` vs `haiku-graphify-v2`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| haiku-graphify-v2 | 20 | **440,614** (161,348–897,862) | 439,649 | 0.127 | 12.5 | 0 in 0 run(s) | 123 | 0 | 0 | 78 | 41 | 75.0% (15/20) | 439,640 |
| haiku-cgr-v2 | 20 | **669,144** (424,694–1,131,236) | 668,131 | 0.171 | 19.0 | 2 in 2 run(s) | 144 | 0 | 0 | 139 | 0 | 75.0% (15/20) | 789,769 |

Paired difference (`haiku-cgr-v2` − `haiku-graphify-v2`), all 20 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 20 | 248,108.2 | [139,136.3, 352,410.5] | 114.8% | haiku-cgr-v2 higher |
| uncached_equivalent | 20 | 224,923.0 | [110,483.9, 335,676.4] | 92.9% | haiku-cgr-v2 higher |
| total_cost_usd | 20 | 0.0491 | [0.0282, 0.0719] | 62.0% | haiku-cgr-v2 higher |
| num_turns | 20 | 8.4 | [5.3, 11.6] | 85.8% | haiku-cgr-v2 higher |

Iso-accuracy subset (14/20 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 14 | 287,724.1 | [171,759.3, 407,540.9] | 150.3% | haiku-cgr-v2 higher |
| uncached_equivalent | 14 | 254,602.4 | [123,358.5, 388,927.3] | 118.9% | haiku-cgr-v2 higher |
| total_cost_usd | 14 | 0.0597 | [0.0348, 0.0853] | 82.1% | haiku-cgr-v2 higher |
| num_turns | 14 | 8.4 | [4.4, 12.3] | 100.7% | haiku-cgr-v2 higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| discrepancy | 4 | 258,292.3 | [-1,205.8, 490,615.0] | 25.2% | **CI crosses 0 — no detectable difference** |
| explain | 4 | 135,626.0 | [-50,496.5, 308,744.5] | 17.0% | **CI crosses 0 — no detectable difference** |
| impact | 4 | 162,595.3 | [-95,110.5, 308,258.5] | 87.3% | **CI crosses 0 — no detectable difference** |
| locate | 4 | 366,810.5 | [228,635.0, 619,442.0] | 187.5% | haiku-cgr-v2 higher |
| reference | 4 | 317,216.8 | [96,927.8, 568,662.5] | 257.0% | haiku-cgr-v2 higher |

**Verdict.** `haiku-cgr-v2` vs `haiku-graphify-v2` over 20 paired tasks: tokens higher by 248,108 (95% CI [139,136, 352,410]); cost higher by 0.0491 (95% CI [0.0282, 0.0719]); turns higher by 8.4 (95% CI [5.3, 11.6]); accuracy 75.0% vs 75.0% (15/20 vs 15/20).

### `haiku-cgr-v2` vs `haiku-mempalace-v2`

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| haiku-mempalace-v2 | 20 | **430,577** (118,174–686,342) | 429,608 | 0.133 | 10.5 | 0 in 0 run(s) | 112 | 0 | 0 | 35 | 0 | 55.0% (11/20) | 606,265 |
| haiku-cgr-v2 | 20 | **669,144** (424,694–1,131,236) | 668,131 | 0.171 | 19.0 | 2 in 2 run(s) | 144 | 0 | 0 | 139 | 0 | 75.0% (15/20) | 789,769 |

Paired difference (`haiku-cgr-v2` − `haiku-mempalace-v2`), all 20 tasks:

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 20 | 224,290.3 | [27,604.3, 388,193.5] | 165.8% | haiku-cgr-v2 higher |
| uncached_equivalent | 20 | 201,105.1 | [2,506.7, 380,258.1] | 156.3% | haiku-cgr-v2 higher |
| total_cost_usd | 20 | 0.0329 | [-0.0089, 0.0689] | 56.4% | **CI crosses 0 — no detectable difference** |
| num_turns | 20 | 8.9 | [4.7, 12.9] | 141.8% | haiku-cgr-v2 higher |

Iso-accuracy subset (11/20 tasks where every graded run of both arms succeeded):

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 11 | 242,911.4 | [56,433.8, 423,424.8] | 105.2% | haiku-cgr-v2 higher |
| uncached_equivalent | 11 | 209,727.7 | [13,108.7, 409,364.0] | 93.1% | haiku-cgr-v2 higher |
| total_cost_usd | 11 | 0.0374 | [0.0029, 0.0732] | 41.4% | haiku-cgr-v2 higher |
| num_turns | 11 | 7.3 | [2.5, 11.6] | 92.1% | haiku-cgr-v2 higher |

Per category (primary metric `uncached_equivalent_all`):

| category | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| discrepancy | 4 | 19,471.8 | [-732,792.0, 671,692.0] | 37.3% | **CI crosses 0 — no detectable difference** |
| explain | 4 | 143,094.3 | [-186,790.3, 335,339.5] | 45.9% | **CI crosses 0 — no detectable difference** |
| impact | 4 | 272,428.5 | [178,494.3, 342,495.3] | 73.6% | haiku-cgr-v2 higher |
| locate | 4 | 389,756.0 | [296,307.5, 537,358.0] | 315.4% | haiku-cgr-v2 higher |
| reference | 4 | 296,701.0 | [21,935.0, 571,467.0] | 357.1% | haiku-cgr-v2 higher |

**Verdict.** `haiku-cgr-v2` vs `haiku-mempalace-v2` over 20 paired tasks: tokens higher by 224,290 (95% CI [27,604, 388,194]); cost no detectable difference; turns higher by 8.9 (95% CI [4.7, 12.9]); accuracy 75.0% vs 55.0% (15/20 vs 11/20).

### Accuracy by model strength

The token comparisons above are only meaningful alongside accuracy: an arm that answers fewer tasks correctly can always look cheaper. This table puts every arm's accuracy side by side so a Haiku-vs-Sonnet reading is not mistaken for an efficiency result.

| condition | graded | successes | accuracy |
|---|---|---|---|
| `baseline` | 65 | 52 | 80.0% |
| `baseline-nosub` | 45 | 38 | 84.4% |
| `cgr` | 45 | 37 | 82.2% |
| `cgr-v2` | 20 | 15 | 75.0% |
| `graphify` | 45 | 35 | 77.8% |
| `graphify-strict` | 45 | 35 | 77.8% |
| `graphify-strict-v2` | 20 | 14 | 70.0% |
| `graphify-v2` | 20 | 16 | 80.0% |
| `haiku-baseline` | 65 | 52 | 80.0% |
| `haiku-cgr` | 44 | 32 | 72.7% |
| `haiku-cgr-v2` | 20 | 15 | 75.0% |
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
| `cgr` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `cgr-v2` | 20 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `graphify` | 45 | 63 (45) | 16 (8) | 4 (3) | **0** | **0** | **0** | **0** | **0** | **0** |
| `graphify-strict` | 45 | 61 (45) | 18 (12) | 3 (2) | **0** | **0** | **0** | **0** | 2 (2) | **0** |
| `graphify-strict-v2` | 20 | 24 (20) | 7 (7) | 3 (2) | **0** | **0** | **0** | **0** | **0** | **0** |
| `graphify-v2` | 20 | 27 (20) | 8 (5) | 2 (2) | **0** | **0** | **0** | **0** | **0** | **0** |
| `haiku-baseline` | 65 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `haiku-cgr` | 45 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| `haiku-cgr-v2` | 20 | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
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
| `cgr` | 0 | n/a (no graph) | 0 (0) |
| `cgr-v2` | 0 | n/a (no graph) | 0 (0) |
| `graphify` | 4 | 0 | 0 (0) |
| `graphify-strict` | 7 | 0 | 0 (0) |
| `graphify-strict-v2` | 2 | n/a (no graph) | 0 (0) |
| `graphify-v2` | 3 | n/a (no graph) | 0 (0) |
| `haiku-baseline` | 0 | n/a (no graph) | 0 (0) |
| `haiku-cgr` | 0 | n/a (no graph) | 0 (0) |
| `haiku-cgr-v2` | 0 | n/a (no graph) | 0 (0) |
| `haiku-graphify` | 2 | 2 | 0 (0) |
| `haiku-graphify-v2` | 1 | n/a (no graph) | 0 (0) |
| `haiku-mempalace` | 0 | n/a (no graph) | 0 (0) |
| `haiku-mempalace-v2` | 0 | n/a (no graph) | 0 (0) |
| `mempalace` | 0 | n/a (no graph) | 0 (0) |
| `mempalace-v2` | 0 | n/a (no graph) | 0 (0) |

> **The strict block never fired.** Across 45 `graphify-strict` runs the hook denied **zero** reads, confirmed three ways: no `permissionDecision` in any transcript, no deny text, and `permission_denials` = 0 in every `result.json`. The cause is in graphify's own guard (`cli.py::_query_stamp_fresh`): strict suppresses its block while a query/explain/path ran within the last 30 minutes, and the overlay's `CLAUDE.md` already steers the agent to `graphify query` **before** its first raw `Read`. The soft nudge wins the race every time, so the strict flag is inert under this overlay — `graphify-strict` vs `graphify` is therefore a null result about a knob that never engaged, **not** evidence that forcing graph-first exploration does nothing.

**MCP retrieval tools.** The same question asked of each retrieval mechanism in this report.

Every arm below reaches its index through MCP only — no CLI to invoke, so every zero in the table above is structural for them rather than a finding. `mempalace` exposes one tool the nudge points at; `cgr` exposes nine LLM-free, read-only tools (`docs/plan/CGR.md` §3), so the columns here are capped to the top 6 tools by total calls across every arm in this report. **"treatment calls"** is the per-row total for that row's own server (`mempalace_calls` for a `mempalace*` row, `cgr_calls` for a `cgr*` one), and `bytes returned` is the efficiency claim itself: a prebuilt index only pays for itself if what it hands back is smaller than reading the files would have been.

| condition | runs | `code-graph-rag__get_code_snippet` | `code-graph-rag__get_function_source` | `code-graph-rag__semantic_search` | `code-graph-rag__structural_search` | `mempalace__mempalace_search` | `mempalace__memplacem_search` | treatment calls | median/run | runs using | bytes returned |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `cgr` | 45 | 154 | **0** | 176 | 40 | **0** | **0** | 370 | 6 | 45/45 | 353,322 |
| `cgr-v2` | 20 | 39 | **0** | 77 | 7 | **0** | **0** | 123 | 5 | 20/20 | 117,874 |
| `haiku-cgr` | 45 | 85 | 13 | 130 | 29 | **0** | **0** | 257 | 5 | 36/45 | 248,088 |
| `haiku-cgr-v2` | 20 | 18 | 7 | 70 | 5 | **0** | **0** | 100 | 4 | 15/20 | 84,265 |
| `haiku-mempalace` | 45 | **0** | **0** | **0** | **0** | 154 | 1 | 155 | 2 | 43/45 | 2,447,274 |
| `haiku-mempalace-v2` | 20 | **0** | **0** | **0** | **0** | 68 | **0** | 68 | 2.5 | 20/20 | 1,026,316 |
| `mempalace` | 45 | **0** | **0** | **0** | **0** | 241 | **0** | 241 | 4 | 45/45 | 4,004,248 |
| `mempalace-v2` | 20 | **0** | **0** | **0** | **0** | 131 | **0** | 131 | 6.5 | 20/20 | 1,963,417 |

> **The retrieval nudge was ignored in some runs.** `haiku-cgr` 9/45, `haiku-cgr-v2` 5/20, `haiku-mempalace` 2/45 run(s) never called their arm's retrieval tool at all, despite `CLAUDE.md` telling the agent to search before grepping. Those runs are a baseline in everything but name and their tokens are still pooled into the arm, so the arm's measured effect is diluted by exactly that fraction — the same caveat the `never invoked the CLI` column records for graphify.

> **Each server's tool definitions are a fixed cost, and it is in §2.** Every MCP-backed run carries its server's full tool schema in its first request, whether or not it ever calls a tool — `mempalace` 45 tools / ~32 KB, `cgr` 9 tools. That lands in `first_turn_cache_creation`, so the fixed-overhead table in §2 is where the arms are separable on it; it is **not** subtracted from any figure in this report. These arms also all run with `--strict-mcp-config`, so they are the only arms that do *not* also carry the measuring host's own MCP servers — those appear in the other arms as deferred names only, which is far cheaper than a loaded schema but not zero.

> **Cross-session memory was never measured.** `save-result`, `reflect` and `affected` are the mechanisms by which graphify is supposed to compound across sessions, and they were invoked **zero times in every arm**. Each benchmark run is a fresh corpus copy with a fresh session, so there is no second session for a saved result to pay off in — the design that would exercise them is a different experiment, not a variation of this one. The honest statement is that this benchmark measures single-session retrieval only.

## 9. Speed

> **Secondary, and noisy.** Every run in every set was measured at **concurrency 3** on a single machine, so session wall-clock includes contention this harness never controlled for and cannot quantify. Tokens and cost are properties of the measurement; durations are not. Read the session rows as an order of magnitude only.

Session timings, median (IQR) in ms:

| condition | runs | wall `duration_ms` | API `duration_api_ms` | `ttft_ms` | pre-request `time_to_request_ms` |
|---|---|---|---|---|---|
| `baseline` | 65 | 26,832 (12,921–51,734) | 51,095 (27,283–117,472) | 2,041 (1,673–2,720) | 17 (6–20) |
| `baseline-nosub` | 45 | 33,485 (15,536–58,606) | 34,165 (16,084–59,353) | 1,680 (1,543–2,704) | 18 (16–21) |
| `cgr` | 45 | 49,840 (32,018–85,934) | 46,190 (29,278–82,526) | 1,584 (1,470–2,063) | 18 (16–20) |
| `cgr-v2` | 20 | 62,333 (36,464–80,023) | 59,330 (33,285–77,153) | 2,028 (1,917–2,415) | 19 (18–19) |
| `graphify` | 45 | 38,594 (22,199–81,513) | 38,327 (22,605–81,287) | 1,901 (1,519–2,463) | 19 (17–21) |
| `graphify-strict` | 45 | 44,277 (26,523–83,351) | 48,706 (26,186–85,475) | 2,174 (1,689–3,123) | 18 (17–20) |
| `graphify-strict-v2` | 20 | 56,406 (23,320–91,218) | 56,364 (23,589–89,951) | 1,599 (1,493–2,144) | 18 (16–20) |
| `graphify-v2` | 20 | 66,322 (22,785–87,931) | 65,977 (23,068–87,144) | 1,884 (1,497–2,130) | 20 (17–22) |
| `haiku-baseline` | 65 | 52,386 (24,919–86,854) | 53,107 (26,941–89,496) | 2,426 (2,165–2,771) | 18 (16–20) |
| `haiku-cgr` | 45 | 53,546 (31,596–86,657) | 54,622 (30,108–93,545) | 2,636 (2,265–2,862) | 17 (16–19) |
| `haiku-cgr-v2` | 20 | 71,726 (49,422–95,986) | 70,511 (57,395–92,689) | 2,492 (2,333–3,223) | 18 (18–20) |
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
| `cgr` | – | 57 (10–150) | – | 5 (4–8) | 42 (32–64) | 22,821 (18,939–26,704) |
| `cgr-v2` | – | 66 (18–2,422) | – | 5 (4–9) | 37 (30–61) | 9 (9–9) |
| `graphify` | – | – | 294 (282–307) | 64 (59–70) | 90 (80–208) | – |
| `graphify-strict` | – | – | 300 (281–329) | 62 (55–66) | 95 (78–201) | 11 (11–11) |
| `graphify-strict-v2` | – | – | 338 (321–372) | 59 (53–68) | 86 (77–108) | – |
| `graphify-v2` | – | – | 343 (315–373) | 62 (56–69) | 85 (75–101) | – |
| `haiku-baseline` | – | – | – | 5 (4–6) | 43 (32–123) | 6 (5–7) |
| `haiku-cgr` | – | 53 (10–113) | – | 5 (4–7) | 42 (33–73) | 9 (8–10) |
| `haiku-cgr-v2` | – | 61 (18–80) | – | 5 (4–7) | 35 (31–68) | 6 (5–6) |
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
- `cgr`: **2** subagent(s) spawned across **2**/45 run(s). T2S all-model 489,919 vs main-session-only 485,973.
- `cgr-v2`: **1** subagent(s) spawned across **1**/20 run(s). T2S all-model 415,464 vs main-session-only 414,465.
- `graphify`: **0** subagent(s) spawned across **0**/45 run(s). T2S all-model 429,005 vs main-session-only 428,008.
- `graphify-strict`: **1** subagent(s) spawned across **1**/45 run(s). T2S all-model 414,500 vs main-session-only 386,497.
- `graphify-strict-v2`: **0** subagent(s) spawned across **0**/20 run(s). T2S all-model 453,066 vs main-session-only 452,071.
- `graphify-v2`: **0** subagent(s) spawned across **0**/20 run(s). T2S all-model 502,286 vs main-session-only 501,285.
- `haiku-baseline`: **3** subagent(s) spawned across **2**/65 run(s). T2S all-model 624,387 vs main-session-only 611,771.
- `haiku-cgr`: **5** subagent(s) spawned across **5**/45 run(s). T2S all-model 696,575 vs main-session-only 575,722.
- `haiku-cgr-v2`: **2** subagent(s) spawned across **2**/20 run(s). T2S all-model 789,769 vs main-session-only 757,856.
- `haiku-graphify`: **0** subagent(s) spawned across **0**/45 run(s). T2S all-model 491,331 vs main-session-only 490,335.
- `haiku-graphify-v2`: **0** subagent(s) spawned across **0**/20 run(s). T2S all-model 439,640 vs main-session-only 438,645.
- `haiku-mempalace`: **2** subagent(s) spawned across **2**/45 run(s). T2S all-model 676,983 vs main-session-only 649,058.
- `haiku-mempalace-v2`: **0** subagent(s) spawned across **0**/20 run(s). T2S all-model 606,265 vs main-session-only 605,265.
- `mempalace`: **1** subagent(s) spawned across **1**/45 run(s). T2S all-model 556,835 vs main-session-only 545,886.
- `mempalace-v2`: **1** subagent(s) spawned across **1**/20 run(s). T2S all-model 408,343 vs main-session-only 407,344.
- Runs that opened `graphify-out/graph.json` directly: **19** (`EXP3-digest-pipeline__graphify__r1`, `IMP2-rename-issue-created__graphify__r1`, `XFIX2-mention-inside-code__graphify__r1`, `XREF5-rate-limit-importers__graphify__r1`, `LOC3-digest-window__graphify-strict__r1`, `REF3-issue-created-subscribers__graphify-strict__r1`, `XEXP2-invitation-lifecycle__graphify-strict__r1`, `XLOC3-issue-number-allocation__graphify-strict__r1`, `XLOC3-issue-number-allocation__haiku-graphify__r1`, `XLOC4-session-lifetime__graphify-strict__r1`, `XLOC6-menu-entry-visibility__graphify-strict__r1`, `XREF2-emit-callers__haiku-graphify__r1`, `XREF3-isenabled-callers__graphify-strict__r1`, `DIMP2-job-cadence-table__graphify-v2__r1`, `DIMP2-job-cadence-table__haiku-graphify-v2__r1`, `DREF1-webhook-service-requirements__graphify-strict-v2__r1`, `DREF1-webhook-service-requirements__graphify-v2__r1`, `DREF2-digest-cadence-adrs__graphify-strict-v2__r1`, `DREF4-adr017-references__graphify-v2__r1`)
- graphify-condition runs that never invoked the `graphify` CLI (nudge ignored): **45** (`EXP1-issue-create-flow__cgr__r1`, `EXP2-comment-mention-notify__cgr__r1`, `EXP3-digest-pipeline__cgr__r1`, `FIX1-issue-tenant-leak__cgr__r1`, `FIX2-project-quota-off-by-one__cgr__r1`, `FIX3-board-shows-archived__cgr__r1`, `IMP1-planlimits-field__cgr__r1`, `IMP2-rename-issue-created__cgr__r1`, `IMP3-limited-resource-union__cgr__r1`, `LOC1-shortcut-match__cgr__r1`, `LOC2-webhook-plan-cap__cgr__r1`, `LOC3-digest-window__cgr__r1`, `REF1-assertcan-callers__cgr__r1`, `REF2-would-exceed-limit-callers__cgr__r1`, `REF3-issue-created-subscribers__cgr__r1`, `XEXP1-webhook-delivery__cgr__r1`, `XEXP2-invitation-lifecycle__cgr__r1`, `XEXP3-plan-change__cgr__r1`, `XEXP4-signin-to-actor__cgr__r1`, `XEXP5-search-index__cgr__r1`, `XEXP6-overdue-sweep__cgr__r1`, `XFIX1-csv-quote-escape__cgr__r1`, `XFIX2-mention-inside-code__cgr__r1`, `XFIX3-last-owner-removable__cgr__r1`, `XFIX4-advanced-search-inverted__cgr__r1`, `XFIX5-self-notification__cgr__r1`, `XFIX6-revoked-invite-accepted__cgr__r1`, `XIMP1-role-union__cgr__r1`, `XIMP2-rename-comment-created__cgr__r1`, `XIMP3-issue-status-union__cgr__r1`, `XIMP4-feature-flag-key-union__cgr__r1`, `XIMP5-plan-id-union__cgr__r1`, `XIMP6-limit-check-field__cgr__r1`, `XLOC1-retry-throttle__cgr__r1`, `XLOC2-invite-link-validity__cgr__r1`, `XLOC3-issue-number-allocation__cgr__r1`, `XLOC4-session-lifetime__cgr__r1`, `XLOC5-delivery-retry-policy__cgr__r1`, `XLOC6-menu-entry-visibility__cgr__r1`, `XREF1-assertorgscope-callers__cgr__r1`, `XREF2-emit-callers__cgr__r1`, `XREF3-isenabled-callers__cgr__r1`, `XREF4-comment-created-subscribers__cgr__r1`, `XREF5-rate-limit-importers__cgr__r1`, `XREF6-member-joined-repositories__cgr__r1`)

## 11. Failed and ungraded runs

Harness failures (`is_error`, or `terminal_reason` other than `completed`): **1**. The table below also lists runs that completed normally but did not meet their grader's success threshold — those are accuracy results, not execution problems.

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
| `DDIS4-quotas-flags-and-rate-limits__cgr-v2__r1` | cgr-v2 | DDIS4-quotas-flags-and-rate-limits | false | completed |
| `DDIS4-quotas-flags-and-rate-limits__haiku-cgr-v2__r1` | haiku-cgr-v2 | DDIS4-quotas-flags-and-rate-limits | false | completed |
| `DIMP1-error-code-union__cgr-v2__r1` | cgr-v2 | DIMP1-error-code-union | false | completed |
| `DIMP1-error-code-union__haiku-cgr-v2__r1` | haiku-cgr-v2 | DIMP1-error-code-union | false | completed |
| `DIMP2-job-cadence-table__cgr-v2__r1` | cgr-v2 | DIMP2-job-cadence-table | false | completed |
| `DIMP2-job-cadence-table__haiku-cgr-v2__r1` | haiku-cgr-v2 | DIMP2-job-cadence-table | false | completed |
| `DIMP3-notification-kind-union__cgr-v2__r1` | cgr-v2 | DIMP3-notification-kind-union | false | completed |
| `DIMP3-notification-kind-union__haiku-cgr-v2__r1` | haiku-cgr-v2 | DIMP3-notification-kind-union | false | completed |
| `DREF1-webhook-service-requirements__cgr-v2__r1` | cgr-v2 | DREF1-webhook-service-requirements | false | completed |
| `DREF1-webhook-service-requirements__haiku-cgr-v2__r1` | haiku-cgr-v2 | DREF1-webhook-service-requirements | false | completed |
| `IMP2-rename-issue-created__cgr__r1` | cgr | IMP2-rename-issue-created | false | completed |
| `IMP2-rename-issue-created__haiku-cgr__r1` | haiku-cgr | IMP2-rename-issue-created | false | completed |
| `IMP3-limited-resource-union__haiku-cgr__r1` | haiku-cgr | IMP3-limited-resource-union | false | completed |
| `LOC2-webhook-plan-cap__haiku-cgr__r1` | haiku-cgr | LOC2-webhook-plan-cap | false | completed |
| `LOC3-digest-window__cgr__r1` | cgr | LOC3-digest-window | false | completed |
| `XFIX5-self-notification__cgr__r1` | cgr | XFIX5-self-notification | false | completed |
| `XFIX5-self-notification__haiku-cgr__r1` | haiku-cgr | XFIX5-self-notification | false | completed |
| `XFIX6-revoked-invite-accepted__haiku-cgr__r1` | haiku-cgr | XFIX6-revoked-invite-accepted | false | completed |
| `XIMP1-role-union__cgr__r1` | cgr | XIMP1-role-union | false | completed |
| `XIMP1-role-union__haiku-cgr__r1` | haiku-cgr | XIMP1-role-union | true | max_turns |
| `XIMP2-rename-comment-created__cgr__r1` | cgr | XIMP2-rename-comment-created | false | completed |
| `XIMP2-rename-comment-created__haiku-cgr__r1` | haiku-cgr | XIMP2-rename-comment-created | false | completed |
| `XIMP3-issue-status-union__haiku-cgr__r1` | haiku-cgr | XIMP3-issue-status-union | false | completed |
| `XIMP5-plan-id-union__cgr__r1` | cgr | XIMP5-plan-id-union | false | completed |
| `XIMP5-plan-id-union__haiku-cgr__r1` | haiku-cgr | XIMP5-plan-id-union | false | completed |
| `XIMP6-limit-check-field__cgr__r1` | cgr | XIMP6-limit-check-field | false | completed |
| `XIMP6-limit-check-field__haiku-cgr__r1` | haiku-cgr | XIMP6-limit-check-field | false | completed |
| `XLOC4-session-lifetime__cgr__r1` | cgr | XLOC4-session-lifetime | false | completed |
| `XLOC4-session-lifetime__haiku-cgr__r1` | haiku-cgr | XLOC4-session-lifetime | false | completed |
| `XLOC5-delivery-retry-policy__haiku-cgr__r1` | haiku-cgr | XLOC5-delivery-retry-policy | false | completed |
| `XREF3-isenabled-callers__haiku-cgr__r1` | haiku-cgr | XREF3-isenabled-callers | false | completed |

## 12. Per-set breakdown (drift between measurement sets)

The two task sets were authored separately. Pooling them is only legitimate if they behave alike, so each set is re-analysed on its own here: a large gap between the two blocks means the pooled numbers above are averaging over a real difference in task design, not just sampling noise.

### set `cgr` — 130 runs over 65 tasks

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| cgr | 45 | **377,788** (230,828–552,458) | 346,483 | 0.205 | 14.0 | 2 in 2 run(s) | 175 | 0 | 0 | 144 | 0 | 82.2% (37/45) | 489,919 |
| cgr-v2 | 20 | **488,624** (259,832–676,437) | 487,628 | 0.268 | 16.5 | 1 in 1 run(s) | 82 | 0 | 0 | 97 | 0 | 75.0% (15/20) | 415,464 |
| haiku-cgr | 45 | **450,644** (222,904–718,688) | 365,825 | 0.116 | 16.0 | 5 in 5 run(s) | 238 | 0 | 0 | 173 | 0 | 72.7% (32/44) | 696,575 |
| haiku-cgr-v2 | 20 | **669,144** (424,694–1,131,236) | 668,131 | 0.171 | 19.0 | 2 in 2 run(s) | 144 | 0 | 0 | 139 | 0 | 75.0% (15/20) | 789,769 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 0 | – | [–, –] | – | n too small |
| uncached_equivalent | 0 | – | [–, –] | – | n too small |
| total_cost_usd | 0 | – | [–, –] | – | n too small |
| num_turns | 0 | – | [–, –] | – | n too small |

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

### easy (zero-advantage controls) — 68 runs over 7 tasks

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 7 | **121,327** (121,126–156,875) | 120,276 | 0.087 | 4.0 | 1 in 1 run(s) | 6 | 0 | 0 | 22 | 0 | 71.4% (5/7) | 197,054 |
| baseline-nosub | 5 | **80,302** (79,836–107,441) | 79,317 | 0.072 | 4.0 | 0 in 0 run(s) | 6 | 0 | 0 | 14 | 0 | 60.0% (3/5) | 163,665 |
| cgr | 5 | **219,965** (192,358–230,828) | 218,980 | 0.115 | 8.0 | 0 in 0 run(s) | 2 | 0 | 0 | 11 | 0 | 60.0% (3/5) | 214,906 |
| cgr-v2 | 2 | **210,252** (202,679–217,826) | 209,278 | 0.136 | 7.5 | 0 in 0 run(s) | 0 | 0 | 0 | 7 | 0 | 100.0% (2/2) | 210,252 |
| graphify | 5 | **160,029** (141,551–240,807) | 159,058 | 0.116 | 6.0 | 0 in 0 run(s) | 4 | 0 | 0 | 16 | 6 | 60.0% (3/5) | 226,858 |
| graphify-strict | 5 | **166,765** (133,014–206,080) | 165,794 | 0.129 | 5.0 | 0 in 0 run(s) | 3 | 0 | 0 | 16 | 5 | 60.0% (3/5) | 194,847 |
| graphify-strict-v2 | 2 | **253,078** (243,589–262,566) | 252,103 | 0.152 | 7.5 | 0 in 0 run(s) | 0 | 0 | 0 | 11 | 2 | 100.0% (2/2) | 253,078 |
| graphify-v2 | 2 | **202,146** (199,875–204,416) | 201,171 | 0.127 | 6.0 | 0 in 0 run(s) | 0 | 0 | 0 | 8 | 2 | 100.0% (2/2) | 202,146 |
| haiku-baseline | 7 | **92,281** (73,626–149,587) | 91,296 | 0.048 | 4.0 | 0 in 0 run(s) | 7 | 0 | 0 | 30 | 0 | 71.4% (5/7) | 179,918 |
| haiku-cgr | 5 | **165,402** (142,361–244,181) | 164,424 | 0.045 | 7.0 | 0 in 0 run(s) | 4 | 0 | 0 | 11 | 0 | 60.0% (3/5) | 294,627 |
| haiku-cgr-v2 | 2 | **259,739** (192,093–327,384) | 26,912 | 0.095 | 1.0 | 2 in 2 run(s) | 0 | 0 | 0 | 0 | 0 | 100.0% (2/2) | 259,739 |
| haiku-graphify | 5 | **102,483** (98,518–125,223) | 101,512 | 0.049 | 4.0 | 0 in 0 run(s) | 4 | 0 | 0 | 10 | 6 | 60.0% (3/5) | 140,655 |
| haiku-graphify-v2 | 2 | **102,776** (102,755–102,796) | 101,801 | 0.051 | 4.0 | 0 in 0 run(s) | 0 | 0 | 0 | 4 | 2 | 100.0% (2/2) | 102,776 |
| haiku-mempalace | 5 | **122,663** (106,008–305,223) | 121,692 | 0.050 | 5.0 | 0 in 0 run(s) | 3 | 0 | 0 | 5 | 0 | 40.0% (2/5) | 89,638 |
| haiku-mempalace-v2 | 2 | **188,878** (154,708–223,047) | 187,903 | 0.097 | 7.0 | 0 in 0 run(s) | 3 | 0 | 0 | 5 | 0 | 50.0% (1/2) | 257,217 |
| mempalace | 5 | **227,888** (172,651–241,509) | 226,919 | 0.192 | 6.0 | 0 in 0 run(s) | 2 | 0 | 0 | 7 | 0 | 60.0% (3/5) | 165,758 |
| mempalace-v2 | 2 | **418,607** (384,935–452,280) | 417,633 | 0.458 | 9.5 | 0 in 0 run(s) | 0 | 0 | 0 | 0 | 0 | 0.0% (0/2) | – |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 5 | 29,014.4 | [-50,123.8, 98,890.2] | 44.5% | **CI crosses 0 — no detectable difference** |
| uncached_equivalent | 5 | 48,317.0 | [-46,878.4, 132,536.6] | 85.9% | **CI crosses 0 — no detectable difference** |
| total_cost_usd | 5 | 0.0132 | [-0.0177, 0.0487] | 25.5% | **CI crosses 0 — no detectable difference** |
| num_turns | 5 | 1.8 | [-1.6, 5.0] | 97.7% | **CI crosses 0 — no detectable difference** |

### rest — 562 runs over 58 tasks

| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | 58 | **279,142** (224,649–623,817) | 153,413 | 0.218 | 5.0 | 32 in 30 run(s) | 89 | 0 | 0 | 177 | 0 | 81.0% (47/58) | 406,588 |
| baseline-nosub | 40 | **233,554** (144,366–382,636) | 232,574 | 0.144 | 8.0 | 0 in 0 run(s) | 164 | 0 | 0 | 218 | 0 | 87.5% (35/40) | 324,506 |
| cgr | 40 | **413,294** (256,011–615,364) | 404,391 | 0.247 | 15.0 | 2 in 2 run(s) | 173 | 0 | 0 | 133 | 0 | 85.0% (34/40) | 514,184 |
| cgr-v2 | 18 | **491,490** (321,935–684,894) | 490,520 | 0.303 | 18.5 | 1 in 1 run(s) | 82 | 0 | 0 | 90 | 0 | 72.2% (13/18) | 447,035 |
| graphify | 40 | **319,452** (212,223–488,364) | 318,448 | 0.205 | 9.5 | 0 in 0 run(s) | 187 | 0 | 0 | 192 | 77 | 80.0% (32/40) | 447,956 |
| graphify-strict | 40 | **326,350** (204,604–508,983) | 301,360 | 0.201 | 9.0 | 1 in 1 run(s) | 138 | 0 | 0 | 200 | 78 | 80.0% (32/40) | 435,092 |
| graphify-strict-v2 | 18 | **526,994** (233,567–760,937) | 525,957 | 0.312 | 12.0 | 0 in 0 run(s) | 74 | 0 | 0 | 124 | 34 | 66.7% (12/18) | 486,397 |
| graphify-v2 | 18 | **505,270** (227,710–752,219) | 504,259 | 0.319 | 15.5 | 0 in 0 run(s) | 63 | 0 | 0 | 138 | 36 | 77.8% (14/18) | 545,164 |
| haiku-baseline | 58 | **583,584** (211,562–843,996) | 526,306 | 0.151 | 15.0 | 3 in 2 run(s) | 393 | 0 | 0 | 474 | 0 | 81.0% (47/58) | 671,671 |
| haiku-cgr | 40 | **473,667** (235,475–821,836) | 411,380 | 0.120 | 17.0 | 5 in 5 run(s) | 234 | 0 | 0 | 162 | 0 | 74.4% (29/39) | 738,155 |
| haiku-cgr-v2 | 18 | **790,545** (479,920–1,164,333) | 789,568 | 0.194 | 21.0 | 0 in 0 run(s) | 144 | 0 | 0 | 139 | 0 | 72.2% (13/18) | 871,312 |
| haiku-graphify | 40 | **390,476** (229,454–552,878) | 389,503 | 0.111 | 12.0 | 0 in 0 run(s) | 225 | 0 | 0 | 145 | 93 | 85.0% (34/40) | 522,273 |
| haiku-graphify-v2 | 18 | **607,129** (227,758–941,959) | 606,164 | 0.149 | 16.0 | 0 in 0 run(s) | 123 | 0 | 0 | 74 | 39 | 72.2% (13/18) | 491,465 |
| haiku-mempalace | 40 | **521,490** (241,861–1,052,288) | 513,754 | 0.160 | 13.0 | 2 in 2 run(s) | 203 | 0 | 0 | 155 | 0 | 80.0% (32/40) | 713,692 |
| haiku-mempalace-v2 | 18 | **477,076** (135,267–715,059) | 476,111 | 0.150 | 12.0 | 0 in 0 run(s) | 109 | 0 | 0 | 30 | 0 | 55.6% (10/18) | 641,170 |
| mempalace | 40 | **476,970** (246,702–751,106) | 463,952 | 0.396 | 11.5 | 1 in 1 run(s) | 132 | 0 | 0 | 54 | 0 | 82.5% (33/40) | 592,387 |
| mempalace-v2 | 18 | **385,812** (275,102–591,165) | 384,811 | 0.364 | 11.5 | 1 in 1 run(s) | 33 | 0 | 0 | 22 | 0 | 66.7% (12/18) | 408,343 |

| metric | tasks | mean diff | 95% CI | mean relative | verdict |
|---|---|---|---|---|---|
| uncached_equivalent_all | 40 | 103,667.5 | [50,398.1, 158,195.3] | 38.8% | cgr higher |
| uncached_equivalent | 40 | 311,418.5 | [211,031.9, 420,346.9] | 366.8% | cgr higher |
| total_cost_usd | 40 | 0.0021 | [-0.0288, 0.0323] | 14.1% | **CI crosses 0 — no detectable difference** |
| num_turns | 40 | 13.7 | [10.1, 17.9] | 493.5% | cgr higher |

## 14. Limitations

- N = 630 runs over 65 tasks; a single corpus and a single model. These results do not generalize to other codebases or models.
- Bootstrap resamples tasks, so the interval reflects task-to-task variation, not within-task run noise.
- Where a CI crosses zero the honest reading is "no difference detected at this N", not "no difference exists".
- The fixed ~21k-token system-prompt/tool-definition overhead is included in both arms and not subtracted (see §2).
- **1 repetition per (task × condition)**: within-task run-to-run variance is unmeasured, so any single per-task difference may be run noise.
- Subagent traffic is counted in `uncached_all`, but a subagent's tool calls never reach the parent transcript, so the tool-call columns stay main-session-only.
- Raw per-run data lives in `results/runs/<run-id>/`, `results/ext/runs/<run-id>/`, `results/structural/runs/<run-id>/`, `results/docs/runs/<run-id>/`, `results/mempalace/runs/<run-id>/`, `results/cgr/runs/<run-id>/` and the `summary.csv` beside this report.
