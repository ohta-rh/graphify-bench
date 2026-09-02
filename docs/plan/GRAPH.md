# Phase 2: グラフ構築・overlay・hook 実証・パイロット

計測日 2026-09-02 / graphifyy **0.9.53** / corpus `corpus-v1` (main @ e78c3a8)。

---

## 1. グラフ構築

corpus のコピー（追跡ファイル 496 件のみ、`node_modules` を含まない = `.gitignore` 準拠のビルドと等価）を
リポジトリ外の scratch に作り、そこで実行した。`corpus/` は一切変更していない（`git status` clean）。

```bash
graphify update . --no-cluster            # 3.4 s   → 2545 nodes, 10858 edges
graphify cluster-only . --no-label --no-viz  # 1.2 s → 2545 nodes, 10202 edges, 120 communities
```

`update` の 10858 edges は raw 抽出値で、クラスタリング時の同一端点マージ後が 10202。
どちらも LLM 不使用（合計ビルド時間 **4.6 秒**、API コスト 0）。

コミュニティ命名は skill の Step 5 相当を手作業で 1 回だけ実施した（`graphify label` は LLM を要するため使わない）。
`.graphify_analysis.json` の 120 コミュニティすべてに 2〜5 語の名前を与え、
`graphify.report.generate` で `GRAPH_REPORT.md` を再生成し、`export.to_json` で
`graph.json` の各ノードに `community_name` を焼き直した。処理は `graphify.cli` の
`cluster-only` パスをそのままなぞっている（0.9.53）。

命名の結果は `graphify query` の出力にも現れる（例: `community=Soft Delete and Issue Repository`）ので、
実利用と同じ品質のグラフになっている。

### 抽出品質

`GRAPH_REPORT.md` より: 100% EXTRACTED / 0% INFERRED / 0% AMBIGUOUS、
INFERRED は 36 edges（平均確信度 0.85）。120 コミュニティ中 98 件がレポートに掲載（11 件は thin として省略）。

---

## 2. overlay のファイルと大きさ

`overlays/graphify/` は 20 ファイル・合計 5.0 MB。適用時 `applyOverlay` が
トップレベルの `README.md` を落とすため、エージェントが見るのは 20 ファイル。

| ファイル | bytes | ≈ tokens (chars/4) |
|---|---:|---:|
| `graphify-out/graph.json` | 4,824,780 | 1,206,195 |
| `graphify-out/.graphify_analysis.json` | 139,361 | 34,840 |
| `graphify-out/manifest.json` | 90,202 | 22,550 |
| `graphify-out/GRAPH_REPORT.md` | 25,863 | 6,465 |
| `graphify-out/.graphify_labels.json` | 4,055 | 1,013 |
| `graphify-out/.graphify_python` | 62 | — |
| `graphify-out/.graphify_root` | 1 | — |
| `.claude/skills/graphify/**` (9 ファイル) | ~104 KB | ~26,000 |
| `.claude/settings.json` | 396 | — |
| `.claude/CLAUDE.md` | 199 | — |
| `CLAUDE.md` | 2,232 | 558 |

`memory/`, `reflections/`, `graph.html`, `cache/`, `.vocab.txt` は **含めていない**
（architecture.md §8 のセッション間学習リーク対策）。

`graph.json` は 4.6 MB / 約 120 万トークンで、200K のコンテキストウィンドウに対して
**そもそも読み切れない**。architecture.md §8 が挙げる「条件 B が `graph.json` を直読みして
逆にトークンを浪費する」リスクは、全読みではなく部分読みによる浪費として現れる。
`collect.ts` の `read_graph_json` フラグで検出している。

### `graphify query` の出力サイズ

overlay を当てた新品 corpus コピーで実測:

```
$ graphify query "issue created subscribers"
6,474 chars / 60 lines ≈ 1,619 tokens
```

既定 budget 2000 トークンの範囲に収まる。440 ノードがヒットし 55 ノードのみ表示（TRUNCATED 警告つき）。

---

## 3. install 由来の成果物

`graphify install --project` を同じ scratch コピーで実行し（`--strict` なし）、生成物を取り込んだ。

- **`CLAUDE.md` の `## graphify` セクション**: 既存の `overlays/graphify/CLAUDE.md` と
  `diff` して **バイト一致**を確認済み。install の文言そのまま。
- **`.claude/skills/graphify/`**: `SKILL.md` + `references/*.md` 8 件。`.graphify_version` は `0.9.53`。
- **`.claude/CLAUDE.md`**: install が書く 3 行のスキル案内。条件 B の忠実性を優先して同梱した
  （除外するとスキルが発見されず graphify の効果を過小評価しうる）。
- **`.claude/settings.json`**: PreToolUse フック 2 本。

### hook コマンドの絶対パス化（仕様変更への対応）

**0.9.53 の `install --project` はフックコマンドを絶対パスではなく素の `graphify` で書く。**
`scripts/patch-overlay.ts` の docstring が前提にしていた挙動（「絶対パスを焼き込む」）は
このバージョンではもう成り立たない。

素の `graphify` のままだと、`claude` を spawn したプロセスの PATH に `~/.local/bin` が
無い環境でフックが起動に失敗し、**fail-open で黙って条件 B が条件 A に劣化する**。
これは patch-overlay.ts が防ごうとしていた障害そのものなので、overlay 側では
絶対パスで保持し、`patch-overlay.ts` に機種ごとの書き換えを担わせる方針にした。

```
"command": "/Users/tetsuyaohta/.local/bin/graphify hook-guard search"
"command": "/Users/tetsuyaohta/.local/bin/graphify hook-guard read"
```

`pnpm exec tsx scripts/patch-overlay.ts` で 2 箇所を書き換え、`--check` が clean になることを確認済み。

---

## 4. hook 実証

### 4.1 hook-guard 単体（PreToolUse ペイロードを直接投入）

両フックとも exit 0 で `additionalContext` を返す（ブロックはしない = nudge のみ、補記の記述通り）。

- `Bash|Grep` → `hook-guard search`:
  `MANDATORY: graphify-out/graph.json exists. You MUST run \`graphify query "<question>"\` before grepping raw files. ...`
- `Read|Glob` → `hook-guard read`:
  `MANDATORY: ... You MUST run graphify before reading source files. Use: \`graphify query ...\` ...`

### 4.2 実ラン（haiku, `REF3-issue-created-subscribers`）

`BENCH_MODEL=claude-haiku-4-5 BENCH_MAX_TURNS=12 BENCH_MAX_BUDGET_USD=0.3`、結果はリポジトリ外に出力。

| 確認項目 | 結果 |
|---|---|
| (1) nudge 文言が transcript に現れる | **YES** — search nudge 8 回 / read nudge 10 回 |
| (2) `graphify query` が Bash で実行された | **YES** — 3 回 |
| (3) `graph.json` の直読み | **なし**（`read_graph_json: false`, 0 events） |

実行された query:

```
graphify query "issue created event handlers"
graphify query "issueCreated" --budget 3000
graphify query "subscribe issue.created" --budget 3000
```

エージェントは既定 budget が足りないと判断して自分で `--budget 3000` に上げている。

### 4.3 baseline 側の遮断確認

同タスクを `--conditions baseline` で実行し、`transcript.jsonl` と `result.json` に対する
**大文字小文字無視の `graphify` 出現回数は 0**。`--setting-sources project` による遮断は効いている。

`overlays/baseline/` で graphify に言及するのは `README.md` だけで、これは `applyOverlay` が
適用時に破棄するためエージェントには届かない。`overlays/baseline/CLAUDE.md` は clean。

hook 実証の総支出: **$0.263**（graphify $0.126 + baseline $0.137）。
どちらも `--max-turns 12` の上限に当たって `error_max_turns` で終了しているが、
これは実証を安く済ませるための意図的な設定で、本パイロット以降は既定の 60 を使う。

---

## 5. パイロット

タスク 2 件 × 条件 2 × 1 反復 = 4 ラン。
`BENCH_RESULTS_DIR=results/pilot`、model `claude-sonnet-5`、effort `high`、
`--max-turns 60`、`--max-budget-usd 4`。**4 ラン全て `terminal_reason: completed`、エラー 0。**

| task | 条件 | uncached_equiv | cost USD | turns | Read | Grep | Bash | Bash(graphify) | Agent | score | success |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| REF1-assertcan-callers | baseline | 163,096 | 0.1285 | 5 | 1 | 0 | 3 | 0 | 0 | 0.933 | ✅ |
| REF1-assertcan-callers | graphify | 300,441 | 0.1817 | 8 | 1 | 0 | 4 | 2 | 0 | 0.933 | ✅ |
| FIX1-issue-tenant-leak | baseline | 132,082 | 0.5846 | 4 | 1 | 0 | 0 | 0 | **1** | 1.000 | ✅ |
| FIX1-issue-tenant-leak | graphify | 313,667 | 0.1702 | 9 | 2 | 0 | 3 | 2 | 0 | 1.000 | ✅ |

`read_graph_json` は 4 ラン全て `false`（`graph.json` の直読みは 1 件も起きていない）。
`permission_denials` は全て 0。`skill_attributions` は全て 0（スキルは明示起動されず、
エージェントは CLAUDE.md と hook の nudge に従って CLI を直接叩いた）。

### 採点

| grader | 結果 |
|---|---|
| REF1 (`set-f1`) | 両条件とも F1 **0.933**（閾値 0.9 超え = success）。**両条件が同一の解答集合**に到達した |
| FIX1 (`vitest`) | 両条件とも `tests/server/tenant-scope.test.ts` exit 0 = **green** |

**FIX1 の red→green を独立に検証した。** バグ patch を当てただけの新品 corpus コピーで同 spec を実行:

```
1 failed | 7 passed (8 tests), exit 1
✗ does not return another organization's issue by id
  AssertionError: expected {…} to be null — query returned an issue from a different organization
```

つまり patch 適用直後は red、エージェントの修正後は両条件とも green。採点器は機能している。

### `bench:analyze` の出力（diff = graphify − baseline）

| metric | mean diff | 95% CI |
|---|---:|---|
| `uncached_equivalent` | **+159,465** | [137,345, 181,585] |
| `total_cost_usd` | −0.181 | [−0.414, 0.053] — **0 をまたぐ = 差は検出できず** |
| `num_turns` | +4.0 | [3.0, 5.0] |

**この CI は 2 個のペア差分の bootstrap であり、統計的な意味はほぼない**（タスク 2 件・1 反復）。
方向性の記録として読むこと。本計測（15 タスク × 3 反復）で置き換える。

### パイロットで見えたこと（本計測前に対処が要る点）

1. **条件 B の方がトークンを多く使っている（両タスクとも）。** 正答率は同じ。
   `graphify query` の出力自体は小さい（約 1.6K トークン）が、条件 B は
   overlay が持ち込む `.claude/skills/graphify/**`（約 26K トークン相当）と
   CLAUDE.md の graphify セクションを毎ターン抱え、さらに hook の nudge が
   毎 Read/Grep ごとに `additionalContext` として注入される。turns も +4。
   これは architecture.md §8 が想定していた「graph.json 直読み」とは別の経路の
   オーバーヘッドで、**本計測で最も重要な観測対象になる**。

2. **`FIX1 baseline` がサブエージェントを 1 体生成した**（`subagents_spawned: 1`、
   tools = `{Agent:1, Read:1, Edit:1}`、240 秒、$0.58）。
   `uncached_equivalent`（132,082）は**メインセッションのみ**を数えるため、
   このランの実消費を過小評価している一方 `total_cost_usd` にはサブエージェント分が乗る。
   条件間でサブエージェント生成率が違うと 2 つの指標が逆向きに歪む。
   本計測では `subagents_spawned` を層別して報告するか、
   タスクプロンプト側でサブエージェント生成を抑制する必要がある。
   （`total_cost_usd` の CI が 0 をまたいだのは、ほぼこの 1 ランのせい。）

3. コスト・所要時間: 4 ラン合計 **$1.065** / 6.2 分。
   本計測 90 ラン（15 タスク × 2 条件 × 3 反復）は単純外挿で **$24 前後 / 2〜3 時間**。
   ただし FIX 系がサブエージェントを生むと跳ねるので上振れを見込むこと。

---

## 6. 検証

- root `pnpm typecheck` — PASS (exit 0)
- root `pnpm test` — PASS (5 files / 71 tests)
- `git status corpus/` — clean（凍結 corpus は未変更）
- `pnpm exec tsx scripts/patch-overlay.ts --check` — clean
- パイロット 4 ラン全て `metrics.json` の 28 フィールドが埋まっている
  （`skill_attribution_names` のみ `{}`。これは `skill_attributions: 0` と整合する正しい空値）
- baseline 2 ランの `transcript.jsonl` に対する大文字小文字無視 `graphify` 出現回数 = 0

### 総支出

| 内訳 | USD |
|---|---:|
| hook 実証（haiku 2 ラン） | 0.263 |
| パイロット（sonnet 4 ラン） | 1.065 |
| **合計** | **1.328** |
